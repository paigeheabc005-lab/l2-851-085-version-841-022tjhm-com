
(function () {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const isBrowse = currentPath === 'browse.html';
  const isHome = currentPath === 'index.html' || currentPath === '';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(str) {
    return String(str || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function splitTokens(text) {
    return String(text || '')
      .split(/[、,/，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function posterStyle(movie) {
    let hash = 0;
    const seed = `${movie.title}|${movie.region}|${movie.year}|${movie.type}`;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 131 + seed.charCodeAt(i)) % 360;
    }
    const a = hash;
    const b = (hash + 42) % 360;
    return `background: linear-gradient(135deg, hsl(${a} 70% 18%), hsl(${b} 72% 28%));`;
  }

  function cardHtml(movie, detailBase = '') {
    const genres = splitTokens(movie.genre).slice(0, 3);
    const tags = splitTokens(movie.tags).slice(0, 2);
    const href = detailBase ? `${detailBase}movies/movie-${movie.code}.html` : `movies/movie-${movie.code}.html`;
    return `
      <a class="card" href="${href}" title="${escapeHtml(movie.title)}">
        <div class="poster" style="${posterStyle(movie)}">
          <div class="poster-badge">#${movie.code} · ${escapeHtml(movie.year || '未知年份')}</div>
          <h3 class="poster-title">${escapeHtml(movie.title)}</h3>
          <div class="poster-meta"><span>${escapeHtml(movie.region || '未知地区')}</span><span>${escapeHtml(movie.type || '未知类型')}</span></div>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(movie.title)}</h3>
          <div class="meta-row"><span>${escapeHtml(movie.year || '—')}</span><span>·</span><span>${escapeHtml(movie.region || '—')}</span></div>
          <p>${escapeHtml(movie.one_line || movie.summary || '')}</p>
          <div class="chips">
            ${genres.map((g) => `<span class="chip">${escapeHtml(g)}</span>`).join('')}
            ${tags.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
      </a>`;
  }

  function renderFeaturedHome() {
    const mount = $('#featured-grid');
    if (!mount || !window.MOVIES_INDEX) return;
    mount.innerHTML = window.MOVIES_INDEX.featured.map((movie) => cardHtml(movie, '')).join('');
  }

  function renderBrowse() {
    const mount = $('#browse-grid');
    if (!mount || !window.MOVIES_INDEX) return;
    const movies = window.MOVIES_INDEX.movies.slice();
    const params = new URLSearchParams(window.location.search);
    const controls = {
      q: $('#q'), type: $('#type'), region: $('#region'), year: $('#year'), sort: $('#sort'), reset: $('#reset'), count: $('#results-count'), pager: $('#pagination')
    };
    const pageSize = 24;

    function syncControlsFromParams() {
      if (controls.q) controls.q.value = params.get('q') || '';
      if (controls.type) controls.type.value = params.get('type') || '';
      if (controls.region) controls.region.value = params.get('region') || '';
      if (controls.year) controls.year.value = params.get('year') || '';
      if (controls.sort) controls.sort.value = params.get('sort') || 'latest';
    }

    function updateUrl(next) {
      const url = new URL(window.location.href);
      ['q', 'type', 'region', 'year', 'sort', 'page'].forEach((key) => {
        if (next[key]) url.searchParams.set(key, next[key]);
        else url.searchParams.delete(key);
      });
      history.replaceState(null, '', url.toString());
    }

    function renderPager(page, totalPages) {
      const pages = [];
      const push = (n, label = String(n), cls = '') => pages.push(`<button class="${cls}" data-page="${n}">${label}</button>`);
      push(Math.max(1, page - 1), '上一页');
      const windowSize = 2;
      const start = Math.max(1, page - windowSize);
      const end = Math.min(totalPages, page + windowSize);
      if (start > 1) push(1);
      if (start > 2) pages.push('<span class="muted" style="align-self:center;">…</span>');
      for (let i = start; i <= end; i++) push(i, String(i), i === page ? 'active' : '');
      if (end < totalPages - 1) pages.push('<span class="muted" style="align-self:center;">…</span>');
      if (end < totalPages) push(totalPages);
      push(Math.min(totalPages, page + 1), '下一页');
      return pages.join('');
    }

    function applyFilters() {
      const q = (controls.q?.value || params.get('q') || '').trim().toLowerCase();
      const type = (controls.type?.value || params.get('type') || '').trim();
      const region = (controls.region?.value || params.get('region') || '').trim();
      const year = (controls.year?.value || params.get('year') || '').trim();
      const sort = (controls.sort?.value || params.get('sort') || 'latest').trim();
      let page = parseInt(params.get('page') || '1', 10);
      if (!Number.isFinite(page) || page < 1) page = 1;

      let filtered = movies.filter((movie) => {
        const hay = `${movie.title} ${movie.region} ${movie.type} ${movie.year} ${movie.genre} ${movie.tags} ${movie.one_line} ${movie.summary} ${movie.review}`.toLowerCase();
        if (q && !hay.includes(q)) return false;
        if (type && movie.type !== type) return false;
        if (region && movie.region !== region) return false;
        if (year && movie.year !== year) return false;
        return true;
      });

      if (sort === 'latest') filtered.sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0) || a.id - b.id);
      else if (sort === 'oldest') filtered.sort((a, b) => (parseInt(a.year) || 0) - (parseInt(b.year) || 0) || a.id - b.id);
      else if (sort === 'title') filtered.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
      else if (sort === 'region') filtered.sort((a, b) => a.region.localeCompare(b.region, 'zh-Hans-CN') || a.title.localeCompare(b.title, 'zh-Hans-CN'));

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      if (page > totalPages) page = totalPages;
      const start = (page - 1) * pageSize;
      const slice = filtered.slice(start, start + pageSize);

      controls.count.textContent = `当前匹配 ${total} 部影片，第 ${page} / ${totalPages} 页`;
      mount.innerHTML = slice.length
        ? slice.map((movie) => cardHtml(movie, '')).join('')
        : '<div class="info-card" style="grid-column:1/-1;"><h3>没有找到匹配结果</h3><p>请尝试减少筛选条件，或换一个关键词继续浏览。</p></div>';
      controls.pager.innerHTML = renderPager(page, totalPages);
      $$('#pagination button').forEach((btn) => {
        btn.addEventListener('click', () => {
          const p = parseInt(btn.dataset.page || '1', 10);
          params.set('page', String(Math.min(Math.max(1, p), totalPages)));
          history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
          syncControlsFromParams();
          applyFilters();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
      updateUrl({ q, type, region, year, sort, page });
    }

    syncControlsFromParams();
    applyFilters();

    ['input', 'change'].forEach((eventName) => {
      [controls.q, controls.type, controls.region, controls.year, controls.sort].forEach((el) => {
        el && el.addEventListener(eventName, () => {
          params.delete('page');
          applyFilters();
        });
      });
    });

    controls.reset?.addEventListener('click', () => {
      const url = new URL(window.location.href);
      url.search = '';
      history.replaceState(null, '', url.toString());
      syncControlsFromParams();
      applyFilters();
    });
  }

  function bindNav() {
    const btn = $('#menu-btn');
    const nav = $('#site-nav');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => nav.classList.toggle('open'));
    nav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') nav.classList.remove('open');
    });
  }

  function bindBackToTop() {
    const btn = $('#back-to-top');
    if (!btn) return;
    const onScroll = () => btn.classList.toggle('show', window.scrollY > 700);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindNav();
    bindBackToTop();
    if (isHome) renderFeaturedHome();
    if (isBrowse) renderBrowse();
  });
})();
