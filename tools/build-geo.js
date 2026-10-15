// Builds data/geo-id.js — real Kab/Kota boundaries (BPS/OCHA via geoBoundaries,
// CC BY 3.0 IGO) packed as TopoJSON, grouped into 38 provinsi.
//
// Usage (needs topojson-server + topojson-simplify installed somewhere on NODE_PATH):
//   node tools/build-geo.js <path/to/geoBoundaries-IDN-ADM2_simplified.geojson>
const fs = require('fs');
const path = require('path');
const { topology } = require('topojson-server');
const { presimplify, simplify, quantile } = require('topojson-simplify');
const { quantize } = require('topojson-client');

const root = path.join(__dirname, '..');
const src = process.argv[2];
if (!src) throw new Error('Path to ADM2 GeoJSON required');

const adm2 = JSON.parse(fs.readFileSync(src, 'utf8'));
const prov34 = JSON.parse(fs.readFileSync(path.join(root, 'data/idn-prov2.geojson'), 'utf8'));

// Water bodies / non-administrative shapes in the source
const SKIP = new Set(['Danau', 'Danau Toba', 'Hutan', 'Waduk Cirata', 'Wadung Kedungombo']);

// Kode provinsi Kemendagri (38 provinsi, termasuk DOB Papua 2022)
const PAPUA_SPLIT = {
  93: ['Merauke', 'Boven Digoel', 'Mappi', 'Asmat'],
  94: ['Nabire', 'Paniai', 'Mimika', 'Puncak Jaya', 'Puncak', 'Dogiyai', 'Intan Jaya', 'Deiyai'],
  95: ['Jayawijaya', 'Lanny Jaya', 'Mamberamo Tengah', 'Nduga', 'Pegunungan Bintang', 'Tolikara', 'Yahukimo', 'Yalimo'],
  96: ['Kota Sorong', 'Sorong', 'Sorong Selatan', 'Raja Ampat', 'Tambrauw', 'Maybrat'],
};
// Name fixes so labels match common official spelling
const RENAME = {
  'Kota Baru': 'Kotabaru', 'Banyu Asin': 'Banyuasin', 'Karang Asem': 'Karangasem', 'Gunung Kidul': 'Gunungkidul',
  'Batang Hari': 'Batanghari', 'Toli-Toli': 'Tolitoli', 'Toba Samosir': 'Toba', 'Mamuju Utara': 'Pasangkayu',
  'Kota Banjar Baru': 'Kota Banjarbaru', 'Kota Pangkal Pinang': 'Kota Pangkalpinang', 'Kota Sawah Lunto': 'Kota Sawahlunto',
  'Kota Pematang Siantar': 'Kota Pematangsiantar', 'Kota Tanjung Pinang': 'Kota Tanjungpinang', 'Kota Tanjung Balai': 'Kota Tanjungbalai',
  'Labuhan Batu': 'Labuhanbatu', 'Labuhan Batu Selatan': 'Labuhanbatu Selatan', 'Labuhan Batu Utara': 'Labuhanbatu Utara',
  'Pangkajene Dan Kepulauan': 'Pangkajene dan Kepulauan', 'Maluku Tenggara Barat': 'Kepulauan Tanimbar', 'Tulangbawang': 'Tulang Bawang',
};

