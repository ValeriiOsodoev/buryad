const $ = (q) => document.querySelector(q);

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function boostyCard(boosty) {
  if (!boosty?.url) return '';
  return `<article class="support-method-card">
    <span class="tag">Boosty</span>
    <h3>Регулярная поддержка</h3>
    <p>Можно оформить ежемесячную поддержку проекта на Boosty.</p>
    <a class="primary" href="${escapeHtml(boosty.url)}" target="_blank" rel="noreferrer">${escapeHtml(boosty.label || 'Подписаться на Boosty')} ↗</a>
  </article>`;
}

function cryptoCard(item) {
  if (!item?.address) return '';
  const label = `${item.asset} · ${item.network}`;
  return `<article class="support-method-card">
    <span class="tag">Криптовалюта</span>
    <h3>${escapeHtml(label)}</h3>
    <p>Отправляй только <b>${escapeHtml(item.asset)}</b> в сети <b>${escapeHtml(item.network)}</b>. Для другой сети этот адрес использовать нельзя.</p>
    <div class="support-address">
      <code>${escapeHtml(item.address)}</code>
      <button class="secondary support-copy" type="button" data-address="${escapeHtml(item.address)}">Скопировать</button>
    </div>
  </article>`;
}

async function init() {
  const data = await fetch('/assets/data/support.json').then((response) => {
    if (!response.ok) throw new Error('Support data unavailable');
    return response.json();
  });

  const cards = [
    boostyCard(data.boosty),
    ...(data.crypto || []).map(cryptoCard),
  ].filter(Boolean);

  $('#supportMethods').innerHTML = cards.join('');
  $('#supportMethods').classList.toggle('hidden', cards.length === 0);
  $('#supportEmpty').classList.toggle('hidden', cards.length > 0);

  document.querySelectorAll('.support-copy').forEach((button) => {
    button.addEventListener('click', async () => {
      await navigator.clipboard.writeText(button.dataset.address || '');
      const previous = button.textContent;
      button.textContent = 'Скопировано';
      setTimeout(() => { button.textContent = previous; }, 1400);
    });
  });
}

init().catch(() => {
  $('#supportMethods').classList.add('hidden');
  $('#supportEmpty').classList.remove('hidden');
});
