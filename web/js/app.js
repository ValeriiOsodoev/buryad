import {api} from './api.js';
import {conjugate, PERSON_LABELS} from './conjugate.js';
import {answerMatches, similarity} from './normalize.js';
import {nextReview} from './progress.js';
import {buildSession} from './session.js';
import {createCourseController} from './course-ui.js';
import {flattenCourse, taskId} from './course.js';

const $ = (q) => document.querySelector(q);
const state = {
  course: [],
  audio: {},
  lessons: [],
  verbs: [],
  videos: [],
  progress: {},
  user: null,
  registerMode: false,
  session: [],
  sessionIndex: 0,
  answered: false,
  expandedVerb: null,
  videoIndex: 0,
  courseController: null,
};

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function localProgress() {
  try { return JSON.parse(localStorage.getItem('buryad.progress') || '{}'); }
  catch { return {}; }
}

function saveLocal() {
  if (!state.user) localStorage.setItem('buryad.progress', JSON.stringify(state.progress));
}

function hydrateRemote(item) {
  const updated = Date.parse(item.updated_at || '') || Date.now();
  const step = Math.max(-1, Math.min(5, Number(item.streak || 0) - 1));
  const delays = [10*60_000, 86400_000, 3*86400_000, 7*86400_000, 21*86400_000, 45*86400_000];
  return {...item, review_step:step, next_review_at:updated + delays[Math.max(0, step)]};
}

async function loadRemoteProgress() {
  const data = await api('/api/progress');
  state.progress = Object.fromEntries(data.items.map((item) => [item.exercise_id, hydrateRemote(item)]));
}

async function mergeGuestProgress() {
  const guest = localProgress();
  const items = Object.entries(guest)
    .filter(([, item]) => Number(item.attempts || 0) > 0)
    .map(([exercise_id, item]) => ({
      exercise_id,
      attempts:Number(item.attempts || 0),
      correct:Number(item.correct || 0),
      streak:Number(item.streak || 0),
      last_answer:item.last_answer || '',
    }));
  if (!items.length) return;
  await api('/api/progress/merge',{method:'POST',body:JSON.stringify({items})});
  localStorage.removeItem('buryad.progress');
}

async function loadData() {
  [state.course, state.audio, state.lessons, state.verbs, state.videos] = await Promise.all([
    fetch('/assets/data/course.json').then((r) => r.json()),
    fetch('/assets/data/audio.json').then((r) => r.json()),
    fetch('/assets/data/lessons.json').then((r) => r.json()),
    fetch('/assets/data/verbs.json').then((r) => r.json()),
    fetch('/assets/data/videos.json').then((r) => r.json()),
  ]);
  try {
    state.user = (await api('/api/me')).user;
    await mergeGuestProgress();
    await loadRemoteProgress();
  } catch {
    state.user = null;
    state.progress = localProgress();
  }
  rebuildSession();
  state.courseController = createCourseController({
    course:state.course,
    audioMap:state.audio,
    getProgress:() => state.progress,
    record,
  });
  renderAll();
}

function allExercises() {
  return state.lessons.flatMap((lesson) => lesson.exercises.map((exercise) => ({...exercise,lessonTitle:lesson.title,lessonId:lesson.id})));
}

function rebuildSession() {
  state.session = buildSession(state.lessons,state.progress,Date.now(),10);
  if (!state.session.length) state.session = allExercises().slice(0,10);
  state.sessionIndex = 0;
  state.answered = false;
}

function currentExercise() {
  return state.session[state.sessionIndex] || allExercises()[0];
}

async function record(exercise, correct, answer) {
  const existing = state.progress[exercise.id] || {attempts:0,correct:0,streak:0,status:'learning'};
  const scheduled = nextReview(existing,correct,Date.now());
  const current = {
    ...scheduled,
    attempts:Number(existing.attempts || 0) + 1,
    correct:Number(existing.correct || 0) + Number(correct),
    last_answer:answer,
    updated_at:new Date().toISOString(),
  };
  state.progress[exercise.id] = current;
  saveLocal();
  if (state.user) {
    try {
      const remote = await api('/api/progress',{
        method:'POST',
        body:JSON.stringify({exercise_id:exercise.id,correct,answer}),
      });
      current.status = remote.status;
      current.streak = remote.streak;
    } catch {
      // Keep current in memory; a later successful session refreshes server state.
    }
  }
  renderStats();
  state.courseController?.renderProgress();
}

function renderAll() {
  renderLessons();
  renderExercise();
  renderVerbs();
  renderVideo();
  renderStats();
  renderAuth();
  state.courseController?.renderProgress();
}

