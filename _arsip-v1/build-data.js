// One-off helper: converts raw GeoJSON / textures into JS globals so the
// mockup runs even from file:// (no CORS issues) and fully offline.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const p = (f) => path.join(root, f);
const round = (v) => (Array.isArray(v) ? v.map(round) : Math.round(v * 1e4) / 1e4);

if (fs.existsSync(p('data/idn-prov2.geojson'))) {
  const g = JSON.parse(fs.readFileSync(p('data/idn-prov2.geojson'), 'utf8'));
  g.features.forEach((f) => {
    f.geometry.coordinates = round(f.geometry.coordinates);
    f.properties = { kode: f.properties.kode, name: f.properties.Propinsi };
  });
  fs.writeFileSync(p('data/indonesia.js'), 'window.IDN_GEO=' + JSON.stringify(g) + ';');
}
if (fs.existsSync(p('data/countries.geojson'))) {
  const w = JSON.parse(fs.readFileSync(p('data/countries.geojson'), 'utf8'));
  w.features.forEach((f) => {
    f.properties = { name: f.properties.ADMIN, iso: f.properties.ISO_A3 };
  });
  fs.writeFileSync(p('data/world.js'), 'window.WORLD_GEO=' + JSON.stringify(w) + ';');
}
const b64 = (f) => fs.readFileSync(p(f)).toString('base64');
fs.writeFileSync(
  p('assets/textures.js'),
  'window.EARTH_TEX="data:image/jpeg;base64,' + b64('assets/earth-night.jpg') + '";\n' +
  'window.EARTH_BUMP="data:image/png;base64,' + b64('assets/earth-topology.png') + '";\n'
);
for (const f of ['data/indonesia.js', 'data/world.js', 'assets/textures.js']) console.log(f, fs.statSync(p(f)).size);
