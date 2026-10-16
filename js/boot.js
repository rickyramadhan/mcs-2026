/* =====================================================================
   MCS — Intro: globe → Indonesia → Command Center
   Singkat (±5 dtk), bisa dilewati, hanya diputar sekali per sesi.
   ===================================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const intro = $('intro');
  let world = null, started = false, appShown = false;

  function initApp() {
    if (appShown) return;
    appShown = true;
    MCSMap.init();
    App.init();
    Panels.init();
    AI.init();
    const app = $('app');
    app.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => app.classList.add('show'));
  }

  function finish() {
    if (intro.classList.contains('done')) return;
    try { sessionStorage.setItem('mcs_intro', '1'); } catch (e) { /* mode privat */ }
    intro.classList.add('done');
    initApp();
    setTimeout(() => world && world.pauseAnimation(), 900);
  }

  function buildGlobe() {
    if (!window.Globe) return null;
    // titik = 33 Kejaksaan Tinggi; garis = pelaporan ke Jampidmil, Kejaksaan Agung (Jakarta)
    const AGUNG = { lat: -6.2405, lng: 106.7999, level: 'agung' };
    const courts = MCS.KEJATI.concat([AGUNG]);
    const arcs = MCS.KEJATI.filter((k) => k.p !== 31).map((k) => ({ startLat: k.lat, startLng: k.lng, endLat: AGUNG.lat, endLng: AGUNG.lng }));
    const g = Globe()
      .globeImageUrl(window.EARTH_TEX).bumpImageUrl(window.EARTH_BUMP)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true).atmosphereColor('#5cc8e6').atmosphereAltitude(0.16)
      .polygonsData(window.WORLD_GEO.features.filter((f) => f.properties.iso === 'IDN'))
      .polygonCapColor(() => 'rgba(57,135,229,0.28)').polygonSideColor(() => 'rgba(57,135,229,0.05)').polygonStrokeColor(() => '#5cc8e6').polygonAltitude(0.006)
      .pointsData(courts).pointLat('lat').pointLng('lng').pointColor((c) => (c.level === 'agung' ? '#eef2f6' : '#5cc8e6')).pointAltitude(0.012).pointRadius((c) => (c.level === 'agung' ? 0.4 : 0.2))
      .arcsData(arcs).arcColor(() => ['rgba(92,200,230,0.15)', 'rgba(92,200,230,0.85)']).arcStroke(0.35).arcAltitude(0.06)
      .arcDashLength(0.5).arcDashGap(0.25).arcDashAnimateTime(2200)
      ($('globe'));
    g.controls().enableZoom = false;
    g.controls().autoRotate = true;
    g.controls().autoRotateSpeed = 0.9;
    return g;
  }

  function play() {
    if (started) return; started = true;
    world = buildGlobe();
    if (!world) return finish();
    world.pointOfView({ lat: 12, lng: 70, altitude: 2.6 });
    const steps = [
      [12, 'Memuat ' + MCS.fmt(MCS.cases.length) + ' berkas perkara…'],
      [38, 'Memuat batas wilayah ' + MCS.KABS.length + ' kabupaten/kota…'],
      [64, 'Menyinkronkan data ' + MCS.KEJATI.length + ' Kejaksaan Tinggi…'],
      [88, 'Memeriksa agenda sidang & masa penahanan…'],
      [100, 'Siap'],
    ];
    steps.forEach(([p, t], i) => setTimeout(() => { $('intro-bar').style.width = p + '%'; $('intro-step').textContent = t; }, 300 + i * 850));
    setTimeout(() => { world.controls().autoRotate = false; world.pointOfView({ lat: -2.5, lng: 118, altitude: 1.05 }, 2600); }, 1200);
    setTimeout(finish, 4700);
  }

  // Lewati intro
  $('intro-skip').onclick = finish;
  document.addEventListener('keydown', (e) => {
    if (!intro.classList.contains('done') && !intro.classList.contains('globe-mode') && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); finish(); }
  });

  // Mode globe dari tombol topbar
  $('btn-globe').onclick = () => {
    if (!world) world = buildGlobe();
    if (!world) return;
    intro.classList.add('globe-mode'); intro.classList.remove('done');
    world.resumeAnimation();
    world.controls().autoRotate = true; world.controls().enableZoom = true;
    world.pointOfView({ lat: -2, lng: 118, altitude: 1.6 }, 1200);
    let b = $('globe-return');
    if (!b) {
      b = document.createElement('button'); b.id = 'globe-return'; b.className = 'btn globe-return';
      b.innerHTML = '← Kembali ke Command Center <kbd>Esc</kbd>';
      b.onclick = leaveGlobe; intro.appendChild(b);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && intro.classList.contains('globe-mode') && !intro.classList.contains('done')) leaveGlobe(); });
    }
  };
  function leaveGlobe() { intro.classList.add('done'); setTimeout(() => { intro.classList.remove('globe-mode'); world.pauseAnimation(); }, 900); }

  let seen = false;
  try { seen = sessionStorage.getItem('mcs_intro') === '1'; } catch (e) { /* mode privat */ }
  if (seen || /[?&]nointro/.test(location.search)) { intro.classList.add('done'); initApp(); }
  else play();
})();
