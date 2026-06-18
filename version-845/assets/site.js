
(function(){
  const nav = document.querySelector('[data-nav]');
  const toggle = document.querySelector('[data-nav-toggle]');
  if (nav && toggle) toggle.addEventListener('click', () => nav.classList.toggle('open'));

  const searchInputs = document.querySelectorAll('[data-filter-search]');
  const cards = Array.from(document.querySelectorAll('[data-card]'));
  const counts = document.querySelector('[data-filter-count]');
  const selects = Array.from(document.querySelectorAll('[data-filter-select]'));
  function norm(v){ return (v || '').toString().toLowerCase().trim(); }
  function applyFilters(){
    if (!cards.length) return;
    const q = norm(searchInputs[0] && searchInputs[0].value);
    const type = norm(selects.find(s => s.name === 'type')?.value || '');
    const region = norm(selects.find(s => s.name === 'region')?.value || '');
    const sort = selects.find(s => s.name === 'sort')?.value || 'rank';
    let visible = 0;
    cards.forEach(card => {
      const hay = norm(card.dataset.search);
      const cardType = norm(card.dataset.type);
      const cardRegion = norm(card.dataset.region);
      const ok = (!q || hay.includes(q)) && (!type || cardType === type) && (!region || cardRegion === region);
      card.classList.toggle('hide', !ok);
      if (ok) visible += 1;
    });
    if (sort === 'year-desc' || sort === 'year-asc') {
      const grid = document.querySelector('[data-sort-grid]');
      if (grid) {
        const visibleCards = cards.filter(c => !c.classList.contains('hide'));
        visibleCards.sort((a,b) => {
          const ay = parseInt(a.dataset.year || '0', 10);
          const by = parseInt(b.dataset.year || '0', 10);
          return sort === 'year-desc' ? by - ay : ay - by;
        });
        visibleCards.forEach(card => grid.appendChild(card));
      }
    }
    if (counts) counts.textContent = String(visible);
  }
  if (searchInputs.length || selects.length) {
    searchInputs.forEach(input => input.addEventListener('input', applyFilters));
    selects.forEach(select => select.addEventListener('change', applyFilters));
    applyFilters();
  }
  const player = document.querySelector('[data-player]');
  if (player) {
    const video = player.querySelector('video');
    const playBtn = player.querySelector('[data-play]');
    const sourceButtons = Array.from(document.querySelectorAll('[data-source]'));
    let hls;
    function attachSource(url){
      if (!video || !url) return;
      if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }
      if (window.Hls && window.Hls.isSupported && window.Hls.isSupported()) {
        hls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
        hls.loadSource(url);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
      } else {
        video.src = url;
      }
      sourceButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.source === url));
    }
    sourceButtons.forEach(btn => btn.addEventListener('click', () => attachSource(btn.dataset.source)));
    if (playBtn) playBtn.addEventListener('click', async () => { try { await video.play(); } catch (e) {} const overlay = player.querySelector('[data-overlay]'); if (overlay) overlay.style.display = 'none'; });
    const initial = player.dataset.initialSource || (sourceButtons[0] && sourceButtons[0].dataset.source);
    if (initial) attachSource(initial);
  }
})();
