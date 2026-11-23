/* =====================================================================
   MCS — Saran Pasal & Undang-Undang (asisten input perkara)
   Operator cukup menulis kejadian dengan bahasa sehari-hari; asisten
   menyarankan klasifikasi, undang-undang, dan pasal yang paling sesuai,
   lengkap dengan alasannya dan perkara serupa yang pernah ditangani.
   Prototipe: pencocokan kata kunci + contoh perkara dummy.
   ===================================================================== */
window.SARAN = (function () {
  'use strict';
  const E = (s) => MCS.esc(String(s == null ? '' : s));

  // ---- kata kunci per klasifikasi: [kata, bobot] ----
  const KW = {
    DES: [['desersi', 7], ['meninggalkan kesatuan', 6], ['thti', 6], ['tanpa izin', 4], ['tidak kembali', 4], ['kabur', 3], ['minggat', 4], ['bolos', 3], ['tidak hadir', 3], ['tidak masuk dinas', 4], ['cuti', 2], ['pergi dari satuan', 4]],
    NAR: [['narkotika', 7], ['narkoba', 7], ['sabu', 6], ['ganja', 6], ['ekstasi', 6], ['inex', 6], ['urine positif', 5], ['positif', 2], ['pengedar', 5], ['bandar', 4], ['kurir', 3]],
    ANI: [['penganiayaan', 7], ['aniaya', 6], ['keroyok', 6], ['pengeroyokan', 7], ['memukul', 5], ['pukul', 4], ['hajar', 4], ['tawuran', 4], ['berkelahi', 3], ['kekerasan', 3], ['luka', 2]],
    ASU: [['asusila', 7], ['pelecehan', 6], ['cabul', 6], ['mesum', 5], ['kesusilaan', 6], ['seksual', 5], ['menyentuh', 2]],
    PEN: [['penipuan', 7], ['menipu', 6], ['tipu', 6], ['penggelapan', 7], ['menggelapkan', 6], ['gelap', 5], ['investasi', 3], ['arisan', 3], ['modus', 2], ['menjanjikan', 3], ['kelulusan', 3], ['uang korban', 3]],
    KDR: [['kdrt', 8], ['rumah tangga', 7], ['istri', 5], ['suami', 4], ['pasangan', 2]],
    KOR: [['korupsi', 7], ['mark-up', 5], ['markup', 5], ['anggaran', 4], ['pengadaan', 4], ['proyek', 3], ['dana', 3], ['uang negara', 5], ['kerugian negara', 6], ['bendahara', 3], ['fiktif', 3], ['tunjangan', 2], ['kewenangan', 2], ['suap', 4], ['gratifikasi', 4]],
    SEN: [['amunisi', 7], ['senjata', 5], ['senpi', 6], ['granat', 6], ['peledak', 6], ['bahan peledak', 7], ['peluru', 4]],
    LAL: [['kecelakaan', 7], ['lalu lintas', 5], ['laka', 4], ['menabrak', 5], ['tabrak', 5], ['mengemudi', 3], ['kendaraan dinas', 2]],
    MAT: [['pencurian', 7], ['mencuri', 6], ['curi', 6], ['maling', 4], ['suku cadang', 3], ['gudang', 2], ['perlengkapan', 2], ['materiil', 3]],
    JUD: [['judi', 7], ['judol', 7], ['perjudian', 7], ['togel', 6], ['taruhan', 5], ['slot', 4]],
    INS: [['menolak perintah', 7], ['insubordinasi', 7], ['tidak menaati', 5], ['membangkang', 5], ['melawan atasan', 5], ['perintah atasan', 3], ['perintah dinas', 3], ['penyalahgunaan wewenang', 5]],
    PMB: [['pembunuhan', 8], ['membunuh', 7], ['bunuh', 7], ['menghilangkan nyawa', 6], ['tewas', 3], ['berencana', 3]],
  };

  // ---- pilihan pasal yang paling pas, berdasarkan kata dalam uraian ----
  // [pola, [id pasal], alasan]
  const ART_RULES = {
    DES: [[/(lebih dari|diatas|di atas|>)\s*30|desersi|berbulan|bulan/, ['KUHPM-87'], 'tidak hadir lebih dari 30 hari'], [/beberapa hari|\b[1-9]\s*hari|\b[12][0-9]\s*hari|terlambat/, ['KUHPM-86'], 'tidak hadir 1–30 hari'], [/kelalaian|sakit|lupa|terlambat kembali/, ['KUHPM-85'], 'tidak hadir karena kelalaian']],
    NAR: [[/jual|edar|bandar|kurir|perantara|beli/, ['NAR-114', 'NAR-112'], 'terlibat peredaran (jual/beli/perantara)'], [/pakai|positif|urine|konsumsi|penyalah/, ['NAR-127'], 'pemakai untuk diri sendiri'], [/simpan|miliki|menguasai|gram|ditemukan/, ['NAR-112'], 'menyimpan/memiliki barang']],
    ANI: [[/keroyok|bersama|beramai|tawuran/, ['KUHP-170'], 'dilakukan bersama-sama'], [/atasan|senior|wewenang|bawahan|pembinaan/, ['KUHP-351', 'KUHPM-126'], 'ada unsur penyalahgunaan kekuasaan atasan']],
    ASU: [[/pelecehan|kedudukan|atasan|rekan kerja|wewenang|seksual/, ['TPKS-6'], 'pelecehan seksual / penyalahgunaan kedudukan'], [/asusila|mesum|umum|cabul|kesusilaan/, ['KUHP-281'], 'melanggar kesusilaan']],
    PEN: [[/tipu|investasi|modus|janji|kelulusan|koperasi/, ['KUHP-378'], 'ada tipu muslihat'], [/gelap|sewa|arisan|titip|pinjam/, ['KUHP-372'], 'menguasai barang/uang yang dititipkan']],
    KOR: [[/mark-?up|memperkaya|pengadaan|proyek|rekanan|fiktif/, ['TPK-2', 'TPK-3'], 'memperkaya pihak lain & merugikan negara'], [/gelap|bendahara|setor|kas/, ['TPK-8'], 'penggelapan uang karena jabatan'], [/jabatan|wewenang|kewenangan|anggaran|dana/, ['TPK-3'], 'menyalahgunakan wewenang karena jabatan']],
    JUD: [[/daring|online|judol|rekening|aplikasi|situs|slot/, ['ITE-27'], 'perjudian lewat sarana elektronik']],
    INS: [[/wewenang|warga sipil|memaksa/, ['KUHPM-126'], 'menyalahgunakan kekuasaan']],
    MAT: [[/gelap|bahan bakar/, ['KUHP-362', 'KUHP-372'], 'pencurian disertai penggelapan']],
    PMB: [[/berencana|direncanakan|racun|motif/, ['KUHP-340'], 'ada unsur direncanakan']],
  };

  // ---- contoh perkara dummy (1–3 tahun terakhir) ----
  // [id, bulan lalu, jenis, klasifikasi, pasal, matra, pangkat, nama, nrp, jabatan, satuan, kab, uraian, kerugian, catatan, putusan, sipil]
  const EX = [
    ['E01', 33, 'oditurat', 'DES', ['KUHPM-87'], 'AD', 'Prada', 'Rizky Aditya Nugroho', '31210458', 'Anggota regu', 'Yonif 500/Raider', 'Kota Surabaya', 'Prajurit tidak kembali ke kesatuan setelah cuti berakhir, sudah lebih dari 40 hari tidak ada kabar', 0, 'Surat panggilan sudah dikirim dua kali ke alamat keluarga.', 'Penjara 8 bulan, dipecat dari dinas militer', []],
    ['E02', 30, 'oditurat', 'NAR', ['NAR-127'], 'AD', 'Praka', 'Dimas Prasetyo', '31190277', 'Pengemudi', 'Kodim 0831/Surabaya', 'Kota Surabaya', 'Anggota positif memakai sabu saat tes urine mendadak di satuan', 0, 'Hasil tes urine dan berita acara pemeriksaan sudah dilampirkan.', 'Penjara 10 bulan, dipecat dari dinas militer', []],
    ['E03', 27, 'oditurat', 'ANI', ['KUHP-351'], 'AD', 'Serka', 'Hendra Wijaya', '21140396', 'Bintara pembina', 'Kodim 0618/Kota Bandung', 'Kota Bandung', 'Anggota memukul warga sipil di warung hingga luka di wajah', 0, 'Korban sudah visum; ada dua saksi di lokasi.', 'Penjara 6 bulan', []],
    ['E04', 25, 'oditurat', 'PEN', ['KUHP-378'], 'AD', 'Peltu', 'Sutrisno Hadi', '21980143', 'Staf administrasi', 'Korem 084/Bhaskara Jaya', 'Kota Surabaya', 'Menipu beberapa orang dengan menjanjikan kelulusan seleksi prajurit dan meminta uang muka', 640000000, 'Korban lebih dari sepuluh orang; bukti transfer sudah dikumpulkan.', 'Penjara 2 tahun 6 bulan, dipecat dari dinas militer', []],
    ['E05', 24, 'koneksitas', 'KOR', ['TPK-2', 'TPK-3'], 'AD', 'Pelda', 'Bambang Suryanto', '21970312', 'Kepala urusan keuangan', 'Kodam IV/Diponegoro', 'Kota Semarang', 'Mark-up pengadaan bahan bakar satuan bersama rekanan swasta, merugikan keuangan negara', 3200000000, 'Ada hasil audit BPKP; rekanan swasta ikut menandatangani kontrak.', 'Penjara 6 tahun, denda, uang pengganti Rp 1,4 miliar', [['Hartono Wibowo', 'Direktur PT rekanan pengadaan']]],
    ['E06', 22, 'oditurat', 'SEN', ['DRT-1'], 'AD', 'Kopda', 'Agus Setiawan', '31170264', 'Anggota gudang senjata', 'Yonif 503/Mayangkara', 'Kota Surabaya', 'Menyimpan dan menjual amunisi tanpa izin kepada warga sipil', 0, 'Barang bukti amunisi sudah disita dan dihitung.', 'Penjara 4 tahun, dipecat dari dinas militer', []],
    ['E07', 20, 'oditurat', 'KDR', ['PKDRT-44'], 'AL', 'Serda', 'Yohanes Lumban', '21160528', 'Anggota kapal', 'Lantamal V/Surabaya', 'Kota Surabaya', 'Memukul istri di rumah dinas, istri melapor ke Polisi Militer', 0, 'Korban sudah visum dan bersedia menjadi saksi.', 'Penjara 8 bulan', []],
    ['E08', 19, 'oditurat', 'LAL', ['LLAJ-310'], 'AU', 'Koptu', 'Fajar Ramadhan', '528812', 'Pengemudi kendaraan dinas', 'Lanud Halim Perdanakusuma', 'Kota Jakarta Timur', 'Mengemudikan kendaraan dinas lalai dan menabrak pengendara motor hingga meninggal dunia', 0, 'Hasil olah TKP dan keterangan saksi sudah ada.', 'Penjara 1 tahun 6 bulan', []],
    ['E09', 18, 'koneksitas', 'KOR', ['TPK-3'], 'AL', 'Peltu', 'Marthen Rumbiak', '21950188', 'Bendahara satuan', 'Lantamal VIII/Manado', 'Kota Manado', 'Penyalahgunaan dana pemeliharaan sarana satuan yang dikerjakan bersama kontraktor lokal', 1850000000, 'Dana dicairkan tetapi pekerjaan tidak selesai.', 'Penjara 5 tahun, uang pengganti Rp 900 juta', [['Yance Tumbel', 'Kontraktor pelaksana']]],
    ['E10', 17, 'oditurat', 'MAT', ['KUHP-362', 'KUHP-372'], 'AD', 'Pratu', 'Eko Prasetyo', '31220091', 'Penjaga gudang', 'Kodim 1304/Gorontalo', 'Kota Gorontalo', 'Mencuri dan menjual suku cadang kendaraan dinas dari gudang satuan', 85000000, 'Daftar inventaris gudang sudah dicocokkan.', 'Penjara 1 tahun 8 bulan', []],
    ['E11', 16, 'oditurat', 'ASU', ['TPKS-6'], 'AD', 'Serma', 'Ridwan Hakim', '21030477', 'Wakil komandan unit', 'Kodim 1408/Makassar', 'Kota Makassar', 'Pelecehan terhadap rekan kerja perempuan dengan memanfaatkan kedudukannya sebagai atasan', 0, 'Korban didampingi psikolog; ada bukti pesan singkat.', 'Penjara 1 tahun 4 bulan, dipecat dari dinas militer', []],
    ['E12', 15, 'oditurat', 'JUD', ['ITE-27'], 'AL', 'Kelasi Kepala', 'Andi Mappaseng', '99010234', 'Anak buah kapal', 'Lantamal VI/Makassar', 'Kota Makassar', 'Bermain judi online memakai rekening pribadi dan mengajak rekan satuan', 0, 'Mutasi rekening dari bank sudah diperoleh.', 'Penjara 7 bulan', []],
    ['E13', 14, 'oditurat', 'INS', ['KUHPM-103'], 'AD', 'Serka', 'Budi Santoso', '21120633', 'Komandan regu', 'Kodim 0201/Medan', 'Kota Medan', 'Menolak perintah atasan untuk ikut pengamanan kegiatan yang sudah ditugaskan', 0, 'Surat perintah tugas dan keterangan saksi sudah ada.', 'Penjara 5 bulan', []],
  ];
  const EXAMPLES = EX.map(([id, mon, jenis, cat, arts, matra, pangkat, nama, nrp, jabatan, kesatuan, kab, title, kerugian, catatan, putusan, sipil]) => ({ id, mon, jenis, cat, arts, matra, pangkat, nama, nrp, jabatan, kesatuan, kab, title, kerugian, catatan, putusan, sipil }));
  const exLabel = (e) => MCS.CAT[e.cat].name.split(/ [&(]/)[0] + ' · ' + e.kab.replace(/^Kota /, '');
  const exDate = (e) => new Date(MCS.NOW - e.mon * 30.4 * MCS.DAY);
  const exYear = (e) => exDate(e).getFullYear();

  // ---- mesin saran ----
  const norm = (s) => ' ' + String(s || '').toLowerCase().replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ') + ' ';

  function suggest(text, tglk) {
    const t = norm(text);
    if (t.trim().length < 4) return null;
    const scored = [];
    Object.keys(KW).forEach((cat) => {
      let score = 0; const hits = [];
      KW[cat].forEach(([k, w]) => { if (t.includes(k)) { score += w; hits.push(k); } });
      if (score) scored.push({ cat, score, hits });
    });
    scored.sort((a, b) => b.score - a.score);
    if (!scored.length || scored[0].score < 3) return { empty: true };
    const newLaw = tglk && new Date(tglk).getTime() >= new Date('2026-01-02').getTime();
    const build = (s) => {
      const c = MCS.CAT[s.cat];
      let ids = null, reason = '';
      (ART_RULES[s.cat] || []).some(([re, a, why]) => { if (re.test(t)) { ids = a; reason = why; return true; } return false; });
      if (!ids) ids = c.arts[0][0];
      const arts = ids.map((id) => MCS.ART[id]).filter(Boolean);
      const conf = s.score >= 9 ? 'Sangat cocok' : s.score >= 5 ? 'Cocok' : 'Mungkin';
      return { cat: s.cat, name: c.name, ids, arts, reason, hits: s.hits.slice(0, 3), conf, score: s.score, newLaw, kn: c.kn };
    };
    return { top: build(scored[0]), alts: scored.slice(1, 3).map(build) };
  }

  function similar(cat, limit) {
    return EXAMPLES.filter((e) => e.cat === cat).slice(0, limit || 2);
  }

  // ---- tampilan kartu saran ----
  const artRow = (a, newLaw) => `<li><b>${E(a.pasal)} ${E(MCS.LAW[a.law].name)}</b><span>${E(a.desc)}</span><em>${E(a.threat)}${newLaw && a.baru ? ' · padanan KUHP baru: ' + E(a.baru) : ''}</em></li>`;

  function render(sg, state) {
    // state: { picked: bool, cat }
    if (!sg) return `<div class="sg idle"><b>Asisten pasal</b>Tulis kejadiannya, asisten akan menyarankan pasal.</div>`;
    if (sg.empty) return `<div class="sg idle warn"><b>Belum bisa menebak</b>Tambahkan jenis perbuatan, misalnya memukul, menipu, atau narkoba.</div>`;
    const m = state && state.cat ? [sg.top].concat(sg.alts).find((x) => x.cat === state.cat) || sg.top : sg.top;
    const others = [sg.top].concat(sg.alts).filter((x) => x.cat !== m.cat);
    const sims = state && state.compact ? [] : similar(m.cat, 1);
    const note = m.cat === 'KOR' ? '<div class="sg-note">Jika ada pelaku sipil atau rekanan, pilih jenis perkara <b>Koneksitas</b>.</div>' : '';
    return `<div class="sg ${state && state.picked ? 'done' : ''}">
      <div class="sg-h"><span class="sg-ic">✦</span><b>Saran asisten</b><i class="sg-conf">${m.conf}</i></div>
      <div class="sg-cat"><span>Klasifikasi</span><b>${E(m.name)}</b></div>
      <ul class="sg-art">${m.arts.map((a) => artRow(a, m.newLaw)).join('')}</ul>
      <div class="sg-why">Disarankan karena ada kata ${m.hits.map((h) => `<q>${E(h)}</q>`).join(', ')}${m.reason ? ' · ' + E(m.reason) : ''}.</div>
      ${note}
      <div class="sg-act">${state && state.picked ? '<span class="sg-ok">✓ Sudah dipakai · bisa diubah di bawah</span>' : `<button class="btn primary" type="button" data-sg-use="${m.cat}">Pakai saran ini</button>`}
        ${others.map((o) => `<button class="btn" type="button" data-sg-alt="${o.cat}">Atau: ${E(o.name)}</button>`).join('')}</div>
      ${sims.length ? `<div class="sg-sim"><h5>Perkara serupa</h5>${sims.map((e) => `<div class="sg-sim-i"><b>${exYear(e)} · ${E(e.kab)}</b><span>${E(e.title)}</span><em>${e.arts.map((id) => E(MCS.artLabel(id))).join(' jo. ')} → ${E(e.putusan)}</em></div>`).join('')}</div>` : ''}
    </div>`;
  }

  return { suggest, render, EXAMPLES, exLabel, exDate };
})();
