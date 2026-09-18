const $ = (q) => document.querySelector(q);
const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

let grammar = {topics:[]};

function currentSlug() {
  const parts = location.pathname.split('/').filter(Boolean);
  return parts[0] === 'grammar' ? (parts[1] || '') : '';
}

function topicUrl(slug) {
  return `/grammar/${slug}`;
}

function renderNav(activeSlug = '') {
  $('#grammarNav').innerHTML = [
    `<a class="grammar-nav-link ${!activeSlug ? 'active' : ''}" href="/grammar"><span>00</span><b>Обзор</b></a>`,
    ...grammar.topics.map((topic, index) =>
      `<a class="grammar-nav-link ${topic.slug === activeSlug ? 'active' : ''}" href="${topicUrl(topic.slug)}">
        <span>${String(index + 1).padStart(2,'0')}</span><b>${esc(topic.title)}</b>
      </a>`
    ),
  ].join('');

  $('#grammarSelect').innerHTML = [
    '<option value="">Обзор грамматики</option>',
    ...grammar.topics.map((topic) => `<option value="${esc(topic.slug)}">${esc(topic.title)}</option>`),
  ].join('');
  $('#grammarSelect').value = activeSlug;
}

function renderExamples(examples = []) {
  if (!examples.length) return '';
  return `<div class="grammar-examples">${examples.map((item) => `
    <div class="grammar-example">
      <strong>${esc(item.bxr)}</strong>
      <span>${esc(item.ru)}</span>
      ${item.note ? `<small>${esc(item.note)}</small>` : ''}
    </div>`).join('')}</div>`;
}

function renderTable(rows = []) {
  if (!rows.length) return '';
  return `<div class="grammar-table-wrap"><table class="grammar-table"><tbody>${rows.map((row) =>
    `<tr>${row.map((cell, index) => `<${index === 0 ? 'th' : 'td'}>${esc(cell)}</${index === 0 ? 'th' : 'td'}>`).join('')}</tr>`
  ).join('')}</tbody></table></div>`;
}

function renderSources(sources = []) {
  if (!sources.length) return '';
  return `<footer class="grammar-sources"><span class="tag">Источники</span><div>${sources.map((source) =>
    `<a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.label)} ↗</a>`
  ).join('')}</div></footer>`;
}

function renderOverview() {
  document.title = 'Грамматика бурятского — Buryad';
  $('#grammarContent').innerHTML = `
    <header class="grammar-article-head">
      <span class="eyebrow">Обзор</span>
      <h2>Правило за одну минуту</h2>
      <p>Начни с гармонии гласных и притяжания — они сразу объяснят формы вроде <b>ерэхэ</b>, <b>ябаха</b>, <b>үрэмни</b> и <b>үрэмнай</b>.</p>
    </header>
    <div class="grammar-topic-grid">
      ${grammar.topics.map((topic, index) => `
        <a class="grammar-topic-card" href="${topicUrl(topic.slug)}">
          <span>${String(index + 1).padStart(2,'0')}</span>
          <strong>${esc(topic.title)}</strong>
          <p>${esc(topic.summary)}</p>
          <b>Открыть →</b>
        </a>`).join('')}
    </div>
    <aside class="grammar-callout">
      <strong>Главная ловушка для начинающего</strong>
      <p>Не применяй гармонию гласных ко всему подряд. Например, личные притяжательные <b>-мни / -мнай</b> — отдельные показатели: <b>үрэмни</b> «мой ребёнок», <b>үрэмнай</b> «наш ребёнок».</p>
    </aside>`;
}

function renderTopic(topic) {
  document.title = `${topic.title} — грамматика бурятского`;
  const index = grammar.topics.findIndex((item) => item.slug === topic.slug);
  const prev = grammar.topics[index - 1];
  const next = grammar.topics[index + 1];

  $('#grammarContent').innerHTML = `
    <header class="grammar-article-head">
      <span class="eyebrow">${esc(topic.eyebrow)}</span>
      <h2>${esc(topic.title)}</h2>
      <p>${esc(topic.summary)}</p>
    </header>
    <div class="grammar-sections">
      ${topic.sections.map((section) => `
        <section class="grammar-rule">
          <h3>${esc(section.title)}</h3>
          <p>${esc(section.body)}</p>
          ${renderExamples(section.examples)}
          ${renderTable(section.table)}
        </section>`).join('')}
    </div>
    ${renderSources(topic.sources)}
    <nav class="grammar-pager" aria-label="Соседние разделы">
      ${prev ? `<a href="${topicUrl(prev.slug)}">← ${esc(prev.title)}</a>` : '<span></span>'}
      ${next ? `<a href="${topicUrl(next.slug)}">${esc(next.title)} →</a>` : '<a href="/grammar">К обзору →</a>'}
    </nav>`;
}

function renderSearch(query) {
  const box = $('#grammarSearchResults');
  const q = query.trim().toLowerCase();
  if (!q) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }
  const matches = grammar.topics.filter((topic) => {
    const haystack = [
      topic.title,
      topic.summary,
      ...topic.sections.flatMap((section) => [
        section.title,
        section.body,
        ...(section.examples || []).flatMap((item) => [item.bxr, item.ru, item.note || '']),
      ]),
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  }).slice(0, 6);

  box.innerHTML = matches.length
    ? matches.map((topic) => `<a href="${topicUrl(topic.slug)}"><strong>${esc(topic.title)}</strong><span>${esc(topic.summary)}</span></a>`).join('')
    : '<p>Ничего не найдено. Попробуй другую форму или русское название правила.</p>';
  box.classList.remove('hidden');
}

async function init() {
  grammar = await fetch('/assets/data/grammar.json').then((response) => {
    if (!response.ok) throw new Error('Grammar data unavailable');
    return response.json();
  });

  const slug = currentSlug();
  const topic = grammar.topics.find((item) => item.slug === slug);
  renderNav(topic?.slug || '');
  topic ? renderTopic(topic) : renderOverview();

  $('#grammarSelect').addEventListener('change', (event) => {
    location.href = event.target.value ? topicUrl(event.target.value) : '/grammar';
  });
  $('#grammarSearch').addEventListener('input', (event) => renderSearch(event.target.value));
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.grammar-search')) $('#grammarSearchResults').classList.add('hidden');
  });
}

init().catch(() => {
  $('#grammarContent').innerHTML = '<div class="grammar-error"><strong>Не удалось загрузить грамматику.</strong><p>Обнови страницу ещё раз.</p></div>';
});
