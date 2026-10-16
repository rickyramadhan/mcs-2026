/* =====================================================================
   MCS — Command Center: filter, ringkasan, panel samping, umpan pembaruan
   ===================================================================== */
window.App = (function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const F0 = { region: 'ID', jenis: '', matra: '', year: '', cat: '', kejati: '', stage: '' };
  let F = { ...F0 };
  let rtTab = 'agenda', rankTab = 'region';
  let current = [];

  function initFilters() {
    const years = [...new Set(MCS.cases.map((c) => c.y))].sort((a, b) => b - a);
    $('f-year').innerHTML = '<option value="">Semua tahun</option>' + years.map((y) => `<option value="${y}">${y}</option>`).join('');
    $('f-cat').innerHTML = '<option value="">Semua klasifikasi</option>' + MCS.CATS.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
    $('f-kejati').innerHTML = '<option value="">Semua Kejati</option>' + MCS.KEJATI.map((c) => `<option value="${c.id}">${c.short}</option>`).join('');
    $('f-matra').innerHTML = '<option value="">Semua matra</option>' + MCS.MATRA.map((m) => `<option value="${m.id}">${m.short}</option>`).join('');
    $('f-year').onchange = () => setFilter('year', $('f-year').value);
    $('f-cat').onchange = () => setFilter('cat', $('f-cat').value);
    $('f-kejati').onchange = () => setFilter('kejati', $('f-kejati').value);
    $('f-matra').onchange = () => setFilter('matra', $('f-matra').value);
    document.querySelectorAll('#f-jenis button').forEach((b) => (b.onclick = () => setFilter('jenis', b.dataset.v)));
    document.querySelectorAll('#rt-tabs button').forEach((b) => (b.onclick = () => { rtTab = b.dataset.tab; syncTabs(); renderRight(); }));
    document.querySelectorAll('#rank-tabs button').forEach((b) => (b.onclick = () => { rankTab = b.dataset.tab; syncTabs(); renderRank(); }));
  }
  function syncTabs() {
    document.querySelectorAll('#rt-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === rtTab));
    document.querySelectorAll('#rank-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === rankTab));
  }

  function setFilter(k, v, fromMap) {
    if (k === 'reset') F = { ...F0, region: F.region };
    else F[k] = v;
    if (k === 'kejati' && window.MCSMap) { if (v) F.region = 'ID'; MCSMap.setCourt(v); }
    if (k === 'region' && window.MCSMap && !fromMap && MCSMap.focus !== v) MCSMap.drill(v, true);
    $('f-year').value = F.year; $('f-cat').value = F.cat; $('f-kejati').value = F.kejati; $('f-matra').value = F.matra;
    document.querySelectorAll('#f-jenis button').forEach((b) => b.classList.toggle('on', b.dataset.v === F.jenis));
    renderChips();
    render();
  }
  function renderChips() {
    const ch = [];
    if (F.stage !== '') ch.push(['stage', 'Tahap: ' + MCS.TAHAP[F.stage].name]);
    if (F.cat) ch.push(['cat', MCS.CAT[F.cat].name]);
    if (F.kejati) ch.push(['kejati', MCS.KJ[F.kejati].short]);
    const any = ch.length || F.year || F.matra || F.jenis;
    $('chips').innerHTML = ch.map(([k, t]) => `<span class="chip">${t}<button data-k="${k}" aria-label="Hapus">×</button></span>`).join('')
      + (any ? '<span class="chip reset" id="chip-reset">Atur ulang</span>' : '');
    $('chips').querySelectorAll('button').forEach((b) => (b.onclick = () => setFilter(b.dataset.k, '')));
    if ($('chip-reset')) $('chip-reset').onclick = () => setFilter('reset');
  }

  function render() {
    current = MCS.filter(F);
    const s = MCS.stats(current);
    renderCrumbs();
    // ringkasan
    UI.countUp($('k-total'), s.total);
    UI.countUp($('k-proses'), s.byGroup.pra + s.byGroup.sidang);
    UI.countUp($('k-kon'), s.byJenis.koneksitas);
    UI.countUp($('k-rugi'), s.kerugianNegara, { fmt: (v) => MCS.fmtRp(v, true) });
    const monthStart = new Date(MCS.NOW); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const baru = current.filter((c) => c.d >= monthStart.getTime()).length;
    $('k-total-s').innerHTML = `<span class="up">+${MCS.fmt(baru)}</span> masuk bulan ini`;
    $('k-proses-s').textContent = MCS.fmt(s.byGroup.sidang) + ' di tahap sidang';
    $('k-kon-s').textContent = MCS.fmt(s.sipil) + ' tersangka sipil';
    const pct = s.kerugianNegara ? (s.pulihNegara / s.kerugianNegara) * 100 : 0;
    $('k-rugi-s').textContent = pct.toFixed(0) + '% telah dipulihkan';
    $('k-rugi-bar').style.width = pct + '%';
    $('ov-scope').textContent = F.kejati ? MCS.KJ[F.kejati].short : MCS.regionName(F.region);

    renderStages(s);
    renderCats(s);
    renderProfile(s);
    renderRight();
    renderRank();
    renderTrend();
    if (window.MCSMap) MCSMap.refresh(current);
  }

  function renderCrumbs() {
    const parts = [];
    parts.push(`<button class="${F.region === 'ID' ? 'cur' : ''}" data-r="ID">Indonesia</button>`);
    if (F.region !== 'ID') {
      const s = String(F.region); const p = s.split('.')[0];
      parts.push(`<span class="sep">/</span><button class="${s === p ? 'cur' : ''}" data-r="${p}">${MCS.PROV[p]}</button>`);
      if (s.includes('.')) parts.push(`<span class="sep">/</span><button class="cur" data-r="${s}">${MCS.KAB[s].name}</button>`);
    }
    $('crumbs').innerHTML = parts.join('');
    $('crumbs').querySelectorAll('button').forEach((b) => (b.onclick = () => setFilter('region', b.dataset.r)));
  }

  function renderStages(s) {
    // tahap dihitung tanpa saringan tahap agar distribusi tetap terlihat
    const base = F.stage === '' ? s : MCS.stats(MCS.filter({ ...F, stage: '' }));
    const mx = Math.max(...base.byStage) || 1;
    const el = $('stages');
    if (!el.children.length) {
      el.innerHTML = MCS.TAHAP.map((t, i) => `<div class="stg" data-i="${i}" title="${MCS.tahapLong(i, { jenis: F.jenis || 'koneksitas' })} — ${MCS.tahapActor(i, { jenis: F.jenis || 'koneksitas' })}">
        <i class="grp" style="background:${MCS.GROUP[MCS.groupOf(i)].color}"></i>
        <span class="ix">${i + 1}</span><span class="nm">${t.name}</span><span class="bw"><i class="bar"></i></span><span class="v">0</span></div>`).join('');
      el.querySelectorAll('.stg').forEach((r) => (r.onclick = () => setFilter('stage', F.stage === +r.dataset.i ? '' : +r.dataset.i)));
    }
    el.querySelectorAll('.stg').forEach((r, i) => {
      r.classList.toggle('sel', F.stage === i);
      r.classList.toggle('faded', F.stage !== '' && F.stage !== i);
      r.querySelector('.bar').style.width = (base.byStage[i] / mx) * 100 + '%';
      UI.countUp(r.querySelector('.v'), base.byStage[i], { dur: 700 });
    });
  }

  function renderCats(s) {
    const base = F.cat ? MCS.stats(MCS.filter({ ...F, cat: '' })) : s;
    const list = MCS.CATS.map((c) => ({ c, v: base.byCat[c.id] })).sort((a, b) => b.v - a.v);
    const mx = list[0] ? list[0].v || 1 : 1;
    $('cats').innerHTML = list.map(({ c, v }) => `<div class="cb ${F.cat === c.id ? 'sel' : F.cat ? 'faded' : ''}" data-c="${c.id}">
      <span class="n">${c.name}</span><span class="v">${MCS.fmt(v)}<small>${((v / Math.max(1, base.total)) * 100).toFixed(1)}%</small></span>
      <div class="track"><i data-w="${(v / mx) * 100}"></i></div></div>`).join('');
    $('cats').querySelectorAll('.cb').forEach((r) => (r.onclick = () => setFilter('cat', F.cat === r.dataset.c ? '' : r.dataset.c)));
    requestAnimationFrame(() => $('cats').querySelectorAll('.track i').forEach((i) => (i.style.width = i.dataset.w + '%')));
  }

  function renderProfile(s) {
    const tot = s.byMatra.AD + s.byMatra.AL + s.byMatra.AU || 1;
    const M = [['AD', 'TNI AD', 'var(--s1)'], ['AL', 'TNI AL', 'var(--s2)'], ['AU', 'TNI AU', 'var(--s3)']];
    const totT = Object.values(s.byGol).reduce((a, b) => a + b, 0) || 1;
    $('profile').innerHTML = `<div class="stack">${M.map(([k, , c]) => `<i style="flex-grow:${s.byMatra[k]};background:${c}" title="${k}"></i>`).join('')}</div>
      <div class="stack-key">${M.map(([k, n, c]) => `<span><i style="background:${c}"></i>${n} <b>${((s.byMatra[k] / tot) * 100).toFixed(0)}%</b></span>`).join('')}</div>
      <div class="sipil"><span>Tersangka sipil dalam perkara koneksitas</span><b>${MCS.fmt(s.sipil)}</b></div>
      <div class="gol">${Object.entries(MCS.GOL).map(([k, n]) => `<div title="${n}"><span>${{ T: 'Tamtama', B: 'Bintara', PA: 'Pama', PM: 'Pamen' }[k]}</span><b>${MCS.fmt(s.byGol[k])}</b><em>${Math.round((s.byGol[k] / totT) * 100)}%</em></div>`).join('')}</div>`;
  }

  // ---------- kolom kanan ----------
  function renderRight() {
    const hs = MCS.hearings(current, MCS.TODAY, MCS.TODAY + 7 * MCS.DAY);
    const al = MCS.alerts(current);
    $('agenda-n').textContent = MCS.fmt(hs.length);
    $('alert-n').textContent = MCS.fmt(al.filter((a) => a.level !== 'info').length);
    const body = $('rt-body');
    if (rtTab === 'agenda') {
      if (!hs.length) { body.innerHTML = '<div class="empty">Tidak ada sidang terjadwal dalam 7 hari ke depan untuk saringan ini.</div>'; return; }
      const byDay = d3.group(hs.slice(0, 120), (h) => new Date(h.s.t).toDateString());
      let i = 0;
      body.innerHTML = [...byDay].map(([, arr]) => `<div class="day-h">${MCS.fmtDay(arr[0].s.t)}<span>${arr.length} sidang</span></div>`
        + arr.map(({ c, s }) => `<div class="ag" data-id="${c.id}" style="animation-delay:${Math.min(i++, 14) * 25}ms">
          <span class="tm">${MCS.fmtTime(s.t)}</span>
          <div><div class="a">${s.agenda} · ${MCS.esc(MCS.terdakwaLabel(c.terdakwa[0]))}</div>
          <div class="m">${c.jenis === 'koneksitas' ? '<b class="kon">Koneksitas</b> · ' : ''}${MCS.forumShort(c)} · ${MCS.KJ[c.kejati].short}</div></div></div>`).join('')).join('')
        + (hs.length > 120 ? `<div class="empty">+${hs.length - 120} sidang lainnya — buka Agenda Sidang</div>` : '');
    } else {
      if (!al.length) { body.innerHTML = '<div class="empty">Tidak ada hal yang memerlukan perhatian.</div>'; return; }
      const n = (lv) => al.filter((a) => a.level === lv).length;
      const ICO = { tahanan: 'lock', stale: 'clock', tunda: 'pause', eksekusi: 'gavel' };
      body.innerHTML = `<div class="al-sum"><span class="pill crit">${UI.icon('alert')}${n('critical')} kritis</span><span class="pill warn">${n('warning')} peringatan</span><span class="pill info">${n('info')} informasi</span></div>`
        + al.slice(0, 80).map((a, i) => `<div class="al ${a.level}" data-id="${a.c.id}" style="animation-delay:${Math.min(i, 14) * 25}ms">
          <span class="ic">${UI.icon(ICO[a.type])}</span>
          <div><div class="a">${a.text}</div><div class="m">${MCS.esc(MCS.terdakwaLabel(a.c.terdakwa[0]))} · ${MCS.CAT[a.c.cat].name} · ${MCS.KJ[a.c.kejati].short}</div></div></div>`).join('');
    }
    body.querySelectorAll('[data-id]').forEach((r) => (r.onclick = () => CaseView.open(r.dataset.id)));
  }

  function renderRank() {
    const el = $('rank');
    let rows = [];
    if (rankTab === 'region') {
      const d = MCS.depth(F.region);
      if (d === 0) {
        const m = d3.rollup(current, (v) => v.length, (c) => c.p);
        rows = [...m].map(([p, v]) => ({ id: String(p), n: MCS.PROV[p], v, x: null }));
        $('rank-aux').textContent = 'per provinsi';
      } else {
        const p = +String(F.region).split('.')[0];
        const m = d3.rollup(MCS.filter({ ...F, region: String(p) }), (v) => v.length, (c) => c.kab);
        rows = [...m].map(([k, v]) => ({ id: k, n: MCS.KAB[k].name, v, sel: k === F.region }));
        $('rank-aux').textContent = 'per kabupaten/kota';
      }
    } else {
      const m = d3.rollup(current, (v) => [v.length, v.filter((c) => c.st < 7).length, v.filter((c) => c.jenis === 'koneksitas').length], (c) => c.kejati);
      rows = [...m].map(([k, [v, a, kn]]) => ({ id: k, n: MCS.KJ[k].short, v, x: MCS.fmt(a) + ' belum selesai · ' + MCS.fmt(kn) + ' koneksitas', court: true }));
      $('rank-aux').textContent = 'beban perkara per Kejati';
    }
    rows.sort((a, b) => b.v - a.v);
    const mx = rows[0] ? rows[0].v : 1;
    el.innerHTML = rows.length ? rows.map((r, i) => `<div class="rk" data-id="${r.id}" ${r.court ? 'data-court="1"' : ''} style="${r.sel ? 'background:var(--accent-d)' : ''}">
      <span class="i">${String(i + 1).padStart(2, '0')}</span><span class="n">${r.n}</span><span class="v">${MCS.fmt(r.v)}</span>
      <div class="b"><i data-w="${(r.v / mx) * 100}"></i></div>${r.x ? `<div class="x">${r.x}</div>` : ''}</div>`).join('') : '<div class="empty">Tidak ada data.</div>';
    el.querySelectorAll('.rk').forEach((r) => (r.onclick = () => (r.dataset.court ? setFilter('kejati', r.dataset.id) : setFilter('region', r.dataset.id))));
    requestAnimationFrame(() => el.querySelectorAll('.b i').forEach((i) => (i.style.width = i.dataset.w + '%')));
  }

  function renderTrend() {
    const series = MCS.monthsSeries(MCS.filter({ ...F, stage: '' }));
    const svg = d3.select('#trend'); svg.selectAll('*').remove();
    const w = svg.node().clientWidth || 330, h = svg.node().clientHeight || 132;
    const pad = { t: 8, r: 56, b: 18, l: 30 };
    const max = d3.max(series, (d) => Math.max(d.masuk, d.putus)) || 1;
    const x = d3.scalePoint().domain(series.map((d) => d.key)).range([pad.l, w - pad.r]);
    const y = d3.scaleLinear().domain([0, max]).nice(4).range([h - pad.b, pad.t]);
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${pad.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(w - pad.l - pad.r)).tickFormat(''));
    svg.append('g').attr('class', 'ax').attr('transform', `translate(0,${h - pad.b})`).call(d3.axisBottom(x).tickSize(0).tickPadding(6).tickFormat((d) => MCS.BULAN[+d.split('-')[1] - 1].slice(0, 3)))
      .call((g) => g.select('.domain').remove()).selectAll('text').filter((d, i) => i % 2).remove();
    svg.append('g').attr('class', 'ax').attr('transform', `translate(${pad.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(0).tickPadding(6).tickFormat(MCS.fmt)).call((g) => g.select('.domain').remove());
    const S = [['masuk', '#3987e5', 'Masuk'], ['putus', '#d95926', 'Diputus']];
    S.forEach(([k, col], j) => {
      const line = d3.line().x((d) => x(d.key)).y((d) => y(d[k])).curve(d3.curveMonotoneX);
      const p = svg.append('path').datum(series).attr('fill', 'none').attr('stroke', col).attr('stroke-width', 2).attr('d', line);
      const L = p.node().getTotalLength();
      p.attr('stroke-dasharray', L + ' ' + L).attr('stroke-dashoffset', L).transition().delay(j * 150).duration(1100).ease(d3.easeCubicOut).attr('stroke-dashoffset', 0);
      const last = series[series.length - 1];
      svg.append('text').attr('class', 'end').attr('x', x(last.key) + 6).attr('y', y(last[k]) + 4 + (j ? 6 : -6) * (Math.abs(y(last.masuk) - y(last.putus)) < 12 ? 1 : 0)).attr('fill', 'var(--txt-2)').text(MCS.fmt(last[k]) + ' ' + S[j][2].toLowerCase());
    });
    // crosshair + tooltip
    const tip = d3.select('#tip-trend').empty() ? d3.select('body').append('div').attr('id', 'tip-trend').attr('style', 'position:fixed;z-index:60;pointer-events:none;background:#111a25;border:1px solid rgba(148,172,204,.18);border-radius:9px;padding:8px 11px;font-size:12px;opacity:0;transition:opacity .15s;box-shadow:0 12px 30px rgba(0,0,0,.5)') : d3.select('#tip-trend');
    const xh = svg.append('line').attr('class', 'xh').attr('y1', pad.t).attr('y2', h - pad.b).style('opacity', 0);
    const dots = S.map(([, col]) => svg.append('circle').attr('r', 4).attr('fill', col).attr('stroke', '#0d141d').attr('stroke-width', 2).style('opacity', 0));
    svg.append('rect').attr('x', pad.l).attr('y', 0).attr('width', w - pad.l - pad.r).attr('height', h).attr('fill', 'transparent')
      .on('mousemove', (e) => {
        const [mx] = d3.pointer(e);
        const i = Math.max(0, Math.min(series.length - 1, Math.round((mx - pad.l) / x.step())));
        const d = series[i];
        xh.attr('x1', x(d.key)).attr('x2', x(d.key)).style('opacity', 1);
        S.forEach(([k], j) => dots[j].attr('cx', x(d.key)).attr('cy', y(d[k])).style('opacity', 1));
        tip.html(`<div style="color:var(--txt-3);margin-bottom:4px">${MCS.BULAN_L[d.date.getMonth()]} ${d.date.getFullYear()}</div>
          <div style="display:flex;gap:14px;justify-content:space-between"><span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#3987e5;margin-right:6px"></i>Masuk</span><b>${MCS.fmt(d.masuk)}</b></div>
          <div style="display:flex;gap:14px;justify-content:space-between"><span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#d95926;margin-right:6px"></i>Diputus</span><b>${MCS.fmt(d.putus)}</b></div>`)
          .style('left', e.clientX - 150 + 'px').style('top', e.clientY - 80 + 'px').style('opacity', 1);
      })
      .on('mouseleave', () => { xh.style('opacity', 0); dots.forEach((d) => d.style('opacity', 0)); tip.style('opacity', 0); });
  }

  // ---------- umpan pembaruan (simulasi) ----------
  const FEED = [
    (c) => [`<b>${MCS.KJ[c.kejati].short}</b> memperbarui perkara`, c],
    (c) => [`Sidang <b>${(MCS.nextSidang(c) || { agenda: 'pemeriksaan saksi' }).agenda.toLowerCase()}</b> dijadwalkan · ${MCS.forumShort(c)}`, c],
    (c) => [`Putusan dibacakan · <b>${c.putusan ? c.putusan.amar : 'pidana penjara'}</b>`, c],
    (c) => [`${c.jenis === 'koneksitas' ? 'Tim koneksitas' : MCS.KJ[c.kejati].short} mencatat ${MCS.TAHAP[c.st].name.toLowerCase()} · <b>${MCS.CAT[c.cat].name}</b>`, c],
    (c) => [`Pengembalian kerugian dicatat · <b>${MCS.fmtRp(Math.max(c.pulih, 15e6))}</b>`, c],
  ];
  function spawnFeed() {
    const list = current.length ? current : MCS.cases;
    const c = list[Math.floor(Math.random() * list.length)];
    const kind = c.st >= 5 ? (Math.random() < 0.5 ? 2 : 0) : c.st === 4 ? 1 : c.st <= 2 ? 3 : c.kn && c.kerugian ? 4 : 0;
    const [tx] = FEED[kind](c);
    const el = document.createElement('span');
    el.className = 'fi';
    el.innerHTML = `<i style="background:${MCS.GROUP[MCS.groupOf(c.st)].color}"></i><time>${new Date().toTimeString().slice(0, 5).replace(':', '.')}</time>${tx} · <span class="mono">${c.reg || c.id}</span>`;
    el.onclick = () => CaseView.open(c.id);
    const tr = $('feed');
    tr.insertBefore(el, tr.firstChild);
    while (tr.children.length > 12) tr.removeChild(tr.lastChild);
    if (window.MCSMap && Math.random() < 0.6) MCSMap.ping(c);
    setTimeout(spawnFeed, 3500 + Math.random() * 6000);
  }

  function tick() {
    const d = new Date();
    $('clock').textContent = d.toTimeString().slice(0, 5).replace(':', '.') + ' WIB';
    $('date').textContent = MCS.HARI[d.getDay()] + ', ' + d.getDate() + ' ' + MCS.BULAN_L[d.getMonth()] + ' ' + d.getFullYear();
  }

  function init() {
    initFilters();
    $('asof').textContent = MCS.fmtDate(MCS.NOW, true);
    tick(); setInterval(tick, 15000);
    render();
    for (let i = 0; i < 5; i++) setTimeout(spawnFeed, 200 * i);
    if (window.MCSMap) MCSMap.onChange((id) => { F.region = id; if (F.kejati) { F.kejati = ''; } setFilter('region', id, true); });
  }

  return { init, setFilter, get filter() { return F; }, get list() { return current; }, toast: UI.toast };
})();
