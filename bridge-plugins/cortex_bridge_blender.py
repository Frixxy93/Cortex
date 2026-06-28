"""CORTEX Bridge — Blender
Run inside Blender's Scripting workspace (Text Editor → Run Script).
"""
import json, socket, threading, struct, base64, os, time, atexit

HOST, PORT = "127.0.0.1", 7878
_sock, _running = None, False

def _hs(sock):
    k = base64.b64encode(os.urandom(16)).decode()
    sock.sendall((
        f"GET / HTTP/1.1\r\nHost: {HOST}:{PORT}\r\n"
        "Upgrade: websocket\r\nConnection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {k}\r\nSec-WebSocket-Version: 13\r\n\r\n"
    ).encode())
    r = b""
    while b"\r\n\r\n" not in r: r += sock.recv(4096)
    if b"101" not in r: raise ConnectionError

def _send(sock, obj):
    d = json.dumps(obj).encode(); n = len(d); m = os.urandom(4)
    e = bytes(a^b for a,b in zip(d, (m*((n>>2)+1))[:n]))
    h = bytes([0x81, 0x80|n])+m if n<=125 else bytes([0x81,0xFE])+struct.pack(">H",n)+m if n<=65535 else bytes([0x81,0xFF])+struct.pack(">Q",n)+m
    sock.sendall(h+e)

def _recv(sock):
    def rx(n):
        b=b""
        while len(b)<n:
            c=sock.recv(n-len(b))
            if not c: raise ConnectionError
            b+=c
        return b
    h=rx(2); op=h[0]&0xF; pl=h[1]&0x7F
    if pl==126: pl=struct.unpack(">H",rx(2))[0]
    elif pl==127: pl=struct.unpack(">Q",rx(8))[0]
    mk=rx(4) if h[1]&0x80 else b""
    p=rx(pl)
    if mk: p=bytes(a^b for a,b in zip(p,(mk*((pl>>2)+1))[:pl]))
    if op==0x8: raise ConnectionError
    if op==0x9: _send(sock,{"type":"PONG"}); return None
    return p.decode("utf-8","replace") if op in(1,2) else None

def _catalogue():
    nodes = []
    try:
        import bpy
        prefixes = [("ShaderNode","shader"),("GeometryNode","geometry"),("CompositorNode","compositor"),("FunctionNode","function"),("TextureNode","texture")]
        seen = set()
        for name in dir(bpy.types):
            for prefix, cat in prefixes:
                if name.startswith(prefix) and name not in seen:
                    seen.add(name)
                    label = name[len(prefix):]
                    nodes.append({"name":name,"displayName":label,"category":cat,"description":label,"maxInputs":4,"maxOutputs":2})
    except: pass
    return nodes

def _loop():
    global _sock, _running
    while _running:
        try:
            _sock = socket.create_connection((HOST,PORT), timeout=5)
            _sock.settimeout(None)
            _hs(_sock)
            import bpy
            ver = ".".join(str(v) for v in bpy.app.version)
            _send(_sock, {"type":"HELLO","software":"Blender","version":ver,"clientId":f"blender-{os.getpid()}"})
            while _running:
                msg = _recv(_sock)
                if msg is None: continue
                t = json.loads(msg).get("type","")
                if t == "REQUEST_NODES":
                    ns = _catalogue()
                    _send(_sock, {"type":"NODE_CATALOGUE","nodes":ns,"total":len(ns)})
                elif t == "PING":
                    _send(_sock, {"type":"PONG"})
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

atexit.register(stop)
start()
