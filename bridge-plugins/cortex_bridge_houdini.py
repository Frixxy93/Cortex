"""
CORTEX Bridge Plugin — Houdini  (no external dependencies)
===========================================================
Uses Python's built-in socket module — NO pip install required.

Run inside Houdini Python Shell:
  exec(open(r"D:/FRIXXY/APP/cortex/bridge-plugins/cortex_bridge_houdini.py").read())
"""

import hou
import json
import socket
import threading
import struct
import hashlib
import base64
import time
import os

CORTEX_HOST = "127.0.0.1"
CORTEX_PORT = 7878
CLIENT_ID   = f"houdini-{int(time.time())}"

_sock    = None
_thread  = None
_running = False


# ─── Minimal WebSocket client (RFC 6455) ─────────────────────────────────────

def _ws_handshake(sock):
    key = base64.b64encode(os.urandom(16)).decode()
    req = (
        f"GET / HTTP/1.1\r\n"
        f"Host: {CORTEX_HOST}:{CORTEX_PORT}\r\n"
        f"Upgrade: websocket\r\n"
        f"Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        f"Sec-WebSocket-Version: 13\r\n\r\n"
    )
    sock.sendall(req.encode())
    resp = b""
    while b"\r\n\r\n" not in resp:
        resp += sock.recv(1024)
    if b"101" not in resp:
        raise ConnectionError(f"WebSocket upgrade failed:\n{resp[:200]}")


def _ws_send(sock, text):
    data  = text.encode("utf-8")
    n     = len(data)
    mask  = os.urandom(4)
    masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
    if n <= 125:
        header = bytes([0x81, 0x80 | n]) + mask
    elif n <= 65535:
        header = bytes([0x81, 0xFE]) + struct.pack(">H", n) + mask
    else:
        header = bytes([0x81, 0xFF]) + struct.pack(">Q", n) + mask
    sock.sendall(header + masked)


def _ws_recv(sock):
    """Read one WebSocket frame, return text payload (or None on close/ping)."""
    def recv_exact(n):
        buf = b""
        while len(buf) < n:
            chunk = sock.recv(n - len(buf))
            if not chunk:
                raise ConnectionError("Connection closed")
            buf += chunk
        return buf

    header = recv_exact(2)
    opcode = header[0] & 0x0F
    masked = bool(header[1] & 0x80)
    plen   = header[1] & 0x7F

    if plen == 126:
        plen = struct.unpack(">H", recv_exact(2))[0]
    elif plen == 127:
        plen = struct.unpack(">Q", recv_exact(8))[0]

    mask_key = recv_exact(4) if masked else b""
    payload  = recv_exact(plen)

    if masked:
        payload = bytes(b ^ mask_key[i % 4] for i, b in enumerate(payload))

    if opcode == 0x8:   # close
        raise ConnectionError("Server closed connection")
    if opcode == 0x9:   # ping — send pong
        _ws_send(sock, "")
        return None
    if opcode in (0x1, 0x2):
        return payload.decode("utf-8", errors="replace")
    return None


# ─── Houdini node catalogue ───────────────────────────────────────────────────

CAT_MAP = {
    "Sop":"sop","Vop":"vop","Dop":"dop","Chop":"chop",
    "Lop":"lop","Top":"top","Cop2":"cop","Driver":"rop",
    "Object":"object","Shop":"shop",
    "ChopNet":"chop","CopNet":"cop","TopNet":"top","VopNet":"vop",
}
PTYPE_MAP = {
    hou.parmTemplateType.Int:"integer",   hou.parmTemplateType.Float:"float",
    hou.parmTemplateType.String:"string", hou.parmTemplateType.Toggle:"boolean",
    hou.parmTemplateType.Menu:"enum",     hou.parmTemplateType.Button:"button",
    hou.parmTemplateType.Ramp:"ramp",
}

def _safe(fn, default=None):
    try: return fn()
    except: return default

