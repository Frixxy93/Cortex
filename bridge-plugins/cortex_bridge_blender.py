"""
CORTEX Auto-Bridge — Blender
==============================
Installed to: %APPDATA%\\Blender Foundation\\Blender\\{ver}\\scripts\\startup\\
Blender auto-executes all files in scripts/startup/ on launch.
No external dependencies — uses Python's built-in socket module.
"""

import json, socket, threading, struct, base64, os, time, atexit

CORTEX_HOST = "127.0.0.1"
CORTEX_PORT = 7878
RETRY_SECS  = 8

_sock    = None
_running = False
_thread  = None


# ─── Minimal WebSocket client ────────────────────────────────────────────────

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
        chunk = sock.recv(4096)
        if not chunk:
            raise ConnectionError("Server closed during handshake")
        resp += chunk
    if b"101" not in resp:
        raise ConnectionError(f"WS upgrade failed: {resp[:200]}")


def _ws_send(sock, text):
    data = text.encode("utf-8")
    n    = len(data)
    mask = os.urandom(4)
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
    if masked:
        pay = bytes(b ^ mkey[i % 4] for i, b in enumerate(pay))
    if opcode == 0x8:
        raise ConnectionError("Server sent close frame")
    if opcode == 0x9:
        # Protocol-level ping — respond with pong
        pong_hdr = bytes([0x8A, 0x80]) + os.urandom(4)
        try: sock.sendall(pong_hdr)
        except: pass
        return None
    if opcode in (0x1, 0x2):
        return pay.decode("utf-8", "replace")
    return None


# ─── Blender node catalogue ──────────────────────────────────────────────────

def _build_catalogue():
    nodes = []
    try:
        import bpy
        seen = set()
        for name in dir(bpy.types):
            if not name.endswith("Node") or name == "Node":
                continue
            try:
                cls = getattr(bpy.types, name)
                if not (isinstance(cls, type) and issubclass(cls, bpy.types.Node)):
                    continue
                if name in seen:
                    continue
                seen.add(name)
                label   = getattr(cls, "bl_label", None) or name
                cat_raw = getattr(cls, "bl_category", None) or ""
                cat     = cat_raw.lower().replace(" ", "_") or "shader"
                nodes.append({
                    "name":        name,
                    "displayName": label,
                    "category":    cat,
                    "description": f"{label} ({cat})",
                    "tags":        [],
                    "maxInputs":   4,
                    "maxOutputs":  2,
                    "parameters":  [],
                })
            except Exception:
                pass
    except Exception:
        pass
    return nodes


# ─── Main loop ───────────────────────────────────────────────────────────────

def _loop():
    global _sock, _running
    while _running:
        try:
            _sock = socket.create_connection((CORTEX_HOST, CORTEX_PORT), timeout=5)
            _sock.settimeout(None)
            _ws_handshake(_sock)

            try:
                import bpy
                ver = bpy.app.version_string
            except Exception:
                ver = "unknown"

            _ws_send(_sock, json.dumps({
                "type":     "HELLO",
                "software": "Blender",
                "version":  ver,
                "clientId": f"blender-{os.getpid()}",
            }))

            while _running:
                text = _ws_recv(_sock)
                if text is None:
                    continue
                try:
                    msg = json.loads(text)
                except Exception:
                    continue
                t = msg.get("type", "")

                if t == "REQUEST_NODES":
                    nodes = _build_catalogue()
                    _ws_send(_sock, json.dumps({
                        "type":  "NODE_CATALOGUE",
                        "nodes": nodes,
                        "total": len(nodes),
                    }))
                elif t == "PING":
                    _ws_send(_sock, json.dumps({"type": "PONG"}))

        except ConnectionRefusedError:
            pass  # CORTEX not running yet — retry silently
        except Exception:
            pass  # Any other error — retry
        finally:
            if _sock:
                try: _sock.close()
                except: pass
                _sock = None

        if _running:
            time.sleep(RETRY_SECS)


def start():
    global _thread, _running
    if _running:
        return
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


# ─── Blender addon boilerplate (startup scripts call register() if present) ──

bl_info = {
    "name":    "CORTEX Bridge",
    "author":  "CORTEX",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "category": "System",
    "description": "Auto-connect Blender to CORTEX node intelligence platform",
}


def register():
    start()


def unregister():
    stop()


# Module-level start — runs whether or not register() is called
start()
