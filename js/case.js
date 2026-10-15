/* =====================================================================
   MCS — Berkas Perkara (dossier)
   ===================================================================== */
window.CaseView = (function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const E = MCS.esc;
  let c = null, tab = 'ringkas';

  const TABS = [
    ['ringkas', 'Ringkasan', 'file'],
    ['terdakwa', 'Terdakwa', 'user'],
    ['pasal', 'Pasal & dakwaan', 'scale'],
    ['sidang', 'Persidangan', 'cal'],
    ['kerugian', 'Kerugian', 'cash'],
    ['tahanan', 'Penahanan', 'lock'],
    ['dokumen', 'Dokumen', 'folder'],
    ['riwayat', 'Riwayat', 'history'],
  ];

  function open(id) {
    c = MCS.byId(id);
    if (!c) return;
    tab = 'ringkas';
    renderHead();
    renderProgress();
    renderNav();
    renderMain();
    renderSide();
    UI.open('dossier');
  }

  function renderHead() {
    const g = MCS.GROUP[MCS.groupOf(c.st)];
    const ns = MCS.nextSidang(c);
    const court = MCS.COURT[c.court];
    $('d-head').innerHTML = `
      <div style="min-width:0">
        <div class="k"><span class="id">${c.id}</span>${c.reg ? `<span class="id">·</span><span class="id" style="color:var(--txt-2)">No. ${c.reg}</span>` : `<span class="id">· ${c.lp}</span>`}
          <span class="pill"><i style="background:${g.color}"></i>${MCS.TAHAP[c.st].name}</span>
          <span class="pill">${MCS.CAT[c.cat].name}</span>
          ${c.koneksitas ? '<span class="pill info">Koneksitas · Jampidmil</span>' : ''}
          ${c.absentia ? '<span class="pill warn">In absentia</span>' : ''}
          ${c.verified ? '' : '<span class="pill warn">Menunggu verifikasi</span>'}
        </div>
        <h2>${E(c.title)}</h2>
        <div class="sub"><b>${E(MCS.terdakwaLabel(c.terdakwa[0]))}</b>${c.terdakwa.length > 1 ? ` dan ${c.terdakwa.length - 1} lainnya` : ''} · ${E(c.kesatuan)} · ${MCS.matraName(c.matra)} · ${court.short}</div>
      </div>
      <div class="acts">
        ${ns ? `<div class="next-box"><span>Sidang berikutnya</span><b>${MCS.fmtDay(ns.t)}, ${MCS.fmtTime(ns.t)} WIB</b><em>${ns.agenda} · ${ns.ruang}</em></div>`
          : c.putusan ? `<div class="next-box" style="border-color:rgba(25,158,112,.35);background:rgba(25,158,112,.07)"><span style="color:#5fd3a8">Putusan · ${MCS.fmtDate(c.putusan.t)}</span><b>${c.putusan.amar}</b><em>${c.putusan.tambahan || 'Tanpa pidana tambahan'}</em></div>` : ''}
        <button class="btn" id="d-print" title="Cetak ringkasan">${UI.icon('print')}</button>
        <a class="btn" href="admin.html#perkara/${c.id}" title="Perbarui di Workspace">${UI.icon('edit')}Perbarui</a>
        <button class="x" data-close aria-label="Tutup">×</button>
      </div>`;
    $('d-print').onclick = () => UI.toast('Ringkasan perkara disiapkan untuk dicetak (PDF)');
  }

  function renderProgress() {
    $('d-progress').innerHTML = MCS.TAHAP.map((t, i) => `<div class="st ${i < c.st ? 'done' : i === c.st ? 'cur' : ''}" style="--d:${i * 0.07}s" title="${t.long}">
      <span class="dot"></span><b>${t.name}</b><span>${c.sd[i] ? MCS.fmtDate(c.sd[i]) : i === c.st + 1 ? 'Berikutnya' : '—'}</span></div>`).join('');
    // reset animasi
    $('d-progress').querySelectorAll('.st').forEach((el) => { const cl = el.className; el.className = 'st'; void el.offsetWidth; requestAnimationFrame(() => (el.className = cl)); });
  }

  function renderNav() {
    const count = { sidang: c.sidang.length, terdakwa: c.terdakwa.length, pasal: c.arts.length, dokumen: docs().filter((d) => d.ok).length };
    $('d-nav').innerHTML = TABS.filter(([k]) => k !== 'kerugian' || c.kn).map(([k, n, ic]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${UI.icon(ic)}${n}${count[k] ? `<em>${count[k]}</em>` : ''}</button>`).join('');
    $('d-nav').querySelectorAll('button').forEach((b) => (b.onclick = () => { tab = b.dataset.t; renderNav(); renderMain(); }));
  }

  const sec = (title, body, aux = '') => `<div class="sec"><h4>${title}${aux ? `<span>${aux}</span>` : ''}</h4>${body}</div>`;

  function renderMain() {
    const el = $('d-main');
    const court = MCS.COURT[c.court];
    const kab = MCS.KAB[c.kab];
    let h = '';
    if (tab === 'ringkas') {
      h += sec('Identitas perkara', `<dl class="kv">
        <dt>Nomor register</dt><dd class="mono">${c.reg || '<span class="muted">Belum terdaftar di pengadilan</span>'}</dd>
        <dt>Nomor laporan polisi militer</dt><dd class="mono">${c.lp}</dd>
        <dt>Klasifikasi</dt><dd>${MCS.CAT[c.cat].name}</dd>
        <dt>Pasal yang didakwakan</dt><dd>${c.arts.map(MCS.artLabel).join(' jo. ')}</dd>
        <dt>Locus delicti</dt><dd>${c.loc ? c.loc + ', ' : ''}${kab.name}, ${MCS.PROV[c.p]}</dd>
        <dt>Tempus delicti</dt><dd>${MCS.fmtDate(c.d - 3 * MCS.DAY)} <span class="muted">· ${c.d - 3 * MCS.DAY < new Date('2026-01-02').getTime() ? 'berlaku KUHP lama' : 'berlaku KUHP 2023'}</span></dd>
        <dt>Pengadilan</dt><dd>${court.name}${court.level === 'dilmilti' ? ' <span class="muted">· tingkat pertama (terdakwa berpangkat Mayor ke atas)</span>' : ''}</dd>
        <dt>Oditurat</dt><dd>${c.otmil}</dd>
        <dt>Satuan terdakwa</dt><dd>${E(c.kesatuan)} <span class="muted">· ${E(c.induk)}</span></dd>
      </dl>`);
      h += sec('Status saat ini', `<div class="card"><div style="display:flex;gap:10px;align-items:center;margin-bottom:6px">${UI.stagePill(c.st)}<span class="muted" style="font-size:12px">sejak ${MCS.fmtDate(c.sd[c.st])} · ${Math.max(0, Math.round((MCS.NOW - c.sd[c.st]) / MCS.DAY))} hari</span></div>
        <div style="color:var(--txt-2)">${MCS.TAHAP[c.st].long}.</div>
        <div class="muted" style="font-size:12px;margin-top:6px">Penanggung jawab tahap: ${MCS.TAHAP[c.st].actor} · Pembaruan terakhir ${MCS.fmtAgo(c.updated)} oleh ${c.updatedBy}</div></div>`);
      if (c.putusan) h += sec('Putusan', putusanCard());
    } else if (tab === 'terdakwa') {
      h += sec('Terdakwa', `<div class="cards">${c.terdakwa.map((t) => `<div class="card person"><div class="av">${t.nama.split(' ').map((x) => x[0]).slice(0, 2).join('')}</div>
        <div><b>${E(MCS.terdakwaLabel(t))}</b><span>NRP ${t.nrp} · ${t.umur} tahun</span><span>${MCS.GOL[t.gol]} · ${MCS.matraName(c.matra)}</span><span>${E(c.kesatuan)}</span></div></div>`).join('')}</div>`, c.terdakwa.length + ' orang');
      h += `<div class="note">NRP disamarkan sesuai hak akses. Data identitas lengkap hanya dapat dibuka oleh Oditurat dan Pengadilan yang menangani.</div>`;
    } else if (tab === 'pasal') {
      h += sec('Pasal yang didakwakan', `<div class="cards">${c.arts.map((id) => { const a = MCS.ART[id]; return `<div class="card art"><div class="p">${a.pasal}</div><div class="l">${MCS.LAW[a.law].full}</div><div class="d">${a.desc}</div>
        <div class="th"><span>Ancaman</span>${a.threat}</div>${a.baru ? `<div class="th"><span>Padanan KUHP 2023</span>${a.baru} UU 1/2023</div>` : ''}</div>`; }).join('')}</div>`, c.arts.length > 1 ? 'dakwaan kumulatif/alternatif' : '');
      if (c.putusan) h += sec('Tuntutan & putusan', `<dl class="kv"><dt>Tuntutan Oditur</dt><dd>Pidana penjara ${c.putusan.tuntutan}${c.putusan.tambahan ? ' dan dipecat dari dinas militer' : ''}</dd><dt>Amar putusan</dt><dd>${c.putusan.amar}${c.putusan.tambahan ? ' · ' + c.putusan.tambahan : ''}</dd></dl>`);
    } else if (tab === 'sidang') {
      if (!c.sidang.length) h += `<div class="empty">Perkara belum dilimpahkan ke pengadilan. Persidangan dimulai setelah Skeppera diterbitkan dan surat dakwaan dilimpahkan.</div>`;
      else {
        h += sec('Majelis', `<dl class="kv"><dt>Hakim ketua</dt><dd>${c.majelis[0]}</dd><dt>Hakim anggota</dt><dd>${c.majelis[1]}<br>${c.majelis[2]}</dd><dt>Oditur militer</dt><dd>${c.oditur}</dd><dt>Panitera pengganti</dt><dd>${c.panitera}</dd><dt>Penasihat hukum</dt><dd>${c.ph}</dd></dl>`);
        h += sec('Jalannya persidangan', `<div class="tl2">${c.sidang.map((s, i) => `<div class="e ${s.status === 'selesai' ? 'done' : s.status === 'jadwal' ? 'next' : 'tunda'}" style="animation-delay:${i * 40}ms">
          <b>${s.agenda}</b>${s.status === 'tunda' ? ' <span class="pill warn" style="display:inline-flex;height:18px;font-size:10.5px">Ditunda</span>' : s.status === 'jadwal' ? ' <span class="pill" style="display:inline-flex;height:18px;font-size:10.5px;color:#f0a07e">Terjadwal</span>' : ''}
          <span>${MCS.fmtDate(s.t, true)} WIB · ${s.ruang}${s.ket ? ' · ' + s.ket : ''}</span></div>`).join('')}</div>`, c.sidang.filter((s) => s.status === 'selesai').length + ' sidang selesai');
        if (c.upaya) h += sec('Upaya hukum', `<div class="card">${c.upaya.jenis} diajukan oleh ${c.upaya.oleh.toLowerCase()} pada ${MCS.fmtDate(c.upaya.t)} ${c.upaya.selesai ? '— telah diputus, menguatkan putusan tingkat pertama' : '— sedang diperiksa ' + (c.upaya.jenis === 'Banding' ? MCS.COURT[MCS.COURT[c.court].tinggi || 'UTAMA'].name : 'Mahkamah Agung')}</div>`);
      }
    } else if (tab === 'kerugian') {
      const pct = c.kerugian ? (c.pulih / c.kerugian) * 100 : 0;
      h += sec(c.kn === 'negara' ? 'Kerugian keuangan negara' : 'Kerugian korban', `<div class="money-row">
        <div class="card"><span>Nilai kerugian</span><b>${MCS.fmtRp(c.kerugian)}</b></div>
        <div class="card"><span>Telah dipulihkan</span><b style="color:#5fd3a8">${MCS.fmtRp(c.pulih)}</b></div>
        <div class="card"><span>Sisa</span><b>${MCS.fmtRp(c.kerugian - c.pulih)}</b></div></div>
        <div class="bigbar"><i style="width:0" data-w="${pct}"></i></div><div class="muted" style="font-size:12px">${pct.toFixed(1)}% dipulihkan · ${c.kn === 'negara' ? 'hasil audit/penghitungan BPKP & Itjen TNI' : 'berdasarkan laporan korban'}</div>`);
      if (c.putusan && c.putusan.uangPengganti) h += sec('Pidana uang pengganti', `<div class="card">${MCS.fmtRp(c.putusan.uangPengganti)} — subsider pidana penjara apabila tidak dibayar dalam 1 bulan setelah inkracht</div>`);
    } else if (tab === 'tahanan') {
      if (c.tahanan) {
        const sisa = Math.ceil((c.tahanan.sampai - MCS.TODAY) / MCS.DAY);
        h += sec('Status penahanan', `<div class="card" style="${sisa <= 5 ? 'border-color:rgba(208,59,59,.4)' : ''}"><div style="display:flex;gap:10px;align-items:center;margin-bottom:8px"><span class="pill ${sisa <= 2 ? 'crit' : sisa <= 5 ? 'warn' : ''}">${UI.icon('lock')}Ditahan</span><b>berakhir ${MCS.fmtDate(c.tahanan.sampai)}</b><span class="muted">(${sisa} hari lagi)</span></div>
          <dl class="kv"><dt>Tempat</dt><dd>${c.tahanan.tempat}</dd><dt>Kewenangan penahanan</dt><dd>${c.tahanan.oleh}</dd></dl></div>`);
        h += `<div class="note">Sistem mengirim pengingat 5 hari dan 2 hari sebelum masa penahanan berakhir kepada pejabat yang berwenang memperpanjang (Ankum/Papera/Hakim Ketua).</div>`;
      } else h += `<div class="empty">${c.absentia ? 'Terdakwa tidak diketahui keberadaannya — perkara desersi diperiksa secara in absentia.' : 'Terdakwa tidak ditahan.'}</div>`;
    } else if (tab === 'dokumen') {
      h += sec('Dokumen perkara', docs().map((d) => `<div class="doc ${d.ok ? '' : 'missing'}"><span class="f">PDF</span><div><b>${d.n}</b><span>${d.ok ? 'Diunggah ' + MCS.fmtDate(d.t) + ' · ' + d.by : 'Belum tersedia'}</span></div>${d.ok ? `<button class="btn ghost" onclick="UI.toast('Pratinjau dokumen dibuka dengan watermark pengguna')">${UI.icon('ext')}</button>` : ''}</div>`).join(''), 'disimpan terenkripsi');
    } else if (tab === 'riwayat') {
      const ev = [];
      MCS.TAHAP.forEach((t, i) => { if (c.sd[i]) ev.push({ t: c.sd[i], a: 'Tahap ' + t.name, by: t.actor }); });
      c.sidang.filter((s) => s.t <= MCS.NOW).forEach((s) => ev.push({ t: s.t, a: (s.status === 'tunda' ? 'Sidang ditunda — ' : 'Sidang: ') + s.agenda, by: 'Panitera ' + MCS.COURT[c.court].short }));
      ev.sort((a, b) => b.t - a.t);
      h += sec('Riwayat perubahan', `<div class="tl2">${ev.map((e, i) => `<div class="e done" style="animation-delay:${i * 30}ms"><b>${e.a}</b><span>${MCS.fmtDate(e.t, true)} · ${e.by}</span></div>`).join('')}</div>`, 'tercatat di log audit');
    }
    el.innerHTML = h;
    el.scrollTop = 0;
    requestAnimationFrame(() => el.querySelectorAll('[data-w]').forEach((i) => (i.style.width = i.dataset.w + '%')));
  }

  function putusanCard() {
    const p = c.putusan;
    return `<div class="card"><dl class="kv"><dt>Tanggal putusan</dt><dd>${MCS.fmtDate(p.t)}</dd><dt>Amar</dt><dd><b>${p.amar}</b></dd><dt>Pidana tambahan</dt><dd>${p.tambahan || '—'}</dd>
      ${p.uangPengganti ? `<dt>Uang pengganti</dt><dd>${MCS.fmtRp(p.uangPengganti)}</dd>` : ''}<dt>Status</dt><dd>${c.st === 7 ? 'Berkekuatan hukum tetap · ' + c.eksekusi : c.st === 6 ? 'Dalam upaya hukum' : 'Menunggu inkracht (7 hari)'}</dd></dl></div>`;
  }

  function docs() {
    const D = [
      ['Laporan Polisi Militer', 0, 'Penyidik POM'], ['Berita Acara Pemeriksaan (BAP)', 1, 'Penyidik POM'], ['Berkas perkara & pendapat hukum Oditur', 2, c.otmil],
      ['Keputusan Penyerahan Perkara (Skeppera)', 3, 'Papera'], ['Surat dakwaan', 3, c.otmil], ['Berita acara sidang', 4, 'Panitera'],
      ['Surat tuntutan', 5, c.otmil], ['Salinan putusan', 5, MCS.COURT[c.court].short], ['Berita acara pelaksanaan putusan', 7, c.otmil],
    ];
    return D.map(([n, s, by]) => ({ n, ok: c.st > s || (c.st === s && s !== 7 && s !== 5), t: c.sd[s] ? c.sd[s] + MCS.DAY : null, by }));
  }

  function renderSide() {
    const el = $('d-side');
    const court = MCS.COURT[c.court];
    const related = MCS.cases.filter((x) => x.id !== c.id && x.kesatuan === c.kesatuan && x.p === c.p).slice(-4).reverse();
    const samePasal = MCS.cases.filter((x) => x.id !== c.id && x.court === c.court && x.arts[0] === c.arts[0] && x.putusan).slice(-200);
    const avg = samePasal.length ? Math.round(samePasal.reduce((s, x) => s + x.putusan.pidana, 0) / samePasal.length) : 0;
    el.innerHTML = `<div class="side-h">Lokasi kejadian</div><div class="mini-map" id="d-mini"></div>
      <div class="side-kv"><div><span>Kabupaten/kota</span>${MCS.KAB[c.kab].name}</div><div><span>Wilayah hukum</span>${court.name}</div></div>
      ${avg ? `<div class="side-h">Pembanding putusan</div><div class="card" style="margin-bottom:18px"><div style="font-size:12px;color:var(--txt-3)">Rata-rata pidana untuk ${MCS.artLabel(c.arts[0])} di ${court.short}</div><div style="font-size:18px;font-weight:600;margin-top:2px">${MCS.fmtBulan(avg)}</div><div class="muted" style="font-size:11.5px">dari ${samePasal.length} putusan</div></div>` : ''}
      <div class="side-h">Perkara lain dari satuan yang sama</div>
      ${related.length ? related.map((x) => `<div class="rel" data-id="${x.id}"><span class="mono">${x.reg || x.id}</span><div>${E(x.title)}</div><div class="muted" style="font-size:11.5px">${MCS.TAHAP[x.st].name} · ${MCS.fmtDate(x.d)}</div></div>`).join('') : '<div class="muted" style="font-size:12px">Tidak ada.</div>'}`;
    el.querySelectorAll('.rel').forEach((r) => (r.onclick = () => open(r.dataset.id)));
    requestAnimationFrame(() => MCSMap.miniMap($('d-mini'), c.kab));
  }

  return { open };
})();
