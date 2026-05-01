import json
from collections import defaultdict

data = json.load(open('d:/BUE/Year 3/Graudation project/project/p2p_anomaly_api/ocel2-p2p.json'))
obj_graph = defaultdict(list)
obj_to_po = {}
po_count = 0

for o in data.get('objects', []):
    if o.get('type') == 'purchase_order':
        po_count += 1
        obj_to_po[o['id']] = o['id']
    for r in o.get('relationships', []):
        obj_graph[o['id']].append(r['objectId'])
        obj_graph[r['objectId']].append(o['id'])

for o in data.get('objects', []):
    if o['id'] in obj_to_po:
        continue
    q = [o['id']]
    v = {o['id']}
    po = None
    while q:
        curr = q.pop(0)
        if curr.startswith('purchase_order:'):
            po = curr
            break
        for n in obj_graph[curr]:
            if n not in v:
                v.add(n)
                q.append(n)
    if po:
        obj_to_po[o['id']] = po

missing = 0
types = defaultdict(int)
missing_rels = set()

for e in data.get('events', []):
    found = False
    for r in e.get('relationships', []):
        if r['objectId'] in obj_to_po:
            found = True
            break
    if not found:
        missing += 1
        types[e['type']] += 1
        for r in e.get('relationships', []):
            missing_rels.add(r['objectId'])

print('Total POs:', po_count)
print('Missing Events:', missing)
print('Missing Event Types:', dict(types))
print('Missing Event Rel Targets:', list(missing_rels)[:10])
