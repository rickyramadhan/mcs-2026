/* =====================================================================
   MCS — UI helpers (dipakai Command Center & Workspace)
   ===================================================================== */
window.UI = (function () {
  'use strict';

  const ICON = {
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pause: '<path d="M10 4H6v16h4zM18 4h-4v16h4z"/>',
    gavel: '<path d="m14 13-7.5 7.5a2.1 2.1 0 0 1-3-3L11 10"/><path d="m16 16 6-6M8 8l6-6M9 7l8 8M21 11l-8-8"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
    scale: '<path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0zM8 21h8"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    home: '<path d="M4 11 12 4l8 7M6 9.5V20h12V9.5"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    checkc: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    filter: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.4 8.6 8 9.6 4.6-1 8-4.6 8-9.6V6z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    building: '<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6M9 11h.01M15 11h.01"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1Z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    log: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  };
  const icon = (name, cls = 'ico-s') => `<svg class="${cls}" viewBox="0 0 24 24">${ICON[name] || ''}</svg>`;

  /** Animasi angka naik dari nilai sebelumnya */
  function countUp(el, to, opt = {}) {
    if (!el) return;
    const from = +el.dataset.v || 0;
    const fmt = opt.fmt || ((v) => Math.round(v).toLocaleString('id-ID'));
    el.dataset.v = to;
    if (from === to) { el.textContent = fmt(to); return; }
    const dur = opt.dur || 900, t0 = performance.now();
    cancelAnimationFrame(el._raf);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  // Overlay stack — Esc menutup yang paling atas
  const stack = [];
  function open(el) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el || stack.includes(el)) return;
    el.classList.add('on'); el.setAttribute('aria-hidden', 'false');
    stack.push(el);
  }
  function close(el) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) el = stack[stack.length - 1];
    if (!el) return;
    el.classList.remove('on'); el.setAttribute('aria-hidden', 'true');
    const i = stack.indexOf(el); if (i >= 0) stack.splice(i, 1);
    el.dispatchEvent(new CustomEvent('closed'));
  }
  const isOpen = (el) => stack.includes(typeof el === 'string' ? document.getElementById(el) : el);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length) { e.preventDefault(); close(); } });
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-close]');
    if (c) close(c.closest('.overlay, .modal, .drawer'));
    else if (e.target.classList && (e.target.classList.contains('overlay') || e.target.classList.contains('modal'))) close(e.target);
  });

  let tt;
  function toast(msg, ok = true) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerHTML = (ok ? `<span class="ok">${icon('checkc')}</span>` : '') + `<span>${msg}</span>`;
    t.classList.add('on');
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 3200);
  }

  function stagePill(st) {
    const g = MCS.GROUP[MCS.groupOf(st)];
    return `<span class="pill"><i style="background:${g.color}"></i>${MCS.TAHAP[st].name}</span>`;
  }

  return { icon, ICON, countUp, open, close, isOpen, toast, stagePill };
})();
