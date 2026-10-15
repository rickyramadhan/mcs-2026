/* =====================================================================
   MCS — i18n Language Toggle
   ===================================================================== */
window.MCS_LANG = localStorage.getItem('mcs_lang') || 'id'; // Default to Indonesian

window.DICT = {
  'NATIONAL COMMAND CENTER': 'PUSAT KOMANDO NASIONAL',
  'Search cases, articles, regions, case ID…': 'Cari kasus, pasal, wilayah, ID perkara…',
  'GLOBE': 'BUMI 3D',
  'LEGAL': 'HUKUM',
  'COMMAND': 'TERMINAL',
  'ADMIN': 'ADMIN',
  'ALL PERIODS': 'SEMUA TAHUN',
  'ALL CATEGORIES': 'SEMUA KATEGORI',
  'ALL STATUS': 'SEMUA STATUS',
  'FILTER': 'FILTER',
  'RESET': 'RESET',
  'ACCESS SCOPE': 'HAK AKSES',
  'CASE OVERVIEW': 'RINGKASAN PERKARA',
  'TOTAL CASES': 'TOTAL PERKARA',
  'ACTIVE': 'PROSES AKTIF',
  'RESOLVED': 'SELESAI (INKRACHT)',
  'UNDER REVIEW': 'TAHAP AWAL',
  'INQUIRY': 'PENYELIDIKAN',
  'INVESTIGATION': 'PENYIDIKAN',
  'PROSECUTION': 'PENUNTUTAN',
  'COURT': 'PERSIDANGAN',
  'INKRACHT': 'INKRACHT',
  'CASE CLASSIFICATION': 'JENIS KEJAHATAN',
  'CLICK TO FILTER': 'KLIK UNTUK MENYARING',
  'SYSTEM STATUS': 'STATUS SISTEM',
  'DATABASE': 'BASIS DATA',
  'GIS ENGINE': 'MESIN PETA',
  'LEGAL DATABASE': 'DATABASE HUKUM',
  'AI ENGINE': 'KECERDASAN BUATAN',
  'RECORDS INDEXED': 'DATA TERSIMPAN',
  'REGIONAL INTELLIGENCE': 'PANTAUAN WILAYAH',
  'REGIONS': 'DAERAH',
  'CASES': 'KASUS',
  'DATA QUALITY': 'KUALITAS DATA',
  'CASE ACTIVITY': 'AKTIVITAS KASUS',
  'LIVE ACTIVITY': 'KEJADIAN TERKINI',
  'REAL-TIME': 'WAKTU NYATA',
  'INTEL FEED': 'INFO INTELIJEN',
  'CASE INTELLIGENCE PROFILE': 'PROFIL DETAIL KASUS',
  'RESTRICTED': 'RAHASIA NEGARA',
  'CASE PROFILE': 'INFORMASI KASUS',
  'CASE DNA': 'DNA KASUS',
  'DATA CONFIDENCE SCORE': 'TINGKAT KEPERCAYAAN DATA',
  'LAST VERIFIED:': 'DICEK TERAKHIR:',
  'SOURCE:': 'SUMBER:',
  'LEGAL RELATIONSHIP GRAPH': 'PETA PASAL HUKUM',
  'DRAG NODES · CLICK RELATED CASE': 'GESER TITIK · KLIK UNTUK DETAIL',
  'CASE TIMELINE': 'PERJALANAN KASUS',
  'LEGAL INTELLIGENCE LAYER': 'PUSAT DATA HUKUM',
  'STATUTE & ARTICLE KNOWLEDGE GRAPH': 'PETA HUBUNGAN UNDANG-UNDANG & PASAL',
  'STATUTES': 'UNDANG-UNDANG',
  'KNOWLEDGE GRAPH': 'PETA KONSEP',
  'ARTICLE INTELLIGENCE': 'DETAIL PASAL',
  'ACTIVE CASES': 'KASUS BERJALAN',
  'PRIMARY CAT': 'KASUS TERBANYAK',
  'MCS INTELLIGENCE AI': 'ASISTEN AI MCS',
  'NATURAL LANGUAGE · DATABASE INTERFACE': 'TANYA JAWAB DATABASE',
  'MCS COMMAND INTERFACE': 'TERMINAL PERINTAH MCS',
  'TYPE HELP · DEMO · ESC TO CLOSE': 'KETIK HELP ATAU DEMO · ESC UNTUK KELUAR',
  'NATIONAL CRIME INTELLIGENCE PLATFORM': 'SISTEM PANTAUAN KRIMINAL NASIONAL',
  'RESTRICTED ACCESS': 'AKSES TERBATAS',
  'ENTER COMMAND CENTER': 'MASUK PUSAT KOMANDO',
  'TARGET LOCKED. INITIALIZING COMMAND CENTER.': 'TARGET DIKUNCI. MENYIAPKAN PUSAT KOMANDO.',
  'ACQUIRING NATIONAL DATA…': 'MENGAMBIL DATA NASIONAL…',
  'RETURN TO COMMAND CENTER': 'KEMBALI KE PUSAT KOMANDO',
  'SKIP INTRO': 'LEWATI INTRO',
  'HEATMAP': 'ZONA MERAH',
  'HOTSPOTS': 'TITIK RAWAN',
  'LABELS': 'NAMA DAERAH',
  'CRIME CASE DENSITY · PERKARA / WILAYAH': 'KEPADATAN KASUS · JUMLAH PERKARA PER WILAYAH',
  'LOW': 'SEDIKIT',
  'HIGH': 'BANYAK',
  'LEVEL 0 · NATIONAL OVERVIEW': 'LEVEL 0 · PANDANGAN NASIONAL',
  'PROVINSI': 'PROVINSI',
  'KAB/KOTA': 'KABUPATEN/KOTA',
  'KECAMATAN': 'KECAMATAN',
  'BACK': 'KEMBALI',
  'NEW': 'BARU',
  'SYNC': 'SINKRONISASI',
  'AGO': 'LALU',
  'ONLINE': 'MENYALA',
  'EST. LOSS': 'KERUGIAN NEGARA',
  'SUSPECT(S)': 'TERSANGKA',
  'REPORTED': 'DILAPORKAN',
  'CURRENT:': 'TAHAP SAAT INI:',
  'PENDING': 'BELUM DIMULAI',
  'TYPE': 'KATEGORI',
  'LOCATION': 'LOKASI',
  'STATUS': 'STATUS',
  'ARTICLES': 'PASAL',
  'THREAT': 'ANCAMAN HUKUMAN'
};

