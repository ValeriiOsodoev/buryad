import {answerMatches, similarity} from './normalize.js';
import {buildCourseSession, moduleProgress, nextHint} from './course.js';

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function russianMatches(answer, expected) {
  const clean = (value) => String(value || '')
    .toLowerCase()
    .replace(/[.,!?;:«»"'()—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const a = clean(answer);
  const b = clean(expected);
  return a === b || similarity(a, b) >= 72;
}

export function createCourseController({course, getProgress, record}) {
  const $ = (q) => document.querySelector(q);
  const progress = () => getProgress?.() || {};
  const state = {
    moduleId: null,
    session: [],
    index: 0,
    answered: false,
    hintLevel: 0,
  };

  function recommendedModule() {
    return course.find((module) => moduleProgress(module, progress()).percent < 100) || course[0];
  }

  function currentModule() {
    return course.find((module) => module.id === state.moduleId) || recommendedModule();
  }

  function rebuild(moduleId = state.moduleId) {
    const module = course.find((item) => item.id === moduleId) || recommendedModule();
    state.moduleId = module.id;
    state.session = buildCourseSession(course, progress(), Date.now(), 10, module.id);
    state.index = 0;
    state.answered = false;
    state.hintLevel = 0;
    render();
  }

  function currentTask() {
    return state.session[state.index];
  }

  function renderModules() {
    const active = currentModule();
    $('#courseModuleList').innerHTML = course.map((module, index) => {
      const p = moduleProgress(module, progress());
      return `<button type="button" class="course-module-button ${module.id === active.id ? 'active' : ''}" data-course-module="${esc(module.id)}">
        <span class="course-module-number">${String(index + 1).padStart(2, '0')}</span>
        <span class="course-module-copy"><strong>${esc(module.title)}</strong><small>${p.learned}/${p.total} · ${p.percent}%</small></span>
        <span class="course-module-meter" aria-hidden="true"><i style="width:${p.percent}%"></i></span>
      </button>`;
    }).join('');
    document.querySelectorAll('[data-course-module]').forEach((button) => {
      button.onclick = () => rebuild(button.dataset.courseModule);
    });

    $('#courseModuleSelect').innerHTML = course.map((module, index) => {
      const p = moduleProgress(module, progress());
      return `<option value="${esc(module.id)}" ${module.id === active.id ? 'selected' : ''}>${index + 1}. ${esc(module.title)} · ${p.percent}%</option>`;
    }).join('');
    $('#courseModuleSelect').value = active.id;
    $('#courseModuleMeta').textContent = active.description;
  }

  function resetTaskUI() {
    $('#courseAnswer').value = '';
    $('#courseAnswer').disabled = false;
    $('#courseFeedback').className = 'course-feedback hidden';
    $('#courseFeedback').innerHTML = '';
    $('#courseHint').className = 'course-hint hidden';
    $('#courseHint').textContent = '';
    $('#courseCheck').classList.remove('hidden');
    $('#courseHelp').classList.remove('hidden');
    $('#courseHelp').textContent = 'Подсказка';
    $('#courseContinue').classList.add('hidden');
    state.answered = false;
    state.hintLevel = 0;
  }

  function renderTask() {
    const task = currentTask();
    const module = currentModule();
    $('#courseSessionMessage').textContent = '';
    if (!task) {
      $('#coursePrompt').textContent = 'Модуль пройден на сегодня.';
      $('#coursePromptBxr').classList.add('hidden');
      $('#courseNewWords').innerHTML = '';
      $('#courseAnswer').classList.add('hidden');
      $('#courseCheck').classList.add('hidden');
      $('#courseHelp').classList.add('hidden');
      $('#courseContinue').classList.remove('hidden');
      $('#courseContinue').textContent = 'Собрать новую сессию →';
      return;
    }
    $('#courseAnswer').classList.remove('hidden');
    $('#courseContinue').textContent = 'Дальше →';
    $('#courseMode').textContent = task.promptLabel;
    $('#coursePrompt').textContent = task.prompt;
    if (task.mode === 'dialogue' && task.promptBxr) {
      $('#coursePromptBxr').textContent = task.promptBxr;
      $('#coursePromptBxr').classList.remove('hidden');
    } else {
      $('#coursePromptBxr').classList.add('hidden');
      $('#coursePromptBxr').textContent = '';
    }
    $('#courseAnswerLabel').textContent = task.answerLanguage === 'ru' ? 'Что это значит по-русски?' : 'Ответ по-бурятски';
    $('#courseAnswer').placeholder = task.answerLanguage === 'ru' ? 'Напиши смысл по-русски' : 'Напиши так, как сказал бы вслух';
    $('#courseNewWords').innerHTML = (task.new || []).map(([bxr, ru]) => `<span class="word-chip"><b>${esc(bxr)}</b> — ${esc(ru)}</span>`).join('');
    $('#courseNote').textContent = task.note || '';
    $('#courseNote').classList.toggle('hidden', !task.note);
    const total = Math.max(1, state.session.length);
    $('#courseCounter').textContent = `${state.index + 1} / ${total}`;
    $('#courseProgressBar').style.width = `${Math.round(((state.index + 1) / total) * 100)}%`;
    $('#courseModuleTitle').textContent = module.title;
    resetTaskUI();
  }

  function showFeedback(correct, task, revealed = false) {
    state.answered = true;
    $('#courseAnswer').disabled = true;
    const feedback = $('#courseFeedback');
    feedback.className = `course-feedback ${correct ? 'ok' : 'bad'}`;
    const answer = task.answers[0];
    feedback.innerHTML = `<strong>${correct ? 'Получилось.' : revealed ? 'Ответ открыт.' : 'Сверься с рабочим вариантом.'}</strong>
      <div class="course-answer-reveal">${esc(answer)}</div>
      <p>${correct ? 'Скажи фразу вслух один раз — это важная часть упражнения.' : 'Проговори правильный вариант два раза. Фраза вернётся раньше.'}</p>`;
    $('#courseCheck').classList.add('hidden');
    $('#courseHelp').classList.add('hidden');
    $('#courseContinue').classList.remove('hidden');
    $('#courseContinue').focus();
  }

  async function check() {
    const task = currentTask();
    if (!task || state.answered) return next();
    const answer = $('#courseAnswer').value.trim();
    if (!answer) {
      $('#courseFeedback').className = 'course-feedback bad';
      $('#courseFeedback').textContent = 'Сначала напиши ответ или используй подсказку.';
      return;
    }
    const correct = task.answerLanguage === 'bxr'
      ? answerMatches(answer, task.answers)
      : russianMatches(answer, task.answers[0]);
    await record(task, correct, answer);
    showFeedback(correct, task);
    renderModules();
    renderOverview();
  }

  async function help() {
    const task = currentTask();
    if (!task || state.answered) return;
    if (task.mode === 'meaning' && state.hintLevel >= 1) {
      state.hintLevel = 2;
      $('#courseHint').className = 'course-hint revealed';
      $('#courseHint').textContent = task.answers[0];
      await record(task, false, '');
      showFeedback(false, task, true);
      renderModules();
      renderOverview();
      return;
    }
    const hint = task.mode === 'meaning' && state.hintLevel === 0
      ? {level: 1, text: (task.new || []).map(([, ru]) => ru).filter(Boolean).join(' · ') || 'Вспомни общий смысл фразы.', revealed: false}
      : nextHint(task, state.hintLevel);
    state.hintLevel = hint.level;
    $('#courseHint').className = `course-hint ${hint.revealed ? 'revealed' : ''}`;
    $('#courseHint').textContent = hint.text;
    $('#courseHelp').textContent = hint.revealed ? 'Ответ показан' : state.hintLevel === 1 ? 'Ещё подсказка' : 'Показать ответ';
    if (hint.revealed) {
      await record(task, false, '');
      showFeedback(false, task, true);
      renderModules();
      renderOverview();
    }
  }

  function next() {
    if (!currentTask()) return rebuild(state.moduleId);
    state.index += 1;
    state.answered = false;
    state.hintLevel = 0;
    if (state.index >= state.session.length) {
      rebuild(state.moduleId);
      $('#courseSessionMessage').textContent = 'Сессия завершена — собрана следующая порция повторов.';
      return;
    }
    renderTask();
    $('#courseAnswer').focus();
  }

  function renderOverview() {
    const learned = course.reduce((sum, module) => sum + moduleProgress(module, progress()).learned, 0);
    const total = course.reduce((sum, module) => sum + module.phrases.length, 0);
    $('#courseOverall').textContent = `${learned} из ${total} фраз закреплено`;
  }

  function render() {
    renderModules();
    renderOverview();
    renderTask();
  }

  $('#courseModuleSelect').addEventListener('change', (event) => rebuild(event.target.value));
  $('#courseCheck').onclick = check;
  $('#courseHelp').onclick = help;
  $('#courseContinue').onclick = next;
  $('#courseAnswer').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      state.answered ? next() : check();
    }
  });
  $('#courseRecommended').onclick = () => rebuild(recommendedModule().id);

  rebuild(recommendedModule().id);

  return {
    renderProgress() {
      renderModules();
      renderOverview();
    },
    rebuild,
  };
}
