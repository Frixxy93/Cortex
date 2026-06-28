"""
CORTEX Bridge Plugin — Maya
============================
Maya Script Editor (Python tab) → run this script.
Exports all Maya node types + Hypergraph scene to CORTEX.
"""

import maya.cmds as cmds
import maya.mel as mel
import json, threading, time, socket, struct, base64, os

CLIENT_ID = f"maya-{int(time.time())}"
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

CAT_MAP = {
    "shader":   "vop", "texture": "vop", "light": "object",
    "transform":"object", "shape": "sop", "deformer": "sop",
    "utility":  "sop", "render": "rop", "general": "other",
}

def send(ws, msg):
    try: ws.send(json.dumps(msg))
    except Exception as e: print(f"[CORTEX] {e}")

def get_maya_version():
    try: return cmds.about(version=True)
    except: return "unknown"

def build_catalogue():
    nodes = []
    seen  = set()
    try:
        all_types = cmds.allNodeTypes() or []
        for ntype in all_types:
            if ntype in seen: continue
            seen.add(ntype)
            try:
                classification = cmds.getClassification(ntype)
                raw_cat = classification[0].split("/")[0].lower() if classification else "other"
                cat = CAT_MAP.get(raw_cat, "sop")
                attrs = cmds.attributeInfo(allAttributes=True, type=ntype) or []
                parms = [{"name": a, "label": a, "ptype": "float", "default": None}
                         for a in attrs[:20]]
                nodes.append({
                    "name":        ntype,
                    "displayName": ntype,
                    "category":    cat,
                    "description": f"{ntype} Maya node",
                    "tags":        ["maya", cat, raw_cat],
                    "maxInputs":   2,
                    "maxOutputs":  1,
                    "parameters":  parms,
                })
            except: pass
    except Exception as e:
        print(f"[CORTEX] Catalogue error: {e}")
    return nodes

def build_scene():
    scene_nodes = []; connections = []
    try:
        for node in cmds.ls(dag=True) or []:
            try:
                ntype = cmds.nodeType(node)
                pos   = [0.0, 0.0]
                try:
                    x = cmds.getAttr(f"{node}.translateX") or 0
                    y = cmds.getAttr(f"{node}.translateY") or 0
                    pos = [float(x), float(y)]
                except: pass
                scene_nodes.append({
                    "id": node, "name": node, "nodeType": ntype,
                    "category": "object", "position": pos, "parameters": {},
                })
            except: pass
        for conn in cmds.ls(connections=True) or []:
            pass  # connection listing handled differently in Maya
    except Exception as e:
        print(f"[CORTEX] Scene error: {e}")
    return scene_nodes, connections

def _loop():
    global _ws, _running
    try:
        _ws = socket.create_connection(("127.0.0.1", 7878), timeout=5)
        _ws.settimeout(None); _hs(_ws)
        send(_ws, {"type":"HELLO","software":"Maya","version":get_maya_version(),"clientId":CLIENT_ID})
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
    print("[CORTEX] Connecting from Maya…")

print("CORTEX Bridge — Maya"); start()
