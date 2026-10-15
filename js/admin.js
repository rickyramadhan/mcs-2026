/* =====================================================================
   MCS — Workspace: input & pembaruan perkara oleh Oditurat, Pengadilan,
   Penyidik POM; verifikasi oleh Otmilti; administrasi oleh Admin Pusat.
   SPA sederhana berbasis hash (#beranda, #perkara/ID, #baru, …).
   ===================================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const E = MCS.esc;
  const I = UI.icon;
  const page = $('page');

  // ================= Sesi & cakupan akses =================
  const DEMO_USERS = ['U-005', 'U-008', 'U-004', 'U-010', 'U-001', 'U-002'];
  let users = MCS.getUsers();
  let me = users.find((u) => u.id === MCS.LS.get('mcs2_me', 'U-005')) || users[4];
  const role = () => MCS.ROLES.find((r) => r.id === me.role);
  const roleIdx = () => MCS.ROLES.findIndex((r) => r.id === me.role);
  const can = (perm) => { const p = MCS.PERMS.find((x) => x[0] === perm); return !!(p && p[1][roleIdx()]); };
  function inScope(c) {
    const court = MCS.COURT[c.court];
    switch (me.role) {
      case 'OTMIL': return c.otmil === me.unit;
      case 'OTMILTI': { const t = MCS.DILMILTI.find((x) => me.unit.endsWith(x.city)); return t && (c.court === t.id || court.tinggi === t.id); }
      case 'DILMIL': return court.short === me.unit;
      case 'POM': return c.matra === 'AD' && c.induk === me.unit.replace('Pomdam', 'Kodam');
      default: return true;
    }
  }
  let scoped = [];
  const refreshScope = () => { scoped = MCS.cases.filter(inScope); };
  const scopeLabel = () => (['PUSAT', 'PIMPINAN', 'AUDITOR'].includes(me.role) ? 'Nasional' : me.unit);
  // tahap yang boleh diperbarui per peran
  const STAGE_ROLE = { POM: [1, 2], OTMIL: [2, 3, 4, 7], DILMIL: [4, 5, 6, 7], OTMILTI: [1, 2, 3, 4, 5, 6, 7], PUSAT: [1, 2, 3, 4, 5, 6, 7] };
  const canMoveTo = (st) => (STAGE_ROLE[me.role] || []).includes(st);
  const needsApproval = () => me.role === 'OTMIL' || me.role === 'POM';
  const readOnly = () => ['PIMPINAN', 'AUDITOR'].includes(me.role);
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
      ['satuan', 'Pengadilan & oditurat', 'building'],
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
      me = users.find((u) => u.id === e.target.value); MCS.LS.set('mcs2_me', me.id);
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
      <div class="ph"><div><h1>${salam}, ${E(me.name.split(',')[0])}</h1><p>${role().name} · cakupan data <b style="color:var(--txt-2)">${E(scopeLabel())}</b> · ${MCS.HARI[new Date().getDay()]}, ${MCS.fmtDate(MCS.NOW)}</p></div>
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
      <span style="color:var(--txt-2)">${i + 1}. ${t.name}</span><div style="height:7px;background:rgba(148,172,204,.07);border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:${(s.byStage[i] / mx) * 100}%;background:${MCS.GROUP[MCS.groupOf(i)].color};border-radius:0 4px 4px 0;transition:width .8s"></i></div><b style="text-align:right;font-variant-numeric:tabular-nums">${MCS.fmt(s.byStage[i])}</b></div>`).join('');
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
      (!q || (c.id + ' ' + (c.reg || '') + ' ' + c.lp + ' ' + c.title + ' ' + c.kesatuan + ' ' + c.terdakwa.map((t) => MCS.terdakwaLabel(t) + ' ' + t.nrp).join(' ')).toLowerCase().includes(q)));
    rows.sort((a, b) => b.updated - a.updated);
    const pages = Math.max(1, Math.ceil(rows.length / PAGE));
    listState.page = Math.min(listState.page, pages);
    const slice = rows.slice((listState.page - 1) * PAGE, listState.page * PAGE);
    page.innerHTML = `
      <div class="ph"><div><h1>Perkara</h1><p>${MCS.fmt(scoped.length)} perkara dalam cakupan ${E(scopeLabel())}</p></div>
        <div class="acts"><button class="btn" id="exp">${I('download')}Ekspor</button>${can('Input perkara baru') ? `<a class="btn primary" href="#baru">${I('plus')}Input perkara baru</a>` : ''}</div></div>
      <div class="views">${VIEWS.map(([k, n, f]) => { const cnt = scoped.filter(f).length; return `<button data-v="${k}" class="${k === v[0] ? 'on' : ''}">${n}<em class="${(k === 'tahanan' || k === 'stale') && cnt ? 'warn' : ''}">${MCS.fmt(cnt)}</em></button>`; }).join('')}</div>
      <div class="toolbar">
        <input class="input grow" id="lq" placeholder="Cari nomor register, LP, terdakwa, NRP, satuan…" value="${E(listState.q)}" />
        <label class="sel"><span>Tahap</span><select id="ls"><option value="">Semua</option>${MCS.TAHAP.map((t) => `<option value="${t.id}" ${String(t.id) === String(listState.stage) ? 'selected' : ''}>${t.id + 1}. ${t.name}</option>`).join('')}</select></label>
        <label class="sel"><span>Klasifikasi</span><select id="lc"><option value="">Semua</option>${MCS.CATS.map((c) => `<option value="${c.id}" ${c.id === listState.cat ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
        <label class="sel"><span>Matra</span><select id="lm"><option value="">Semua</option>${MCS.MATRA.map((m) => `<option value="${m.id}" ${m.id === listState.matra ? 'selected' : ''}>${m.short}</option>`).join('')}</select></label>
      </div>
      <div class="tw"><table class="t"><thead><tr><th>Nomor perkara</th><th>Terdakwa</th><th>Klasifikasi</th><th>Tahap</th><th>Sidang berikutnya</th><th>Diperbarui</th><th></th></tr></thead>
      <tbody>${slice.length ? slice.map((c) => { const ns = MCS.nextSidang(c); const crit = c.tahanan && c.tahanan.sampai - MCS.TODAY <= 2 * MCS.DAY; return `<tr class="click" data-href="#perkara/${c.id}">
        <td><span class="mono">${c.reg || c.lp}</span><span class="sub">${c.id}${c.verified ? '' : ' · <span style="color:var(--warn)">belum diverifikasi</span>'}</span></td>
        <td><b style="font-weight:500">${E(MCS.terdakwaLabel(c.terdakwa[0]))}</b>${c.terdakwa.length > 1 ? ` <span class="muted">+${c.terdakwa.length - 1}</span>` : ''}<span class="sub">${E(c.kesatuan)} · ${MCS.matraName(c.matra)}</span></td>
        <td>${MCS.CAT[c.cat].name}<span class="sub">${c.arts.map(MCS.artLabel).join(', ')}</span></td>
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
  const ED_TABS = [['ringkas', 'Ringkasan', 'file'], ['terdakwa', 'Terdakwa', 'user'], ['pasal', 'Pasal', 'scale'], ['sidang', 'Persidangan', 'cal'], ['kerugian', 'Kerugian', 'cash'], ['tahanan', 'Penahanan', 'lock'], ['dokumen', 'Dokumen', 'folder'], ['riwayat', 'Riwayat', 'history']];
  function editor(id) {
    const c = MCS.byId(id);
    if (!c) { page.innerHTML = '<div class="empty">Perkara tidak ditemukan.</div>'; return; }
    crumb(['Perkara', '#perkara'], [c.reg || c.id]);
    const court = MCS.COURT[c.court];
    const ns = MCS.nextSidang(c);
    const nextSt = c.st + 1;
    const ro = readOnly() || !inScope(c);
    page.innerHTML = `
      <div class="ch"><div style="min-width:0">
        <div class="meta"><span class="mono" style="color:var(--txt-3);font-size:12px">${c.id} · ${c.reg || c.lp}</span>${UI.stagePill(c.st)}<span class="pill">${MCS.CAT[c.cat].name}</span>${c.verified ? '<span class="pill good">Terverifikasi</span>' : '<span class="pill warn">Belum diverifikasi</span>'}${c.koneksitas ? '<span class="pill info">Koneksitas</span>' : ''}</div>
        <h1>${E(c.title)}</h1><p>${E(MCS.terdakwaLabel(c.terdakwa[0]))} · ${E(c.kesatuan)} · ${court.short} · ${c.otmil}</p></div>
        <div class="acts">
          <a class="btn ghost" href="index.html" title="Lihat di Command Center">${I('ext')}</a>
          ${!ro && c.st >= 4 && c.st <= 4 ? `<button class="btn" id="a-jadwal">${I('cal')}Jadwalkan sidang</button>` : ''}
          ${!ro && ns ? `<button class="btn" id="a-hasil">${I('gavel')}Catat hasil sidang</button>` : ''}
          ${!ro && nextSt <= 7 ? `<button class="btn primary" id="a-tahap" ${canMoveTo(nextSt) ? '' : 'disabled title="Tahap berikutnya dikelola instansi lain"'}>${I('arrow')}Lanjut ke ${MCS.TAHAP[nextSt].name}</button>` : ''}
        </div></div>
      <div class="stepper">${MCS.TAHAP.map((t, i) => `<div class="sp ${i < c.st ? 'done' : i === c.st ? 'cur' : ''}" title="${t.long}"><span class="d"></span><b>${t.name}</b><span>${c.sd[i] ? MCS.fmtDate(c.sd[i]) : t.actor}</span></div>`).join('')}</div>
      <div class="ed">
        <div class="tabsv">${ED_TABS.filter(([k]) => k !== 'kerugian' || c.kn).map(([k, n, ic]) => `<button data-t="${k}" class="${k === edTab ? 'on' : ''}">${I(ic)}${n}${k === 'sidang' ? `<em>${c.sidang.length}</em>` : k === 'terdakwa' ? `<em>${c.terdakwa.length}</em>` : ''}</button>`).join('')}</div>
        <div id="ed-body"></div>
        <div class="aside">
          <div class="card"><div class="mini-map" id="ed-map"></div><div class="cb kv2">
            <div><span>Locus delicti</span>${c.loc ? c.loc + ', ' : ''}${MCS.KAB[c.kab].name}, ${MCS.PROV[c.p]}</div>
            <div><span>Pengadilan berwenang</span>${court.name}</div>
            <div><span>Oditurat</span>${c.otmil}</div>
            <div><span>Oditur</span>${c.oditur}</div></div></div>
          ${ns ? `<div class="card"><div class="cb"><div style="font-size:11.5px;color:#f0a07e;font-weight:500">Sidang berikutnya</div><div style="font-size:15px;font-weight:600;margin-top:2px">${MCS.fmtDay(ns.t)}, ${MCS.fmtTime(ns.t)} WIB</div><div class="muted" style="font-size:12px">${ns.agenda} · ${ns.ruang}</div></div></div>` : ''}
          ${c.tahanan ? `<div class="card"><div class="cb"><div style="font-size:11.5px;color:var(--txt-3)">Penahanan berakhir</div><div style="font-size:15px;font-weight:600;margin-top:2px;${c.tahanan.sampai - MCS.TODAY <= 5 * MCS.DAY ? 'color:var(--crit-txt)' : ''}">${MCS.fmtDate(c.tahanan.sampai)}</div><div class="muted" style="font-size:12px">${c.tahanan.tempat}</div></div></div>` : ''}
          <div class="card"><div class="cb" style="font-size:12px;color:var(--txt-3)">Terakhir diperbarui ${MCS.fmtAgo(c.updated)} oleh ${E(c.updatedBy)}.${ro ? '<br><br><b style="color:var(--warn)">Mode baca</b> — peran Anda tidak dapat mengubah perkara ini.' : needsApproval() ? '<br><br>Perubahan tahap dari peran Anda akan diverifikasi Admin Otmilti sebelum tampil di Command Center.' : ''}</div></div>
        </div></div>`;
    page.querySelectorAll('.tabsv button').forEach((b) => (b.onclick = () => { edTab = b.dataset.t; page.querySelectorAll('.tabsv button').forEach((x) => x.classList.toggle('on', x === b)); edBody(c, ro); }));
    if ($('a-tahap')) $('a-tahap').onclick = () => stageModal(c);
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
        ${field('Nomor laporan polisi militer', inp('f-lp', c.lp, dis))}
        ${field('Provinsi (locus)', sel('f-prov', MCS.provIds.map((p) => [p, MCS.PROV[p]]), c.p, dis))}
        ${field('Kabupaten/kota (locus)', sel('f-kab', MCS.kabsOf(c.p).map((k) => [k.id, k.name]), c.kab, dis), { hint: 'Menentukan pengadilan berwenang secara otomatis' })}
        ${field('Lokasi detail', inp('f-loc', c.loc || '', dis + ' placeholder="Kecamatan / alamat"'))}
        ${field('Satuan terdakwa', inp('f-ksat', c.kesatuan, dis))}
        ${field('Nomor register pengadilan', `<div class="ro mono">${c.reg || 'Diterbitkan saat pelimpahan ke pengadilan'}</div>`)}
        ${field('Perkara koneksitas', sel('f-kon', [['0', 'Tidak'], ['1', 'Ya — melibatkan warga sipil (koordinasi Jampidmil)']], c.koneksitas ? '1' : '0', dis))}
      </div></div>${foot('s-ringkas')}</div>`;
    } else if (edTab === 'terdakwa') {
      h = `<div class="card"><header><h3>Terdakwa</h3><span class="aux">${c.terdakwa.length} orang</span></header><div class="cb">${c.terdakwa.map((t, i) => `<div class="tcard"><header>Terdakwa ${i + 1}</header><div class="form">
        ${field('Pangkat', sel('t-pk' + i, MCS.PANGKAT[c.matra].map((p) => p[0]), t.pangkat, dis))}
        ${field('Nama lengkap', inp('t-nm' + i, t.nama, dis))}
        ${field('NRP', inp('t-nrp' + i, t.nrp, dis), { hint: 'Ditampilkan tersamar di luar instansi penangani' })}
        ${field('Umur', inp('t-um' + i, t.umur, dis + ' type="number"'))}
      </div></div>`).join('')}
        ${ro ? '' : `<button class="btn" id="t-add">${I('plus')}Tambah terdakwa</button>`}</div>${foot('s-terdakwa')}</div>`;
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
        ${c.sidang.length ? `<div class="tl">${c.sidang.map((s) => `<div class="e ${s.status === 'jadwal' ? 'next' : s.status === 'tunda' ? 'tunda' : ''}"><b>${s.agenda}</b> ${s.status === 'jadwal' ? '<span class="pill" style="height:18px;font-size:10.5px;color:#f0a07e">Terjadwal</span>' : s.status === 'tunda' ? '<span class="pill warn" style="height:18px;font-size:10.5px">Ditunda</span>' : ''}<span>${MCS.fmtDate(s.t, true)} WIB · ${s.ruang}${s.ket ? ' · ' + s.ket : ''}</span></div>`).join('')}</div>` : '<div class="empty">Perkara belum dilimpahkan ke pengadilan.</div>'}
      </div>${!ro && c.st === 4 ? `<div class="form-foot"><button class="btn" id="s-j2">${I('cal')}Jadwalkan sidang</button>${MCS.nextSidang(c) ? `<button class="btn primary" id="s-h2">${I('gavel')}Catat hasil sidang</button>` : ''}</div>` : ''}</div>`;
    } else if (edTab === 'kerugian') {
      h = `<div class="card"><header><h3>${c.kn === 'negara' ? 'Kerugian keuangan negara' : 'Kerugian korban'}</h3></header><div class="cb"><div class="form">
        ${field('Nilai kerugian (Rp)', inp('k-nilai', c.kerugian, dis + ' type="number"'), { hint: c.kn === 'negara' ? 'Berdasarkan hasil audit BPKP / Itjen TNI' : 'Berdasarkan laporan korban' })}
        ${field('Telah dipulihkan (Rp)', inp('k-pulih', c.pulih, dis + ' type="number"'), { hint: 'Penyitaan, pengembalian sukarela, atau uang pengganti' })}
        ${field('Bentuk pemulihan', sel('k-bentuk', ['Pengembalian sukarela', 'Penyitaan aset', 'Uang pengganti (putusan)', 'Lelang barang bukti'], 'Pengembalian sukarela', dis))}
        ${field('Tanggal pencatatan', inp('k-tgl', toDateInput(MCS.NOW), dis + ' type="date"'))}
      </div><div style="margin-top:16px"><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--txt-3);margin-bottom:6px"><span>Progres pemulihan</span><b style="color:var(--txt)">${c.kerugian ? ((c.pulih / c.kerugian) * 100).toFixed(1) : 0}%</b></div>
        <div style="height:10px;background:rgba(148,172,204,.1);border-radius:5px;overflow:hidden"><i style="display:block;height:100%;width:${c.kerugian ? (c.pulih / c.kerugian) * 100 : 0}%;background:var(--s3)"></i></div></div></div>${foot('s-rugi')}</div>`;
    } else if (edTab === 'tahanan') {
      h = `<div class="card"><header><h3>Penahanan</h3></header><div class="cb">${c.tahanan ? `<div class="form">
        ${field('Status', `<div class="ro">Ditahan</div>`)}
        ${field('Tempat penahanan', inp('h-tmp', c.tahanan.tempat, dis))}
        ${field('Berlaku sampai', inp('h-sd', toDateInput(c.tahanan.sampai), dis + ' type="date"'), { hint: 'Perpanjangan oleh ' + c.tahanan.oleh })}
        ${field('Dasar perpanjangan', inp('h-dasar', '', dis + ' placeholder="Nomor surat keputusan perpanjangan"'))}
      </div>` : `<div class="empty">${c.absentia ? 'Terdakwa tidak diketahui keberadaannya (perkara desersi in absentia).' : 'Terdakwa tidak ditahan.'}</div>`}</div>${c.tahanan ? foot('s-tahan', 'Simpan perpanjangan') : ''}</div>`;
    } else if (edTab === 'dokumen') {
      const D = ['Laporan Polisi Militer', 'Berita Acara Pemeriksaan (BAP)', 'Berkas perkara & pendapat hukum Oditur', 'Keputusan Penyerahan Perkara (Skeppera)', 'Surat dakwaan', 'Berita acara sidang', 'Surat tuntutan', 'Salinan putusan', 'Berita acara pelaksanaan putusan'];
      const st = [0, 1, 2, 3, 3, 4, 5, 5, 7];
      const extra = MCS.LS.get('mcs2_docs_' + c.id, []);
      h = `<div class="card"><header><h3>Dokumen perkara</h3><span class="aux">PDF · maks. 20 MB · tersimpan terenkripsi</span></header><div class="cb">
        ${ro ? '' : `<div class="drop" id="drop">${I('upload')}<div><b style="color:var(--txt)">Tarik berkas ke sini</b> atau klik untuk memilih</div><div style="font-size:12px;margin-top:2px">Dokumen dipindai otomatis dan diberi watermark</div></div>`}
        <table class="t" style="margin-top:12px"><tbody>${D.map((n, i) => `<tr><td>${I('file')}</td><td>${n}</td><td>${c.st > st[i] || (c.st === st[i] && st[i] < 5) ? `<span class="pill good">Tersedia</span>` : '<span class="pill">Belum ada</span>'}</td></tr>`).join('')}
        ${extra.map((d) => `<tr><td>${I('file')}</td><td>${E(d.n)}<span class="sub">diunggah ${MCS.fmtAgo(d.t)} oleh ${E(d.by)}</span></td><td><span class="pill info">Baru</span></td></tr>`).join('')}</tbody></table></div></div>`;
    } else if (edTab === 'riwayat') {
      const ev = MCS.getAudit().filter((a) => a.target === c.id);
      MCS.TAHAP.forEach((t, i) => { if (c.sd[i]) ev.push({ t: c.sd[i], user: t.actor, action: 'Tahap ' + t.name, detail: '' }); });
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
      commit(c, 'Ubah identitas perkara', 'Uraian/locus/satuan', { title: t, cat: $('f-cat').value, lp: $('f-lp').value, kab, p: +kab.split('.')[0], loc: $('f-loc').value || null, kesatuan: $('f-ksat').value, koneksitas: $('f-kon').value === '1' });
      UI.toast('Identitas perkara disimpan'); editor(c.id);
    });
    on('t-add', () => { c.terdakwa.push({ nama: '', pangkat: MCS.PANGKAT[c.matra][0][0], gol: 'T', nrp: '', umur: 25 }); edBody(c, false); });
    on('s-terdakwa', () => {
      c.terdakwa.forEach((t, i) => { t.pangkat = $('t-pk' + i).value; t.nama = $('t-nm' + i).value || t.nama; t.nrp = $('t-nrp' + i).value; t.umur = +$('t-um' + i).value; t.gol = (MCS.PANGKAT[c.matra].find((p) => p[0] === t.pangkat) || [0, 'T'])[1]; });
      commit(c, 'Ubah data terdakwa', c.terdakwa.length + ' terdakwa'); UI.toast('Data terdakwa disimpan');
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
    on('drop', () => {
      const n = prompt('Nama dokumen (simulasi unggah):', 'Surat perpanjangan penahanan');
      if (!n) return;
      const ex = MCS.LS.get('mcs2_docs_' + c.id, []); ex.unshift({ n, t: Date.now(), by: me.name }); MCS.LS.set('mcs2_docs_' + c.id, ex);
      MCS.audit(me.name, 'Unggah dokumen', c.id, n); UI.toast('Dokumen diunggah dan dipindai'); edBody(c, false);
    });
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
    const ro = MCS.KAB[c.kab] && MCS.COURT[c.court];
    const FIELDS = {
      1: `${field('Tanggal mulai penyidikan', inp('m-tgl', toDateInput(MCS.NOW), 'type="date"'), { req: true })}${field('Penyidik', inp('m-a', '', 'placeholder="Nama penyidik POM"'), { req: true })}`,
      2: `${field('Tanggal pelimpahan berkas', inp('m-tgl', toDateInput(MCS.NOW), 'type="date"'), { req: true })}${field('Nomor berkas perkara', inp('m-a', 'BP-' + (10 + Math.floor(Math.random() * 80)) + '/' + MCS.ROMAN[new Date().getMonth()] + '/' + new Date().getFullYear()), { req: true })}`,
      3: `${field('Nomor Skeppera', inp('m-a', 'Kep/' + (100 + Math.floor(Math.random() * 800)) + '/' + MCS.ROMAN[new Date().getMonth()] + '/' + new Date().getFullYear()), { req: true })}${field('Tanggal Skeppera', inp('m-tgl', toDateInput(MCS.NOW), 'type="date"'), { req: true })}${field('Papera', inp('m-b', c.induk ? 'Pangdam / Danlantamal / Danlanud terkait' : ''), { full: true })}`,
      4: `${field('Nomor register', inp('m-a', `${1 + Math.floor(Math.random() * 300)}-K/PM.${ro.code}/${c.matra}/${MCS.ROMAN[new Date().getMonth()]}/${new Date().getFullYear()}`), { req: true, hint: 'Format nomor register pengadilan militer' })}${field('Tanggal pelimpahan', inp('m-tgl', toDateInput(MCS.NOW), 'type="date"'), { req: true })}${field('Sidang pertama', inp('m-b', toDateInput(MCS.TODAY + 7 * MCS.DAY), 'type="date"'), { req: true })}${field('Jam', sel('m-c', ['09.00', '10.00', '13.00'], '09.00'))}`,
      5: `${field('Tanggal putusan', inp('m-tgl', toDateInput(MCS.NOW), 'type="date"'), { req: true })}${field('Pidana penjara (bulan)', inp('m-a', '12', 'type="number" min="0"'), { req: true, hint: 'Isi 0 untuk putusan bebas/lepas' })}${field('Pidana tambahan', sel('m-b', [['', 'Tidak ada'], ['Dipecat dari dinas militer', 'Pemecatan dari dinas militer (Pasal 26 KUHPM)']], ''), { full: true })}`,
      6: `${field('Jenis upaya hukum', sel('m-a', ['Banding', 'Kasasi', 'Peninjauan kembali'], 'Banding'), { req: true })}${field('Diajukan oleh', sel('m-b', ['Terdakwa', 'Oditur'], 'Terdakwa'))}${field('Tanggal permohonan', inp('m-tgl', toDateInput(MCS.NOW), 'type="date"'), { req: true })}`,
      7: `${field('Tanggal berkekuatan hukum tetap', inp('m-tgl', toDateInput(MCS.NOW), 'type="date"'), { req: true })}${field('Status eksekusi', sel('m-a', ['Menunggu eksekusi', 'Sudah dieksekusi'], 'Menunggu eksekusi'))}`,
    };
    modal(`Lanjut ke tahap ${MCS.TAHAP[to].name}`, MCS.TAHAP[to].long, `<div class="form">${FIELDS[to]}</div>${needsApproval() ? '<div class="smart"><div class="t">' + I('shield') + 'Perlu verifikasi</div>Perubahan tahap akan dikirim ke Admin Otmilti untuk diverifikasi sebelum diterbitkan.</div>' : ''}`, () => {
      const req = $('mbox').querySelectorAll('.f label i');
      let ok = true;
      req.forEach((r) => { const f = r.closest('.f'); const v = f.querySelector('input,select'); if (v && !String(v.value).trim()) { f.classList.add('err'); ok = false; } });
      if (!ok) { $('m-note').textContent = 'Lengkapi isian wajib.'; return false; }
      const t = new Date($('m-tgl').value).getTime() || Date.now();
      const detail = MCS.TAHAP[c.st].name + ' → ' + MCS.TAHAP[to].name + ($('m-a') ? ' · ' + $('m-a').value : '');
      if (needsApproval()) {
        const ap = MCS.getApprovals();
        ap.unshift({ id: 'APR-' + (2000 + ap.length), caseId: c.id, by: me.name + ' (' + me.unit + ')', t: Date.now(), field: 'Tahap', from: MCS.TAHAP[c.st].name, to: MCS.TAHAP[to].name, note: $('m-a') ? $('m-a').value : '', status: 'menunggu', apply: { st: to, t } });
        MCS.saveApprovals(ap); MCS.audit(me.name, 'Ajukan perubahan tahap', c.id, detail);
        UI.toast('Diajukan untuk verifikasi Admin Otmilti'); editor(c.id); renderNav('perkara');
        return;
      }
      applyStage(c, to, t);
      MCS.audit(me.name, 'Perbarui tahap', c.id, detail);
      UI.toast(`Tahap diperbarui: ${MCS.TAHAP[to].name}`); editor(c.id);
    });
  }
  function applyStage(c, to, t, extra = {}) {
    c.sd = c.sd.slice(0, to); c.sd[to] = t; c.st = to;
    if (to === 4) {
      const reg = $('m-a') ? $('m-a').value : c.reg;
      c.reg = reg; const ro = MCS.COURT[c.court];
      c.majelis = c.majelis || ['Letkol Chk (ditetapkan Kadilmil)', 'Mayor Chk —', 'Mayor Chk —'];
      c.panitera = c.panitera || 'Kepaniteraan ' + ro.short;
      const first = $('m-b') ? new Date($('m-b').value + 'T' + ($('m-c') ? $('m-c').value.replace('.', ':') : '09:00')).getTime() : t + 7 * MCS.DAY;
      c.sidang = [{ t: first, agenda: 'Pembacaan surat dakwaan', status: 'jadwal', ruang: 'Ruang Sidang Utama' }];
    }
    if (to === 5) {
      const bln = +$('m-a').value;
      c.putusan = { t, amar: bln ? 'Pidana penjara ' + MCS.fmtBulan(bln) : 'Bebas', pidana: bln, tambahan: $('m-b').value || null, uangPengganti: 0, tuntutan: '—' };
      c.sidang.forEach((s) => { if (s.status === 'jadwal') s.status = 'selesai'; });
    }
    if (to === 6) c.upaya = { jenis: $('m-a').value, oleh: $('m-b').value, t };
    if (to === 7) { c.eksekusi = $('m-a').value; c.tahanan = null; }
    Object.assign(c, extra);
    commit(c, null, null);
  }
  function scheduleModal(c) {
    modal('Jadwalkan sidang', `${c.reg} · ${MCS.terdakwaLabel(c.terdakwa[0])}`, `<div class="form">
      ${field('Tanggal', inp('m-tgl', toDateInput(MCS.TODAY + 7 * MCS.DAY), 'type="date"'), { req: true })}
      ${field('Jam', sel('m-jam', ['09.00', '09.30', '10.00', '10.30', '13.00', '14.00'], '09.00'))}
      ${field('Agenda', sel('m-ag', MCS.AGENDA, 'Pemeriksaan saksi'), { full: true })}
      ${field('Ruang sidang', sel('m-ru', ['Ruang Sidang Utama', 'Ruang Sidang I', 'Ruang Sidang II'], 'Ruang Sidang Utama'))}
      ${field('Pemberitahuan', sel('m-nt', ['Kirim ke Oditur, terdakwa & penasihat hukum', 'Tanpa pemberitahuan'], 'Kirim ke Oditur, terdakwa & penasihat hukum'))}
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
  const WSTEPS = [['Laporan & lokasi', 'Sumber dan locus delicti'], ['Terdakwa', 'Identitas & satuan'], ['Pasal', 'Klasifikasi & sangkaan'], ['Kerugian & penahanan', 'Bila ada'], ['Tinjau & kirim', 'Periksa kembali']];
  function wizard() {
    crumb(['Perkara', '#perkara'], ['Input perkara baru']);
    if (!can('Input perkara baru')) { page.innerHTML = '<div class="empty">Peran Anda tidak dapat menginput perkara baru.</div>'; return; }
    if (!wz) {
      const defKab = scoped[0] ? scoped[scoped.length - 1].kab : MCS.KABS[0].id;
      wz = { step: 0, d: { lp: 'LP-' + (10 + Math.floor(Math.random() * 150)) + '/A-' + (1 + Math.floor(Math.random() * 40)) + '/' + MCS.ROMAN[new Date().getMonth()] + '/' + new Date().getFullYear() + '/Idik', tgl: toDateInput(MCS.NOW), tglk: toDateInput(MCS.NOW - 2 * MCS.DAY), sumber: 'Laporan Polisi Militer', p: MCS.KAB[defKab].p, kab: defKab, loc: '', title: '', matra: 'AD', terdakwa: [{ pangkat: 'Serda', nama: '', nrp: '', jabatan: '', kesatuan: '', ditahan: '0' }], cat: '', arts: [], kerugian: '', catatan: '' } };
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
    const court = courtFor(d);
    let body = '';
    if (s === 0) body = `<div class="form">
      ${field('Nomor laporan polisi militer', inp('w-lp', d.lp), { req: true })}
      ${field('Sumber perkara', sel('w-sumber', ['Laporan Polisi Militer', 'Pelimpahan dari Ankum', 'Pengaduan masyarakat', 'Temuan Itjen / audit'], d.sumber))}
      ${field('Tanggal laporan', inp('w-tgl', d.tgl, 'type="date"'), { req: true })}
      ${field('Tanggal kejadian (tempus delicti)', inp('w-tglk', d.tglk, 'type="date"'), { req: true, hint: new Date(d.tglk).getTime() < new Date('2026-01-02').getTime() ? 'Sebelum 2 Jan 2026 — berlaku KUHP lama' : 'Sejak 2 Jan 2026 — berlaku KUHP 2023 (UU 1/2023)' })}
      ${field('Provinsi', sel('w-prov', MCS.provIds.map((p) => [p, MCS.PROV[p]]), d.p), { req: true })}
      ${field('Kabupaten/kota', sel('w-kab', MCS.kabsOf(d.p).map((k) => [k.id, k.name]), d.kab), { req: true })}
      ${field('Lokasi detail', inp('w-loc', d.loc, 'placeholder="Kecamatan, desa, alamat"'), { full: true })}
      ${field('Uraian singkat perkara', inp('w-title', d.title, 'placeholder="Contoh: Meninggalkan kesatuan tanpa izin lebih dari 30 hari"'), { full: true, req: true })}
    </div>`;
    else if (s === 1) body = `${field('Matra', `<div class="chipset">${MCS.MATRA.map((m) => `<span class="chk ${d.matra === m.id ? 'on' : ''}" data-m="${m.id}">${m.name}</span>`).join('')}</div>`)}
      <div style="height:14px"></div>${d.terdakwa.map((t, i) => `<div class="tcard"><header>Terdakwa ${i + 1}${i ? `<button class="btn ghost" data-rm="${i}">${I('trash')}</button>` : ''}</header><div class="form">
        ${field('Pangkat', sel('w-pk' + i, MCS.PANGKAT[d.matra].map((p) => [p[0], p[0] + ' — ' + MCS.GOL[p[1]]]), t.pangkat), { req: true })}
        ${field('Nama lengkap', inp('w-nm' + i, t.nama), { req: true })}
        ${field('NRP', inp('w-nrp' + i, t.nrp, 'inputmode="numeric"'), { req: true })}
        ${field('Jabatan', inp('w-jb' + i, t.jabatan))}
        ${field('Satuan', inp('w-ks' + i, t.kesatuan, 'placeholder="' + (d.matra === 'AD' ? 'Kodim / Yonif / Korem' : d.matra === 'AL' ? 'Lantamal / Lanal / KRI' : 'Lanud / Satrad') + '"'), { req: true })}
        ${field('Penahanan', sel('w-th' + i, [['0', 'Tidak ditahan'], ['1', 'Ditahan']], t.ditahan))}
      </div></div>`).join('')}<button class="btn" id="w-addt">${I('plus')}Tambah terdakwa</button>`;
    else if (s === 2) {
      const rec = d.cat ? new Set(MCS.CAT[d.cat].arts.flatMap((a) => a[0])) : new Set();
      body = `${field('Klasifikasi tindak pidana', sel('w-cat', [['', 'Pilih klasifikasi…']].concat(MCS.CATS.map((c) => [c.id, c.name])), d.cat), { req: true })}
        ${d.cat ? `<div class="fs" style="margin-top:16px"><h4>Pasal yang disarankan</h4><div class="chipset">${MCS.ARTS.filter((a) => rec.has(a.id)).map((a) => `<span class="chk ${d.arts.includes(a.id) ? 'on' : ''}" data-a="${a.id}" title="${E(a.desc)}">${MCS.artLabel(a.id)}</span>`).join('')}</div></div>
        <div class="fs" style="margin-top:16px"><h4>Pasal lain (junto)</h4><div class="chipset">${MCS.ARTS.filter((a) => !rec.has(a.id)).map((a) => `<span class="chk ${d.arts.includes(a.id) ? 'on' : ''}" data-a="${a.id}" title="${E(a.desc)}">${MCS.artLabel(a.id)}</span>`).join('')}</div></div>` : '<div class="hint" style="margin-top:10px;color:var(--txt-4)">Pilih klasifikasi untuk melihat pasal yang lazim digunakan.</div>'}`;
    } else if (s === 3) body = `<div class="form">
      ${field(d.cat && MCS.CAT[d.cat].kn === 'korban' ? 'Kerugian korban (Rp)' : 'Kerugian keuangan negara (Rp)', inp('w-rugi', d.kerugian, 'type="number" min="0" placeholder="0"'), { hint: d.cat && MCS.CAT[d.cat].kn ? 'Wajib untuk klasifikasi ' + MCS.CAT[d.cat].name : 'Kosongkan bila tidak ada kerugian' })}
      ${field('Catatan untuk Oditurat', '<textarea id="w-cat-n" placeholder="Barang bukti, saksi kunci, dsb.">' + E(d.catatan) + '</textarea>', { full: true })}
    </div>`;
    else body = `<div class="sum">${[
      ['Nomor LP', d.lp], ['Sumber', d.sumber], ['Tanggal laporan', MCS.fmtDate(new Date(d.tgl).getTime())], ['Tempus delicti', MCS.fmtDate(new Date(d.tglk).getTime())],
      ['Locus delicti', (d.loc ? d.loc + ', ' : '') + MCS.KAB[d.kab].name + ', ' + MCS.PROV[d.p]], ['Uraian', d.title],
      ['Terdakwa', d.terdakwa.map((t) => t.pangkat + ' ' + t.nama + ' (NRP ' + t.nrp + ')').join('; ')], ['Matra', MCS.matraName(d.matra)],
      ['Klasifikasi', d.cat ? MCS.CAT[d.cat].name : '—'], ['Pasal', d.arts.map(MCS.artLabel).join(' jo. ') || '—'], ['Kerugian', d.kerugian ? MCS.fmtRp(+d.kerugian) : '—'],
      ['Pengadilan berwenang', court.name], ['Oditurat', MCS.otmilOf(court)],
    ].map(([k, v]) => `<div class="row"><span>${k}</span><b>${E(v)}</b></div>`).join('')}</div>
      <label style="display:flex;gap:10px;align-items:flex-start;margin-top:16px;font-size:12.5px;color:var(--txt-2);cursor:pointer"><input type="checkbox" id="w-ok" style="margin-top:3px" /> Saya menyatakan data yang diinput sesuai dokumen sumber dan dapat dipertanggungjawabkan.</label>`;

    page.innerHTML = `<div class="ph"><div><h1>Input perkara baru</h1><p>Perkara baru masuk sebagai tahap <b style="color:var(--txt-2)">Laporan</b> dan tampil di Command Center setelah diverifikasi.</p></div><div class="acts"><button class="btn ghost" id="w-reset">Batalkan</button></div></div>
      <div class="wiz">
        <div class="wsteps">${WSTEPS.map(([n, sub], i) => `<div class="ws ${i === s ? 'on' : i < s ? 'done' : ''}" data-i="${i}"><i>${i < s ? '✓' : i + 1}</i><div><b>${n}</b><span>${sub}</span></div></div>`).join('')}</div>
        <div class="card"><header><h3>${s + 1}. ${WSTEPS[s][0]}</h3><span class="aux">Langkah ${s + 1} dari ${WSTEPS.length}</span></header><div class="cb" id="w-body">${body}</div>
          <div class="form-foot"><span class="note" id="w-note">${I('shield')}Draf tersimpan otomatis</span>${s ? '<button class="btn" id="w-prev">← Sebelumnya</button>' : ''}<button class="btn primary" id="w-next">${s === WSTEPS.length - 1 ? 'Kirim perkara' : 'Lanjut →'}</button></div></div>
        <div class="aside"><div class="card"><div class="mini-map" id="w-map"></div><div class="cb">
          <div class="sum"><div class="row"><span>Locus</span><b>${MCS.KAB[d.kab].name}</b></div><div class="row"><span>Terdakwa</span><b>${d.terdakwa.length} orang</b></div><div class="row"><span>Pasal</span><b>${d.arts.length ? d.arts.map(MCS.artLabel).join(', ') : '—'}</b></div></div>
          <div class="smart"><div class="t">${I('checkc')}Ditentukan otomatis</div>Perkara akan ditangani <b>${court.name}</b> dan <b>${MCS.otmilOf(court)}</b>${court.level === 'dilmilti' ? ' — tingkat pertama karena terdakwa berpangkat Mayor ke atas.' : ' berdasarkan daerah hukum locus delicti.'}</div>
        </div></div></div>
      </div>`;
    requestAnimationFrame(() => MCSMap.miniMap($('w-map'), d.kab));
    // binding
    const keep = () => {
      if (s === 0) Object.assign(d, { lp: $('w-lp').value, sumber: $('w-sumber').value, tgl: $('w-tgl').value, tglk: $('w-tglk').value, p: +$('w-prov').value, kab: $('w-kab').value, loc: $('w-loc').value, title: $('w-title').value });
      if (s === 1) d.terdakwa.forEach((t, i) => Object.assign(t, { pangkat: $('w-pk' + i).value, nama: $('w-nm' + i).value, nrp: $('w-nrp' + i).value, jabatan: $('w-jb' + i).value, kesatuan: $('w-ks' + i).value, ditahan: $('w-th' + i).value }));
      if (s === 2) d.cat = $('w-cat').value;
      if (s === 3) { d.kerugian = $('w-rugi').value; d.catatan = $('w-cat-n').value; }
    };
    const validate = () => {
      let ok = true;
      $('w-body').querySelectorAll('.f').forEach((f) => { const req = f.querySelector('label i'); const v = f.querySelector('input,select'); f.classList.remove('err'); if (req && v && !String(v.value).trim()) { f.classList.add('err'); ok = false; } });
      if (s === 2 && !d.arts.length) { ok = false; $('w-note').innerHTML = '<span style="color:var(--crit-txt)">Pilih minimal satu pasal.</span>'; }
      if (s === 3 && d.cat && MCS.CAT[d.cat].kn && !+d.kerugian) { ok = false; $('w-rugi').closest('.f').classList.add('err'); }
      if (s === 4 && !$('w-ok').checked) { ok = false; $('w-note').innerHTML = '<span style="color:var(--crit-txt)">Centang pernyataan untuk mengirim.</span>'; }
      if (!ok && s < 2) $('w-note').innerHTML = '<span style="color:var(--crit-txt)">Lengkapi isian bertanda *</span>';
      return ok;
    };
    if ($('w-prov')) $('w-prov').onchange = (e) => { keep(); d.p = +e.target.value; d.kab = MCS.kabsOf(d.p)[0].id; renderWizard(); };
    if ($('w-kab')) $('w-kab').onchange = () => { keep(); renderWizard(); };
    if ($('w-tglk')) $('w-tglk').onchange = () => { keep(); renderWizard(); };
    if ($('w-cat')) $('w-cat').onchange = () => { keep(); d.arts = d.cat ? MCS.CAT[d.cat].arts[0][0].slice() : []; renderWizard(); };
    page.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { keep(); d.matra = b.dataset.m; d.terdakwa.forEach((t) => { if (!MCS.PANGKAT[d.matra].some((p) => p[0] === t.pangkat)) t.pangkat = MCS.PANGKAT[d.matra][6][0]; }); renderWizard(); }));
    page.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => { const a = b.dataset.a; d.arts = d.arts.includes(a) ? d.arts.filter((x) => x !== a) : d.arts.concat(a); b.classList.toggle('on'); keep(); }));
    page.querySelectorAll('select[id^="w-pk"]').forEach((x) => (x.onchange = () => { keep(); renderWizard(); }));
    page.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { keep(); d.terdakwa.splice(+b.dataset.rm, 1); renderWizard(); }));
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
      kerugian: +d.kerugian || 0, pulih: 0, kn: MCS.CAT[d.cat].kn, absentia: false, ditahan: d.terdakwa.some((x) => x.ditahan === '1'), koneksitas: false, seed: MCS.hash(d.lp),
    };
    MCS.enrich(c);
    c.lp = d.lp; c.verified = !needsApproval(); c.updated = Date.now(); c.updatedBy = me.unit;
    MCS.saveCase(c);
    MCS.audit(me.name, 'Input perkara baru', c.id, d.lp + ' · ' + MCS.CAT[d.cat].name);
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
    page.innerHTML = `<div class="ph"><div><h1>Agenda sidang</h1><p>${MCS.BULAN_L[m]} ${y} · ${MCS.fmt(hs.filter((h) => new Date(h.s.t).getMonth() === m).length)} sidang dalam cakupan ${E(scopeLabel())}</p></div>
      <div class="acts"><button class="btn" id="cp">←</button><button class="btn" id="ct">Bulan ini</button><button class="btn" id="cn">→</button></div></div>
      <div class="g3"><div class="card" style="overflow:hidden"><div class="cal">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => `<div class="h">${d}</div>`).join('')}
        ${days.map((t) => { const L = byDay.get(t) || []; const d = new Date(t); return `<div class="d ${d.getMonth() !== m ? 'out' : ''} ${t === MCS.TODAY ? 'today' : ''} ${t === calSel ? 'sel' : ''}" data-t="${t}"><div class="n"><b>${d.getDate()}</b>${L.length ? `<em>${L.length} sidang</em>` : ''}</div>${L.slice(0, 3).map(({ c, s }) => `<div class="ev ${s.t < MCS.NOW ? 'past' : ''}">${MCS.fmtTime(s.t)} ${E(c.terdakwa[0].pangkat + ' ' + c.terdakwa[0].nama.split(' ')[0])}</div>`).join('')}${L.length > 3 ? `<div class="mo">+${L.length - 3} lainnya</div>` : ''}</div>`; }).join('')}</div></div>
        <div class="card"><header><h3>${MCS.fmtDay(calSel)}${calSel !== MCS.TODAY ? '' : ', ' + MCS.fmtDate(calSel)}</h3><span class="aux">${selList.length} sidang</span></header>
          <div>${selList.length ? selList.map(({ c, s }) => `<div class="task" data-href="#perkara/${c.id}" data-tab="sidang"><span class="ic tm">${MCS.fmtTime(s.t)}</span><div><b>${s.agenda}</b><span>${E(MCS.terdakwaLabel(c.terdakwa[0]))} · ${MCS.COURT[c.court].short.replace('Dilmil ', '')} · ${s.ruang}</span></div>${s.status === 'tunda' ? '<span class="pill warn">Ditunda</span>' : ''}</div>`).join('') : '<div class="empty">Tidak ada sidang pada hari ini.</div>'}</div></div></div>`;
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
    if (!can('Menyetujui pembaruan (verifikasi)')) { page.innerHTML = '<div class="empty">Menu ini untuk Admin Otmilti dan Admin Pusat.</div>'; return; }
    const all = MCS.getApprovals().filter((a) => me.role === 'PUSAT' || (MCS.byId(a.caseId) && inScope(MCS.byId(a.caseId))));
    page.innerHTML = `<div class="ph"><div><h1>Persetujuan</h1><p>Prinsip empat mata: pembaruan dari Oditurat dan Penyidik diverifikasi sebelum diterbitkan ke Command Center.</p></div></div>
      <div class="card">${all.length ? all.map((a) => { const c = MCS.byId(a.caseId); return `<div class="ap ${a.status !== 'menunggu' ? 'done' : ''}" data-id="${a.id}">
        <div><div class="h"><span class="mono">${a.id}</span>·<b><a href="#perkara/${a.caseId}">${c ? c.reg || c.id : a.caseId}</a></b>·<span>${c ? E(MCS.terdakwaLabel(c.terdakwa[0])) : ''}</span>·<span>diajukan ${E(a.by)} · ${MCS.fmtAgo(a.t)}</span>${a.status !== 'menunggu' ? `<span class="pill ${a.status === 'disetujui' ? 'good' : 'crit'}">${a.status}</span>` : ''}</div>
          <div class="diff"><span class="k">${E(a.field)}</span><span class="a">${E(a.from)}</span><span style="color:var(--txt-4)">→</span><span class="b">${E(a.to)}</span></div>
          ${a.note ? `<div class="note">Catatan: ${E(a.note)}</div>` : ''}</div>
        <div class="btns">${a.status === 'menunggu' ? `<button class="btn danger" data-r="${a.id}">${I('x')}Tolak</button><button class="btn primary" data-ok="${a.id}">${I('check')}Setujui</button>` : ''}</div></div>`; }).join('') : '<div class="empty">Tidak ada pengajuan.</div>'}</div>`;
    const decide = (id, ok) => {
      const ap = MCS.getApprovals(); const a = ap.find((x) => x.id === id);
      let alasan = '';
      if (!ok) { alasan = prompt('Alasan penolakan (dikirim ke pengaju):', 'Dokumen pendukung belum lengkap'); if (alasan === null) return; }
      a.status = ok ? 'disetujui' : 'ditolak';
      const c = MCS.byId(a.caseId);
      if (ok && c) {
        if (a.apply && a.field === 'Tahap') { c.sd = c.sd.slice(0, a.apply.st); c.sd[a.apply.st] = a.apply.t; c.st = a.apply.st; }
        c.verified = true; commit(c, null, null);
      }
      MCS.saveApprovals(ap);
      MCS.audit(me.name, ok ? 'Setujui perubahan' : 'Tolak perubahan', a.caseId, a.field + ': ' + a.to + (alasan ? ' · ' + alasan : ''));
      const el = page.querySelector(`.ap[data-id="${id}"]`);
      el.animate([{ opacity: 1 }, { opacity: 0.4, transform: 'translateX(8px)' }], { duration: 280, fill: 'forwards' });
      setTimeout(() => { persetujuan(); renderNav('persetujuan'); }, 300);
      UI.toast(ok ? 'Perubahan disetujui dan diterbitkan' : 'Perubahan ditolak');
    };
    page.querySelectorAll('[data-ok]').forEach((b) => (b.onclick = () => decide(b.dataset.ok, true)));
    page.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => decide(b.dataset.r, false)));
  }

  // ================= Laporan =================
  const RPT = [
    ['rekap', 'Rekapitulasi perkara per pengadilan', 'Jumlah perkara per tahap dan pengadilan', 'chart'],
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
      const g = d3.group(scoped, (c) => c.court);
      const rows = [...g].sort((a, b) => b[1].length - a[1].length);
      table = `<table><thead><tr><th>Pengadilan</th>${MCS.TAHAP.map((t) => `<th class="r">${t.name}</th>`).join('')}<th class="r">Jumlah</th></tr></thead><tbody>${rows.map(([k, l]) => { const s = MCS.stats(l); return `<tr><td>${MCS.COURT[k].short}</td>${s.byStage.map((v) => `<td class="r">${MCS.fmt(v)}</td>`).join('')}<td class="r"><b>${MCS.fmt(l.length)}</b></td></tr>`; }).join('')}</tbody></table>`;
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
    page.innerHTML = `<div class="ph"><div><h1>Laporan</h1><p>Laporan berkala dengan format baku, siap ditandatangani pejabat berwenang.</p></div>
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
    page.innerHTML = `<div class="ph"><div><h1>Pasal & undang-undang</h1><p>Rujukan pasal yang dapat dipilih saat input perkara. Perubahan hanya oleh Admin Pusat.</p></div>
      <div class="acts">${can('Kelola master pasal & satuan') ? `<button class="btn primary" id="pa">${I('plus')}Tambah pasal</button>` : ''}</div></div>
      <div class="tw"><table class="t"><thead><tr><th>Pasal</th><th>Undang-undang</th><th>Uraian</th><th>Ancaman</th><th>Padanan KUHP 2023</th><th class="r">Dipakai</th></tr></thead>
      <tbody>${MCS.ARTS.map((a) => `<tr><td><b style="font-weight:500">${a.pasal}</b></td><td>${MCS.LAW[a.law].name}<span class="sub">${MCS.LAW[a.law].full.slice(0, 48)}${MCS.LAW[a.law].full.length > 48 ? '…' : ''}</span></td><td style="max-width:340px">${a.desc}</td><td>${a.threat}</td><td>${a.baru ? a.baru + ' UU 1/2023' : '<span class="muted">—</span>'}</td><td class="r num">${MCS.fmt(cnt[a.id] || 0)}</td></tr>`).join('')}</tbody></table></div>
      <p class="muted" style="font-size:12px;margin-top:12px">Padanan KUHP 2023 bersifat indikatif dan perlu divalidasi tim hukum Babinkum TNI sebelum produksi.</p>`;
    if ($('pa')) $('pa').onclick = () => modal('Tambah pasal', 'Pasal baru tersedia untuk semua instansi setelah disimpan', `<div class="form">${field('Undang-undang', sel('m-l', MCS.LAWS.map((l) => [l.id, l.name])), { req: true })}${field('Pasal', inp('m-p', '', 'placeholder="Pasal 87 ayat (1) ke-2"'), { req: true })}${field('Uraian', inp('m-d'), { full: true, req: true })}${field('Ancaman pidana', inp('m-t'))}${field('Padanan KUHP 2023', inp('m-b'))}</div>`, () => { UI.toast('Pasal ditambahkan ke data induk'); });
  }
  function satuan() {
    crumb(['Data induk'], ['Pengadilan & oditurat']);
    const g = d3.rollup(MCS.cases, (v) => [v.length, v.filter((c) => c.st < 7).length], (c) => c.court);
    const row = (c) => { const [n, a] = g.get(c.id) || [0, 0]; return `<tr><td><b style="font-weight:500">${c.name}</b><span class="sub">${c.level === 'dilmilti' ? 'Tingkat banding & tingkat pertama perwira menengah ke atas' : 'Daerah hukum: ' + (c.kabs ? 'sebagian Jawa Timur (eks-Karesidenan Madiun & Kediri)' : c.prov.map((p) => MCS.PROV[p]).join(', '))}</span></td><td>${MCS.otmilOf(c)}</td><td>${c.level === 'dilmil' ? MCS.COURT[c.tinggi].short : MCS.DILMILTAMA.name}</td><td class="r num">${MCS.fmt(n)}</td><td class="r num">${MCS.fmt(a)}</td></tr>`; };
    page.innerHTML = `<div class="ph"><div><h1>Pengadilan & oditurat</h1><p>Susunan sesuai PP No. 22/2025 dan PP No. 23/2025. Daerah hukum di luar ketentuan PP tersebut bersifat indikatif.</p></div></div>
      <div class="tw"><table class="t"><thead><tr><th>Pengadilan</th><th>Oditurat pasangan</th><th>Pengadilan atasan</th><th class="r">Perkara</th><th class="r">Belum inkracht</th></tr></thead>
      <tbody><tr><td colspan="5" style="background:var(--bg-2);font-size:11.5px;color:var(--txt-3);font-weight:600">PENGADILAN MILITER TINGGI</td></tr>${MCS.DILMILTI.map(row).join('')}
      <tr><td colspan="5" style="background:var(--bg-2);font-size:11.5px;color:var(--txt-3);font-weight:600">PENGADILAN MILITER</td></tr>${MCS.DILMIL.map(row).join('')}</tbody></table></div>`;
  }

  // ================= Pengguna & akses =================
  let userTab = 'users';
  function pengguna() {
    crumb(['Sistem'], ['Pengguna & hak akses']);
    users = MCS.getUsers();
    page.innerHTML = `<div class="ph"><div><h1>Pengguna & hak akses</h1><p>Akses berbasis peran dan wilayah. Login wajib dengan autentikasi dua faktor.</p></div>
      <div class="acts"><button class="btn primary" id="ua">${I('plus')}Tambah pengguna</button></div></div>
      <div class="views"><button data-t="users" class="${userTab === 'users' ? 'on' : ''}">Pengguna<em>${users.length}</em></button><button data-t="roles" class="${userTab === 'roles' ? 'on' : ''}">Peran & izin<em>${MCS.ROLES.length}</em></button></div>
      <div id="ub"></div>`;
    page.querySelectorAll('.views button').forEach((b) => (b.onclick = () => { userTab = b.dataset.t; pengguna(); }));
    if (userTab === 'users') {
      $('ub').innerHTML = `<div class="tw"><table class="t"><thead><tr><th>Nama</th><th>Nama pengguna</th><th>Peran</th><th>Instansi / cakupan</th><th>Status</th><th>Aktif terakhir</th><th></th></tr></thead><tbody>${users.map((u) => `<tr>
        <td><div style="display:flex;gap:10px;align-items:center"><span class="av" style="width:30px;height:30px;border-radius:8px;display:grid;place-items:center;background:var(--panel-3);font-size:11px;font-weight:600">${initials(u.name)}</span><b style="font-weight:500">${E(u.name)}</b></div></td>
        <td class="mono">${u.username}</td><td>${MCS.ROLES.find((r) => r.id === u.role).name}</td><td>${E(u.unit)}</td>
        <td>${u.status === 'Aktif' ? '<span class="pill good">Aktif</span>' : '<span class="pill">Nonaktif</span>'}</td><td>${MCS.fmtAgo(u.last)}</td>
        <td class="r"><button class="btn ghost" data-tg="${u.id}">${u.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button></td></tr>`).join('')}</tbody></table></div>`;
      page.querySelectorAll('[data-tg]').forEach((b) => (b.onclick = () => { const u = users.find((x) => x.id === b.dataset.tg); u.status = u.status === 'Aktif' ? 'Nonaktif' : 'Aktif'; MCS.saveUsers(users); MCS.audit(me.name, 'Ubah status pengguna', u.username, u.status); UI.toast(u.username + ' ' + u.status.toLowerCase()); pengguna(); }));
    } else {
      $('ub').innerHTML = `<div class="roles" style="margin-bottom:16px">${MCS.ROLES.map((r) => `<div class="role-card"><b>${r.name}</b><span>${r.unit}</span><span style="margin-top:6px;color:var(--txt-2)">${r.desc}</span><span style="margin-top:6px">Cakupan: ${r.scope}</span></div>`).join('')}</div>
        <div class="tw"><table class="t mx"><thead><tr><th>Izin</th>${MCS.ROLES.map((r) => `<th>${r.name}</th>`).join('')}</tr></thead><tbody>${MCS.PERMS.map(([p, v]) => `<tr><td>${p}</td>${v.map((x) => `<td><span class="dotc ${x ? 'y' : 'n'}">${x ? I('check') : '—'}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    $('ua').onclick = () => modal('Tambah pengguna', 'Undangan aktivasi dikirim ke email dinas', `<div class="form">${field('Nama lengkap & pangkat', inp('m-n'), { full: true, req: true })}${field('Email dinas', inp('m-e', '', 'placeholder="nama@tni.mil.id"'), { req: true })}${field('Peran', sel('m-r', MCS.ROLES.map((r) => [r.id, r.name])), { req: true })}${field('Instansi', inp('m-u', '', 'placeholder="Oditurat Militer …"'), { full: true, req: true })}</div>`, () => {
      if (!$('m-n').value.trim() || !$('m-u').value.trim()) { $('m-note').textContent = 'Lengkapi isian wajib.'; return false; }
      users.push({ id: 'U-' + String(users.length + 1).padStart(3, '0'), name: $('m-n').value, username: ($('m-e').value.split('@')[0] || 'pengguna.baru'), role: $('m-r').value, unit: $('m-u').value, status: 'Aktif', last: Date.now() });
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
    page.innerHTML = `<div class="ph"><div><h1>Log audit</h1><p>Seluruh akses dan perubahan data tercatat permanen (append-only) untuk pengawasan Itjen TNI.</p></div><div class="acts"><button class="btn" id="ax">${I('download')}Ekspor</button></div></div>
      <div class="toolbar"><input class="input grow" id="aq" placeholder="Cari pengguna, aksi, nomor perkara…" value="${E(auditQ)}" /></div>
      <div class="tw"><table class="t"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Objek</th><th>Keterangan</th></tr></thead><tbody>${log.map((a) => `<tr class="${MCS.byId(a.target) ? 'click' : ''}" ${MCS.byId(a.target) ? `data-href="#perkara/${a.target}"` : ''}><td class="num" style="white-space:nowrap">${MCS.fmtDate(a.t, true)}</td><td>${E(a.user)}</td><td>${E(a.action)}</td><td class="mono">${E(a.target)}</td><td style="color:var(--txt-2)">${E(a.detail)}</td></tr>`).join('')}</tbody></table></div>`;
    let tq; $('aq').oninput = (e) => { clearTimeout(tq); tq = setTimeout(() => { auditQ = e.target.value; audit(); $('aq').focus(); $('aq').setSelectionRange(99, 99); }, 250); };
    $('ax').onclick = () => UI.toast('Log audit diekspor (CSV, ditandatangani hash)');
    bindHref();
  }

  // ================= Pencarian & notifikasi =================
  function quick() {
    const q = $('qs-input').value.trim().toLowerCase();
    const res = [];
    if (q.length >= 2) for (let i = scoped.length - 1; i >= 0 && res.length < 10; i--) {
      const c = scoped[i];
      if ((c.id + ' ' + (c.reg || '') + ' ' + c.lp + ' ' + c.title + ' ' + c.kesatuan + ' ' + c.terdakwa.map((t) => MCS.terdakwaLabel(t) + ' ' + t.nrp).join(' ')).toLowerCase().includes(q)) res.push(c);
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
