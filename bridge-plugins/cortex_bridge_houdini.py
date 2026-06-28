"""
CORTEX Bridge — Houdini
========================
Run this inside Houdini's Python Shell:

  exec(open(r"C:/Users/.../Documents/cortex-bridge/cortex_bridge_houdini.py").read())

What it does:
  1. Exports all node types to ~/Documents/cortex-bridge/houdini_nodes.json
  2. Sends them to CORTEX via WebSocket (ws://127.0.0.1:7878)
  3. CORTEX automatically saves them to the database

No output file? CORTEX is not running — start it first.
"""

import json, os, socket, threading, struct, base64, time, atexit

HOST, PORT   = "127.0.0.1", 7878
EXPORT_FILE  = os.path.join(os.path.expanduser("~"), "Documents", "cortex-bridge", "houdini_nodes.json")

_sock, _running = None, False

CAT_MAP = {
    "Sop":"sop","Vop":"vop","Dop":"dop","Chop":"chop",
    "Lop":"lop","Top":"top","Cop2":"cop","Driver":"rop",
    "Object":"object","Shop":"shop",
}

# ── Build catalogue (no parmTemplateGroup — fast) ─────────────────────────────

def _build():
    import hou
    nodes = []
    for cat_name, ctx in hou.nodeTypeCategories().items():
        mapped = CAT_MAP.get(cat_name, cat_name.lower())
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
            except:
                pass
    return nodes

# ── Save to JSON file ─────────────────────────────────────────────────────────

def _save_json(nodes):
    os.makedirs(os.path.dirname(EXPORT_FILE), exist_ok=True)
    with open(EXPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(nodes, f, indent=2)
    print(f"[CORTEX] Saved {len(nodes)} nodes → {EXPORT_FILE}")

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
        raise ConnectionError("WebSocket upgrade failed")

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
    if op == 0x8: raise ConnectionError("server closed")
    if op == 0x9: _send(sock, {"type": "PONG"}); return None
    return p.decode("utf-8", "replace") if op in (0x1, 0x2) else None

# ── Main loop (keeps connection alive for re-export) ──────────────────────────

def _loop():
    global _sock, _running
    while _running:
        try:
            _sock = socket.create_connection((HOST, PORT), timeout=5)
            _sock.settimeout(None)
            _hs(_sock)

            import hou
            _send(_sock, {
                "type":     "HELLO",
                "software": "Houdini",
                "version":  hou.applicationVersionString(),
                "clientId": f"hou-{os.getpid()}",
            })

            while _running:
                msg = _recv(_sock)
                if msg is None: continue
                t = json.loads(msg).get("type", "")

                if t == "REQUEST_NODES":
                    print("[CORTEX] Building node catalogue…")
                    nodes = _build()
                    _save_json(nodes)                          # → houdini_nodes.json
                    _send(_sock, {                             # → WebSocket → DB
                        "type":  "NODE_CATALOGUE",
                        "nodes": nodes,
                        "total": len(nodes),
                    })
                    print(f"[CORTEX] Sent {len(nodes)} nodes to CORTEX — check the library!")

                elif t == "PING":
                    _send(_sock, {"type": "PONG"})

        except ConnectionRefusedError:
            print("[CORTEX] CORTEX not running — start CORTEX first, then re-run this script.")
            break
        except Exception as e:
            print(f"[CORTEX] Disconnected ({e}) — reconnecting in 10s…")
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
    threading.Thread(target=_loop, daemon=True, name="cortex-bridge").start()

def stop():
    global _running
    _running = False
    if _sock:
        try: _sock.close()
        except: pass

atexit.register(stop)
start()
