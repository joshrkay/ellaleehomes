import json, math, sys, os, collections
O = sys.argv[1]; out = sys.argv[2]
S, N, W_PX, H_PX = 33.445, 33.650, 800, 500
k = math.cos(math.radians((S + N) / 2)); span = (N - S) * (W_PX / H_PX) / k; CX = -111.960
W, E = CX - span / 2, CX + span / 2
X = lambda lon: (lon - W) / (E - W) * W_PX
Y = lambda lat: (N - lat) / (N - S) * H_PX
def simp(pts, tol):
    if len(pts) < 3: return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]; dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy) or 1e-9
    best, idx = -1, 0
    for i in range(1, len(pts) - 1):
        x0, y0 = pts[i]; dd = abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / L
        if dd > best: best, idx = dd, i
    if best <= tol: return [pts[0], pts[-1]]
    return simp(pts[:idx + 1], tol)[:-1] + simp(pts[idx:], tol)
def simp_any(pts, tol):
    if len(pts) > 3 and pts[0] == pts[-1]:  # closed ring: split at the point farthest from the start
        far = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
        return simp(pts[:far + 1], tol)[:-1] + simp(pts[far:], tol)
    return simp(pts, tol)
def P(lonlats, tol, close=False):
    pts = simp_any([(X(a), Y(b)) for a, b in lonlats], tol)
    if len(pts) < 2: return ''
    # drop paths entirely outside a margin around the view
    if all(x < -60 or x > W_PX + 60 or y < -60 or y > H_PX + 60 for x, y in pts): return ''
    return 'M' + 'L'.join('%.0f %.0f' % p for p in pts) + ('Z' if close else '')
def chain(lines):
    """Join line pieces that share endpoints (coords rounded to 1e-6)."""
    key = lambda p: (round(p[0], 6), round(p[1], 6))
    segs = [list(l) for l in lines if len(l) > 1]; out = []
    ends = collections.defaultdict(list)
    while segs:
        cur = segs.pop(); grown = True
        while grown:
            grown = False
            for i, s in enumerate(segs):
                if key(s[0]) == key(cur[-1]): cur += s[1:]
                elif key(s[-1]) == key(cur[-1]): cur += s[::-1][1:]
                elif key(s[-1]) == key(cur[0]): cur = s + cur[1:]
                elif key(s[0]) == key(cur[0]): cur = s[::-1] + cur[1:]
                else: continue
                segs.pop(i); grown = True; break
        out.append(cur)
    return out
res = {'view': {'S': S, 'N': N, 'W': round(W, 5), 'E': round(E, 5), 'w': W_PX, 'h': H_PX}}
# towns
towns = {}
for el in json.load(open(os.path.join(O, 'towns.json')))['elements']:
    ways = [[(g['lon'], g['lat']) for g in m['geometry']] for m in el['members'] if m.get('role') in ('outer', '') and 'geometry' in m]
    towns[el['tags']['name']] = ''.join(P(r, 0.7, True) for r in chain(ways) if len(r) > 3)
res['towns'] = towns
# parks from nominatim geojson
def gj(fn, want):
    for x in json.load(open(os.path.join(O, fn))):
        if want(x): return x['geojson']
parks = []
for name, fn, want in [('Phoenix Mountains Preserve', 'nom_preserve.json', lambda x: x['type'] == 'nature_reserve'),
                       ('Camelback Mountain', 'nom_echo.json', lambda x: x['osm_type'] == 'way'),
                       ('Papago Park', 'nom_papago.json', lambda x: x['type'] == 'park')]:
    g = gj(fn, want); polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    parks.append([name, ''.join(P(poly[0], 0.7, True) for poly in polys)])
res['parks'] = parks
canal = gj('nom_canal.json', lambda x: x['osm_type'] == 'relation')
res['canal'] = ''.join(P(l, 0.5) for l in ([canal['coordinates']] if canal['type'] == 'LineString' else canal['coordinates']))
mw = [[(g['lon'], g['lat']) for g in e['geometry']] for e in json.load(open(os.path.join(O, 'motorways.json')))['elements']]
res['motorways'] = ''.join(P(l, 0.8) for l in chain(mw))
roads = collections.defaultdict(list)
for e in json.load(open(os.path.join(O, 'roads.json')))['elements']:
    n = e['tags']['name']; base = n.split(' ', 1)[1] if n.split(' ')[0] in ('East', 'West', 'North', 'South') else n
    roads[base].append([(g['lon'], g['lat']) for g in e['geometry']])
res['roads'] = {b: ''.join(P(l, 0.8) for l in chain(ls)) for b, ls in roads.items()}
json.dump(res, open(out, 'w'), separators=(',', ':'))
print(res['view']); print({k: len(v) for k, v in res['towns'].items()}, [(n, len(p)) for n, p in parks], 'canal', len(res['canal']), 'mw', len(res['motorways'])); print({k: len(v) for k, v in res['roads'].items()}); print('total bytes', os.path.getsize(out))
