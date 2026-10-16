/* =====================================================================
   MCS — Peta sebaran perkara (D3 + TopoJSON)
   Batas Kab/Kota asli (BPS/OCHA via geoBoundaries), 38 provinsi.
   Level: Nasional → Provinsi → Kab/Kota (titik perkara).
   ===================================================================== */
window.MCSMap = (function () {
  'use strict';
  const W0 = 1200, H0 = 560;
  const topo = window.IDN_TOPO;
  const kabObj = topo.objects.kab;
  const kabFeat = topojson.feature(topo, kabObj).features;
  const KF = Object.fromEntries(kabFeat.map((f) => [f.id, f]));
  const provGeom = {};
  MCS.provIds.forEach((p) => { provGeom[p] = topojson.merge(topo, kabObj.geometries.filter((g) => g.properties.p === p)); });
  const provLines = topojson.mesh(topo, kabObj, (a, b) => a !== b && a.properties.p !== b.properties.p);
  const coast = topojson.mesh(topo, kabObj, (a, b) => a === b);

  const proj = d3.geoMercator().fitExtent([[16, 16], [W0 - 16, H0 - 16]], { type: 'FeatureCollection', features: kabFeat });
  const path = d3.geoPath(proj);
  const bbox = (g) => path.bounds(g).flat();
  const KB = {}; kabFeat.forEach((f) => (KB[f.id] = bbox(f)));
  const PB = {}; MCS.provIds.forEach((p) => (PB[p] = bbox(provGeom[p])));
  const kabPt = (id) => { const k = MCS.KAB[id]; return proj([k.lng, k.lat]); };
  const provPt = (p) => {
    // titik label provinsi: kab terluas di provinsi
    const ks = MCS.kabsOf(p);
    const big = ks.reduce((a, b) => { const A = KB[a.id], B = KB[b.id]; return (B[2] - B[0]) * (B[3] - B[1]) > (A[2] - A[0]) * (A[3] - A[1]) ? b : a; });
    return ks.length > 3 ? kabPt(big.id) : path.centroid(provGeom[p]);
  };

  // ---------- skala warna (sekuensial satu hue) ----------
  const RAMP = ['#101b28', '#104281', '#1c5cab', '#2a78d6', '#5598e7', '#9ec5f4'];
  const interp = d3.interpolateRgbBasis(RAMP);
  const EMPTY_FILL = '#0f1925';

  // ---------- state ----------
  let svg, root, zoom, k = 1, vb = [0, 0, W0, H0];
  let gKab, gProv, gCoast, gHL, gJuris, gDots, gCourt, gLbl, gPing;
  let focus = 'ID', base = [], courtFocus = null, rendered = false;
  const cnt = { prov: new Map(), kab: new Map() };
  const layers = { heat: true, court: true, lbl: true };
  const listeners = [];
  let tipEl, wrapEl;
  const depth = MCS.depth;

  function countBy(list, keyFn) {
    const m = new Map();
    for (const c of list) {
      const key = keyFn(c);
      let o = m.get(key);
      if (!o) { o = { total: 0, pra: 0, sidang: 0, tetap: 0, cat: {} }; m.set(key, o); }
      o.total++; o[MCS.groupOf(c.st)]++; o.cat[c.cat] = (o.cat[c.cat] || 0) + 1;
    }
    return m;
  }
  const EMPTY = { total: 0, pra: 0, sidang: 0, tetap: 0, cat: {} };

  function init() {
    wrapEl = document.getElementById('map-wrap');
    tipEl = document.getElementById('tip');
    svg = d3.select('#map');
    root = svg.append('g');
    root.append('path').attr('class', 'sea-grid').attr('d', path(d3.geoGraticule().step([5, 5]).extent([[92, -14], [144, 9]])()));
    gKab = root.append('g');
    gCoast = root.append('path').attr('class', 'coast').attr('d', path(coast));
    gProv = root.append('path').attr('class', 'prov-line').attr('d', path(provLines));
    gJuris = root.append('g');
    gHL = root.append('g');
    gDots = root.append('g');
    gCourt = root.append('g');
    gLbl = root.append('g');
    gPing = root.append('g');

    gKab.selectAll('path').data(kabFeat).join('path')
      .attr('class', 'kab').attr('d', path).attr('fill', EMPTY_FILL)
      .style('opacity', 0)
      .on('mouseenter', (e, f) => onHover(e, f))
      .on('mousemove', moveTip)
      .on('mouseleave', hideTip)
      .on('click', (e, f) => onClick(f));

    zoom = d3.zoom().scaleExtent([0.9, 80]).on('zoom', (e) => { root.attr('transform', e.transform); k = e.transform.k; rescale(); });
    svg.call(zoom).on('dblclick.zoom', null);
    svg.on('mousemove.coord', (e) => {
      const t = d3.zoomTransform(svg.node());
      const ll = proj.invert(t.invert(d3.pointer(e, svg.node())));
      document.getElementById('m-coord').textContent = `${Math.abs(ll[1]).toFixed(3)}°${ll[1] < 0 ? 'LS' : 'LU'}  ${ll[0].toFixed(3)}°BT`;
    });
    document.querySelectorAll('#layers button').forEach((b) => b.addEventListener('click', () => {
      const l = b.dataset.layer; layers[l] = !layers[l]; b.classList.toggle('on', layers[l]); render(false);
    }));
    document.getElementById('m-back').addEventListener('click', up);
    document.getElementById('z-in').onclick = () => svg.transition().duration(500).call(zoom.scaleBy, 1.6);
    document.getElementById('z-out').onclick = () => svg.transition().duration(500).call(zoom.scaleBy, 1 / 1.6);
    document.getElementById('z-home').onclick = () => drill('ID');
    resize();
    window.addEventListener('resize', () => { resize(); zoomToFocus(0); });
  }

  function resize() {
    const r = wrapEl.getBoundingClientRect();
    if (!r.width) return;
    const a = r.width / r.height;
    vb = a > W0 / H0 ? [-(H0 * a - W0) / 2, 0, H0 * a, H0] : [0, -(W0 / a - H0) / 2, W0, W0 / a];
    svg.attr('viewBox', vb.join(' '));
    zoom.extent([[vb[0], vb[1]], [vb[0] + vb[2], vb[1] + vb[3]]]).translateExtent([[vb[0] - W0, vb[1] - H0], [vb[0] + vb[2] + W0, vb[1] + vb[3] + H0]]);
  }

  function focusBB() {
    if (courtFocus && depth(focus) === 0) return jurisBB(courtFocus);
    const d = depth(focus);
    if (d === 0) return [16, 16, W0 - 16, H0 - 16];
    if (d === 1) return PB[+focus];
    return KB[focus];
  }
  function targetK() {
    const [x0, y0, x1, y1] = focusBB();
    const pad = depth(focus) === 0 && !courtFocus ? 0.02 : 0.14;
    return Math.min(80, vb[2] * (1 - pad * 2) / Math.max(1e-3, x1 - x0), vb[3] * (1 - pad * 2) / Math.max(1e-3, y1 - y0));
  }
  function zoomToFocus(dur = 1100) {
    const [x0, y0, x1, y1] = focusBB();
    const s = targetK();
    const cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2;
    const t = d3.zoomIdentity.translate(cx - s * (x0 + x1) / 2, cy - s * (y0 + y1) / 2).scale(s);
    (dur ? svg.transition().duration(dur).ease(d3.easeCubicInOut) : svg).call(zoom.transform, t);
  }
  // 1 px layar dalam satuan viewBox — agar label & penanda berukuran tetap di layar
  const px = () => vb[2] / (wrapEl.clientWidth || vb[2]);
  function rescale() {
    const u = px() / k;
    gCourt.selectAll('g.court').attr('transform', (c) => `translate(${c.x},${c.y}) scale(${u})`);
    gDots.selectAll('circle.dot').attr('r', 4.5 * u).attr('stroke-width', 1 * u);
    gLbl.selectAll('text').attr('font-size', (d) => d.fs * u).attr('stroke-width', 3 * u).attr('dy', (d) => (d.dy || 0) * u);
    gPing.selectAll('g').attr('transform', function () { return `translate(${this.__x},${this.__y}) scale(${u})`; });
  }

  // ---------- data ----------
  function refresh(list) {
    base = list;
    cnt.prov = countBy(base, (c) => c.p);
    cnt.kab = countBy(base, (c) => c.kab);
    render(false);
  }

  function render(doZoom = true) {
    const d = depth(focus);
    const p = d ? +String(focus).split('.')[0] : null;
    // skala warna mengikuti level yang ditampilkan
    // kelas kuantil (5 kelas) — perbedaan antarwilayah lebih terbaca daripada skala linear
    const vals = d === 0 ? MCS.provIds.map((q) => (cnt.prov.get(q) || EMPTY).total) : MCS.kabsOf(p).map((x) => (cnt.kab.get(x.id) || EMPTY).total);
    const sc = d3.scaleQuantile().domain(vals.filter((v) => v > 0).concat([1])).range(RAMP.slice(1));
    const fillOf = (v) => (!layers.heat ? '#13202e' : v ? sc(v) : EMPTY_FILL);

    const isOut = (f) => d > 0 && f.properties.p !== p;
    const isDim = (f) => (d === 2 && f.id !== focus && f.properties.p === p) || (courtFocus && d === 0 && !inJuris(f.id));
    const first = !rendered; rendered = true;
    gKab.selectAll('path.kab')
      .classed('out', isOut)
      .classed('focus', (f) => d === 2 && f.id === focus)
      .transition().delay((f) => (first ? 80 + (MCS.KAB[f.id].lng - 95) * 12 : 0)).duration(first ? 700 : 600)
      .style('opacity', (f) => (isOut(f) ? 0.12 : isDim(f) ? 0.3 : 1))
      .attr('fill', (f) => fillOf(d === 0 ? (cnt.prov.get(f.properties.p) || EMPTY).total : (cnt.kab.get(f.id) || EMPTY).total))
      .style('stroke', (f) => (d === 0 ? fillOf((cnt.prov.get(f.properties.p) || EMPTY).total) : null));

    // garis sorot
    gHL.selectAll('*').remove();
    if (d >= 1) gHL.append('path').attr('class', 'hl-line').attr('d', path(d === 1 ? provGeom[p] : KF[focus])).style('opacity', 0).transition().delay(300).duration(500).style('opacity', 0.9);

    // wilayah hukum pengadilan
    gJuris.selectAll('*').remove();
    if (courtFocus) gJuris.append('path').attr('class', 'juris').attr('d', path(jurisGeom(courtFocus)));

    renderDots(d);
    renderCourts();
    renderLabels(d, p);
    renderLegend(d, sc);
    rescale();
    if (doZoom) zoomToFocus();
    updateHud();
  }

  // ---------- titik perkara di dalam poligon kab ----------
  const ringCache = {};
  function kabRings(id) {
    if (ringCache[id]) return ringCache[id];
    const g = KF[id].geometry;
    const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).map((poly) => poly.map((ring) => ring.map((c) => proj(c))));
    const withBB = polys.map((rs) => { const xs = rs[0].map((q) => q[0]), ys = rs[0].map((q) => q[1]); return { rs, bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], a: Math.abs(d3.polygonArea(rs[0])) }; });
    return (ringCache[id] = withBB);
  }
  function casePos(c) {
    if (c._pos && c._pos.k === c.kab) return c._pos;
    const polys = kabRings(c.kab);
    const r = MCS.mulberry32(MCS.hash(c.id));
    const totalA = polys.reduce((s, q) => s + q.a, 0);
    for (let i = 0; i < 80; i++) {
      let x = r() * totalA, P = polys[0];
      for (const q of polys) { x -= q.a; if (x <= 0) { P = q; break; } }
      const px = P.bb[0] + r() * (P.bb[2] - P.bb[0]), py = P.bb[1] + r() * (P.bb[3] - P.bb[1]);
      if (d3.polygonContains(P.rs[0], [px, py]) && !P.rs.slice(1).some((h) => d3.polygonContains(h, [px, py]))) return (c._pos = { k: c.kab, x: px, y: py });
    }
    const [px, py] = kabPt(c.kab);
    return (c._pos = { k: c.kab, x: px, y: py });
  }
  function renderDots(d) {
    const list = d === 2 ? base.filter((c) => c.kab === focus).slice(-500) : [];
    gDots.selectAll('circle.dot').data(list, (c) => c.id).join(
      (en) => en.append('circle').attr('class', 'dot').attr('r', 0)
        .attr('cx', (c) => casePos(c).x).attr('cy', (c) => casePos(c).y)
        .call((s) => s.transition().delay((c, i) => 500 + i * 3).duration(400).attr('r', 4.5 * px() / k)),
      (u) => u,
      (ex) => ex.remove(),
    ).attr('fill', (c) => MCS.GROUP[MCS.groupOf(c.st)].color)
      .on('mouseenter', (e, c) => showCaseTip(e, c)).on('mousemove', moveTip).on('mouseleave', hideTip)
      .on('click', (e, c) => window.CaseView && CaseView.open(c.id));
  }

  // ---------- pengadilan militer ----------
  // ---------- Kejaksaan Tinggi & wilayahnya ----------
  const juris = {};
  const jurisIds = (id) => MCS.KABS.filter((x) => MCS.KJ[id].prov.includes(x.p)).map((x) => x.id);
  function jurisGeom(id) {
    if (!juris[id]) { const set = new Set(jurisIds(id)); juris[id] = { set, geom: topojson.merge(topo, kabObj.geometries.filter((g) => set.has(g.id))) }; }
    return juris[id].geom;
  }
  const inJuris = (kabId) => { jurisGeom(courtFocus); return juris[courtFocus].set.has(kabId); };
  const jurisBB = (id) => bbox(jurisGeom(id));
  function renderCourts() {
    const list = layers.court ? MCS.KEJATI.map((c) => { const [x, y] = proj([c.lng, c.lat]); return { ...c, x, y }; }) : [];
    const sel = gCourt.selectAll('g.court').data(list, (c) => c.id).join((en) => {
      const g = en.append('g').attr('class', 'court t');
      g.append('circle').attr('class', 'halo').attr('r', 11);
      g.append('rect').attr('class', 'pin').attr('x', -4.5).attr('y', -4.5).attr('width', 9).attr('height', 9).attr('transform', 'rotate(45)');
      g.append('text').attr('x', 9).attr('y', 3.5);
      g.style('opacity', 0).transition().delay((c, i) => 700 + i * 25).duration(400).style('opacity', 1);
      return g;
    });
    sel.classed('on', (c) => c.id === courtFocus)
      .select('text').text((c) => c.short)
      .style('display', (c) => (c.id === courtFocus || (depth(focus) === 1 && c.prov.includes(+String(focus).split('.')[0])) ? null : 'none'));
    sel.on('mouseenter', (e, c) => showCourtTip(e, c)).on('mousemove', moveTip).on('mouseleave', hideTip)
      .on('click', (e, c) => { e.stopPropagation(); window.App && App.setFilter('kejati', courtFocus === c.id ? '' : c.id); });
  }
  function setCourt(id) {
    courtFocus = id || null;
    if (courtFocus && depth(focus) > 0) focus = 'ID';
    render(true);
  }

  // ---------- label ----------
  function renderLabels(d, p) {
    let lbl = [];
    if (layers.lbl) {
      if (d === 0) lbl = MCS.provIds.map((q) => { const [x, y] = provPt(q); const b = PB[q]; return { id: 'p' + q, x, y, t: MCS.PROV[q], fs: 11, a: (b[2] - b[0]) * (b[3] - b[1]) }; })
        .filter((l) => l.a > 600 || l.id === 'p31');
      else if (d === 1) lbl = MCS.kabsOf(p).map((x) => { const [px, py] = kabPt(x.id); const b = KB[x.id]; return { id: x.id, x: px, y: py, t: x.short, fs: 11, a: (b[2] - b[0]) * (b[3] - b[1]) }; });
      else { const [px, py] = kabPt(focus); lbl = [{ id: focus, x: px, y: py, dy: -16, t: MCS.KAB[focus].name, fs: 14, big: true }]; }
    }
    // hindari label bertumpuk: urutkan menurut prioritas, buang yang bertabrakan
    const u = px() / targetK();
    const placed = [];
    lbl = lbl.sort((a, b) => (b.a || 0) - (a.a || 0)).filter((l) => {
      const w = l.t.length * l.fs * 0.56 * u, h = l.fs * 1.25 * u;
      const r = [l.x - w / 2, l.y - h + (l.dy || 0) * u, l.x + w / 2, l.y + (l.dy || 0) * u];
      if (placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) return false;
      placed.push(r); return true;
    });
    gLbl.selectAll('text').data(lbl, (x) => x.id).join((en) => en.append('text').attr('class', 'lbl').style('opacity', 0).call((s) => s.transition().delay(450).duration(500).style('opacity', 1)))
      .classed('big', (x) => !!x.big).attr('x', (x) => x.x).attr('y', (x) => x.y).text((x) => x.t);
  }

  function renderLegend(d, sc) {
    const el = document.getElementById('legend');
    if (d === 2) {
      const o = cnt.kab.get(focus) || EMPTY;
      el.innerHTML = `<div class="t">Titik perkara menurut tahap</div><div class="cats">${MCS.GROUPS.map((g) => `<span><i style="background:${g.color}"></i>${g.name}<b>${MCS.fmt(o[g.id])}</b></span>`).join('')}</div>`;
      return;
    }
    if (!layers.heat) { el.innerHTML = '<div class="t">Kepadatan perkara dimatikan</div>'; return; }
    const lo = [Math.max(1, d3.min(sc.domain()))].concat(sc.quantiles().map((v) => Math.ceil(v)));
    el.innerHTML = `<div class="t">Jumlah perkara per ${d === 0 ? 'provinsi' : 'kabupaten/kota'} · 5 kelas sama banyak</div>
      <div class="steps">${RAMP.slice(1).map((c, i) => `<span><i style="background:${c}"></i>${i === 4 ? '≥ ' + MCS.fmt(lo[i]) : MCS.fmt(lo[i]) + '–' + MCS.fmt(Math.max(lo[i], lo[i + 1] - 1))}</span>`).join('')}</div>`;
  }

  function updateHud() {
    const d = depth(focus);
    const C = courtFocus && MCS.KJ[courtFocus];
    document.getElementById('m-lvl').textContent = C && d === 0 ? 'Wilayah Kejaksaan Tinggi' : ['Nasional', 'Provinsi', 'Kabupaten / kota'][d];
    document.getElementById('m-nm').textContent = C && d === 0 ? C.name : MCS.regionName(focus);
    const n = base.filter((c) => MCS.matchRegion(c, focus)).length;
    document.getElementById('m-sub').textContent = C && d === 0
      ? juris[courtFocus].set.size + ' kabupaten/kota · ' + MCS.fmt(n) + ' perkara'
      : d === 0 ? MCS.provIds.length + ' provinsi · ' + MCS.KABS.length + ' kabupaten/kota'
        : d === 1 ? MCS.kabsOf(+focus).length + ' kabupaten/kota · ' + MCS.fmt(n) + ' perkara'
          : MCS.fmt(n) + ' perkara · ' + MCS.kejatiOfProv(MCS.KAB[focus].p).short;
    document.getElementById('m-back').classList.toggle('hidden', d === 0 && !C);
  }

  // ---------- tooltip ----------
  function regionTip(id, o) {
    const cats = Object.entries(o.cat).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const d = depth(id);
    const sub = d === 1 ? 'Provinsi · ' + MCS.kabsOf(+id).length + ' kab/kota' : (MCS.PROV[MCS.KAB[id].p] + ' · ' + MCS.kejatiOfProv(MCS.KAB[id].p).short);
    return `<div class="t">${MCS.regionName(id)}</div><div class="s">${sub}</div>
      <div class="r"><span>Total perkara</span><b>${MCS.fmt(o.total)}</b></div>
      ${MCS.GROUPS.map((g) => `<div class="r"><span><i style="background:${g.color}"></i>${g.name}</span><b>${MCS.fmt(o[g.id])}</b></div>`).join('')}
      ${cats.length ? '<hr>' + cats.map(([c, v]) => `<div class="r"><span>${MCS.CAT[c].name}</span><b>${MCS.fmt(v)}</b></div>`).join('') : ''}`;
  }
  function onHover(e, f) {
    const d = depth(focus);
    const id = d === 0 ? String(f.properties.p) : f.id;
    const o = d === 0 ? cnt.prov.get(f.properties.p) || EMPTY : cnt.kab.get(f.id) || EMPTY;
    const hint = d === 0 ? 'Klik untuk melihat provinsi' : f.id === focus ? 'Fokus saat ini' : f.properties.p === (d ? +String(focus).split('.')[0] : 0) ? 'Klik untuk melihat titik perkara' : 'Klik untuk pindah provinsi';
    tipEl.innerHTML = regionTip(id, o) + `<div class="h">${hint} →</div>`;
    tipEl.classList.add('on'); moveTip(e);
    gHL.selectAll('.hover').remove();
    gHL.append('path').attr('class', 'hl-line hover').attr('d', path(d === 0 ? provGeom[f.properties.p] : KF[f.id])).style('opacity', 0.6);
  }
  function onClick(f) {
    const d = depth(focus);
    if (d === 0) { courtFocus = null; drill(String(f.properties.p)); return; }
    const p = +String(focus).split('.')[0];
    if (f.properties.p !== p) drill(String(f.properties.p));
    else if (focus !== f.id) drill(f.id);
  }
  function showCaseTip(e, c) {
    const ns = MCS.nextSidang(c);
    tipEl.innerHTML = `<div class="t mono">${c.reg || c.id}</div><div class="s">${MCS.CAT[c.cat].name}</div>
      <div style="font-size:12.5px;color:var(--txt-2);margin-bottom:8px">${MCS.esc(c.title)}</div>
      <div class="r"><span>Terdakwa</span><b>${MCS.esc(MCS.terdakwaLabel(c.terdakwa[0]))}${c.terdakwa.length > 1 ? ' +' + (c.terdakwa.length - 1) : ''}</b></div>
      <div class="r"><span>Tahap</span><b><i style="background:${MCS.GROUP[MCS.groupOf(c.st)].color}"></i>${MCS.TAHAP[c.st].name}</b></div>
      ${ns ? `<div class="r"><span>Sidang berikutnya</span><b>${MCS.fmtDay(ns.t)}, ${MCS.fmtTime(ns.t)}</b></div>` : ''}
      <div class="h">Klik untuk membuka berkas perkara →</div>`;
    tipEl.classList.add('on'); moveTip(e);
  }
  function showCourtTip(e, C) {
    const list = MCS.filter({ kejati: C.id }, base);
    const aktif = list.filter((c) => c.st < 7).length;
    const kon = list.filter((c) => c.jenis === 'koneksitas').length;
    const sid = MCS.hearings(list).length;
    tipEl.innerHTML = `<div class="t">${C.name}</div><div class="s">Bidang Pidana Militer (Aspidmil) · wilayah: ${C.prov.map((q) => MCS.PROV[q]).join(', ')}</div>
      <div class="r"><span>Perkara dalam wilayah</span><b>${MCS.fmt(list.length)}</b></div>
      <div class="r"><span>Koneksitas</span><b>${MCS.fmt(kon)}</b></div>
      <div class="r"><span>Belum selesai</span><b>${MCS.fmt(aktif)}</b></div>
      <div class="r"><span>Sidang 7 hari ke depan</span><b>${MCS.fmt(sid)}</b></div>
      <div class="h">${courtFocus === C.id ? 'Klik untuk melepas saringan' : 'Klik untuk menyaring & melihat wilayah Kejati'} →</div>`;
    tipEl.classList.add('on'); moveTip(e);
  }
  function moveTip(e) {
    const r = wrapEl.getBoundingClientRect();
    let x = e.clientX - r.left + 16, y = e.clientY - r.top + 14;
    const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    if (x + tw > r.width - 8) x = e.clientX - r.left - tw - 16;
    if (y + th > r.height - 8) y = Math.max(8, r.height - th - 8);
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  }
  function hideTip() { tipEl.classList.remove('on'); gHL.selectAll('.hover').remove(); }

  // ---------- navigasi ----------
  function drill(id, silent) {
    hideTip();
    focus = id || 'ID';
    if (depth(focus) > 0) courtFocus = null;
    render(true);
    if (!silent) listeners.forEach((f) => f(focus));
  }
  function up() {
    if (courtFocus && depth(focus) === 0) { window.App && App.setFilter('kejati', ''); return; }
    const s = String(focus);
    drill(s.includes('.') ? s.split('.')[0] : 'ID');
  }

  function ping(c) {
    const [x, y] = depth(focus) === 2 && c.kab === focus ? [casePos(c).x, casePos(c).y] : kabPt(c.kab);
    const col = MCS.GROUP[MCS.groupOf(c.st)].color;
    const g = gPing.append('g'); g.node().__x = x; g.node().__y = y;
    g.attr('transform', `translate(${x},${y}) scale(${px() / k})`);
    g.append('circle').attr('r', 3).attr('fill', col);
    [0, 350].forEach((delay, i) => g.append('circle').attr('class', 'ping').attr('r', 2).attr('stroke', col)
      .transition().delay(delay).duration(1700).ease(d3.easeCubicOut).attr('r', i ? 18 : 28).style('opacity', 0));
    g.transition().delay(2400).duration(500).style('opacity', 0).remove();
  }

  /** Peta mini untuk berkas perkara: provinsi dengan kab/kota disorot */
  function miniMap(el, kabId) {
    const p = MCS.KAB[kabId].p;
    const w = el.clientWidth || 290, h = el.clientHeight || 160;
    const fc = { type: 'FeatureCollection', features: kabFeat.filter((f) => f.properties.p === p) };
    const pj = d3.geoMercator().fitExtent([[10, 10], [w - 10, h - 10]], fc);
    const pa = d3.geoPath(pj);
    const s = d3.select(el).html('').append('svg').attr('width', w).attr('height', h);
    s.selectAll('path').data(fc.features).join('path').attr('d', pa)
      .attr('fill', (f) => (f.id === kabId ? '#2a78d6' : '#152233')).attr('stroke', '#0a121b').attr('stroke-width', 0.6);
    const k2 = MCS.KAB[kabId]; const [x, y] = pj([k2.lng, k2.lat]);
    s.append('circle').attr('cx', x).attr('cy', y).attr('r', 3.5).attr('fill', '#fff');
    s.append('circle').attr('cx', x).attr('cy', y).attr('r', 4).attr('fill', 'none').attr('stroke', '#fff').attr('stroke-width', 1.2)
      .append('animate').attr('attributeName', 'r').attr('from', 4).attr('to', 16).attr('dur', '1.8s').attr('repeatCount', 'indefinite');
    s.select('circle:last-child').append('animate').attr('attributeName', 'opacity').attr('from', 1).attr('to', 0).attr('dur', '1.8s').attr('repeatCount', 'indefinite');
  }

  return {
    init, refresh, drill, up, ping, setCourt, miniMap,
    get focus() { return focus; },
    onChange: (f) => listeners.push(f),
    zoomToFocus,
  };
})();