function renderLessons() {
  const active = currentExercise()?.lessonId;
  $('#lessonList').innerHTML = state.lessons.map((lesson) => {
    const due = lesson.exercises.filter((exercise) => {
      const p = state.progress[exercise.id];
      return p && Number(p.next_review_at || 0) <= Date.now();
    }).length;
    return `<button class="lesson-button ${lesson.id === active ? 'active' : ''}" data-lesson="${escapeHtml(lesson.id)}" type="button"><span>${escapeHtml(lesson.title)}</span><small>${due ? `${due} повтор.` : lesson.exercises.length}</small></button>`;
  }).join('');
  document.querySelectorAll('[data-lesson]').forEach((button) => {
    button.onclick = () => {
      const lesson = state.lessons.find((item) => item.id === button.dataset.lesson);
      if (!lesson) return;
      state.session = lesson.exercises.map((exercise) => ({...exercise,lessonTitle:lesson.title,lessonId:lesson.id}));
      state.sessionIndex = 0;
      state.answered = false;
      renderLessons();
      renderExercise();
      $('#answerInput').focus();
    };
  });
}

function renderExercise() {
  const exercise = currentExercise();
  if (!exercise) return;
  $('#exerciseTag').textContent = exercise.lessonTitle || 'Бытовая речь';
  $('#exercisePrompt').textContent = exercise.ru;
  $('#exerciseState').textContent = 'Вспомни';
  $('#newWords').innerHTML = (exercise.new || []).map(([buryat,ru]) => `<span class="word-chip"><b>${escapeHtml(buryat)}</b> — ${escapeHtml(ru)}</span>`).join('');
  $('#answerInput').value = '';
  $('#answerInput').disabled = false;
  $('#feedback').className = 'feedback hidden';
  $('#feedback').innerHTML = '';
  $('#checkAnswer').classList.remove('hidden');
  $('#dontKnow').classList.remove('hidden');
  $('#continueExercise').classList.add('hidden');
  state.answered = false;
  const total = Math.max(1,state.session.length);
  $('#sessionCounter').textContent = `${state.sessionIndex + 1} / ${total}`;
  $('#sessionProgressBar').style.width = `${Math.round(((state.sessionIndex + 1) / total) * 100)}%`;
}

function showFeedback(correct, exercise) {
  state.answered = true;
  $('#answerInput').disabled = true;
  $('#exerciseState').textContent = correct ? 'Получилось' : 'Повтори';
  const feedback = $('#feedback');
  feedback.className = `feedback ${correct ? 'ok' : 'bad'}`;
  feedback.innerHTML = `<strong>${correct ? 'Да, так можно сказать.' : 'Сверься с рабочим вариантом.'}</strong><div class="answer-reveal">${escapeHtml(exercise.answers[0])}</div><div class="source-note">${correct ? 'Проговори фразу вслух один раз и продолжай.' : 'Проговори правильный вариант два раза. Эта фраза вернётся раньше.'}</div>`;
  $('#checkAnswer').classList.add('hidden');
  $('#dontKnow').classList.add('hidden');
  $('#continueExercise').classList.remove('hidden');
  $('#continueExercise').focus();
}

async function checkCurrent() {
  if (state.answered) return nextExercise();
  const exercise = currentExercise();
  const answer = $('#answerInput').value.trim();
  if (!answer) {
    $('#feedback').className = 'feedback bad';
    $('#feedback').textContent = 'Сначала напиши вариант или нажми «Не помню».';
    return;
  }
  const correct = answerMatches(answer,exercise.answers);
  await record(exercise,correct,answer);
  showFeedback(correct,exercise);
}

function nextExercise() {
  state.sessionIndex += 1;
  if (state.sessionIndex >= state.session.length) {
    rebuildSession();
    $('#todaySubtitle').textContent = 'Сессия завершена. Новая собрана из следующих повторов.';
  }
  renderLessons();
  renderExercise();
  $('#answerInput').focus();
}

$('#checkAnswer').onclick = checkCurrent;
$('#continueExercise').onclick = nextExercise;
$('#dontKnow').onclick = async () => {
  const exercise = currentExercise();
  await record(exercise,false,'');
  showFeedback(false,exercise);
};
$('#answerInput').addEventListener('keydown',(event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    state.answered ? nextExercise() : checkCurrent();
  }
});
$('#restartSession').onclick = () => { rebuildSession(); renderLessons(); renderExercise(); };

