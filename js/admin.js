/* =====================================================================
   MCS — Workspace Kejaksaan: input & pembaruan perkara pidana militer oleh
   bidang Pidana Militer Kejati (operator → verifikasi Aspidmil), pemantauan &
   eksaminasi oleh Jampidmil, administrasi oleh Sekretariat Jampidmil.
   SPA sederhana berbasis hash (#beranda, #perkara/ID, #baru, …).
   ===================================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const E = MCS.esc;
  const I = UI.icon;
  const page = $('page');

  // ================= Sesi & cakupan akses =================
  const DEMO_USERS = ['U-005', 'U-004', 'U-007', 'U-003', 'U-001', 'U-002'];
  let users = MCS.getUsers();
  let me = users.find((u) => u.id === MCS.LS.get('mcs3_me', 'U-005')) || users[4];
  const role = () => MCS.ROLES.find((r) => r.id === me.role);
  const roleIdx = () => MCS.ROLES.findIndex((r) => r.id === me.role);
  const can = (perm) => { const p = MCS.PERMS.find((x) => x[0] === perm); return !!(p && p[1][roleIdx()]); };
  // Operator & Aspidmil hanya melihat perkara di wilayah Kejati-nya; Jampidmil melihat nasional
  const regional = () => me.role === 'OPERATOR' || me.role === 'ASPIDMIL';
  const inScope = (c) => !regional() || c.kejati === me.kejati;
  let scoped = [];
  const refreshScope = () => { scoped = MCS.cases.filter(inScope); };
  const scopeLabel = () => (regional() ? me.unit : 'Nasional');
  const canMoveTo = () => ['OPERATOR', 'ASPIDMIL', 'PUSAT'].includes(me.role);
  // input operator diverifikasi Aspidmil sebelum terbit di dashboard nasional (maker–checker)
  const needsApproval = () => me.role === 'OPERATOR';
  const readOnly = () => ['PIMPINAN', 'DIREKTORAT', 'PENGAWAS'].includes(me.role);
  const initials = (n) => n.replace(/^(Kolonel|Letkol|Mayor|Kapten|Lettu|Letda|Brigjen TNI|Serma|Dr\.)\s+(Chk|Kum|Laut \(H\))?\s*/, '').split(/[ ,]/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('');

  // ================= Navigasi =================
  const NAV = [
    ['Kerja', [
      ['beranda', 'Beranda', 'home'],
      ['perkara', 'Perkara', 'folder', () => MCS.fmt(scoped.filter((c) => c.st < 7).length)],
      ['baru', 'Input perkara baru', 'plus', null, () => can('Input perkara baru')],
      ['agenda', 'Agenda sidang', 'cal', () => MCS.fmt(MCS.hearings(scoped, MCS.TODAY, MCS.TODAY + MCS.DAY).length)],
      ['persetujuan', 'Persetujuan', 'inbox', () => pendingApprovals().length || '', () => can('Menyetujui pembaruan (verifikasi)'), true],
      ['laporan', 'Laporan', 'chart', null, () => can('Ekspor laporan')],
    ]],
    ['Data induk', [
      ['pasal', 'Pasal & undang-undang', 'scale'],
      ['satuan', 'Kejati & instansi mitra', 'building'],
    ]],
    ['Sistem', [
      ['pengguna', 'Pengguna & hak akses', 'users', null, () => can('Kelola pengguna') || me.role === 'PUSAT'],
      ['audit', 'Log audit', 'log', null, () => can('Lihat log audit')],
    ]],
  ];
  function renderNav(cur) {
    $('nav').innerHTML = NAV.map(([g, items]) => `<div class="ng">${g}</div>` + items.map(([k, n, ic, badge, allow, warn]) => {
      const ok = !allow || allow();
      const b = badge ? badge() : '';
      return `<a class="ni ${cur === k ? 'on' : ''} ${ok ? '' : 'locked'}" href="#${k}" title="${ok ? '' : 'Tidak tersedia untuk peran Anda'}">${I(ic)}${n}${b !== '' && b != null ? `<em class="${warn && b ? 'warn' : ''}">${b}</em>` : ''}</a>`;
    }).join('')).join('');
    $('me').innerHTML = `<div class="who"><div class="av">${initials(me.name)}</div><div><b>${E(me.name)}</b><span>${role().name} · ${E(me.unit)}</span></div></div>
      <label>Masuk sebagai (mode demo)</label>
      <select id="me-sel">${DEMO_USERS.map((id) => users.find((u) => u.id === id)).map((u) => `<option value="${u.id}" ${u.id === me.id ? 'selected' : ''}>${MCS.ROLES.find((r) => r.id === u.role).name} — ${u.unit}</option>`).join('')}</select>`;
    $('me-sel').onchange = (e) => {
      me = users.find((u) => u.id === e.target.value); MCS.LS.set('mcs3_me', me.id);
      refreshScope(); UI.toast('Masuk sebagai ' + role().name + ' · cakupan ' + scopeLabel());
      location.hash = '#beranda'; route();
    };
    const al = MCS.alerts(scoped).filter((a) => a.level === 'critical').length;
    $('notif-dot').style.display = al ? '' : 'none';
  }
  const crumb = (...parts) => { $('crumb').innerHTML = parts.map((p, i) => (i < parts.length - 1 ? `<a href="${p[1]}">${p[0]}</a><span>/</span>` : `<b>${p[0]}</b>`)).join(''); };

  // ================= Router =================
  let listState = { view: 'aktif', q: '', stage: '', cat: '', matra: '', page: 1 };
  let edTab = 'ringkas';
  function route() {
    const h = location.hash.slice(1) || 'beranda';
    const [k, arg] = h.split('/');
    renderNav(k === 'perkara' && arg ? 'perkara' : k);
    page.scrollTop = 0;
    const R = { beranda, perkara: () => (arg ? editor(decodeURIComponent(arg)) : list()), baru: wizard, agenda, persetujuan, laporan, pasal, satuan, pengguna, audit };
    (R[k] || beranda)();
  }
  window.addEventListener('hashchange', route);

  // ================= Beranda =================
  function beranda() {
    crumb(['Beranda']);
    const hr = new Date().getHours();
    const salam = hr < 11 ? 'Selamat pagi' : hr < 15 ? 'Selamat siang' : hr < 18 ? 'Selamat sore' : 'Selamat malam';
    const active = scoped.filter((c) => c.st < 7);
    const today = MCS.hearings(scoped, MCS.TODAY, MCS.TODAY + MCS.DAY);
    const al = MCS.alerts(scoped);
    const tahan = al.filter((a) => a.type === 'tahanan');
    const stale = al.filter((a) => a.type === 'stale');
    const yest = MCS.hearings(scoped, MCS.TODAY - 3 * MCS.DAY, MCS.TODAY).filter((h) => h.s.status === 'selesai').slice(-6);
    const pend = pendingApprovals();
    const tasks = []
      .concat(tahan.slice(0, 4).map((a) => ({ lv: a.level === 'critical' ? 'crit' : 'warn', ic: 'lock', t: `${a.text} — ${MCS.terdakwaLabel(a.c.terdakwa[0])}`, s: `${a.c.reg || a.c.id} · kewenangan perpanjangan: ${a.c.tahanan.oleh}`, go: 'Perpanjang', href: '#perkara/' + a.c.id, tab: 'tahanan' })))
      .concat(yest.slice(0, 3).map(({ c, s }) => ({ lv: '', ic: 'gavel', t: `Lengkapi berita acara sidang “${s.agenda.toLowerCase()}”`, s: `${MCS.terdakwaLabel(c.terdakwa[0])} · ${MCS.fmtDay(s.t)} · ${c.reg}`, go: 'Catat hasil', href: '#perkara/' + c.id, tab: 'sidang' })))
      .concat(pend.slice(0, 2).map((p) => ({ lv: 'warn', ic: 'inbox', t: `Verifikasi perubahan ${p.field.toLowerCase()}`, s: `${p.caseId} · diajukan ${p.by} · ${MCS.fmtAgo(p.t)}`, go: 'Tinjau', href: '#persetujuan' })))
      .concat(stale.slice(0, 3).map((a) => ({ lv: 'warn', ic: 'clock', t: `${a.text} — mohon perbarui status`, s: `${MCS.terdakwaLabel(a.c.terdakwa[0])} · ${MCS.TAHAP[a.c.st].name} · ${a.c.reg || a.c.id}`, go: 'Perbarui', href: '#perkara/' + a.c.id })));
    page.innerHTML = `
      <div class="ph"><div><h1>${salam}, ${E(me.name.split(',')[0])}</h1><p>${role().name} · <b style="color:var(--txt-2)">${E(scopeLabel())}</b> · ${MCS.HARI[new Date().getDay()]}, ${MCS.fmtDate(MCS.NOW)}</p></div>
        <div class="acts">${can('Input perkara baru') ? `<a class="btn primary" href="#baru">${I('plus')}Input perkara baru</a>` : ''}</div></div>
      <div class="kpis">
        <div class="kpi" data-href="#perkara"><span class="ic">${I('folder')}</span><span>Perkara aktif</span><b data-n="${active.length}">0</b><em>${MCS.fmt(active.filter((c) => c.st === 4).length)} dalam persidangan</em></div>
        <div class="kpi" data-href="#agenda"><span class="ic">${I('cal')}</span><span>Sidang hari ini</span><b data-n="${today.length}">0</b><em>${MCS.fmt(MCS.hearings(scoped, MCS.TODAY + MCS.DAY, MCS.TODAY + 2 * MCS.DAY).length)} sidang besok</em></div>
        <div class="kpi ${tahan.some((a) => a.level === 'critical') ? 'crit' : ''}" data-href="#perkara" data-view="tahanan"><span class="ic">${I('lock')}</span><span>Penahanan berakhir ≤ 5 hari</span><b data-n="${tahan.length}">0</b><em>${tahan.filter((a) => a.level === 'critical').length} berakhir ≤ 2 hari</em></div>
        <div class="kpi ${stale.length ? 'warn' : ''}" data-href="#perkara" data-view="stale"><span class="ic">${I('clock')}</span><span>Belum diperbarui > 90 hari</span><b data-n="${stale.length}">0</b><em>wajib diperbarui berkala</em></div>
      </div>
      <div class="g3">
        <div class="card"><header><h3>Tugas saya</h3><span class="aux">${tasks.length} butir · diurutkan menurut urgensi</span></header>
          <div>${tasks.length ? tasks.map((t, i) => `<div class="task ${t.lv}" data-href="${t.href}" data-tab="${t.tab || ''}" style="animation:pageIn .35s ${i * 30}ms both"><span class="ic">${I(t.ic)}</span><div><b>${E(t.t)}</b><span>${E(t.s)}</span></div><span class="go">${t.go} →</span></div>`).join('') : '<div class="empty">Tidak ada tugas tertunda. Kerja bagus.</div>'}</div></div>
        <div class="card"><header><h3>Sidang hari ini</h3><a class="aux" href="#agenda">Lihat agenda →</a></header>
          <div>${today.length ? today.slice(0, 9).map(({ c, s }) => `<div class="task" data-href="#perkara/${c.id}" data-tab="sidang"><span class="ic tm">${MCS.fmtTime(s.t)}</span><div><b>${s.agenda}</b><span>${E(MCS.terdakwaLabel(c.terdakwa[0]))} · ${c.reg}</span></div></div>`).join('') : '<div class="empty">Tidak ada sidang hari ini.</div>'}</div></div>
      </div>
      <div class="g2" style="margin-top:16px">
        <div class="card"><header><h3>Perkara menurut tahap</h3><span class="aux">cakupan ${E(scopeLabel())}</span></header><div class="cb">${stageBars(scoped)}</div></div>
        <div class="card"><header><h3>Aktivitas terbaru</h3><a class="aux" href="#audit">Log audit →</a></header><div>${MCS.getAudit().filter((a) => { const c = MCS.byId(a.target); return !c || inScope(c); }).slice(0, 7).map((a) => `<div class="task" data-href="${MCS.byId(a.target) ? '#perkara/' + a.target : '#audit'}"><span class="ic">${I('history')}</span><div><b>${E(a.action)} · <span class="mono" style="display:inline;color:var(--txt-2)">${E(a.target)}</span></b><span>${E(a.user)} · ${MCS.fmtAgo(a.t)}</span></div></div>`).join('')}</div></div>
      </div>`;
    page.querySelectorAll('[data-n]').forEach((b) => UI.countUp(b, +b.dataset.n));
    bindHref();
  }
  function stageBars(list) {
    const s = MCS.stats(list); const mx = Math.max(...s.byStage) || 1;
    return MCS.TAHAP.map((t, i) => `<div style="display:grid;grid-template-columns:150px 1fr 54px;gap:10px;align-items:center;padding:4px 0;font-size:12.5px">
      <span style="color:var(--txt-2)">${i + 1}. ${t.name}</span><div style="height:7px;background:rgba(var(--tint), .07);border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:${(s.byStage[i] / mx) * 100}%;background:${MCS.GROUP[MCS.groupOf(i)].color};border-radius:0 4px 4px 0;transition:width .8s"></i></div><b style="text-align:right;font-variant-numeric:tabular-nums">${MCS.fmt(s.byStage[i])}</b></div>`).join('');
  }
  function bindHref(root = page) {
    root.querySelectorAll('[data-href]').forEach((el) => (el.onclick = (e) => {
      if (e.target.closest('button') && e.target.closest('button') !== el) return;
      if (el.dataset.tab) edTab = el.dataset.tab;
      if (el.dataset.view) { listState = { ...listState, view: el.dataset.view, page: 1 }; }
      location.hash = el.dataset.href;
    }));
  }

  // ================= Daftar perkara =================
  const VIEWS = [
    ['aktif', 'Aktif', (c) => c.st < 7],
    ['sidang', 'Sidang 7 hari', (c) => c.sidang.some((s) => s.status === 'jadwal' && s.t < MCS.TODAY + 7 * MCS.DAY)],
    ['tahanan', 'Penahanan kritis', (c) => c.tahanan && c.tahanan.sampai - MCS.TODAY <= 5 * MCS.DAY],
    ['stale', 'Perlu pembaruan', (c) => c.st < 7 && MCS.NOW - c.updated > 90 * MCS.DAY],
    ['verif', 'Belum diverifikasi', (c) => !c.verified],
    ['tetap', 'Inkracht', (c) => c.st === 7],
    ['semua', 'Semua', () => true],
  ];
  function list() {
    crumb(['Perkara']);
    const PAGE = 15;
    const v = VIEWS.find((x) => x[0] === listState.view) || VIEWS[0];
    const q = listState.q.toLowerCase();
    let rows = scoped.filter(v[2]).filter((c) =>
      (listState.stage === '' || c.st === +listState.stage) && (!listState.cat || c.cat === listState.cat) && (!listState.matra || c.matra === listState.matra) &&
      (!q || (c.id + ' ' + (c.reg || '') + ' ' + c.lp + ' ' + c.title + ' ' + c.kesatuan + ' ' + c.terdakwa.map((t) => MCS.terdakwaLabel(t) + ' ' + t.nrp).join(' ') + ' ' + c.sipil.map((t) => t.nama).join(' ')).toLowerCase().includes(q)));
    rows.sort((a, b) => b.updated - a.updated);
    const pages = Math.max(1, Math.ceil(rows.length / PAGE));
    listState.page = Math.min(listState.page, pages);
    const slice = rows.slice((listState.page - 1) * PAGE, listState.page * PAGE);
    page.innerHTML = `
      <div class="ph"><div><h1>Perkara</h1><p>${MCS.fmt(scoped.length)} perkara · ${E(scopeLabel())}</p></div>
        <div class="acts"><button class="btn" id="exp">${I('download')}Ekspor</button>${can('Input perkara baru') ? `<a class="btn primary" href="#baru">${I('plus')}Input perkara baru</a>` : ''}</div></div>
      <div class="views">${VIEWS.map(([k, n, f]) => { const cnt = scoped.filter(f).length; return `<button data-v="${k}" class="${k === v[0] ? 'on' : ''}">${n}<em class="${(k === 'tahanan' || k === 'stale') && cnt ? 'warn' : ''}">${MCS.fmt(cnt)}</em></button>`; }).join('')}</div>
      <div class="toolbar">
        <input class="input grow" id="lq" placeholder="Cari nomor register, LP, terdakwa, NRP, satuan…" value="${E(listState.q)}" />
        <label class="sel"><span>Tahap</span><select id="ls"><option value="">Semua</option>${MCS.TAHAP.map((t) => `<option value="${t.id}" ${String(t.id) === String(listState.stage) ? 'selected' : ''}>${t.id + 1}. ${t.name}</option>`).join('')}</select></label>
        <label class="sel"><span>Klasifikasi</span><select id="lc"><option value="">Semua</option>${MCS.CATS.map((c) => `<option value="${c.id}" ${c.id === listState.cat ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
        <label class="sel"><span>Matra</span><select id="lm"><option value="">Semua</option>${MCS.MATRA.map((m) => `<option value="${m.id}" ${m.id === listState.matra ? 'selected' : ''}>${m.short}</option>`).join('')}</select></label>
      </div>
      <div class="tw"><table class="t"><thead><tr><th>Nomor perkara</th><th>Tersangka</th><th>Jenis &amp; klasifikasi</th><th>Tahap</th><th>Sidang berikutnya</th><th>Diperbarui</th><th></th></tr></thead>
      <tbody>${slice.length ? slice.map((c) => { const ns = MCS.nextSidang(c); const crit = c.tahanan && c.tahanan.sampai - MCS.TODAY <= 2 * MCS.DAY; return `<tr class="click" data-href="#perkara/${c.id}">
        <td><span class="mono">${c.reg || c.lp}</span><span class="sub">${c.id}${c.verified ? '' : ' · <span style="color: var(--warn-txt)">belum diverifikasi</span>'}</span></td>
        <td><b style="font-weight:500">${E(MCS.terdakwaLabel(c.terdakwa[0]))}</b>${c.terdakwa.length + c.sipil.length > 1 ? ` <span class="muted">+${c.terdakwa.length + c.sipil.length - 1}</span>` : ''}<span class="sub">${E(c.kesatuan)} · ${MCS.matraName(c.matra)}</span></td>
        <td>${c.jenis === 'koneksitas' ? '<b style="color:var(--accent);font-weight:500">Koneksitas</b> · ' : ''}${MCS.CAT[c.cat].name}<span class="sub">${c.arts.map(MCS.artLabel).join(', ')}</span></td>
        <td>${UI.stagePill(c.st)}<div class="prog8">${MCS.TAHAP.map((t, i) => `<i class="${i < c.st ? 'on' : i === c.st ? 'cur' : ''}"></i>`).join('')}</div></td>
        <td>${ns ? `${MCS.fmtDay(ns.t)}, ${MCS.fmtTime(ns.t)}<span class="sub">${ns.agenda}</span>` : '<span class="muted">—</span>'}${crit ? `<span class="sub" style="color:var(--crit-txt)">${I('lock')} penahanan kritis</span>` : ''}</td>
        <td>${MCS.fmtAgo(c.updated)}<span class="sub">${E(c.updatedBy)}</span></td>
        <td class="r"><span class="more">${I('arrow')}</span></td></tr>`; }).join('') : '<tr><td colspan="7"><div class="empty">Tidak ada perkara yang cocok dengan saringan.</div></td></tr>'}</tbody></table></div>
      <div class="pager">${MCS.fmt(rows.length)} perkara · halaman ${listState.page} dari ${pages}
        <button class="btn" id="pp" ${listState.page <= 1 ? 'disabled' : ''}>←</button><button class="btn" id="pn" ${listState.page >= pages ? 'disabled' : ''}>→</button></div>`;
    page.querySelectorAll('.views button').forEach((b) => (b.onclick = () => { listState.view = b.dataset.v; listState.page = 1; list(); }));
    let tq; $('lq').oninput = (e) => { clearTimeout(tq); tq = setTimeout(() => { listState.q = e.target.value; listState.page = 1; list(); $('lq').focus(); $('lq').setSelectionRange(99, 99); }, 220); };
    $('ls').onchange = (e) => { listState.stage = e.target.value; listState.page = 1; list(); };
    $('lc').onchange = (e) => { listState.cat = e.target.value; listState.page = 1; list(); };
    $('lm').onchange = (e) => { listState.matra = e.target.value; listState.page = 1; list(); };
    $('pp').onclick = () => { listState.page--; list(); };
    $('pn').onclick = () => { listState.page++; list(); };
    $('exp').onclick = () => UI.toast(`${MCS.fmt(rows.length)} perkara diekspor ke Excel (.xlsx) dengan watermark pengguna`);
    bindHref();
  }

  // ================= Editor perkara =================
  // ---- format rupiah ----
  const fmtNum = (v) => String(v == null ? '' : v).replace(/\D/g, '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const SAT = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  const tb = (n) => {
    if (n < 12) return SAT[n];
    if (n < 20) return tb(n - 10) + ' belas';
    if (n < 100) return tb(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + tb(n % 10) : '');
    if (n < 200) return 'seratus' + (n % 100 ? ' ' + tb(n % 100) : '');
    if (n < 1000) return tb(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + tb(n % 100) : '');
    if (n < 2000) return 'seribu' + (n % 1000 ? ' ' + tb(n % 1000) : '');
    if (n < 1e6) return tb(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + tb(n % 1000) : '');
    if (n < 1e9) return tb(Math.floor(n / 1e6)) + ' juta' + (n % 1e6 ? ' ' + tb(n % 1e6) : '');
    if (n < 1e12) return tb(Math.floor(n / 1e9)) + ' miliar' + (n % 1e9 ? ' ' + tb(n % 1e9) : '');
    return tb(Math.floor(n / 1e12)) + ' triliun' + (n % 1e12 ? ' ' + tb(n % 1e12) : '');
  };
  const terbilang = (n) => (n > 0 && n < 1e15 ? tb(n).replace(/^./, (c) => c.toUpperCase()) + ' rupiah' : '');
  const AUDITORS = ['BPK RI', 'BPKP', 'Inspektorat Jenderal TNI', 'Inspektorat Daerah', 'Akuntan publik', 'Lembaga berwenang lainnya'];

  // ---- berkas & barang bukti ----
  const FKIND = {
    doc: { ext: /\.pdf$/i, max: 20, label: 'PDF · maks. 20 MB', accept: '.pdf,application/pdf' },
    img: { ext: /\.(jpe?g|png)$/i, max: 20, label: 'Foto JPG/PNG · maks. 20 MB', accept: '.jpg,.jpeg,.png,image/jpeg,image/png' },
    vid: { ext: /\.(mp4|mov)$/i, max: 200, label: 'Video MP4/MOV · maks. 200 MB', accept: '.mp4,.mov,video/mp4,video/quicktime' },
  };
  const ADD_KINDS = PROSES.DOCT.map(([id, label, kind]) => [label, kind, id]);
  const defDocIdx = (c) => Math.max(0, PROSES.DOCT.findIndex((d) => d[3] === c.st));
  const slotsOf = (K, ditahan, audit) => [
    ['lp', K ? 'Surat perintah penyidikan koneksitas' : 'Laporan Polisi Militer', 'doc', 'Disarankan'],
    ['bap', 'Berita Acara Pemeriksaan (BAP) tersangka', 'doc', 'Disarankan'],
    ['bapsaksi', 'BAP saksi', 'doc', ''],
    ...(audit ? [['audit', 'Laporan hasil audit kerugian', 'doc', 'Disarankan']] : []),
    ...(ditahan ? [['tahan', 'Surat perintah penahanan', 'doc', 'Disarankan']] : []),
    ['foto', 'Foto barang bukti', 'img', ''],
    ['video', 'Video barang bukti', 'vid', ''],
    ['visum', 'Hasil visum / laboratorium', 'doc', ''],
    ['lain', 'Berkas pendukung lainnya', 'doc', ''],
  ];
  const fmtSize = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  const filterFiles = (files, kind) => {
    const k = FKIND[kind], ok = [], bad = [];
    files.forEach((f) => { if (!k.ext.test(f.name)) bad.push(f.name + ': format tidak didukung (' + k.label + ')'); else if (f.size > k.max * 1048576) bad.push(f.name + ': ukuran melebihi ' + k.max + ' MB'); else ok.push(f); });
    return { ok, bad };
  };

  const ED_TABS = [['ringkas', 'Ringkasan', 'file'], ['proses', 'Proses & syarat', 'checkc'], ['terdakwa', 'Tersangka', 'user'], ['pasal', 'Pasal', 'scale'], ['sidang', 'Persidangan', 'cal'], ['kerugian', 'Kerugian', 'cash'], ['tahanan', 'Penahanan', 'lock'], ['dokumen', 'Dokumen', 'folder'], ['riwayat', 'Riwayat', 'history']];
  function editor(id) {
    const c = MCS.byId(id);
    if (!c) { page.innerHTML = '<div class="empty">Perkara tidak ditemukan.</div>'; return; }
    crumb(['Perkara', '#perkara'], [c.reg || c.id]);
    const ns = MCS.nextSidang(c);
    const nextSt = c.st + 1;
    const ro = readOnly() || !inScope(c);
    const pending = MCS.getApprovals().find((a) => a.caseId === c.id && a.status === 'menunggu' && a.field === 'Tahap');
    page.innerHTML = `
      <div class="ch"><div style="min-width:0">
        <div class="meta"><span class="mono" style="color:var(--txt-3);font-size:12px">${c.id} · ${c.reg || c.lp}</span>${UI.stagePill(c.st)}<span class="pill ${c.jenis === 'koneksitas' ? 'info' : ''}">${MCS.JN[c.jenis].name}</span><span class="pill">${MCS.CAT[c.cat].name}</span>${c.verified ? '<span class="pill good">Terverifikasi Aspidmil</span>' : '<span class="pill warn">Belum diverifikasi</span>'}${c.closed ? '<span class="pill crit">Tidak dilanjutkan ke pengadilan</span>' : ''}</div>
        <h1>${E(c.title)}</h1><p>${E(MCS.terdakwaLabel(c.terdakwa[0]))}${c.sipil.length ? ' + ' + c.sipil.length + ' tersangka sipil' : ''} · ${MCS.KJ[c.kejati].short} · ${MCS.forumShort(c)}</p></div>
        <div class="acts">
          <a class="btn ghost" href="index.html" title="Lihat di Command Center">${I('ext')}</a>
          ${!ro && c.st >= 4 && c.st <= 4 ? `<button class="btn" id="a-jadwal">${I('cal')}Jadwalkan sidang</button>` : ''}
          ${!ro && ns ? `<button class="btn" id="a-hasil">${I('gavel')}Catat hasil sidang</button>` : ''}
        </div></div>
      <div class="stepper" style="grid-template-columns:${MCS.TAHAP.map((t, i) => (i === c.st ? 'minmax(210px,1.9fr)' : 'minmax(128px,1fr)')).join(' ')}">${MCS.TAHAP.map((t, i) => {
        const done = i < c.st, cur = i === c.st, nxt = i === c.st + 1;
        const go = !ro && nextSt <= 7 && !c.closed ? (pending ? `<span class="pill warn">${I('clock')}Menunggu verifikasi</span>` : `<button class="btn primary" id="a-tahap" ${canMoveTo(nextSt) ? '' : 'disabled title="Peran Anda hanya dapat membaca"'}>${I('arrow')}Lanjut ke ${MCS.TAHAP[nextSt].name}</button>`) : (c.closed ? '<span class="pill crit">Tidak dilanjutkan</span>' : '');
        return `<div class="sp ${done ? 'done' : cur ? 'cur' : nxt ? 'next' : ''}" title="${MCS.tahapLong(i, c)}"><div class="sp-h"><span class="no">${done ? '✓' : i + 1}</span><span class="st">${done ? 'Selesai' : cur ? 'Sedang berjalan' : nxt ? 'Berikutnya' : ''}</span></div><b>${t.name}</b><span class="mt">${c.sd[i] ? (cur ? 'sejak ' : '') + MCS.fmtDate(c.sd[i]) : MCS.tahapActor(i, c)}</span>${cur && go ? `<div class="sp-go">${go}</div>` : ''}</div>`;
      }).join('')}</div>
      <div class="ed">
        <div class="tabsv">${ED_TABS.filter(([k]) => k !== 'kerugian' || c.kn).map(([k, n, ic]) => `<button data-t="${k}" class="${k === edTab ? 'on' : ''}">${I(ic)}${n}${k === 'sidang' ? `<em>${c.sidang.length}</em>` : k === 'terdakwa' ? `<em>${c.terdakwa.length + c.sipil.length}</em>` : ''}</button>`).join('')}</div>
        <div id="ed-body"></div>
        <div class="aside">
          <div class="card"><div class="mini-map" id="ed-map"></div><div class="cb kv2">
            <div><span>Locus delicti</span>${c.loc ? c.loc + ', ' : ''}${MCS.KAB[c.kab].name}, ${MCS.PROV[c.p]}</div>
            <div><span>Kejaksaan Tinggi</span>${MCS.KJ[c.kejati].name}</div>
            <div><span>${c.jenis === 'koneksitas' ? 'Jaksa penuntut' : 'Jaksa koordinator'}</span>${c.jaksa}</div>
            <div><span>Oditurat mitra</span>${c.otmil} · ${c.oditur}</div>
            <div><span>Peradilan</span>${MCS.forumName(c)}${c.jenis === 'koneksitas' && c.st < 3 ? ' <span class="muted">(menunggu penelitian bersama)</span>' : ''}</div></div></div>
          ${ns ? `<div class="card"><div class="cb"><div style="font-size:11.5px;color:var(--serious-txt);font-weight:500">Sidang berikutnya</div><div style="font-size:15px;font-weight:600;margin-top:2px">${MCS.fmtDay(ns.t)}, ${MCS.fmtTime(ns.t)} WIB</div><div class="muted" style="font-size:12px">${ns.agenda} · ${ns.ruang}</div></div></div>` : ''}
          ${c.tahanan ? `<div class="card"><div class="cb"><div style="font-size:11.5px;color:var(--txt-3)">Penahanan berakhir</div><div style="font-size:15px;font-weight:600;margin-top:2px;${c.tahanan.sampai - MCS.TODAY <= 5 * MCS.DAY ? 'color:var(--crit-txt)' : ''}">${MCS.fmtDate(c.tahanan.sampai)}</div><div class="muted" style="font-size:12px">${c.tahanan.tempat}</div></div></div>` : ''}
          ${can('Eksaminasi & catatan evaluasi') ? `<div class="card"><header><h3>Catatan eksaminasi</h3><span class="aux">${(c.eksaminasi || []).length}</span></header><div class="cb">
            ${(c.eksaminasi || []).slice(-3).reverse().map((x) => `<div style="font-size:12.5px;margin-bottom:10px"><div style="color:var(--txt-2)">${E(x.teks)}</div><div class="muted" style="font-size:11.5px">${E(x.oleh)} · ${MCS.fmtAgo(x.t)}</div></div>`).join('')}
            <div class="f"><textarea id="ek-txt" placeholder="Evaluasi kualitas dakwaan/tuntutan, arahan untuk Kejati…" style="min-height:64px"></textarea></div>
            <button class="btn" id="ek-save" style="margin-top:8px;width:100%">${I('edit')}Simpan catatan</button></div></div>` : ''}
          <div class="card"><div class="cb" style="font-size:12px;color:var(--txt-3)">Terakhir diperbarui ${MCS.fmtAgo(c.updated)} oleh ${E(c.updatedBy)}.${c.catatan ? '<br><br><b style="color:var(--txt-2)">Catatan awal</b><br>' + E(c.catatan) : ''}${ro ? '<br><br><b style="color: var(--warn-txt)">Mode baca</b> — peran Anda tidak dapat mengubah perkara ini.' : needsApproval() ? '<br><br>Perubahan tahap dari peran Anda diverifikasi Aspidmil sebelum tampil di dashboard nasional Jampidmil.' : ''}</div></div>
        </div></div>`;
    page.querySelectorAll('.tabsv button').forEach((b) => (b.onclick = () => { edTab = b.dataset.t; page.querySelectorAll('.tabsv button').forEach((x) => x.classList.toggle('on', x === b)); edBody(c, ro); }));
    if ($('a-tahap')) $('a-tahap').onclick = () => stageModal(c);
    { const stp = page.querySelector('.stepper'), cu = stp && stp.querySelector('.sp.cur'); if (stp && cu) stp.scrollLeft = Math.max(0, cu.offsetLeft - 24); }
    if ($('ek-save')) $('ek-save').onclick = () => {
      const t = $('ek-txt').value.trim();
      if (!t) { UI.toast('Isi catatan eksaminasi terlebih dahulu', false); return; }
      c.eksaminasi = (c.eksaminasi || []).concat({ teks: t, oleh: me.name + ' (' + role().name + ')', t: Date.now() });
      MCS.saveCase(c); MCS.audit(me.name, 'Catatan eksaminasi', c.id, t.slice(0, 80));
      UI.toast('Catatan eksaminasi tersimpan & dikirim ke ' + MCS.KJ[c.kejati].short); editor(c.id);
    };
    if ($('a-jadwal')) $('a-jadwal').onclick = () => scheduleModal(c);
    if ($('a-hasil')) $('a-hasil').onclick = () => resultModal(c);
    edBody(c, ro);
    requestAnimationFrame(() => MCSMap.miniMap($('ed-map'), c.kab));
  }

  const field = (label, html, opt = {}) => `<div class="f ${opt.full ? 'full' : ''}"><label>${label}${opt.req ? '<i>*</i>' : ''}</label>${html}${opt.hint ? `<div class="hint">${opt.hint}</div>` : ''}</div>`;
  const inp = (id, val = '', attr = '') => `<input class="input" id="${id}" value="${E(val)}" ${attr} />`;
  const sel = (id, opts, val, attr = '') => `<select class="select" id="${id}" ${attr}>${opts.map((o) => (Array.isArray(o) ? `<option value="${E(o[0])}" ${String(o[0]) === String(val) ? 'selected' : ''}>${E(o[1])}</option>` : `<option ${o === val ? 'selected' : ''}>${E(o)}</option>`)).join('')}</select>`;
  const toDateInput = (t) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  function edBody(c, ro) {
    const el = $('ed-body');
    const dis = ro ? 'disabled' : '';
    const foot = (id, label = 'Simpan perubahan') => ro ? '' : `<div class="form-foot"><span class="note">${I('shield')}Setiap perubahan tercatat di log audit</span><button class="btn primary" id="${id}">${label}</button></div>`;
    let h = '';
    if (edTab === 'ringkas') {
      h = `<div class="card"><header><h3>Identitas perkara</h3></header><div class="cb"><div class="form">
        ${field('Uraian singkat perkara', inp('f-title', c.title, dis), { full: true, req: true })}
        ${field('Klasifikasi', sel('f-cat', MCS.CATS.map((x) => [x.id, x.name]), c.cat, dis), { req: true })}
        ${field(MCS.lpLabel(c), inp('f-lp', c.lp, dis))}
        ${field('Provinsi (locus)', sel('f-prov', MCS.provIds.map((p) => [p, MCS.PROV[p]]), c.p, dis))}
        ${field('Kabupaten/kota (locus)', sel('f-kab', MCS.kabsOf(c.p).map((k) => [k.id, k.name]), c.kab, dis), { hint: 'Menentukan Kejati yang menangani secara otomatis' })}
        ${field('Lokasi detail', inp('f-loc', c.loc || '', dis + ' placeholder="Kecamatan / alamat"'))}
        ${field('Satuan tersangka militer', inp('f-ksat', c.kesatuan, dis))}
        ${field('Nomor register pengadilan', `<div class="ro mono">${c.reg || 'Diterbitkan saat pelimpahan ke pengadilan'}</div>`)}
        ${field('Jenis perkara', sel('f-kon', [['oditurat', 'Perkara Oditurat — koordinasi teknis penuntutan'], ['koneksitas', 'Koneksitas — melibatkan tersangka sipil']], c.jenis, dis))}
      </div></div>${foot('s-ringkas')}</div>`;
    } else if (edTab === 'proses') {
      h = procPanel(c);
    } else if (edTab === 'terdakwa') {
      h = `<div class="card"><header><h3>Tersangka</h3><span class="aux">${c.terdakwa.length} militer${c.sipil.length ? ' · ' + c.sipil.length + ' sipil' : ''}</span></header><div class="cb">${c.terdakwa.map((t, i) => `<div class="tcard"><header>Tersangka militer ${i + 1}</header><div class="form">
        ${field('Pangkat', sel('t-pk' + i, MCS.PANGKAT[c.matra].map((p) => p[0]), t.pangkat, dis))}
        ${field('Nama lengkap', inp('t-nm' + i, t.nama, dis))}
        ${field('NRP', inp('t-nrp' + i, t.nrp, dis), { hint: 'Ditampilkan tersamar di luar instansi penangani' })}
        ${field('Umur', inp('t-um' + i, t.umur, dis + ' type="number"'))}
      </div></div>`).join('')}
        ${c.sipil.map((t, i) => `<div class="tcard"><header>Tersangka sipil ${i + 1}</header><div class="form">
          ${field('Nama lengkap', inp('t-snm' + i, t.nama, dis))}
          ${field('Pekerjaan', inp('t-spk' + i, t.pekerjaan, dis))}
        </div></div>`).join('')}
        ${ro ? '' : `<button class="btn" id="t-add">${I('plus')}Tambah tersangka militer</button>${c.jenis === 'koneksitas' ? ` <button class="btn" id="t-adds">${I('plus')}Tambah tersangka sipil</button>` : ''}`}</div>${foot('s-terdakwa')}</div>`;
    } else if (edTab === 'pasal') {
      const rec = new Set(MCS.CAT[c.cat].arts.flatMap((a) => a[0]));
      h = `<div class="card"><header><h3>Pasal yang didakwakan</h3><span class="aux">klik untuk menambah/menghapus</span></header><div class="cb">
        <div class="fs" style="border:0;padding:0"><h4>Disarankan untuk ${MCS.CAT[c.cat].name}</h4><div class="chipset">${MCS.ARTS.filter((a) => rec.has(a.id)).map((a) => `<span class="chk ${c.arts.includes(a.id) ? 'on' : ''}" data-a="${a.id}">${MCS.artLabel(a.id)}</span>`).join('')}</div></div>
        <div class="fs" style="margin-top:16px"><h4>Pasal lain</h4><div class="chipset">${MCS.ARTS.filter((a) => !rec.has(a.id)).map((a) => `<span class="chk ${c.arts.includes(a.id) ? 'on' : ''}" data-a="${a.id}" title="${E(a.desc)}">${MCS.artLabel(a.id)}</span>`).join('')}</div></div>
        <div class="fs" style="margin-top:16px"><h4>Rincian</h4><div id="art-detail"></div></div>
      </div>${foot('s-pasal')}</div>`;
    } else if (edTab === 'sidang') {
      h = `<div class="card"><header><h3>Persidangan</h3>${c.reg ? `<span class="aux mono">${c.reg}</span>` : ''}</header><div class="cb">
        ${c.majelis ? `<div class="form" style="margin-bottom:16px">${field('Hakim ketua', `<div class="ro">${c.majelis[0]}</div>`)}${field('Hakim anggota', `<div class="ro">${c.majelis[1]}; ${c.majelis[2]}</div>`)}${field('Oditur', `<div class="ro">${c.oditur}</div>`)}${field('Panitera pengganti', `<div class="ro">${c.panitera}</div>`)}</div>` : ''}
        ${c.sidang.length ? `<div class="tl">${c.sidang.map((s) => `<div class="e ${s.status === 'jadwal' ? 'next' : s.status === 'tunda' ? 'tunda' : ''}"><b>${s.agenda}</b> ${s.status === 'jadwal' ? '<span class="pill" style="height:18px;font-size:10.5px;color:var(--serious-txt)">Terjadwal</span>' : s.status === 'tunda' ? '<span class="pill warn" style="height:18px;font-size:10.5px">Ditunda</span>' : ''}<span>${MCS.fmtDate(s.t, true)} WIB · ${s.ruang}${s.ket ? ' · ' + s.ket : ''}</span></div>`).join('')}</div>` : '<div class="empty">Perkara belum dilimpahkan ke pengadilan.</div>'}
      </div>${!ro && c.st === 4 ? `<div class="form-foot"><button class="btn" id="s-j2">${I('cal')}Jadwalkan sidang</button>${MCS.nextSidang(c) ? `<button class="btn primary" id="s-h2">${I('gavel')}Catat hasil sidang</button>` : ''}</div>` : ''}</div>`;
    } else if (edTab === 'kerugian') {
      h = `<div class="card"><header><h3>${c.kn === 'negara' ? 'Kerugian keuangan negara' : 'Kerugian korban'}</h3></header><div class="cb"><div class="form">
        ${field('Nilai kerugian (Rp)', inp('k-nilai', c.kerugian, dis + ' type="number"'), { hint: c.auditKerugian ? (c.auditKerugian.st === 'sudah' ? 'Sudah diaudit · ' + E(c.auditKerugian.lembaga) + (c.auditKerugian.no ? ' · ' + E(c.auditKerugian.no) : '') : 'Belum diaudit — perkiraan awal') : (c.kn === 'negara' ? 'Berdasarkan hasil audit BPK/BPKP atau Itjen TNI' : 'Berdasarkan laporan korban') })}
        ${field('Telah dipulihkan (Rp)', inp('k-pulih', c.pulih, dis + ' type="number"'), { hint: 'Penyitaan, pengembalian sukarela, atau uang pengganti' })}
        ${field('Bentuk pemulihan', sel('k-bentuk', ['Pengembalian sukarela', 'Penyitaan aset', 'Uang pengganti (putusan)', 'Lelang barang rampasan', 'Setoran ke kas negara (PNBP)'], 'Pengembalian sukarela', dis))}
        ${field('Tanggal pencatatan', inp('k-tgl', toDateInput(MCS.NOW), dis + ' type="date"'))}
      </div><div style="margin-top:16px"><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--txt-3);margin-bottom:6px"><span>Progres pemulihan</span><b style="color:var(--txt)">${c.kerugian ? ((c.pulih / c.kerugian) * 100).toFixed(1) : 0}%</b></div>
        <div style="height:10px;background:rgba(var(--tint), .1);border-radius:5px;overflow:hidden"><i style="display:block;height:100%;width:${c.kerugian ? (c.pulih / c.kerugian) * 100 : 0}%;background:var(--s3)"></i></div></div></div>${foot('s-rugi')}</div>`;
    } else if (edTab === 'tahanan') {
      h = `<div class="card"><header><h3>Penahanan</h3></header><div class="cb">${c.tahanan ? `<div class="form">
        ${field('Status', `<div class="ro">Ditahan</div>`)}
        ${field('Tempat penahanan', inp('h-tmp', c.tahanan.tempat, dis))}
        ${field('Berlaku sampai', inp('h-sd', toDateInput(c.tahanan.sampai), dis + ' type="date"'), { hint: 'Perpanjangan oleh ' + c.tahanan.oleh })}
        ${field('Dasar perpanjangan', inp('h-dasar', '', dis + ' placeholder="Nomor surat keputusan perpanjangan"'))}
      </div>` : `<div class="empty">${c.absentia ? 'Terdakwa tidak diketahui keberadaannya (perkara desersi in absentia).' : 'Terdakwa tidak ditahan.'}</div>`}</div>${c.tahanan ? foot('s-tahan', 'Simpan perpanjangan') : ''}</div>`;
    } else if (edTab === 'dokumen') {
      const D = c.jenis === 'koneksitas'
        ? ['Surat perintah penyidikan koneksitas', 'Berita Acara Pemeriksaan (BAP)', 'Hasil penelitian berkas', 'Berita acara penelitian bersama', 'Surat dakwaan', 'Berita acara sidang', 'Surat tuntutan', 'Salinan putusan', 'Berita acara pelaksanaan putusan']
        : ['Pemberitahuan penyidikan dari Polisi Militer', 'Hasil penelitian berkas oleh Oditur', 'Pendapat hukum kepada Papera', 'Keputusan Penyerahan Perkara (Skeppera)', 'Surat dakwaan Oditur', 'Laporan perkembangan sidang', 'Surat tuntutan Oditur', 'Salinan putusan', 'Laporan pelaksanaan putusan'];
      const st = [0, 0, 1, 2, 3, 4, 5, 5, 7];
      const extra = MCS.LS.get('mcs3_docs_' + c.id, []);
      h = `<div class="card"><header><h3>Dokumen perkara</h3><span class="aux">PDF · maks. 20 MB · tersimpan terenkripsi</span></header><div class="cb">
        ${ro ? '<div class="smart" style="margin:0 0 12px"><div class="t">Mode baca</div>Berkas tambahan hanya dapat diunggah oleh Operator Kejari, Aspidmil, atau Admin Pusat.</div>' : `<div class="up-row"><div class="f"><label>Jenis berkas yang ditambahkan</label>${sel('dk-jenis', ADD_KINDS.map((k, i) => [i, k[0]]), defDocIdx(c))}</div><div class="drop" id="drop">${I('upload')}<div><b style="color:var(--txt)">Tarik berkas ke sini</b> atau klik untuk memilih</div><div style="font-size:12px;margin-top:2px" id="dk-hint">PDF · maks. 20 MB · dipindai otomatis</div></div><input type="file" id="dk-file" multiple hidden /></div>`}
        <table class="t" style="margin-top:12px"><tbody>${D.map((n, i) => `<tr><td>${I('file')}</td><td>${n}</td><td>${c.st > st[i] || (c.st === st[i] && st[i] < 5) ? `<span class="pill good">Tersedia</span>` : '<span class="pill">Belum ada</span>'}</td></tr>`).join('')}
        ${extra.map((d) => `<tr><td>${I('file')}</td><td>${E(d.n)}<span class="sub">${d.jenis ? E(d.jenis) + ' · ' : ''}${d.size ? fmtSize(d.size) + ' · ' : ''}diunggah ${MCS.fmtAgo(d.t)} oleh ${E(d.by)}</span></td><td><span class="pill info">Baru</span></td></tr>`).join('')}</tbody></table></div></div>`;
    } else if (edTab === 'riwayat') {
      const ev = MCS.getAudit().filter((a) => a.target === c.id);
      MCS.TAHAP.forEach((t, i) => { if (c.sd[i]) ev.push({ t: c.sd[i], user: MCS.tahapActor(i, c), action: 'Tahap ' + t.name, detail: '' }); });
      ev.sort((a, b) => b.t - a.t);
      h = `<div class="card"><header><h3>Riwayat perubahan</h3><span class="aux">tidak dapat diubah atau dihapus</span></header><div class="cb"><div class="tl">${ev.map((e) => `<div class="e"><b>${E(e.action)}</b>${e.detail ? ` <span style="display:inline;color:var(--txt-3)">— ${E(e.detail)}</span>` : ''}<span>${MCS.fmtDate(e.t, true)} · ${E(e.user)}</span></div>`).join('')}</div></div></div>`;
    }
    el.innerHTML = h;
    el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
    bindEditor(c);
  }

  function commit(c, action, detail, changes) {
    Object.assign(c, changes || {});
    c.updated = Date.now(); c.updatedBy = me.unit;
    MCS.saveCase(c);
    if (action) MCS.audit(me.name, action, c.id, detail);
  }
  function bindEditor(c) {
    const on = (id, fn) => { if ($(id)) $(id).onclick = fn; };
    if ($('f-prov')) $('f-prov').onchange = (e) => { $('f-kab').innerHTML = MCS.kabsOf(e.target.value).map((k) => `<option value="${k.id}">${k.name}</option>`).join(''); };
    on('s-ringkas', () => {
      const t = $('f-title').value.trim();
      if (!t) { $('f-title').closest('.f').classList.add('err'); UI.toast('Uraian perkara wajib diisi', false); return; }
      const kab = $('f-kab').value;
      commit(c, 'Ubah identitas perkara', 'Uraian/locus/satuan', { title: t, cat: $('f-cat').value, lp: $('f-lp').value, kab, p: +kab.split('.')[0], loc: $('f-loc').value || null, kesatuan: $('f-ksat').value, jenis: $('f-kon').value, koneksitas: $('f-kon').value === 'koneksitas', kejati: MCS.kejatiOfProv(+kab.split('.')[0]).id });
      UI.toast('Identitas perkara disimpan'); editor(c.id);
    });
    on('t-add', () => { c.terdakwa.push({ nama: '', pangkat: MCS.PANGKAT[c.matra][0][0], gol: 'T', nrp: '', umur: 25 }); edBody(c, false); });
    on('t-adds', () => { c.sipil.push({ nama: '', pekerjaan: '', umur: 30 }); edBody(c, false); });
    on('s-terdakwa', () => {
      c.terdakwa.forEach((t, i) => { t.pangkat = $('t-pk' + i).value; t.nama = $('t-nm' + i).value || t.nama; t.nrp = $('t-nrp' + i).value; t.umur = +$('t-um' + i).value; t.gol = (MCS.PANGKAT[c.matra].find((p) => p[0] === t.pangkat) || [0, 'T'])[1]; });
      c.sipil.forEach((t, i) => { t.nama = $('t-snm' + i).value || t.nama; t.pekerjaan = $('t-spk' + i).value; });
      commit(c, 'Ubah data tersangka', c.terdakwa.length + ' militer, ' + c.sipil.length + ' sipil'); UI.toast('Data tersangka disimpan');
    });
    if ($('art-detail')) {
      const sel2 = new Set(c.arts);
      const detail = () => { $('art-detail').innerHTML = [...sel2].map((id) => { const a = MCS.ART[id]; return `<div style="display:grid;grid-template-columns:170px 1fr 220px;gap:12px;padding:8px 0;border-bottom:1px solid var(--line);font-size:12.5px"><b style="font-weight:500">${MCS.artLabel(id)}</b><span style="color:var(--txt-2)">${a.desc}</span><span style="color:var(--txt-3)">${a.threat}${a.baru ? ' · KUHP 2023: ' + a.baru : ''}</span></div>`; }).join('') || '<div class="muted">Belum ada pasal dipilih.</div>'; };
      detail();
      page.querySelectorAll('.chk[data-a]').forEach((ch) => (ch.onclick = () => { if (readOnly()) return; const a = ch.dataset.a; sel2.has(a) ? sel2.delete(a) : sel2.add(a); ch.classList.toggle('on'); detail(); }));
      on('s-pasal', () => { if (!sel2.size) { UI.toast('Minimal satu pasal', false); return; } commit(c, 'Ubah pasal', [...sel2].map(MCS.artLabel).join(', '), { arts: [...sel2] }); UI.toast('Pasal disimpan'); });
    }
    on('s-j2', () => scheduleModal(c));
    on('s-h2', () => resultModal(c));
    on('s-rugi', () => {
      const n = +$('k-nilai').value, p = +$('k-pulih').value;
      if (p > n) { $('k-pulih').closest('.f').classList.add('err'); UI.toast('Nilai dipulihkan melebihi nilai kerugian', false); return; }
      commit(c, 'Catat pemulihan kerugian', MCS.fmtRp(p) + ' dari ' + MCS.fmtRp(n) + ' · ' + $('k-bentuk').value, { kerugian: n, pulih: p });
      UI.toast('Data kerugian disimpan'); edBody(c, false);
    });
    on('s-tahan', () => {
      const t = new Date($('h-sd').value).getTime();
      if (!$('h-dasar').value.trim()) { $('h-dasar').closest('.f').classList.add('err'); UI.toast('Isi nomor surat dasar perpanjangan', false); return; }
      commit(c, 'Perpanjang penahanan', 's.d. ' + MCS.fmtDate(t) + ' · ' + $('h-dasar').value, { tahanan: { ...c.tahanan, sampai: t } });
      UI.toast('Perpanjangan penahanan disimpan'); editor(c.id);
    });
    on('p-next', () => stageModal(c));
    const dkSync = () => { const k = ADD_KINDS[+$('dk-jenis').value]; $('dk-file').accept = FKIND[k[1]].accept; $('dk-hint').textContent = FKIND[k[1]].label + ' · dipindai otomatis'; };
    if ($('dk-jenis')) { dkSync(); $('dk-jenis').onchange = dkSync; }
    const dkAdd = (files) => {
      const k = ADD_KINDS[+$('dk-jenis').value]; const { ok, bad } = filterFiles(files, k[1]);
      if (bad.length) UI.toast(bad[0], false);
      if (!ok.length) return;
      const ex = MCS.LS.get('mcs3_docs_' + c.id, []);
      ok.forEach((f) => ex.unshift({ n: f.name, jenis: k[0], k: k[2], size: f.size, t: Date.now(), by: me.name }));
      MCS.LS.set('mcs3_docs_' + c.id, ex);
      MCS.audit(me.name, 'Unggah dokumen', c.id, k[0] + ' · ' + ok.map((f) => f.name).join(', '));
      UI.toast(ok.length + ' berkas diunggah dan dipindai'); edBody(c, false);
    };
    on('drop', () => $('dk-file').click());
    if ($('dk-file')) $('dk-file').onchange = (e) => dkAdd([...e.target.files]);
    if ($('drop')) {
      $('drop').ondragover = (e) => { e.preventDefault(); $('drop').classList.add('over'); };
      $('drop').ondragleave = () => $('drop').classList.remove('over');
      $('drop').ondrop = (e) => { e.preventDefault(); $('drop').classList.remove('over'); dkAdd([...e.dataTransfer.files]); };
    }
  }

  // ---------- Modal ----------
  function modal(title, sub, body, onOk, okLabel = 'Simpan') {
    $('mbox').innerHTML = `<header><div><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div><button class="x" data-close>×</button></header><div class="mb">${body}</div>
      <div class="form-foot"><span class="note" id="m-note"></span><button class="btn ghost" data-close>Batal</button><button class="btn primary" id="m-ok">${okLabel}</button></div>`;
    $('m-ok').onclick = () => { if (onOk() !== false) UI.close('modal'); };
    UI.open('modal');
    const f = $('mbox').querySelector('input,select'); if (f) setTimeout(() => f.focus(), 80);
  }
  function stageModal(c) {
    const to = c.st + 1;
    const sp = PROSES.spec(c, to);
    const yesV = (x) => x === 'Ya' || x === true;
    const exDocs = () => MCS.LS.get('mcs3_docs_' + c.id, []);
    const pend = {};
    const fid = (f) => f.id || 'm-' + f.k.replace(/\./g, '_');
    const cur = (f) => { const x = (c.td || {})[f.k]; return x != null ? x : typeof f.def === 'function' ? f.def() : f.def; };
    const fieldHtml = (f) => {
      if (f.sec) return `<div class="f full"><h4 class="msec">${E(f.sec)}</h4></div>`;
      if (f.type === 'ro') return field(f.label, `<div class="ro">${E(f.value)}</div>`, { full: true });
      const id = fid(f), val = cur(f) == null ? '' : cur(f);
      if (f.type === 'check') return `<div class="f full" data-fk="${f.k}"><label class="cbx"><input type="checkbox" id="${id}" ${yesV(val) ? 'checked' : ''} /><span>${E(f.label)}</span></label></div>`;
      let ctl;
      if (f.type === 'select') ctl = sel(id, f.opts, val);
      else if (f.type === 'date') ctl = inp(id, val, 'type="date"');
      else if (f.type === 'num') ctl = inp(id, val, 'type="number" min="0"' + (f.ph ? ` placeholder="${E(f.ph)}"` : ''));
      else ctl = inp(id, val, f.ph ? `placeholder="${E(f.ph)}"` : '');
      return field(f.label, ctl, { req: f.req, full: f.full, hint: f.hint }).replace('<div class="f ', `<div data-fk="${f.k}" class="f `);
    };
    const hasDoc = (id) => exDocs().some((d) => d.k === id) || (pend[id] || []).length > 0;
    const box = (k) => $('mbox').querySelector(`[data-fk="${CSS.escape(k)}"]`);
    const readVals = () => {
      const raw = {};
      sp.fields.forEach((f) => { if (f.sec || f.type === 'ro') return; const el = $(fid(f)); if (el) raw[f.k] = f.type === 'check' ? (el.checked ? 'Ya' : '') : el.value; });
      sp.fields.forEach((f) => { if (f.showWhen && box(f.k)) box(f.k).style.display = f.showWhen(raw) ? '' : 'none'; });
      const vals = {};
      Object.keys(raw).forEach((k) => { const b = box(k); if (!b || b.style.display !== 'none') vals[k] = raw[k]; });
      return vals;
    };
    const nextName = MCS.TAHAP[to].name;
    const refresh = () => {
      const vals = readVals();
      const res = PROSES.evalChecks(c, sp, vals, hasDoc);
      const loop = !!(sp.loopWhen && sp.loopWhen(vals));
      $('m-gate').innerHTML = `<h4>${loop ? 'Hasil ini hanya dicatat' : 'Syarat untuk lanjut ke ' + E(nextName)}</h4>${loop ? `<div class="gi warn"><i>!</i><span>${E(sp.loopLabel)}<small>Perkara tidak pindah ke ${E(nextName)} sampai syaratnya terpenuhi.</small></span></div>` : ''}${res.map((x) => `<div class="gi ${x.ok ? 'ok' : x.req ? 'no' : 'warn'}"><i>${x.ok ? '✓' : x.req ? '✕' : '!'}</i><span>${E(x.label)}${x.basis ? `<small>${E(x.basis)}</small>` : ''}${!x.req && !x.ok ? '<small>Disarankan, tidak menghalangi</small>' : ''}</span></div>`).join('')}`;
      const blocked = !loop && res.some((x) => x.req && !x.ok);
      $('m-ok').disabled = blocked;
      $('m-ok').textContent = loop ? 'Catat hasil' : needsApproval() ? 'Ajukan verifikasi' : 'Lanjut ke ' + nextName;
      return { vals, res, loop };
    };
    const paintDocs = () => {
      const m = $('m-docs'); if (!m) return;
      m.innerHTML = sp.docs.map((id) => {
        const kind = PROSES.DOCT.find((d) => d[0] === id)[2];
        const have = exDocs().filter((d) => d.k === id), pd = pend[id] || [];
        return `<div class="slot ${have.length || pd.length ? 'has' : ''}"><div class="slot-h"><div><b>${E(PROSES.DOCL[id])}</b><span>${FKIND[kind].label}</span></div><button class="btn" type="button" data-mp="${id}">${I('upload')}${have.length || pd.length ? 'Tambah' : 'Pilih berkas'}</button><input type="file" id="m-f-${id}" data-id="${id}" data-kind="${kind}" accept="${FKIND[kind].accept}" multiple hidden /></div>${have.length || pd.length ? `<ul>${have.map((d) => `<li>${I('file')}<span>${E(d.n)}<small>tersimpan</small></span></li>`).join('')}${pd.map((f, i) => `<li>${I('file')}<span>${E(f.name)}<small>${fmtSize(f.size)} · baru</small></span><button class="btn ghost" type="button" data-mr="${id}:${i}" aria-label="Hapus berkas">${I('x')}</button></li>`).join('')}</ul>` : ''}</div>`;
      }).join('');
      m.querySelectorAll('[data-mp]').forEach((b) => (b.onclick = () => $('m-f-' + b.dataset.mp).click()));
      m.querySelectorAll('input[type=file]').forEach((x) => (x.onchange = () => {
        const { ok, bad } = filterFiles([...x.files], x.dataset.kind);
        if (bad.length) UI.toast(bad[0], false);
        pend[x.dataset.id] = (pend[x.dataset.id] || []).concat(ok.map((f) => ({ name: f.name, size: f.size })));
        paintDocs(); refresh();
      }));
      m.querySelectorAll('[data-mr]').forEach((b) => (b.onclick = () => { const [id, i] = b.dataset.mr.split(':'); pend[id].splice(+i, 1); paintDocs(); refresh(); }));
    };
    const body = `${sp.basis.length ? `<details class="basis"><summary>Dasar hukum (${sp.basis.length}) <small>klik untuk membuka</small></summary><ul>${sp.basis.map((b) => `<li>${E(b.t)}${b.v ? ' <em>· perlu validasi tim hukum</em>' : ''}</li>`).join('')}</ul></details>` : ''}
      ${sp.info ? `<div class="smart" style="margin:0 0 12px">${E(sp.info)}</div>` : ''}
      <div class="form">${field(sp.dateLabel, inp('m-tgl', toDateInput(MCS.NOW), 'type="date"'), { req: true })}${sp.fields.map(fieldHtml).join('')}</div>
      ${sp.docs.length ? '<div class="fs" style="margin-top:14px"><h4>Berkas untuk tahap ini</h4><div id="m-docs"></div></div>' : ''}
      <div class="gate" id="m-gate"></div>
      ${needsApproval() ? '<div class="smart"><div class="t">' + I('shield') + 'Perlu verifikasi</div>Pembaruan akan dikirim ke Aspidmil ' + MCS.KJ[c.kejati].short.replace('Kejati ', '') + ' untuk diverifikasi sebelum terbit di dashboard Jampidmil.</div>' : ''}`;
    modal(sp.title, 'Tahap ' + MCS.TAHAP[c.st].name + ' → ' + nextName + ' · ' + MCS.tahapLong(to, c), body, () => {
      const { vals, res, loop } = refresh();
      let ok = true;
      $('mbox').querySelectorAll('.f label i').forEach((r) => { const f = r.closest('.f'); if (f.style.display === 'none') return; const v = f.querySelector('input,select'); if (v && !String(v.value).trim()) { f.classList.add('err'); ok = false; } else f.classList.remove('err'); });
      if (!ok) { $('m-note').textContent = 'Lengkapi isian wajib.'; return false; }
      if (!loop && res.some((x) => x.req && !x.ok)) { $('m-note').textContent = 'Syarat untuk lanjut belum terpenuhi.'; return false; }
      if (loop && sp.loopKind === 'close' && needsApproval()) { $('m-note').textContent = 'Penutupan perkara hanya dapat dicatat oleh Aspidmil atau Admin Pusat.'; return false; }
      const t = new Date($('m-tgl').value).getTime() || Date.now();
      const ex = exDocs(); let nDocs = 0;
      Object.keys(pend).forEach((id) => pend[id].forEach((f) => { ex.unshift({ n: f.name, jenis: PROSES.DOCL[id], k: id, size: f.size, t: Date.now(), by: me.name }); nDocs++; }));
      if (nDocs) MCS.LS.set('mcs3_docs_' + c.id, ex);
      if (loop) { recordLoop(c, sp, vals, t); return; }
      const val = (id) => ($(id) ? $(id).value : '');
      const brief = to === 2 ? vals['1.hasil'] : to === 3 ? vals['2.titik'] || vals['2.keputusan'] : val('m-a');
      const detail = MCS.TAHAP[c.st].name + ' → ' + nextName + (brief ? ' · ' + brief : '') + (nDocs ? ' · ' + nDocs + ' berkas' : '');
      const form = { a: val('m-a'), b: val('m-b'), c: val('m-c'), vals };
      if (needsApproval()) {
        const ap = MCS.getApprovals();
        ap.unshift({ id: 'APR-' + (2000 + ap.length), caseId: c.id, by: me.name + ' (' + me.unit + ')', t: Date.now(), field: 'Tahap', from: MCS.TAHAP[c.st].name, to: nextName, note: detail, status: 'menunggu', apply: { st: to, t, form } });
        MCS.saveApprovals(ap); MCS.audit(me.name, 'Ajukan perubahan tahap', c.id, detail);
        UI.toast('Diajukan untuk verifikasi Aspidmil'); editor(c.id); renderNav('perkara');
        return;
      }
      applyStage(c, to, t, form);
      MCS.audit(me.name, 'Perbarui tahap', c.id, detail);
      UI.toast(`Tahap diperbarui: ${nextName}`); editor(c.id);
    }, 'Lanjut');
    $('mbox').querySelectorAll('input,select').forEach((el) => { el.addEventListener('input', refresh); el.addEventListener('change', refresh); });
    paintDocs(); refresh();
  }
  /** Hasil yang dicatat tanpa pindah tahap: berkas dikembalikan, perbedaan pendapat, atau perkara ditutup. */
  function recordLoop(c, sp, vals, t) {
    c.td = Object.assign(c.td || {}, vals);
    c.rounds = c.rounds || [];
    if (sp.loopKind === 'return') {
      c.rounds.push({ t, st: 1, txt: vals['1.hasil'], cat: vals['1.catatan'] || '' });
      MCS.audit(me.name, 'Catat hasil penelitian berkas', c.id, vals['1.hasil'] + (vals['1.catatan'] ? ' · ' + vals['1.catatan'] : ''));
      UI.toast('Hasil penelitian dicatat. Perkara tetap di Penelitian Berkas');
    } else if (sp.loopKind === 'report') {
      c.rounds.push({ t, st: 2, txt: 'Perbedaan pendapat Jaksa dan Oditur dilaporkan ke Jaksa Agung dan Oditur Jenderal', cat: '' });
      MCS.audit(me.name, 'Catat perbedaan pendapat penelitian bersama', c.id, 'Dilaporkan ke Jaksa Agung dan Oditur Jenderal');
      UI.toast('Perbedaan pendapat dicatat. Menunggu keputusan Jaksa Agung dan Oditur Jenderal');
    } else if (sp.loopKind === 'close') {
      c.closed = { jenis: vals['2.keputusan'], nomor: vals['2.skep'] || '', t };
      MCS.audit(me.name, 'Perkara tidak dilanjutkan ke pengadilan', c.id, vals['2.keputusan']);
      UI.toast('Keputusan dicatat. Perkara tidak dilanjutkan ke pengadilan');
    }
    commit(c, null, null); editor(c.id); renderNav('perkara');
  }

  /** Tab "Proses & syarat": isi dan syarat tiap tahap sesuai jenis perkara. */
  function procPanel(c) {
    const lab = PROSES.labelsFor(c);
    const docs = MCS.LS.get('mcs3_docs_' + c.id, []);
    const hasDoc = (id) => docs.some((d) => d.k === id);
    const K = c.jenis === 'koneksitas';
    const banner = c.closed ? `<div class="smart" style="margin:0 0 14px;border-color:color-mix(in srgb, var(--crit-txt) 40%, transparent)"><div class="t">${I('x')}Perkara tidak dilanjutkan ke pengadilan</div>${E(c.closed.jenis)}${c.closed.nomor ? ' · ' + E(c.closed.nomor) : ''} · ${MCS.fmtDate(c.closed.t)}</div>` : '';
    const card = (i) => {
      const t = MCS.TAHAP[i], state = i < c.st ? 'done' : i === c.st ? 'cur' : 'todo';
      const sp = i < 7 ? PROSES.spec(c, i + 1) : null;
      const facts = Object.keys(c.td || {}).filter((k) => lab[k] && lab[k].stage === i && c.td[k] !== '').map((k) => [lab[k].label, lab[k].type === 'check' ? 'Ya' : c.td[k]]);
      const dl = docs.filter((d) => { const x = PROSES.DOCT.find((y) => y[0] === d.k); return x && x[3] === i; });
      const rounds = (c.rounds || []).filter((r) => r.st === i);
      let h = `<div class="pcard ${state}"><div class="pc-h"><span class="pc-n">${i + 1}</span><div><b>${t.name}</b><span>${E(MCS.tahapActor(i, c))}</span></div><span class="pill ${state === 'done' ? 'good' : state === 'cur' ? 'info' : ''}">${state === 'done' ? 'Selesai · ' + (c.sd[i] ? MCS.fmtDate(c.sd[i]) : '') : state === 'cur' ? 'Sedang berjalan' : 'Belum'}</span></div>`;
      if (sp && sp.basis.length) h += `<details class="basis" ${state === 'cur' ? 'open' : ''}><summary>Dasar hukum${K ? ' · koneksitas' : ' · perkara Oditurat'} <small>(${sp.basis.length})</small></summary><ul>${sp.basis.map((b) => `<li>${E(b.t)}${b.v ? ' <em>· perlu validasi tim hukum</em>' : ''}</li>`).join('')}</ul></details>`;
      if (facts.length) h += `<div class="sum">${facts.map(([k, v]) => `<div class="row"><span>${E(k)}</span><b>${E(v)}</b></div>`).join('')}</div>`;
      if (rounds.length) h += `<div class="rounds"><h4>Catatan proses</h4>${rounds.map((r) => `<div>${MCS.fmtDate(r.t)} · ${E(r.txt)}${r.cat ? ' — ' + E(r.cat) : ''}</div>`).join('')}</div>`;
      if (dl.length) h += `<div class="fs" style="margin-top:10px"><h4>Berkas tahap ini</h4><ul class="dlist">${dl.map((d) => `<li>${I('file')}<span>${E(d.n)}<small>${E(d.jenis || '')}${d.size ? ' · ' + fmtSize(d.size) : ''}</small></span></li>`).join('')}</ul></div>`;
      if (state === 'cur' && sp && !c.closed) {
        const res = PROSES.evalChecks(c, sp, {}, hasDoc);
        const need = sp.fields.filter((f) => f.req && f.type !== 'ro' && !f.sec).map((f) => f.label);
        h += `<div class="gate"><h4>Untuk lanjut ke ${MCS.TAHAP[i + 1].name}</h4>${need.length ? `<div class="need">Yang perlu diinput: ${need.map(E).join(' · ')}</div>` : ''}${res.map((x) => `<div class="gi ${x.ok ? 'ok' : x.req ? 'no' : 'warn'}"><i>${x.ok ? '✓' : x.req ? '✕' : '!'}</i><span>${E(x.label)}${x.basis ? `<small>${E(x.basis)}</small>` : ''}</span></div>`).join('')}${canMoveTo(c.st + 1) ? '<div style="margin-top:10px"><button class="btn primary" id="p-next">' + I('arrow') + 'Isi & lanjut ke ' + MCS.TAHAP[i + 1].name + '</button></div>' : ''}</div>`;
      }
      return h + '</div>';
    };
    return banner + `<div class="pgrid">${MCS.TAHAP.map((t, i) => card(i)).join('')}</div>`;
  }
  /** form: nilai isian modal {a, b, c} — dipakai langsung atau saat Aspidmil menyetujui */
  function applyStage(c, to, t, form = {}) {
    c.sd = c.sd.slice(0, to); c.sd[to] = t; c.st = to;
    const kj = MCS.KJ[c.kejati];
    const vals = form.vals || {};
    if (Object.keys(vals).length) c.td = Object.assign(c.td || {}, vals);
    if (to === 3 && c.jenis === 'koneksitas' && vals['2.titik']) {
      c.forum = vals['2.titik'] === PROSES.UMUM ? 'umum' : 'militer';
      c.pn = c.forum === 'umum' ? (c.cat === 'KOR' ? 'Pengadilan Tipikor pada PN ' + kj.city : 'Pengadilan Negeri ' + MCS.KAB[c.kab].short.replace(/^Kota /, '')) : null;
    }
    if (to === 4) {
      c.reg = form.a || c.reg;
      c.majelis = c.majelis || ['(ditetapkan ketua pengadilan)', '—', '—'];
      c.panitera = c.panitera || 'Kepaniteraan ' + MCS.forumShort(c);
      const first = form.b ? new Date(form.b + 'T' + (form.c || '09.00').replace('.', ':')).getTime() : t + 7 * MCS.DAY;
      c.sidang = [{ t: first, agenda: 'Pembacaan surat dakwaan', status: 'jadwal', ruang: 'Ruang Sidang Utama' }];
    }
    if (to === 5) {
      const bln = +form.a || 0;
      c.putusan = { t, amar: bln ? 'Pidana penjara ' + MCS.fmtBulan(bln) : 'Bebas', pidana: bln, tambahan: form.b === 'Dipecat dari dinas militer' ? form.b : null, uangPengganti: form.b === 'Uang pengganti' ? c.kerugian - c.pulih : 0, tuntutan: vals['4.tuntutan'] ? MCS.fmtBulan(+vals['4.tuntutan']) : '—' };
      c.sidang.forEach((s) => { if (s.status === 'jadwal') s.status = 'selesai'; });
    }
    if (to === 6) c.upaya = { jenis: form.a || 'Banding', oleh: form.b || 'Terdakwa', t };
    if (to === 7) { c.eksekusi = form.a || 'Menunggu eksekusi'; c.tahanan = null; }
    commit(c, null, null);
  }
  function scheduleModal(c) {
    modal('Jadwalkan sidang', `${c.reg} · ${MCS.terdakwaLabel(c.terdakwa[0])}`, `<div class="form">
      ${field('Tanggal', inp('m-tgl', toDateInput(MCS.TODAY + 7 * MCS.DAY), 'type="date"'), { req: true })}
      ${field('Jam', sel('m-jam', ['09.00', '09.30', '10.00', '10.30', '13.00', '14.00'], '09.00'))}
      ${field('Agenda', sel('m-ag', MCS.AGENDA, 'Pemeriksaan saksi'), { full: true })}
      ${field('Ruang sidang', sel('m-ru', ['Ruang Sidang Utama', 'Ruang Sidang I', 'Ruang Sidang II'], 'Ruang Sidang Utama'))}
      ${field('Pemberitahuan', sel('m-nt', ['Kirim ke penuntut, terdakwa & penasihat hukum', 'Tanpa pemberitahuan'], 'Kirim ke penuntut, terdakwa & penasihat hukum'))}
    </div>`, () => {
      const t = new Date($('m-tgl').value + 'T' + $('m-jam').value.replace('.', ':')).getTime();
      if (!t || t < MCS.TODAY) { $('m-tgl').closest('.f').classList.add('err'); $('m-note').textContent = 'Tanggal tidak valid.'; return false; }
      c.sidang = c.sidang.filter((s) => s.status !== 'jadwal');
      c.sidang.push({ t, agenda: $('m-ag').value, status: 'jadwal', ruang: $('m-ru').value });
      commit(c, 'Jadwalkan sidang', MCS.fmtDate(t, true) + ' · ' + $('m-ag').value);
      UI.toast('Sidang dijadwalkan · notifikasi terkirim'); editor(c.id);
    });
  }
  function resultModal(c) {
    const ns = MCS.nextSidang(c);
    modal('Catat hasil sidang', `${ns.agenda} · ${MCS.fmtDate(ns.t, true)}`, `<div class="form">
      ${field('Hasil', sel('m-st', [['selesai', 'Terlaksana'], ['tunda', 'Ditunda']], 'selesai'), { req: true })}
      ${field('Alasan penundaan', sel('m-ket', [''].concat(MCS.TUNDA), ''))}
      ${field('Catatan berita acara', '<textarea id="m-cat" placeholder="Ringkasan jalannya sidang"></textarea>', { full: true })}
      ${field('Sidang berikutnya', inp('m-next', toDateInput(Math.max(ns.t, MCS.TODAY) + 7 * MCS.DAY), 'type="date"'))}
      ${field('Agenda berikutnya', sel('m-nag', MCS.AGENDA, MCS.AGENDA[Math.min(MCS.AGENDA.length - 1, MCS.AGENDA.indexOf(ns.agenda) + 1)] || 'Pemeriksaan saksi'))}
    </div>`, () => {
      const stt = $('m-st').value;
      if (stt === 'tunda' && !$('m-ket').value) { $('m-ket').closest('.f').classList.add('err'); $('m-note').textContent = 'Pilih alasan penundaan.'; return false; }
      ns.status = stt; if (stt === 'tunda') ns.ket = $('m-ket').value;
      const nt = new Date($('m-next').value + 'T09:00').getTime();
      if (nt) c.sidang.push({ t: nt, agenda: stt === 'tunda' ? ns.agenda : $('m-nag').value, status: 'jadwal', ruang: ns.ruang });
      commit(c, 'Catat hasil sidang', ns.agenda + ' · ' + (stt === 'tunda' ? 'ditunda: ' + ns.ket : 'terlaksana'));
      UI.toast('Hasil sidang dicatat'); editor(c.id);
    });
  }

  // ================= Wizard perkara baru =================
  let wz = null;
  const WSTEPS = [['Perkara, pasal & lokasi', 'Kejadian, pasal sangkaan, locus delicti'], ['Tersangka', 'Militer & sipil'], ['Kerugian & catatan', 'Bila ada'], ['Berkas & barang bukti', 'Unggah dokumen, foto, video'], ['Tinjau & kirim', 'Periksa kembali']];
  function wizard() {
    crumb(['Perkara', '#perkara'], ['Input perkara baru']);
    if (!can('Input perkara baru')) { page.innerHTML = '<div class="empty">Peran Anda tidak dapat menginput perkara baru.</div>'; return; }
    if (!wz) {
      const defKab = regional() ? MCS.kabsOf(MCS.KJ[me.kejati].p)[0].id : scoped[0] ? scoped[scoped.length - 1].kab : MCS.KABS[0].id;
      wz = { step: 0, d: { jenis: 'oditurat', lp: 'LP-' + (10 + Math.floor(Math.random() * 150)) + '/A-' + (1 + Math.floor(Math.random() * 40)) + '/' + MCS.ROMAN[new Date().getMonth()] + '/' + new Date().getFullYear() + '/Idik', tgl: toDateInput(MCS.NOW), tglk: toDateInput(MCS.NOW - 2 * MCS.DAY), sumber: 'Pemberitahuan penyidikan dari Polisi Militer', p: '', kab: '', loc: '', title: '', matra: 'AD', terdakwa: [{ pangkat: 'Serda', nama: '', nrp: '', jabatan: '', kesatuan: '', ditahan: '0' }], sipil: [], cat: '', arts: [], kerugian: '', catatan: '', files: {}, audit: { st: '', lembaga: 'BPK RI', no: '', tgl: '' } } };
    }
    renderWizard();
  }
  function courtFor(d) {
    const pm = d.terdakwa.some((t) => (MCS.PANGKAT[d.matra].find((p) => p[0] === t.pangkat) || [])[1] === 'PM');
    const base = MCS.courtOfKab(d.kab);
    return pm ? MCS.COURT[base.tinggi] : base;
  }
  function renderWizard() {
    const d = wz.d, s = wz.step;
    const court = d.kab ? courtFor(d) : { name: '—', level: '', code: '', id: null };
    let body = '';
    const K = d.jenis === 'koneksitas';
    const kjW = d.p ? MCS.kejatiOfProv(d.p) : { name: 'Kejaksaan Tinggi (sesuai wilayah yang dipilih)', short: 'Kejati (pilih wilayah dulu)' };
    // pasal & klasifikasi sekarang berada di langkah 1 bersama kejadian dan lokasi
    const pasalHtml = () => {
      if (!d.cat) return '<div class="hint" style="color:var(--txt-4)">Pilih klasifikasi untuk melihat pasal yang lazim digunakan.</div>';
      const rec = new Set(MCS.CAT[d.cat].arts.flatMap((a) => a[0]));
      const chip = (a) => `<span class="chk ${d.arts.includes(a.id) ? 'on' : ''}" data-a="${a.id}" title="${E(a.desc)}">${MCS.artLabel(a.id)}</span>`;
      const others = MCS.ARTS.filter((a) => !rec.has(a.id));
      const sel1 = d.arts.map((id) => MCS.ART[id]).filter(Boolean);
      return `<div class="fs" style="margin-top:0"><h4>Pasal yang disangkakan <span style="font-weight:400;color:var(--txt-4)">· pilih satu atau lebih</span></h4><div class="chipset">${MCS.ARTS.filter((a) => rec.has(a.id)).map(chip).join('')}</div></div>
        <details class="more-arts" ${others.some((a) => d.arts.includes(a.id)) ? 'open' : ''}><summary>Pasal lain (junto)</summary><div class="chipset" style="margin-top:8px">${others.map(chip).join('')}</div></details>
        ${sel1.length ? `<ul class="sel-arts">${sel1.map((a) => `<li><b>${E(a.pasal)} ${E(MCS.LAW[a.law].name)}</b><span>${E(a.desc)}</span><em>${E(a.threat)}</em></li>`).join('')}</ul>` : ''}`;
    };
    if (s === 0) body = `<div class="demo-bar"><label for="w-ex">${I('plus')}Isi dengan contoh perkara</label><select class="select" id="w-ex"><option value="">Pilih contoh…</option>${SARAN.EXAMPLES.map((e) => `<option value="${e.id}">${E(SARAN.exDate(e).getFullYear() + ' · ' + SARAN.exLabel(e))}</option>`).join('')}</select></div>${field('Jenis perkara', `<div class="chipset">${MCS.JENIS.map((j) => `<span class="chk ${d.jenis === j.id ? 'on' : ''}" data-j="${j.id}" title="${j.long}">${j.name}</span>`).join('')}</div>`, { hint: K ? 'Pelaku militer bersama sipil — penyidikan & penuntutan ditangani tim koneksitas' : 'Perkara yang dituntut Oditurat — Kejati melakukan koordinasi teknis & pemantauan' })}
      <div style="height:14px"></div><div class="form">
      ${field('Ceritakan singkat kejadiannya', '<textarea id="w-title" placeholder="Contoh: anggota memakai sabu, hasil tes urine positif">' + E(d.title) + '</textarea><div id="w-sg"></div>', { full: true, req: true })}
      ${field('Klasifikasi tindak pidana', sel('w-cat', [['', 'Pilih klasifikasi…']].concat(MCS.CATS.map((c) => [c.id, c.name])), d.cat), { req: true, full: true })}
      <div class="f full" id="w-pasal">${pasalHtml()}</div>
      ${field(K ? 'Nomor surat perintah penyidikan koneksitas' : 'Nomor laporan Polisi Militer', inp('w-lp', d.lp), { req: true })}
      ${field('Sumber perkara', sel('w-sumber', K ? ['Surat perintah penyidikan koneksitas', 'Pelimpahan dari Jampidmil', 'Laporan masyarakat', 'Temuan audit BPK/BPKP'] : ['Pemberitahuan penyidikan dari Polisi Militer', 'Koordinasi dengan Oditurat', 'Laporan masyarakat', 'Temuan Itjen / audit'], d.sumber))}
      ${field('Tanggal diterima', inp('w-tgl', d.tgl, 'type="date"'), { req: true })}
      ${field('Tanggal kejadian (tempus delicti)', inp('w-tglk', d.tglk, 'type="date"'), { req: true, hint: new Date(d.tglk).getTime() < new Date('2026-01-02').getTime() ? 'Sebelum 2 Jan 2026 — berlaku KUHP lama' : 'Sejak 2 Jan 2026 — berlaku KUHP 2023 (UU 1/2023)' })}
      ${field('Provinsi', sel('w-prov', [['', 'Pilih provinsi…']].concat((regional() ? MCS.KJ[me.kejati].prov : MCS.provIds).map((p) => [p, MCS.PROV[p]])), d.p), { req: true, hint: regional() ? 'Sesuai wilayah ' + me.unit : '' })}
      ${field('Kabupaten/kota', sel('w-kab', [['', d.p ? 'Pilih kabupaten/kota…' : 'Pilih provinsi dulu']].concat(d.p ? MCS.kabsOf(d.p).map((k) => [k.id, k.name]) : []), d.kab), { req: true })}
      ${field('Lokasi detail', inp('w-loc', d.loc, 'placeholder="Kecamatan, desa, alamat"'), { full: true })}
    </div>`;
    else if (s === 1) body = `${field('Matra tersangka militer', `<div class="chipset">${MCS.MATRA.map((m) => `<span class="chk ${d.matra === m.id ? 'on' : ''}" data-m="${m.id}">${m.name}</span>`).join('')}</div>`)}
      <div style="height:14px"></div>${d.terdakwa.map((t, i) => `<div class="tcard"><header>Tersangka militer ${i + 1}${i ? `<button class="btn ghost" data-rm="${i}">${I('trash')}</button>` : ''}</header><div class="form">
        ${field('Pangkat', sel('w-pk' + i, MCS.PANGKAT[d.matra].map((p) => [p[0], p[0] + ' — ' + MCS.GOL[p[1]]]), t.pangkat), { req: true })}
        ${field('Nama lengkap', inp('w-nm' + i, t.nama), { req: true })}
        ${field('NRP', inp('w-nrp' + i, t.nrp, 'inputmode="numeric"'), { req: true })}
        ${field('Jabatan', inp('w-jb' + i, t.jabatan))}
        ${field('Satuan', inp('w-ks' + i, t.kesatuan, 'placeholder="' + (d.matra === 'AD' ? 'Kodim / Yonif / Korem' : d.matra === 'AL' ? 'Lantamal / Lanal / KRI' : 'Lanud / Satrad') + '"'), { req: true })}
        ${field('Penahanan', sel('w-th' + i, [['0', 'Tidak ditahan'], ['1', 'Ditahan']], t.ditahan))}
      </div></div>`).join('')}
      ${K ? d.sipil.map((t, i) => `<div class="tcard"><header>Tersangka sipil ${i + 1}<button class="btn ghost" data-rms="${i}">${I('trash')}</button></header><div class="form">
        ${field('Nama lengkap', inp('w-snm' + i, t.nama), { req: true })}
        ${field('NIK', inp('w-snik' + i, t.nik, 'inputmode="numeric"'), { req: true })}
        ${field('Pekerjaan', inp('w-spk' + i, t.pekerjaan, 'placeholder="Mis. direktur PT rekanan"'), { full: true })}
      </div></div>`).join('') : ''}
      <button class="btn" id="w-addt">${I('plus')}Tambah tersangka militer</button>${K ? ` <button class="btn" id="w-adds">${I('plus')}Tambah tersangka sipil</button>` : ''}`;
    else if (s === 2) {
      const au = d.audit, korban = d.cat && MCS.CAT[d.cat].kn === 'korban';
      body = `<div class="form">
      ${field(korban ? 'Kerugian korban' : 'Kerugian keuangan negara', `<div class="money"><span>Rp</span><input class="input" id="w-rugi" inputmode="numeric" autocomplete="off" placeholder="0" value="${fmtNum(d.kerugian)}" /></div><div class="terbilang" id="w-rugi-t">${terbilang(+d.kerugian)}</div>`, { full: true, hint: d.cat && MCS.CAT[d.cat].kn ? 'Wajib untuk klasifikasi ' + MCS.CAT[d.cat].name + '.' : 'Kosongkan bila tidak ada kerugian.' })}
      <div class="f full"><div class="audit"><h4>Apakah nilai kerugian ini sudah diaudit oleh pihak berwenang?</h4>
        <div class="chipset"><span class="chk ${au.st === 'sudah' ? 'on' : ''}" data-au="sudah">Sudah diaudit</span><span class="chk ${au.st === 'belum' ? 'on' : ''}" data-au="belum">Belum diaudit</span></div>
        ${au.st === 'sudah' ? `<div class="form" style="margin-top:12px">
          ${field('Lembaga yang mengaudit', sel('w-au-l', AUDITORS, au.lembaga))}
          ${field('Nomor laporan hasil audit', inp('w-au-n', au.no, 'placeholder="Contoh: LHA-12/2026"'))}
          ${field('Tanggal laporan', inp('w-au-t', au.tgl, 'type="date"'))}
          <div class="f"><div class="hint" style="margin-top:24px">Unggah laporan hasil auditnya di langkah <b>Berkas &amp; barang bukti</b>.</div></div></div>` : au.st === 'belum' ? '<div class="sg-note" style="margin:10px 0 0">Nilai ini dicatat sebagai <b>perkiraan awal</b>. Perbarui setelah hasil audit tersedia.</div>' : ''}
      </div></div>
      ${field('Catatan tambahan (opsional)', '<textarea id="w-cat-n" placeholder="Hal penting yang perlu diketahui tim, misalnya saksi kunci, hasil koordinasi dengan Oditurat, atau perkembangan terakhir.">' + E(d.catatan) + '</textarea>', { full: true, hint: 'Tidak perlu mengulang isi berkas yang diunggah.' })}
    </div>`;
    }
    else if (s === 3) {
      const sl = slotsOf(K, d.terdakwa.some((t) => t.ditahan === '1'), d.audit.st === 'sudah');
      const total = Object.values(d.files).reduce((n, a) => n + a.length, 0);
      body = `<div class="smart" style="margin:0 0 14px"><div class="t">${I('upload')}Unggah sekarang atau nanti</div>Berkas tambahan bisa ditambahkan nanti di tab <b>Dokumen</b>.</div>
        <div class="slots">${sl.map(([id, name, kind, tag]) => { const fl = d.files[id] || []; return `<div class="slot ${fl.length ? 'has' : ''}"><div class="slot-h"><div><b>${name}</b>${tag ? `<em>${tag}</em>` : ''}<span>${FKIND[kind].label}</span></div><button class="btn" type="button" data-pick="${id}">${I('upload')}${fl.length ? 'Tambah' : 'Pilih berkas'}</button><input type="file" id="w-file-${id}" data-fs="${id}" data-kind="${kind}" accept="${FKIND[kind].accept}" multiple hidden /></div>${fl.length ? `<ul>${fl.map((f, i) => `<li>${I('file')}<span>${E(f.n)}<small>${fmtSize(f.size)}</small></span><button type="button" class="btn ghost" data-rf="${id}:${i}" aria-label="Hapus berkas">${I('x')}</button></li>`).join('')}</ul>` : ''}</div>`; }).join('')}</div>
        <div class="note-sm">${total ? total + ' berkas dipilih' : 'Belum ada berkas dipilih'} · berkas dipindai otomatis dan tersimpan terenkripsi</div>`;
    }
    else body = `<div class="sum">${[
      ['Jenis perkara', MCS.JN[d.jenis].name], [K ? 'Nomor sprindik' : 'Nomor LP', d.lp], ['Sumber', d.sumber], ['Diterima Kejati', MCS.fmtDate(new Date(d.tgl).getTime())], ['Tempus delicti', MCS.fmtDate(new Date(d.tglk).getTime())],
      ['Locus delicti', (d.loc ? d.loc + ', ' : '') + (d.kab ? MCS.KAB[d.kab].name + ', ' + MCS.PROV[d.p] : '—')], ['Uraian', d.title],
      ['Tersangka militer', d.terdakwa.map((t) => t.pangkat + ' ' + t.nama + ' (NRP ' + t.nrp + ')').join('; ')], ['Matra', MCS.matraName(d.matra)],
      ...(K ? [['Tersangka sipil', d.sipil.map((t) => t.nama + (t.pekerjaan ? ' — ' + t.pekerjaan : '')).join('; ') || '—']] : []),
      ['Klasifikasi', d.cat ? MCS.CAT[d.cat].name : '—'], ['Pasal', d.arts.map(MCS.artLabel).join(' jo. ') || '—'], ['Kerugian', +d.kerugian ? 'Rp ' + fmtNum(d.kerugian) + ' (' + terbilang(+d.kerugian).toLowerCase() + ')' : '—'], ['Audit kerugian', !+d.kerugian || !d.audit.st ? '—' : d.audit.st === 'sudah' ? 'Sudah diaudit · ' + d.audit.lembaga + (d.audit.no ? ' · ' + d.audit.no : '') : 'Belum diaudit (perkiraan awal)'], ['Berkas & barang bukti', (() => { const n = Object.values(d.files).reduce((a, b) => a + b.length, 0); return n ? n + ' berkas diunggah' : 'Belum ada (bisa ditambahkan nanti)'; })()],
      ['Kejaksaan Tinggi', kjW.name], ['Peradilan', K ? 'Ditetapkan melalui penelitian bersama' : court.name], ['Oditurat mitra', MCS.otmilOf(court)],
    ].map(([k, v]) => `<div class="row"><span>${k}</span><b>${E(v)}</b></div>`).join('')}</div>
      <label style="display:flex;gap:10px;align-items:flex-start;margin-top:16px;font-size:12.5px;color:var(--txt-2);cursor:pointer"><input type="checkbox" id="w-ok" style="margin-top:3px" /> Saya menyatakan data yang diinput sesuai dokumen sumber dan dapat dipertanggungjawabkan.</label>`;

    page.innerHTML = `<div class="ph"><div><h1>Input perkara baru</h1><p>Tercatat di <b style="color:var(--txt-2)">${kjW.short}</b>. Tampil di dashboard setelah diverifikasi Aspidmil.</p></div><div class="acts"><button class="btn ghost" id="w-reset">Batalkan</button></div></div>
      <div class="wiz">
        <div class="wsteps">${WSTEPS.map(([n, sub], i) => `<div class="ws ${i === s ? 'on' : i < s ? 'done' : ''}" data-i="${i}"><i>${i < s ? '✓' : i + 1}</i><div><b>${n}</b><span>${sub}</span></div></div>`).join('')}</div>
        <div class="card"><header><h3>${s + 1}. ${WSTEPS[s][0]}</h3><span class="aux">Langkah ${s + 1} dari ${WSTEPS.length}</span></header><div class="cb" id="w-body">${body}</div>
          <div class="form-foot"><span class="note" id="w-note">${I('shield')}Draf tersimpan otomatis</span>${s ? '<button class="btn" id="w-prev">← Sebelumnya</button>' : ''}<button class="btn primary" id="w-next">${s === WSTEPS.length - 1 ? 'Kirim perkara' : 'Lanjut →'}</button></div></div>
        <div class="aside"><div class="card"><div class="mini-map" id="w-map"></div><div class="cb">
          <div class="sum"><div class="row"><span>Locus</span><b>${d.kab ? MCS.KAB[d.kab].name : 'Belum dipilih'}</b></div><div class="row"><span>Jenis</span><b>${MCS.JN[d.jenis].name}</b></div><div class="row"><span>Tersangka</span><b>${d.terdakwa.length} militer${K ? ' · ' + d.sipil.length + ' sipil' : ''}</b></div><div class="row"><span>Pasal</span><b>${d.arts.length ? d.arts.map(MCS.artLabel).join(', ') : '—'}</b></div></div>
          <div class="smart"><div class="t">${I('checkc')}Ditentukan otomatis</div>Dicatat di <b>${kjW.name}</b>${d.kab && !K ? '. Peradilan: <b>' + court.name + '</b>' : ''}.</div>
        </div></div></div>
      </div>`;
    requestAnimationFrame(() => { if (d.kab) MCSMap.miniMap($('w-map'), d.kab); else $('w-map').innerHTML = '<div class="mm-empty">Pilih provinsi dan kabupaten/kota untuk melihat lokasi di peta</div>'; });
    // binding
    const keep = () => {
      if (s === 0) Object.assign(d, { lp: $('w-lp').value, sumber: $('w-sumber').value, tgl: $('w-tgl').value, tglk: $('w-tglk').value, p: $('w-prov').value ? +$('w-prov').value : '', kab: $('w-kab').value, loc: $('w-loc').value, title: $('w-title').value });
      if (s === 0 && $('w-cat')) d.cat = $('w-cat').value;
      if (s === 1) {
        d.terdakwa.forEach((t, i) => Object.assign(t, { pangkat: $('w-pk' + i).value, nama: $('w-nm' + i).value, nrp: $('w-nrp' + i).value, jabatan: $('w-jb' + i).value, kesatuan: $('w-ks' + i).value, ditahan: $('w-th' + i).value }));
        if (K) d.sipil.forEach((t, i) => Object.assign(t, { nama: $('w-snm' + i).value, nik: $('w-snik' + i).value, pekerjaan: $('w-spk' + i).value }));
      }
      if (s === 2) { d.kerugian = $('w-rugi').value.replace(/\D/g, ''); d.catatan = $('w-cat-n').value; if ($('w-au-l')) Object.assign(d.audit, { lembaga: $('w-au-l').value, no: $('w-au-n').value, tgl: $('w-au-t').value }); }
    };
    const validate = () => {
      let ok = true;
      $('w-body').querySelectorAll('.f').forEach((f) => { const req = f.querySelector('label i'); const v = f.querySelector('input,select,textarea'); f.classList.remove('err'); if (req && v && !String(v.value).trim()) { f.classList.add('err'); ok = false; } });
      if (s === 1 && K && !d.sipil.length) { ok = false; $('w-note').innerHTML = '<span style="color:var(--crit-txt)">Perkara koneksitas wajib memiliki tersangka sipil.</span>'; return ok; }
      if (s === 2 && d.cat && MCS.CAT[d.cat].kn && !+d.kerugian) { ok = false; $('w-rugi').closest('.f').classList.add('err'); }
      if (s === 2 && ok && d.cat && MCS.CAT[d.cat].kn === 'negara' && !d.audit.st) { ok = false; $('w-note').innerHTML = '<span style="color:var(--crit-txt)">Pilih: nilai kerugian sudah atau belum diaudit.</span>'; }
      if (s === 4 && !$('w-ok').checked) { ok = false; $('w-note').innerHTML = '<span style="color:var(--crit-txt)">Centang pernyataan untuk mengirim.</span>'; }
      if (!ok && s < 2) $('w-note').innerHTML = '<span style="color:var(--crit-txt)">Lengkapi isian bertanda *</span>';
      if (s === 0 && ok && !d.arts.length) { ok = false; $('w-note').innerHTML = '<span style="color:var(--crit-txt)">Pilih minimal satu pasal yang disangkakan.</span>'; $('w-pasal').scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return ok;
    };
    // ---- asisten saran pasal & contoh perkara ----
    const sgS = (wz.sg = wz.sg || {});
    const paintSg = (mid) => {
      const m = $(mid); if (!m) return;
      const sg = SARAN.suggest(d.title, d.tglk);
      const all = sg && !sg.empty ? [sg.top].concat(sg.alts) : [];
      const shown = (all.find((x) => x.cat === sgS.cat) || all[0] || {}).cat;
      m.innerHTML = SARAN.render(sg, { cat: sgS.cat, picked: !!(shown && d.sgOk && d.cat === shown) });
      m.querySelectorAll('[data-sg-use]').forEach((b) => (b.onclick = () => {
        const x = all.find((y) => y.cat === b.dataset.sgUse); if (!x) return;
        keep(); d.cat = x.cat; d.arts = x.ids.slice(); d.sgOk = true; sgS.cat = x.cat;
        $('w-cat').value = x.cat; paintPasal(); paintSg(mid); UI.toast('Saran dipakai: klasifikasi dan pasal terisi di bawah. Bisa diubah.');
      }));
      m.querySelectorAll('[data-sg-alt]').forEach((b) => (b.onclick = () => { sgS.cat = b.dataset.sgAlt; paintSg(mid); }));
    };
    const paintPasal = () => {
      const m = $('w-pasal'); if (!m) return;
      m.innerHTML = pasalHtml();
      m.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => { const a = b.dataset.a; d.arts = d.arts.includes(a) ? d.arts.filter((x) => x !== a) : d.arts.concat(a); paintPasal(); }));
    };
    paintPasal(); paintSg('w-sg');
    if ($('w-title')) $('w-title').oninput = () => { d.title = $('w-title').value; sgS.cat = null; paintSg('w-sg'); };
    if ($('w-ex')) $('w-ex').onchange = (ev) => {
      const e = SARAN.EXAMPLES.find((x) => x.id === ev.target.value); if (!e) return;
      keep();
      const tk = SARAN.exDate(e).getTime(), tr = Math.min(MCS.NOW, tk + 9 * MCS.DAY), rd = new Date(tr);
      d.jenis = e.jenis; d.sumber = '';
      d.lp = e.jenis === 'koneksitas' ? 'Print-' + (10 + Math.floor(Math.random() * 150)) + '/Kon/' + MCS.ROMAN[rd.getMonth()] + '/' + rd.getFullYear() : 'LP-' + (10 + Math.floor(Math.random() * 150)) + '/A-' + (1 + Math.floor(Math.random() * 40)) + '/' + MCS.ROMAN[rd.getMonth()] + '/' + rd.getFullYear() + '/Idik';
      d.tglk = toDateInput(tk); d.tgl = toDateInput(tr);
      const kb = MCS.KABS.find((k) => k.name === e.kab);
      const kk = regional() && !(kb && MCS.KJ[me.kejati].prov.includes(kb.p)) ? MCS.kabsOf(MCS.KJ[me.kejati].prov[0])[0] : kb;
      if (kk) { d.p = kk.p; d.kab = kk.id; }
      d.loc = ''; d.title = e.title; d.matra = e.matra;
      d.terdakwa = [{ pangkat: MCS.PANGKAT[e.matra].some((x) => x[0] === e.pangkat) ? e.pangkat : MCS.PANGKAT[e.matra][6][0], nama: e.nama, nrp: e.nrp, jabatan: e.jabatan, kesatuan: e.kesatuan, ditahan: '0' }];
      d.sipil = e.sipil.map(([n, pk], i) => ({ nama: n, nik: '3578' + String(MCS.hash(e.id + i)).padStart(12, '0').slice(0, 12), pekerjaan: pk }));
      d.cat = e.cat; d.arts = e.arts.slice(); d.sgOk = true; d.kerugian = e.kerugian ? String(e.kerugian) : ''; d.catatan = e.catatan;
      d.audit = e.kerugian && (e.cat === 'KOR' || e.cat === 'MAT') ? { st: 'sudah', lembaga: e.cat === 'MAT' ? 'Inspektorat Jenderal TNI' : e.matra === 'AL' ? 'BPKP' : 'BPK RI', no: 'LHA-' + (20 + (MCS.hash(e.id) % 60)) + '/' + rd.getFullYear(), tgl: toDateInput(Math.min(MCS.NOW, tr + 60 * MCS.DAY)) } : { st: '', lembaga: 'BPK RI', no: '', tgl: '' };
      wz.sg = {}; renderWizard(); UI.toast('Contoh dimuat — periksa tiap langkah, lalu kirim');
    };
    page.querySelectorAll('[data-pick]').forEach((b) => (b.onclick = () => $('w-file-' + b.dataset.pick).click()));
    page.querySelectorAll('input[data-fs]').forEach((x) => (x.onchange = () => {
      const { ok, bad } = filterFiles([...x.files], x.dataset.kind);
      if (bad.length) UI.toast(bad[0], false);
      d.files[x.dataset.fs] = (d.files[x.dataset.fs] || []).concat(ok.map((f) => ({ n: f.name, size: f.size, type: f.type })));
      renderWizard();
    }));
    page.querySelectorAll('[data-rf]').forEach((b) => (b.onclick = () => { const [id, i] = b.dataset.rf.split(':'); d.files[id].splice(+i, 1); if (!d.files[id].length) delete d.files[id]; renderWizard(); }));
    if ($('w-rugi')) $('w-rugi').oninput = (e) => {
      const el = e.target, fromEnd = el.value.length - el.selectionStart;
      el.value = fmtNum(el.value);
      const pos = Math.max(0, el.value.length - fromEnd); el.setSelectionRange(pos, pos);
      $('w-rugi-t').textContent = terbilang(+el.value.replace(/\D/g, ''));
    };
    page.querySelectorAll('[data-au]').forEach((b) => (b.onclick = () => { keep(); d.audit.st = d.audit.st === b.dataset.au ? '' : b.dataset.au; renderWizard(); }));
    if ($('w-prov')) $('w-prov').onchange = (e) => { keep(); d.p = e.target.value ? +e.target.value : ''; d.kab = ''; renderWizard(); };
    if ($('w-kab')) $('w-kab').onchange = () => { keep(); renderWizard(); };
    if ($('w-tglk')) $('w-tglk').onchange = () => { keep(); renderWizard(); };
    if ($('w-cat')) $('w-cat').onchange = () => { keep(); d.sgOk = false; d.arts = d.cat ? MCS.CAT[d.cat].arts[0][0].slice() : []; paintPasal(); paintSg('w-sg'); };
    page.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { keep(); d.matra = b.dataset.m; d.terdakwa.forEach((t) => { if (!MCS.PANGKAT[d.matra].some((p) => p[0] === t.pangkat)) t.pangkat = MCS.PANGKAT[d.matra][6][0]; }); renderWizard(); }));
    page.querySelectorAll('select[id^="w-pk"]').forEach((x) => (x.onchange = () => { keep(); renderWizard(); }));
    page.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { keep(); d.terdakwa.splice(+b.dataset.rm, 1); renderWizard(); }));
    page.querySelectorAll('[data-j]').forEach((b) => (b.onclick = () => { keep(); d.jenis = b.dataset.j; d.sumber = ''; if (d.jenis === 'koneksitas') { d.lp = 'Print-' + (10 + Math.floor(Math.random() * 150)) + '/Kon/' + MCS.ROMAN[new Date().getMonth()] + '/' + new Date().getFullYear(); if (!d.sipil.length) d.sipil.push({ nama: '', nik: '', pekerjaan: '' }); } renderWizard(); }));
    page.querySelectorAll('[data-rms]').forEach((b) => (b.onclick = () => { keep(); d.sipil.splice(+b.dataset.rms, 1); renderWizard(); }));
    if ($('w-adds')) $('w-adds').onclick = () => { keep(); d.sipil.push({ nama: '', nik: '', pekerjaan: '' }); renderWizard(); };
    if ($('w-addt')) $('w-addt').onclick = () => { keep(); d.terdakwa.push({ pangkat: MCS.PANGKAT[d.matra][6][0], nama: '', nrp: '', jabatan: '', kesatuan: '', ditahan: '0' }); renderWizard(); };
    page.querySelectorAll('.ws.done').forEach((w) => (w.onclick = () => { keep(); wz.step = +w.dataset.i; renderWizard(); }));
    if ($('w-prev')) $('w-prev').onclick = () => { keep(); wz.step--; renderWizard(); };
    $('w-reset').onclick = () => { if (confirm('Batalkan input perkara ini? Draf akan dihapus.')) { wz = null; location.hash = '#perkara'; } };
    $('w-next').onclick = () => {
      keep();
      if (!validate()) return;
      if (s < WSTEPS.length - 1) { wz.step++; renderWizard(); return; }
      submitWizard();
    };
  }
  function submitWizard() {
    const d = wz.d;
    const court = courtFor(d);
    const t = new Date(d.tgl).getTime();
    const c = {
      id: MCS.nextId(), y: new Date(t).getFullYear(), d: t, p: d.p, kab: d.kab, loc: d.loc || null, cat: d.cat, arts: d.arts, st: 0, sd: [t], matra: d.matra,
      terdakwa: d.terdakwa.map((x) => ({ nama: x.nama, pangkat: x.pangkat, gol: (MCS.PANGKAT[d.matra].find((p) => p[0] === x.pangkat) || [0, 'T'])[1], nrp: x.nrp.slice(0, 4) + '••••', umur: 30 })),
      kesatuan: d.terdakwa[0].kesatuan, induk: d.matra === 'AD' ? MCS.KODAM[d.p] : d.matra === 'AL' ? 'Koarmada' : 'Koopsud', court: court.id, title: d.title,
      kerugian: +d.kerugian || 0, pulih: 0, kn: MCS.CAT[d.cat].kn, absentia: false, ditahan: d.terdakwa.some((x) => x.ditahan === '1'), seed: MCS.hash(d.lp),
      jenis: d.jenis, koneksitas: d.jenis === 'koneksitas', forum: 'militer', kejati: MCS.kejatiOfProv(d.p).id,
      sipil: d.jenis === 'koneksitas' ? d.sipil.map((x) => ({ nama: x.nama, pekerjaan: x.pekerjaan || '—', umur: 30 })) : [],
    };
    MCS.enrich(c);
    c.auditKerugian = +d.kerugian && d.audit.st ? { ...d.audit } : null; c.catatan = d.catatan || ''; c.gate = true; c.td = {};
    c.lp = d.lp; c.verified = !needsApproval(); c.updated = Date.now(); c.updatedBy = me.unit;
    MCS.saveCase(c);
    const slotName = Object.fromEntries(slotsOf(d.jenis === 'koneksitas', true, true).map((x) => [x[0], x[1]]));
    const docs = []; Object.keys(d.files).forEach((k) => d.files[k].forEach((f) => docs.push({ n: f.n, jenis: slotName[k] || 'Berkas', k, size: f.size, t: Date.now(), by: me.name })));
    if (docs.length) MCS.LS.set('mcs3_docs_' + c.id, docs);
    MCS.audit(me.name, 'Input perkara baru', c.id, d.lp + ' · ' + MCS.CAT[d.cat].name + (docs.length ? ' · ' + docs.length + ' berkas' : ''));
    if (!c.verified) {
      const ap = MCS.getApprovals();
      ap.unshift({ id: 'APR-' + (2000 + ap.length), caseId: c.id, by: me.name + ' (' + me.unit + ')', t: Date.now(), field: 'Perkara baru', from: '—', to: MCS.CAT[d.cat].name + ' · ' + d.terdakwa[0].pangkat + ' ' + d.terdakwa[0].nama, note: d.lp, status: 'menunggu' });
      MCS.saveApprovals(ap);
    }
    refreshScope();
    wz = null;
    UI.toast(`Perkara ${c.id} tersimpan${c.verified ? '' : ' · menunggu verifikasi'}`);
    location.hash = '#perkara/' + c.id;
  }

  // ================= Agenda =================
  let calMonth = new Date(MCS.TODAY); calMonth.setDate(1);
  let calSel = MCS.TODAY;
  function agenda() {
    crumb(['Agenda sidang']);
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const first = new Date(y, m, 1); const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    const days = Array.from({ length: 42 }, (x, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i).getTime());
    const hs = MCS.hearings(scoped, days[0], days[41] + MCS.DAY);
    const byDay = d3.group(hs, (h) => { const d = new Date(h.s.t); d.setHours(0, 0, 0, 0); return d.getTime(); });
    const selList = byDay.get(calSel) || [];
    page.innerHTML = `<div class="ph"><div><h1>Agenda sidang</h1><p>${MCS.BULAN_L[m]} ${y} · ${MCS.fmt(hs.filter((h) => new Date(h.s.t).getMonth() === m).length)} sidang</p></div>
      <div class="acts"><button class="btn" id="cp">←</button><button class="btn" id="ct">Bulan ini</button><button class="btn" id="cn">→</button></div></div>
      <div class="g3"><div class="card" style="overflow:hidden"><div class="cal">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => `<div class="h">${d}</div>`).join('')}
        ${days.map((t) => { const L = byDay.get(t) || []; const d = new Date(t); return `<div class="d ${d.getMonth() !== m ? 'out' : ''} ${t === MCS.TODAY ? 'today' : ''} ${t === calSel ? 'sel' : ''}" data-t="${t}"><div class="n"><b>${d.getDate()}</b>${L.length ? `<em>${L.length} sidang</em>` : ''}</div>${L.slice(0, 3).map(({ c, s }) => `<div class="ev ${s.t < MCS.NOW ? 'past' : ''}">${MCS.fmtTime(s.t)} ${E(c.terdakwa[0].pangkat + ' ' + c.terdakwa[0].nama.split(' ')[0])}</div>`).join('')}${L.length > 3 ? `<div class="mo">+${L.length - 3} lainnya</div>` : ''}</div>`; }).join('')}</div></div>
        <div class="card"><header><h3>${MCS.fmtDay(calSel)}${calSel !== MCS.TODAY ? '' : ', ' + MCS.fmtDate(calSel)}</h3><span class="aux">${selList.length} sidang</span></header>
          <div>${selList.length ? selList.map(({ c, s }) => `<div class="task" data-href="#perkara/${c.id}" data-tab="sidang"><span class="ic tm">${MCS.fmtTime(s.t)}</span><div><b>${s.agenda}</b><span>${E(MCS.terdakwaLabel(c.terdakwa[0]))} · ${MCS.forumShort(c)} · ${s.ruang}</span></div>${s.status === 'tunda' ? '<span class="pill warn">Ditunda</span>' : ''}</div>`).join('') : '<div class="empty">Tidak ada sidang pada hari ini.</div>'}</div></div></div>`;
    page.querySelectorAll('.cal .d').forEach((d) => (d.onclick = () => { calSel = +d.dataset.t; agenda(); }));
    $('cp').onclick = () => { calMonth.setMonth(calMonth.getMonth() - 1); agenda(); };
    $('cn').onclick = () => { calMonth.setMonth(calMonth.getMonth() + 1); agenda(); };
    $('ct').onclick = () => { calMonth = new Date(MCS.TODAY); calMonth.setDate(1); calSel = MCS.TODAY; agenda(); };
    bindHref();
  }

  // ================= Persetujuan =================
  function pendingApprovals() {
    if (!can('Menyetujui pembaruan (verifikasi)')) return [];
    return MCS.getApprovals().filter((a) => a.status === 'menunggu' && (me.role === 'PUSAT' || (MCS.byId(a.caseId) && inScope(MCS.byId(a.caseId)))));
  }
  function persetujuan() {
    crumb(['Persetujuan']);
    if (!can('Menyetujui pembaruan (verifikasi)')) { page.innerHTML = '<div class="empty">Menu ini untuk Aspidmil dan Admin Pusat.</div>'; return; }
    const all = MCS.getApprovals().filter((a) => me.role === 'PUSAT' || (MCS.byId(a.caseId) && inScope(MCS.byId(a.caseId))));
    page.innerHTML = `<div class="ph"><div><h1>Persetujuan</h1><p>Input operator diperiksa Aspidmil sebelum tampil di dashboard.</p></div></div>
      <div class="card">${all.length ? all.map((a) => { const c = MCS.byId(a.caseId); return `<div class="ap ${a.status !== 'menunggu' ? 'done' : ''}" data-id="${a.id}">
        <div><div class="h"><span class="mono">${a.id}</span>·<b><a href="#perkara/${a.caseId}">${c ? c.reg || c.id : a.caseId}</a></b>·<span>${c ? E(MCS.terdakwaLabel(c.terdakwa[0])) : ''}</span>·<span>diajukan ${E(a.by)} · ${MCS.fmtAgo(a.t)}</span>${a.status !== 'menunggu' ? `<span class="pill ${a.status === 'disetujui' ? 'good' : 'crit'}">${a.status}</span>` : ''}</div>
          <div class="diff"><span class="k">${E(a.field)}</span><span class="a">${E(a.from)}</span><span style="color:var(--txt-4)">→</span><span class="b">${E(a.to)}</span></div>
          ${a.note ? `<div class="note">Catatan: ${E(a.note)}</div>` : ''}</div>
        <div class="btns"><button class="btn" data-d="${a.id}">${I('file')}Lihat detail</button>${a.status === 'menunggu' ? `<button class="btn danger" data-r="${a.id}">${I('x')}Tolak</button><button class="btn primary" data-ok="${a.id}">${I('check')}Setujui</button>` : ''}</div></div>`; }).join('') : '<div class="empty">Tidak ada pengajuan.</div>'}</div>`;
    const decide = (id, ok) => {
      const ap = MCS.getApprovals(); const a = ap.find((x) => x.id === id);
      let alasan = '';
      if (!ok) { alasan = prompt('Alasan penolakan (dikirim ke pengaju):', 'Dokumen pendukung belum lengkap'); if (alasan === null) return; }
      a.status = ok ? 'disetujui' : 'ditolak';
      const c = MCS.byId(a.caseId);
      if (ok && c) {
        c.verified = true;
        if (a.apply && a.field === 'Tahap') applyStage(c, a.apply.st, a.apply.t, a.apply.form || {});
        else commit(c, null, null);
      }
      MCS.saveApprovals(ap);
      MCS.audit(me.name, ok ? 'Setujui perubahan' : 'Tolak perubahan', a.caseId, a.field + ': ' + a.to + (alasan ? ' · ' + alasan : ''));
      const el = page.querySelector(`.ap[data-id="${id}"]`);
      el.animate([{ opacity: 1 }, { opacity: 0.4, transform: 'translateX(8px)' }], { duration: 280, fill: 'forwards' });
      setTimeout(() => { persetujuan(); renderNav('persetujuan'); }, 300);
      UI.toast(ok ? 'Perubahan disetujui dan diterbitkan' : 'Perubahan ditolak');
    };
    // ---- detail pengajuan: lihat isi perkara sebelum menyetujui ----
    const showDetail = (id) => {
      const ap = MCS.getApprovals().find((x) => x.id === id); if (!ap) return;
      const c = MCS.byId(ap.caseId);
      if (!c) { UI.toast('Berkas perkara tidak ditemukan', false); return; }
      const row = (k, v) => `<div class="row"><span>${k}</span><b>${E(v)}</b></div>`;
      const docs = MCS.LS.get('mcs3_docs_' + c.id, []);
      const au = c.auditKerugian;
      const rows = [
        ['Nomor perkara', c.reg || c.id], [c.jenis === 'koneksitas' ? 'Nomor sprindik' : 'Nomor LP', c.lp], ['Jenis perkara', MCS.JN[c.jenis].name], ['Tahap saat ini', MCS.TAHAP[c.st].name],
        ['Klasifikasi', MCS.CAT[c.cat].name], ['Uraian', c.title], ['Lokasi', (c.loc ? c.loc + ', ' : '') + MCS.KAB[c.kab].name + ', ' + MCS.PROV[c.p]], ['Kejaksaan Tinggi', MCS.KJ[c.kejati].name], ['Diterima', MCS.fmtDate(c.d)],
        ['Tersangka militer', c.terdakwa.map((t) => t.pangkat + ' ' + t.nama + (t.nrp ? ' (NRP ' + t.nrp + ')' : '')).join('; ')], ['Satuan', c.kesatuan || '—'],
        ...(c.sipil && c.sipil.length ? [['Tersangka sipil', c.sipil.map((t) => t.nama + (t.pekerjaan && t.pekerjaan !== '—' ? ' — ' + t.pekerjaan : '')).join('; ')]] : []),
        ['Pasal', (c.arts || []).map(MCS.artLabel).join(' jo. ') || '—'],
        ['Kerugian', c.kerugian ? 'Rp ' + fmtNum(c.kerugian) + ' (' + terbilang(c.kerugian).toLowerCase() + ')' : '—'],
        ['Audit kerugian', !c.kerugian ? '—' : au ? (au.st === 'sudah' ? 'Sudah diaudit · ' + au.lembaga + (au.no ? ' · ' + au.no : '') : 'Belum diaudit (perkiraan awal)') : 'Belum diisi'],
        ['Catatan awal', c.catatan || '—'],
      ];
      const dl = docs.length ? `<ul class="dlist">${docs.map((d) => `<li>${I('file')}<span>${E(d.n)}<small>${d.jenis ? E(d.jenis) + ' · ' : ''}${d.size ? fmtSize(d.size) : ''}</small></span></li>`).join('')}</ul>` : '<div class="hint">Belum ada berkas yang diunggah untuk perkara ini.</div>';
      const open = ap.status === 'menunggu';
      modal('Detail pengajuan ' + ap.id, 'Periksa isi perkara sebelum diputuskan', `<div class="smart" style="margin:0 0 14px"><div class="t">${I('inbox')}Yang diajukan</div>${E(ap.field)}: ${E(ap.from)} → <b>${E(ap.to)}</b>${ap.note ? '<br>Catatan pengaju: ' + E(ap.note) : ''}<br><span style="color:var(--txt-3)">Diajukan ${E(ap.by)} · ${MCS.fmtAgo(ap.t)}</span></div>
        <div class="sum">${rows.map(([k, v]) => row(k, v)).join('')}</div>
        <div class="fs" style="margin-top:14px"><h4>Berkas & barang bukti (${docs.length})</h4>${dl}</div>
        <div style="margin-top:14px;display:flex;gap:10px;align-items:center"><a href="#perkara/${c.id}" id="m-open" class="btn">Buka halaman perkara lengkap</a>${open ? `<button class="btn danger" id="m-rej" type="button">${I('x')}Tolak pengajuan</button>` : ''}</div>`,
        () => { if (open) decide(id, true); }, open ? 'Setujui' : 'Tutup');
      const o = $('m-open'); if (o) o.onclick = () => UI.close('modal');
      const r = $('m-rej'); if (r) r.onclick = () => { UI.close('modal'); decide(id, false); };
    };
    page.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => showDetail(b.dataset.d)));
    page.querySelectorAll('[data-ok]').forEach((b) => (b.onclick = () => decide(b.dataset.ok, true)));
    page.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => decide(b.dataset.r, false)));
  }

  // ================= Laporan =================
  const RPT = [
    ['rekap', 'Rekapitulasi perkara per Kejati', 'Jumlah perkara per tahap dan Kejaksaan Tinggi', 'chart'],
    ['rugi', 'Kerugian negara & pemulihan', 'Nilai kerugian, pemulihan, uang pengganti', 'cash'],
    ['tahan', 'Status penahanan', 'Terdakwa ditahan & batas waktunya', 'lock'],
    ['putus', 'Putusan & pidana tambahan', 'Putusan bulan berjalan, pemecatan', 'gavel'],
  ];
  let rptSel = 'rekap';
  function laporan() {
    crumb(['Laporan']);
    const r = RPT.find((x) => x[0] === rptSel);
    let table = '';
    if (rptSel === 'rekap') {
      const g = d3.group(scoped, (c) => c.kejati);
      const rows = [...g].sort((a, b) => b[1].length - a[1].length);
      table = `<table><thead><tr><th>Kejaksaan Tinggi</th><th class="r">Koneksitas</th>${MCS.TAHAP.map((t) => `<th class="r">${t.name}</th>`).join('')}<th class="r">Jumlah</th></tr></thead><tbody>${rows.map(([k, l]) => { const s = MCS.stats(l); return `<tr><td>${MCS.KJ[k].short}</td><td class="r">${MCS.fmt(s.byJenis.koneksitas)}</td>${s.byStage.map((v) => `<td class="r">${MCS.fmt(v)}</td>`).join('')}<td class="r"><b>${MCS.fmt(l.length)}</b></td></tr>`; }).join('')}</tbody></table>`;
    } else if (rptSel === 'rugi') {
      const l = scoped.filter((c) => c.kn === 'negara').sort((a, b) => b.kerugian - a.kerugian).slice(0, 18);
      table = `<table><thead><tr><th>Nomor perkara</th><th>Terdakwa</th><th>Tahap</th><th class="r">Kerugian</th><th class="r">Dipulihkan</th><th class="r">%</th></tr></thead><tbody>${l.map((c) => `<tr><td>${c.reg || c.id}</td><td>${E(MCS.terdakwaLabel(c.terdakwa[0]))}</td><td>${MCS.TAHAP[c.st].name}</td><td class="r">${MCS.fmtRp(c.kerugian)}</td><td class="r">${MCS.fmtRp(c.pulih)}</td><td class="r">${c.kerugian ? Math.round((c.pulih / c.kerugian) * 100) : 0}</td></tr>`).join('')}</tbody></table>`;
    } else if (rptSel === 'tahan') {
      const l = scoped.filter((c) => c.tahanan).sort((a, b) => a.tahanan.sampai - b.tahanan.sampai).slice(0, 20);
      table = `<table><thead><tr><th>Terdakwa</th><th>Nomor perkara</th><th>Tempat</th><th>Kewenangan</th><th class="r">Berakhir</th></tr></thead><tbody>${l.map((c) => `<tr><td>${E(MCS.terdakwaLabel(c.terdakwa[0]))}</td><td>${c.reg || c.id}</td><td>${c.tahanan.tempat}</td><td>${c.tahanan.oleh}</td><td class="r">${MCS.fmtDate(c.tahanan.sampai)}</td></tr>`).join('')}</tbody></table>`;
    } else {
      const l = scoped.filter((c) => c.putusan).sort((a, b) => b.putusan.t - a.putusan.t).slice(0, 20);
      table = `<table><thead><tr><th>Tanggal</th><th>Nomor perkara</th><th>Terdakwa</th><th>Amar</th><th>Pidana tambahan</th></tr></thead><tbody>${l.map((c) => `<tr><td>${MCS.fmtDate(c.putusan.t)}</td><td>${c.reg}</td><td>${E(MCS.terdakwaLabel(c.terdakwa[0]))}</td><td>${c.putusan.amar}</td><td>${c.putusan.tambahan || '—'}</td></tr>`).join('')}</tbody></table>`;
    }
    page.innerHTML = `<div class="ph"><div><h1>Laporan</h1><p>Laporan siap diunduh.</p></div>
      <div class="acts"><button class="btn" id="rx">${I('download')}Excel</button><button class="btn primary" id="rp">${I('print')}Unduh PDF</button></div></div>
      <div class="rpts">${RPT.map(([k, n, s, ic]) => `<div class="rpt ${k === rptSel ? 'on' : ''}" data-k="${k}"><div class="ic">${I(ic)}</div><b>${n}</b><span>${s}</span></div>`).join('')}</div>
      <div class="doc-preview"><h2>${r[1].toUpperCase()}</h2><div class="sub">Cakupan: ${E(scopeLabel())} · Keadaan per ${MCS.fmtDate(MCS.NOW)}</div>${table}
        <div class="foot"><span>Dicetak oleh ${E(me.name)} melalui MCS · ${MCS.fmtDate(Date.now(), true)}</span><span>RAHASIA — hanya untuk kepentingan dinas</span></div></div>`;
    page.querySelectorAll('.rpt').forEach((x) => (x.onclick = () => { rptSel = x.dataset.k; laporan(); }));
    $('rp').onclick = () => UI.toast('Laporan PDF disiapkan dengan tanda tangan elektronik & watermark');
    $('rx').onclick = () => UI.toast('Data laporan diekspor ke Excel');
  }

  // ================= Data induk =================
  function pasal() {
    crumb(['Data induk'], ['Pasal & undang-undang']);
    const cnt = {}; MCS.cases.forEach((c) => c.arts.forEach((a) => (cnt[a] = (cnt[a] || 0) + 1)));
    page.innerHTML = `<div class="ph"><div><h1>Pasal & undang-undang</h1><p>Daftar pasal untuk input perkara. Hanya Admin Pusat yang dapat mengubah.</p></div>
      <div class="acts">${can('Kelola master pasal & satuan') ? `<button class="btn primary" id="pa">${I('plus')}Tambah pasal</button>` : ''}</div></div>
      <div class="tw"><table class="t"><thead><tr><th>Pasal</th><th>Undang-undang</th><th>Uraian</th><th>Ancaman</th><th>Padanan KUHP 2023</th><th class="r">Dipakai</th></tr></thead>
      <tbody>${MCS.ARTS.map((a) => `<tr><td><b style="font-weight:500">${a.pasal}</b></td><td>${MCS.LAW[a.law].name}<span class="sub">${MCS.LAW[a.law].full.slice(0, 48)}${MCS.LAW[a.law].full.length > 48 ? '…' : ''}</span></td><td style="max-width:340px">${a.desc}</td><td>${a.threat}</td><td>${a.baru ? a.baru + ' UU 1/2023' : '<span class="muted">—</span>'}</td><td class="r num">${MCS.fmt(cnt[a.id] || 0)}</td></tr>`).join('')}</tbody></table></div>
      <p class="muted" style="font-size:12px;margin-top:12px">Padanan KUHP 2023 bersifat indikatif dan perlu divalidasi tim hukum Babinkum TNI sebelum produksi.</p>`;
    if ($('pa')) $('pa').onclick = () => modal('Tambah pasal', 'Pasal baru tersedia untuk semua instansi setelah disimpan', `<div class="form">${field('Undang-undang', sel('m-l', MCS.LAWS.map((l) => [l.id, l.name])), { req: true })}${field('Pasal', inp('m-p', '', 'placeholder="Pasal 87 ayat (1) ke-2"'), { req: true })}${field('Uraian', inp('m-d'), { full: true, req: true })}${field('Ancaman pidana', inp('m-t'))}${field('Padanan KUHP 2023', inp('m-b'))}</div>`, () => { UI.toast('Pasal ditambahkan ke data induk'); });
  }
  function satuan() {
    crumb(['Data induk'], ['Kejati & instansi mitra']);
    const g = d3.rollup(MCS.cases, (v) => [v.length, v.filter((c) => c.jenis === 'koneksitas').length, v.filter((c) => c.st < 7).length], (c) => c.kejati);
    const asp = (id) => users.filter((u) => u.kejati === id && u.role === 'ASPIDMIL').map((u) => u.name)[0];
    page.innerHTML = `<div class="ph"><div><h1>Kejati & instansi mitra</h1><p>Bidang Pidana Militer pada ${MCS.KEJATI.length} Kejaksaan Tinggi. </p></div></div>
      <div class="tw"><table class="t"><thead><tr><th>Kejaksaan Tinggi</th><th>Wilayah</th><th>Aspidmil</th><th class="r">Perkara</th><th class="r">Koneksitas</th><th class="r">Belum selesai</th></tr></thead>
      <tbody>${MCS.KEJATI.map((k) => { const [n, kn, a] = g.get(k.id) || [0, 0, 0]; return `<tr><td><b style="font-weight:500">${k.name}</b><span class="sub">Kedudukan: ${k.city}</span></td><td>${k.prov.map((q) => MCS.PROV[q]).join(', ')}</td><td>${asp(k.id) ? E(asp(k.id)) : '<span class="muted">—</span>'}</td><td class="r num">${MCS.fmt(n)}</td><td class="r num">${MCS.fmt(kn)}</td><td class="r num">${MCS.fmt(a)}</td></tr>`; }).join('')}</tbody></table></div>
      <h3 style="font-size:15px;font-weight:600;margin:26px 0 4px">Instansi mitra (rujukan)</h3><p class="muted" style="margin-bottom:12px">Oditurat dan Pengadilan Militer bukan pengguna aplikasi; dicatat sebagai pihak dalam perkara. Susunan pengadilan sesuai PP 22/2025 & PP 23/2025.</p>
      <div class="tw"><table class="t"><thead><tr><th>Pengadilan Militer</th><th>Oditurat mitra</th><th>Wilayah</th></tr></thead><tbody>${MCS.DILMIL.map((c) => `<tr><td>${c.name}</td><td>${MCS.otmilOf(c)}</td><td>${c.kabs ? 'Sebagian Jawa Timur' : c.prov.map((q) => MCS.PROV[q]).join(', ')}</td></tr>`).join('')}</tbody></table></div>`;
  }

  // ================= Pengguna & akses =================
  let userTab = 'users';
  function pengguna() {
    crumb(['Sistem'], ['Pengguna & hak akses']);
    users = MCS.getUsers();
    page.innerHTML = `<div class="ph"><div><h1>Pengguna & hak akses</h1><p>Akses menurut peran dan wilayah.</p></div>
      <div class="acts"><button class="btn primary" id="ua">${I('plus')}Tambah pengguna</button></div></div>
      <div class="views"><button data-t="users" class="${userTab === 'users' ? 'on' : ''}">Pengguna<em>${users.length}</em></button><button data-t="roles" class="${userTab === 'roles' ? 'on' : ''}">Peran & izin<em>${MCS.ROLES.length}</em></button></div>
      <div id="ub"></div>`;
    page.querySelectorAll('.views button').forEach((b) => (b.onclick = () => { userTab = b.dataset.t; pengguna(); }));
    if (userTab === 'users') {
      $('ub').innerHTML = `<div class="tw"><table class="t"><thead><tr><th>Nama</th><th>Nama pengguna</th><th>Peran</th><th>Satuan kerja / cakupan</th><th>Status</th><th>Aktif terakhir</th><th></th></tr></thead><tbody>${users.map((u) => `<tr>
        <td><div style="display:flex;gap:10px;align-items:center"><span class="av" style="width:30px;height:30px;border-radius:8px;display:grid;place-items:center;background:var(--panel-3);font-size:11px;font-weight:600">${initials(u.name)}</span><b style="font-weight:500">${E(u.name)}</b></div></td>
        <td class="mono">${u.username}</td><td>${MCS.ROLES.find((r) => r.id === u.role).name}</td><td>${E(u.unit)}</td>
        <td>${u.status === 'Aktif' ? '<span class="pill good">Aktif</span>' : '<span class="pill">Nonaktif</span>'}</td><td>${MCS.fmtAgo(u.last)}</td>
        <td class="r"><button class="btn ghost" data-tg="${u.id}">${u.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button></td></tr>`).join('')}</tbody></table></div>`;
      page.querySelectorAll('[data-tg]').forEach((b) => (b.onclick = () => { const u = users.find((x) => x.id === b.dataset.tg); u.status = u.status === 'Aktif' ? 'Nonaktif' : 'Aktif'; MCS.saveUsers(users); MCS.audit(me.name, 'Ubah status pengguna', u.username, u.status); UI.toast(u.username + ' ' + u.status.toLowerCase()); pengguna(); }));
    } else {
      $('ub').innerHTML = `<div class="roles" style="margin-bottom:16px">${MCS.ROLES.map((r) => `<div class="role-card"><b>${r.name}</b><span>${r.unit}</span><span style="margin-top:6px;color:var(--txt-2)">${r.desc}</span><span style="margin-top:6px">Cakupan: ${r.scope}</span></div>`).join('')}</div>
        <div class="tw"><table class="t mx"><thead><tr><th>Izin</th>${MCS.ROLES.map((r) => `<th>${r.name}</th>`).join('')}</tr></thead><tbody>${MCS.PERMS.map(([p, v]) => `<tr><td>${p}</td>${v.map((x) => `<td><span class="dotc ${x ? 'y' : 'n'}">${x ? I('check') : '—'}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    $('ua').onclick = () => modal('Tambah pengguna', 'Undangan aktivasi dikirim ke email dinas', `<div class="form">${field('Nama lengkap & pangkat', inp('m-n'), { full: true, req: true })}${field('Email dinas', inp('m-e', '', 'placeholder="nama@kejaksaan.go.id"'), { req: true })}${field('Peran', sel('m-r', MCS.ROLES.map((r) => [r.id, r.name])), { req: true })}${field('Satuan kerja', sel('m-u', [['', 'Kejaksaan Agung (Jampidmil)']].concat(MCS.KEJATI.map((k) => [k.id, k.short]))), { full: true, hint: 'Pilih Kejati (wilayah) untuk peran Aspidmil dan Operator Kejari' })}</div>`, () => {
      const r = $('m-r').value, kj = $('m-u').value;
      if (!$('m-n').value.trim() || ((r === 'OPERATOR' || r === 'ASPIDMIL') && !kj)) { $('m-note').textContent = 'Lengkapi isian wajib.'; return false; }
      users.push({ id: 'U-' + String(users.length + 1).padStart(3, '0'), name: $('m-n').value, username: ($('m-e').value.split('@')[0] || 'pengguna.baru'), role: r, unit: kj ? MCS.KJ[kj].short : 'Jampidmil, Kejaksaan Agung', kejati: kj || null, status: 'Aktif', last: Date.now() });
      MCS.saveUsers(users); MCS.audit(me.name, 'Tambah pengguna', $('m-n').value, MCS.ROLES.find((r) => r.id === $('m-r').value).name);
      UI.toast('Undangan aktivasi terkirim'); pengguna();
    });
  }

  // ================= Log audit =================
  let auditQ = '';
  function audit() {
    crumb(['Sistem'], ['Log audit']);
    const q = auditQ.toLowerCase();
    const log = MCS.getAudit().filter((a) => !q || (a.user + ' ' + a.action + ' ' + a.target + ' ' + a.detail).toLowerCase().includes(q)).slice(0, 120);
    page.innerHTML = `<div class="ph"><div><h1>Log audit</h1><p>Semua akses dan perubahan data tercatat.</p></div><div class="acts"><button class="btn" id="ax">${I('download')}Ekspor</button></div></div>
      <div class="toolbar"><input class="input grow" id="aq" placeholder="Cari pengguna, aksi, nomor perkara…" value="${E(auditQ)}" /></div>
      <div class="tw"><table class="t"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Objek</th><th>Keterangan</th></tr></thead><tbody>${log.map((a) => `<tr class="${MCS.byId(a.target) ? 'click' : ''}" ${MCS.byId(a.target) ? `data-href="#perkara/${a.target}"` : ''}><td class="num" style="white-space:nowrap">${MCS.fmtDate(a.t, true)}</td><td>${E(a.user)}</td><td>${E(a.action)}</td><td class="mono">${E(a.target)}</td><td style="color:var(--txt-2)">${E(a.detail)}</td></tr>`).join('')}</tbody></table></div>`;
    let tq; $('aq').oninput = (e) => { clearTimeout(tq); tq = setTimeout(() => { auditQ = e.target.value; audit(); $('aq').focus(); $('aq').setSelectionRange(99, 99); }, 250); };
    $('ax').onclick = () => UI.toast('Log audit diekspor (CSV, ditandatangani hash)');
    bindHref();
  }

  // ================= Pencarian & notifikasi =================
  window.WSHost = {
    pool: () => scoped,
    scope: () => scopeLabel(),
    open: (id) => { location.hash = '#perkara/' + id; },
    list: (P) => {
      listState = { view: 'semua', q: P.text || '', stage: P.f.stage === '' || P.f.stage == null ? '' : String(P.f.stage), cat: P.f.cat || '', matra: P.f.matra || '', page: 1 };
      if (location.hash === '#perkara') list(); else location.hash = '#perkara';
    },
    agenda: () => { location.hash = '#agenda'; },
    commands: [
      ...(can('Input perkara baru') ? [['Input perkara baru', 'plus', () => { location.hash = '#baru'; }]] : []),
      ...(can('Menyetujui pembaruan (verifikasi)') ? [['Persetujuan', 'inbox', () => { location.hash = '#persetujuan'; }]] : []),
      ['Agenda sidang', 'cal', () => { location.hash = '#agenda'; }],
      ['Daftar perkara', 'folder', () => { location.hash = '#perkara'; }],
    ],
  };
  function quick() {
    const q = $('qs-input').value.trim().toLowerCase();
    const res = [];
    if (q.length >= 2) for (let i = scoped.length - 1; i >= 0 && res.length < 10; i--) {
      const c = scoped[i];
      if ((c.id + ' ' + (c.reg || '') + ' ' + c.lp + ' ' + c.title + ' ' + c.kesatuan + ' ' + c.terdakwa.map((t) => MCS.terdakwaLabel(t) + ' ' + t.nrp).join(' ') + ' ' + c.sipil.map((t) => t.nama).join(' ')).toLowerCase().includes(q)) res.push(c);
    }
    $('qs-res').innerHTML = q.length < 2 ? '<div class="empty">Ketik minimal 2 karakter. Pencarian dibatasi cakupan akses Anda.</div>' : res.length ? res.map((c) => `<div class="qs-it" data-id="${c.id}"><div><b>${E(MCS.terdakwaLabel(c.terdakwa[0]))} — ${E(c.title)}</b><span>${c.reg || c.lp} · ${MCS.TAHAP[c.st].name}</span></div><span class="muted">↵</span></div>`).join('') : '<div class="empty">Tidak ditemukan.</div>';
    $('qs-res').querySelectorAll('.qs-it').forEach((r) => (r.onclick = () => { UI.close('qs'); location.hash = '#perkara/' + r.dataset.id; }));
  }
  $('q-open').onclick = () => { $('qs-input').value = ''; quick(); UI.open('qs'); setTimeout(() => $('qs-input').focus(), 60); };
  $('qs-input').oninput = quick;
  $('qs-input').onkeydown = (e) => { if (e.key === 'Enter') { const f = $('qs-res').querySelector('.qs-it'); if (f) f.click(); } };
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('q-open').click(); } });
  $('notif-btn').onclick = (e) => {
    e.stopPropagation();
    const al = MCS.alerts(scoped).slice(0, 8);
    $('notif').innerHTML = `<header>Notifikasi<span>${al.length} terbaru</span></header>${al.map((a) => `<div class="task ${a.level === 'critical' ? 'crit' : a.level === 'warning' ? 'warn' : ''}" data-href="#perkara/${a.c.id}"><span class="ic">${I({ tahanan: 'lock', stale: 'clock', tunda: 'pause', eksekusi: 'gavel' }[a.type])}</span><div><b>${a.text}</b><span>${E(MCS.terdakwaLabel(a.c.terdakwa[0]))} · ${a.c.reg || a.c.id}</span></div></div>`).join('') || '<div class="empty">Tidak ada notifikasi.</div>'}`;
    $('notif').classList.toggle('on');
    bindHref($('notif'));
  };
  document.addEventListener('click', (e) => { if (!e.target.closest('#notif') && !e.target.closest('#notif-btn')) $('notif').classList.remove('on'); });

  // Mulai
  refreshScope();
  route();
})();