def _collect_parms(templates, acc, limit=30):
    """Recursively walk parm template tree, collecting leaf params (skips folders/separators/labels)."""
    for pt in templates:
        if len(acc) >= limit:
            break
        try:
            pt_type = pt.type()
            if pt_type in (hou.parmTemplateType.Folder, hou.parmTemplateType.FolderSet):
                _collect_parms(pt.parmTemplates(), acc, limit)
            elif pt_type not in (hou.parmTemplateType.Separator, hou.parmTemplateType.Label):
                # Default value
                default = None
                try:
                    dv = pt.defaultValue()
                    if isinstance(dv, (list, tuple)):
                        default = list(dv)[0] if len(dv) == 1 else list(dv)
                    else:
                        default = dv
                except: pass

                # Enum options
                options = None
                if pt_type == hou.parmTemplateType.Menu:
                    try:
                        items  = list(pt.menuItems())
                        labels = list(pt.menuLabels())
                        options = [{"value": v, "label": l} for v, l in zip(items, labels)]
                        if not default and items:
                            default = items[0]
                    except: pass

                acc.append({
                    "name":    pt.name(),
                    "label":   pt.label(),
                    "ptype":   PTYPE_MAP.get(pt_type, "float"),
                    "default": default,
                    "options": options,
                })
        except:
            pass

def build_catalogue():
    nodes = []
    for cat_name, category in hou.nodeTypeCategories().items():
        mapped = CAT_MAP.get(cat_name, cat_name.lower())
        for _, nt in category.nodeTypes().items():
            if _safe(lambda: nt.hidden(), False):
                continue
            try:
                nc      = _safe(nt.nameComponents)
                name    = (nc[1] if nc and len(nc) > 1 else None) or _safe(nt.name, "unknown")
                ns      = nc[0] if nc else ""
                display = _safe(lambda: nt.description(), name)
                tags    = [str(v).lower().replace(" ","_")
                           for v in _safe(lambda: list(nt.tags().values()), []) if v][:6]
                if ns and ns not in tags: tags.insert(0, ns)

                parms = []
                ptg = _safe(lambda: nt.parmTemplateGroup())
                if ptg:
                    _collect_parms(ptg.parmTemplates(), parms)

                nodes.append({
                    "name": name, "displayName": display, "category": mapped,
                    "description": f"{display} ({mapped.upper()})",
                    "tags": tags,
                    "maxInputs":  int(_safe(lambda: nt.maxInputs(),  0)),
                    "maxOutputs": int(_safe(lambda: nt.maxOutputs(), 1)),
                    "parameters": parms,
                })
            except: pass
    return nodes


# ─── Main loop ────────────────────────────────────────────────────────────────

def _loop():
    global _sock, _running
    try:
        _sock = socket.create_connection((CORTEX_HOST, CORTEX_PORT), timeout=5)
        _sock.settimeout(None)
        _ws_handshake(_sock)
        print("[CORTEX] WebSocket connected")

        # Send HELLO
        _ws_send(_sock, json.dumps({
            "type": "HELLO", "software": "Houdini",
            "version": hou.applicationVersionString(), "clientId": CLIENT_ID,
        }))

        while _running:
            text = _ws_recv(_sock)
            if text is None:
                continue
            msg = json.loads(text)
            t   = msg.get("type", "")

            if t == "WELCOME":
                print(f"[CORTEX] Server: {msg.get('serverVersion')}  id={msg.get('clientId')}")

            elif t == "REQUEST_NODES":
                print("[CORTEX] Building catalogue…")
                nodes = build_catalogue()
                print(f"[CORTEX] Sending {len(nodes)} node defs")
                _ws_send(_sock, json.dumps({
                    "type": "NODE_CATALOGUE", "nodes": nodes, "total": len(nodes)
                }))
                print("[CORTEX] Done — click 'Import Nodes' in CORTEX")

            elif t == "REQUEST_SCENE":
                _ws_send(_sock, json.dumps({"type":"SCENE_GRAPH","nodes":[],"connections":[]}))

            elif t == "PONG":
                pass

            elif t == "ERROR":
                print(f"[CORTEX] Server error: {msg.get('message')}")

    except ConnectionError as e:
        print(f"[CORTEX] Disconnected: {e}")
    except Exception as e:
        print(f"[CORTEX] Error: {e}")
    finally:
        _running = False
        if _sock:
            try: _sock.close()
            except: pass
        print("[CORTEX] Bridge stopped")


def start():
    global _thread, _running
    if _running:
        print("[CORTEX] Already running")
        return
    _running = True
    _thread  = threading.Thread(target=_loop, daemon=True)
    _thread.start()
    print(f"[CORTEX] Connecting to ws://{CORTEX_HOST}:{CORTEX_PORT} …")


def stop():
    global _running
    _running = False
    if _sock:
        try: _sock.close()
        except: pass


# ─── Auto-start ───────────────────────────────────────────────────────────────
print("CORTEX Bridge — Houdini (built-in sockets, no pip required)")
start()