function renderVerbs() {
  const query = $('#verbSearch').value?.toLowerCase().trim() || '';
  const tense = $('#verbTense').value || 'present';
  const negative = $('#verbNegative').checked;
  const rows = state.verbs.filter((verb) => !query || `${verb.infinitive} ${verb.ru}`.toLowerCase().includes(query));
  $('#verbGrid').innerHTML = rows.map((verb) => {
    const expanded = state.expandedVerb === verb.infinitive;
    return `<article class="verb-card ${expanded ? 'expanded' : ''}" data-verb-card="${escapeHtml(verb.infinitive)}">
      <button class="verb-summary" type="button" data-verb="${escapeHtml(verb.infinitive)}" aria-expanded="${expanded}">
        <div class="verb-title"><span class="verb-rank">#${verb.rank}</span><strong>${escapeHtml(verb.infinitive)}</strong><span>${escapeHtml(verb.ru)}</span></div>
        <span class="verb-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="verb-detail"><div class="verb-meta"><span class="word-chip">Повелительное: <b>${escapeHtml(verb.imperative)}!</b></span></div><div class="conj">${PERSON_LABELS.map(([person,label]) => `<div><b>${escapeHtml(label)}</b>${escapeHtml(conjugate(verb,tense,negative,person))}</div>`).join('')}</div></div>
    </article>`;
  }).join('');
  document.querySelectorAll('[data-verb]').forEach((button) => {
    button.onclick = () => {
      state.expandedVerb = state.expandedVerb === button.dataset.verb ? null : button.dataset.verb;
      renderVerbs();
      if (state.expandedVerb) document.querySelector(`[data-verb-card="${CSS.escape(state.expandedVerb)}"]`)?.scrollIntoView({block:'nearest'});
    };
  });
}
['verbSearch','verbTense','verbNegative'].forEach((id) => $(`#${id}`).addEventListener('input',renderVerbs));

function renderVideo() {
  const video = state.videos[state.videoIndex];
  if (!video) return;
  $('#videoCounter').textContent = `${state.videoIndex + 1} / ${state.videos.length}`;
  $('#videoPrev').disabled = state.videoIndex === 0;
  $('#videoNext').disabled = state.videoIndex === state.videos.length - 1;
  const saved = localStorage.getItem(`buryad.video.${video.id}`) || '';
  $('#videoGrid').innerHTML = `<article class="video-card"><div class="tag">${escapeHtml(video.source)}</div><h3>${escapeHtml(video.title)}</h3><div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0" title="${escapeHtml(video.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><p>${escapeHtml(video.instruction)}</p><label class="field-label" for="activeVideoAnswer">Что услышал?</label><textarea id="activeVideoAnswer" rows="4" spellcheck="false" placeholder="Запиши фразу максимально дословно">${escapeHtml(saved)}</textarea><div class="video-actions"><button class="primary" id="saveVideoAttempt" type="button">Сохранить попытку</button></div><div class="video-result" id="activeVideoResult" role="status" aria-live="polite"></div></article>`;
  $('#saveVideoAttempt').onclick = async () => {
    const answer = $('#activeVideoAnswer').value.trim();
    if (!answer) { $('#activeVideoResult').textContent = 'Сначала запиши то, что удалось услышать.'; return; }
    const score = video.reference ? similarity(answer,video.reference) : 0;
    localStorage.setItem(`buryad.video.${video.id}`,answer);
    if (state.user) {
      try { await api('/api/video-attempts',{method:'POST',body:JSON.stringify({video_id:video.id,answer,score})}); } catch {}
    }
    $('#activeVideoResult').textContent = video.reference
      ? `Совпадение с проверенной расшифровкой: ${score}%`
      : 'Попытка сохранена. Здесь нет проверенного transcript, поэтому мы не рисуем выдуманный процент: переслушай тот же фрагмент и сверяй себя на слух.';
  };
}
$('#videoPrev').onclick = () => { if (state.videoIndex > 0) { state.videoIndex -= 1; renderVideo(); } };
$('#videoNext').onclick = () => { if (state.videoIndex < state.videos.length - 1) { state.videoIndex += 1; renderVideo(); } };

function progressLabels() {
  const labels = Object.fromEntries(allExercises().map((exercise) => [exercise.id,exercise.ru]));
  for (const phrase of flattenCourse(state.course)) {
    for (const mode of ['recall','meaning','dialogue','dictation','audio-response']) {
      labels[taskId(phrase.id,mode)] = phrase.ru;
    }
  }
  return labels;
}

