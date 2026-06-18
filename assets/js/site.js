
(function () {
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function initPlayer() {
    const video = q('[data-video-element]');
    if (!video) return;
    const source = video.getAttribute('data-video-src');
    const poster = video.getAttribute('poster') || '';
    const playBtn = q('[data-play-button]');
    const status = q('[data-player-status]');
    const speed = q('[data-speed-select]');

    function setStatus(text) {
      if (status) status.textContent = text;
    }

    function attachSource() {
      if (!source) {
        setStatus('暂无可播放地址');
        return;
      }
      if (window.Hls && Hls.isSupported() && source.includes('.m3u8')) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(source);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
          setStatus('播放源已加载');
        });
        hls.on(Hls.Events.ERROR, function (_, data) {
          if (data && data.fatal) {
            setStatus('播放失败，已切换原生播放模式');
            try {
              hls.destroy();
            } catch (e) {}
            video.src = source;
          }
        });
      } else {
        video.src = source;
        setStatus('使用原生播放器');
      }
      if (poster) video.poster = poster;
    }

    attachSource();

    if (playBtn) {
      playBtn.addEventListener('click', function () {
        const p = video.play();
        if (p && typeof p.catch === 'function') {
          p.catch(function () {
            setStatus('浏览器阻止了自动播放，请再次点击播放');
          });
        }
      });
    }

    if (speed) {
      speed.addEventListener('change', function () {
        video.playbackRate = Number(this.value || 1);
      });
    }

    video.addEventListener('play', function () { setStatus('正在播放'); });
    video.addEventListener('pause', function () { setStatus('已暂停'); });
    video.addEventListener('ended', function () { setStatus('播放结束'); });
  }

  function renderSearchPage() {
    const mount = q('[data-search-results]');
    if (!mount) return;
    const input = q('[data-search-input]');
    const countEl = q('[data-search-count]');
    const params = new URLSearchParams(location.search);
    const initialQuery = (params.get('q') || '').trim();
    if (input && initialQuery) input.value = initialQuery;

    const root = document.body.getAttribute('data-root') || '';
    let moviesPromise = fetch(root + 'assets/movies.json').then(r => r.json());

    function badge(text) {
      return '<span class="inline-flex items-center rounded-full bg-slate-800/90 px-2 py-1 text-xs text-slate-300">' + escapeHtml(text) + '</span>';
    }

    function card(movie) {
      const poster = root + 'assets/posters/' + movie.id + '.svg';
      return `
        <a href="${root}movie/${movie.id}.html" class="group rounded-3xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl">
          <div class="movie-poster">
            <img src="${poster}" alt="${escapeHtml(movie.title)}" loading="lazy" class="h-full w-full object-cover" />
          </div>
          <div class="p-4">
            <div class="flex items-start justify-between gap-2">
              <h3 class="text-lg font-semibold text-white line-clamp-2">${escapeHtml(movie.title)}</h3>
              <span class="shrink-0 rounded-full bg-orange-500/15 px-2 py-1 text-xs text-orange-300">${movie.year}</span>
            </div>
            <p class="mt-2 line-clamp-2 text-sm text-slate-400">${escapeHtml(movie.one_line)}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              ${badge(movie.region)}
              ${badge(movie.genre)}
            </div>
          </div>
        </a>`;
    }

    function escapeHtml(s) {
      return String(s || '').replace(/[&<>"']/g, function (ch) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
      });
    }

    function update() {
      const qv = (input ? input.value : initialQuery).trim().toLowerCase();
      moviesPromise.then(function (movies) {
        const result = !qv ? movies.slice(0, 120) : movies.filter(function (m) {
          const hay = [m.title, m.region, m.type, m.genre, m.one_line, m.summary, m.review, (m.tags || []).join(' ')].join(' ').toLowerCase();
          return hay.indexOf(qv) !== -1;
        });
        if (countEl) countEl.textContent = result.length + ' 部';
        mount.innerHTML = result.slice(0, 240).map(card).join('') || '<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-slate-300">没有找到匹配影片。</div>';
      });
    }

    if (input) {
      input.addEventListener('input', update);
    }
    update();
  }

  function initBackToTop() {
    const btn = q('[data-back-to-top]');
    if (!btn) return;
    window.addEventListener('scroll', function () {
      btn.classList.toggle('opacity-0', window.scrollY < 400);
      btn.classList.toggle('pointer-events-none', window.scrollY < 400);
    });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initPlayer();
    renderSearchPage();
    initBackToTop();
  });
})();
