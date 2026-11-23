/* =====================================================================
   MCS — Pencarian pintar (gaya asisten AI)
   Pengguna menulis dengan kalimat biasa; sistem memahami wilayah, jenis
   tindak pidana, matra, tahun, tahap, dan maksud lain, lalu menjawab dengan
   ringkasan, angka, dan daftar perkara. Prototipe: pemahaman berbasis kata
   kunci pada data simulasi (bukan model bahasa sungguhan).
   Dipakai di Command Center dan Workspace.
   ===================================================================== */
window.SmartSearch = (function () {
  'use strict';
  const E = (s) => MCS.esc(String(s == null ? '' : s));
  const $ = (id) => document.getElementById(id);
  const STAR = '<path d="M12 2.5l1.9 5.9 5.9 1.9-5.9 1.9L12 18.1l-1.9-5.9L4.2 10.3l5.9-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>';
  const spark = (cls) => `<svg class="${cls || 'ss-spark'}" viewBox="0 0 24 24" fill="url(#ss-grad)">${STAR}</svg>`;
  const EXAMPLES = [
    ['Perkara desersi TNI AD tahun ini', 'search'],
    ['Sidang minggu ini', 'cal'],
    ['Penahanan yang segera berakhir', 'lock'],
    ['Korupsi tahun ini', 'map'],
    ['Perkara koneksitas narkotika', 'file'],
    ['Kerugian negara terbesar', 'cash'],
  ];
  const PLACEHOLDERS = ['Coba: perkara desersi TNI AD tahun ini', 'Coba: sidang besok di Jakarta', 'Coba: narkotika di Sumatera Utara', 'Coba: penahanan yang segera berakhir', 'Atau ketik nama tersangka, nomor perkara, pasal'];
  const HINTS = ['perkara desersi TNI AD tahun ini', 'sidang besok di Jakarta', 'korupsi tahun ini', 'penahanan yang segera berakhir', 'nama tersangka atau nomor perkara'];

  // ---------- memahami pertanyaan ----------
  function parse(raw) {
    let t = ' ' + String(raw).toLowerCase().replace(/[“”"']/g, ' ').replace(/[?!.,]/g, ' ') + ' ';
    const f = { cat: '', matra: '', year: '', region: '', kejati: '', jenis: '', stage: '' };
    const chips = [];
    const out = { when: '', intent: '', only: '', sort: '' };
    const take = (re) => { const m = t.match(re); if (m) t = t.replace(re, ' '); return m; };
    const yearNow = new Date(MCS.NOW).getFullYear();

    let m = take(/\b(hari ini|besok|minggu ini|pekan ini|bulan ini)\b/);
    if (m) out.when = m[1];
    const sidang = take(/\bsidang\b/);
    if (sidang && out.when) { out.intent = 'sidang'; chips.push(['Sidang', out.when]); }
    else if (sidang) { f.stage = 4; chips.push(['Tahap', 'Persidangan']); }

    if (take(/\btahun ini\b/)) { f.year = yearNow; }
    else if ((m = take(/\b(20[2-3]\d)\b/))) f.year = +m[1];
    if (f.year) chips.push(['Tahun', String(f.year)]);

    if (take(/\bkerugian( negara)?\b|\bmerugikan\b/)) { out.only = 'rugi'; chips.push(['Fokus', 'Kerugian negara']); }
    if (take(/\b(penahanan|ditahan|tahanan)\b/)) { out.only = 'tahan'; chips.push(['Fokus', 'Penahanan segera berakhir']); }
    take(/\b(segera berakhir|hampir berakhir|hampir habis|kritis|segera)\b/);
    if (take(/\bbelum diverifikasi\b/)) { out.only = 'verif'; chips.push(['Fokus', 'Belum diverifikasi']); }
    if (take(/\b(terbesar|terbanyak|tertinggi)\b/)) out.sort = 'rugi';

    if (!f.stage && f.stage !== 0) {
      [[/\bpenyidikan\b/, 0], [/\bpenelitian( berkas)?\b/, 1], [/\bpendapat hukum\b/, 2], [/\bpenuntutan\b/, 3], [/\bpersidangan\b/, 4], [/\bputusan\b/, 5], [/\b(upaya hukum|banding|kasasi)\b/, 6], [/\beksekusi\b/, 7]]
        .some(([re, i]) => { if (take(re)) { f.stage = i; chips.push(['Tahap', MCS.TAHAP[i].name]); return true; } return false; });
    }
    if (take(/\bkoneksitas\b/)) { f.jenis = 'koneksitas'; chips.push(['Jenis', 'Koneksitas']); }
    else if (take(/\boditurat\b/)) { f.jenis = 'oditurat'; chips.push(['Jenis', 'Perkara Oditurat']); }
    if (take(/\bangkatan darat\b|\b(tni\s+)?ad\b/)) f.matra = 'AD';
    else if (take(/\bangkatan laut\b|\b(tni\s+)?al\b/)) f.matra = 'AL';
    else if (take(/\bangkatan udara\b|\b(tni\s+)?au\b/)) f.matra = 'AU';
    if (f.matra) chips.push(['Matra', MCS.matraName(f.matra)]);

    // wilayah: Kejati, kabupaten/kota, lalu provinsi
    const kj = MCS.KEJATI.find((c) => t.includes(' ' + c.short.toLowerCase() + ' ') || t.includes(' ' + c.name.toLowerCase() + ' '));
    if (kj) { f.kejati = kj.id; t = t.replace(kj.short.toLowerCase(), ' ').replace(kj.name.toLowerCase(), ' '); chips.push(['Wilayah', kj.short]); }
    else {
      const kab = MCS.KABS.find((k) => { const n = k.name.toLowerCase().replace(/^kota |^kab\. /, ''); return n.length > 4 && t.includes(' ' + n + ' '); });
      const prov = MCS.provIds.map((p) => ({ p, n: MCS.PROV[p].toLowerCase() })).filter((x) => t.includes(x.n)).sort((a, b) => b.n.length - a.n.length)[0];
      if (kab) { f.region = kab.id; t = t.replace(kab.name.toLowerCase().replace(/^kota |^kab\. /, ''), ' '); chips.push(['Wilayah', kab.name]); }
      else if (prov) { f.region = String(prov.p); t = t.replace(prov.n, ' '); chips.push(['Wilayah', MCS.PROV[prov.p]]); }
    }
    // klasifikasi tindak pidana dari kata kunci pasal & perbuatan
    if (window.SARAN) {
      const sg = SARAN.suggest(t, null);
      if (sg && !sg.empty) { f.cat = sg.top.cat; sg.top.hits.forEach((h) => { t = t.replace(h, ' '); }); chips.push(['Klasifikasi', MCS.CAT[f.cat].name]); }
    }
    // sisa kata dipakai untuk mencari nama, nomor, satuan
    const rest = t.replace(/\b(perkara|kasus|yang|di|dari|untuk|dengan|dan|atau|tahap|tampilkan|tunjukkan|cari|carikan|berapa|jumlah|ada|semua|daftar|seluruh|seindonesia|indonesia|se|tni|terkait|tentang|soal|apa|saja|yg|pada)\b/g, ' ').replace(/\s+/g, ' ').trim();
    const words = rest.split(' ').filter((w) => w.length >= 2);
    const hasStruct = chips.length > 0;
    return { f, chips, out, words, text: words.join(' '), hasStruct, raw };
  }

  const match = (c, f) => (!f.cat || c.cat === f.cat) && (!f.matra || c.matra === f.matra) && (!f.year || c.y === f.year) && (!f.jenis || c.jenis === f.jenis)
    && (f.stage === '' || f.stage == null || c.st === f.stage) && (!f.kejati || c.kejati === f.kejati) && (!f.region || String(c.p) === String(f.region) || c.kab === f.region);
  const hay = (c) => (c.id + ' ' + (c.reg || '') + ' ' + c.lp + ' ' + c.title + ' ' + c.kesatuan + ' ' + c.terdakwa.map((t) => MCS.terdakwaLabel(t) + ' ' + t.nrp).join(' ') + ' ' + c.sipil.map((t) => t.nama).join(' ')).toLowerCase();

  function run(P, pool) {
    let rows = pool.filter((c) => match(c, P.f));
    if (P.words.length) rows = rows.filter((c) => { const h = hay(c); return P.words.every((w) => h.includes(w)); });
    if (P.out.only === 'rugi') rows = rows.filter((c) => c.kerugian > 0);
    if (P.out.only === 'tahan') rows = rows.filter((c) => c.tahanan && c.tahanan.sampai - MCS.TODAY <= 5 * MCS.DAY);
    if (P.out.only === 'verif') rows = rows.filter((c) => !c.verified);
    if (P.out.only === 'tahan') rows.sort((a, b) => a.tahanan.sampai - b.tahanan.sampai);
    else if (P.out.sort === 'rugi' || P.out.only === 'rugi') rows.sort((a, b) => b.kerugian - a.kerugian);
    else rows.sort((a, b) => b.updated - a.updated);
    let hear = null;
    if (P.out.intent === 'sidang') {
      const d0 = MCS.TODAY, d = MCS.DAY;
      const [from, to] = P.out.when === 'hari ini' ? [d0, d0 + d] : P.out.when === 'besok' ? [d0 + d, d0 + 2 * d] : P.out.when === 'bulan ini' ? [d0, d0 + 30 * d] : [d0, d0 + 7 * d];
      hear = MCS.hearings(rows.length === pool.length ? pool : pool.filter((c) => match(c, P.f)), from, to);
    }
    return { rows, hear };
  }

  // ---------- saran bila tidak ketemu ("Mungkin maksud Anda") ----------
  const lev = (a, b) => {
    const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[n];
  };
  let tokCache = { n: -1, set: [] };
  function tokens(pool) {
    if (tokCache.n === pool.length) return tokCache.set;
    const set = new Set();
    pool.forEach((c) => { c.terdakwa.forEach((t) => t.nama.toLowerCase().split(' ').forEach((w) => w.length >= 3 && set.add(w))); c.sipil.forEach((t) => t.nama.toLowerCase().split(' ').forEach((w) => w.length >= 3 && set.add(w))); });
    tokCache = { n: pool.length, set: [...set] }; return tokCache.set;
  }
  function didYouMean(P, pool) {
    const toks = tokens(pool), out = [];
    P.words.forEach((w) => {
      if (w.length < 4 || toks.includes(w)) return;
      const near = toks.map((t) => ({ t, d: lev(w, t) })).filter((x) => x.d <= 2 && x.t[0] === w[0]).sort((a, b) => a.d - b.d).slice(0, 3);
      near.forEach((x) => out.push({ from: w, to: x.t }));
    });
    return out.slice(0, 4);
  }

  // ---------- kalimat jawaban ----------
  function sentence(P, R) {
    const parts = [];
    const push = (t, b) => parts.push({ t, b: !!b });
    const f = P.f;
    const where = f.kejati ? 'di ' + MCS.KJ[f.kejati].short : f.region ? 'di ' + (MCS.KAB[f.region] ? MCS.KAB[f.region].name : 'Provinsi ' + MCS.PROV[f.region]) : '';
    const filt = [f.cat ? MCS.CAT[f.cat].name : '', f.jenis ? (f.jenis === 'koneksitas' ? 'koneksitas' : 'Oditurat') : '', f.matra ? MCS.matraName(f.matra) : '', f.stage !== '' ? 'di tahap ' + MCS.TAHAP[f.stage].name.toLowerCase() : '', where, f.year ? 'tahun ' + f.year : ''].filter(Boolean).join(' ');
    if (R.hear) {
      push('Ada '); push(MCS.fmt(R.hear.length) + ' sidang', true); push(' ' + P.out.when + (filt ? ' · ' + filt : '') + '.');
      if (R.hear[0]) push(' Yang terdekat: ' + R.hear[0].s.agenda.toLowerCase() + ', ' + MCS.fmtTime(R.hear[0].s.t) + '.');
      return parts;
    }
    const n = R.rows.length;
    if (!n) {
      const sc = window.WSHost && WSHost.scope ? ' di cakupan ' + WSHost.scope() : '';
      push('Tidak ada perkara yang cocok' + sc + '. Coba kata yang lebih umum, misalnya jenis perbuatan, nama wilayah, atau nomor perkara.');
      return parts;
    }
    if (!P.hasStruct && P.text) { push('Menemukan '); push(MCS.fmt(n) + ' perkara', true); push(' yang cocok dengan “' + P.text + '”.'); return parts; }
    const tail = P.out.only === 'tahan' ? ' dengan penahanan segera berakhir' : P.out.only === 'rugi' ? ' dengan kerugian' : P.out.only === 'verif' ? ' yang belum diverifikasi' : '';
    push('Ada '); push(MCS.fmt(n) + ' perkara', true); push((filt ? ' ' + filt : '') + tail + (P.text ? ' dengan kata “' + P.text + '”' : '') + '.');
    const run1 = R.rows.filter((c) => c.st < 7).length;
    push(' ' + MCS.fmt(run1) + ' sedang berjalan, ' + MCS.fmt(n - run1) + ' sudah selesai.');
    const neg = R.rows.filter((c) => c.kn === 'negara' && c.kerugian > 0);
    const tot = neg.reduce((s, c) => s + c.kerugian, 0), pul = neg.reduce((s, c) => s + c.pulih, 0);
    if (tot > 0 && P.out.only !== 'tahan') push(' Kerugian negara ' + MCS.fmtRp(tot, true) + ', ' + Math.round((pul / tot) * 100) + '% sudah dipulihkan.');
    return parts;
  }

  // ---------- tuan rumah (Command Center atau Workspace) ----------
  function host() {
    if (window.WSHost) return window.WSHost;
    return {
      pool: () => MCS.cases,
      open: (id) => CaseView.open(id),
      list: (P) => {
        App.setFilter('reset');
        App.setFilter('region', P.f.region || 'ID');
        if (P.f.kejati) App.setFilter('kejati', P.f.kejati);
        ['year', 'matra', 'cat', 'stage', 'jenis'].forEach((k) => { if (P.f[k] !== '' && P.f[k] != null) App.setFilter(k, P.f[k]); });
        CaseList.open('');
      },
      agenda: () => $('btn-agenda').click(),
      commands: [['Agenda sidang', 'cal', () => $('btn-agenda').click()], ['Pustaka hukum', 'scale', () => $('btn-legal').click()], ['Buka Workspace', 'edit', () => { location.href = 'admin.html'; }]],
    };
  }

  // ---------- riwayat pencarian (disimpan di peramban) ----------
  const HK = 'mcs-ss-history';
  const loadH = () => { try { return JSON.parse(localStorage.getItem(HK)) || []; } catch (e) { return []; } };
  const saveH = (q) => {
    q = q.trim(); if (q.length < 3) return;
    const h = loadH().filter((x) => x.toLowerCase() !== q.toLowerCase()); h.unshift(q);
    try { localStorage.setItem(HK, JSON.stringify(h.slice(0, 8))); } catch (e) { /* abaikan */ }
  };
  const delH = (q) => { try { localStorage.setItem(HK, JSON.stringify(loadH().filter((x) => x !== q))); } catch (e) { /* abaikan */ } };
  const CLOCK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

  // pertanyaan lanjutan: tambahan kata pada pertanyaan sebelumnya
  function followups(P, R) {
    const out = [];
    const ws = !!window.WSHost;
    if (R.hear) { ['besok', 'minggu ini', 'bulan ini'].forEach((w) => { if (P.out.when !== w) out.push(w); }); return out.slice(0, 3).map((m) => [m, P.raw.replace(P.out.when, '').trim() + ' ' + m]); }
    if (!P.f.year) out.push('tahun ini');
    if (!P.f.jenis) out.push('koneksitas');
    if (!ws && !P.f.region && !P.f.kejati) out.push('di Jawa Timur');
    if (P.f.stage === '' && P.out.only !== 'tahan') out.push('di persidangan');
    if (!P.out.only) out.push('kerugian terbesar');
    if (P.out.only !== 'tahan') out.push('penahanan segera berakhir');
    return out.slice(0, 4).map((m) => [m, P.raw.trim() + ' ' + m]);
  }
  const RICH = /bandingkan|beban|antar.?kejati|\btren\b|naik|turun/;

  // ---------- tampilan ----------
  let root, input, body, timer, tick, last = null, sel = -1, items = [], phIdx = 0, phTimer;

  function build() {
    if (root) return;
    document.body.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="ss-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--accent)"/><stop offset="1" style="stop-color:var(--ai-b)"/></linearGradient></defs></svg>
      <div class="ss-wrap" id="ss" aria-hidden="true"><div class="ss-panel" role="dialog" aria-label="Pencarian MCS">
        <div class="ss-in">${spark('ss-ic')}<input id="ss-q" autocomplete="off" spellcheck="false" aria-label="Pencarian pintar: ketik nama, nomor perkara, atau pertanyaan" /><button class="ss-esc" type="button" id="ss-close" aria-label="Tutup">Esc</button></div>
        <div class="ss-body" id="ss-body"></div>
        <div class="ss-foot"><span><kbd>↑</kbd><kbd>↓</kbd> pilih</span><span><kbd>Enter</kbd> buka</span><span class="ss-note" id="ss-note"></span></div>
      </div></div>`);
    root = $('ss'); input = $('ss-q'); body = $('ss-body');
    root.addEventListener('mousedown', (e) => { if (e.target === root) close(); });
    $('ss-close').onclick = close;
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKey);
  }

  function emptyState() {
    const H = host();
    last = null; items = []; sel = -1;
    const hist = loadH();
    body.innerHTML = `${hist.length ? `<div class="ss-sec">Terakhir dicari<button type="button" class="ss-link" id="ss-hclear">Hapus riwayat</button></div><div class="ss-hist">${hist.slice(0, 5).map((q) => `<div class="ss-h" data-q="${E(q)}">${CLOCK}<span>${E(q)}</span><button type="button" class="ss-hx" data-x="${E(q)}" aria-label="Hapus dari riwayat">×</button></div>`).join('')}</div>` : ''}<div class="ss-sec">Coba tanyakan</div>
      <div class="ss-sugg">${EXAMPLES.map(([q, ic], i) => `<button class="ss-card" type="button" data-q="${E(q)}" style="animation-delay:${i * 40}ms"><span class="ss-cic">${UI.icon(ic)}</span><span>${E(q)}</span></button>`).join('')}</div>
      <div class="ss-sec">Pintasan</div>
      <div class="ss-cmds">${H.commands.map(([t, ic], i) => `<button class="ss-cmd" type="button" data-c="${i}">${UI.icon(ic)}${E(t)}</button>`).join('')}</div>`;
    body.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => { input.value = b.dataset.q; onInput(); input.focus(); }));
    body.querySelectorAll('.ss-hx').forEach((x) => (x.onclick = (e) => { e.stopPropagation(); delH(x.dataset.x); emptyState(); }));
    const hc = $('ss-hclear'); if (hc) hc.onclick = () => { try { localStorage.removeItem(HK); } catch (e) { /* abaikan */ } emptyState(); };
    body.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { close(); setTimeout(H.commands[+b.dataset.c][2], 140); }));
  }

  function thinking(P, n) {
    body.innerHTML = `<div class="ss-ans"><div class="ss-tag">${spark()}<span id="ss-step">Memahami pertanyaan</span><i class="ss-dots"><b></b><b></b><b></b></i></div>
      <div class="ss-chips" id="ss-chips"></div><div class="ss-skel"><i></i><i></i></div></div>`;
    const step = (txt) => { const s = $('ss-step'); if (s) s.textContent = txt; };
    clearTimeout(tick);
    tick = setTimeout(() => {
      const c = $('ss-chips'); if (c) c.innerHTML = P.chips.length ? P.chips.map(([k, v]) => `<span class="ss-chip"><em>${E(k)}</em>${E(v)}</span>`).join('') : '';
      step('Mencari di ' + MCS.fmt(n) + ' perkara');
    }, 260);
  }

  function answer(P) {
    const H = host();
    const pool = H.pool();
    const R = run(P, pool);
    const rich = RICH.test(P.raw.toLowerCase()) && window.AI && AI.answer ? AI.answer(P.raw) : null;
    const parts = rich ? [] : sentence(P, R);
    const words = [];
    parts.forEach((p) => p.t.split(/(\s+)/).forEach((w) => { if (w) words.push({ w, b: p.b }); }));
    const chips = P.chips.map(([k, v]) => `<span class="ss-chip"><em>${E(k)}</em>${E(v)}</span>`).join('');
    const rows = R.hear ? R.hear.slice(0, 6).map(({ c, s }) => ({ id: c.id, t: MCS.terdakwaLabel(c.terdakwa[0]) + ' · ' + s.agenda, s: MCS.fmtDay(s.t) + ', ' + MCS.fmtTime(s.t) + ' · ' + MCS.forumShort(c), st: c.st })) : R.rows.slice(0, 6).map((c) => ({ id: c.id, t: MCS.terdakwaLabel(c.terdakwa[0]) + ' — ' + c.title, s: (c.reg || c.id) + ' · ' + MCS.CAT[c.cat].name + ' · ' + MCS.KJ[c.kejati].short, st: c.st }));
    const total = R.hear ? R.hear.length : R.rows.length;
    const canList = !R.hear && total > 0;
    const dym = !total && !R.hear ? didYouMean(P, pool) : [];
    const stats = !R.hear && total ? (() => {
      const run1 = R.rows.filter((c) => c.st < 7).length;
      return `<div class="ss-stats"><div><b>${MCS.fmt(total)}</b><span>perkara</span></div><div><b>${MCS.fmt(run1)}</b><span>berjalan</span></div><div><b>${MCS.fmt(total - run1)}</b><span>selesai</span></div></div>`;
    })() : '';
    body.innerHTML = `<div class="ss-ans"><div class="ss-tag">${spark()}<span>Jawaban MCS</span></div>
      ${chips ? `<div class="ss-chips">${chips}</div>` : ''}
      ${rich ? `<div class="ss-rich">${rich.h}</div>` : `<p class="ss-sum">${words.map((x, i) => (/^\s+$/.test(x.w) ? x.w : `<span class="w${x.b ? ' b' : ''}" style="--i:${i}">${E(x.w)}</span>`)).join('')}</p>`}
      ${rich ? '' : stats}
      ${dym.length ? `<div class="ss-dym"><span>Mungkin maksud Anda:</span>${dym.map((x, i) => `<button type="button" class="ss-chip ss-dymb" data-i="${i}">${E(x.to)}</button>`).join('')}</div>` : ''}
      <div class="ss-act">${rich ? rich.acts.map((a, i) => `<button class="ss-btn" type="button" data-ra="${i}">${E(a[0])} →</button>`).join('') : ''}${canList ? `<button class="ss-btn primary" type="button" id="ss-all">Lihat ${MCS.fmt(total)} perkara <kbd>Enter</kbd></button>` : ''}${R.hear && H.agenda ? '<button class="ss-btn" type="button" id="ss-ag">Buka agenda sidang</button>' : ''}<button class="ss-btn ghost" type="button" id="ss-clear">Hapus</button></div>
      ${(total || rich) ? `<div class="ss-fu"><span>Tanya lanjutan</span>${(rich ? [['tahun ini', P.raw + ' tahun ini'], ['koneksitas', P.raw + ' koneksitas']] : followups(P, R)).map(([m, q], i) => `<button type="button" class="ss-fub" data-fq="${E(q)}">${E(m)}</button>`).join('')}</div>` : ''}</div>
      ${rows.length ? `<div class="ss-sec">${R.hear ? 'Sidang' : total > rows.length ? 'Perkara teratas' : 'Perkara'}</div><div class="ss-list">${rows.map((r, i) => `<div class="ss-it" data-i="${i}" data-id="${r.id}"><span class="ss-bar" style="background:${MCS.GROUP[MCS.groupOf(r.st)].color}"></span><div><b>${E(r.t)}</b><span>${E(r.s)}</span></div>${UI.stagePill(r.st)}</div>`).join('')}</div>` : ''}`;
    last = { P, R, rows, canList };
    if (total || rich) saveH(P.raw);
    items = [...body.querySelectorAll('.ss-it')]; sel = -1;
    items.forEach((it) => { it.onclick = () => { close(); setTimeout(() => H.open(it.dataset.id), 140); }; it.onmousemove = () => { sel = +it.dataset.i; mark(); }; });
    body.querySelectorAll('.ss-dymb').forEach((b) => (b.onclick = () => { const x = dym[+b.dataset.i]; input.value = P.raw.toLowerCase().replace(x.from, x.to); onInput(); input.focus(); }));
    const all = $('ss-all'); if (all) all.onclick = () => { close(); setTimeout(() => H.list(P), 140); };
    body.querySelectorAll('[data-ra]').forEach((b) => (b.onclick = () => { const f = rich.acts[+b.dataset.ra][1]; close(); setTimeout(f, 140); }));
    body.querySelectorAll('.ss-fub').forEach((b) => (b.onclick = () => { input.value = b.dataset.fq; onInput(); input.focus(); }));
    const ag = $('ss-ag'); if (ag) ag.onclick = () => { close(); setTimeout(H.agenda, 140); };
    $('ss-clear').onclick = () => { input.value = ''; emptyState(); input.focus(); };
    // kata muncul satu per satu
    const ws = [...body.querySelectorAll('.ss-sum .w')];
    ws.forEach((el, i) => setTimeout(() => el.classList.add('on'), 18 * i));
  }

  function mark() { items.forEach((x, i) => x.classList.toggle('on', i === sel)); if (items[sel]) items[sel].scrollIntoView({ block: 'nearest' }); }

  function onInput() {
    clearTimeout(timer); clearTimeout(tick);
    const q = input.value.trim();
    if (q.length < 2) { emptyState(); return; }
    const P = parse(q);
    thinking(P, host().pool().length);
    timer = setTimeout(() => answer(P), 640);
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') { if (items.length) { sel = Math.min(items.length - 1, sel + 1); mark(); } e.preventDefault(); }
    else if (e.key === 'ArrowUp') { if (items.length) { sel = Math.max(-1, sel - 1); mark(); } e.preventDefault(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (!last) { const q = input.value.trim(); if (q.length >= 2) { clearTimeout(timer); answer(parse(q)); } return; }
      if (sel >= 0 && items[sel]) items[sel].click();
      else if (last.canList && $('ss-all')) $('ss-all').click();
      else if (items[0]) items[0].click();
    } else if (e.key === 'Escape') close();
  }

  function open() {
    build();
    const H = host();
    $('ss-note').textContent = window.WSHost ? 'Dibatasi cakupan akses Anda' : '';
    input.value = ''; emptyState();
    root.classList.add('on'); root.setAttribute('aria-hidden', 'false');
    setTimeout(() => input.focus(), 40);
    startPlaceholder();
  }
  function close() { if (!root) return; root.classList.remove('on'); root.setAttribute('aria-hidden', 'true'); clearTimeout(timer); clearTimeout(tick); stopPlaceholder(); }
  const isOpen = () => root && root.classList.contains('on');

  // contoh pertanyaan bergantian di kolom input
  function startPlaceholder() {
    stopPlaceholder();
    const step = () => { input.placeholder = PLACEHOLDERS[phIdx % PLACEHOLDERS.length]; phIdx++; };
    step(); phTimer = setInterval(step, 2600);
  }
  function stopPlaceholder() { clearInterval(phTimer); }

  // ---------- pasang di bilah atas ----------
  function init() {
    build();
    ['open-palette', 'q-open'].forEach((id) => {
      const b = $(id); if (!b) return;
      b.classList.add('ai-search');
      b.innerHTML = `${spark('ss-spark')}<span class="ss-lab"><b>Cari atau tanyakan</b><i class="ss-rot">“${HINTS[0]}”</i></span><kbd>Ctrl K</kbd>`;
      b.addEventListener('click', (e) => { e.stopImmediatePropagation(); e.preventDefault(); open(); }, true);
    });
    let hi = 0;
    setInterval(() => {
      if (isOpen()) return;
      document.querySelectorAll('.ss-rot').forEach((el) => {
        el.classList.add('out');
        setTimeout(() => { hi = (hi + 1) % HINTS.length; el.textContent = '“' + HINTS[hi] + '”'; el.classList.remove('out'); }, 360);
      });
    }, 3600);
    window.addEventListener('keydown', (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); e.stopImmediatePropagation(); isOpen() ? close() : open(); }
      else if (e.key === '/' && !typing && !isOpen()) { e.preventDefault(); e.stopImmediatePropagation(); open(); }
      else if (e.key === 'Escape' && isOpen()) { e.stopImmediatePropagation(); close(); }
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  return { open, close, parse };
})();
