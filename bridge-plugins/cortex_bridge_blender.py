"""
CORTEX Bridge Plugin — Blender
================================
Scripting tab → paste and Run Script  (or add to startup scripts)
Sends all Blender node types + live scene to CORTEX.
"""

import bpy
import json
import threading
import time

import socket, struct, base64, os

CORTEX_URL = "ws://127.0.0.1:7878"
CLIENT_ID  = f"blender-{int(time.time())}"
_ws        = None
_running   = False

CATEGORY_MAP = {
    "ShaderNodeTree":    "vop",
    "GeometryNodeTree":  "sop",
    "CompositorNodeTree":"cop",
    "TextureNodeTree":   "vop",
    "AnimNodeTree":      "chop",
}


def _hs(sock):
    key = base64.b64encode(os.urandom(16)).decode()
    req = f"GET / HTTP/1.1\r\nHost: 127.0.0.1:7878\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
    sock.sendall(req.encode()); resp = b""
    while b"\r\n\r\n" not in resp: resp += sock.recv(1024)

def _send(sock, text):
    d = text.encode(); n = len(d); mask = os.urandom(4)
    m = bytes(b ^ mask[i%4] for i,b in enumerate(d))
    h = bytes([0x81, 0x80|n])+mask if n<=125 else bytes([0x81,0xFE])+struct.pack(">H",n)+mask
    sock.sendall(h+m)

def _recv(sock):
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
    return pay.decode("utf-8",errors="replace") if op in(1,2) else None

def send(sock, msg):
    try: _send(sock, json.dumps(msg))
    except Exception as e: print(f"[CORTEX] {e}")


def build_catalogue():
    nodes = []
    seen  = set()
    for node_cls in bpy.types.Node.__subclasses__():
        try:
            name = node_cls.__name__
            if name in seen: continue
            seen.add(name)

            label = getattr(node_cls, 'bl_label', name)
            cat   = "sop"
            for tree_type, mapped in CATEGORY_MAP.items():
                if tree_type.lower() in name.lower():
                    cat = mapped; break

            nodes.append({
                "name":        name,
                "displayName": label,
                "category":    cat,
                "description": f"{label} (Blender)",
                "tags":        ["blender", cat],
                "maxInputs":   4,
                "maxOutputs":  1,
                "parameters":  [],
            })
        except: pass

    # Also walk node trees in the current blend file
    for ng in bpy.data.node_groups:
        for node in ng.nodes:
            try:
                name = type(node).__name__
                if name in seen: continue
                seen.add(name)
                cat = CATEGORY_MAP.get(ng.bl_idname, "sop")
                nodes.append({
                    "name":        name,
                    "displayName": node.name,
                    "category":    cat,
                    "description": f"{node.name} (Blender scene node)",
                    "tags":        ["blender", cat, "scene"],
                    "maxInputs":   len(node.inputs),
                    "maxOutputs":  len(node.outputs),
                    "parameters":  [],
                })
            except: pass

    return nodes


def build_scene():
    scene_nodes = []
    connections = []
    for ng in bpy.data.node_groups:
        cat = CATEGORY_MAP.get(ng.bl_idname, "sop")
        for node in ng.nodes:
            scene_nodes.append({
                "id":         f"{ng.name}::{node.name}",
                "name":       node.name,
                "nodeType":   type(node).__name__,
                "category":   cat,
                "position":   [node.location.x, node.location.y],
                "parameters": {},
            })
            for inp in node.inputs:
                for link in inp.links:
                    connections.append({
                        "fromNode":   f"{ng.name}::{link.from_node.name}",
                        "fromOutput": 0,
                        "toNode":     f"{ng.name}::{node.name}",
                        "toInput":    list(node.inputs).index(inp),
                    })
    return scene_nodes, connections


def _loop():
    global _ws, _running
    try:
        _ws = socket.create_connection(("127.0.0.1", 7878), timeout=5)
        _ws.settimeout(None); _hs(_ws)
        send(_ws, {"type":"HELLO","software":"Blender","version":bpy.app.version_string,"clientId":CLIENT_ID})
        while _running:
            text = _recv(_ws)
            if not text: continue
            msg = json.loads(text); t = msg.get("type","")
            if t == "WELCOME": print(f"[CORTEX] Connected {msg.get('serverVersion')}")
            elif t == "REQUEST_NODES":
                nodes = build_catalogue()
                print(f"[CORTEX] Sending {len(nodes)} nodes")
                send(_ws, {"type":"NODE_CATALOGUE","nodes":nodes,"total":len(nodes)})
            elif t == "REQUEST_SCENE":
                sn,sc = build_scene()
                send(_ws, {"type":"SCENE_GRAPH","nodes":sn,"connections":sc})
    except Exception as e: print(f"[CORTEX] {e}")
    finally: _running = False

def start():
    global _running; _running = True
    threading.Thread(target=_loop, daemon=True).start()
    print("[CORTEX] Connecting from Blender…")

print("CORTEX Bridge — Blender"); start()
