const $ = (q) => document.querySelector(q);
const REPO = 'ValeriiOsodoev/buryad';
const ISSUES_API = 'https://api.github.com/repos/' + REPO + '/issues?state=all&per_page=100';

let issues = [];
let user = null;
let bridgeEnabled = false;

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function words(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-zа-яёүөһ0-9]+/giu, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3);
}

function similarityScore(query, issue) {
  const queryWords = new Set(words(query));
  if (!queryWords.size) return 0;
  const haystack = new Set(words(issue.title + ' ' + (issue.body || '')));
  let hits = 0;
  queryWords.forEach((word) => { if (haystack.has(word)) hits += 1; });
  return hits / queryWords.size;
}

function issueCard(issue) {
  const labels = (issue.labels || [])
    .map((label) => '<span class="issue-label">' + escapeHtml(label.name || '') + '</span>')
    .join('');
  const stateLabel = issue.state === 'closed' ? 'Закрыт' : 'Открыт';
  const body = String(issue.body || '').replace(/[#*_>\[\]()]/g, '').trim();
  const excerpt = body.length > 170 ? body.slice(0, 170) + '…' : body;
  return '<a class="issue-card" href="' + escapeHtml(issue.html_url) + '" target="_blank" rel="noreferrer">' +
    '<div class="issue-card-top"><strong>' + escapeHtml(issue.title) + '</strong><span class="issue-number">#' + issue.number + '</span></div>' +
    (excerpt ? '<p>' + escapeHtml(excerpt) + '</p>' : '') +
    '<div class="issue-meta"><span class="issue-state ' + escapeHtml(issue.state || 'open') + '">' + stateLabel + '</span><span>' + new Date(issue.created_at).toLocaleDateString('ru-RU') + '</span>' + labels + '</div></a>';
}

function renderIssues(query = '') {
  const normalized = query.trim().toLowerCase();
  const filtered = issues.filter((issue) => {
    if (!normalized) return true;
    return (issue.title + ' ' + (issue.body || '')).toLowerCase().includes(normalized);
  });
  $('#issuesStatus').textContent = filtered.length
    ? filtered.length + ' Issues в последних 100'
    : 'Совпадений не найдено.';
  $('#issuesList').innerHTML = filtered.slice(0, 30).map(issueCard).join('');
}

function renderSimilar(title) {
  const box = $('#similarIssues');
  const ranked = issues
    .map((issue) => ({issue, score: similarityScore(title, issue)}))
    .filter((item) => item.score >= 0.34)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  if (!ranked.length) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }
  box.innerHTML = '<strong>Похожие Issues — проверь, не дубль ли это:</strong>' +
    ranked.map(({issue}) => '<a href="' + escapeHtml(issue.html_url) + '" target="_blank" rel="noreferrer">#' + issue.number + ' · ' + escapeHtml(issue.title) + ' ↗</a>').join('');
  box.classList.remove('hidden');
}

function updateExtraFields() {
  const kind = $('#feedbackKind').value;
  $('#languageFields').classList.toggle('hidden', kind !== 'language');
  $('#bugFields').classList.toggle('hidden', kind !== 'bug');
}

function renderAccess() {
  $('#feedbackAuthGate').classList.toggle('hidden', Boolean(user));
  $('#feedbackConfigWarning').classList.toggle('hidden', !user || bridgeEnabled);
  $('#feedbackForm').classList.toggle('hidden', !user || !bridgeEnabled);
}

async function loadIssues() {
  try {
    const response = await fetch(ISSUES_API, {headers:{Accept:'application/vnd.github+json'}});
    if (!response.ok) throw new Error('GitHub unavailable');
    const data = await response.json();
    issues = data.filter((item) => !item.pull_request);
    renderIssues();
  } catch {
    $('#issuesStatus').innerHTML = 'Не удалось загрузить список автоматически. <a href="https://github.com/ValeriiOsodoev/buryad/issues" target="_blank" rel="noreferrer">Открыть Issues на GitHub ↗</a>';
  }
}

async function loadAuth() {
  try {
    const response = await fetch('/api/me', {credentials:'same-origin'});
    if (!response.ok) throw new Error('guest');
    user = (await response.json()).user;
  } catch {
    user = null;
  }
}

async function loadBridgeStatus() {
  try {
    const response = await fetch('/api/feedback/status');
    bridgeEnabled = response.ok && Boolean((await response.json()).enabled);
  } catch {
    bridgeEnabled = false;
  }
}

function payload() {
  return {
    kind: $('#feedbackKind').value,
    title: $('#feedbackTitle').value.trim(),
    description: $('#feedbackDescription').value.trim(),
    page_url: $('#feedbackPage').value.trim(),
    current_text: $('#feedbackCurrent').value.trim(),
    proposed_text: $('#feedbackProposed').value.trim(),
    source: $('#feedbackSource').value.trim(),
    steps: $('#feedbackSteps').value.trim(),
    expected: $('#feedbackExpected').value.trim(),
    actual: $('#feedbackActual').value.trim(),
  };
}

async function submitFeedback(event) {
  event.preventDefault();
  const button = $('#feedbackSubmit');
  const result = $('#feedbackResult');
  button.disabled = true;
  button.textContent = 'Создаём Issue…';
  result.textContent = '';
  try {
    const response = await fetch('/api/feedback', {
      method:'POST',
      credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload()),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'Не удалось создать Issue');
    result.innerHTML = 'Готово: <a href="' + escapeHtml(data.issue.url) + '" target="_blank" rel="noreferrer">Issue #' + data.issue.number + ' открыт на GitHub ↗</a>';
    event.currentTarget.reset();
    $('#feedbackPage').value = location.pathname;
    updateExtraFields();
    await loadIssues();
  } catch (error) {
    result.textContent = error.message || 'Не удалось создать Issue.';
  } finally {
    button.disabled = false;
    button.textContent = 'Создать публичный Issue';
  }
}

$('#issueSearch').addEventListener('input', (event) => renderIssues(event.target.value));
$('#feedbackTitle').addEventListener('input', (event) => renderSimilar(event.target.value));
$('#feedbackKind').addEventListener('change', updateExtraFields);
$('#feedbackForm').addEventListener('submit', submitFeedback);
$('#feedbackPage').value = document.referrer && document.referrer.startsWith(location.origin)
  ? new URL(document.referrer).pathname
  : '/feedback';
updateExtraFields();
await Promise.all([loadIssues(), loadAuth(), loadBridgeStatus()]);
renderAccess();
