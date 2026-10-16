/* =====================================================================
   MCS — Asisten Analisis (simulasi antarmuka bahasa alami)
   Prototipe: pemahaman pertanyaan berbasis kata kunci. Pada produksi,
   pertanyaan diterjemahkan menjadi kueri terstruktur dengan pembatasan
   cakupan akses pengguna, dan setiap angka disertai sumbernya.
   ===================================================================== */
window.AI = (function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const drawer = $('ai'), msgs = $('ai-msgs');
  const SUGG = [
    'Berapa perkara desersi TNI AD tahun ini?',
    'Berapa perkara koneksitas di Kejati Jawa Timur?',
    'Penahanan mana yang segera berakhir?',
    'Bandingkan beban perkara antar-Kejati',
    'Total kerugian negara dan yang sudah dipulihkan',
  ];

  function parse(q) {
    q = q.toLowerCase();
    const f = {};
    MCS.CATS.forEach((c) => { const key = c.name.toLowerCase().split(/[ &/(]/)[0]; if (key.length > 3 && q.includes(key)) f.cat = c.id; });
    if (q.includes('narkoba')) f.cat = 'NAR';
    if (/\bad\b|angkatan darat/.test(q)) f.matra = 'AD';
    if (/\bal\b|angkatan laut/.test(q)) f.matra = 'AL';
    if (/\bau\b|angkatan udara/.test(q)) f.matra = 'AU';
    const y = q.match(/20(2[4-6])/); if (y) f.year = +y[0];
    if (q.includes('tahun ini')) f.year = new Date(MCS.NOW).getFullYear();
    MCS.provIds.forEach((p) => { if (q.includes(MCS.PROV[p].toLowerCase())) f.region = String(p); });
    MCS.KABS.forEach((k) => { if (k.short.length > 4 && q.includes(k.short.toLowerCase().replace('kota ', ''))) f.region = k.id; });
    MCS.KEJATI.forEach((c) => { if (q.includes(c.short.toLowerCase()) || q.includes(c.name.toLowerCase())) { f.kejati = c.id; delete f.region; } });
    if (q.includes('koneksitas')) f.jenis = 'koneksitas';
    if (q.includes('oditurat')) f.jenis = 'oditurat';
    return f;
  }
  const scopeText = (f) => [f.cat && MCS.CAT[f.cat].name.toLowerCase(), f.matra && MCS.matraName(f.matra), f.region && MCS.regionName(f.region), f.kejati && MCS.KJ[f.kejati].short, f.jenis && MCS.JN[f.jenis].name.toLowerCase(), f.year && 'tahun ' + f.year].filter(Boolean).join(', ') || 'seluruh perkara';

  function answer(q) {
    const ql = q.toLowerCase();
    const f = parse(q);
    const list = MCS.filter(f);
    const acts = [];
    let h = '';
    if (ql.includes('tahan')) {
      const al = MCS.alerts(list).filter((a) => a.type === 'tahanan').slice(0, 6);
      h = al.length ? `Ada <b>${MCS.alerts(list).filter((a) => a.type === 'tahanan').length} terdakwa</b> yang masa penahanannya berakhir dalam 5 hari (${scopeText(f)}). Yang paling mendesak:
        <table class="tbl">${al.map((a) => `<tr><td>${MCS.esc(MCS.terdakwaLabel(a.c.terdakwa[0]))}<br><span class="muted">${a.c.reg || a.c.id}</span></td><td>${a.sisa <= 0 ? 'hari ini' : a.sisa + ' hari'}</td></tr>`).join('')}</table>` : 'Tidak ada masa penahanan yang berakhir dalam 5 hari.';
      al.slice(0, 2).forEach((a) => acts.push(['Buka ' + (a.c.reg || a.c.id).split('/')[0], () => CaseView.open(a.c.id)]));
    } else if (ql.includes('sidang') && (ql.includes('hari ini') || ql.includes('besok') || ql.includes('minggu'))) {
      const from = ql.includes('besok') ? MCS.TODAY + MCS.DAY : MCS.TODAY;
      const to = ql.includes('minggu') ? MCS.TODAY + 7 * MCS.DAY : from + MCS.DAY;
      const hs = MCS.hearings(list, from, to);
      h = `Terdapat <b>${hs.length} sidang</b> ${ql.includes('minggu') ? 'dalam 7 hari ke depan' : ql.includes('besok') ? 'besok' : 'hari ini'} (${scopeText(f)}).` + (hs.length ? `<table class="tbl">${hs.slice(0, 6).map(({ c, s }) => `<tr><td>${MCS.fmtTime(s.t)} · ${s.agenda}<br><span class="muted">${MCS.esc(MCS.terdakwaLabel(c.terdakwa[0]))} · ${MCS.KJ[c.kejati].short}</span></td><td>${MCS.CAT[c.cat].name.split(' ')[0]}</td></tr>`).join('')}</table>` : '');
      acts.push(['Buka agenda sidang', () => $('btn-agenda').click()]);
    } else if (ql.includes('bandingkan') || ql.includes('beban') || ql.includes('antar')) {
      const rows = MCS.KEJATI.map((t) => { const l = MCS.filter({ ...f, kejati: t.id }); return [t.short, l.length, l.filter((c) => c.st < 7).length, l.filter((c) => c.jenis === 'koneksitas').length]; }).sort((a, b) => b[1] - a[1]).slice(0, 6);
      h = `Enam Kejati dengan beban perkara terbesar (${scopeText(f)}):<table class="tbl">${rows.map((r) => `<tr><td>${r[0]}<br><span class="muted">${MCS.fmt(r[2])} belum selesai · ${MCS.fmt(r[3])} koneksitas</span></td><td>${MCS.fmt(r[1])}</td></tr>`).join('')}</table><b>${rows[0][0]}</b> menanggung beban terbesar.`;
      acts.push(['Lihat peringkat Kejati', () => document.querySelector('#rank-tabs [data-tab=court]').click()]);
    } else if (ql.includes('rugi') || ql.includes('pulih') || ql.includes('uang')) {
      const s = MCS.stats(list);
      h = `Total kerugian keuangan negara (${scopeText(f)}): <b>${MCS.fmtRp(s.kerugianNegara)}</b>, dengan <b>${MCS.fmtRp(s.pulihNegara)}</b> telah dipulihkan (${s.kerugianNegara ? ((s.pulihNegara / s.kerugianNegara) * 100).toFixed(1) : 0}%). Kerugian korban pada perkara penipuan/penggelapan: ${MCS.fmtRp(s.kerugianKorban)}.`;
      acts.push(['Saring korupsi', () => App.setFilter('cat', 'KOR')]);
    } else if (ql.includes('tren') || ql.includes('naik') || ql.includes('turun')) {
      const s = MCS.monthsSeries(list);
      const a = s.slice(-3).reduce((x, y) => x + y.masuk, 0), b = s.slice(-6, -3).reduce((x, y) => x + y.masuk, 0);
      const d = b ? ((a - b) / b) * 100 : 0;
      h = `Dalam 3 bulan terakhir masuk <b>${MCS.fmt(a)} perkara</b> (${scopeText(f)}), ${d >= 0 ? 'naik' : 'turun'} <b>${Math.abs(d).toFixed(1)}%</b> dibanding 3 bulan sebelumnya (${MCS.fmt(b)}).`;
    } else {
      const s = MCS.stats(list);
      const top = Object.entries(MCS.stats(list).byCat).sort((x, y) => y[1] - x[1])[0];
      h = `Untuk <b>${scopeText(f)}</b> tercatat <b>${MCS.fmt(s.total)} perkara</b>${f.jenis ? '' : ` (${MCS.fmt(s.byJenis.koneksitas)} koneksitas, ${MCS.fmt(s.byJenis.oditurat)} perkara Oditurat)`}: ${MCS.fmt(s.byGroup.pra)} pra-persidangan, ${MCS.fmt(s.byGroup.sidang)} di persidangan/upaya hukum, dan ${MCS.fmt(s.byGroup.tetap)} sudah inkracht/eksekusi.${!f.cat && top ? ` Klasifikasi terbanyak: ${MCS.CAT[top[0]].name} (${MCS.fmt(top[1])}).` : ''}`;
      acts.push(['Terapkan ke dashboard', () => { Object.entries(f).forEach(([k, v]) => App.setFilter(k, v)); }]);
    }
    return { h: h + `<div class="src">Sumber: basis data MCS · ${MCS.fmtDate(MCS.NOW, true)} · cakupan Nasional</div>`, acts };
  }

  function add(cls, html) { const el = document.createElement('div'); el.className = 'msg ' + cls; el.innerHTML = html; msgs.appendChild(el); msgs.scrollTop = msgs.scrollHeight; return el; }
  function ask(q) {
    if (!q.trim()) return;
    add('u', MCS.esc(q));
    $('ai-sugg').classList.add('compact');
    const t = add('a', '<div class="typing"><i></i><i></i><i></i></div>');
    setTimeout(() => {
      const r = answer(q);
      t.innerHTML = r.h + (r.acts.length ? '<div class="acts">' + r.acts.map((a, i) => `<button data-i="${i}">${a[0]}</button>`).join('') + '</div>' : '');
      t.querySelectorAll('.acts button').forEach((b) => (b.onclick = r.acts[+b.dataset.i][1]));
      msgs.scrollTop = msgs.scrollHeight;
    }, 650 + Math.random() * 500);
  }

  function toggle(on) {
    on = on == null ? !drawer.classList.contains('on') : on;
    drawer.classList.toggle('on', on);
    $('btn-ai').classList.toggle('on', on);
    if (on) setTimeout(() => $('ai-input').focus(), 300);
  }
  function init() {
    add('a', 'Selamat datang. Saya dapat merangkum data perkara, agenda sidang, masa penahanan, dan kerugian negara sesuai hak akses Anda. Silakan bertanya.');
    $('ai-sugg').innerHTML = SUGG.map((s) => `<button>${s}</button>`).join('');
    $('ai-sugg').querySelectorAll('button').forEach((b) => (b.onclick = () => ask(b.textContent)));
    $('ai-form').onsubmit = (e) => { e.preventDefault(); ask($('ai-input').value); $('ai-input').value = ''; };
    $('btn-ai').onclick = () => toggle();
    $('ai-x').onclick = () => toggle(false);
    document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); toggle(); } });
  }
  return { init, ask, toggle };
})();
