/* MCS — perilaku layar kecil: tab bawah (Command Center), menu titik tiga, laci menu (Workspace). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  // ---- Command Center: satu panel per tab pada layar kecil ----
  var app = $('app'), tabs = $('mtabs');
  if (app && tabs) {
    app.setAttribute('data-mtab', 'peta');
    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return;
      app.setAttribute('data-mtab', b.getAttribute('data-m'));
      tabs.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
    });
    // membuka daftar / agenda / dokumen dari panel mana pun tetap berfungsi; setelah menutup, tab tetap
  }
  // ---- menu titik tiga di bilah atas (HP) ----
  var more = $('btn-more'), acts = document.querySelector('.top-actions');
  if (more && acts) {
    more.addEventListener('click', function (e) { e.stopPropagation(); acts.classList.toggle('open'); });
    document.addEventListener('click', function (e) { if (!acts.contains(e.target) && e.target !== more) acts.classList.remove('open'); });
    acts.addEventListener('click', function (e) { if (e.target.closest('a,button') && !e.target.closest('[data-theme-set]')) setTimeout(function () { acts.classList.remove('open'); }, 60); });
  }
  // ---- Workspace: menu samping menjadi laci ----
  var mb = $('menu-btn'), scrim = $('side-scrim');
  if (mb) {
    var close = function () { document.body.classList.remove('nav-open'); };
    mb.addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
    if (scrim) scrim.addEventListener('click', close);
    window.addEventListener('hashchange', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    var nav = $('nav'); if (nav) nav.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
  }
})();
