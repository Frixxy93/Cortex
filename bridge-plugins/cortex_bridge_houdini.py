"""CORTEX Bridge — Houdini
Run inside Houdini's Python Shell:
  exec(open(r"C:/Users/.../Documents/cortex-bridge/cortex_bridge_houdini.py").read())
"""
import json, socket, threading, struct, base64, os, time, atexit

HOST, PORT = "127.0.0.1", 7878
_sock, _running = None, False

CAT = {
    "Sop":"sop","Vop":"vop","Dop":"dop","Chop":"chop",
    "Lop":"lop","Top":"top","Cop2":"cop","Driver":"rop",
    "Object":"object","Shop":"shop",
}

# ── WebSocket helpers ─────────────────────────────────────────────────────────

def _hs(sock):
    k = base64.b64encode(os.urandom(16)).decode()
    sock.sendall((
        f"GET / HTTP/1.1\r\nHost: {HOST}:{PORT}\r\n"
        "Upgrade: websocket\r\nConnection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {k}\r\nSec-WebSocket-Version: 13\r\n\r\n"
    ).encode())
    r = b""
    while b"\r\n\r\n" not in r:
        r += sock.recv(4096)
    if b"101" not in r:
        raise ConnectionError("WS upgrade failed")

def _send(sock, obj):
    d = json.dumps(obj).encode()
    n = len(d)
    m = os.urandom(4)
    e = bytes(a ^ b for a, b in zip(d, (m * ((n >> 2) + 1))[:n]))
    if   n <= 125:   h = bytes([0x81, 0x80 | n]) + m
    elif n <= 65535: h = bytes([0x81, 0xFE]) + struct.pack(">H", n) + m
    else:            h = bytes([0x81, 0xFF]) + struct.pack(">Q", n) + m
    sock.sendall(h + e)

def _recv(sock):
    def rx(n):
        b = b""
        while len(b) < n:
            c = sock.recv(n - len(b))
            if not c: raise ConnectionError
            b += c
        return b
    h  = rx(2); op = h[0] & 0xF; pl = h[1] & 0x7F
    if pl == 126: pl = struct.unpack(">H", rx(2))[0]
    elif pl == 127: pl = struct.unpack(">Q", rx(8))[0]
    mk = rx(4) if h[1] & 0x80 else b""
    p  = rx(pl)
    if mk: p = bytes(a ^ b for a, b in zip(p, (mk * ((pl >> 2) + 1))[:pl]))
    if op == 0x8: raise ConnectionError("close")
    if op == 0x9: _send(sock, {"type": "PONG"}); return None
    return p.decode("utf-8", "replace") if op in (0x1, 0x2) else None

# ── Node catalogue (no parmTemplateGroup — fast) ──────────────────────────────

def _catalogue():
    nodes = []
    try:
        import hou
        for cat, ctx in hou.nodeTypeCategories().items():
            mapped = CAT.get(cat, cat.lower())
            for _, nt in ctx.nodeTypes().items():
                try:
                    if nt.hidden(): continue
                    nc   = nt.nameComponents()
                    name = (nc[1] if nc and len(nc) > 1 else None) or nt.name()
                    desc = nt.description() or name
                    nodes.append({
                        "name":        name,
                        "displayName": desc,
                        "category":    mapped,
                        "description": f"{desc} ({mapped.upper()})",
                        "maxInputs":   min(int(nt.maxInputs()  or 0), 8),
                        "maxOutputs":  min(int(nt.maxOutputs() or 1), 4),
                    })
                except: pass
    except: pass
    return nodes

# ── Main loop ─────────────────────────────────────────────────────────────────

def _loop():
    global _sock, _running
    while _running:
        try:
            _sock = socket.create_connection((HOST, PORT), timeout=5)
            _sock.settimeout(None)
            _hs(_sock)
            import hou
            _send(_sock, {
                "type": "HELLO", "software": "Houdini",
                "version": hou.applicationVersionString(),
                "clientId": f"hou-{os.getpid()}",
            })
            while _running:
                msg = _recv(_sock)
                if msg is None: continue
                t = json.loads(msg).get("type", "")
                if t == "REQUEST_NODES":
                    ns = _catalogue()
                    _send(_sock, {"type": "NODE_CATALOGUE", "nodes": ns, "total": len(ns)})
                elif t == "PING":
                    _send(_sock, {"type": "PONG"})
        except: pass
        finally:
            if _sock:
                try: _sock.close()
                except: pass
                _sock = None
        if _running: time.sleep(10)

def start():
    global _running
    if _running: return
    _running = True
    threading.Thread(target=_loop, daemon=True, name="cortex").start()

def stop():
    global _running
    _running = False
    if _sock:
        try: _sock.close()
        except: pass

atexit.register(stop)
start()
