/* =====================================================================
   MCS — Military Crime System · Shared data layer
   Model domain peradilan militer (UU 31/1997) + data dummy deterministik.
   Dipakai oleh Command Center (index.html) dan Workspace (admin.html).

   Sumber referensi struktur:
   - UU No. 31 Tahun 1997 tentang Peradilan Militer
   - PP No. 22 Tahun 2025 (Dilmilti IV Balikpapan & V Makassar)
   - PP No. 23 Tahun 2025 (susunan 22 Pengadilan Militer)
   - Batas Kab/Kota: BPS/OCHA via geoBoundaries (data/geo-id.js)
   Seluruh data PERKARA adalah dummy untuk keperluan desain.
   ===================================================================== */
(function () {
  'use strict';

  // ---------- Seeded RNG ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const rng = mulberry32(20261015);
  const pick = (arr, r = rng) => arr[Math.floor(r() * arr.length)];
  const wpick = (items, weights, r = rng) => {
    const s = weights.reduce((a, b) => a + b, 0);
    let x = r() * s;
    for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x <= 0) return items[i]; }
    return items[items.length - 1];
  };
  const between = (a, b, r = rng) => a + r() * (b - a);

  // ---------- Waktu ----------
  // Data dibangkitkan relatif terhadap "hari ini" agar agenda sidang selalu relevan saat demo.
  const DAY = 86400000;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const TODAY = today.getTime();
  const NOW = Date.now();
  const START = TODAY - 1000 * DAY;

  // ---------- Wilayah: 38 provinsi ----------
  const PROV = {
    11: 'Aceh', 12: 'Sumatera Utara', 13: 'Sumatera Barat', 14: 'Riau', 15: 'Jambi', 16: 'Sumatera Selatan',
    17: 'Bengkulu', 18: 'Lampung', 19: 'Kepulauan Bangka Belitung', 21: 'Kepulauan Riau', 31: 'DKI Jakarta',
    32: 'Jawa Barat', 33: 'Jawa Tengah', 34: 'DI Yogyakarta', 35: 'Jawa Timur', 36: 'Banten', 51: 'Bali',
    52: 'Nusa Tenggara Barat', 53: 'Nusa Tenggara Timur', 61: 'Kalimantan Barat', 62: 'Kalimantan Tengah',
    63: 'Kalimantan Selatan', 64: 'Kalimantan Timur', 65: 'Kalimantan Utara', 71: 'Sulawesi Utara',
    72: 'Sulawesi Tengah', 73: 'Sulawesi Selatan', 74: 'Sulawesi Tenggara', 75: 'Gorontalo', 76: 'Sulawesi Barat',
    81: 'Maluku', 82: 'Maluku Utara', 91: 'Papua', 92: 'Papua Barat', 93: 'Papua Selatan', 94: 'Papua Tengah',
    95: 'Papua Pegunungan', 96: 'Papua Barat Daya',
  };
  const provIds = Object.keys(PROV).map(Number);

  // Kab/Kota diambil dari data batas wilayah asli (TopoJSON)
  const KABS = [];
  const KAB = {};
  (window.IDN_TOPO ? window.IDN_TOPO.objects.kab.geometries : []).forEach((g) => {
    const k = { id: g.id, p: g.properties.p, name: g.properties.n, kota: !!g.properties.k, lng: g.properties.c[0], lat: g.properties.c[1] };
    k.short = k.name.replace(/^Kab\. /, '');
    KABS.push(k); KAB[k.id] = k;
  });
  const kabsOf = (p) => KABS.filter((k) => k.p === +p);

  // Kecamatan contoh (hanya untuk lokasi kejadian pada beberapa kota besar)
  const KEC = {
    'Kota Jakarta Selatan': ['Kebayoran Baru', 'Kebayoran Lama', 'Pesanggrahan', 'Cilandak', 'Pasar Minggu', 'Jagakarsa', 'Mampang Prapatan', 'Pancoran', 'Tebet', 'Setiabudi'],
    'Kota Jakarta Timur': ['Matraman', 'Pulo Gadung', 'Jatinegara', 'Kramat Jati', 'Pasar Rebo', 'Cakung', 'Duren Sawit', 'Makasar', 'Ciracas', 'Cipayung'],
    'Kota Jakarta Pusat': ['Gambir', 'Tanah Abang', 'Menteng', 'Senen', 'Cempaka Putih', 'Johar Baru', 'Kemayoran', 'Sawah Besar'],
    'Kota Jakarta Utara': ['Penjaringan', 'Pademangan', 'Tanjung Priok', 'Koja', 'Kelapa Gading', 'Cilincing'],
    'Kota Jakarta Barat': ['Cengkareng', 'Grogol Petamburan', 'Taman Sari', 'Tambora', 'Kebon Jeruk', 'Kalideres', 'Palmerah', 'Kembangan'],
    'Kab. Pandeglang': ['Pandeglang', 'Labuan', 'Carita', 'Menes', 'Saketi', 'Cibaliung', 'Panimbang', 'Sumur', 'Cikeusik', 'Kaduhejo'],
    'Kab. Bogor': ['Cibinong', 'Gunung Putri', 'Citeureup', 'Sukaraja', 'Cileungsi', 'Ciawi', 'Cisarua', 'Dramaga', 'Parung', 'Bojonggede'],
    'Kota Bandung': ['Coblong', 'Sukajadi', 'Cicendo', 'Andir', 'Bandung Wetan', 'Sumur Bandung', 'Lengkong', 'Regol', 'Antapani', 'Arcamanik'],
    'Kota Surabaya': ['Genteng', 'Tegalsari', 'Gubeng', 'Wonokromo', 'Sawahan', 'Tambaksari', 'Rungkut', 'Sukolilo', 'Mulyorejo', 'Benowo'],
    'Kota Semarang': ['Semarang Tengah', 'Semarang Utara', 'Gayamsari', 'Candisari', 'Gajahmungkur', 'Pedurungan', 'Tembalang', 'Banyumanik'],
    'Kota Medan': ['Medan Kota', 'Medan Baru', 'Medan Petisah', 'Medan Helvetia', 'Medan Johor', 'Medan Amplas', 'Medan Belawan'],
    'Kota Makassar': ['Mariso', 'Mamajang', 'Tamalate', 'Rappocini', 'Ujung Pandang', 'Panakkukang', 'Biringkanaya', 'Tamalanrea'],
    'Kota Denpasar': ['Denpasar Barat', 'Denpasar Timur', 'Denpasar Selatan', 'Denpasar Utara'],
    'Kota Jayapura': ['Jayapura Utara', 'Jayapura Selatan', 'Abepura', 'Heram', 'Muara Tami'],
  };

  // ---------- Lembaga peradilan militer ----------
  // Kedudukan & daerah hukum: PP 23/2025 (Dilmil) dan PP 22/2025 (Dilmilti IV & V).
  // Daerah hukum Dilmil yang tidak diatur PP tersebut bersifat INDIKATIF (perlu validasi).
  const DILMILTI = [
    { id: 'T1', code: 'PMT-I', name: 'Pengadilan Militer Tinggi I Medan', short: 'Dilmilti I Medan', city: 'Medan', lng: 98.6722, lat: 3.5952 },
    { id: 'T2', code: 'PMT-II', name: 'Pengadilan Militer Tinggi II Jakarta', short: 'Dilmilti II Jakarta', city: 'Jakarta', lng: 106.8650, lat: -6.2088 },
    { id: 'T3', code: 'PMT-III', name: 'Pengadilan Militer Tinggi III Surabaya', short: 'Dilmilti III Surabaya', city: 'Surabaya', lng: 112.7521, lat: -7.2575 },
    { id: 'T4', code: 'PMT-IV', name: 'Pengadilan Militer Tinggi IV Balikpapan', short: 'Dilmilti IV Balikpapan', city: 'Balikpapan', lng: 116.8529, lat: -1.2379 },
    { id: 'T5', code: 'PMT-V', name: 'Pengadilan Militer Tinggi V Makassar', short: 'Dilmilti V Makassar', city: 'Makassar', lng: 119.4327, lat: -5.1477 },
  ];
  const D = (code, city, lng, lat, tinggi, prov, kabs) => ({ id: code, code, name: 'Pengadilan Militer ' + code + ' ' + city, short: 'Dilmil ' + code + ' ' + city, city, lng, lat, tinggi, prov, kabs: kabs || null });
  const MADIUN_KABS = ['Kab. Madiun', 'Kota Madiun', 'Kab. Magetan', 'Kab. Ngawi', 'Kab. Ponorogo', 'Kab. Pacitan', 'Kab. Nganjuk', 'Kab. Bojonegoro', 'Kab. Tuban', 'Kab. Kediri', 'Kota Kediri', 'Kab. Tulungagung', 'Kab. Trenggalek', 'Kab. Blitar', 'Kota Blitar'];
  const DILMIL = [
    D('I-01', 'Banda Aceh', 95.3238, 5.5483, 'T1', [11]),
    D('I-02', 'Medan', 98.6722, 3.5952, 'T1', [12]),
    D('I-03', 'Pekanbaru', 101.4478, 0.5071, 'T1', [14, 21]),
    D('I-04', 'Padang', 100.4172, -0.9471, 'T1', [13, 15]),
    D('I-05', 'Palembang', 104.7754, -2.9761, 'T1', [16, 17, 18, 19]),
    D('II-06', 'Jakarta', 106.9004, -6.2250, 'T2', [31, 36]),
    D('II-07', 'Bandung', 107.6191, -6.9175, 'T2', [32]),
    D('II-08', 'Semarang', 110.4203, -6.9932, 'T2', [33]),
    D('II-09', 'Yogyakarta', 110.3695, -7.7956, 'T2', [34]),
    D('III-10', 'Surabaya', 112.7521, -7.2575, 'T3', [35]),
    D('III-11', 'Madiun', 111.5239, -7.6298, 'T3', [], MADIUN_KABS),
    D('III-12', 'Denpasar', 115.2126, -8.6705, 'T3', [51, 52]),
    D('III-13', 'Kupang', 123.6070, -10.1772, 'T3', [53]),
    D('IV-14', 'Pontianak', 109.3425, -0.0263, 'T4', [61]),
    D('IV-15', 'Banjarmasin', 114.5944, -3.3186, 'T4', [63, 62]),
    D('IV-16', 'Balikpapan', 116.8529, -1.2379, 'T4', [64, 65]),
    D('V-17', 'Makassar', 119.4327, -5.1477, 'T5', [73, 76]),
    D('V-18', 'Kendari', 122.5129, -3.9985, 'T5', [74, 72]),
    D('V-19', 'Manado', 124.8421, 1.4748, 'T5', [71, 75]),
    D('V-20', 'Ambon', 128.1814, -3.6954, 'T5', [81, 82]),
    D('V-21', 'Manokwari', 134.0620, -0.8615, 'T5', [92, 96]),
    D('V-22', 'Jayapura', 140.7181, -2.5337, 'T5', [91, 93, 94, 95]),
  ];
  const DILMILTAMA = { id: 'UTAMA', code: 'PMU', name: 'Pengadilan Militer Utama', short: 'Dilmiltama', city: 'Jakarta', lng: 106.8272, lat: -6.1754 };
  const COURT = {};
  DILMIL.forEach((c) => { c.level = 'dilmil'; COURT[c.id] = c; });
  DILMILTI.forEach((c) => { c.level = 'dilmilti'; COURT[c.id] = c; });
  DILMILTAMA.level = 'dilmiltama'; COURT.UTAMA = DILMILTAMA;
  // Oditurat mengikuti kedudukan pengadilan (nama tanpa kode — penomoran Otmil perlu dikonfirmasi Orjen TNI)
  const otmilOf = (court) => (court.level === 'dilmilti' ? 'Oditurat Militer Tinggi ' + court.city : 'Oditurat Militer ' + court.city);

  const kabCourt = {};
  KABS.forEach((k) => {
    const byKab = DILMIL.find((d) => d.kabs && d.kabs.includes(k.name));
    kabCourt[k.id] = byKab ? byKab.id : (DILMIL.find((d) => d.prov.includes(k.p)) || DILMIL[5]).id;
  });
  const courtOfKab = (kabId) => COURT[kabCourt[kabId]];

  // ---------- Satuan ----------
  const MATRA = [
    { id: 'AD', name: 'TNI Angkatan Darat', short: 'TNI AD' },
    { id: 'AL', name: 'TNI Angkatan Laut', short: 'TNI AL' },
    { id: 'AU', name: 'TNI Angkatan Udara', short: 'TNI AU' },
  ];
  const KODAM = {
    11: 'Kodam Iskandar Muda', 12: 'Kodam I/Bukit Barisan', 13: 'Kodam I/Bukit Barisan', 14: 'Kodam I/Bukit Barisan', 21: 'Kodam I/Bukit Barisan',
    15: 'Kodam II/Sriwijaya', 16: 'Kodam II/Sriwijaya', 17: 'Kodam II/Sriwijaya', 18: 'Kodam II/Sriwijaya', 19: 'Kodam II/Sriwijaya',
    31: 'Kodam Jaya/Jayakarta', 32: 'Kodam III/Siliwangi', 36: 'Kodam III/Siliwangi', 33: 'Kodam IV/Diponegoro', 34: 'Kodam IV/Diponegoro',
    35: 'Kodam V/Brawijaya', 51: 'Kodam IX/Udayana', 52: 'Kodam IX/Udayana', 53: 'Kodam IX/Udayana', 61: 'Kodam XII/Tanjungpura', 62: 'Kodam XII/Tanjungpura',
    63: 'Kodam VI/Mulawarman', 64: 'Kodam VI/Mulawarman', 65: 'Kodam VI/Mulawarman', 71: 'Kodam XIII/Merdeka', 72: 'Kodam XIII/Merdeka', 75: 'Kodam XIII/Merdeka',
    73: 'Kodam XIV/Hasanuddin', 74: 'Kodam XIV/Hasanuddin', 76: 'Kodam XIV/Hasanuddin', 81: 'Kodam XVI/Pattimura', 82: 'Kodam XVI/Pattimura',
    92: 'Kodam XVIII/Kasuari', 96: 'Kodam XVIII/Kasuari', 91: 'Kodam XVII/Cenderawasih', 93: 'Kodam XVII/Cenderawasih', 94: 'Kodam XVII/Cenderawasih', 95: 'Kodam XVII/Cenderawasih',
  };
  const LANTAMAL = {
    12: 'Lantamal I Belawan', 13: 'Lantamal II Padang', 31: 'Lantamal III Jakarta', 32: 'Lantamal III Jakarta', 36: 'Lantamal III Jakarta',
    21: 'Lantamal IV Tanjungpinang', 14: 'Lantamal IV Tanjungpinang', 35: 'Lantamal V Surabaya', 51: 'Lantamal V Surabaya', 52: 'Lantamal V Surabaya',
    73: 'Lantamal VI Makassar', 74: 'Lantamal VI Makassar', 76: 'Lantamal VI Makassar', 53: 'Lantamal VII Kupang', 71: 'Lantamal VIII Bitung',
    72: 'Lantamal VIII Bitung', 75: 'Lantamal VIII Bitung', 81: 'Lantamal IX Ambon', 82: 'Lantamal IX Ambon', 91: 'Lantamal X Jayapura',
    94: 'Lantamal X Jayapura', 95: 'Lantamal X Jayapura', 93: 'Lantamal XI Merauke', 61: 'Lantamal XII Pontianak', 62: 'Lantamal XII Pontianak',
    63: 'Lantamal XIII Tarakan', 64: 'Lantamal XIII Tarakan', 65: 'Lantamal XIII Tarakan', 92: 'Lantamal XIV Sorong', 96: 'Lantamal XIV Sorong',
    11: 'Lanal Sabang', 15: 'Lanal Palembang', 16: 'Lanal Palembang', 17: 'Lanal Bengkulu', 18: 'Lanal Lampung', 19: 'Lanal Bangka Belitung',
    33: 'Lanal Semarang', 34: 'Lanal Yogyakarta',
  };
  const LANUD = {
    11: 'Lanud Sultan Iskandar Muda', 12: 'Lanud Soewondo', 13: 'Lanud Sutan Sjahrir', 14: 'Lanud Roesmin Nurjadin', 21: 'Lanud Raja Haji Fisabilillah',
    15: 'Lanud Sri Mulyono Herlambang', 16: 'Lanud Sri Mulyono Herlambang', 17: 'Lanud Sri Mulyono Herlambang', 18: 'Lanud Pangeran M. Bun Yamin',
    19: 'Lanud Sri Mulyono Herlambang', 31: 'Lanud Halim Perdanakusuma', 36: 'Lanud Gorda', 32: 'Lanud Husein Sastranegara', 33: 'Lanud Adi Soemarmo',
    34: 'Lanud Adisutjipto', 35: 'Lanud Iswahjudi', 51: 'Lanud I Gusti Ngurah Rai', 52: 'Lanud I Gusti Ngurah Rai', 53: 'Lanud El Tari',
    61: 'Lanud Supadio', 62: 'Lanud Supadio', 63: 'Lanud Sjamsudin Noor', 64: 'Lanud Dhomber', 65: 'Lanud Dhomber', 71: 'Lanud Sam Ratulangi',
    72: 'Lanud Sam Ratulangi', 75: 'Lanud Sam Ratulangi', 73: 'Lanud Sultan Hasanuddin', 76: 'Lanud Sultan Hasanuddin', 74: 'Lanud Haluoleo',
    81: 'Lanud Pattimura', 82: 'Lanud Pattimura', 91: 'Lanud Silas Papare', 94: 'Lanud Silas Papare', 95: 'Lanud Silas Papare', 92: 'Lanud Silas Papare',
    96: 'Lanud Silas Papare', 93: 'Lanud J.A. Dimara',
  };

  // Pangkat (golongan menentukan kompetensi pengadilan: Mayor ke atas → Dilmilti tingkat pertama)
  const PANGKAT = {
    AD: [['Prada', 'T'], ['Pratu', 'T'], ['Praka', 'T'], ['Kopda', 'T'], ['Koptu', 'T'], ['Kopka', 'T'], ['Serda', 'B'], ['Sertu', 'B'], ['Serka', 'B'], ['Serma', 'B'], ['Pelda', 'B'], ['Peltu', 'B'], ['Letda', 'PA'], ['Lettu', 'PA'], ['Kapten', 'PA'], ['Mayor', 'PM'], ['Letkol', 'PM'], ['Kolonel', 'PM']],
    AL: [['Kelasi Dua', 'T'], ['Kelasi Satu', 'T'], ['Kelasi Kepala', 'T'], ['Kopda', 'T'], ['Koptu', 'T'], ['Kopka', 'T'], ['Serda', 'B'], ['Sertu', 'B'], ['Serka', 'B'], ['Serma', 'B'], ['Pelda', 'B'], ['Peltu', 'B'], ['Letda', 'PA'], ['Lettu', 'PA'], ['Kapten', 'PA'], ['Mayor', 'PM'], ['Letkol', 'PM'], ['Kolonel', 'PM']],
    AU: [['Prada', 'T'], ['Pratu', 'T'], ['Praka', 'T'], ['Kopda', 'T'], ['Koptu', 'T'], ['Kopka', 'T'], ['Serda', 'B'], ['Sertu', 'B'], ['Serka', 'B'], ['Serma', 'B'], ['Pelda', 'B'], ['Peltu', 'B'], ['Letda', 'PA'], ['Lettu', 'PA'], ['Kapten', 'PA'], ['Mayor', 'PM'], ['Letkol', 'PM'], ['Kolonel', 'PM']],
  };
  const GOL = { T: 'Tamtama', B: 'Bintara', PA: 'Perwira Pertama', PM: 'Perwira Menengah' };
  const KORPS_HUKUM = { AD: 'Chk', AL: 'Laut (H)', AU: 'Kum' };

  // ---------- Hukum: undang-undang & pasal ----------
  // Ancaman pidana diringkas; padanan KUHP 2023 (UU 1/2023, berlaku 2 Jan 2026) perlu validasi tim hukum.
  const LAWS = [
    { id: 'KUHPM', name: 'KUHPM', full: 'Kitab Undang-Undang Hukum Pidana Militer (Wetboek van Militair Strafrecht, UU No. 39 Tahun 1947)', about: 'Tindak pidana militer murni' },
    { id: 'KUHP', name: 'KUHP', full: 'KUHP (lama) — berlaku untuk tempus delicti sebelum 2 Januari 2026', about: 'Pidana umum' },
    { id: 'NARK', name: 'UU Narkotika', full: 'UU No. 35 Tahun 2009 tentang Narkotika', about: 'Narkotika' },
    { id: 'TPK', name: 'UU Tipikor', full: 'UU No. 31 Tahun 1999 jo. UU No. 20 Tahun 2001', about: 'Pemberantasan Tindak Pidana Korupsi' },
    { id: 'PKDRT', name: 'UU PKDRT', full: 'UU No. 23 Tahun 2004 tentang Penghapusan Kekerasan dalam Rumah Tangga', about: 'KDRT' },
    { id: 'TPKS', name: 'UU TPKS', full: 'UU No. 12 Tahun 2022 tentang Tindak Pidana Kekerasan Seksual', about: 'Kekerasan seksual' },
    { id: 'DRT', name: 'UU Darurat 12/1951', full: 'UU Darurat No. 12 Tahun 1951', about: 'Senjata api, amunisi & bahan peledak' },
    { id: 'LLAJ', name: 'UU LLAJ', full: 'UU No. 22 Tahun 2009 tentang Lalu Lintas dan Angkutan Jalan', about: 'Lalu lintas' },
    { id: 'ITE', name: 'UU ITE', full: 'UU No. 11 Tahun 2008 jo. UU No. 1 Tahun 2024', about: 'Informasi & transaksi elektronik' },
  ];
  const LAW = Object.fromEntries(LAWS.map((l) => [l.id, l]));
  const ARTS = [
    ['KUHPM-85', 'KUHPM', 'Pasal 85', 'Ketidakhadiran tanpa izin (THTI) karena salahnya', 'Penjara maks. 9 bulan', ''],
    ['KUHPM-86', 'KUHPM', 'Pasal 86', 'Dengan sengaja tidak hadir tanpa izin (1–30 hari) dalam masa damai', 'Penjara maks. 1 tahun 4 bulan', ''],
    ['KUHPM-87', 'KUHPM', 'Pasal 87 ayat (1) ke-2', 'Desersi — tidak hadir tanpa izin lebih dari 30 hari dalam masa damai', 'Penjara maks. 2 tahun 8 bulan', ''],
    ['KUHPM-103', 'KUHPM', 'Pasal 103 ayat (1)', 'Menolak atau dengan sengaja tidak menaati perintah dinas', 'Penjara maks. 2 tahun 4 bulan', ''],
    ['KUHPM-126', 'KUHPM', 'Pasal 126', 'Menyalahgunakan atau menganggap secara tidak sah kekuasaannya, memaksa seseorang berbuat/tidak berbuat', 'Penjara maks. 5 tahun', ''],
    ['KUHPM-26', 'KUHPM', 'Pasal 26', 'Pidana tambahan pemecatan dari dinas militer', 'Pidana tambahan', ''],
    ['KUHP-351', 'KUHP', 'Pasal 351 ayat (1)', 'Penganiayaan', 'Penjara maks. 2 tahun 8 bulan', 'Pasal 466'],
    ['KUHP-170', 'KUHP', 'Pasal 170', 'Kekerasan terhadap orang/barang secara bersama-sama di muka umum', 'Penjara maks. 5 tahun 6 bulan', 'Pasal 262'],
    ['KUHP-338', 'KUHP', 'Pasal 338', 'Pembunuhan', 'Penjara maks. 15 tahun', 'Pasal 458'],
    ['KUHP-340', 'KUHP', 'Pasal 340', 'Pembunuhan berencana', 'Pidana mati / seumur hidup / maks. 20 tahun', 'Pasal 459'],
    ['KUHP-362', 'KUHP', 'Pasal 362', 'Pencurian', 'Penjara maks. 5 tahun', 'Pasal 476'],
    ['KUHP-372', 'KUHP', 'Pasal 372', 'Penggelapan', 'Penjara maks. 4 tahun', 'Pasal 486'],
    ['KUHP-378', 'KUHP', 'Pasal 378', 'Penipuan', 'Penjara maks. 4 tahun', 'Pasal 492'],
    ['KUHP-281', 'KUHP', 'Pasal 281', 'Kejahatan terhadap kesusilaan', 'Penjara maks. 2 tahun 8 bulan', 'Pasal 406'],
    ['KUHP-303', 'KUHP', 'Pasal 303', 'Perjudian', 'Penjara maks. 10 tahun', 'Pasal 426'],
    ['NAR-112', 'NARK', 'Pasal 112 ayat (1)', 'Memiliki, menyimpan, menguasai Narkotika Golongan I bukan tanaman', 'Penjara 4–12 tahun', ''],
    ['NAR-114', 'NARK', 'Pasal 114 ayat (1)', 'Menjual, membeli, menjadi perantara Narkotika Golongan I', 'Penjara 5–20 tahun / seumur hidup / mati', ''],
    ['NAR-127', 'NARK', 'Pasal 127 ayat (1) huruf a', 'Penyalah guna Narkotika Golongan I bagi diri sendiri', 'Penjara maks. 4 tahun', ''],
    ['TPK-2', 'TPK', 'Pasal 2 ayat (1)', 'Memperkaya diri/orang lain secara melawan hukum yang merugikan keuangan negara', 'Penjara 4–20 tahun / seumur hidup', 'Pasal 603'],
    ['TPK-3', 'TPK', 'Pasal 3', 'Menyalahgunakan kewenangan karena jabatan yang merugikan keuangan negara', 'Penjara 1–20 tahun / seumur hidup', 'Pasal 604'],
    ['TPK-8', 'TPK', 'Pasal 8', 'Penggelapan uang/surat berharga karena jabatan', 'Penjara 3–15 tahun', ''],
    ['PKDRT-44', 'PKDRT', 'Pasal 44 ayat (1)', 'Kekerasan fisik dalam lingkup rumah tangga', 'Penjara maks. 5 tahun', ''],
    ['TPKS-6', 'TPKS', 'Pasal 6 huruf c', 'Pelecehan seksual fisik dengan penyalahgunaan kedudukan/wewenang', 'Penjara maks. 12 tahun', ''],
    ['DRT-1', 'DRT', 'Pasal 1 ayat (1)', 'Tanpa hak menguasai, menyimpan, menggunakan senjata api/amunisi/bahan peledak', 'Pidana mati / seumur hidup / maks. 20 tahun', ''],
    ['LLAJ-310', 'LLAJ', 'Pasal 310 ayat (4)', 'Kelalaian berkendara yang mengakibatkan orang lain meninggal dunia', 'Penjara maks. 6 tahun', ''],
    ['ITE-27', 'ITE', 'Pasal 27 ayat (2) jo. Pasal 45 ayat (3)', 'Mendistribusikan muatan perjudian secara elektronik', 'Penjara maks. 10 tahun', ''],
  ].map(([id, law, pasal, desc, threat, baru]) => ({ id, law, pasal, desc, threat, baru }));
  const ART = Object.fromEntries(ARTS.map((a) => [a.id, a]));
  const artLabel = (id) => (ART[id] ? ART[id].pasal.replace(/ ayat.*| huruf.*/, '') + ' ' + LAW[ART[id].law].name : id);

  // ---------- Klasifikasi perkara ----------
  // kn: jenis kerugian — 'negara' (keuangan negara / materiil TNI) atau 'korban'
  const CATS = [
    { id: 'DES', name: 'Desersi & THTI', w: 27, arts: [[['KUHPM-87'], 6], [['KUHPM-86'], 3], [['KUHPM-85'], 1]] },
    { id: 'NAR', name: 'Narkotika', w: 17, arts: [[['NAR-127'], 4], [['NAR-112'], 4], [['NAR-114', 'NAR-112'], 2]] },
    { id: 'ANI', name: 'Penganiayaan & Kekerasan', w: 11, arts: [[['KUHP-351'], 5], [['KUHP-170'], 3], [['KUHP-351', 'KUHPM-126'], 1]] },
    { id: 'ASU', name: 'Asusila & Kekerasan Seksual', w: 9, arts: [[['KUHP-281'], 3], [['TPKS-6'], 3]] },
    { id: 'PEN', name: 'Penipuan & Penggelapan', w: 9, kn: 'korban', arts: [[['KUHP-378'], 4], [['KUHP-372'], 3], [['KUHP-378', 'KUHP-372'], 2]] },
    { id: 'KDR', name: 'KDRT', w: 6, arts: [[['PKDRT-44'], 1]] },
    { id: 'KOR', name: 'Korupsi & Penyalahgunaan Anggaran', w: 5, kn: 'negara', arts: [[['TPK-3'], 4], [['TPK-2', 'TPK-3'], 3], [['TPK-8'], 2]] },
    { id: 'SEN', name: 'Senjata Api & Bahan Peledak', w: 4, arts: [[['DRT-1'], 1]] },
    { id: 'LAL', name: 'Kecelakaan Lalu Lintas', w: 4, arts: [[['LLAJ-310'], 1]] },
    { id: 'MAT', name: 'Pencurian / Materiil Militer', w: 3, kn: 'negara', arts: [[['KUHP-362'], 2], [['KUHP-362', 'KUHP-372'], 1]] },
    { id: 'JUD', name: 'Perjudian (termasuk daring)', w: 3, arts: [[['ITE-27'], 3], [['KUHP-303'], 1]] },
    { id: 'INS', name: 'Insubordinasi & Penyalahgunaan Wewenang', w: 2, arts: [[['KUHPM-103'], 3], [['KUHPM-126'], 2]] },
    { id: 'PMB', name: 'Pembunuhan', w: 1, arts: [[['KUHP-338'], 3], [['KUHP-340'], 1]] },
  ];
  const CAT = Object.fromEntries(CATS.map((c) => [c.id, c]));

  const TITLES = {
    DES: ['Meninggalkan kesatuan tanpa izin lebih dari 30 hari', 'Tidak kembali ke kesatuan setelah masa cuti berakhir', 'Desersi dalam masa damai', 'Tidak hadir tanpa izin pada apel dan dinas harian'],
    NAR: ['Penyalahgunaan sabu, hasil tes urine positif', 'Kepemilikan sabu {g} gram', 'Perantara jual beli sabu di wilayah {kab}', 'Penyalahgunaan narkotika golongan I bersama warga sipil'],
    ANI: ['Penganiayaan terhadap warga sipil di {kab}', 'Penganiayaan terhadap bawahan saat pembinaan satuan', 'Pengeroyokan di tempat hiburan malam', 'Kekerasan bersama-sama dalam sengketa lahan'],
    ASU: ['Perbuatan asusila terhadap rekan kerja', 'Pelecehan seksual dengan penyalahgunaan kedudukan', 'Perbuatan melanggar kesusilaan di muka umum'],
    PEN: ['Penipuan dengan modus menjanjikan kelulusan seleksi prajurit', 'Penggelapan kendaraan sewaan', 'Penipuan investasi dengan modus usaha koperasi', 'Penggelapan uang arisan anggota keluarga besar satuan'],
    KDR: ['Kekerasan fisik terhadap istri', 'Kekerasan dalam rumah tangga di asrama {kab}'],
    KOR: ['Penyimpangan pengelolaan anggaran satuan TA {y}', 'Penyalahgunaan dana tunjangan prajurit', 'Mark-up pengadaan bahan bakar satuan', 'Penyimpangan dana pemeliharaan alutsista ringan'],
    SEN: ['Kepemilikan amunisi tanpa hak', 'Penyalahgunaan senjata api organik di luar dinas', 'Jual beli amunisi secara ilegal'],
    LAL: ['Kecelakaan lalu lintas mengakibatkan korban meninggal di {kab}', 'Kelalaian mengemudikan kendaraan dinas'],
    MAT: ['Pencurian suku cadang kendaraan dinas', 'Penggelapan bahan bakar milik satuan', 'Pencurian perlengkapan perorangan di gudang satuan'],
    JUD: ['Perjudian daring menggunakan rekening pribadi', 'Penyelenggaraan perjudian di lingkungan asrama'],
    INS: ['Menolak perintah dinas pengamanan', 'Tidak menaati perintah atasan saat penugasan', 'Penyalahgunaan wewenang terhadap warga sipil'],
    PMB: ['Pembunuhan dalam perkelahian di {kab}', 'Pembunuhan berencana dengan motif utang piutang'],
  };

  // ---------- Tahapan perkara (hukum acara peradilan militer) ----------
  const TAHAP = [
    { id: 0, name: 'Laporan', long: 'Laporan / pengaduan diterima Polisi Militer atau Ankum', actor: 'POM / Ankum' },
    { id: 1, name: 'Penyidikan', long: 'Penyidikan oleh Penyidik POM — pemeriksaan saksi & tersangka (BAP)', actor: 'Penyidik POM' },
    { id: 2, name: 'Pemberkasan', long: 'Berkas perkara dilimpahkan ke Oditurat; Oditur menyusun pendapat hukum', actor: 'Oditurat' },
    { id: 3, name: 'Penyerahan Perkara', long: 'Papera menerbitkan Keputusan Penyerahan Perkara (Skeppera); Oditur menyusun surat dakwaan', actor: 'Papera / Oditurat' },
    { id: 4, name: 'Persidangan', long: 'Perkara dilimpahkan & disidangkan di Pengadilan Militer', actor: 'Pengadilan Militer' },
    { id: 5, name: 'Putusan', long: 'Putusan tingkat pertama dibacakan', actor: 'Pengadilan Militer' },
    { id: 6, name: 'Upaya Hukum', long: 'Banding ke Dilmilti / kasasi ke Mahkamah Agung', actor: 'Dilmilti / MA' },
    { id: 7, name: 'Inkracht', long: 'Berkekuatan hukum tetap — eksekusi oleh Oditur', actor: 'Oditurat' },
  ];
  // Tiga kelompok untuk peta & ringkasan (maks. 3 warna, lolos uji buta warna)
  const GROUPS = [
    { id: 'pra', name: 'Pra-persidangan', stages: [0, 1, 2, 3], color: '#3987e5' },
    { id: 'sidang', name: 'Persidangan & upaya hukum', stages: [4, 5, 6], color: '#d95926' },
    { id: 'tetap', name: 'Inkracht', stages: [7], color: '#199e70' },
  ];
  const groupOf = (st) => (st <= 3 ? 'pra' : st <= 6 ? 'sidang' : 'tetap');
  const GROUP = Object.fromEntries(GROUPS.map((g) => [g.id, g]));

  const AGENDA = ['Pembacaan surat dakwaan', 'Eksepsi penasihat hukum', 'Putusan sela', 'Pemeriksaan saksi', 'Pemeriksaan saksi', 'Pemeriksaan ahli', 'Pemeriksaan terdakwa', 'Pembacaan tuntutan Oditur', 'Pembelaan (pledoi)', 'Replik & duplik', 'Pembacaan putusan'];
  const AGENDA_SHORT = ['Pembacaan surat dakwaan', 'Pemeriksaan saksi', 'Pemeriksaan saksi', 'Pemeriksaan terdakwa', 'Pembacaan tuntutan', 'Pledoi', 'Pembacaan putusan'];
  const AGENDA_ABSENTIA = ['Pembacaan surat dakwaan (in absentia)', 'Pemeriksaan saksi', 'Pembacaan tuntutan', 'Pembacaan putusan'];
  const TUNDA = ['Terdakwa sakit', 'Saksi tidak hadir', 'Oditur belum siap dengan tuntutan', 'Majelis hakim berhalangan', 'Penasihat hukum mohon waktu'];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  // ---------- Nama (dummy) ----------
  const FIRST = ['Agus', 'Budi', 'Dedi', 'Eko', 'Fajar', 'Hendra', 'Imam', 'Joko', 'Kurniawan', 'Lukman', 'Muhammad', 'Nanang', 'Rizky', 'Slamet', 'Teguh', 'Wahyu', 'Yudi', 'Andi', 'Bayu', 'Dimas', 'Arif', 'Hasan', 'Yohanes', 'Fransiskus', 'I Made', 'I Ketut', 'Rudi', 'Sugeng', 'Heri', 'Rahmat', 'Ilham', 'Dwi', 'Tri', 'Putu', 'Gede', 'La Ode', 'Abdul', 'Iwan', 'Samuel', 'Markus', 'Rini', 'Dewi', 'Siti', 'Novi'];
  const LAST = ['Santoso', 'Pratama', 'Saputra', 'Hidayat', 'Nugroho', 'Wibowo', 'Siregar', 'Nasution', 'Simanjuntak', 'Gultom', 'Lubis', 'Harahap', 'Setiawan', 'Kurniawan', 'Hutapea', 'Rumbiak', 'Wenda', 'Manuputty', 'Pattiasina', 'Mappaseng', 'Sinaga', 'Purba', 'Firmansyah', 'Ramadhan', 'Susanto', 'Wijaya', 'Hakim', 'Gunawan'];
  const person = (r) => pick(FIRST, r) + ' ' + pick(LAST, r);

  // Majelis & oditur per pengadilan — tetap per pengadilan
  const roster = {};
  function rosterOf(courtId) {
    if (roster[courtId]) return roster[courtId];
    const r = mulberry32(hash('roster' + courtId));
    const tinggi = COURT[courtId].level !== 'dilmil';
    const hk = () => pick(tinggi ? ['Kolonel', 'Kolonel', 'Brigjen TNI'] : ['Letkol', 'Letkol', 'Kolonel', 'Mayor'], r);
    const mk = (prefix, n, korps) => Array.from({ length: n }, () => prefix() + ' ' + korps + ' ' + person(r) + ', S.H.' + (r() < 0.5 ? ', M.H.' : ''));
    roster[courtId] = {
      hakim: mk(hk, 6, 'Chk').concat(mk(() => (tinggi ? 'Kolonel' : 'Letkol'), 2, 'Laut (H)'), mk(() => (tinggi ? 'Kolonel' : 'Mayor'), 2, 'Kum')),
      oditur: mk(() => pick(['Mayor', 'Letkol', 'Kapten'], r), 6, 'Chk').concat(mk(() => 'Mayor', 2, 'Laut (H)'), mk(() => 'Mayor', 2, 'Kum')),
      panitera: Array.from({ length: 4 }, () => pick(['Kapten', 'Lettu', 'Mayor'], r) + ' ' + pick(['Chk', 'Kum'], r) + ' ' + person(r) + ', S.H.'),
    };
    return roster[courtId];
  }

  // ---------- Generate cases ----------
  const PROV_W = {
    11: 3, 12: 5, 13: 2, 14: 2.5, 15: 1.5, 16: 3, 17: 1, 18: 2.5, 19: 1, 21: 2.5, 31: 10, 32: 9, 33: 7, 34: 1.6, 35: 9, 36: 3,
    51: 2, 52: 1.5, 53: 2.5, 61: 2.5, 62: 1.5, 63: 2, 64: 3, 65: 1.5, 71: 2, 72: 2, 73: 4, 74: 1.5, 75: 0.6, 76: 0.6, 81: 2, 82: 1.2,
    91: 2.5, 92: 1.2, 93: 1, 94: 1.2, 95: 1, 96: 1,
  };
  const MARITIME = new Set([21, 71, 81, 82, 19, 96, 31, 35, 92]);
  const N_CASES = 6800;
  const kabW = {};
  KABS.forEach((k) => { const r = mulberry32(hash('kw' + k.id)); kabW[k.id] = (k.kota ? 1.7 : 1) * (0.45 + r() * 1.2); });
  // Kota yang menjadi pangkalan besar mendapat bobot lebih
  ['Kota Jakarta Timur', 'Kota Jakarta Selatan', 'Kota Surabaya', 'Kab. Bogor', 'Kota Bandung', 'Kota Medan', 'Kota Makassar', 'Kota Jayapura', 'Kab. Malang', 'Kota Semarang', 'Kota Balikpapan', 'Kab. Mimika', 'Kota Ambon', 'Kab. Sidoarjo', 'Kota Manado', 'Kab. Magetan', 'Kab. Pandeglang']
    .forEach((n) => { const k = KABS.find((x) => x.name === n); if (k) kabW[k.id] *= 2.2; });

  const cases = [];
  const regSeq = {};
  for (let n = 0; n < N_CASES && KABS.length; n++) {
    const p = wpick(provIds, provIds.map((x) => PROV_W[x]));
    const kabs = kabsOf(p);
    const kab = wpick(kabs, kabs.map((k) => kabW[k.id]));
    const matra = wpick(['AD', 'AL', 'AU'], MARITIME.has(p) ? [58, 30, 12] : [72, 15, 13]);
    const cat = wpick(CATS, CATS.map((c) => c.w)).id;
    const arts = wpick(CAT[cat].arts.map((a) => a[0]), CAT[cat].arts.map((a) => a[1])).slice();

    // terdakwa
    const nT = cat === 'ANI' || cat === 'KOR' || cat === 'NAR' ? (rng() < 0.3 ? 2 : 1) + (rng() < 0.1 ? 1 : 0) : 1;
    const golW = cat === 'KOR' ? { T: 3, B: 40, PA: 35, PM: 22 } : cat === 'DES' ? { T: 60, B: 37, PA: 3, PM: 0.3 } : { T: 34, B: 50, PA: 13, PM: 3 };
    const terdakwa = Array.from({ length: nT }, (x, i) => {
      const gol = i === 0 ? wpick(['T', 'B', 'PA', 'PM'], [golW.T, golW.B, golW.PA, golW.PM]) : wpick(['T', 'B', 'PA'], [5, 4, 1]);
      const opts = PANGKAT[matra].filter((pk) => pk[1] === gol);
      const pk = pick(opts)[0];
      const nrp = (gol === 'PA' || gol === 'PM' ? '11' + String(Math.floor(rng() * 90 + 10)) : String(Math.floor(rng() * 90 + 10)) + String(Math.floor(rng() * 90 + 10))) + '••••';
      return { nama: person(rng), pangkat: pk, gol, nrp, umur: gol === 'T' ? Math.floor(between(20, 32)) : gol === 'B' ? Math.floor(between(25, 50)) : Math.floor(between(27, 54)) };
    });
    const topGol = terdakwa.some((t) => t.gol === 'PM') ? 'PM' : terdakwa[0].gol;

    // kesatuan
    let kesatuan, induk;
    if (matra === 'AD') {
      induk = KODAM[p];
      kesatuan = wpick(['Kodim ' + kab.short.replace(/^Kota /, ''), 'Korem — ' + induk.split('/').pop(), 'Batalyon Infanteri', 'Denpom', 'Detasemen Kavaleri', 'Batalyon Zeni Tempur'], [5, 1.4, 3, 0.6, 0.5, 0.6]);
    } else if (matra === 'AL') {
      induk = 'Koarmada'; kesatuan = wpick([LANTAMAL[p] || 'Lantamal III Jakarta', 'Yonmarhanlan', 'KRI (Satuan Kapal)'], [5, 1.3, 1.6]);
    } else {
      induk = 'Koopsud'; kesatuan = wpick([LANUD[p] || 'Lanud Halim Perdanakusuma', 'Satuan Radar', 'Batalyon Komando Korpasgat'], [6, 1, 1]);
    }

    // waktu & tahap
    const t = Math.pow(rng(), 0.72);
    const d = START + t * (TODAY - START) + Math.floor(rng() * 10) * 3600000;
    const age = (NOW - d) / DAY;
    let st;
    if (age < 25) st = wpick([0, 1], [3, 5]);
    else if (age < 70) st = wpick([1, 2, 3], [5, 3, 1]);
    else if (age < 130) st = wpick([2, 3, 4], [2, 3, 5]);
    else if (age < 220) st = wpick([3, 4, 5, 6, 7], [1, 6, 1.5, 1, 2]);
    else if (age < 400) st = wpick([4, 5, 6, 7], [0.6, 0.6, 1.3, 7]);
    else st = wpick([6, 7], [0.5, 12]);

    const courtId = topGol === 'PM' ? DILMILTI.find((x) => x.id === COURT[kabCourt[kab.id]].tinggi).id : kabCourt[kab.id];
    const r2 = mulberry32(hash('c' + n));
    // tanggal tiap tahap (realistis: penyidikan 2–6 minggu, pemberkasan 2–4 minggu, dst.)
    const DUR = [[1, 6], [14, 45], [10, 30], [10, 28], [35, 110], [7, 14], [45, 120]];
    const sd = [d];
    for (let i = 1; i <= st; i++) sd.push(Math.min(NOW - (st - i) * 2 * DAY, sd[i - 1] + between(DUR[i - 1][0], DUR[i - 1][1], r2) * DAY));

    const y = new Date(d).getFullYear();
    const kn = CAT[cat].kn;
    const kerugian = kn === 'negara' ? Math.round(cat === 'KOR' ? between(0.2, 1, r2) ** 3 * 6e9 + 1.2e8 : between(1.5e7, 6e8, r2)) : kn === 'korban' ? Math.round(between(0.2, 1, r2) ** 2 * 2.4e9 + 2e7) : 0;
    const pulih = kerugian && st >= 5 ? Math.round(kerugian * (r2() < 0.25 ? 1 : between(0, 0.85, r2))) : kerugian && st >= 3 ? Math.round(kerugian * between(0, 0.3, r2)) : 0;

    const title = pick(TITLES[cat], r2).replace('{kab}', kab.short).replace('{g}', String(Math.floor(between(0.3, 25, r2) * 10) / 10)).replace('{y}', String(y - 1));
    const loc = KEC[kab.name] ? 'Kec. ' + pick(KEC[kab.name], r2) : null;
    const absentia = cat === 'DES' && r2() < 0.55;
    const ditahan = !absentia && st >= 1 && st <= 6 && r2() < ({ NAR: 0.7, PMB: 1, ASU: 0.6, ANI: 0.45, SEN: 0.6, KOR: 0.5 }[cat] || 0.2);

    cases.push({
      id: null, n, y, d, p, kab: kab.id, loc, cat, arts, st, sd, matra, terdakwa, kesatuan, induk,
      court: courtId, title, kerugian, pulih, kn, absentia, ditahan,
      koneksitas: (cat === 'KOR' || cat === 'NAR' || cat === 'PEN') && r2() < 0.07,
      seed: hash('case' + n),
    });
  }

  // ID internal & nomor register — urut kronologis
  cases.sort((a, b) => a.d - b.d);
  const cnt = {};
  cases.forEach((c) => {
    cnt[c.y] = (cnt[c.y] || 0) + 1;
    c.id = 'MCS-' + c.y + '-' + String(cnt[c.y]).padStart(5, '0');
    enrich(c);
  });

  // Detail turunan: nomor register, majelis, sidang, penahanan, putusan
  function enrich(c) {
    const r = mulberry32(c.seed || hash(c.id));
    const court = COURT[c.court];
    const ro = rosterOf(c.court);
    const lpDate = new Date(c.d);
    c.lp = 'LP-' + (10 + Math.floor(r() * 180)) + '/A-' + (1 + Math.floor(r() * 60)) + '/' + ROMAN[lpDate.getMonth()] + '/' + lpDate.getFullYear() + '/Idik';
    const korps = KORPS_HUKUM[c.matra];
    const sameKorps = (arr) => { const f = arr.filter((x) => x.includes(' ' + korps + ' ')); return f.length ? f : arr; };
    c.oditur = pick(sameKorps(ro.oditur), r);
    c.otmil = otmilOf(court);
    c.ph = r() < 0.8 ? person(r) + ', S.H. (' + (c.matra === 'AD' ? 'Kumdam' : c.matra === 'AL' ? 'Kumlantamal' : 'Kumlanud') + ')' : 'Tidak didampingi';
    c.sidang = [];
    c.reg = null;
    if (c.st >= 4) {
      const t4 = c.sd[4];
      const m = new Date(t4);
      regSeq[c.court + m.getFullYear()] = (regSeq[c.court + m.getFullYear()] || 0) + 1;
      const no = regSeq[c.court + m.getFullYear()];
      c.reg = court.level === 'dilmil'
        ? `${no}-K/PM.${court.code}/${c.matra}/${ROMAN[m.getMonth()]}/${m.getFullYear()}`
        : `${no}-K/${court.code}/${c.matra}/${ROMAN[m.getMonth()]}/${m.getFullYear()}`;
      const hs = new Set([pick(sameKorps(ro.hakim), r)]); while (hs.size < 3) hs.add(pick(ro.hakim, r));
      c.majelis = [...hs];
      c.panitera = pick(ro.panitera, r);
      // riwayat sidang
      const agenda = c.absentia ? AGENDA_ABSENTIA : AGENDA_SHORT;
      const ruang = 'Ruang Sidang ' + pick(['Utama', 'I', 'II'], r);
      const first = t4 + between(6, 12, r) * DAY;
      if (c.st >= 5) {
        // seluruh agenda selesai, terakhir = pembacaan putusan
        const span = Math.max(DAY, c.sd[5] - first);
        agenda.forEach((a, i) => {
          const at = snapToWorkday(i === agenda.length - 1 ? c.sd[5] : first + (span * i) / (agenda.length - 1), r);
          if (i > 0 && i < agenda.length - 1 && r() < 0.1) c.sidang.push({ t: at - 6 * DAY, agenda: a, status: 'tunda', ket: pick(TUNDA, r), ruang });
          c.sidang.push({ t: at, agenda: a, status: 'selesai', ruang });
        });
      } else {
        // masih bersidang: sebagian agenda selesai, satu dijadwalkan
        const done = Math.min(agenda.length - 1, Math.max(0, Math.floor((TODAY - first) / (between(14, 45, r) * DAY))));
        const lastDone = TODAY - Math.floor(between(1, 10, r)) * DAY;
        for (let i = 0; i < done; i++) {
          const at = snapToWorkday(first + ((lastDone - first) * i) / Math.max(1, done - 1), r);
          if (i > 0 && r() < 0.14) c.sidang.push({ t: at - 5 * DAY, agenda: agenda[i], status: 'tunda', ket: pick(TUNDA, r), ruang });
          c.sidang.push({ t: at, agenda: agenda[i], status: 'selesai', ruang });
        }
        c.sidang.push({ t: snapToWorkday(TODAY + Math.floor(between(0, 15, r)) * DAY, r), agenda: agenda[done], status: 'jadwal', ruang });
      }
    }
    // putusan
    if (c.st >= 5) {
      const base = { DES: [4, 14], NAR: [8, 60], ANI: [3, 18], ASU: [6, 36], PEN: [6, 30], KDR: [4, 20], KOR: [18, 96], SEN: [12, 60], LAL: [4, 24], MAT: [6, 24], JUD: [6, 24], INS: [3, 14], PMB: [72, 180] }[c.cat];
      const bulan = Math.round(between(base[0], base[1], r));
      const bebas = r() < 0.03;
      const pecat = !bebas && r() < ({ DES: 0.55, NAR: c.arts.includes('NAR-114') ? 0.9 : 0.55, PMB: 0.95, SEN: 0.5, KOR: 0.6, ASU: 0.5 }[c.cat] || 0.12);
      c.putusan = {
        t: c.sd[5],
        amar: bebas ? 'Bebas' : 'Pidana penjara ' + fmtBulan(bulan),
        pidana: bebas ? 0 : bulan,
        tambahan: pecat ? 'Dipecat dari dinas militer' : null,
        uangPengganti: c.cat === 'KOR' ? Math.round(c.kerugian * between(0.3, 1, r)) : 0,
        tuntutan: bebas ? fmtBulan(Math.round(bulan * 1.2) || 6) : fmtBulan(Math.round(bulan * between(1, 1.4, r))),
      };
      if (c.st >= 6) c.upaya = c.st === 6 ? { jenis: r() < 0.75 ? 'Banding' : 'Kasasi', oleh: r() < 0.7 ? 'Terdakwa' : 'Oditur', t: c.sd[6] } : (r() < 0.2 ? { jenis: 'Banding', oleh: 'Terdakwa', t: c.sd[5] + 14 * DAY, selesai: true } : null);
      if (c.st === 7) c.eksekusi = NOW - c.sd[7] < 45 * DAY && r() < 0.5 ? 'Menunggu eksekusi' : 'Sudah dieksekusi';
    }
    // penahanan (batas waktu → peringatan)
    if (c.ditahan && c.st <= 6) {
      const sisa = Math.floor(between(-1, 40, r) ** 1.1);
      c.tahanan = { tempat: pick(['Rumah Tahanan Militer ' + (court.city || ''), 'Sel tahanan ' + (c.matra === 'AD' ? 'Denpom' : c.matra === 'AL' ? 'Pomal' : 'Pomau')], r), sampai: TODAY + Math.max(1, sisa) * DAY, oleh: c.st <= 2 ? 'Ankum / Papera' : c.st === 3 ? 'Papera' : 'Hakim Ketua' };
    }
    // pembaruan terakhir
    const lastSidang = c.sidang.filter((s) => s.t <= NOW).map((s) => s.t);
    c.updated = Math.max(c.sd[c.st], ...lastSidang) + between(0.05, 0.8, r) * DAY;
    if (c.updated > NOW) c.updated = NOW - between(0.3, 30, r) * 3600000;
    if (c.st === 6) c.updated = Math.max(c.updated, NOW - between(2, 70, r) * DAY);
    if (c.st < 4 && r() < 0.06) c.updated = Math.min(c.updated, NOW - between(95, 160, r) * DAY);
    c.updatedBy = c.st <= 1 ? 'Penyidik POM' : c.st <= 3 || c.st === 7 ? c.otmil : court.short;
    c.verified = r() < 0.94;
  }
  function snapToWorkday(t, r) {
    const d = new Date(t); d.setHours(0, 0, 0, 0);
    // akhir pekan dipindah ke hari kerja acak di sekitarnya (tanpa memindah jadwal mendatang ke masa lalu)
    const future = d.getTime() >= TODAY;
    if (d.getDay() === 6) d.setDate(d.getDate() - 1 - Math.floor(r() * 3));
    else if (d.getDay() === 0) d.setDate(d.getDate() + 1 + Math.floor(r() * 3));
    if (future && d.getTime() < TODAY) d.setTime(TODAY + (new Date(TODAY).getDay() === 5 ? 3 : 1) * DAY);
    d.setHours(pick([9, 9, 9, 10, 10, 11, 13, 13, 14], r), pick([0, 0, 0, 30], r));
    return d.getTime();
  }
  function fmtBulan(b) {
    const th = Math.floor(b / 12), bl = b % 12;
    return (th ? th + ' tahun' : '') + (th && bl ? ' ' : '') + (bl ? bl + ' bulan' : '');
  }

  // ---------- Persistent store (perubahan dari Workspace) ----------
  const LS = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage penuh/terkunci */ } },
  };
  (function loadCustom() {
    const custom = LS.get('mcs2_cases', []);
    const deleted = new Set(LS.get('mcs2_deleted', []));
    const byId = new Map(cases.map((c, i) => [c.id, i]));
    custom.forEach((c) => { if (byId.has(c.id)) Object.assign(cases[byId.get(c.id)], c); else cases.push(c); });
    if (deleted.size) for (let i = cases.length - 1; i >= 0; i--) if (deleted.has(cases[i].id)) cases.splice(i, 1);
    cases.sort((a, b) => a.d - b.d);
  })();
  const byId = (id) => cases.find((c) => c.id === id);
  function nextId() {
    const y = new Date(NOW).getFullYear();
    let max = 0;
    cases.forEach((c) => { if (c.y === y) max = Math.max(max, +c.id.split('-')[2]); });
    return 'MCS-' + y + '-' + String(max + 1).padStart(5, '0');
  }
  function saveCase(c) {
    const custom = LS.get('mcs2_cases', []);
    const i = custom.findIndex((x) => x.id === c.id);
    if (i >= 0) custom[i] = c; else custom.push(c);
    LS.set('mcs2_cases', custom);
    const j = cases.findIndex((x) => x.id === c.id);
    if (j >= 0) Object.assign(cases[j], c); else cases.push(c);
  }
  function deleteCase(id) {
    const del = LS.get('mcs2_deleted', []); del.push(id); LS.set('mcs2_deleted', del);
    const j = cases.findIndex((x) => x.id === id); if (j >= 0) cases.splice(j, 1);
  }

  // ---------- Query ----------
  const depth = (id) => (!id || id === 'ID' ? 0 : String(id).split('.').length);
  function matchRegion(c, region) {
    if (!region || region === 'ID') return true;
    const s = String(region);
    return s.includes('.') ? c.kab === s : c.p === +s;
  }
  /** f: {region, cat, matra, group, stage, year, court, art, q} */
  function filter(f = {}, list = cases) {
    return list.filter((c) =>
      matchRegion(c, f.region) &&
      (!f.cat || c.cat === f.cat) &&
      (!f.matra || c.matra === f.matra) &&
      (!f.year || c.y === +f.year) &&
      (!f.group || groupOf(c.st) === f.group) &&
      (f.stage == null || f.stage === '' || c.st === +f.stage) &&
      (!f.court || c.court === f.court || (COURT[f.court] && COURT[f.court].level === 'dilmilti' && COURT[c.court].tinggi === f.court)) &&
      (!f.art || c.arts.includes(f.art)));
  }
  function stats(list) {
    const s = { total: list.length, byStage: Array(8).fill(0), byGroup: { pra: 0, sidang: 0, tetap: 0 }, byCat: {}, byMatra: { AD: 0, AL: 0, AU: 0 }, byGol: { T: 0, B: 0, PA: 0, PM: 0 }, kerugianNegara: 0, pulihNegara: 0, kerugianKorban: 0, pecat: 0, putus: 0 };
    CATS.forEach((c) => (s.byCat[c.id] = 0));
    list.forEach((c) => {
      s.byStage[c.st]++; s.byGroup[groupOf(c.st)]++; s.byCat[c.cat]++; s.byMatra[c.matra]++;
      c.terdakwa.forEach((t) => s.byGol[t.gol]++);
      if (c.kn === 'negara') { s.kerugianNegara += c.kerugian; s.pulihNegara += c.pulih; }
      if (c.kn === 'korban') s.kerugianKorban += c.kerugian;
      if (c.putusan) { s.putus++; if (c.putusan.tambahan) s.pecat++; }
    });
    return s;
  }
  /** Seri bulanan untuk bulan penuh (bulan berjalan tidak diikutkan agar tren tidak tampak anjlok) */
  function monthsSeries(list, months = 12) {
    const out = [];
    const end = new Date(NOW);
    for (let i = months; i >= 1; i--) {
      const dt = new Date(end.getFullYear(), end.getMonth() - i, 1);
      out.push({ key: dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'), date: dt, masuk: 0, putus: 0 });
    }
    const idx = Object.fromEntries(out.map((o, i) => [o.key, i]));
    const key = (t) => { const m = new Date(t); return m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0'); };
    list.forEach((c) => {
      const k1 = key(c.d); if (k1 in idx) out[idx[k1]].masuk++;
      if (c.putusan) { const k2 = key(c.putusan.t); if (k2 in idx) out[idx[k2]].putus++; }
    });
    return out;
  }
  /** Agenda sidang mendatang (atau pada rentang tertentu) */
  function hearings(list, from = TODAY, to = TODAY + 7 * DAY) {
    const out = [];
    list.forEach((c) => c.sidang.forEach((s) => { if (s.t >= from && s.t < to) out.push({ c, s }); }));
    return out.sort((a, b) => a.s.t - b.s.t);
  }
  /** Hal yang perlu perhatian pimpinan */
  function alerts(list) {
    const out = [];
    list.forEach((c) => {
      if (c.tahanan) {
        const sisa = Math.ceil((c.tahanan.sampai - TODAY) / DAY);
        if (sisa <= 5) out.push({ c, level: sisa <= 2 ? 'critical' : 'warning', type: 'tahanan', sisa, text: 'Masa penahanan berakhir ' + (sisa <= 0 ? 'hari ini' : sisa + ' hari lagi') });
      }
      if (c.st < 7 && NOW - c.updated > 90 * DAY) out.push({ c, level: 'warning', type: 'stale', sisa: Math.floor((NOW - c.updated) / DAY), text: 'Tidak ada pembaruan ' + Math.floor((NOW - c.updated) / DAY) + ' hari' });
      const tunda = c.sidang.filter((s) => s.status === 'tunda').length;
      if (c.st === 4 && tunda >= 2) out.push({ c, level: 'warning', type: 'tunda', sisa: tunda, text: 'Sidang ditunda ' + tunda + ' kali' });
      if (c.st === 7 && c.eksekusi === 'Menunggu eksekusi') out.push({ c, level: 'info', type: 'eksekusi', sisa: 0, text: 'Putusan inkracht menunggu eksekusi' });
    });
    const rank = { critical: 0, warning: 1, info: 2 };
    return out.sort((a, b) => rank[a.level] - rank[b.level] || a.sisa - b.sisa);
  }
  function nextSidang(c) { return c.sidang.find((s) => s.status === 'jadwal') || null; }

  function regionName(id) {
    if (!id || id === 'ID') return 'Indonesia';
    const s = String(id);
    return s.includes('.') ? (KAB[s] ? KAB[s].name : s) : PROV[+s];
  }
  function timeline(c) {
    const ev = TAHAP.map((t, i) => ({ ...t, t: c.sd[i] || null, done: i < c.st, current: i === c.st }));
    return ev;
  }

  // ---------- Format ----------
  const fmt = (n) => Number(n).toLocaleString('id-ID');
  function fmtRp(v, short) {
    if (!v) return 'Rp 0';
    if (v >= 1e12) return 'Rp ' + (v / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' T';
    if (v >= 1e9) return 'Rp ' + (v / 1e9).toLocaleString('id-ID', { maximumFractionDigits: short ? 1 : 2 }) + ' M';
    if (v >= 1e6) return 'Rp ' + (v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 0 }) + ' jt';
    return 'Rp ' + fmt(v);
  }
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BULAN_L = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const pad = (n) => String(n).padStart(2, '0');
  function fmtDate(t, withTime) {
    if (!t) return '—';
    const d = new Date(t);
    return d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() + (withTime ? ', ' + pad(d.getHours()) + '.' + pad(d.getMinutes()) : '');
  }
  const fmtTime = (t) => { const d = new Date(t); return pad(d.getHours()) + '.' + pad(d.getMinutes()); };
  function fmtDay(t) {
    const d = new Date(t); d.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - TODAY) / DAY);
    if (diff === 0) return 'Hari ini';
    if (diff === 1) return 'Besok';
    if (diff === -1) return 'Kemarin';
    return HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()];
  }
  function fmtAgo(t) {
    const m = Math.round((NOW - t) / 60000);
    if (m < 1) return 'baru saja';
    if (m < 60) return m + ' menit lalu';
    const h = Math.round(m / 60);
    if (h < 24) return h + ' jam lalu';
    const d = Math.round(h / 24);
    if (d < 30) return d + ' hari lalu';
    return fmtDate(t);
  }
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const terdakwaLabel = (t) => t.pangkat + ' ' + t.nama;
  const matraName = (m) => ({ AD: 'TNI AD', AL: 'TNI AL', AU: 'TNI AU' }[m]);

  // ---------- Pengguna & peran ----------
  const ROLES = [
    { id: 'PUSAT', name: 'Admin Pusat', unit: 'Babinkum TNI / Orjen TNI', scope: 'Nasional', desc: 'Mengelola seluruh data, master data, pengguna, dan konfigurasi sistem.' },
    { id: 'PIMPINAN', name: 'Pimpinan', unit: 'Mabes TNI / Kejaksaan Agung (Jampidmil)', scope: 'Nasional', desc: 'Melihat dashboard eksekutif, laporan, dan menerima notifikasi prioritas. Tidak dapat mengubah data.' },
    { id: 'OTMILTI', name: 'Admin Otmilti', unit: 'Oditurat Militer Tinggi', scope: 'Daerah hukum Otmilti', desc: 'Memverifikasi dan menyetujui pembaruan dari Oditurat di bawahnya.' },
    { id: 'OTMIL', name: 'Operator Oditurat', unit: 'Oditurat Militer', scope: 'Daerah hukum Otmil', desc: 'Menginput dan memperbarui perkara: pemberkasan, dakwaan, tuntutan, eksekusi.' },
    { id: 'DILMIL', name: 'Operator Pengadilan', unit: 'Kepaniteraan Pengadilan Militer', scope: 'Pengadilan terkait', desc: 'Mengelola jadwal sidang, hasil sidang, dan putusan.' },
    { id: 'POM', name: 'Penyidik POM', unit: 'Puspom TNI / Pomdam / Pomal / Pomau', scope: 'Satuan penyidik', desc: 'Menginput laporan dan perkembangan penyidikan sampai pelimpahan berkas.' },
    { id: 'AUDITOR', name: 'Auditor', unit: 'Itjen TNI', scope: 'Nasional (baca saja)', desc: 'Membaca seluruh data dan log audit untuk keperluan pengawasan.' },
  ];
  const PERMS = [
    ['Lihat Command Center', [1, 1, 1, 1, 1, 1, 1]],
    ['Lihat berkas perkara lengkap', [1, 1, 1, 1, 1, 0, 1]],
    ['Input perkara baru', [1, 0, 0, 1, 0, 1, 0]],
    ['Perbarui tahap penyidikan', [1, 0, 0, 0, 0, 1, 0]],
    ['Perbarui tahap penuntutan & eksekusi', [1, 0, 1, 1, 0, 0, 0]],
    ['Kelola jadwal & hasil sidang', [1, 0, 0, 0, 1, 0, 0]],
    ['Input putusan', [1, 0, 0, 0, 1, 0, 0]],
    ['Menyetujui pembaruan (verifikasi)', [1, 0, 1, 0, 0, 0, 0]],
    ['Kelola master pasal & satuan', [1, 0, 0, 0, 0, 0, 0]],
    ['Kelola pengguna', [1, 0, 1, 0, 0, 0, 0]],
    ['Lihat log audit', [1, 1, 1, 0, 0, 0, 1]],
    ['Ekspor laporan', [1, 1, 1, 1, 1, 0, 1]],
  ];
  const DEFAULT_USERS = [
    ['U-001', 'Kolonel Chk Haryanto, S.H., M.H.', 'admin.pusat', 'PUSAT', 'Babinkum TNI', 'Aktif', 0.3],
    ['U-002', 'Brigjen TNI Satrio Wibowo, S.H.', 'pimpinan.mabes', 'PIMPINAN', 'Mabes TNI', 'Aktif', 5],
    ['U-003', 'Dr. Ratna Kusumawati, S.H., M.H.', 'jampidmil.1', 'PIMPINAN', 'Jampidmil Kejaksaan Agung', 'Aktif', 26],
    ['U-004', 'Letkol Chk Agus Pramono, S.H.', 'otmilti.jakarta', 'OTMILTI', 'Oditurat Militer Tinggi Jakarta', 'Aktif', 1.2],
    ['U-005', 'Mayor Chk Fajar Nugroho, S.H.', 'otmil.jakarta', 'OTMIL', 'Oditurat Militer Jakarta', 'Aktif', 0.1],
    ['U-006', 'Kapten Chk Dedi Kurniawan, S.H.', 'otmil.bandung', 'OTMIL', 'Oditurat Militer Bandung', 'Aktif', 2.5],
    ['U-007', 'Mayor Laut (H) Andi Mappaseng, S.H.', 'otmil.makassar', 'OTMIL', 'Oditurat Militer Makassar', 'Aktif', 4],
    ['U-008', 'Kapten Chk Siti Rahmawati, S.H.', 'panitera.ii06', 'DILMIL', 'Dilmil II-06 Jakarta', 'Aktif', 0.6],
    ['U-009', 'Lettu Chk Rizky Hasibuan, S.H.', 'panitera.i02', 'DILMIL', 'Dilmil I-02 Medan', 'Aktif', 7],
    ['U-010', 'Serma Yohanes Wenda', 'pom.jayapura', 'POM', 'Pomdam XVII/Cenderawasih', 'Aktif', 30],
    ['U-011', 'Kolonel Kum Maria Lestari, S.H.', 'auditor.itjen', 'AUDITOR', 'Itjen TNI', 'Aktif', 72],
    ['U-012', 'Kapten Chk Bayu Saputra, S.H.', 'otmil.surabaya', 'OTMIL', 'Oditurat Militer Surabaya', 'Nonaktif', 900],
  ].map(([id, name, username, role, unit, status, h]) => ({ id, name, username, role, unit, status, last: NOW - h * 3600000 }));
  const getUsers = () => LS.get('mcs2_users', DEFAULT_USERS);
  const saveUsers = (u) => LS.set('mcs2_users', u);

  // Log audit
  function audit(user, action, target, detail) {
    const log = LS.get('mcs2_audit', []);
    log.unshift({ t: Date.now(), user, action, target, detail });
    LS.set('mcs2_audit', log.slice(0, 400));
  }
  function getAudit() {
    const recent = cases.slice().sort((a, b) => b.updated - a.updated).slice(0, 60);
    const gen = recent.map((c, i) => {
      const acts = { 0: 'Input laporan', 1: 'Perbarui penyidikan', 2: 'Terima berkas perkara', 3: 'Unggah Skeppera', 4: c.sidang.length ? 'Catat hasil sidang' : 'Daftarkan perkara', 5: 'Input putusan', 6: 'Catat upaya hukum', 7: 'Catat eksekusi' };
      const user = c.st <= 1 ? 'Penyidik POM' : c.st === 4 || c.st === 5 ? 'Panitera ' + COURT[c.court].short.replace('Dilmil ', '') : 'Operator ' + c.otmil.replace('Oditurat Militer', 'Otmil');
      return { t: c.updated, user, action: acts[c.st], target: c.id, detail: TAHAP[c.st].name + (c.reg ? ' · ' + c.reg : '') };
    });
    return LS.get('mcs2_audit', []).concat(gen).sort((a, b) => b.t - a.t);
  }

  // Antrian persetujuan (maker-checker)
  function getApprovals() {
    const saved = LS.get('mcs2_approvals', null);
    if (saved) return saved;
    const r = mulberry32(77);
    const pool = cases.filter((c) => c.st >= 1 && c.st <= 6).slice(-400);
    const kinds = [
      (c) => ({ field: 'Tahap', from: TAHAP[c.st].name, to: TAHAP[Math.min(7, c.st + 1)].name }),
      (c) => ({ field: 'Jadwal sidang', from: '—', to: fmtDate(TODAY + 3 * DAY) + ', 09.00 · Pemeriksaan saksi' }),
      (c) => ({ field: 'Kerugian dipulihkan', from: fmtRp(c.pulih), to: fmtRp(c.pulih + 25e6) }),
      (c) => ({ field: 'Pasal', from: c.arts.map(artLabel).join(', '), to: c.arts.map(artLabel).concat(['Pasal 26 KUHPM']).join(', ') }),
    ];
    const out = Array.from({ length: 9 }, (x, i) => {
      const c = pick(pool, r);
      const k = pick(kinds, r)(c);
      return { id: 'APR-' + (1041 + i), caseId: c.id, by: c.st <= 1 ? 'Penyidik POM' : 'Operator ' + c.otmil.replace('Oditurat Militer', 'Otmil'), t: NOW - between(0.2, 40, r) * 3600000, ...k, note: pick(['Sesuai berita acara sidang', 'Berdasarkan Skeppera terbaru', 'Pemutakhiran data penyidikan', 'Setoran pengembalian kerugian dari terdakwa'], r), status: 'menunggu' };
    });
    return out.sort((a, b) => b.t - a.t);
  }
  const saveApprovals = (a) => LS.set('mcs2_approvals', a);

  window.MCS = {
    NOW, TODAY, DAY, PROV, provIds, KABS, KAB, kabsOf, KEC, courtOfKab, kabCourt,
    DILMIL, DILMILTI, DILMILTAMA, COURT, otmilOf, MATRA, PANGKAT, GOL, KORPS_HUKUM, KODAM,
    CATS, CAT, LAWS, LAW, ARTS, ART, artLabel, TAHAP, GROUPS, GROUP, groupOf, AGENDA, TUNDA, ROMAN,
    cases, byId, filter, stats, monthsSeries, hearings, alerts, nextSidang, timeline, regionName, matchRegion, depth,
    fmt, fmtRp, fmtDate, fmtTime, fmtDay, fmtAgo, fmtBulan, esc, terdakwaLabel, matraName, BULAN, BULAN_L, HARI,
    nextId, saveCase, deleteCase, enrich, audit, getAudit, getApprovals, saveApprovals,
    ROLES, PERMS, getUsers, saveUsers, mulberry32, hash, LS,
  };
})();
