
(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function initMenu() {
    const btn = qs('[data-menu-toggle]');
    const nav = qs('[data-nav]');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => nav.classList.toggle('open'));
  }

  function initHero() {
    const hero = qs('[data-hero-slider]');
    if (!hero) return;
    const slides = qsa('[data-hero-slide]', hero);
    const dots = qsa('[data-hero-dot]', hero);
    if (slides.length < 2) return;
    let index = 0;
    let timer;
    function show(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach((slide, sIdx) => slide.classList.toggle('active', sIdx === index));
      dots.forEach((dot, dIdx) => dot.classList.toggle('active', dIdx === index));
    }
    function play() {
      clearInterval(timer);
      timer = setInterval(() => show(index + 1), 5500);
    }
    dots.forEach((dot, i) => dot.addEventListener('click', () => { show(i); play(); }));
    hero.addEventListener('mouseenter', () => clearInterval(timer));
    hero.addEventListener('mouseleave', play);
    show(0);
    play();
  }

  function initFilterBar() {
    const input = qs('[data-filter-input]');
    const cards = qsa('[data-filter-card]');
    const chips = qsa('[data-filter-chip]');
    if (!input || !cards.length) return;

    function apply() {
      const q = input.value.trim().toLowerCase();
      const chip = qsa('[data-filter-chip].active')[0];
      const type = chip ? chip.getAttribute('data-filter-chip') : 'all';
      let visible = 0;
      cards.forEach(card => {
        const text = (card.getAttribute('data-search') || '').toLowerCase();
        const itemType = (card.getAttribute('data-type') || '').toLowerCase();
        const matchQ = !q || text.includes(q);
        const matchType = type === 'all' || itemType === type.toLowerCase();
        const ok = matchQ && matchType;
        card.classList.toggle('hidden', !ok);
        if (ok) visible += 1;
      });
      const out = qs('[data-filter-count]');
      if (out) out.textContent = String(visible);
      const empty = qs('[data-filter-empty]');
      if (empty) empty.classList.toggle('hidden', visible !== 0);
    }

    input.addEventListener('input', apply);
    chips.forEach(chip => chip.addEventListener('click', () => {
      chips.forEach(x => x.classList.remove('active'));
      chip.classList.add('active');
      apply();
    }));
    apply();
  }

  function initSearchPage() {
    const box = qs('[data-global-search]');
    const result = qs('[data-search-results]');
    if (!box || !result || !window.MOVIE_INDEX) return;
    const all = window.MOVIE_INDEX;

    function render(items) {
      result.innerHTML = items.map(item => `
        <a class="movie-card" href="${item.detailUrl}">
          <img class="poster" src="${item.cover}" alt="${item.title}">
          <div class="body">
            <h3>${item.title}</h3>
            <div class="meta-row">
              <span class="meta-chip">${item.year}</span>
              <span class="meta-chip">${item.region}</span>
              <span class="meta-chip">${item.type}</span>
            </div>
            <p>${item.genre}</p>
            <div class="foot"><span class="link-arrow">查看详情 →</span></div>
          </div>
        </a>`).join('');
      const empty = qs('[data-search-empty]');
      if (empty) empty.classList.toggle('hidden', items.length !== 0);
    }

    function run() {
      const q = box.value.trim().toLowerCase();
      let items = all;
      if (q) {
        items = all.filter(item => {
          const hay = [item.title, item.year, item.region, item.type, item.genre, item.oneLine].join(' ').toLowerCase();
          return hay.includes(q);
        });
      }
      render(items.slice(0, 120));
    }

    box.addEventListener('input', run);
    run();
  }

  function initPlayer() {
    const video = qs('[data-player]');
    if (!video) return;
    const localMp4 = video.getAttribute('data-mp4');
    const localM3u8 = video.getAttribute('data-m3u8');
    const remoteM3u8 = video.getAttribute('data-remote-m3u8');
    const sourceLabel = qs('[data-source-label]');

    function setSource(kind) {
      video.pause();
      video.removeAttribute('src');
      while (video.firstChild) video.removeChild(video.firstChild);
      let chosen = localMp4;
      let label = '本地 MP4 预览流';
      if (kind === 'm3u8-native' && localM3u8 && video.canPlayType('application/vnd.apple.mpegurl')) {
        chosen = localM3u8;
        label = '本地 HLS 预览流';
      } else if (kind === 'remote-hls' && remoteM3u8 && video.canPlayType('application/vnd.apple.mpegurl')) {
        chosen = remoteM3u8;
        label = '原始 HLS 试播流';
      }
      video.src = chosen;
      video.load();
      if (sourceLabel) sourceLabel.textContent = label;
    }

    const btnMp4 = qs('[data-switch-source="mp4"]');
    const btnLocalHls = qs('[data-switch-source="local-hls"]');
    const btnRemoteHls = qs('[data-switch-source="remote-hls"]');
    if (btnMp4) btnMp4.addEventListener('click', () => setSource('mp4'));
    if (btnLocalHls) btnLocalHls.addEventListener('click', () => setSource('m3u8-native'));
    if (btnRemoteHls) btnRemoteHls.addEventListener('click', () => setSource('remote-hls'));
    setSource('mp4');
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMenu();
    initHero();
    initFilterBar();
    initSearchPage();
    initPlayer();
  });
})();
