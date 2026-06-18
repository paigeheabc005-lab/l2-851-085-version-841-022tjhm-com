(function () {
  const mobileNav = document.querySelector('[data-mobile-nav]');
  const toggle = document.querySelector('[data-menu-toggle]');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      mobileNav.classList.toggle('show');
    });
  }

  const playBtn = document.querySelector('[data-play-btn]');
  const video = document.querySelector('.video-player');

  function initVideo() {
    if (!video) return;
    const hlsSrc = video.dataset.hls;
    const fallback = video.dataset.fallback;
    const canUseHls = typeof Hls !== 'undefined' && Hls.isSupported();
    if (canUseHls && hlsSrc && hlsSrc.endsWith('.m3u8')) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true
      });
      hls.loadSource(hlsSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, function (_, data) {
        if (data && data.fatal) {
          if (fallback) video.src = fallback;
        }
      });
    } else if (hlsSrc && hlsSrc.endsWith('.m3u8') && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsSrc;
    } else if (fallback) {
      video.src = fallback;
    }
  }

  initVideo();

  if (playBtn && video) {
    playBtn.addEventListener('click', async () => {
      try {
        await video.play();
        playBtn.style.display = 'none';
      } catch (err) {
        console.warn(err);
      }
    });
    video.addEventListener('play', () => {
      playBtn.style.display = 'none';
    });
    video.addEventListener('pause', () => {
      playBtn.style.display = '';
    });
    video.addEventListener('ended', () => {
      playBtn.style.display = '';
    });
  }

  const searchForm = document.querySelector('[data-search-form]');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      const input = searchForm.querySelector('input[name="q"]');
      if (!input || !input.value.trim()) {
        e.preventDefault();
      }
    });
  }
})();
