/* MCS — tinggi panel di Command Center bisa diatur pengguna (tarik pegangan di bawah panel).
   Ukuran diingat di peramban; klik dua kali pada pegangan untuk mengembalikan. */
(function () {
  'use strict';
  var KEY = 'mcs-panel-h';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* abaikan */ } }
  var MIN = 180;

  function keyOf(p) { return p.querySelector('#rt-body') ? 'agenda' : p.querySelector('#rank') ? 'wilayah' : p.querySelector('#cats') ? 'klasifikasi' : 'lain'; }

  function init() {
    var saved = load();
    document.querySelectorAll('.col > .panel.grow').forEach(function (p) {
      var key = keyOf(p);
      if (saved[key]) p.style.setProperty('--ph', saved[key] + 'px');
      var h = document.createElement('div');
      h.className = 'rz'; h.tabIndex = 0; h.setAttribute('role', 'separator'); h.setAttribute('aria-orientation', 'horizontal');
      h.setAttribute('aria-label', 'Ubah tinggi panel'); h.title = 'Tarik untuk mengubah tinggi · klik dua kali untuk mengembalikan';
      p.appendChild(h);
      var set = function (v) { v = Math.round(Math.max(MIN, Math.min(window.innerHeight * 0.92, v))); p.style.setProperty('--ph', v + 'px'); return v; };
      var cur = function () { return p.getBoundingClientRect().height; };
      h.addEventListener('pointerdown', function (e) {
        e.preventDefault(); h.setPointerCapture(e.pointerId); h.classList.add('drag'); p.classList.add('resizing');
        var y0 = e.clientY, h0 = cur();
        var move = function (ev) { set(h0 + (ev.clientY - y0)); };
        var up = function () {
          h.releaseCapture && h.releaseCapture();
          h.classList.remove('drag'); p.classList.remove('resizing');
          h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
          var o = load(); o[key] = Math.round(cur()); save(o);
        };
        h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
      });
      h.addEventListener('dblclick', function () { p.style.removeProperty('--ph'); var o = load(); delete o[key]; save(o); });
      h.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault(); var v = set(cur() + (e.key === 'ArrowDown' ? 40 : -40)); var o = load(); o[key] = v; save(o);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