window._t = function(str) {
  if (window.MCS_LANG === 'en') return str;
  return window.DICT[str] || str;
};

window.toggleLang = function(lang) {
  localStorage.setItem('mcs_lang', lang);
  location.reload();
};

// Function to auto-translate static HTML DOM on load
window.translateDOM = function(root) {
  if (window.MCS_LANG === 'en') return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while (node = walker.nextNode()) {
    if (node.nodeValue.trim()) {
      let text = node.nodeValue;
      Object.keys(window.DICT).forEach(k => {
        if (text.includes(k)) text = text.replace(new RegExp(k, 'g'), window.DICT[k]);
      });
      node.nodeValue = text;
    }
  }
  // Also translate placeholders
  root.querySelectorAll('input[placeholder]').forEach(el => {
    let text = el.placeholder;
    Object.keys(window.DICT).forEach(k => {
      if (text.includes(k)) text = text.replace(new RegExp(k, 'g'), window.DICT[k]);
    });
    el.placeholder = text;
  });
};

document.addEventListener('DOMContentLoaded', () => {
  window.translateDOM(document.body);
  
  // Highlight correct language button
  const btnEn = document.getElementById('lang-en');
  const btnId = document.getElementById('lang-id');
  if (btnEn && btnId) {
    if (window.MCS_LANG === 'en') btnEn.classList.add('active');
    else btnId.classList.add('active');
  }
});
