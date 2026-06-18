
(function () {
  function qs(root, sel) {
    return root.querySelector(sel);
  }
  function qsa(root, sel) {
    return Array.from(root.querySelectorAll(sel));
  }

  function setupMenu() {
    const toggle = document.querySelector('[data-menu-toggle]');
    const nav = document.querySelector('[data-site-nav]');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function () {
      nav.classList.toggle('is-open');
    });
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) {
        nav.classList.remove('is-open');
      }
    });
  }

  function setupCarousel() {
    const carousels = qsa(document, '[data-carousel]');
    carousels.forEach(function (carousel) {
      const slides = qsa(carousel, '[data-carousel-slide]');
      const prev = qs(carousel, '[data-carousel-prev]');
      const next = qs(carousel, '[data-carousel-next]');
      const dots = qsa(carousel, '[data-carousel-dot]');
      if (!slides.length) return;

      let index = slides.findIndex(function (s) { return s.classList.contains('is-active'); });
      if (index < 0) index = 0;
      let timer = null;

      function show(n) {
        index = (n + slides.length) % slides.length;
        slides.forEach(function (slide, i) {
          slide.classList.toggle('is-active', i === index);
        });
        dots.forEach(function (dot, i) {
          dot.classList.toggle('is-active', i === index);
        });
      }

      function step(delta) {
        show(index + delta);
      }

      if (prev) prev.addEventListener('click', function () { step(-1); restart(); });
      if (next) next.addEventListener('click', function () { step(1); restart(); });
      dots.forEach(function (dot) {
        dot.addEventListener('click', function () {
          show(Number(dot.dataset.carouselDot || 0));
          restart();
        });
      });

      function restart() {
        if (timer) clearInterval(timer);
        timer = setInterval(function () {
          step(1);
        }, 5500);
      }

      show(index);
      restart();

      carousel.addEventListener('mouseenter', function () { if (timer) clearInterval(timer); });
      carousel.addEventListener('mouseleave', restart);
    });
  }

  function setupFilters() {
    const panels = qsa(document, '[data-filter-panel]');
    panels.forEach(function (panel) {
      const scope = qs(panel.parentElement, '[data-filter-scope]');
      const input = qs(panel, '[data-filter-input]');
      const chips = qsa(panel, '[data-filter-chip]');
      const sorts = qsa(panel, '[data-sort]');
      const count = qs(panel, '[data-filter-count]');
      const empty = qs(panel.parentElement, '[data-empty-state]');
      if (!scope) return;

      let activeGroup = 'all';
      let currentSort = 'score';
      const cards = qsa(scope, '.movie-card, .rank-item');

      function apply() {
        const q = (input && input.value ? input.value : '').trim().toLowerCase();
        let visible = 0;

        cards.forEach(function (card) {
          const text = (card.dataset.search || card.textContent || '').toLowerCase();
          const cardType = card.dataset.type || '';
          const cardGenre = card.dataset.genre || '';
          const matchQ = !q || text.indexOf(q) !== -1;
          const matchGroup = activeGroup === 'all' || cardType === activeGroup || cardGenre === activeGroup;
          const show = matchQ && matchGroup;
          card.classList.toggle('is-hidden', !show);
          if (show) visible += 1;
        });

        if (count) count.textContent = visible;
        if (empty) empty.hidden = visible !== 0;

        const visibleCards = cards.filter(function (card) {
          return !card.classList.contains('is-hidden');
        });

        visibleCards.sort(function (a, b) {
          if (currentSort === 'title') {
            return (a.textContent || '').localeCompare(b.textContent || '');
          }
          if (currentSort === 'year') {
            return (Number(b.dataset.year || 0) - Number(a.dataset.year || 0));
          }
          return (Number(b.dataset.score || 0) - Number(a.dataset.score || 0)) || (Number(b.dataset.heat || 0) - Number(a.dataset.heat || 0));
        });

        visibleCards.forEach(function (card) {
          scope.appendChild(card);
        });
      }

      if (input) {
        input.addEventListener('input', apply);
        const url = new URL(window.location.href);
        const q = url.searchParams.get('q');
        if (q && !input.value) {
          input.value = q;
        }
      }

      chips.forEach(function (chip) {
        chip.addEventListener('click', function () {
          chips.forEach(function (c) { c.classList.remove('is-active'); });
          chip.classList.add('is-active');
          activeGroup = chip.dataset.filterChip || 'all';
          apply();
        });
      });

      sorts.forEach(function (sort) {
        sort.addEventListener('click', function () {
          sorts.forEach(function (s) { s.classList.remove('is-active'); });
          sort.classList.add('is-active');
          currentSort = sort.dataset.sort || 'score';
          apply();
        });
      });

      apply();
    });
  }

  function setupPlayer() {
    const shell = document.querySelector('[data-player]');
    if (!shell) return;

    const video = qs(shell, 'video');
    const overlay = qs(shell, '[data-player-overlay]');
    const trigger = qs(shell, '[data-player-trigger]');
    const lineButtons = qsa(shell, '[data-play-line]');
    if (!video) return;

    const mp4 = shell.dataset.mp4;
    const hlsUrl = shell.dataset.hls;
    let activeLine = '1';
    let hlsInstance = null;
    let currentSrc = null;

    function clearHls() {
      if (hlsInstance) {
        try { hlsInstance.destroy(); } catch (e) {}
        hlsInstance = null;
      }
    }

    function setLine(line) {
      activeLine = String(line || '1');
      lineButtons.forEach(function (btn) {
        btn.classList.toggle('is-active', btn.dataset.playLine === activeLine);
      });
      clearHls();

      if (activeLine === '2' && hlsUrl) {
        if (window.Hls && window.Hls.isSupported()) {
          hlsInstance = new window.Hls({ enableWorker: true, lowLatencyMode: true });
          hlsInstance.loadSource(hlsUrl);
          hlsInstance.attachMedia(video);
          hlsInstance.on(window.Hls.Events.ERROR, function (event, data) {
            if (data && data.fatal) {
              console.warn('HLS playback error', data);
            }
          });
          currentSrc = hlsUrl;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = hlsUrl;
          currentSrc = hlsUrl;
        } else {
          video.src = mp4;
          currentSrc = mp4;
        }
      } else {
        video.src = mp4;
        currentSrc = mp4;
      }
    }

    function startPlayback() {
      if (!currentSrc) {
        setLine(activeLine);
      }
      if (overlay) overlay.classList.add('is-hidden');
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {});
      }
    }

    lineButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setLine(btn.dataset.playLine || '1');
        startPlayback();
      });
    });

    if (trigger) trigger.addEventListener('click', startPlayback);
    if (overlay) overlay.addEventListener('click', startPlayback);
    video.addEventListener('play', function () {
      if (overlay) overlay.classList.add('is-hidden');
    });
    video.addEventListener('pause', function () {
      if (overlay) overlay.classList.remove('is-hidden');
    });

    setLine('1');
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupMenu();
    setupCarousel();
    setupFilters();
    setupPlayer();
  });
})();
