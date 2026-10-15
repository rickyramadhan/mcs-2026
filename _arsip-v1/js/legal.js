/* =====================================================================
   MCS — Legal Intelligence View
   Eksplorasi database hukum (UU, Pasal) dan knowledge graph relasinya 
   ke kategori tindak pidana.
   ===================================================================== */
window.LegalView = (function () {
  'use strict';
  const modal = document.getElementById('legal-view');
  let currentArt = null;
  let currentSim = null;

  function renderGraph() {
    if (currentSim) currentSim.stop();
    const svg = d3.select('#kgraph'); svg.selectAll('*').remove();
    const w = svg.node().clientWidth || 400, h = svg.node().clientHeight || 400;

    const container = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.1, 4]).on('zoom', (e) => {
      container.attr('transform', e.transform);
    }));

    const nodes = [], links = [];
    
    // Categories (central nodes)
    MCS.CATS.forEach(c => {
      nodes.push({ id: 'C_' + c.id, group: 0, label: c.name, r: 18, c: c.color, ref: c });
    });

    // Laws
    MCS.LAWS.forEach(l => {
      nodes.push({ id: 'L_' + l.id, group: 1, label: l.name, r: 14, c: '#f5a524', ref: l });
    });

    // Articles & Links
    const artSet = new Set();
    MCS.cases.forEach(c => {
      c.arts.forEach(aid => {
        if (!artSet.has(aid)) {
          artSet.add(aid);
          const a = MCS.ART[aid];
          nodes.push({ id: 'A_' + aid, group: 2, label: a.pasal, r: 8, c: '#e6edf3', ref: a });
          links.push({ source: 'L_' + a.law, target: 'A_' + aid, value: 2 });
        }
        // Link Cat -> Article based on cases
        const linkId = 'C_' + c.cat + '-' + 'A_' + aid;
        let l = links.find(x => (x.source === 'C_'+c.cat && x.target === 'A_'+aid) || (x.source.id === 'C_'+c.cat && x.target.id === 'A_'+aid));
        if (l) l.value++;
        else links.push({ source: 'C_' + c.cat, target: 'A_' + aid, value: 1 });
      });
    });

    currentSim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(d => d.source.group === 0 ? 120 : 60))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('collide', d3.forceCollide().radius(d => d.r + 10))
      .force('center', d3.forceCenter(w / 2, h / 2));

    const link = container.append('g').attr('class', 'links').selectAll('line')
      .data(links).join('line').attr('class', 'lnk')
      .attr('stroke-width', d => Math.min(6, Math.max(1, Math.sqrt(d.value))));

    const node = container.append('g').attr('class', 'nodes').selectAll('g')
      .data(nodes).join('g').attr('class', 'nd')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) currentSim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) currentSim.alphaTarget(0); d.fx = null; d.fy = null; }))
      .on('click', (e, d) => {
        if (d.group === 2) selectArticle(d.ref.id);
      })
      .on('mouseenter', (e, d) => {
        node.style('opacity', n => n === d || links.some(l => (l.source === d && l.target === n) || (l.target === d && l.source === n)) ? 1 : 0.15);
        link.style('opacity', l => l.source === d || l.target === d ? 1 : 0.05)
            .style('stroke', l => l.source === d || l.target === d ? d.c : '');
      })
      .on('mouseleave', () => {
        node.style('opacity', 1);
        link.style('opacity', 1).style('stroke', '');
      });

    node.append('circle').attr('r', d => d.r + 4).attr('fill', d => d.c).attr('opacity', 0.15);
    node.append('circle').attr('r', d => d.r).attr('fill', d => d.c)
      .attr('stroke', '#0a121e').attr('stroke-width', 2);
    
    node.append('text').attr('dy', 4).attr('x', d => d.r + 8)
      .text(d => d.label).classed('sub', d => d.group === 2)
      .style('display', d => d.group === 2 ? 'none' : 'block'); // Hide article labels unless hovered

    node.filter(d => d.group === 2).on('mouseenter.lbl', function() { d3.select(this).select('text').style('display', 'block'); })
                                   .on('mouseleave.lbl', function() { d3.select(this).select('text').style('display', 'none'); });

    currentSim.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  }

  function selectArticle(aid) {
    if (currentArt) {
      const el = document.getElementById('art-' + currentArt);
      if (el) el.classList.remove('sel');
    }
    currentArt = aid;
    const a = MCS.ART[aid], l = MCS.LAW[a.law];
    const el = document.getElementById('art-' + aid);
    if (el) el.classList.add('sel');

    // Calc stats
    let total = 0, active = 0;
    const relatedCats = {};
    MCS.cases.forEach(c => {
      if (c.arts.includes(aid)) {
        total++;
        if (c.st < 4) active++;
        relatedCats[c.cat] = (relatedCats[c.cat] || 0) + 1;
      }
    });

    const topCat = Object.keys(relatedCats).length ? 
      Object.keys(relatedCats).reduce((a, b) => relatedCats[a] > relatedCats[b] ? a : b) : null;

    document.getElementById('lv-detail').innerHTML = `
      <div class="ad-big">${a.pasal}</div>
      <div class="ad-law">${l.name.toUpperCase()} · ${l.full}</div>
      <div class="ad-desc">${a.desc}</div>
      <div class="ad-th">ANCAMAN: ${a.threat.toUpperCase()}</div>
      
      <div class="stat3">
        <div><span>TOTAL CASES</span><b>${MCS.fmt(total)}</b></div>
        <div><span>ACTIVE CASES</span><b class="c-cyan">${MCS.fmt(active)}</b></div>
        <div><span>PRIMARY CAT</span><b style="color:${topCat ? MCS.CAT[topCat].color : 'inherit'}">${topCat ? MCS.CAT[topCat].name.toUpperCase() : '-'}</b></div>
      </div>
    `;
    if (window.translateDOM) window.translateDOM(document.getElementById('lv-detail'));
  }

  function buildList() {
    document.getElementById('lv-count').textContent = MCS.LAWS.length + ' STATUTES';
    const html = MCS.LAWS.map(l => {
      const arts = MCS.ARTS.filter(a => a.law === l.id);
      return `
        <div class="law">
          <div class="law-h">
            <div><div class="n">${l.name}</div><div class="f">${l.about.toUpperCase()}</div></div>
            <div class="c">${arts.length} ARTICLES</div>
          </div>
          <div class="law-b">
            ${arts.map(a => `<div class="art" id="art-${a.id}" onclick="LegalView.select('${a.id}')"><span>${a.pasal}</span><span>${a.id}</span></div>`).join('')}
          </div>
        </div>
      `;
    }).join('');
    document.getElementById('lv-laws').innerHTML = html;
  }

  function open() {
    document.getElementById('lv-scope').textContent = MCS.regionName(MCSMap.focus).toUpperCase();
    buildList();
    modal.classList.add('on');
    setTimeout(() => {
      renderGraph();
      if (!currentArt) selectArticle('TPK-2');
      else selectArticle(currentArt);
      if (window.translateDOM) window.translateDOM(modal);
    }, 300);
  }

  modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => {
    modal.classList.remove('on');
    if (currentSim) { currentSim.stop(); currentSim = null; }
  });
  document.getElementById('btn-legal').onclick = open;

  return { open, select: selectArticle };
})();
