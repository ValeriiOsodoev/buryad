import {api} from './api.js';
import {answerMatches, similarity} from './normalize.js';

const $ = (q) => document.querySelector(q);
const state = {
  lessons: [],
  verbs: [],
  videos: [],
  lesson: 0,
  exercise: 0,
  progress: {},
  user: null,
  registerMode: false,
};
const personLabels = [
  ['1sg', 'би'],
  ['2sg', 'ши'],
  ['3sg', 'тэрэ'],
  ['1pl', 'бидэ'],
  ['2pl', 'та'],
  ['3pl', 'тэдэ'],
];
const endings = {'1sg': 'б', '2sg': 'ш', '3sg': '', '1pl': 'бди', '2pl': 'т', '3pl': 'д'};

async function loadData() {
  [state.lessons, state.verbs, state.videos] = await Promise.all([
    fetch('/assets/data/lessons.json').then((r) => r.json()),
    fetch('/assets/data/verbs.json').then((r) => r.json()),
    fetch('/assets/data/videos.json').then((r) => r.json()),
  ]);
  try {
    state.user = (await api('/api/me')).user;
    await loadRemoteProgress();
  } catch {
    loadLocalProgress();
  }
  renderAll();
}

function loadLocalProgress() {
  state.progress = JSON.parse(localStorage.getItem('buryad.progress') || '{}');
}

async function loadRemoteProgress() {
  const data = await api('/api/progress');
  state.progress = Object.fromEntries(data.items.map((x) => [x.exercise_id, x]));
}

function saveLocal() {
  localStorage.setItem('buryad.progress', JSON.stringify(state.progress));
}

async function record(id, correct, answer) {
  const current = state.progress[id] || {attempts: 0, correct: 0, streak: 0, status: 'learning'};
  current.attempts += 1;
  current.correct += Number(correct);
  current.streak = correct ? current.streak + 1 : 0;
  current.status = current.streak >= 3 ? 'mastered' : 'learning';
  current.last_answer = answer;
  state.progress[id] = current;
  saveLocal();
  if (state.user) {
    try {
      await api('/api/progress', {
        method: 'POST',
        body: JSON.stringify({exercise_id: id, correct, answer}),
      });
    } catch {}
  }
  renderStats();
}

function renderAll() {
  renderLessons();
  renderExercise();
  renderVerbs();
  renderVideos();
  renderStats();
  renderAuth();
}

function renderLessons() {
  $('#lessonList').innerHTML = state.lessons
    .map(
      (lesson, index) =>
        `<button class="lesson-button ${index === state.lesson ? 'active' : ''}" data-i="${index}"><span>${lesson.title}</span><small>${lesson.exercises.length}</small></button>`,
    )
    .join('');
  document.querySelectorAll('.lesson-button').forEach((button) => {
    button.onclick = () => {
      state.lesson = Number(button.dataset.i);
      state.exercise = 0;
      renderLessons();
      renderExercise();
    };
  });
}

function currentExercise() {
  return state.lessons[state.lesson].exercises[state.exercise];
}

function renderExercise() {
  const exercise = currentExercise();
  $('#exerciseTag').textContent = state.lessons[state.lesson].title;
  $('#exercisePrompt').textContent = exercise.ru;
  $('#newWords').innerHTML = (exercise.new || [])
    .map(([buryat, ru]) => `<span class="word-chip"><b>${buryat}</b> — ${ru}</span>`)
    .join('');
  $('#answerInput').value = '';
  $('#feedback').className = 'feedback hidden';
  $('#feedback').innerHTML = '';
}

function nextExercise() {
  const list = state.lessons[state.lesson].exercises;
  state.exercise = (state.exercise + 1) % list.length;
  renderExercise();
}

$('#checkAnswer').onclick = async () => {
  const exercise = currentExercise();
  const answer = $('#answerInput').value;
  const ok = answerMatches(answer, exercise.answers);
  await record(exercise.id, ok, answer);
  const feedback = $('#feedback');
  feedback.className = `feedback ${ok ? 'ok' : 'bad'}`;
  feedback.innerHTML = `<strong>${ok ? 'Да, рабочий вариант.' : 'Почти / не совпало.'}</strong><br>${exercise.answers[0]}<div class="source-note">${ok ? 'Идём дальше.' : 'Скажи правильный вариант вслух и повтори ещё раз позже.'}</div>`;
  setTimeout(() => ok && nextExercise(), 900);
};

$('#dontKnow').onclick = () => {
  const exercise = currentExercise();
  const feedback = $('#feedback');
  feedback.className = 'feedback bad';
  feedback.innerHTML = `<strong>${exercise.answers[0]}</strong><div class="source-note">Проговори вслух 2 раза, затем переходи дальше.</div>`;
  record(exercise.id, false, '');
};

function conjugate(verb, tense, negative, person) {
  const base = verb[tense];
  if (!negative) return base + endings[person];
  return `${base}гүй${endings[person]}`;
}

