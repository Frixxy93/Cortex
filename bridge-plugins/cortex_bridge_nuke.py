"""
CORTEX Bridge Plugin — Nuke
============================
Nuke Script Editor → run this script.
Exports all Nuke node types + current comp graph to CORTEX.
"""

import nuke
import json, threading, time, socket, struct, base64, os

CLIENT_ID = f"nuke-{int(time.time())}"
_ws = None; _running = False

def _hs(sock):
    key=base64.b64encode(os.urandom(16)).decode()
    req=f"GET / HTTP/1.1\r\nHost: 127.0.0.1:7878\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
    sock.sendall(req.encode()); resp=b""
    while b"\r\n\r\n" not in resp: resp+=sock.recv(1024)

def _send(sock,text):
    d=text.encode(); n=len(d); mask=os.urandom(4)
    m=bytes(b^mask[i%4] for i,b in enumerate(d))
    h=bytes([0x81,0x80|n])+mask if n<=125 else bytes([0x81,0xFE])+struct.pack(">H",n)+mask
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

NUKE_CATEGORIES = {
    "Transform": "sop", "Color": "cop", "Filter": "cop",
    "Merge":     "sop", "Channel": "chop", "3D": "sop",
    "Particles": "dop", "Deep":    "cop",  "Draw": "cop",
    "Time":      "chop","Other":   "other","Image": "cop",
    "Viewer":    "other",
}

def send(ws, msg):
    try: ws.send(json.dumps(msg))
    except Exception as e: print(f"[CORTEX] {e}")

def build_catalogue():
    nodes = []
    seen  = set()
    for cls in nuke.allNodes.__doc__ and dir(nuke) or []:
        pass
    # Use nuke.createNode to enumerate (safe approach: read menu)
    try:
        for menu_item in nuke.menu("Nodes").items():
            try:
                label = menu_item.name()
                name  = label.replace(" ", "").replace("/", "_")
                if name in seen: continue
                seen.add(name)
                # Guess category from menu path
                cat = "cop"
                for k, v in NUKE_CATEGORIES.items():
                    if k.lower() in label.lower():
                        cat = v; break
                nodes.append({
                    "name": name, "displayName": label,
                    "category": cat, "description": f"{label} (Nuke)",
                    "tags": ["nuke", cat], "maxInputs": 4, "maxOutputs": 1,
                    "parameters": [],
                })
            except: pass
    except: pass

    # Also enumerate all nodes in the current comp
    for node in nuke.allNodes(recurseGroups=True):
        try:
            ntype = node.Class()
            if ntype in seen: continue
            seen.add(ntype)
            cat = "cop"
            for k, v in NUKE_CATEGORIES.items():
                if k.lower() in ntype.lower():
                    cat = v; break
            nodes.append({
                "name": ntype, "displayName": ntype,
                "category": cat, "description": f"{ntype} (Nuke)",
                "tags": ["nuke", cat], "maxInputs": 4, "maxOutputs": 1,
                "parameters": [],
            })
        except: pass
    return nodes

def build_scene():
    scene_nodes = []; connections = []
    for node in nuke.allNodes(recurseGroups=True):
        try:
            scene_nodes.append({
                "id": node.fullName(), "name": node.name(),
                "nodeType": node.Class(), "category": "cop",
                "position": [float(node.xpos()), float(node.ypos())],
                "parameters": {},
            })
            for i in range(node.inputs()):
                src = node.input(i)
                if src:
                    connections.append({
                        "fromNode": src.fullName(), "fromOutput": 0,
                        "toNode": node.fullName(), "toInput": i,
                    })
        except: pass
    return scene_nodes, connections

def _loop():
    global _ws, _running
    try:
        _ws = socket.create_connection(("127.0.0.1", 7878), timeout=5)
        _ws.settimeout(None); _hs(_ws)
        send(_ws, {"type":"HELLO","software":"Nuke",
                   "version":nuke.env.get("NukeVersionString","unknown"),"clientId":CLIENT_ID})
        while _running:
            text = _recv(_ws)
            if not text: continue
            msg=json.loads(text); t=msg.get("type","")
            if t=="WELCOME": print(f"[CORTEX] Connected {msg.get('serverVersion')}")
            elif t=="REQUEST_NODES":
                nodes=build_catalogue(); print(f"[CORTEX] Sending {len(nodes)} node types")
                send(_ws,{"type":"NODE_CATALOGUE","nodes":nodes,"total":len(nodes)})
            elif t=="REQUEST_SCENE":
                sn,sc=build_scene(); send(_ws,{"type":"SCENE_GRAPH","nodes":sn,"connections":sc})
    except Exception as e: print(f"[CORTEX] {e}")
    finally: _running=False

def start():
    global _running; _running=True
    threading.Thread(target=_loop,daemon=True).start()
    print("[CORTEX] Connecting from Nuke…")

print("CORTEX Bridge — Nuke"); start()
