/* =====================================================================
   MCS — Daftar perkara (Command Center)
   Mengikuti saringan dashboard yang aktif (wilayah, Kejati, periode, matra).
   Tampilan dibuat ringkas: satu baris per perkara, rincian ada di berkas.
   ===================================================================== */
window.CaseList = (function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const E = MCS.esc;
  const PAGE = 25;
  // tab: 'all' | 'proses' | 'done' ; stageF: '' atau nomor tahap 0..7
  let tab = 'all', stageF = '', jenis = '', cat = '', q = '', sort = 'upd', page = 1;

  const scopeOf = (F) => {
    const parts = [];
    if (F.kejati) parts.push(MCS.KJ[F.kejati].name);
    else if (F.region && F.region !== 'ID') parts.push(MCS.depth(F.region) === 1 ? 'Provinsi ' + MCS.regionName(F.region) : MCS.regionName(F.region));
    else parts.push('Nasional');
    if (F.year) parts.push(F.year);
    if (F.matra) parts.push(MCS.matraName(F.matra));
    return parts.join(' · ');
  };
  // perkara dalam cakupan dashboard (tanpa saringan yang diatur di halaman ini)
  const baseList = () => MCS.filter({ ...App.filter, stage: '', cat: '', jenis: '' });

  function open(preset) {
    const F = App.filter;
    jenis = F.jenis || ''; cat = F.cat || ''; q = ''; sort = 'upd'; page = 1; tab = 'all';
    stageF = F.stage !== '' && F.stage != null ? +F.stage : '';
    if (preset === 'proses') tab = 'proses';
    else if (preset === 'koneksitas') jenis = 'koneksitas';
    $('cl-q').value = '';
    $('cl-sort').value = sort;
    $('cl-cat').value = cat;
    render();
    UI.open('caselist');
    setTimeout(() => $('cl-q').focus(), 120);
  }

  const inTab = (c) => (tab === 'all' ? true : tab === 'proses' ? c.st < 7 : c.st === 7) && (stageF === '' || c.st === stageF);

  function render() {
    const F = App.filter;
    const scoped = baseList().filter((c) => (!jenis || c.jenis === jenis) && (!cat || c.cat === cat));
    const ql = q.trim().toLowerCase();
    const searched = ql ? scoped.filter((c) => (c.id + ' ' + (c.reg || '') + ' ' + c.lp + ' ' + c.title + ' ' + c.kesatuan + ' ' + c.terdakwa.map((t) => MCS.terdakwaLabel(t) + ' ' + t.nrp).join(' ') + ' ' + c.sipil.map((t) => t.nama).join(' ')).toLowerCase().includes(ql)) : scoped;
    const rows = searched.filter(inTab);
    const ns = (c) => (MCS.nextSidang(c) || { t: Infinity }).t;
    const S = { upd: (a, b) => b.updated - a.updated, new: (a, b) => b.d - a.d, old: (a, b) => a.sd[a.st] - b.sd[b.st], rugi: (a, b) => b.kerugian - a.kerugian, sidang: (a, b) => ns(a) - ns(b) };
    rows.sort(S[sort]);

    // judul singkat; ringkasan angka sudah ada di dashboard
    $('cl-scope').textContent = scopeOf(F);
    $('cl-title').textContent = MCS.fmt(rows.length) + ' perkara';
    $('cl-sum').innerHTML = '';

    // tab: hanya tiga pilihan; tahap tertentu lewat pilihan "Tahap"
    const base = searched.filter((c) => stageF === '' || c.st === stageF);
    const TABS = [['all', 'Semua', base.length], ['proses', 'Berjalan', base.filter((c) => c.st < 7).length], ['done', 'Selesai', base.filter((c) => c.st === 7).length]];
    $('cl-tabs').innerHTML = TABS.map(([k, n, v]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${n}<em>${MCS.fmt(v)}</em></button>`).join('');
    $('cl-tabs').querySelectorAll('button').forEach((b) => (b.onclick = () => { tab = b.dataset.t; page = 1; render(); }));
    $('cl-stage').value = String(stageF);

    // baris: satu baris per perkara, rincian lain ada di tooltip dan di berkas
    const pages = Math.max(1, Math.ceil(rows.length / PAGE));
    page = Math.min(page, pages);
    const slice = rows.slice((page - 1) * PAGE, page * PAGE);
    $('cl-rows').innerHTML = slice.length ? slice.map((c, i) => {
      const n = MCS.nextSidang(c);
      const lama = Math.max(0, Math.round((MCS.NOW - c.sd[c.st]) / MCS.DAY));
      const extra = c.terdakwa.length - 1;
      return `<tr data-id="${c.id}" title="${E(c.title)}" style="animation-delay:${Math.min(i, 20) * 10}ms">
        <td><span class="mono">${c.reg || c.lp}</span><span class="sub">${MCS.KJ[c.kejati].short}${c.verified ? '' : ' · <span class="w">belum diverifikasi</span>'}</span></td>
        <td><b>${E(MCS.terdakwaLabel(c.terdakwa[0]))}</b>${extra > 0 ? ` <span class="muted">+${extra}</span>` : ''}<span class="sub">${E(c.kesatuan)}</span></td>
        <td>${MCS.CAT[c.cat].name}${c.jenis === 'koneksitas' ? ' <span class="ktag">Koneksitas</span>' : ''}</td>
        <td title="${c.st < 7 ? lama + ' hari di tahap ini' : ''}">${UI.stagePill(c.st)}</td>
        <td>${n ? MCS.fmtDay(n.t) : '<span class="muted">—</span>'}</td>
        <td class="r" title="${c.kerugian ? Math.round((c.pulih / c.kerugian) * 100) + '% dipulihkan' : ''}">${c.kerugian ? MCS.fmtRp(c.kerugian, true) : '<span class="muted">—</span>'}</td></tr>`;
    }).join('') : `<tr><td colspan="6"><div class="empty">Tidak ada perkara untuk saringan ini.</div></td></tr>`;
    $('cl-rows').querySelectorAll('tr[data-id]').forEach((r) => (r.onclick = () => CaseView.open(r.dataset.id)));

    $('cl-foot').innerHTML = `<span>${rows.length ? (page - 1) * PAGE + 1 : 0}–${Math.min(page * PAGE, rows.length)} dari ${MCS.fmt(rows.length)}</span>
      <span class="sp"></span><button class="btn" id="cl-prev" ${page <= 1 ? 'disabled' : ''} aria-label="Halaman sebelumnya">←</button><span class="pg">${page} / ${pages}</span><button class="btn" id="cl-next" ${page >= pages ? 'disabled' : ''} aria-label="Halaman berikutnya">→</button>`;
    $('cl-prev').onclick = () => { page--; render(); $('caselist').querySelector('.cl-body').scrollTop = 0; };
    $('cl-next').onclick = () => { page++; render(); $('caselist').querySelector('.cl-body').scrollTop = 0; };
    document.querySelectorAll('#cl-jenis button').forEach((b) => b.classList.toggle('on', b.dataset.v === jenis));
  }

  function init() {
    $('cl-cat').innerHTML = '<option value="">Semua</option>' + MCS.CATS.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
    $('cl-stage').innerHTML = '<option value="">Semua</option>' + MCS.TAHAP.map((t, i) => `<option value="${i}">${i + 1}. ${t.name}</option>`).join('');
    $('cl-cat').onchange = (e) => { cat = e.target.value; page = 1; render(); };
    $('cl-stage').onchange = (e) => { stageF = e.target.value === '' ? '' : +e.target.value; page = 1; render(); };
    $('cl-sort').onchange = (e) => { sort = e.target.value; page = 1; render(); };
    let t; $('cl-q').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { q = e.target.value; page = 1; render(); }, 200); };
    document.querySelectorAll('#cl-jenis button').forEach((b) => (b.onclick = () => { jenis = b.dataset.v; page = 1; render(); }));
    $('cl-exp').onclick = () => UI.toast('Daftar perkara diekspor ke Excel');
    // semua tombol/kartu bertanda data-list membuka halaman ini
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-list]');
      if (el && !el.closest('#caselist')) { e.stopPropagation(); open(el.dataset.list); }
    });
  }
  return { init, open };
})();
