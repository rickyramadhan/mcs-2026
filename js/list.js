/* =====================================================================
   MCS — Daftar perkara (Command Center)
   Mengikuti saringan dashboard yang aktif (wilayah, Kejati, periode, matra),
   dipecah per tahap, dengan pencarian, saringan, urutan, dan halaman.
   ===================================================================== */
window.CaseList = (function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const E = MCS.esc;
  const PAGE = 25;
  // tab: 'all' | 'proses' | 0..7
  let tab = 'all', jenis = '', cat = '', q = '', sort = 'upd', page = 1;

  const scopeOf = (F) => {
    const parts = [];
    if (F.kejati) parts.push(MCS.KJ[F.kejati].name);
    else if (F.region && F.region !== 'ID') parts.push(MCS.depth(F.region) === 1 ? 'Provinsi ' + MCS.regionName(F.region) : MCS.regionName(F.region));
    else parts.push('Nasional');
    if (F.year) parts.push('tahun ' + F.year);
    if (F.matra) parts.push(MCS.matraName(F.matra));
    return parts.join(' · ');
  };
  // perkara dalam cakupan dashboard (tanpa saringan yang diatur di halaman ini)
  const baseList = () => MCS.filter({ ...App.filter, stage: '', cat: '', jenis: '' });

  function open(preset) {
    const F = App.filter;
    jenis = F.jenis || ''; cat = F.cat || ''; q = ''; sort = 'upd'; page = 1;
    tab = F.stage !== '' && F.stage != null ? +F.stage : 'all';
    if (preset === 'proses') tab = 'proses';
    else if (preset === 'koneksitas') { jenis = 'koneksitas'; tab = 'all'; }
    else if (preset === '') tab = F.stage !== '' && F.stage != null ? +F.stage : 'all';
    $('cl-q').value = '';
    $('cl-sort').value = sort;
    $('cl-cat').value = cat;
    render();
    UI.open('caselist');
    setTimeout(() => $('cl-q').focus(), 120);
  }

  function inTab(c) { return tab === 'all' ? true : tab === 'proses' ? c.st < 7 : c.st === tab; }

  function render() {
    const F = App.filter;
    const scoped = baseList().filter((c) => (!jenis || c.jenis === jenis) && (!cat || c.cat === cat));
    const ql = q.trim().toLowerCase();
    const searched = ql ? scoped.filter((c) => (c.id + ' ' + (c.reg || '') + ' ' + c.lp + ' ' + c.title + ' ' + c.kesatuan + ' ' + c.terdakwa.map((t) => MCS.terdakwaLabel(t) + ' ' + t.nrp).join(' ') + ' ' + c.sipil.map((t) => t.nama).join(' ')).toLowerCase().includes(ql)) : scoped;
    const rows = searched.filter(inTab);
    const ns = (c) => (MCS.nextSidang(c) || { t: Infinity }).t;
    const S = { upd: (a, b) => b.updated - a.updated, new: (a, b) => b.d - a.d, old: (a, b) => a.sd[a.st] - b.sd[b.st], rugi: (a, b) => b.kerugian - a.kerugian, sidang: (a, b) => ns(a) - ns(b) };
    rows.sort(S[sort]);

    // judul & ringkasan
    $('cl-scope').textContent = 'Daftar perkara · ' + scopeOf(F);
    const tabName = tab === 'all' ? 'Semua tahap' : tab === 'proses' ? 'Dalam proses' : 'Tahap ' + MCS.TAHAP[tab].name;
    $('cl-title').textContent = MCS.fmt(rows.length) + ' perkara · ' + tabName + (jenis ? ' · ' + MCS.JN[jenis].name : '');
    const st = MCS.stats(searched);
    const kritis = searched.filter((c) => c.tahanan && c.tahanan.sampai - MCS.TODAY <= 5 * MCS.DAY).length;
    $('cl-sum').innerHTML = [
      [MCS.GROUP.pra.name, MCS.fmt(st.byGroup.pra), MCS.GROUP.pra.color],
      [MCS.GROUP.sidang.name, MCS.fmt(st.byGroup.sidang), MCS.GROUP.sidang.color],
      [MCS.GROUP.tetap.name, MCS.fmt(st.byGroup.tetap), MCS.GROUP.tetap.color],
      ['Koneksitas', MCS.fmt(st.byJenis.koneksitas) + ' <small>· ' + MCS.fmt(st.sipil) + ' tersangka sipil</small>', ''],
      ['Kerugian negara', MCS.fmtRp(st.kerugianNegara, true) + ' <small>· ' + (st.kerugianNegara ? Math.round((st.pulihNegara / st.kerugianNegara) * 100) : 0) + '% pulih</small>', ''],
      ['Penahanan ≤ 5 hari', MCS.fmt(kritis), kritis ? 'var(--crit)' : ''],
    ].map(([k, v, col]) => `<div class="cs">${col ? `<i style="background:${col}"></i>` : ''}<span>${k}</span><b>${v}</b></div>`).join('');

    // tab tahap
    const count = (fn) => searched.filter(fn).length;
    const TABS = [['all', 'Semua', count(() => true), ''], ['proses', 'Dalam proses', count((c) => c.st < 7), '']]
      .concat(MCS.TAHAP.map((t, i) => [i, (i + 1) + '. ' + t.name, st.byStage[i], MCS.GROUP[MCS.groupOf(i)].color]));
    $('cl-tabs').innerHTML = TABS.map(([k, n, v, col]) => `<button data-t="${k}" class="${String(k) === String(tab) ? 'on' : ''}">${col ? `<i style="background:${col}"></i>` : ''}${n}<em>${MCS.fmt(v)}</em></button>`).join('');
    $('cl-tabs').querySelectorAll('button').forEach((b) => (b.onclick = () => { tab = b.dataset.t === 'all' || b.dataset.t === 'proses' ? b.dataset.t : +b.dataset.t; page = 1; render(); }));

    // baris
    const pages = Math.max(1, Math.ceil(rows.length / PAGE));
    page = Math.min(page, pages);
    const slice = rows.slice((page - 1) * PAGE, page * PAGE);
    $('cl-rows').innerHTML = slice.length ? slice.map((c, i) => {
      const n = MCS.nextSidang(c);
      const lama = Math.max(0, Math.round((MCS.NOW - c.sd[c.st]) / MCS.DAY));
      const crit = c.tahanan && c.tahanan.sampai - MCS.TODAY <= 2 * MCS.DAY;
      const stale = c.st < 7 && MCS.NOW - c.updated > 90 * MCS.DAY;
      return `<tr data-id="${c.id}" style="animation-delay:${Math.min(i, 20) * 12}ms">
        <td><span class="mono">${c.reg || c.lp}</span><span class="sub">${c.id}${c.verified ? '' : ' · <span class="w">belum diverifikasi</span>'}</span></td>
        <td><b>${E(MCS.terdakwaLabel(c.terdakwa[0]))}</b>${c.terdakwa.length > 1 ? ` <span class="muted">+${c.terdakwa.length - 1} militer</span>` : ''}<span class="sub">${E(c.kesatuan)} · ${MCS.matraName(c.matra)}${c.sipil.length ? ` · <span class="kon">${c.sipil.length} sipil</span>` : ''}</span></td>
        <td>${c.jenis === 'koneksitas' ? '<span class="kon">Koneksitas</span> · ' : ''}${MCS.CAT[c.cat].name}<span class="sub">${c.arts.map(MCS.artLabel).join(', ')}</span></td>
        <td>${UI.stagePill(c.st)}<div class="p8">${MCS.TAHAP.map((t, j) => `<i class="${j < c.st ? 'on' : j === c.st ? 'cur' : ''}"></i>`).join('')}</div><span class="sub">${c.st < 7 ? lama + ' hari di tahap ini' : c.eksekusi || 'Selesai'}</span></td>
        <td>${MCS.KJ[c.kejati].short}<span class="sub">${MCS.forumShort(c)}</span></td>
        <td>${n ? `${MCS.fmtDay(n.t)}, ${MCS.fmtTime(n.t)}<span class="sub">${n.agenda}</span>` : '<span class="muted">—</span>'}${crit ? `<span class="sub c">Penahanan berakhir ${MCS.fmtDate(c.tahanan.sampai)}</span>` : ''}</td>
        <td class="r">${c.kerugian ? MCS.fmtRp(c.kerugian, true) + `<span class="sub">${Math.round((c.pulih / c.kerugian) * 100)}% pulih</span>` : '<span class="muted">—</span>'}</td>
        <td>${MCS.fmtAgo(c.updated)}${stale ? '<span class="sub w">perlu pembaruan</span>' : `<span class="sub">${E(c.updatedBy)}</span>`}</td></tr>`;
    }).join('') : `<tr><td colspan="8"><div class="empty">Tidak ada perkara untuk saringan ini.</div></td></tr>`;
    $('cl-rows').querySelectorAll('tr[data-id]').forEach((r) => (r.onclick = () => CaseView.open(r.dataset.id)));

    $('cl-foot').innerHTML = `<span>Menampilkan ${rows.length ? (page - 1) * PAGE + 1 : 0}–${Math.min(page * PAGE, rows.length)} dari ${MCS.fmt(rows.length)} perkara · klik baris untuk membuka berkas</span>
      <span class="sp"></span><button class="btn" id="cl-prev" ${page <= 1 ? 'disabled' : ''}>← Sebelumnya</button><span class="pg">Halaman ${page} / ${pages}</span><button class="btn" id="cl-next" ${page >= pages ? 'disabled' : ''}>Berikutnya →</button>`;
    $('cl-prev').onclick = () => { page--; render(); $('caselist').querySelector('.cl-body').scrollTop = 0; };
    $('cl-next').onclick = () => { page++; render(); $('caselist').querySelector('.cl-body').scrollTop = 0; };
    document.querySelectorAll('#cl-jenis button').forEach((b) => b.classList.toggle('on', b.dataset.v === jenis));
  }

  function init() {
    $('cl-cat').innerHTML = '<option value="">Semua</option>' + MCS.CATS.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
    $('cl-cat').onchange = (e) => { cat = e.target.value; page = 1; render(); };
    $('cl-sort').onchange = (e) => { sort = e.target.value; page = 1; render(); };
    let t; $('cl-q').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { q = e.target.value; page = 1; render(); }, 200); };
    document.querySelectorAll('#cl-jenis button').forEach((b) => (b.onclick = () => { jenis = b.dataset.v; page = 1; render(); }));
    $('cl-exp').onclick = () => UI.toast('Daftar perkara diekspor ke Excel (.xlsx) dengan watermark pengguna');
    // semua tombol/kartu bertanda data-list membuka halaman ini
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-list]');
      if (el && !el.closest('#caselist')) { e.stopPropagation(); open(el.dataset.list); }
    });
  }
  return { init, open };
})();
