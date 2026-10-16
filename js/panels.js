/* =====================================================================
   MCS — Agenda sidang, Pustaka hukum, Pencarian cepat (Ctrl+K)
   ===================================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const E = MCS.esc;

  // ---------------- Agenda sidang (minggu kerja) ----------------
  let weekStart = mondayOf(MCS.TODAY);
  function mondayOf(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return d.getTime(); }
  function renderAgenda() {
    const kj = $('ag-court').value;
    const list = MCS.filter({ ...App.filter, kejati: kj || App.filter.kejati, stage: '' });
    const end = weekStart + 5 * MCS.DAY;
    const hs = MCS.hearings(list, weekStart, end);
    const a = new Date(weekStart), b = new Date(end - MCS.DAY);
    $('ag-title').textContent = `${a.getDate()} ${MCS.BULAN[a.getMonth()]} – ${b.getDate()} ${MCS.BULAN[b.getMonth()]} ${b.getFullYear()} · ${MCS.fmt(hs.length)} sidang`;
    let n = 0;
    $('ag-week').innerHTML = [0, 1, 2, 3, 4].map((i) => {
      const t0 = weekStart + i * MCS.DAY;
      const day = hs.filter((h) => h.s.t >= t0 && h.s.t < t0 + MCS.DAY);
      const d = new Date(t0);
      return `<div class="wd ${t0 === MCS.TODAY ? 'today' : ''}"><header><b>${d.getDate()}</b><span>${MCS.HARI[d.getDay()]}</span><em>${day.length} sidang</em></header>
        <div class="list">${day.length ? day.map(({ c, s }) => `<div class="ev ${s.t < MCS.NOW ? 'past' : ''}" data-id="${c.id}" style="animation-delay:${Math.min(n++, 30) * 15}ms">
          <div class="tm">${MCS.fmtTime(s.t)}<span>${MCS.KJ[c.kejati].short.replace('Kejati ', '')}</span></div>
          <div class="a">${s.agenda}</div>
          <div class="m">${c.jenis === 'koneksitas' ? '<b class="kon">Koneksitas</b> · ' : ''}${E(MCS.terdakwaLabel(c.terdakwa[0]))} · ${MCS.CAT[c.cat].name}</div>
          <div class="m">${MCS.forumShort(c)}</div>
          <div class="m mono" style="font-size:10.5px">${c.reg}</div></div>`).join('') : '<div class="empty">Tidak ada sidang</div>'}</div></div>`;
    }).join('');
    $('ag-week').querySelectorAll('.ev').forEach((r) => (r.onclick = () => CaseView.open(r.dataset.id)));
  }
  function initAgenda() {
    $('ag-court').innerHTML = '<option value="">Sesuai saringan</option>' + MCS.KEJATI.map((c) => `<option value="${c.id}">${c.short}</option>`).join('');
    $('ag-court').onchange = renderAgenda;
    $('ag-prev').onclick = () => { weekStart -= 7 * MCS.DAY; renderAgenda(); };
    $('ag-next').onclick = () => { weekStart += 7 * MCS.DAY; renderAgenda(); };
    $('ag-today').onclick = () => { weekStart = mondayOf(MCS.TODAY); renderAgenda(); };
    $('btn-agenda').onclick = () => { renderAgenda(); UI.open('agenda'); };
  }

  // ---------------- Pustaka hukum ----------------
  let artSel = null;
  function renderLegalList() {
    const q = $('lg-q').value.trim().toLowerCase();
    const count = {}; MCS.cases.forEach((c) => c.arts.forEach((a) => (count[a] = (count[a] || 0) + 1)));
    $('lg-list').innerHTML = MCS.LAWS.map((l) => {
      const arts = MCS.ARTS.filter((a) => a.law === l.id && (!q || (a.pasal + ' ' + a.desc + ' ' + l.name).toLowerCase().includes(q)));
      if (!arts.length) return '';
      return `<div class="lg-law">${l.name}<span>${l.full}</span></div>` + arts.map((a) => `<div class="lg-a ${a.id === artSel ? 'on' : ''}" data-a="${a.id}"><b>${a.pasal}</b><span class="v">${MCS.fmt(count[a.id] || 0)}</span><span class="d">${a.desc}</span></div>`).join('');
    }).join('') || '<div class="empty">Tidak ditemukan.</div>';
    $('lg-list').querySelectorAll('.lg-a').forEach((r) => (r.onclick = () => { artSel = r.dataset.a; renderLegalList(); renderLegalDetail(); }));
  }
  function renderLegalDetail() {
    const a = MCS.ART[artSel]; if (!a) return;
    const l = MCS.LAW[a.law];
    const list = MCS.filter({ art: a.id });
    const putus = list.filter((c) => c.putusan);
    const avg = putus.length ? Math.round(putus.reduce((s, c) => s + c.putusan.pidana, 0) / putus.length) : 0;
    const pecat = putus.length ? Math.round((putus.filter((c) => c.putusan.tambahan).length / putus.length) * 100) : 0;
    const byCourt = [...d3.rollup(list, (v) => v.length, (c) => c.kejati)].sort((x, y) => y[1] - x[1]).slice(0, 8);
    const mx = byCourt[0] ? byCourt[0][1] : 1;
    const byMatra = d3.rollup(list, (v) => v.length, (c) => c.matra);
    $('lg-detail').innerHTML = `<div class="eyebrow">${l.name}</div><h3>${a.pasal}</h3><div class="lawname">${l.full}</div>
      <p class="desc">${a.desc}.</p>
      <div class="lg-grid">
        <div class="card"><span>Ancaman pidana</span><b>${a.threat}</b></div>
        <div class="card"><span>Padanan KUHP 2023</span><b>${a.baru ? a.baru + ' UU 1/2023' : a.law === 'KUHPM' ? 'Tetap KUHPM (lex specialis)' : 'UU sektoral tetap berlaku'}</b></div>
        <div class="card"><span>Perkara yang menggunakan pasal ini</span><b>${MCS.fmt(list.length)}</b></div>
        <div class="card"><span>Rata-rata pidana dijatuhkan</span><b>${avg ? MCS.fmtBulan(avg) : '—'}</b></div>
        <div class="card"><span>Putusan disertai pemecatan</span><b>${putus.length ? pecat + '%' : '—'}</b></div>
        <div class="card"><span>Komposisi matra</span><b style="font-size:14px">AD ${MCS.fmt(byMatra.get('AD') || 0)} · AL ${MCS.fmt(byMatra.get('AL') || 0)} · AU ${MCS.fmt(byMatra.get('AU') || 0)}</b></div>
      </div>
      <div class="sec"><h4>Sebaran per Kejaksaan Tinggi<span>8 teratas</span></h4>${byCourt.map(([k, v]) => `<div class="hbar"><span>${MCS.KJ[k].short}</span><div><i data-w="${(v / mx) * 100}"></i></div><b>${MCS.fmt(v)}</b></div>`).join('')}</div>
      <div style="display:flex;gap:8px"><button class="btn primary" id="lg-apply">${UI.icon('filter')}Tampilkan perkara di peta</button></div>
      <p class="note" style="margin-top:18px">Ringkasan ancaman pidana disederhanakan untuk pemantauan. Rujukan resmi tetap naskah undang-undang; padanan KUHP 2023 perlu divalidasi tim hukum Babinkum TNI.</p>`;
    requestAnimationFrame(() => $('lg-detail').querySelectorAll('[data-w]').forEach((i) => (i.style.width = i.dataset.w + '%')));
    $('lg-apply').onclick = () => {
      UI.close('legal');
      const cat = MCS.CATS.find((c) => c.arts.some((x) => x[0].includes(a.id)));
      if (cat) App.setFilter('cat', cat.id);
      UI.toast('Disaring: ' + cat.name);
    };
  }
  function initLegal() {
    $('lg-q').oninput = renderLegalList;
    $('btn-legal').onclick = () => { artSel = artSel || 'KUHPM-87'; renderLegalList(); renderLegalDetail(); UI.open('legal'); };
  }

  // ---------------- Pencarian cepat ----------------
  let results = [], sel = 0;
  const CMDS = [
    { t: 'Buka agenda sidang', s: 'Jadwal sidang minggu ini', ic: 'cal', run: () => $('btn-agenda').click() },
    { t: 'Buka pustaka hukum', s: 'Undang-undang & pasal', ic: 'scale', run: () => $('btn-legal').click() },
    { t: 'Tanya asisten analisis', s: 'Pertanyaan dalam bahasa sehari-hari', ic: 'search', run: () => $('btn-ai').click() },
    { t: 'Kembali ke tampilan nasional', s: 'Atur ulang wilayah', ic: 'home', run: () => App.setFilter('region', 'ID') },
    { t: 'Buka Workspace', s: 'Input & pembaruan perkara', ic: 'edit', run: () => (location.href = 'admin.html') },
  ];
  function hl(s, q) { if (!q) return E(s); const i = s.toLowerCase().indexOf(q); return i < 0 ? E(s) : E(s.slice(0, i)) + '<mark>' + E(s.slice(i, i + q.length)) + '</mark>' + E(s.slice(i + q.length)); }
  function search() {
    const q = $('p-q').value.trim().toLowerCase();
    results = [];
    const groups = [];
    if (!q) {
      groups.push(['Perintah', CMDS.map((c) => ({ ...c, kind: 'cmd' }))]);
      const recent = MCS.hearings(MCS.cases, MCS.TODAY, MCS.TODAY + MCS.DAY).slice(0, 5).map(({ c, s }) => ({ t: s.agenda + ' · ' + MCS.terdakwaLabel(c.terdakwa[0]), s: MCS.fmtTime(s.t) + ' · ' + MCS.forumShort(c) + ' · ' + MCS.KJ[c.kejati].short, ic: 'gavel', run: () => CaseView.open(c.id) }));
      if (recent.length) groups.push(['Sidang hari ini', recent]);
    } else {
      const reg = MCS.provIds.filter((p) => MCS.PROV[p].toLowerCase().includes(q)).slice(0, 3).map((p) => ({ t: MCS.PROV[p], s: 'Provinsi · ' + MCS.kabsOf(p).length + ' kab/kota', ic: 'map', h: MCS.PROV[p], run: () => App.setFilter('region', String(p)) }))
        .concat(MCS.KABS.filter((k) => k.name.toLowerCase().includes(q)).slice(0, 5).map((k) => ({ t: k.name, s: MCS.PROV[k.p] + ' · ' + MCS.courtOfKab(k.id).short, ic: 'map', h: k.name, run: () => App.setFilter('region', k.id) })));
      const courts = MCS.KEJATI.filter((c) => (c.name + ' ' + c.short + ' ' + c.city).toLowerCase().includes(q)).slice(0, 3).map((c) => ({ t: c.name, s: 'Kejaksaan Tinggi · saring perkara wilayahnya', ic: 'building', h: c.name, run: () => App.setFilter('kejati', c.id) }));
      const arts = MCS.ARTS.filter((a) => (a.pasal + ' ' + MCS.LAW[a.law].name + ' ' + a.desc).toLowerCase().includes(q)).slice(0, 4).map((a) => ({ t: a.pasal + ' ' + MCS.LAW[a.law].name, s: a.desc, ic: 'scale', h: a.pasal + ' ' + MCS.LAW[a.law].name, run: () => { $('btn-legal').click(); } }));
      const cs = [];
      for (let i = MCS.cases.length - 1; i >= 0 && cs.length < 8; i--) {
        const c = MCS.cases[i];
        const hay = (c.id + ' ' + (c.reg || '') + ' ' + c.lp + ' ' + c.title + ' ' + c.terdakwa.map((t) => MCS.terdakwaLabel(t) + ' ' + t.nrp).join(' ') + ' ' + c.sipil.map((t) => t.nama).join(' ') + ' ' + c.kesatuan).toLowerCase();
        if (hay.includes(q)) cs.push({ t: MCS.terdakwaLabel(c.terdakwa[0]) + ' — ' + c.title, s: (c.reg || c.id) + ' · ' + MCS.JN[c.jenis].name + ' · ' + MCS.TAHAP[c.st].name + ' · ' + MCS.KJ[c.kejati].short, ic: 'file', h: MCS.terdakwaLabel(c.terdakwa[0]) + ' — ' + c.title, run: () => CaseView.open(c.id) });
      }
      if (cs.length) groups.push(['Perkara', cs]);
      if (reg.length) groups.push(['Wilayah', reg]);
      if (courts.length) groups.push(['Kejaksaan Tinggi', courts]);
      if (arts.length) groups.push(['Pasal', arts]);
    }
    let i = 0;
    $('p-res').innerHTML = groups.length ? groups.map(([g, items]) => `<div class="p-grp">${g}</div>` + items.map((it) => { results.push(it); return `<div class="p-it ${i === sel ? 'on' : ''}" data-i="${i++}"><span class="ic">${UI.icon(it.ic)}</span><div><b>${hl(it.h || it.t, q)}${it.h ? E(it.t.slice(it.h.length)) : ''}</b><span>${E(it.s)}</span></div><em>↵</em></div>`; }).join('')).join('') : `<div class="empty">Tidak ada hasil untuk “${E(q)}”.</div>`;
    $('p-res').querySelectorAll('.p-it').forEach((r) => { r.onclick = () => go(+r.dataset.i); r.onmousemove = () => { if (sel !== +r.dataset.i) { sel = +r.dataset.i; mark(); } }; });
  }
  function mark() { $('p-res').querySelectorAll('.p-it').forEach((r) => r.classList.toggle('on', +r.dataset.i === sel)); const on = $('p-res').querySelector('.p-it.on'); if (on) on.scrollIntoView({ block: 'nearest' }); }
  function go(i) { const it = results[i]; if (!it) return; UI.close('palette'); setTimeout(it.run, 120); }
  function openPalette() { $('p-q').value = ''; sel = 0; search(); UI.open('palette'); setTimeout(() => $('p-q').focus(), 50); }
  function initPalette() {
    $('open-palette').onclick = openPalette;
    $('p-q').oninput = () => { sel = 0; search(); };
    $('p-q').onkeydown = (e) => {
      if (e.key === 'ArrowDown') { sel = Math.min(results.length - 1, sel + 1); mark(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); mark(); e.preventDefault(); }
      else if (e.key === 'Enter') go(sel);
    };
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); UI.isOpen('palette') ? UI.close('palette') : openPalette(); }
      else if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); openPalette(); }
    });
  }

  window.Panels = { init() { initAgenda(); initLegal(); initPalette(); } };
})();