function renderVerbs() {
  const query = $('#verbSearch').value?.toLowerCase() || '';
  const tense = $('#verbTense').value || 'present';
  const negative = $('#verbNegative').checked;
  const rows = state.verbs.filter(
    (verb) => !query || `${verb.infinitive} ${verb.ru}`.toLowerCase().includes(query),
  );
  $('#verbGrid').innerHTML = rows
    .map(
      (verb) =>
        `<article class="verb-card"><div class="verb-head"><div><small>#${verb.rank}</small><h3>${verb.infinitive}</h3><small>${verb.ru}</small></div><span class="tag">${verb.imperative}!</span></div><div class="conj">${personLabels.map(([person, label]) => `<div><b>${label}</b>${conjugate(verb, tense, negative, person)}</div>`).join('')}</div></article>`,
    )
    .join('');
}

['verbSearch', 'verbTense', 'verbNegative'].forEach((id) =>
  $(`#${id}`).addEventListener('input', renderVerbs),
);

function renderVideos() {
  $('#videoGrid').innerHTML = state.videos
    .map(
      (video) =>
        `<article class="video-card"><div class="tag">${video.source}</div><h3>${video.title}</h3><div class="video-frame"><iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0" title="${video.title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><p>${video.instruction}</p><textarea id="video-${video.id}" rows="3" placeholder="Что услышал?"></textarea><div class="video-actions"><button class="secondary" data-video="${video.id}">Сохранить попытку</button></div><div class="video-result" id="result-${video.id}"></div></article>`,
    )
    .join('');
  document.querySelectorAll('[data-video]').forEach((button) => {
    button.onclick = async () => {
      const video = state.videos.find((item) => item.id === button.dataset.video);
      const answer = $(`#video-${video.id}`).value.trim();
      if (!answer) return;
      const score = video.reference ? similarity(answer, video.reference) : 0;
      if (state.user) {
        try {
          await api('/api/video-attempts', {
            method: 'POST',
            body: JSON.stringify({video_id: video.id, answer, score}),
          });
        } catch {}
      }
      localStorage.setItem(`buryad.video.${video.id}`, answer);
      $(`#result-${video.id}`).textContent = video.reference
        ? `Совпадение по словам: ${score}%`
        : 'Попытка сохранена. Пересмотри ролик и сам сравни звучание — для этих открытых видео эталонную расшифровку мы не подменяем догадкой.';
    };
  });
}

function renderStats() {
  const items = Object.values(state.progress);
  const attempts = items.reduce((sum, item) => sum + (item.attempts || 0), 0);
  const correct = items.reduce((sum, item) => sum + (item.correct || 0), 0);
  const mastered = items.filter((item) => item.status === 'mastered').length;
  const best = Math.max(0, ...items.map((item) => item.streak || 0));
  $('#metricMastered').textContent = mastered;
  $('#metricAttempts').textContent = attempts;
  $('#metricAccuracy').textContent = attempts ? `${Math.round((correct / attempts) * 100)}%` : '0%';
  $('#metricStreak').textContent = best;
  $('#heroStats').textContent = `${mastered} освоено · ${items.filter((item) => item.status === 'learning').length} в повторении`;
}

function renderAuth() {
  $('#authButton').textContent = state.user
    ? state.user.display_name || state.user.email.split('@')[0]
    : 'Войти';
  $('#progressHint').textContent = state.user
    ? `Прогресс синхронизируется с аккаунтом ${state.user.email}.`
    : 'Войди, чтобы прогресс сохранялся на сервере. Без входа он хранится только в этом браузере.';
}

$('#authButton').onclick = async () => {
  if (state.user) {
    if (confirm('Выйти из аккаунта?')) {
      await api('/api/auth/logout', {method: 'POST'});
      state.user = null;
      renderAuth();
    }
    return;
  }
  $('#authDialog').showModal();
};

$('#authSwitch').onclick = () => {
  state.registerMode = !state.registerMode;
  $('#authTitle').textContent = state.registerMode ? 'Регистрация' : 'Вход';
  $('#authSubmit').textContent = state.registerMode ? 'Создать аккаунт' : 'Войти';
  $('#displayName').classList.toggle('hidden', !state.registerMode);
  $('#authSwitch').textContent = state.registerMode
    ? 'Уже есть аккаунт? Войти'
    : 'Нет аккаунта? Зарегистрироваться';
};

$('#authForm').onsubmit = async (event) => {
  event.preventDefault();
  $('#authError').textContent = '';
  try {
    const payload = {
      email: $('#email').value,
      password: $('#password').value,
      display_name: $('#displayName').value,
    };
    const path = state.registerMode ? '/api/auth/register' : '/api/auth/login';
    const data = await api(path, {method: 'POST', body: JSON.stringify(payload)});
    state.user = data.user;
    await loadRemoteProgress();
    renderAll();
    $('#authDialog').close();
  } catch (error) {
    $('#authError').textContent = error.message;
  }
};

loadData();
