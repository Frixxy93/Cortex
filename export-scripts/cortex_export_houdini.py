"""
CORTEX Export — Houdini
========================
Paste into Houdini's Python Shell (Windows → Python Shell):

  exec(open(r"C:/Users/.../Documents/cortex-bridge/cortex_export_houdini.py").read())

Exports all node types WITH parameters and default values to CORTEX via WebSocket.
CORTEX saves them directly to the database — no extra steps needed.
"""

import json, os, socket, threading, struct, base64, time, atexit

HOST, PORT = "127.0.0.1", 7878

_sock, _running = None, False
_catalogue      = []   # built on main thread

# ── Category mapping ──────────────────────────────────────────────────────────

CAT = {
    "Sop":"sop","Vop":"vop","Dop":"dop","Chop":"chop",
    "Lop":"lop","Top":"top","Cop2":"cop","Driver":"rop",
    "Object":"object","Shop":"shop",
}

# ── Parameter extraction ──────────────────────────────────────────────────────

def _parm_type(pt):
    import hou
    T = hou.parmTemplateType
    t = pt.type()
    if t == T.Float:
        n = pt.numComponents()
        return "vector3" if n==3 else "vector2" if n==2 else "vector4" if n==4 else "float"
    if t == T.Int:
        n = pt.numComponents()
        return "vector3" if n==3 else "vector2" if n==2 else "integer"
    if t == T.String:
        try:
            if pt.stringType() == hou.stringParmType.FileReference: return "file"
        except: pass
        return "string"
    if t == T.Toggle:  return "boolean"
    if t in (T.Menu, T.MenuStrip, T.MenuRadio): return "enum"
    if t == T.Button:  return "button"
    if t == T.Ramp:    return "ramp"
    if t == T.Color:   return "color"
    if t == T.Separator: return "separator"
    if t == T.Label:   return "label"
    return "string"

def _flatten_parms(templates, group=None, order=[0]):
    import hou
    T   = hou.parmTemplateType
    out = []
    for pt in templates:
        try:
            t = pt.type()
            if t in (T.Folder, T.FolderSet):
                label = pt.label() or "Group"
                out.extend(_flatten_parms(pt.parmTemplates(), label, order))
                continue
            if t == T.Separator:
                continue
            ptype = _parm_type(pt)
            p = {
                "name":  pt.name(),
                "label": pt.label() or pt.name(),
                "type":  ptype,
            }
            if group:
                p["group"] = group
            # Default value
            try:
                dv = pt.defaultValue()
                if ptype == "boolean":
                    p["default"] = bool(dv[0]) if dv else False
                elif ptype in ("float","integer"):
                    p["default"] = dv[0] if dv else 0
                elif ptype in ("vector2","vector3","vector4"):
                    p["default"] = list(dv)
                elif ptype == "string":
                    p["default"] = dv[0] if dv else ""
                elif ptype == "enum":
                    p["default"] = dv[0] if dv else 0
                    items  = list(pt.menuItems())
                    labels = list(pt.menuLabels())
                    p["options"] = [
                        {"value": i, "label": labels[i] if i < len(labels) else items[i]}
                        for i in range(len(items))
                    ]
            except: pass
            # Min/max for numeric
            try:
                if ptype in ("float","integer","vector2","vector3","vector4"):
                    if pt.minIsStrict(): p["min"] = pt.minValue()
                    if pt.maxIsStrict(): p["max"] = pt.maxValue()
            except: pass
            out.append(p)
            order[0] += 1
        except: pass
    return out

def _build():
    import hou
    nodes = []
    total_cats = list(hou.nodeTypeCategories().items())
    for i, (cat_name, ctx) in enumerate(total_cats):
        mapped = CAT.get(cat_name, cat_name.lower())
        cat_count = 0

        # Get node types — try values() then items() then direct iteration
        try:
            nt_collection = ctx.nodeTypes()
            try:    nt_list = list(nt_collection.values())
            except: nt_list = list(nt_collection) if nt_collection else []
        except Exception as e:
            print(f"[CORTEX] Could not read {cat_name}: {e}")
            nt_list = []

        for nt in nt_list:
            # Safe hidden check — don't skip if hidden() throws
            try:
                if nt.hidden(): continue
            except: pass

            # Safe name
            name = ""
            try:
                nc   = nt.nameComponents()
                name = (nc[1] if nc and len(nc) > 1 else "") or ""
            except: pass
            if not name:
                try:   name = nt.name()
                except: continue   # truly unreadable, skip

            # Safe description
            try:   desc = nt.description() or name
            except: desc = name

            # Safe inputs/outputs
            try:   max_in  = min(int(nt.maxInputs()  or 0), 8)
            except: max_in  = 0
            try:   max_out = min(int(nt.maxOutputs() or 1), 4)
            except: max_out = 1

            # Parameters (slow but one-time)
            parms = []
            try:
                parms = _flatten_parms(list(nt.parmTemplateGroup().parmTemplates()), order=[0])
            except: pass

            nodes.append({
                "name":        name,
                "displayName": desc,
                "category":    mapped,
                "description": f"{desc} ({mapped.upper()})",
                "maxInputs":   max_in,
                "maxOutputs":  max_out,
                "parameters":  parms,
            })
            cat_count += 1

        print(f"[CORTEX] {cat_name}: {cat_count} nodes ({i+1}/{len(total_cats)})")
    return nodes

