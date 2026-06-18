
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function toggleMobileMenu() {
    const btn = $('[data-mobile-toggle]');
    const menu = $('[data-mobile-menu]');
    if (!btn || !menu) return;
    btn.addEventListener('click', () => menu.classList.toggle('open'));
  }

  function initSearch() {
    $$('[data-filter-scope]').forEach((scope) => {
      const input = $('[data-filter-input]', scope);
      if (!input) return;
      const items = $$('[data-filter-item]', scope);
      const counter = $('[data-filter-count]', scope);
      const empty = $('[data-filter-empty]', scope);
      const apply = () => {
        const q = input.value.trim().toLowerCase();
        let shown = 0;
        items.forEach((item) => {
          const hay = (item.dataset.search || item.textContent || '').toLowerCase();
          const visible = !q || hay.includes(q);
          item.style.display = visible ? '' : 'none';
          if (visible) shown += 1;
        });
        if (counter) counter.textContent = String(shown);
        if (empty) empty.hidden = shown !== 0;
      };
      input.addEventListener('input', apply);
      apply();
    });
  }

  function initHeroSlider() {
    const slider = $('[data-hero-slider]');
    if (!slider) return;
    const slides = $$('.hero-slide', slider);
    const dots = $$('.hero-dot', slider);
    if (!slides.length) return;
    let index = 0;
    let timer;

    function show(i) {
      slides[index].classList.remove('active');
      if (dots[index]) dots[index].classList.remove('active');
      index = (i + slides.length) % slides.length;
      slides[index].classList.add('active');
      if (dots[index]) dots[index].classList.add('active');
    }

    function play() {
      clearInterval(timer);
      timer = setInterval(() => show(index + 1), 5000);
    }

    dots.forEach((dot, i) => dot.addEventListener('click', () => { show(i); play(); }));
    play();
  }

  function initBackTop() {
    const btn = $('[data-back-top]');
    if (!btn) return;
    const onScroll = () => {
      btn.classList.toggle('show', window.scrollY > 520);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = $$('script[src="' + src + '"]')[0];
      if (existing && window.Hls) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function initPlayer(box) {
    const video = $('video', box);
    if (!video) return;
    let sources = [];
    try {
      sources = JSON.parse(box.dataset.streams || '[]').filter(Boolean);
    } catch (err) {
      sources = [];
    }
    if (!sources.length) return;
    const status = $('[data-player-status]', box);
    const playBtn = $('[data-play-btn]', box);
    const nextBtn = $('[data-next-source]', box);
    let sourceIndex = 0;
    let hls = null;

    async function ensureHls() {
      if (window.Hls) return window.Hls;
      await loadScript('https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js');
      return window.Hls;
    }

    function setStatus(text) {
      if (status) status.textContent = text;
    }

    function destroyHls() {
      if (hls) {
        hls.destroy();
        hls = null;
      }
    }

    async function attach(index) {
      destroyHls();
      sourceIndex = (index + sources.length) % sources.length;
      const src = sources[sourceIndex];
      setStatus('正在准备播放…');
      video.pause();
      video.removeAttribute('src');
      video.load();

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        setStatus('已载入播放源 ' + (sourceIndex + 1));
        return;
      }

      const HlsCtor = await ensureHls();
      if (!HlsCtor || !HlsCtor.isSupported()) {
        video.src = src;
        setStatus('使用直连播放源 ' + (sourceIndex + 1));
        return;
      }

      hls = new HlsCtor({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(HlsCtor.Events.MANIFEST_PARSED, () => {
        setStatus('已载入播放源 ' + (sourceIndex + 1));
      });
      hls.on(HlsCtor.Events.ERROR, (_, data) => {
        if (data && data.fatal) {
          if (sourceIndex < sources.length - 1) {
            attach(sourceIndex + 1);
          } else {
            setStatus('当前线路不可用，请稍后重试。');
          }
        }
      });
    }

    async function startPlay() {
      if (!video.src && !hls) await attach(sourceIndex);
      try {
        await video.play();
        setStatus('影片正在播放');
      } catch (err) {
        setStatus('请再次点击播放按钮');
      }
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', async () => {
        await attach(sourceIndex + 1);
        await startPlay();
      });
    }

    if (playBtn) playBtn.addEventListener('click', startPlay);
    video.addEventListener('error', () => {
      if (sourceIndex < sources.length - 1) attach(sourceIndex + 1);
    });
    await attach(sourceIndex);
  }

  function initPlayers() {
    $$('.player-shell[data-hls-player]').forEach((box) => {
      initPlayer(box);
    });
  }

  toggleMobileMenu();
  initSearch();
  initHeroSlider();
  initBackTop();
  initPlayers();
})();