const ringArea = (r) => { let s = 0; for (let i = 0, n = r.length; i < n; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % n]; s += x1 * y2 - x2 * y1; } return s / 2; };
const inRing = (r, x, y) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const polys = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
const inGeom = (g, x, y) => polys(g).some((p) => inRing(p[0], x, y) && !p.slice(1).some((h) => inRing(h, x, y)));
// d3-geo wants clockwise exterior rings (negative planar area in lng/lat space)
function rewind(g) {
  polys(g).forEach((p) => p.forEach((r, i) => { const a = ringArea(r); if ((i === 0 && a > 0) || (i > 0 && a < 0)) r.reverse(); }));
}
// Representative point: centroid of largest ring, nudged inside if needed
function labelPoint(g) {
  const big = polys(g).map((p) => p[0]).reduce((a, b) => (Math.abs(ringArea(b)) > Math.abs(ringArea(a)) ? b : a));
  let cx = 0, cy = 0; const A = ringArea(big);
  for (let i = 0; i < big.length; i++) { const [x1, y1] = big[i], [x2, y2] = big[(i + 1) % big.length]; const f = x1 * y2 - x2 * y1; cx += (x1 + x2) * f; cy += (y1 + y2) * f; }
  cx /= 6 * A; cy /= 6 * A;
  if (inRing(big, cx, cy)) return [cx, cy];
  // fall back: scan the bbox row through the centroid for the widest inside span
  const xs = big.map((d) => d[0]); const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let best = big[0], run = 0, bestRun = 0, start = null;
  for (let i = 0; i <= 200; i++) {
    const x = x0 + ((x1 - x0) * i) / 200;
    if (inRing(big, x, cy)) { if (start === null) start = x; run++; if (run > bestRun) { bestRun = run; best = [(start + x) / 2, cy]; } } else { start = null; run = 0; }
  }
  return best;
}

const provOf = (x, y) => {
  for (const f of prov34.features) if (inGeom(f.geometry, x, y)) return +f.properties.kode;
  // nearest province bbox center as fallback (tiny islands off the coast)
  let best = null, bd = Infinity;
  for (const f of prov34.features) for (const p of polys(f.geometry)) for (const [px, py] of p[0]) { const d = (px - x) ** 2 + (py - y) ** 2; if (d < bd) { bd = d; best = +f.properties.kode; } }
  return best;
};

const feats = [];
adm2.features.forEach((f) => {
  const raw = f.properties.shapeName;
  if (SKIP.has(raw)) return;
  const name0 = RENAME[raw] || raw;
  rewind(f.geometry);
  const lp = labelPoint(f.geometry);
  let p = provOf(lp[0], lp[1]);
  if (raw === 'Kepulauan Seribu') p = 31;
  if (p === 91 || p === 92) for (const [np, list] of Object.entries(PAPUA_SPLIT)) if (list.includes(raw)) p = +np;
  const isKota = name0.startsWith('Kota ');
  feats.push({ type: 'Feature', geometry: f.geometry, properties: { p, n: isKota ? name0 : 'Kab. ' + name0, k: isKota ? 1 : 0, c: lp.map((v) => Math.round(v * 1e4) / 1e4) } });
});
// stable ids: provinsi, then Kota first, then alphabetical
feats.sort((a, b) => a.properties.p - b.properties.p || b.properties.k - a.properties.k || a.properties.n.localeCompare(b.properties.n));
const seq = {};
feats.forEach((f) => { const p = f.properties.p; seq[p] = (seq[p] || 0); f.id = p + '.' + seq[p]++; });

let topo = topology({ kab: { type: 'FeatureCollection', features: feats } }, 1e5);
topo = presimplify(topo);
topo = simplify(topo, quantile(topo, Number(process.env.Q || 0.2)));
// drop presimplify weights + points collapsed by simplify, then re-quantize (delta-encoded)
topo.arcs = topo.arcs.map((a) => a.filter((pt, i) => i === 0 || i === a.length - 1 || pt[0] !== a[i - 1][0] || pt[1] !== a[i - 1][1]).map((pt) => [pt[0], pt[1]]));
topo = quantize(topo, 2e4);

const counts = Object.entries(seq).map(([p, n]) => p + ':' + n).join(' ');
fs.writeFileSync(path.join(root, 'data/geo-id.js'), 'window.IDN_TOPO=' + JSON.stringify(topo) + ';');
console.log('kab/kota', feats.length, '| per provinsi', counts);
console.log('data/geo-id.js', fs.statSync(path.join(root, 'data/geo-id.js')).size, 'bytes');