# ── WebSocket helpers ─────────────────────────────────────────────────────────

def _hs(sock):
    k = base64.b64encode(os.urandom(16)).decode()
    sock.sendall((
        f"GET / HTTP/1.1\r\nHost: {HOST}:{PORT}\r\n"
        "Upgrade: websocket\r\nConnection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {k}\r\nSec-WebSocket-Version: 13\r\n\r\n"
    ).encode())
    r = b""
    while b"\r\n\r\n" not in r: r += sock.recv(4096)
    if b"101" not in r: raise ConnectionError("WS upgrade failed")

def _send(sock, obj):
    d = json.dumps(obj).encode()
    n = len(d)
    m = os.urandom(4)
    e = bytes(a ^ b for a, b in zip(d, (m * ((n >> 2) + 1))[:n]))
    if   n <= 125:   h = bytes([0x81, 0x80|n]) + m
    elif n <= 65535: h = bytes([0x81, 0xFE]) + struct.pack(">H",n) + m
    else:            h = bytes([0x81, 0xFF]) + struct.pack(">Q",n) + m
    sock.sendall(h + e)

def _recv(sock):
    def rx(n):
        b = b""
        while len(b)<n:
            c = sock.recv(n-len(b))
            if not c: raise ConnectionError
            b += c
        return b
    h  = rx(2); op=h[0]&0xF; pl=h[1]&0x7F
    if pl==126: pl=struct.unpack(">H",rx(2))[0]
    elif pl==127: pl=struct.unpack(">Q",rx(8))[0]
    mk=rx(4) if h[1]&0x80 else b""
    p=rx(pl)
    if mk: p=bytes(a^b for a,b in zip(p,(mk*((pl>>2)+1))[:pl]))
    if op==0x8: raise ConnectionError("closed")
    if op==0x9: _send(sock,{"type":"PONG"}); return None
    return p.decode("utf-8","replace") if op in(0x1,0x2) else None

# ── Background WS loop ────────────────────────────────────────────────────────

def _loop():
    global _sock, _running
    while _running:
        try:
            _sock = socket.create_connection((HOST,PORT),timeout=5)
            _sock.settimeout(None)
            _hs(_sock)
            import hou
            _send(_sock,{"type":"HELLO","software":"Houdini",
                         "version":hou.applicationVersionString(),
                         "clientId":f"hou-{os.getpid()}"})
            while _running:
                msg = _recv(_sock)
                if msg is None: continue
                t = json.loads(msg).get("type","")
                if t == "REQUEST_NODES":
                    print(f"[CORTEX] Sending {len(_catalogue)} nodes to CORTEX...")
                    _send(_sock,{"type":"NODE_CATALOGUE","nodes":_catalogue,"total":len(_catalogue)})
                    print("[CORTEX] Done! Nodes saved to CORTEX database.")
                elif t == "PING":
                    _send(_sock,{"type":"PONG"})
        except ConnectionRefusedError:
            print("[CORTEX] CORTEX is not running — start CORTEX first.")
            break
        except Exception as ex:
            print(f"[CORTEX] Disconnected ({ex}) — retrying in 10s...")
        finally:
            if _sock:
                try: _sock.close()
                except: pass
                _sock = None
        if _running: time.sleep(10)

def stop():
    global _running
    _running = False
    if _sock:
        try: _sock.close()
        except: pass

def start():
    global _running, _catalogue
    if _running:
        print("[CORTEX] Already running.")
        return
    print("[CORTEX] Building Houdini node catalogue (includes parameters — may take ~30s)...")
    _catalogue = _build()
    print(f"[CORTEX] Built {len(_catalogue)} nodes. Connecting to CORTEX...")
    if not _catalogue:
        print("[CORTEX] No nodes found. Make sure you're running inside Houdini.")
        return
    _running = True
    threading.Thread(target=_loop, daemon=True, name="cortex-bridge").start()

atexit.register(stop)
start()
