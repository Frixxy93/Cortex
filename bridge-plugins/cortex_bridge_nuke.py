"""
CORTEX Auto-Bridge — Nuke
==========================
Auto-installed to: %USERPROFILE%\\.nuke\\cortex_bridge_nuke.py
Loaded from:       %USERPROFILE%\\.nuke\\init.py  (exec line added by CORTEX)
No external dependencies — uses Python's built-in socket module.
"""

import json, socket, threading, struct, base64, os, time, atexit

CORTEX_HOST = "127.0.0.1"
CORTEX_PORT = 7878
RETRY_SECS  = 12

_sock    = None
_running = False


# ─── Minimal WebSocket client ────────────────────────────────────────────────

def _ws_handshake(sock):
    key = base64.b64encode(os.urandom(16)).decode()
    req = (f"GET / HTTP/1.1\r\nHost: {CORTEX_HOST}:{CORTEX_PORT}\r\n"
           f"Upgrade: websocket\r\nConnection: Upgrade\r\n"
           f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n")
    sock.sendall(req.encode())
    resp = b""
    while b"\r\n\r\n" not in resp:
        resp += sock.recv(1024)
    if b"101" not in resp:
        raise ConnectionError("WS upgrade failed")

def _ws_send(sock, text):
    data = text.encode("utf-8"); n = len(data)
    mask = os.urandom(4)
    masked = bytes(b ^ mask[i%4] for i,b in enumerate(data))
    hdr = bytes([0x81,0x80|n])+mask if n<=125 else bytes([0x81,0xFE])+struct.pack(">H",n)+mask
    sock.sendall(hdr + masked)

def _ws_recv(sock):
    def rx(n):
        b=b""
        while len(b)<n: b+=sock.recv(n-len(b))
        return b
    h=rx(2); op=h[0]&0xF; mk=bool(h[1]&0x80); pl=h[1]&0x7F
    if pl==126: pl=struct.unpack(">H",rx(2))[0]
    elif pl==127: pl=struct.unpack(">Q",rx(8))[0]
    mkey=rx(4) if mk else b""; pay=rx(pl)
    if mk: pay=bytes(b^mkey[i%4] for i,b in enumerate(pay))
    if op==0x8: raise ConnectionError("closed")
    return pay.decode("utf-8","replace") if op in(1,2) else None


# ─── Nuke node catalogue ─────────────────────────────────────────────────────

def _build_catalogue():
    nodes = []
    try:
        import nuke
        version = nuke.NUKE_VERSION_STRING
        for class_name in nuke.allNodeClassNames():
            try:
                knobs = {}
                try:
                    n = nuke.createNode(class_name, inpanel=False)
                    for k in n.knobs().values():
                        try:
                            knobs[k.name()] = {"name": k.name(), "label": k.label() or k.name(),
                                               "ptype": "float", "default": None, "options": None}
                        except: pass
                    nuke.delete(n)
                except: pass
                nodes.append({
                    "name": class_name, "displayName": class_name, "category": "comp",
                    "description": f"{class_name} (Nuke)", "tags": ["nuke"],
                    "maxInputs": 4, "maxOutputs": 1,
                    "parameters": list(knobs.values())[:20],
                })
            except: pass
    except: pass
    return nodes


# ─── Main loop (with auto-retry) ─────────────────────────────────────────────

def _loop():
    global _sock, _running
    while _running:
        try:
            import nuke
            _sock = socket.create_connection((CORTEX_HOST, CORTEX_PORT), timeout=4)
            _sock.settimeout(None)
            _ws_handshake(_sock)
            _ws_send(_sock, json.dumps({
                "type": "HELLO", "software": "Nuke",
                "version": nuke.NUKE_VERSION_STRING,
                "clientId": f"nuke-{os.getpid()}",
            }))
            while _running:
                text = _ws_recv(_sock)
                if text is None: continue
                msg = json.loads(text)
                t   = msg.get("type", "")
                if t == "REQUEST_NODES":
                    nodes = _build_catalogue()
                    _ws_send(_sock, json.dumps({"type":"NODE_CATALOGUE","nodes":nodes,"total":len(nodes)}))
                elif t == "PING":
                    _ws_send(_sock, json.dumps({"type":"PONG"}))
        except ConnectionRefusedError:
            pass
        except Exception:
            pass
        finally:
            if _sock:
                try: _sock.close()
                except: pass
                _sock = None
        if _running: time.sleep(RETRY_SECS)


def start():
    global _running
    if _running: return
    _running = True
    threading.Thread(target=_loop, daemon=True, name="cortex-bridge").start()

def stop():
    global _running
    _running = False

atexit.register(stop)
start()
