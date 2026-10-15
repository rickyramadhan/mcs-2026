/* =====================================================================
   MCS — Admin Panel Logic
   Handles listing, filtering, adding, and updating mock cases.
   ===================================================================== */
(function () {
  'use strict';

  // State
  let filteredCases = [];
  let currentPage = 1;
  const PAGE_SIZE = 20;
  
  // DOM Elements
  const tbody = document.getElementById('tbody');
  const fProv = document.getElementById('f-prov');
  const fKab = document.getElementById('f-kab');
  const fKec = document.getElementById('f-kec');
  const fCat = document.getElementById('f-cat');
  const fSearch = document.getElementById('f-search');
  
  const modal = document.getElementById('modal');
  const form = document.getElementById('form');
  
  // --- Init Selects ---
  function initSelects() {
    // Filters
    fProv.innerHTML += MCS.provIds.map(p => `<option value="${p}">${MCS.PROV[p][0]}</option>`).join('');
    fCat.innerHTML += MCS.CATS.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    fProv.onchange = () => {
      fKab.innerHTML = '<option value="">Pilih Kab/Kota</option>';
      fKec.innerHTML = '<option value="">Pilih Kecamatan</option>';
      if (fProv.value) {
        MCS.getKabs(fProv.value).forEach(k => fKab.innerHTML += `<option value="${k.id}">${k.name}</option>`);
      }
      applyFilters();
    };
    fKab.onchange = () => {
      fKec.innerHTML = '<option value="">Pilih Kecamatan</option>';
      if (fKab.value) {
        MCS.getKecs(fKab.value).forEach(k => fKec.innerHTML += `<option value="${k.id}">${k.name}</option>`);
      }
      applyFilters();
    };
    fKec.onchange = applyFilters;
    fCat.onchange = applyFilters;
    fSearch.oninput = () => { currentPage = 1; applyFilters(); };

    // Form
    const cProv = document.getElementById('c-prov');
    const cKab = document.getElementById('c-kab');
    const cKec = document.getElementById('c-kec');
    cProv.innerHTML = '<option value="">Pilih Provinsi</option>' + MCS.provIds.map(p => `<option value="${p}">${MCS.PROV[p][0]}</option>`).join('');
    cProv.onchange = () => {
      cKab.innerHTML = '<option value="">Pilih Kab/Kota</option>';
      cKec.innerHTML = '<option value="">Pilih Kecamatan</option>';
      if (cProv.value) MCS.getKabs(cProv.value).forEach(k => cKab.innerHTML += `<option value="${k.id}">${k.name}</option>`);
    };
    cKab.onchange = () => {
      cKec.innerHTML = '<option value="">Pilih Kecamatan</option>';
      if (cKab.value) MCS.getKecs(cKab.value).forEach(k => cKec.innerHTML += `<option value="${k.id}">${k.name}</option>`);
    };
    
    document.getElementById('c-cat').innerHTML = '<option value="">Pilih Kategori</option>' + MCS.CATS.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('c-status').innerHTML = MCS.STATUS.map((s, i) => `<option value="${i}">${s.name}</option>`).join('');
    document.getElementById('c-arts').innerHTML = MCS.ARTS.map(a => `<option value="${a.id}">${a.pasal} - ${MCS.LAW[a.law].name}</option>`).join('');
  }

  // --- Render Table ---
  function applyFilters() {
    const s = fSearch.value.toLowerCase();
    const region = fKec.value || fKab.value || fProv.value || 'ID';
    
    filteredCases = MCS.cases.filter(c => {
      if (!MCS.matchRegion(c, region)) return false;
      if (fCat.value && c.cat !== fCat.value) return false;
      if (s) {
        if (!c.id.toLowerCase().includes(s) && !c.title.toLowerCase().includes(s)) return false;
      }
      return true;
    });
    filteredCases.sort((a,b) => b.d - a.d);
    
    currentPage = 1;
    renderTable();
  }

  function renderTable() {
    const total = Math.ceil(filteredCases.length / PAGE_SIZE) || 1;
    if (currentPage > total) currentPage = total;
    if (currentPage < 1) currentPage = 1;
    
    const start = (currentPage - 1) * PAGE_SIZE;
    const items = filteredCases.slice(start, start + PAGE_SIZE);
    
    tbody.innerHTML = items.map(c => `
      <tr>
        <td class="id-col">${c.id}</td>
        <td>${MCS.fmtDate(c.d)}</td>
        <td><b>${c.title}</b></td>
        <td>${MCS.regionName(MCS.regionOf(c).kab)}</td>
        <td><span class="tag" style="color:${MCS.CAT[c.cat].color};border:1px solid currentColor">${MCS.CAT[c.cat].name}</span></td>
        <td><span class="tag" style="color:${MCS.STATUS[c.st].color};background:${MCS.STATUS[c.st].color}20">${MCS.STATUS[c.st].name}</span></td>
        <td class="actions">
          <button class="btn-sec" onclick="Admin.edit('${c.id}')">Edit</button>
          <button class="btn-del" onclick="Admin.del('${c.id}')">Hapus</button>
        </td>
      </tr>
    `).join('');
    
    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--txt-2)">Tidak ada data ditemukan</td></tr>`;
    }
    
    document.getElementById('p-info').textContent = `Halaman ${currentPage} dari ${total} (${MCS.fmt(filteredCases.length)} data)`;
    document.getElementById('p-prev').disabled = currentPage === 1;
    document.getElementById('p-next').disabled = currentPage === total;
  }

  document.getElementById('p-prev').onclick = () => { currentPage--; renderTable(); };
  document.getElementById('p-next').onclick = () => { currentPage++; renderTable(); };

  // --- Form Handling ---
  document.getElementById('btn-add').onclick = () => {
    form.reset();
    document.getElementById('c-id').value = '';
    document.getElementById('m-title').textContent = 'Tambah Perkara Baru';
    modal.classList.add('on');
  };
  
  document.getElementById('btn-cancel').onclick = () => modal.classList.remove('on');

  form.onsubmit = (e) => {
    e.preventDefault();
    
    const kecVal = document.getElementById('c-kec').value;
    if (!kecVal) return alert('Pilih wilayah hingga tingkat kecamatan.');
    
    const parts = kecVal.split('.').map(Number);
    const p = parts[0], k = parts[1], c = parts[2];
    
    const artSelect = document.getElementById('c-arts');
    const arts = Array.from(artSelect.selectedOptions).map(o => o.value);
    
    const id = document.getElementById('c-id').value || MCS.nextId();
    const d = document.getElementById('c-id').value ? MCS.cases.find(x => x.id === id).d : Date.now();
    const cat = document.getElementById('c-cat').value;
    
    const suspectsRaw = document.getElementById('c-suspects').value;
    const suspects = suspectsRaw ? suspectsRaw.split(',').map(s => s.trim()).filter(s => s) : ['NN'];

    const nc = {
      id, p, k, c,
      cat,
      st: parseInt(document.getElementById('c-status').value),
      d,
      title: document.getElementById('c-title').value,
      suspects,
      loss: parseFloat(document.getElementById('c-loss').value) || 0,
      arts,
      conf: 100,
      verified: Date.now(),
      office: 'Kejari ' + MCS.getKabs(p)[k].name.replace(/^Kab\. /, ''),
      y: new Date(d).getFullYear()
    };
    
    MCS.saveCase(nc);
    MCS.audit('Super Admin', document.getElementById('c-id').value ? 'UPDATE CASE' : 'CREATE CASE', id, 'Via Admin Panel');
    
    modal.classList.remove('on');
    applyFilters();
  };

  // --- Expose ---
  window.Admin = {
    edit: (id) => {
      const c = MCS.cases.find(x => x.id === id);
      if (!c) return;
      document.getElementById('m-title').textContent = 'Edit Perkara: ' + id;
      document.getElementById('c-id').value = id;
      document.getElementById('c-title').value = c.title;
      
      document.getElementById('c-prov').value = c.p;
      document.getElementById('c-prov').dispatchEvent(new Event('change'));
      document.getElementById('c-kab').value = c.p + '.' + c.k;
      document.getElementById('c-kab').dispatchEvent(new Event('change'));
      document.getElementById('c-kec').value = c.p + '.' + c.k + '.' + c.c;
      
      document.getElementById('c-cat').value = c.cat;
      document.getElementById('c-status').value = c.st;
      document.getElementById('c-suspects').value = c.suspects.join(', ');
      document.getElementById('c-loss').value = c.loss || 0;
      
      const artSelect = document.getElementById('c-arts');
      Array.from(artSelect.options).forEach(o => o.selected = c.arts.includes(o.value));
      
      modal.classList.add('on');
    },
    del: (id) => {
      if (confirm(`Yakin ingin menghapus perkara ${id}?`)) {
        MCS.deleteCase(id);
        MCS.audit('Super Admin', 'DELETE CASE', id, 'Via Admin Panel');
        applyFilters();
      }
    }
  };

  // Init
  initSelects();
  applyFilters();

})();
