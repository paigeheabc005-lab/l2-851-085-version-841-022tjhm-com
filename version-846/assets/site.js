
(function () {
  const ready = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  };

  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function cleanText(value) { return (value || '').toString().trim(); }
  function toLower(value) { return cleanText(value).toLowerCase(); }
  function normalizeKeywords(item) {
    return [item.title, item.region, item.type, item.year, item.genreRaw, item.oneLine, item.summary, item.review, (item.tags || []).join(' '), item.category]
      .join(' ')
      .toLowerCase();
  }
  function categoryOf(item) {
    const region = toLower(item.region);
    const tags = (item.tags || []).map(toLower);
    if (region.includes('国产') || tags.includes('国产') || tags.includes('中国')) return '国产影视';
    if (region.includes('日韩') || region.includes('日本') || region.includes('韩国') || tags.includes('日韩') || tags.includes('日本') || tags.includes('韩国') || tags.includes('日剧') || tags.includes('韩剧')) return '日韩精选';
    if (region.includes('欧美') || region.includes('美国') || region.includes('英国') || tags.includes('欧美') || tags.includes('美国') || tags.includes('英国') || tags.includes('美剧') || tags.includes('英剧')) return '欧美大片';
    return '亚洲热剧';
  }
  function escapeHtml(str) {
    return cleanText(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function formatYear(item) {
    return cleanText(item.year || '未知年份');
  }
  function getCatalog() {
    return window.ASIAN_FILMS || [];
  }
  function buildPoster(src, alt) {
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">`;
  }
  function cardHtml(item) {
    const cover = cleanText(item.cover || item.cover_file || '').replace(/^\//, '');
    const category = item.category || categoryOf(item);
    const oneLine = escapeHtml(item.oneLine || '');
    return `
      <a class="card" href="detail-${escapeHtml(item.id)}.html" data-searchable="${escapeHtml(normalizeKeywords(item))}">
        <div class="poster">
          ${buildPoster(cover, item.title)}
          <div class="tag">${escapeHtml(category)}</div>
        </div>
        <div class="body">
          <h3 class="line-clamp-2">${escapeHtml(item.title)}</h3>
          <div class="meta-line">${escapeHtml(formatYear(item))} · ${escapeHtml(item.region || '')}</div>
          <p class="line-clamp-3">${oneLine}</p>
        </div>
      </a>`;
  }
  function smallCardHtml(item) {
    const cover = cleanText(item.cover || item.cover_file || '').replace(/^\//, '');
    return `
      <a class="related-item" href="detail-${escapeHtml(item.id)}.html">
        <img src="${escapeHtml(cover)}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async">
        <div>
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.oneLine || '')}</p>
        </div>
      </a>`;
  }
  function createCardGrid(items, emptyMessage) {
    if (!items.length) {
      return `<div class="empty-state"><strong>${escapeHtml(emptyMessage || '暂无结果')}</strong><div>换一个关键词试试</div></div>`;
    }
    return `<div class="grid-4">${items.map(cardHtml).join('')}</div>`;
  }

  function initMenu() {
    const toggle = qs('[data-menu-toggle]');
    const panel = qs('[data-mobile-panel]');
    if (!toggle || !panel) return;
    toggle.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  function initDesktopSearchForm() {
    qsa('form[data-search-form]').forEach((form) => {
      form.addEventListener('submit', (ev) => {
        const input = qs('input[name="q"]', form);
        const value = cleanText(input && input.value);
        if (!value) ev.preventDefault();
      });
    });
  }

  function initFilterBlocks() {
    qsa('[data-filter-wrap]').forEach((wrap) => {
      const input = qs('[data-filter-input]', wrap);
      const cards = qsa('[data-filter-card]', wrap);
      const counter = qs('[data-filter-count]', wrap);
      if (!input || !cards.length) return;
      const run = () => {
        const q = toLower(input.value);
        let visible = 0;
        cards.forEach((card) => {
          const hay = toLower(card.getAttribute('data-searchable') || '');
          const hit = !q || hay.includes(q);
          card.hidden = !hit;
          if (hit) visible += 1;
        });
        if (counter) counter.textContent = `${visible} 部`;
      };
      input.addEventListener('input', run);
      run();
    });
  }

  function initSearchPage() {
    const root = qs('[data-search-page]');
    if (!root) return;
    const input = qs('[data-search-input]', root);
    const results = qs('[data-search-results]', root);
    const meta = qs('[data-search-meta]', root);
    const params = new URLSearchParams(location.search);
    const catalog = getCatalog();
    const initial = cleanText(params.get('q') || '');
    if (input) input.value = initial;

    const render = () => {
      const q = toLower(input ? input.value : initial);
      const matched = !q ? [] : catalog.filter((item) => normalizeKeywords(item).includes(q));
      if (meta) {
        meta.textContent = q ? `搜索“${input.value.trim()}”找到 ${matched.length} 部作品` : '输入关键词开始搜索';
      }
      if (results) {
        results.innerHTML = createCardGrid(matched, '未找到相关影视');
      }
    };

    if (input) {
      input.addEventListener('input', () => render());
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          render();
        }
      });
    }
    render();
  }

  function initPlayer() {
    const video = qs('[data-hls-player]');
    if (!video) return;
    const src = video.getAttribute('data-src');
    if (!src) return;

    function fallback() {
      if (video.canPlayType && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        return;
      }
      const shell = video.closest('.player-shell');
      if (shell) {
        shell.innerHTML = `
          <div class="empty-state" style="margin:0; border-radius:0; border:0; background:#111827; color:#e2e8f0; padding:48px 22px;">
            <strong style="color:#fff;">当前浏览器无法直接播放 HLS</strong>
            <div>请使用支持 HLS 的浏览器，或等待 HLS.js 自动加载完成。</div>
          </div>`;
      }
    }

    if (window.Hls && window.Hls.isSupported && window.Hls.isSupported()) {
      try {
        const hls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(window.Hls.Events.MANIFEST_PARSED, function () {
          // ready
        });
        hls.on(window.Hls.Events.ERROR, function (_, data) {
          if (data && data.fatal) fallback();
        });
        return;
      } catch (err) {
        fallback();
        return;
      }
    }
    fallback();
  }

  function initScrollButtons() {
    qsa('[data-scroll-target]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = qs(btn.getAttribute('data-scroll-target'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function initYearCounter() {
    const counter = qs('[data-year]');
    if (counter) counter.textContent = new Date().getFullYear();
  }

  ready(function () {
    initMenu();
    initDesktopSearchForm();
    initFilterBlocks();
    initSearchPage();
    initPlayer();
    initScrollButtons();
    initYearCounter();
  });

  window.MovieSite = {
    categoryOf,
    cardHtml,
    smallCardHtml,
    createCardGrid,
    normalizeKeywords,
    getCatalog,
  };
})();
