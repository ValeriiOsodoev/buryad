const grid = document.querySelector('#coreGrid');
const search = document.querySelector('#coreSearch');
const tabs = [...document.querySelectorAll('[data-core-mode]')];

let data = {everyday: [], corpus: []};
let mode = 'everyday';

function render() {
  if (!grid) return;
  const query = (search?.value || '').toLowerCase().trim();
  const items = data[mode].filter((item) => {
    const haystack = `${item.word} ${item.ru} ${item.note || ''}`.toLowerCase();
    return !query || haystack.includes(query);
  });
  grid.innerHTML = items.map((item, index) => `
    <article class="core-card">
      <div class="core-rank">${mode === 'corpus' ? `#${item.rank}` : `#${index + 1}`}</div>
      <h3>${item.word}</h3>
      <p>${item.ru}</p>
      ${item.note ? `<small>${item.note}</small>` : ''}
    </article>
  `).join('');
}

async function init() {
  const response = await fetch('/assets/data/core.json');
  data = await response.json();
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.coreMode;
      tabs.forEach((button) => button.classList.toggle('active', button === tab));
      render();
    });
  });
  search?.addEventListener('input', render);
  render();
}

init();
