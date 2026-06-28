"""
CORTEX Auto-Bridge — Houdini
=============================
Drop into Houdini startup OR let CORTEX install it automatically.
No external dependencies — uses Python's built-in socket module.

Auto-installed path (Windows):
  %USERPROFILE%\\Documents\\houdini{ver}\\scripts\\pythonstartup.py
"""

import json, socket, threading, struct, base64, os, time, atexit

CORTEX_HOST = "127.0.0.1"
CORTEX_PORT = 7878
RETRY_SECS  = 12   # reconnect delay when CORTEX not running

_sock    = None
_thread  = None
_running = False


# ─── Minimal WebSocket client (RFC 6455) ─────────────────────────────────────

def _ws_handshake(sock):
    key = base64.b64encode(os.urandom(16)).decode()
    req = (
        f"GET / HTTP/1.1\r\n"
        f"Host: {CORTEX_HOST}:{CORTEX_PORT}\r\n"
        f"Upgrade: websocket\r\nConnection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
    )
    sock.sendall(req.encode())
    resp = b""
    while b"\r\n\r\n" not in resp:
        resp += sock.recv(1024)
    if b"101" not in resp:
        raise ConnectionError("WebSocket upgrade failed")


def _ws_send(sock, text):
    data   = text.encode("utf-8")
    n      = len(data)
    mask   = os.urandom(4)
    masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
    if n <= 125:
        header = bytes([0x81, 0x80 | n]) + mask
    elif n <= 65535:
        header = bytes([0x81, 0xFE]) + struct.pack(">H", n) + mask
    else:
        header = bytes([0x81, 0xFF]) + struct.pack(">Q", n) + mask
    sock.sendall(header + masked)


def _ws_recv(sock):
    def rx(n):
        buf = b""
        while len(buf) < n:
            chunk = sock.recv(n - len(buf))
            if not chunk:
                raise ConnectionError("Connection closed")
            buf += chunk
        return buf
    h      = rx(2)
    opcode = h[0] & 0x0F
    masked = bool(h[1] & 0x80)
    plen   = h[1] & 0x7F
    if plen == 126: plen = struct.unpack(">H", rx(2))[0]
    elif plen == 127: plen = struct.unpack(">Q", rx(8))[0]
    mkey = rx(4) if masked else b""
    pay  = rx(plen)
    if masked: pay = bytes(b ^ mkey[i % 4] for i, b in enumerate(pay))
    if opcode == 0x8: raise ConnectionError("Server closed")
    if opcode == 0x9: _ws_send(sock, ""); return None
    return pay.decode("utf-8", "replace") if opcode in (0x1, 0x2) else None


# ─── Houdini node catalogue ───────────────────────────────────────────────────

CAT_MAP = {
    "Sop":"sop","Vop":"vop","Dop":"dop","Chop":"chop",
    "Lop":"lop","Top":"top","Cop2":"cop","Driver":"rop",
    "Object":"object","Shop":"shop",
}
PTYPE_MAP = {}

def _init_ptype_map():
    global PTYPE_MAP
    try:
        import hou
        PTYPE_MAP = {
            hou.parmTemplateType.Int:    "integer",
            hou.parmTemplateType.Float:  "float",
            hou.parmTemplateType.String: "string",
            hou.parmTemplateType.Toggle: "boolean",
            hou.parmTemplateType.Menu:   "enum",
            hou.parmTemplateType.Button: "button",
            hou.parmTemplateType.Ramp:   "ramp",
        }
    except: pass

def _collect_parms(templates, acc, limit=30):
    try:
        import hou
        for pt in templates:
            if len(acc) >= limit: break
            try:
                t = pt.type()
                if t in (hou.parmTemplateType.Folder, hou.parmTemplateType.FolderSet):
                    _collect_parms(pt.parmTemplates(), acc, limit)
                elif t not in (hou.parmTemplateType.Separator, hou.parmTemplateType.Label):
                    dv = None
                    try:
                        d  = pt.defaultValue()
                        dv = list(d)[0] if isinstance(d, (list, tuple)) and len(d)==1 else (list(d) if isinstance(d,(list,tuple)) else d)
                    except: pass
                    opts = None
                    if t == hou.parmTemplateType.Menu:
                        try: opts = [{"value": v, "label": l} for v, l in zip(pt.menuItems(), pt.menuLabels())]
                        except: pass
                    acc.append({"name": pt.name(), "label": pt.label(),
                                "ptype": PTYPE_MAP.get(t, "float"),
                                "default": dv, "options": opts})
            except: pass
    except: pass

def _build_catalogue():
    _init_ptype_map()
    nodes = []
    try:
        import hou
        for cat_name, category in hou.nodeTypeCategories().items():
            mapped = CAT_MAP.get(cat_name, cat_name.lower())
            for _, nt in category.nodeTypes().items():
                try:
                    if nt.hidden(): continue
                    nc      = nt.nameComponents()
                    name    = (nc[1] if nc and len(nc) > 1 else None) or nt.name()
                    ns      = nc[0] if nc else ""
                    display = nt.description() or name
                    tags    = [str(v).lower().replace(" ", "_")
                               for v in list(nt.tags().values()) if v][:6]
                    if ns and ns not in tags: tags.insert(0, ns)
                    parms = []
                    ptg = nt.parmTemplateGroup()
                    if ptg: _collect_parms(ptg.parmTemplates(), parms)
                    nodes.append({
                        "name": name, "displayName": display, "category": mapped,
                        "description": f"{display} ({mapped.upper()})", "tags": tags,
                        "maxInputs":  int(nt.maxInputs() or 0),
                        "maxOutputs": int(nt.maxOutputs() or 1),
                        "parameters": parms,
                    })
                except: pass
    except: pass
    return nodes


# ─── Main loop (with auto-retry) ─────────────────────────────────────────────

def _loop():
    global _sock, _running
    while _running:
        try:
            _sock = socket.create_connection((CORTEX_HOST, CORTEX_PORT), timeout=4)
            _sock.settimeout(None)
            _ws_handshake(_sock)

            import hou
            _ws_send(_sock, json.dumps({
                "type": "HELLO", "software": "Houdini",
                "version": hou.applicationVersionString(),
                "clientId": f"houdini-{os.getpid()}",
            }))

            while _running:
                text = _ws_recv(_sock)
                if text is None: continue
                msg = json.loads(text)
                t   = msg.get("type", "")

                if t == "WELCOME":
                    pass  # auto-bridge: server immediately sends REQUEST_NODES

                elif t == "REQUEST_NODES":
                    nodes = _build_catalogue()
                    _ws_send(_sock, json.dumps({
                        "type": "NODE_CATALOGUE", "nodes": nodes, "total": len(nodes)
                    }))

                elif t == "REQUEST_SCENE":
                    _ws_send(_sock, json.dumps({"type":"SCENE_GRAPH","nodes":[],"connections":[]}))

                elif t == "PING":
                    _ws_send(_sock, json.dumps({"type":"PONG"}))

        except ConnectionRefusedError:
            # CORTEX not running yet — wait and retry silently
            pass
        except Exception:
            pass
        finally:
            if _sock:
                try: _sock.close()
                except: pass
                _sock = None

        if _running:
            time.sleep(RETRY_SECS)


def start():
    global _thread, _running
    if _running: return
    _running = True
    _thread  = threading.Thread(target=_loop, daemon=True, name="cortex-bridge")
    _thread.start()

def stop():
    global _running
    _running = False
    if _sock:
        try: _sock.close()
        except: pass

atexit.register(stop)

# ─── Auto-start ───────────────────────────────────────────────────────────────
start()
