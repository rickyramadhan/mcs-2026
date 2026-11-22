/* =====================================================================
   MCS — Aturan proses per tahap perkara (Workspace)
   Setiap perpindahan tahap punya: dasar hukum, isian yang wajib, berkas
   yang dibutuhkan, dan syarat sebelum boleh lanjut. Berbeda untuk perkara
   Oditurat dan perkara Koneksitas.

   Dasar hukum yang sudah diperiksa terhadap naskah resmi:
   - UU No. 31 Tahun 1997 tentang Peradilan Militer: Pasal 122–131 (Papera,
     pendapat hukum, Skeppera, surat dakwaan), 132–136 (persiapan sidang),
     198–203 (acara pemeriksaan koneksitas).
   Belum diperiksa terhadap naskah resmi (ditandai "perlu validasi"):
   - UU No. 20 Tahun 2025 (KUHAP baru, berlaku 2 Jan 2026) Pasal 170–172
     tentang koneksitas, serta SKB tim tetap 2021 dan Pedoman Jaksa Agung
     No. 2 Tahun 2025. Tim hukum perlu mencocokkan sebelum dipakai resmi.
   ===================================================================== */
window.PROSES = (function () {
  'use strict';

  // [id, nama, jenis berkas, tahap terkait]
  const DOCT = [
    ['lp', 'Laporan Polisi / surat perintah penyidikan', 'doc', 0],
    ['bap', 'BAP tersangka', 'doc', 0],
    ['bapsaksi', 'BAP saksi', 'doc', 0],
    ['tahan', 'Surat perintah penahanan / perpanjangan', 'doc', 0],
    ['visum', 'Hasil visum / laboratorium', 'doc', 0],
    ['foto', 'Foto barang bukti', 'img', 0],
    ['video', 'Video barang bukti', 'vid', 0],
    ['audit', 'Laporan hasil audit kerugian', 'doc', 0],
    ['hasil_teliti', 'Surat hasil penelitian berkas / petunjuk kepada penyidik', 'doc', 1],
    ['sidik_tambahan', 'Berita acara penyidikan tambahan', 'doc', 1],
    ['pendapat_hukum', 'Pendapat hukum Oditur kepada Papera', 'doc', 2],
    ['skeppera', 'Surat Keputusan Penyerahan Perkara (Skeppera)', 'doc', 2],
    ['ba_litbersama', 'Berita acara penelitian bersama', 'doc', 2],
    ['skep_menteri', 'Keputusan Menteri (peradilan militer)', 'doc', 2],
    ['dakwaan', 'Surat dakwaan', 'doc', 3],
    ['pelimpahan', 'Surat pelimpahan perkara ke pengadilan', 'doc', 3],
    ['penetapan_sidang', 'Penetapan majelis hakim & hari sidang', 'doc', 4],
    ['ba_sidang', 'Berita acara sidang', 'doc', 4],
    ['tuntutan', 'Surat tuntutan', 'doc', 4],
    ['putusan', 'Salinan putusan', 'doc', 5],
    ['upaya', 'Akta permohonan upaya hukum', 'doc', 6],
    ['ba_eksekusi', 'Berita acara pelaksanaan putusan', 'doc', 7],
    ['lain', 'Berkas pendukung lainnya', 'doc', -1],
  ];
  const DOCL = Object.fromEntries(DOCT.map((d) => [d[0], d[1]]));

  const V = (c, vals, k) => (vals && vals[k] != null && vals[k] !== '' ? vals[k] : (c.td || {})[k]);
  const yes = (x) => x === 'Ya' || x === true;
  const UMUM = 'Kepentingan umum → peradilan umum';
  const MIL = 'Kepentingan militer → peradilan militer';

  function spec(c, to) {
    const K = c.jenis === 'koneksitas';
    const abs = !!c.absentia && c.cat === 'DES';
    const S = { to, from: to - 1, title: '', basis: [], info: '', fields: [], checks: [], docs: [], dateLabel: 'Tanggal', loopWhen: null, loopKind: '', loopLabel: '' };
    const B = (t, v) => ({ t, v: !!v });
    // pembantu syarat
    const fld = (label, k, basis) => ({ label, req: true, basis, test: (vals) => !!String(V(c, vals, k) || '').trim() });
    const chk = (label, k, basis) => ({ label, req: true, basis, test: (vals) => yes(V(c, vals, k)) });
    const doc = (label, id, req, basis) => ({ label, req, basis, doc: id });
    const prev = (label, keys, basis) => ({ label, req: true, basis, legacy: true, test: (vals) => keys.some((k) => !!V(c, vals, k)) });

    if (to === 1) {
      S.title = 'Serah terima berkas hasil penyidikan';
      S.dateLabel = 'Tanggal berkas perkara diterima';
      S.basis = K
        ? [B('UU 31/1997 Pasal 198 ayat (2): penyidikan koneksitas dilakukan tim tetap (Polisi Militer, Oditur, penyidik umum)'), B('Dasar pembentukan tim tetap: SKB tim tetap penyidikan koneksitas 2021 dan Pedoman Jaksa Agung No. 2 Tahun 2025', true)]
        : [B('UU 31/1997 Pasal 124 ayat (1): Oditur, setelah menerima hasil penyidikan dari Penyidik, segera mempelajari dan meneliti apakah sudah lengkap')];
      S.info = K ? 'Penyidikan dilakukan tim tetap koneksitas. Pada tahap ini berkas hasil penyidikan diserahkan kepada Jaksa dan Oditur untuk diteliti.' : 'Penyidikan dilakukan Polisi Militer. Pada tahap ini berkas hasil penyidikan diserahkan kepada Oditur untuk diteliti, dengan koordinasi Kejati.';
      S.fields = [
        { k: '1.pengantar', label: 'Nomor surat pengantar berkas dari penyidik', type: 'text', req: true, ph: 'Contoh: B/245/XI/2026', full: true },
        ...(K ? [{ k: '1.tim', label: 'Penyidikan dilakukan oleh tim tetap koneksitas (Polisi Militer, Oditur, penyidik umum)', type: 'check' }] : []),
      ];
      S.checks = [
        { label: 'Nomor laporan / sprindik tercatat', req: true, basis: '', test: () => !!c.lp },
        fld('Nomor surat pengantar berkas terisi', '1.pengantar', ''),
        ...(K ? [chk('Penyidikan oleh tim tetap koneksitas', '1.tim', 'Pasal 198 ayat (2)')] : []),
        abs ? { label: 'BAP tersangka tidak disyaratkan: perkara desersi, tersangka belum ditemukan', req: false, basis: 'Pasal 124 ayat (4)', test: () => true } : doc('BAP tersangka sudah diunggah', 'bap', true, 'Pasal 124 ayat (1)'),
        doc('BAP saksi sudah diunggah', 'bapsaksi', false, ''),
        ...(c.ditahan ? [doc('Surat perintah penahanan sudah diunggah', 'tahan', false, '')] : []),
      ];
      S.docs = ['bap', 'bapsaksi', 'tahan', 'visum'];
    } else if (to === 2) {
      S.title = 'Hasil penelitian berkas';
      S.dateLabel = 'Tanggal selesai penelitian';
      S.basis = [
        B('UU 31/1997 Pasal 124 ayat (2): bila persyaratan formal kurang lengkap, Oditur meminta penyidik segera melengkapinya'),
        B('Pasal 124 ayat (3): bila hasil penyidikan belum cukup, Oditur melakukan penyidikan tambahan atau mengembalikan berkas kepada penyidik disertai petunjuk'),
        ...(K ? [B('Penelitian oleh Jaksa dan Oditur atas hasil penyidikan tim tetap (Pasal 199 ayat (1))')] : []),
      ];
      S.info = 'Perkara hanya boleh lanjut bila hasil penelitian menyatakan berkas LENGKAP. Bila belum, hasilnya dicatat dan perkara tetap di tahap ini sampai berkas dilengkapi.';
      S.fields = [
        { k: '1.hasil', label: 'Hasil penelitian berkas', type: 'select', req: true, full: true, opts: ['Lengkap', 'Formal kurang lengkap — penyidik diminta melengkapi', 'Belum cukup — Oditur melakukan penyidikan tambahan', 'Belum cukup — berkas dikembalikan kepada penyidik disertai petunjuk'], def: 'Lengkap' },
        { k: '1.catatan', label: 'Hal yang perlu dilengkapi / petunjuk', type: 'text', full: true, ph: 'Contoh: BAP saksi kunci belum ada, hasil laboratorium belum dilampirkan' },
        { k: '1.surat', label: 'Nomor surat hasil penelitian', type: 'text', ph: 'Contoh: R/58/XI/2026' },
      ];
      S.loopWhen = (v) => !!v['1.hasil'] && v['1.hasil'] !== 'Lengkap';
      S.loopKind = 'return';
      S.loopLabel = 'Catat hasil (perkara tetap di Penelitian Berkas)';
      S.checks = [
        { label: 'Hasil penelitian: berkas lengkap', req: true, basis: 'Pasal 124 ayat (1)', test: (vals) => V(c, vals, '1.hasil') === 'Lengkap' },
        abs ? { label: 'BAP tersangka tidak disyaratkan: desersi, tersangka belum ditemukan', req: false, basis: 'Pasal 124 ayat (4)', test: () => true } : doc('BAP tersangka tersedia', 'bap', true, ''),
        doc('Surat hasil penelitian / petunjuk sudah diunggah', 'hasil_teliti', false, ''),
      ];
      S.docs = ['hasil_teliti', 'sidik_tambahan', 'bap'];
    } else if (to === 3 && !K) {
      S.title = 'Pendapat hukum Oditur & keputusan Papera';
      S.dateLabel = 'Tanggal keputusan Papera';
      S.basis = [
        B('UU 31/1997 Pasal 125 ayat (1): Oditur menyampaikan pendapat hukum kepada Papera: diserahkan ke pengadilan, diselesaikan menurut Hukum Disiplin Prajurit, atau ditutup'),
        B('Pasal 126 ayat (1): Papera mengeluarkan Skeppera, keputusan Hukum Disiplin Prajurit, atau keputusan penutupan perkara'),
        B('Pasal 125 ayat (2): bila Papera tidak sependapat, wajib memberi jawaban tertulis. Pasal 127: perbedaan terus berlanjut diputus Pengadilan Militer Utama'),
      ];
      S.info = abs ? 'Perkara desersi yang tersangkanya belum ditemukan: pendapat hukum tidak diwajibkan (Pasal 125 ayat (1)).' : 'Perkara baru dapat dilimpahkan ke pengadilan setelah Papera menerbitkan Skeppera.';
      const skep = (v) => /Skeppera/.test(v['2.keputusan'] || '');
      const usulSerah = (v) => /diserahkan/.test(v['2.usul'] || '');
      S.fields = [
        { k: '2.ph', label: 'Nomor pendapat hukum Oditur', type: 'text', req: !abs, ph: 'Contoh: PH-12/XI/2026' },
        { k: '2.usul', label: 'Pendapat Oditur kepada Papera', type: 'select', req: true, opts: ['Perkara diserahkan kepada Pengadilan', 'Diselesaikan menurut Hukum Disiplin Prajurit', 'Ditutup demi kepentingan hukum', 'Ditutup demi kepentingan umum/militer'], def: 'Perkara diserahkan kepada Pengadilan' },
        { k: '2.papera', label: 'Perwira Penyerah Perkara (Papera)', type: 'text', req: true, full: true, ph: 'Contoh: Panglima Kodam / Komandan Korem yang ditunjuk' },
        { k: '2.keputusan', label: 'Keputusan Papera', type: 'select', req: true, full: true, opts: ['Surat Keputusan Penyerahan Perkara (Skeppera)', 'Keputusan penyelesaian menurut Hukum Disiplin Prajurit', 'Keputusan penutupan perkara demi kepentingan hukum', 'Keputusan penutupan perkara demi kepentingan umum/militer (Panglima)'], def: 'Surat Keputusan Penyerahan Perkara (Skeppera)' },
        { k: '2.skep', label: 'Nomor Skeppera', type: 'text', req: true, ph: 'Contoh: Kep/412/XI/2026', showWhen: skep },
        { k: '2.jawab', label: 'Papera tidak sependapat dengan Oditur dan sudah memberi jawaban tertulis', type: 'check', full: true, showWhen: (v) => !!v['2.keputusan'] && usulSerah(v) !== skep(v) },
      ];
      S.loopWhen = (v) => !!v['2.keputusan'] && !skep(v);
      S.loopKind = 'close';
      S.loopLabel = 'Catat keputusan (perkara tidak dilanjutkan ke pengadilan)';
      S.checks = [
        abs ? { label: 'Pendapat hukum tidak diwajibkan: desersi, tersangka belum ditemukan', req: false, basis: 'Pasal 125 ayat (1)', test: () => true } : fld('Nomor pendapat hukum Oditur terisi', '2.ph', 'Pasal 125'),
        { label: 'Papera memutuskan perkara diserahkan ke pengadilan (Skeppera)', req: true, basis: 'Pasal 126 ayat (1) huruf a', test: (vals) => /Skeppera/.test(V(c, vals, '2.keputusan') || '') },
        fld('Nomor Skeppera terisi', '2.skep', 'Pasal 126'),
        doc('Skeppera sudah diunggah', 'skeppera', true, ''),
        doc('Pendapat hukum Oditur sudah diunggah', 'pendapat_hukum', false, ''),
        { label: 'Jawaban tertulis Papera tercatat (Papera tidak sependapat dengan Oditur)', req: false, basis: 'Pasal 125 ayat (2)', when: (vals) => !!V(c, vals, '2.keputusan') && /diserahkan/.test(V(c, vals, '2.usul') || '') !== /Skeppera/.test(V(c, vals, '2.keputusan')), test: (vals) => !(V(c, vals, '2.keputusan') && usulSerah({ '2.usul': V(c, vals, '2.usul') }) !== /Skeppera/.test(V(c, vals, '2.keputusan'))) || yes(V(c, vals, '2.jawab')) },
      ];
      S.docs = ['pendapat_hukum', 'skeppera'];
    } else if (to === 3 && K) {
      S.title = 'Penelitian bersama: menentukan peradilan yang berwenang';
      S.dateLabel = 'Tanggal penelitian bersama';
      S.basis = [
        B('UU 31/1997 Pasal 198 ayat (1): perkara koneksitas diadili peradilan umum, kecuali ada keputusan Menteri dengan persetujuan Menteri Kehakiman yang menetapkan peradilan militer'),
        B('Pasal 199: penelitian bersama Jaksa/Jaksa Tinggi dan Oditur atas hasil penyidikan tim tetap; pendapat dituangkan dalam berita acara yang ditandatangani para pihak; persesuaian pendapat dilaporkan kepada Jaksa Agung dan Oditur Jenderal'),
        B('Pasal 200: titik berat kerugian pada kepentingan umum → peradilan umum (Papera membuat Skeppera melalui Oditur kepada Penuntut Umum). Pada kepentingan militer → Oditur Jenderal mengusulkan keputusan Menteri'),
        B('Pasal 202: bila Jaksa dan Oditur berbeda pendapat, dilaporkan tertulis ke Jaksa Agung dan Oditur Jenderal; bila keduanya berbeda, pendapat Jaksa Agung yang menentukan'),
        B('KUHAP baru UU 20/2025 Pasal 170–172 (berlaku 2 Jan 2026) mengatur koneksitas secara lebih ringkas; kesesuaian dengan alur ini perlu divalidasi tim hukum', true),
      ];
      S.info = 'Peradilan yang berwenang ditentukan dari titik berat kerugian. Perkara baru lanjut ke Penuntutan setelah ada persesuaian pendapat dan keputusan penyerahan (peradilan umum) atau keputusan Menteri (peradilan militer).';
      const umum = (v) => V(c, v, '2.titik') === UMUM;
      const mil = (v) => V(c, v, '2.titik') === MIL;
      S.fields = [
        { k: '2.ba', label: 'Nomor berita acara penelitian bersama', type: 'text', req: true, full: true, ph: 'Contoh: BA-12/Kon/XI/2026' },
        { k: '2.titik', label: 'Titik berat kerugian', type: 'select', req: true, full: true, opts: [UMUM, MIL], def: c.cat === 'KOR' ? UMUM : MIL },
        { k: '2.sepakat', label: 'Hasil penelitian bersama', type: 'select', req: true, full: true, opts: ['Ada persesuaian pendapat Jaksa dan Oditur', 'Berbeda pendapat — dilaporkan ke Jaksa Agung dan Oditur Jenderal'], def: 'Ada persesuaian pendapat Jaksa dan Oditur' },
        { k: '2.lapor', label: 'Hasil sudah dilaporkan: Jaksa/Jaksa Tinggi kepada Jaksa Agung, Oditur kepada Oditur Jenderal', type: 'check', full: true },
        { k: '2.skeppera', label: 'Nomor Skeppera (Papera, melalui Oditur kepada Penuntut Umum)', type: 'text', req: true, full: true, showWhen: umum, ph: 'Contoh: Kep/412/XI/2026' },
        { k: '2.kepmen', label: 'Nomor keputusan Menteri (dengan persetujuan Menteri Kehakiman)', type: 'text', req: true, full: true, showWhen: mil, ph: 'Contoh: Kep/XXX/2026' },
      ];
      S.loopWhen = (v) => /^Berbeda/.test(v['2.sepakat'] || '');
      S.loopKind = 'report';
      S.loopLabel = 'Catat perbedaan pendapat (menunggu keputusan Jaksa Agung & Oditur Jenderal)';
      S.checks = [
        fld('Nomor berita acara penelitian bersama terisi', '2.ba', 'Pasal 199 ayat (2)'),
        doc('Berita acara penelitian bersama sudah diunggah', 'ba_litbersama', true, 'Ditandatangani para pihak'),
        { label: 'Ada persesuaian pendapat Jaksa dan Oditur', req: true, basis: 'Pasal 199 ayat (3), Pasal 202', test: (vals) => /^Ada/.test(V(c, vals, '2.sepakat') || '') },
        chk('Hasil sudah dilaporkan ke Jaksa Agung dan Oditur Jenderal', '2.lapor', 'Pasal 199 ayat (3)'),
        { label: 'Peradilan umum: nomor Skeppera tercatat', req: true, basis: 'Pasal 200 ayat (1)', when: umum, test: (vals) => !!V(c, vals, '2.skeppera') },
        { label: 'Peradilan militer: nomor keputusan Menteri tercatat', req: true, basis: 'Pasal 200 ayat (2)–(3)', when: mil, test: (vals) => !!V(c, vals, '2.kepmen') },
        { ...doc('Skeppera sudah diunggah', 'skeppera', false, ''), when: umum },
        { ...doc('Keputusan Menteri sudah diunggah', 'skep_menteri', false, ''), when: mil },
      ];
      S.docs = ['ba_litbersama', 'skeppera', 'skep_menteri'];
    } else if (to === 4) {
      S.title = 'Pelimpahan perkara ke pengadilan';
      S.dateLabel = 'Tanggal pelimpahan ke pengadilan';
      const mil = K && (c.forum === 'militer');
      S.basis = [
        B('UU 31/1997 Pasal 130 ayat (1): penyerahan perkara dilaksanakan Oditur dengan melimpahkan berkas perkara ke pengadilan yang berwenang disertai surat dakwaan'),
        B('Pasal 130 ayat (2)–(3): surat dakwaan diberi tanggal, ditandatangani, memuat identitas terdakwa dan uraian fakta yang cermat, jelas, lengkap dengan waktu dan tempat; bila uraian fakta tidak memenuhi, surat dakwaan batal demi hukum'),
        B('Pasal 130 ayat (4): salinan Skeppera dan surat dakwaan disampaikan kepada tersangka atau penasihat hukumnya bersamaan dengan pelimpahan; tembusan kepada penyidik'),
        B('Pasal 132 dan 136: Kepala Pengadilan menunjuk Majelis Hakim; Hakim Ketua menetapkan hari sidang dan memerintahkan Oditur memanggil terdakwa dan saksi'),
        ...(K ? [B('Pasal 201: berita acara pemeriksaan tim tetap diberi catatan telah diambil alih oleh Penuntut Umum yang mengajukan perkara (atau Oditur bila ke peradilan militer)')] : []),
      ];
      S.info = K ? (mil ? 'Peradilan militer: pelimpahan oleh Oditur berdasarkan keputusan Menteri.' : 'Peradilan umum: pelimpahan oleh Penuntut Umum ke Pengadilan Negeri' + (c.cat === 'KOR' ? ' (Pengadilan Tipikor)' : '') + ' berdasarkan Skeppera.') : 'Pelimpahan oleh Oditur ke Pengadilan Militer berdasarkan Skeppera.';
      const court = MCS.COURT[c.court];
      const mo = MCS.ROMAN[new Date().getMonth()], yr = new Date().getFullYear();
      const reg = () => (c.forum === 'umum' ? `${1 + Math.floor(Math.random() * 120)}/${c.cat === 'KOR' ? 'Pid.Sus-TPK' : 'Pid.B'}/${yr}/PN ${MCS.KJ[c.kejati].city}` : `${1 + Math.floor(Math.random() * 300)}-K/PM.${court.code}/${c.matra}/${mo}/${yr}`);
      S.fields = [
        { sec: 'Surat dakwaan' },
        { k: '3.dakwaan', label: 'Nomor surat dakwaan', type: 'text', req: true, ph: 'Contoh: PDM-45/XI/2026', def: () => 'PDM-' + (10 + Math.floor(Math.random() * 300)) + '/' + yr },
        { k: '3.penuntut', label: 'Penuntut', type: 'ro', value: MCS.penuntutOf(c) },
        { k: '3.identitas', label: 'Memuat identitas lengkap terdakwa: nama, pangkat, NRP, jabatan, kesatuan, tempat/tanggal lahir, jenis kelamin, kewarganegaraan, agama, tempat tinggal', type: 'check', full: true },
        { k: '3.fakta', label: 'Memuat uraian fakta yang cermat, jelas, dan lengkap, dengan waktu dan tempat tindak pidana', type: 'check', full: true },
        { k: '3.salinan', label: 'Salinan Skeppera dan surat dakwaan sudah disampaikan kepada tersangka/penasihat hukum; tembusan kepada penyidik', type: 'check', full: true },
        ...(K ? [{ k: '3.ambil', label: 'BAP tim tetap sudah diberi catatan telah diambil alih oleh ' + (mil ? 'Oditur' : 'Penuntut Umum'), type: 'check', full: true }] : []),
        { sec: 'Penetapan pengadilan' },
        { id: 'm-a', k: '4.reg', label: 'Nomor register perkara', type: 'text', req: true, full: true, def: reg, hint: 'Nomor register dari pengadilan' },
        { id: 'm-b', k: '4.sidang1', label: 'Sidang pertama', type: 'date', req: true, def: () => { const d = new Date(MCS.TODAY + 7 * MCS.DAY); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); } },
        { id: 'm-c', k: '4.jam', label: 'Jam', type: 'select', opts: ['09.00', '10.00', '13.00'], def: '09.00' },
      ];
      S.checks = [
        prev('Keputusan penyerahan perkara tercatat (Skeppera / keputusan Menteri)', ['2.skep', '2.skeppera', '2.kepmen'], 'Pasal 130 ayat (1)'),
        fld('Nomor surat dakwaan terisi', '3.dakwaan', 'Pasal 130 ayat (2)'),
        chk('Surat dakwaan memuat identitas lengkap terdakwa', '3.identitas', 'Pasal 130 ayat (2) huruf a'),
        chk('Surat dakwaan memuat uraian fakta (waktu dan tempat); bila tidak, batal demi hukum', '3.fakta', 'Pasal 130 ayat (2) huruf b, ayat (3)'),
        chk('Salinan Skeppera dan surat dakwaan sudah disampaikan kepada tersangka', '3.salinan', 'Pasal 130 ayat (4)'),
        ...(K ? [chk('BAP tim tetap diberi catatan telah diambil alih', '3.ambil', 'Pasal 201')] : []),
        doc('Surat dakwaan sudah diunggah', 'dakwaan', true, ''),
        doc('Surat pelimpahan perkara sudah diunggah', 'pelimpahan', false, ''),
      ];
      S.docs = ['dakwaan', 'pelimpahan', 'penetapan_sidang'];
    } else if (to === 5) {
      S.title = 'Putusan tingkat pertama';
      S.dateLabel = 'Tanggal putusan';
      S.basis = K ? [B('UU 31/1997 Pasal 203 ayat (1): majelis hakim koneksitas sekurang-kurangnya 3 hakim; pada peradilan umum ketua dari peradilan umum dan anggota ditetapkan berimbang dari peradilan umum dan militer')] : [];
      S.info = 'Isi setelah majelis hakim membacakan putusan.';
      S.fields = [
        { id: 'm-a', k: '5.pidana', label: 'Pidana penjara (bulan)', type: 'num', req: true, def: '12', hint: 'Isi 0 untuk putusan bebas/lepas' },
        { id: 'm-b', k: '5.tambahan', label: 'Pidana tambahan', type: 'select', full: true, opts: [['', 'Tidak ada'], ['Dipecat dari dinas militer', 'Pemecatan dari dinas militer (Pasal 26 KUHPM)'], ['Uang pengganti', 'Pembayaran uang pengganti']], def: '' },
        { k: '4.tuntutan', label: 'Tuntutan penuntut (bulan pidana penjara)', type: 'num', ph: 'Contoh: 18' },
        { k: '5.nomor', label: 'Nomor putusan', type: 'text', ph: 'Contoh: 45-K/PM.II-08/AD/XI/2026' },
        { k: '5.pembuktian', label: 'Pembuktian dan pembacaan tuntutan sudah dilaksanakan di persidangan', type: 'check', full: true },
        ...(K ? [{ k: '5.majelis', label: 'Majelis hakim terdiri dari sekurang-kurangnya 3 orang', type: 'check', full: true }] : []),
      ];
      S.checks = [
        chk('Pembuktian dan pembacaan tuntutan sudah dilaksanakan', '5.pembuktian', ''),
        ...(K ? [chk('Majelis hakim sekurang-kurangnya 3 orang', '5.majelis', 'Pasal 203 ayat (1)')] : []),
        doc('Salinan putusan sudah diunggah', 'putusan', false, ''),
      ];
      S.docs = ['tuntutan', 'putusan', 'ba_sidang'];
    } else if (to === 6) {
      S.title = 'Upaya hukum';
      S.dateLabel = 'Tanggal permohonan';
      S.info = 'Diisi bila terdakwa atau penuntut mengajukan upaya hukum.';
      S.fields = [
        { id: 'm-a', k: '6.jenis', label: 'Jenis upaya hukum', type: 'select', req: true, opts: ['Banding', 'Kasasi', 'Peninjauan kembali'], def: 'Banding' },
        { id: 'm-b', k: '6.oleh', label: 'Diajukan oleh', type: 'select', opts: ['Terdakwa', K ? 'Penuntut umum' : 'Oditur'], def: 'Terdakwa' },
      ];
      S.checks = [{ label: 'Putusan tingkat pertama sudah diucapkan', req: true, basis: '', test: () => c.st >= 5 }, doc('Akta permohonan upaya hukum sudah diunggah', 'upaya', false, '')];
      S.docs = ['upaya'];
    } else if (to === 7) {
      S.title = 'Eksekusi putusan';
      S.dateLabel = 'Tanggal berkekuatan hukum tetap';
      S.info = K ? 'Eksekusi dilaksanakan Jaksa.' : 'Eksekusi dilaksanakan Oditurat, dipantau Kejati.';
      S.fields = [
        { id: 'm-a', k: '7.status', label: 'Status eksekusi', type: 'select', full: true, opts: ['Menunggu eksekusi', 'Sudah dieksekusi', 'Pengawasan putusan bersyarat'], def: 'Menunggu eksekusi' },
        { k: '7.pelaksana', label: 'Pelaksana eksekusi', type: 'ro', value: K ? 'Jaksa ' + MCS.KJ[c.kejati].short : c.otmil + ' (dipantau ' + MCS.KJ[c.kejati].short + ')' },
      ];
      S.checks = [{ label: 'Putusan sudah berkekuatan hukum tetap', req: true, basis: '', test: () => c.st >= 5 }, doc('Berita acara pelaksanaan putusan sudah diunggah', 'ba_eksekusi', false, '')];
      S.docs = ['ba_eksekusi'];
    }
    return S;
  }

  /** Evaluasi syarat. hasDoc(id) → boleh dari berkas tersimpan atau berkas yang baru dipilih. */
  function evalChecks(c, sp, vals, hasDoc) {
    const gated = !!c.gate;
    return sp.checks.filter((x) => !x.when || x.when(vals || {})).map((x) => {
      let ok;
      if (x.doc) ok = !gated || hasDoc(x.doc);
      else if (x.legacy && !gated) ok = true;
      else ok = !!x.test(vals || {});
      return { label: x.label, req: x.req, basis: x.basis || '', ok, doc: x.doc || '' };
    });
  }

  /** Label isian per kunci, dikumpulkan dari semua tahap untuk tampilan "Proses". */
  function labelsFor(c) {
    const out = {};
    for (let to = 1; to <= 7; to++) spec(c, to).fields.forEach((f) => { if (f.k && !f.sec && f.type !== 'ro') out[f.k] = { label: f.label, type: f.type, stage: parseInt(f.k, 10) }; });
    return out;
  }

  return { DOCT, DOCL, spec, evalChecks, labelsFor, UMUM, MIL };
})();
