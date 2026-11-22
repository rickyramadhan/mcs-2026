/* MCS — pilihan tema terang/gelap. Dimuat di <head> agar tidak berkedip saat halaman dibuka. */
(function () {
  'use strict';
  var KEY = 'mcs-theme', root = document.documentElement;
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function norm(t) { return t === 'light' ? 'light' : 'dark'; }
  function sync() {
    var cur = root.getAttribute('data-theme');
    document.querySelectorAll('[data-theme-set]').forEach(function (b) {
      var on = b.getAttribute('data-theme-set') === cur;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function apply(t) {
    root.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'light' ? '#eef1f5' : '#070b11');
    sync();
    document.dispatchEvent(new CustomEvent('mcs-theme', { detail: t }));
  }
  root.setAttribute('data-theme', norm(stored()));
  window.MCSTheme = {
    get: function () { return root.getAttribute('data-theme'); },
    set: function (t) { t = norm(t); try { localStorage.setItem(KEY, t); } catch (e) {} apply(t); },
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-set]');
    if (b) MCSTheme.set(b.getAttribute('data-theme-set'));
  });
  document.addEventListener('DOMContentLoaded', sync);
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(norm(e.newValue)); });
})();
