(async function () {
  const resultsBox = document.querySelector('[data-search-results]');
  const statusBox = document.querySelector('[data-search-status]');
  const chips = Array.from(document.querySelectorAll('[data-chip]'));
  const params = new URLSearchParams(location.search);
  let query = (params.get('q') || '').trim();

  function escapeHtml(text) {
    return String(text)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function makeCard(movie) {
    const genres = (movie.genre || []).slice(0, 2).join('、') || movie.type || '';
    const tags = (movie.tags || []).slice(0, 3).map(t => `<span>${escapeHtml(t)}</span>`).join('');
    return `
      <article class="movie-card">
        <a class="movie-card-link" href="${movie.slug}.html">
          <div class="poster">
            <span class="poster-year">${movie.year || '—'}</span>
            <div class="poster-core">
              <div class="poster-logo">影</div>
              <div class="poster-title">${escapeHtml(movie.title)}</div>
              <div class="poster-sub">${escapeHtml(genres)}</div>
            </div>
            <div class="poster-overlay"></div>
          </div>
          <div class="movie-card-body">
            <h3>${escapeHtml(movie.title)}</h3>
            <div class="movie-meta">
              <span>${escapeHtml(movie.region || '未知地区')}</span>
              <span>${escapeHtml(movie.type || '影片')}</span>
              <span>${movie.year || '—'}</span>
            </div>
            <p>${escapeHtml((movie.one_line || movie.summary || '').slice(0, 96))}</p>
            <div class="movie-tags">${tags}</div>
          </div>
        </a>
      </article>
    `;
  }

  function match(movie, q) {
    if (!q) return true;
    const hay = [
      movie.title,
      movie.region,
      movie.type,
      movie.year,
      movie.one_line,
      movie.summary,
      movie.review,
      ...(movie.genre || []),
      ...(movie.tags || [])
    ].join(' ').toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  async function render() {
    if (!resultsBox || !statusBox) return;
    statusBox.textContent = '正在加载全部影片数据…';
    const res = await fetch('assets/catalog.json', { cache: 'no-store' });
    const data = await res.json();
    const movies = data.movies || [];
    const categoryMatch = chips.find(ch => ch.classList.contains('active'));
    if (categoryMatch && !query) query = categoryMatch.dataset.chip || '';

    const filtered = movies.filter(m => match(m, query));
    statusBox.textContent = `已找到 ${filtered.length} 部影片${query ? ` · 关键词：${query}` : ''}`;
    resultsBox.innerHTML = filtered.slice(0, 300).map(makeCard).join('') ||
      '<div class="note-card">没有匹配结果，试试输入标题、地区、年份或标签。</div>';
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      query = chip.dataset.chip || '';
      chips.forEach(x => x.classList.remove('active'));
      chip.classList.add('active');
      const input = document.querySelector('.search-bar input[name="q"]');
      if (input) input.value = query;
      render();
    });
  });

  const input = document.querySelector('.search-bar input[name="q"]');
  if (input && query) input.value = query;

  await render();
})();
