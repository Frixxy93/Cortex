"""
CORTEX Export — Katana
=======================
Paste into Katana's Script Editor (Python tab) and press Ctrl+Enter:

  exec(open(r"D:\FRIXXY\APP\cortex\export-scripts\cortex_export_katana.py").read())

Discovers all Katana node types via NodegraphAPI and exports with
full parameter definitions to CORTEX via WebSocket.
"""

import json, os, socket, threading, struct, base64, time, atexit

HOST, PORT = "127.0.0.1", 7878
_sock, _running = None, False
_catalogue      = []

# ── Parameter type mapping ────────────────────────────────────────────────────

def _param_type(param):
    """Map a Katana Parameter object to a CORTEX parameter type string."""
    try:
        t = param.getType()
        if t == "number":
            # Check tuple size for vectors
            try:
                size = param.getNumChildren() if hasattr(param, 'getNumChildren') else 1
                if size == 2: return "vector2"
                if size == 3: return "vector3"
                if size == 4: return "vector4"
            except: pass
            return "float"
        if t == "string":  return "string"
        if t == "integer": return "integer"
        if t in ("group", "struct"): return None  # recurse into groups
    except: pass
    return "string"

def _extract_params(param_group, group_name=None):
    """Recursively extract parameters from a Katana parameter group."""
    params = []
    try:
        for i in range(param_group.getNumChildren()):
            try:
                child = param_group.getChildByIndex(i)
                name  = child.getName()
                ptype = _extract_single(child, group_name)
                if ptype:
                    params.append(ptype)
                else:
                    # It's a group — recurse
                    params.extend(_extract_params(child, name))
            except: pass
    except: pass
    return params

def _extract_single(param, group=None):
    """Convert one Katana Parameter to a CORTEX param dict, or None if it's a group."""
    try:
        t = param.getType()
        if t in ("group", "struct"):
            return None  # caller recurses

        name  = param.getName()
        label = name.replace('_', ' ').title()
        ptype = "string"

        if t == "number":
            try:
                size = param.getNumChildren()
                if size == 2:   ptype = "vector2"
                elif size == 3: ptype = "vector3"
                elif size == 4: ptype = "vector4"
                else:           ptype = "float"
            except:
                ptype = "float"
        elif t == "integer": ptype = "integer"
        elif t == "string":
            # Check for enum hint
            try:
                hints = param.getHints()
                if hints and 'options' in hints:
                    ptype = "enum"
            except: pass
            ptype = ptype or "string"

        p = {"name": name, "label": label, "type": ptype}
        if group:
            p["group"] = group

        # Default value
        try:
            if ptype in ("float", "integer"):
                p["default"] = param.getValue(0)
            elif ptype == "string":
                p["default"] = param.getValue(0) or ""
            elif ptype == "enum":
                p["default"] = param.getValue(0) or ""
                try:
                    hints = param.getHints()
                    opts  = hints.get('options', '').split('|') if hints else []
                    p["options"] = [{"value": j, "label": v} for j, v in enumerate(opts) if v]
                except: pass
            elif ptype in ("vector2","vector3","vector4"):
                count = {"vector2":2,"vector3":3,"vector4":4}[ptype]
                try:
                    p["default"] = [param.getChildByIndex(i).getValue(0) for i in range(count)]
                except: pass
        except: pass

        return p
    except:
        return None

# ── Build catalogue ───────────────────────────────────────────────────────────

def _build():
    try:
        import NodegraphAPI
    except ImportError:
        print("[CORTEX] NodegraphAPI not available — run inside Katana.")
        return []

    # Get all registered node types
    try:
        all_types = NodegraphAPI.GetNodeTypes()
    except Exception as e:
        print(f"[CORTEX] Could not get node types: {e}")
        return []

    nodes   = []
    skipped = 0
    total   = len(all_types)

    print(f"[CORTEX] Found {total} Katana node types. Building catalogue...")

    for i, node_type in enumerate(sorted(all_types)):
        try:
            # Create a temporary node to read its parameters
            node = NodegraphAPI.CreateNode(node_type, NodegraphAPI.GetRootNode())
            if node is None:
                skipped += 1
                continue

            params = []
            try:
                param_group = node.getParameters()
                if param_group:
                    params = _extract_params(param_group)
            except: pass

            # Inputs / outputs
            max_in  = 0
            max_out = 0
            try: max_in  = min(node.getNumInputPorts(),  8)
            except: pass
            try: max_out = min(node.getNumOutputPorts(), 4)
            except: pass

            nodes.append({
                "name":        node_type,
                "displayName": node_type,
                "category":    "utility",  # Katana nodes are all scene-graph ops
                "description": node_type,
                "maxInputs":   max_in,
                "maxOutputs":  max_out,
                "parameters":  params,
            })

            # Clean up
            try: node.delete()
            except: pass

        except Exception as e:
            skipped += 1

        if (i + 1) % 50 == 0:
            print(f"[CORTEX]   {i+1}/{total} processed ({len(nodes)} built, {skipped} skipped)...")

    print(f"[CORTEX] Done — {len(nodes)} nodes built, {skipped} skipped.")
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
            try:
                import UI4
                version = UI4.App.Application.getVersionString()
            except:
                version = "unknown"
            _send(_sock, {
                "type":     "HELLO",
                "software": "Katana",
                "version":  version,
                "clientId": f"katana-{os.getpid()}",
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
    print("[CORTEX] Building Katana node catalogue (may take ~30s)...")
    _catalogue = _build()
    print(f"[CORTEX] Built {len(_catalogue)} nodes. Connecting to CORTEX...")
    if not _catalogue:
        print("[CORTEX] No nodes found. Run inside Katana."); return
    _running = True
    threading.Thread(target=_loop, daemon=True, name="cortex-katana").start()

atexit.register(stop)
start()
