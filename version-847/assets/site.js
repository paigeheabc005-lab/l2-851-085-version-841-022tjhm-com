(function () {
  const data = window.MOVIE_DATA || [];

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function titleInitials(title) {
    const cleaned = (title || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return '映';
    const chars = Array.from(cleaned).filter(ch => /[\u4e00-\u9fffA-Za-z0-9]/.test(ch));
    return chars.slice(0, 2).join('').toUpperCase();
  }

  function gradientFor(seed) {
    const base = hashCode(seed) % 360;
    const c1 = `hsl(${base}, 88%, 58%)`;
    const c2 = `hsl(${(base + 48) % 360}, 82%, 46%)`;
    return `linear-gradient(135deg, ${c1}, ${c2})`;
  }

  function cardHTML(item) {
    const genres = (item.genre || '').split(',').filter(Boolean).slice(0, 2);
    const tags = (item.tags || []).slice(0, 2);
    return `
      <article class="movie-card">
        <a href="/movies/${item.id}.html" aria-label="查看 ${escapeHtml(item.title)} 详情">
          <div class="poster" style="background:${gradientFor(item.title)}">
            <span>${escapeHtml(titleInitials(item.title))}</span>
          </div>
          <div class="card-body">
            <h3>${escapeHtml(item.title)}</h3>
            <div class="meta">
              <span class="badge">${escapeHtml(item.year)}</span>
              <span class="badge">${escapeHtml(item.type)}</span>
            </div>
            <div class="chips">
              ${genres.map(x => `<span class="chip">${escapeHtml(x)}</span>`).join('')}
              ${tags.map(x => `<span class="chip">${escapeHtml(x)}</span>`).join('')}
            </div>
            <p>${escapeHtml(item.one_line || item.summary || '')}</p>
          </div>
        </a>
      </article>
    `;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setActiveNav() {
    const path = location.pathname;
    qsa('.nav-links a').forEach(a => {
      const href = a.getAttribute('href');
      const active = href && ((href === '/index.html' && (path === '/' || path.endsWith('/index.html'))) || (href !== '/index.html' && path.endsWith(href.replace(/^\//, ''))));
      a.classList.toggle('active', active);
    });
  }

  function setupMenu() {
    const btn = qs('[data-menu-toggle]');
    const nav = qs('[data-nav-links]');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => nav.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('open')) return;
      if (nav.contains(e.target) || btn.contains(e.target)) return;
      nav.classList.remove('open');
    });
  }

  function initBrowse() {
    const mount = qs('[data-browse-results]');
    if (!mount || !data.length) return;

    const params = new URLSearchParams(location.search);
    const state = {
      q: params.get('q') || '',
      type: params.get('type') || '',
      region: params.get('region') || '',
      genre: params.get('genre') || '',
      year: params.get('year') || '',
      sort: params.get('sort') || 'new',
      page: Math.max(1, parseInt(params.get('page') || '1', 10) || 1),
    };

    const searchEl = qs('[data-filter-search]');
    const typeEl = qs('[data-filter-type]');
    const regionEl = qs('[data-filter-region]');
    const genreEl = qs('[data-filter-genre]');
    const yearEl = qs('[data-filter-year]');
    const sortEl = qs('[data-filter-sort]');
    const countEl = qs('[data-results-count]');
    const pagerEl = qs('[data-pagination]');
    const topChips = qs('[data-quick-tags]');

    if (searchEl) searchEl.value = state.q;
    if (typeEl) typeEl.value = state.type;
    if (regionEl) regionEl.value = state.region;
    if (genreEl) genreEl.value = state.genre;
    if (yearEl) yearEl.value = state.year;
    if (sortEl) sortEl.value = state.sort;

    const populateSelect = (el, values) => {
      if (!el) return;
      const current = el.value;
      const label = el.options[0] ? el.options[0].textContent : '全部';
      el.innerHTML = `<option value="">${escapeHtml(label)}</option>` + values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
      el.value = current;
    };

    populateSelect(typeEl, [...new Set(data.map(x => x.type).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'zh-Hans-CN')));
    populateSelect(regionEl, [...new Set(data.map(x => x.region).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'zh-Hans-CN')));
    populateSelect(genreEl, [...new Set(data.flatMap(x => (x.genre || '').split(',').map(s => s.trim()).filter(Boolean)))].sort((a,b) => a.localeCompare(b, 'zh-Hans-CN')));
    populateSelect(yearEl, [...new Set(data.map(x => x.year).filter(Boolean))].sort((a,b) => Number(b) - Number(a)));

    if (topChips) {
      const popular = data.flatMap(x => x.tags || []).reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {});
      const chips = Object.entries(popular).sort((a,b) => b[1] - a[1]).slice(0, 12).map(([tag, count]) => `<a class="chip" href="#" data-chip="${escapeHtml(tag)}">${escapeHtml(tag)} · ${count}</a>`).join('');
      topChips.innerHTML = chips;
      qsa('[data-chip]', topChips).forEach(chip => {
        chip.addEventListener('click', (e) => {
          e.preventDefault();
          state.q = chip.dataset.chip || '';
          if (searchEl) searchEl.value = state.q;
          state.page = 1;
          render();
        });
      });
    }

    const pageSize = 24;

    function filteredData() {
      let items = data.slice();
      const q = state.q.trim().toLowerCase();
      if (q) {
        items = items.filter(item => {
          const hay = [item.title, item.region, item.type, item.year, item.genre, item.one_line, item.summary, item.review, ...(item.tags || [])].join(' ').toLowerCase();
          return hay.includes(q);
        });
      }
      if (state.type) items = items.filter(item => item.type === state.type);
      if (state.region) items = items.filter(item => item.region === state.region);
      if (state.genre) items = items.filter(item => (item.genre || '').split(',').some(g => g.trim() === state.genre));
      if (state.year) items = items.filter(item => String(item.year) === String(state.year));

      const sorters = {
        new: (a, b) => Number(b.year) - Number(a.year) || a.id.localeCompare(b.id),
        old: (a, b) => Number(a.year) - Number(b.year) || a.id.localeCompare(b.id),
        title: (a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'),
        region: (a, b) => a.region.localeCompare(b.region, 'zh-Hans-CN') || a.title.localeCompare(b.title, 'zh-Hans-CN'),
      };
      const sorter = sorters[state.sort] || sorters.new;
      items.sort(sorter);
      return items;
    }

    function syncUrl() {
      const url = new URL(location.href);
      const params = url.searchParams;
      const setParam = (k, v) => { if (v) params.set(k, v); else params.delete(k); };
      setParam('q', state.q);
      setParam('type', state.type);
      setParam('region', state.region);
      setParam('genre', state.genre);
      setParam('year', state.year);
      setParam('sort', state.sort);
      setParam('page', String(state.page));
      history.replaceState({}, '', `${url.pathname}?${params.toString()}${url.hash}`.replace(/[?]$/, ''));
    }

    function render() {
      const items = filteredData();
      const total = items.length;
      const pages = Math.max(1, Math.ceil(total / pageSize));
      if (state.page > pages) state.page = pages;
      const start = (state.page - 1) * pageSize;
      const pageItems = items.slice(start, start + pageSize);

      if (countEl) {
        countEl.textContent = `找到 ${total.toLocaleString('zh-Hans-CN')} 部影片`;
      }

      mount.innerHTML = pageItems.length ? pageItems.map(cardHTML).join('') : `
        <div class="empty-state" style="grid-column:1/-1">
          <h3>没有找到符合条件的影片</h3>
          <p class="muted">请尝试减少筛选条件，或更换关键词。</p>
        </div>
      `;

      if (pagerEl) {
        pagerEl.innerHTML = '';
        const addBtn = (label, page, cls = '') => {
          const btn = document.createElement('button');
          btn.className = `page-btn ${cls}`.trim();
          btn.textContent = label;
          btn.disabled = page < 1 || page > pages;
          btn.addEventListener('click', () => {
            state.page = page;
            syncUrl();
            render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
          pagerEl.appendChild(btn);
        };
        addBtn('上一页', state.page - 1);
        const span = 7;
        let startPage = Math.max(1, state.page - Math.floor(span / 2));
        let endPage = Math.min(pages, startPage + span - 1);
        startPage = Math.max(1, endPage - span + 1);
        for (let p = startPage; p <= endPage; p += 1) addBtn(String(p), p, p === state.page ? 'active' : '');
        addBtn('下一页', state.page + 1);
      }

      syncUrl();
    }

    const debounce = (fn, wait = 250) => {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
      };
    };

    const bind = (el, key) => {
      if (!el) return;
      el.addEventListener('input', debounce(() => { state[key] = el.value; state.page = 1; render(); }));
      el.addEventListener('change', () => { state[key] = el.value; state.page = 1; render(); });
    };

    bind(searchEl, 'q');
    bind(typeEl, 'type');
    bind(regionEl, 'region');
    bind(genreEl, 'genre');
    bind(yearEl, 'year');
    bind(sortEl, 'sort');

    const clearBtn = qs('[data-clear-filters]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.q = ''; state.type = ''; state.region = ''; state.genre = ''; state.year = ''; state.sort = 'new'; state.page = 1;
        if (searchEl) searchEl.value = '';
        if (typeEl) typeEl.value = '';
        if (regionEl) regionEl.value = '';
        if (genreEl) genreEl.value = '';
        if (yearEl) yearEl.value = '';
        if (sortEl) sortEl.value = 'new';
        render();
      });
    }

    render();
  }

  function initIndex() {
    const rack = qs('[data-feature-grid]');
    if (!rack || !data.length) return;
    const items = data.slice(0, 12);
    rack.innerHTML = items.map(cardHTML).join('');
  }

  setActiveNav();
  setupMenu();
  initIndex();
  initBrowse();
})();
