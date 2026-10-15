/* =====================================================================
   MCS — Command Terminal
   "Hacker-mode" CLI overlay to filter dashboard via text commands.
   ===================================================================== */
window.Cmd = (function () {
  'use strict';
  const overlay = document.getElementById('cmd');
  const input = document.getElementById('term-in');
  const out = document.getElementById('term-out');

  let on = false;

  const CMDS = {
    help: () => print(`AVAILABLE COMMANDS:
  <span class="p">SELECT</span> [REGION ID]   : Change map focus
  <span class="p">FILTER</span> [FIELD] [VAL] : Apply data filter
  <span class="p">RESET</span>               : Clear all filters
  <span class="p">CLEAR</span>               : Clear terminal
  <span class="p">EXIT</span>                : Close terminal
  <span class="p">DEMO</span>                : Run execution sequence
`),
    clear: () => { out.innerHTML = ''; },
    exit: close,
    select: (args) => {
      if (!args[0]) return print(`<span class="er">ERR: Missing REGION ID</span>`);
      const id = args[0] === 'ID' ? 'ID' : args[0];
      MCSMap.drill(id); App.updateFilter('region', id);
      print(`LOCATING TARGET <span class="am">${id}</span>...`);
      setTimeout(() => print(`<span class="ok">TARGET ACQUIRED: ${MCS.regionName(id).toUpperCase()}</span>`), 800);
    },
    filter: (args) => {
      if (args.length < 2) return print(`<span class="er">ERR: Missing FIELD/VAL</span>`);
      const field = args[0].toLowerCase(), val = args[1].toUpperCase();
      if (field === 'cat') {
        const c = MCS.CATS.find(x => x.id === val || x.name.toUpperCase().includes(val));
        if (!c) return print(`<span class="er">ERR: Unknown Category</span>`);
        App.updateFilter('cat', c.id);
        print(`FILTER APPLIED: <span class="am">CAT = ${c.id}</span>`);
      }
    },
    reset: () => { App.updateFilter('reset'); print(`<span class="ok">FILTERS RESET</span>`); },
    demo: async () => {
      print(`INITIATING COMMAND SEQUENCE...`);
      input.disabled = true;
      const type = async (str) => {
        let cur = '';
        for (let i = 0; i < str.length; i++) {
          cur += str[i]; input.value = cur;
          await new Promise(r => setTimeout(r, 40));
        }
        await new Promise(r => setTimeout(r, 200));
        input.value = '';
      };
      
      await type('SELECT 32'); CMDS.select(['32']); await new Promise(r => setTimeout(r, 1500));
      await type('FILTER CAT NAR'); CMDS.filter(['CAT', 'NAR']); await new Promise(r => setTimeout(r, 1500));
      
      print(`<span class="am">EXECUTING AGGREGATION...</span>`);
      await new Promise(r => setTimeout(r, 600));
      print(`[||||||||||||||||||||] 100%`);
      const total = MCS.filter(App.currentFilter()).length;
      print(`<br><span class="res">${total} MATCHING CASES</span>`);
      input.disabled = false; input.focus();
    }
  };

  function print(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  }

  function exec(line) {
    const parts = line.trim().split(/\s+/);
    if (!parts[0]) return;
    print(`\n<span class="c">MCS://CMD ></span> ${line}`);
    const cmd = parts[0].toLowerCase();
    if (CMDS[cmd]) CMDS[cmd](parts.slice(1));
    else print(`<span class="er">ERR: Unknown command '${cmd}'. Type HELP.</span>`);
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { exec(input.value); input.value = ''; }
    if (e.key === 'Escape') close();
  });

  function open() { on = true; overlay.classList.add('on'); setTimeout(() => input.focus(), 100); }
  function close() { on = false; overlay.classList.remove('on'); }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'k' && e.ctrlKey) { e.preventDefault(); on ? close() : open(); }
    if (e.key === 'j' && e.ctrlKey) { e.preventDefault(); document.getElementById('btn-ai').click(); }
  });
  
  document.getElementById('btn-cmd').onclick = open;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  return { open, close };
})();
