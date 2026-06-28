"""
CORTEX Export — Nuke (menu walk, no createNode = no crash)
===========================================================
Paste into Nuke's Script Editor and press Ctrl+Enter:

  exec(open(r"D:\FRIXXY\APP\cortex\export-scripts\cortex_export_nuke.py").read())

Walks nuke.menu('Nodes') to discover every installed node.
Does NOT call createNode — zero crash risk.
"""

import json, os, re, socket, threading, struct, base64, time, atexit
import nuke

HOST, PORT = "127.0.0.1", 7878
_sock, _running = None, False
_catalogue      = []

# Top-level menu name → CORTEX category
CAT_MAP = {
    "Color":         "color",
    "Filter":        "filter",
    "Merge":         "merge",
    "Transform":     "transform",
    "Channel":       "channel",
    "Draw":          "draw",
    "Keyer":         "cop",
    "Deep":          "deep",
    "3D":            "object",
    "Particles":     "dop",
    "Time":          "chop",
    "Image":         "cop",
    "Other":         "utility",
    "Multiview":     "utility",
    "Views":         "utility",
    "Blur":          "filter",
    "Distort":       "filter",
    "Generate":      "cop",
    "Optical Flow":  "filter",
    "Scenegraph":    "object",
    "Stereo":        "utility",
    "Z":             "filter",
}

# ── Walk Nodes menu ───────────────────────────────────────────────────────────

def _walk_menu():
    """Returns list of (cls, top_category) for every node in the menu."""
    result  = []
    seen    = set()

    def walk(menu, top_cat):
        try:
            items = menu.items()
        except Exception:
            return
        for item in items:
            try:
                name = item.name()
                if not name or name.startswith('-'):
                    continue
                # Sub-menu?
                try:
                    sub = item.items()
                    walk(item, top_cat or name)
                    continue
                except Exception:
                    pass
                # Leaf — try to get class from script()
                cls = None
                try:
                    script = item.script() or ""
                    m = re.search(r"createNode\s*\(\s*['\"](\w+)['\"]", script)
                    if m:
                        cls = m.group(1)
                except Exception:
                    pass
                if not cls:
                    cls = name.strip()
                if cls and cls not in seen:
                    seen.add(cls)
                    result.append((cls, top_cat or "Other"))
            except Exception:
                pass

    try:
        for top_item in nuke.menu('Nodes').items():
            try:
                top_name = top_item.name()
                if not top_name or top_name.startswith('-'):
                    continue
                walk(top_item, top_name)
            except Exception:
                pass
    except Exception as e:
        print(f"[CORTEX] Menu walk error: {e}")

    return result

# ── Build catalogue (no createNode) ──────────────────────────────────────────

def _build():
    print("[CORTEX] Walking Nuke menu...")
    entries = _walk_menu()
    print(f"[CORTEX] Found {len(entries)} nodes. Building catalogue...")

    nodes = []
    for cls, menu_cat in entries:
        category = CAT_MAP.get(menu_cat, menu_cat.lower().replace(' ', '_') if menu_cat else "utility")
        nodes.append({
            "name":        cls,
            "displayName": cls,
            "category":    category,
            "description": f"{cls} ({menu_cat})",
            "maxInputs":   1,
            "maxOutputs":  1,
            "parameters":  [],
        })

    print(f"[CORTEX] Built {len(nodes)} nodes.")
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
    h=rx(2); op=h[0]&0xF; pl=h[1]&0x7F
    if pl==126: pl=struct.unpack(">H",rx(2))[0]
    elif pl==127: pl=struct.unpack(">Q",rx(8))[0]
    mk=rx(4) if h[1]&0x80 else b""
    p=rx(pl)
    if mk: p=bytes(a^b for a,b in zip(p,(mk*((pl>>2)+1))[:pl]))
    if op==0x8: raise ConnectionError("closed")
    if op==0x9: _send(sock,{"type":"PONG"}); return None
    return p.decode("utf-8","replace") if op in(0x1,0x2) else None

def _loop():
    global _sock, _running
    while _running:
        try:
            _sock = socket.create_connection((HOST, PORT), timeout=5)
            _sock.settimeout(None)
            _hs(_sock)
            _send(_sock, {
                "type":     "HELLO",
                "software": "Nuke",
                "version":  nuke.NUKE_VERSION_STRING,
                "clientId": f"nuke-{os.getpid()}",
            })
            while _running:
                msg = _recv(_sock)
                if msg is None: continue
                t = json.loads(msg).get("type", "")
                if t == "REQUEST_NODES":
                    print(f"[CORTEX] Sending {len(_catalogue)} nodes...")
                    _send(_sock, {"type": "NODE_CATALOGUE", "nodes": _catalogue, "total": len(_catalogue)})
                    print("[CORTEX] Done! Nodes saved to CORTEX database.")
                elif t == "PING":
                    _send(_sock, {"type": "PONG"})
        except ConnectionRefusedError:
            print("[CORTEX] CORTEX not running — start it first."); break
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
    _catalogue = _build()
    print(f"[CORTEX] Connecting to CORTEX...")
    if not _catalogue:
        print("[CORTEX] No nodes found."); return
    _running = True
    threading.Thread(target=_loop, daemon=True, name="cortex-nuke").start()

atexit.register(stop)
start()
