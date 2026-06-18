
(function () {
  const mobileNav = document.querySelector('[data-mobile-nav]');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  if (mobileNav && menuToggle) {
    menuToggle.addEventListener('click', () => {
      mobileNav.classList.toggle('is-open');
    });
  }

  const searchInput = document.querySelector('[data-catalog-search]');
  const sortSelect = document.querySelector('[data-catalog-sort]');
  const root = document.querySelector('[data-catalog-root]');
  const cards = root ? Array.from(root.querySelectorAll('.movie-card')) : [];
  const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));

  let activeFilter = null;
  let currentQuery = '';

  function normalize(text) {
    return (text || '').toString().toLowerCase();
  }

  function applyFilters() {
    const query = normalize(currentQuery);
    const [kind, value] = activeFilter ? activeFilter.split(':', 2) : [null, null];

    cards.forEach(card => {
      const title = normalize(card.dataset.title);
      const region = normalize(card.dataset.region);
      const type = normalize(card.dataset.type);
      const genre = normalize(card.dataset.genre);
      const year = normalize(card.dataset.year);
      const hay = [title, region, type, genre, year].join(' ');
      const matchesQuery = !query || hay.includes(query);
      let matchesFilter = true;
      if (kind === 'region') matchesFilter = region.includes(normalize(value));
      if (kind === 'genre') matchesFilter = genre.includes(normalize(value));
      if (kind === 'type') matchesFilter = type.includes(normalize(value));
      card.style.display = matchesQuery && matchesFilter ? '' : 'none';
    });
  }

  function sortCards() {
    if (!root || !sortSelect) return;
    const grid = root.querySelector('.grid--cards');
    if (!grid) return;
    const visible = Array.from(grid.children);
    const mode = sortSelect.value;
    visible.sort((a, b) => {
      const ta = a.dataset.title || '';
      const tb = b.dataset.title || '';
      const ya = parseInt(a.dataset.year || '0', 10);
      const yb = parseInt(b.dataset.year || '0', 10);
      if (mode === 'year-asc') return ya - yb;
      if (mode === 'title-asc') return ta.localeCompare(tb, 'zh-Hans-CN');
      return yb - ya;
    });
    visible.forEach(card => grid.appendChild(card));
    applyFilters();
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentQuery = e.target.value;
      applyFilters();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', sortCards);
  }

  if (filterButtons.length) {
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const isActive = btn.classList.contains('is-active');
        filterButtons.forEach(x => x.classList.remove('is-active'));
        activeFilter = isActive ? null : btn.dataset.filter;
        if (!isActive) btn.classList.add('is-active');
        applyFilters();
      });
    });
  }

  sortCards();
  applyFilters();

  const playerRoot = document.querySelector('[data-player]');
  if (playerRoot) {
    const video = playerRoot.querySelector('video');
    const sources = JSON.parse(playerRoot.dataset.sources || '[]');
    const title = playerRoot.dataset.title || '';
    const lineButtons = Array.from(playerRoot.querySelectorAll('[data-line]'));

    function setActiveLine(index) {
      const src = sources[index];
      if (!src) return;
      lineButtons.forEach(btn => btn.classList.toggle('is-active', Number(btn.dataset.line) === index));
      if (window.hlsInstance) {
        try { window.hlsInstance.destroy(); } catch (err) {}
        window.hlsInstance = null;
      }
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
      } else if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
        window.hlsInstance = hls;
      } else {
        video.src = src;
      }
      video.play().catch(() => {});
    }

    lineButtons.forEach(btn => {
      btn.addEventListener('click', () => setActiveLine(Number(btn.dataset.line)));
    });

    if (sources.length) setActiveLine(0);
  }
})();