function renderStats() {
  const now = Date.now();
  const items = Object.entries(state.progress);
  const attempts = items.reduce((sum,[,item]) => sum + Number(item.attempts || 0),0);
  const correct = items.reduce((sum,[,item]) => sum + Number(item.correct || 0),0);
  const mastered = items.filter(([,item]) => item.status === 'mastered' || Number(item.review_step || -1) >= 4).length;
  const due = items.filter(([,item]) => Number(item.next_review_at || Number.MAX_SAFE_INTEGER) <= now).length;
  const best = Math.max(0,...items.map(([,item]) => Number(item.streak || 0)));
  $('#metricMastered').textContent = mastered;
  $('#metricDue').textContent = due;
  $('#metricAccuracy').textContent = attempts ? `${Math.round(correct / attempts * 100)}%` : '0%';
  $('#metricStreak').textContent = best;
  $('#heroStats').textContent = attempts ? `${mastered} заданий освоено · ${due} пора повторить` : '0 освоено · начни первую сессию';
  const labels = progressLabels();
  const weak = items
    .filter(([,item]) => Number(item.attempts || 0) >= 2 && Number(item.correct || 0) / Math.max(1,Number(item.attempts || 0)) < .6)
    .slice(0,8);
  $('#weakItems').innerHTML = weak.length
    ? weak.map(([id]) => `<span class="weak-chip">${escapeHtml(labels[id] || id)}</span>`).join('')
    : 'Пока явных слабых мест нет.';
}

function humanAuthError(message) {
  if (message.includes('Wrong email')) return 'Неверный email или пароль.';
  if (message.includes('already registered')) return 'Аккаунт с этим email уже существует.';
  if (message.includes('valid email')) return 'Проверь адрес электронной почты.';
  if (message.includes('8')) return 'Пароль должен быть не короче 8 символов.';
  return 'Не получилось выполнить вход. Проверь данные и попробуй ещё раз.';
}

function renderAuth() {
  const name = state.user ? (state.user.display_name || state.user.email.split('@')[0]) : null;
  $('#authButton').textContent = name || 'Войти';
  $('#profileName').textContent = name || 'Гостевой режим';
  $('#progressHint').textContent = state.user
    ? `Прогресс синхронизируется с ${state.user.email}.`
    : 'Прогресс хранится в этом браузере. Войди, чтобы синхронизировать его между устройствами.';
  $('#profileAuthButton').textContent = state.user ? 'Выйти из аккаунта' : 'Войти / зарегистрироваться';
}

function openAuth() {
  $('#authError').textContent = '';
  $('#authDialog').showModal();
  setTimeout(() => $('#email').focus(),0);
}

async function accountAction() {
  if (!state.user) return openAuth();
  await api('/api/auth/logout',{method:'POST'});
  state.user = null;
  state.progress = localProgress();
  rebuildSession();
  state.courseController?.rebuild();
  renderAll();
}
$('#authButton').onclick = accountAction;
$('#profileAuthButton').onclick = accountAction;
$('#authClose').onclick = () => $('#authDialog').close();
$('#authDialog').addEventListener('click',(event) => { if (event.target === $('#authDialog')) $('#authDialog').close(); });
$('#passwordToggle').onclick = () => {
  const input = $('#password');
  const visible = input.type === 'text';
  input.type = visible ? 'password' : 'text';
  $('#passwordToggle').textContent = visible ? 'Показать' : 'Скрыть';
  $('#passwordToggle').setAttribute('aria-label',visible ? 'Показать пароль' : 'Скрыть пароль');
};
$('#authSwitch').onclick = () => {
  state.registerMode = !state.registerMode;
  $('#authTitle').textContent = state.registerMode ? 'Регистрация' : 'Вход';
  $('#authSubmit').textContent = state.registerMode ? 'Создать аккаунт' : 'Войти';
  $('#displayNameField').classList.toggle('hidden',!state.registerMode);
  $('#password').autocomplete = state.registerMode ? 'new-password' : 'current-password';
  $('#authSwitch').textContent = state.registerMode ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться';
};
$('#authForm').onsubmit = async (event) => {
  event.preventDefault();
  const submit = $('#authSubmit');
  $('#authError').textContent = '';
  submit.disabled = true;
  const original = submit.textContent;
  submit.textContent = state.registerMode ? 'Создаём…' : 'Входим…';
  try {
    const payload = {email:$('#email').value,password:$('#password').value,display_name:$('#displayName').value};
    const path = state.registerMode ? '/api/auth/register' : '/api/auth/login';
    const data = await api(path,{method:'POST',body:JSON.stringify(payload)});
    state.user = data.user;
    await mergeGuestProgress();
    await loadRemoteProgress();
    rebuildSession();
    state.courseController?.rebuild();
    renderAll();
    $('#authDialog').close();
  } catch (error) {
    $('#authError').textContent = humanAuthError(error.message);
  } finally {
    submit.disabled = false;
    submit.textContent = original;
  }
};

loadData();