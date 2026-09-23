import {answerMatches, normalizeBuryat} from './normalize.js';

const $ = (q) => document.querySelector(q);
const esc = (v = '') => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const emptyWord = () => ({state:'unseen', seen:0, recognized:0, active:0});
function readJSON(key, fallback = {}) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
  catch { return fallback; }
}
function vocabState(id) { return readJSON(`buryad.vocab.${id}`, emptyWord()); }
function touchWord(word, event) {
  const s = vocabState(word.id);
  s.seen = Number(s.seen || 0) + 1;
  if (event === 'recognized') s.recognized = Number(s.recognized || 0) + 1;
  if (event === 'active') s.active = Number(s.active || 0) + 1;
  s.state = s.active >= 3 ? 'automatic' : s.active >= 1 ? 'active' : s.recognized >= 2 ? 'recognized' : 'seen';
  localStorage.setItem(`buryad.vocab.${word.id}`, JSON.stringify(s));
  document.dispatchEvent(new CustomEvent('buryad:vocabulary-change', {detail:{id:word.id, state:s.state}}));
}

async function initImmersion() {
  const root = $('#immersion');
  if (!root) return;
  const load = async (path) => {
    const r = await fetch(path);
    if (!r.ok) throw new Error(`Не удалось загрузить ${path}: ${r.status}`);
    return r.json();
  };
  const [data, imageManifest, audioManifest] = await Promise.all([
    load('/assets/data/immersion.json'),
    load('/assets/data/image-manifest.json').catch(() => ({assets:[]})),
    load('/assets/data/native-audio-queue.json').catch(() => ({recordingQueue:[]})),
  ]);
  if (!data.scenes?.length) throw new Error('Нет доступных сцен');
  const imageAssets = new Map((imageManifest.assets || []).map(x => [x.id, x]));
  const audioAssets = new Map((audioManifest.recordingQueue || [])
    .filter(x => x.status==='verified' && x.natural).map(x => [x.text, x]));
  const firstIncomplete = data.scenes.findIndex(s => !readJSON(`buryad.immersion.${s.id}`).completed);
  const state = {scene:Math.max(0, firstIncomplete), step:0, help:0, correct:0,
    helpUses:0, russianUses:0, startedAt:0, activated:false, answered:false};
  const sceneList = $('#immersionScenes'), title = $('#immersionTitle'), subtitle = $('#immersionSubtitle');
  const cue = $('#immersionCue'), visual = $('#immersionVisual'), image = $('#immersionImage');
  const choices = $('#immersionChoices'), answer = $('#immersionAnswer'), check = $('#immersionCheck');
  const next = $('#immersionNext'), help = $('#immersionHelp'), helpBox = $('#immersionHelpBox');
  const meta = $('#immersionMeta'), vocab = $('#immersionVocab'), feedback = $('#immersionFeedback');
  const listen = $('#immersionListen'), record = $('#immersionRecord');
  const stop = $('#immersionStop'), replay = $('#immersionReplay');
  let recorder = null, stream = null, ownUrl = null, playback = null, recordingGeneration = 0;
  const scene = () => data.scenes[state.scene];
  const step = () => scene().steps[state.step];
  function cleanupMedia() {
    recordingGeneration++;
    if (recorder?.state === 'recording') recorder.stop();
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
    playback?.pause();
    if (ownUrl) URL.revokeObjectURL(ownUrl);
    ownUrl = null;
  }
  function showMediaError() {
    feedback.className = 'immersion-feedback bad';
    feedback.textContent = 'Не получилось включить звук или микрофон. Можно продолжить без записи.';
  }
  function play(src) {
    playback?.pause();
    playback = new Audio(src);
    playback.play().catch(showMediaError);
  }
  function renderScenes() {
    const completed = new Set(data.scenes.filter(s => readJSON(`buryad.immersion.${s.id}`).completed).map(s => s.id));
    sceneList.innerHTML = `<div class="scene-picker-head"><span class="tag">Путь сцен</span><small>${completed.size} / ${data.scenes.length} пройдено</small></div><select id="immersionSceneSelect" aria-label="Выбрать бытовую сцену">${data.scenes.map((s, i) => `<option value="${i}" ${i === state.scene ? 'selected' : ''}>${completed.has(s.id) ? '✓ ' : ''}${i + 1}. ${esc(s.title)}</option>`).join('')}</select><p>Открыта следующая непройденная сцена. Здесь можно выбрать другую.</p>`;
    sceneList.querySelector('select').onchange = (e) => {
      cleanupMedia();
      Object.assign(state, {scene:Number(e.target.value), step:0, help:0, correct:0,
        helpUses:0, russianUses:0, startedAt:performance.now(), activated:true});
      render();
    };
  }
  function wordVisual(word) {
    const asset = imageAssets.get(`word-${word.id}`);
    if (!asset) return `<span class="immersion-word-emoji">${esc(word.visual)}</span>`;
    return `<img class="immersion-word-image" src="${esc(asset.path)}" alt="${esc(asset.alt || word.ru || word.bxr)}" loading="lazy">`;
  }
  function choiceVisual(item) {
    const word = scene().newWords.find(w => w.bxr === item.label);
    if (!word) return `<span class="immersion-choice-emoji">${esc(item.v)}</span>`;
    const asset = imageAssets.get(`word-${word.id}`);
    if (!asset) return `<span class="immersion-choice-emoji">${esc(item.v)}</span>`;
    return `<img class="immersion-choice-image" src="${esc(asset.path)}" alt="" loading="lazy">`;
  }
  function renderVocab() {
    vocab.innerHTML = scene().newWords.map(w => {
      const labels = {unseen:'новое', seen:'видел', recognized:'узнаю', active:'говорю', automatic:'автоматически'};
      return `<div class="immersion-word">${wordVisual(w)}<div><strong>${esc(w.bxr)}</strong><small>${labels[vocabState(w.id).state] || 'новое'}</small></div></div>`;
    }).join('');
  }
  function render() {
    cleanupMedia();
    const s = scene(), st = step();
    state.answered = false;
    state.help = 0;
    title.textContent = s.title;
    subtitle.textContent = s.subtitle;
    meta.textContent = `${state.step + 1} / ${s.steps.length}`;
    cue.textContent = st.cue;
    visual.textContent = st.visual || '';
    feedback.className = 'immersion-feedback hidden';
    feedback.textContent = '';
    answer.disabled = false;
    answer.value = '';
    answer.classList.add('hidden');
    check.classList.add('hidden');
    next.classList.add('hidden');
    next.textContent = 'Дальше →';
    help.classList.remove('hidden');
    help.textContent = 'Нужна опора';
    helpBox.classList.add('hidden');
    helpBox.textContent = '';
    choices.innerHTML = '';
    const cover = imageAssets.get(`scene-${s.id}`);
    if (image) {
      image.classList.add('hidden');
      image.removeAttribute('src');
      image.onload = () => image.classList.remove('hidden');
      image.onerror = () => image.classList.add('hidden');
      if (cover) { image.alt = cover.alt || s.title; image.src = cover.path; }
    }
    const audio = audioAssets.get(st.cue);
    listen?.classList.toggle('hidden', !audio);
    if (listen) listen.onclick = () => audio && play(audio.natural);
    record?.classList.toggle('hidden', !audio);
    stop?.classList.add('hidden');
    replay?.classList.add('hidden');
    if (record && stop && replay) {
      record.onclick = async () => {
        const generation = recordingGeneration;
        try {
          const acquired = await navigator.mediaDevices.getUserMedia({audio:true});
          if (generation !== recordingGeneration) { acquired.getTracks().forEach(t => t.stop()); return; }
          stream = acquired;
          const chunks = [];
          recorder = new MediaRecorder(stream);
          recorder.ondataavailable = e => chunks.push(e.data);
          recorder.onstop = () => {
            acquired.getTracks().forEach(t => t.stop());
            if (generation !== recordingGeneration) return;
            if (ownUrl) URL.revokeObjectURL(ownUrl);
            ownUrl = URL.createObjectURL(new Blob(chunks, {type:recorder.mimeType || 'audio/webm'}));
            replay.classList.remove('hidden'); stop.classList.add('hidden'); record.classList.remove('hidden');
          };
          recorder.start(); record.classList.add('hidden'); stop.classList.remove('hidden');
        } catch { cleanupMedia(); showMediaError(); }
      };
      stop.onclick = () => { if (recorder?.state === 'recording') recorder.stop(); };
      replay.onclick = () => ownUrl && play(ownUrl);
    }
    s.newWords.forEach(w => { if (st.cue.toLowerCase().includes(w.bxr.toLowerCase())) touchWord(w, 'seen'); });
    if (st.type === 'choose') {
      choices.innerHTML = (st.visuals || []).map((x, i) => `<button type="button" class="immersion-choice" data-choice="${i}">${choiceVisual(x)}<small>${esc(x.label || '')}</small></button>`).join('');
      choices.querySelectorAll('[data-choice]').forEach(button => { button.onclick = () => {
        if (state.answered) return;
        const item = st.visuals[Number(button.dataset.choice)];
        button.classList.add(item.correct ? 'correct' : 'wrong');
        if (item.correct) {
          state.answered = true;
          choices.querySelectorAll('button').forEach(b => { b.disabled = true; });
          s.newWords.filter(w => w.bxr === item.label).forEach(w => touchWord(w, 'recognized'));
          next.classList.remove('hidden'); renderVocab();
        }
      }; });
    } else if (st.type === 'respond') {
      answer.classList.remove('hidden'); check.classList.remove('hidden');
    } else {
      next.textContent = st.type === 'finish' ? 'Закончить сцену' : st.type === 'act' ? 'Сделал →' : 'Дальше →';
      next.classList.remove('hidden');
    }
    renderScenes(); renderVocab();
  }
  help.onclick = () => {
    const hints = step().help || [];
    if (!hints.length) return;
    helpBox.classList.remove('hidden');
    if (state.help === 0) {
      state.helpUses++; state.help = 1;
      helpBox.textContent = hints[0] || 'Посмотри на ситуацию ещё раз.';
      help.textContent = 'Показать по-русски';
    } else if (state.help === 1) {
      state.russianUses++; state.help = 2;
      helpBox.textContent = hints[1] || hints[0] || '';
      help.textContent = 'Перевод показан';
    }
  };
  check.onclick = () => {
    if (state.answered) return;
    const value = answer.value.trim();
    if (!value) return;
    const ok = answerMatches(value, step().answers || []);
    feedback.className = `immersion-feedback ${ok ? 'ok' : 'bad'}`;
    feedback.textContent = ok ? 'Һайн. Скажи ещё раз вслух.' : `Ещё раз. ${step().answers?.[0] || ''}`;
    if (ok) {
      state.answered = true; state.correct++;
      const tokens = normalizeBuryat(value).split(' ');
      scene().newWords.filter(w => tokens.includes(normalizeBuryat(w.bxr))).forEach(w => touchWord(w, 'active'));
      next.classList.remove('hidden'); check.classList.add('hidden'); answer.disabled = true;
    }
    renderVocab();
  };
  next.onclick = () => {
    if (state.step < scene().steps.length - 1) { state.step++; render(); return; }
    cleanupMedia();
    const elapsedSeconds = Math.round((performance.now() - state.startedAt) / 1000);
    localStorage.setItem(`buryad.immersion.${scene().id}`, JSON.stringify({completed:true,
      score:state.correct, helpUses:state.helpUses, russianUses:state.russianUses,
      noRussian:state.russianUses === 0, elapsedSeconds, updatedAt:new Date().toISOString()}));
    document.dispatchEvent(new CustomEvent('buryad:daily-complete', {detail:{stage:'live'}}));
    cue.textContent = 'Сцена завершена.'; visual.textContent = '🌄'; choices.innerHTML = '';
    answer.classList.add('hidden'); check.classList.add('hidden'); next.classList.add('hidden');
    help.classList.add('hidden'); feedback.classList.add('hidden'); helpBox.classList.remove('hidden');
    helpBox.textContent = 'Продолжи день: верни слова из этой сцены.';
    const link = document.createElement('a');
    link.href = '#daily'; link.className = 'primary'; link.textContent = 'Продолжить день →';
    helpBox.append(document.createElement('br'), link);
    renderScenes();
  };
  const activate = () => {
    if (location.hash !== '#immersion') { cleanupMedia(); return; }
    if (state.activated) return;
    state.activated = true; state.startedAt = performance.now(); render();
  };
  window.addEventListener('hashchange', activate);
  window.addEventListener('pagehide', cleanupMedia);
  renderScenes();
  activate();
}
initImmersion().catch(error => {
  console.error(error);
  const cue = $('#immersionCue');
  if (cue) cue.textContent = 'Не удалось загрузить сцену. Обнови страницу, чтобы повторить.';
});
