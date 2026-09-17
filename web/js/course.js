import {audioTaskCandidates} from './audio.js';

const MODES = ['recall', 'meaning', 'dialogue'];

export function taskId(phraseId, mode) {
  return `course:${phraseId}:${mode}`;
}

export function flattenCourse(course = []) {
  return course.flatMap((module, moduleIndex) =>
    (module.phrases || []).map((phrase, phraseIndex) => ({
      ...phrase,
      moduleId: module.id,
      moduleTitle: module.title,
      moduleDescription: module.description,
      moduleIndex,
      phraseIndex,
    })),
  );
}

export function makeTask(phrase, mode = 'recall') {
  if (!MODES.includes(mode)) throw new Error(`Unknown course mode: ${mode}`);
  const common = {
    id: taskId(phrase.id, mode),
    phrase,
    mode,
    moduleId: phrase.moduleId,
    moduleTitle: phrase.moduleTitle,
    new: phrase.new || [],
    hint: phrase.hint || '',
    skeleton: phrase.skeleton || '',
    note: phrase.note || '',
  };
  if (mode === 'meaning') {
    return {
      ...common,
      prompt: phrase.bxr,
      promptLabel: 'Пойми фразу',
      answers: [phrase.ru],
      answerLanguage: 'ru',
    };
  }
  if (mode === 'dialogue') {
    return {
      ...common,
      prompt: phrase.dialogue?.promptRu || phrase.ru,
      promptBxr: phrase.dialogue?.promptBxr || '',
      promptLabel: 'Ответь в диалоге',
      answers: [phrase.bxr, ...(phrase.alternatives || [])],
      answerLanguage: 'bxr',
    };
  }
  return {
    ...common,
    prompt: phrase.ru,
    promptLabel: 'Скажи по-бурятски',
    answers: [phrase.bxr, ...(phrase.alternatives || [])],
    answerLanguage: 'bxr',
  };
}

export function nextHint(task, level = 0) {
  if (level <= 0) return {level: 1, text: task.hint || task.phrase?.hint || '', revealed: false};
  if (level === 1) return {level: 2, text: task.skeleton || task.phrase?.skeleton || '', revealed: false};
  return {level: 3, text: task.answers?.[0] || task.phrase?.bxr || '', revealed: true};
}

function attempts(item) {
  return Number(item?.attempts || 0);
}

function accuracy(item) {
  const count = attempts(item);
  return count ? Number(item?.correct || 0) / count : 1;
}

function recallProgress(progress, phraseId) {
  return progress[taskId(phraseId, 'recall')] || {};
}

function priorityBucket(phrase, progress, nowMs) {
  const item = recallProgress(progress, phrase.id);
  const count = attempts(item);
  if (count >= 2 && (accuracy(item) < 0.7 || Number(item.streak || 0) === 0)) return 0;
  if (count > 0 && Number(item.next_review_at || Number.MAX_SAFE_INTEGER) <= nowMs) return 1;
  if (count === 0) return 2;
  return 3;
}

function mixTasks(recall, supplemental, limit) {
  const max = Math.max(1, limit);
  if (!supplemental.length || max === 1) return recall.slice(0, max);

  const supplementalSlots = Math.min(
    supplemental.length,
    Math.max(1, Math.floor(max * 0.3)),
  );
  const recallSlots = Math.max(1, max - supplementalSlots);
  const recallPart = recall.slice(0, recallSlots);
  const supplementalPart = supplemental.slice(0, supplementalSlots);
  const out = [];
  let recallIndex = 0;
  let supplementalIndex = 0;

  while (out.length < max && (recallIndex < recallPart.length || supplementalIndex < supplementalPart.length)) {
    for (let i = 0; i < 2 && recallIndex < recallPart.length && out.length < max; i += 1) {
      out.push(recallPart[recallIndex]);
      recallIndex += 1;
    }
    if (supplementalIndex < supplementalPart.length && out.length < max) {
      out.push(supplementalPart[supplementalIndex]);
      supplementalIndex += 1;
    }
  }
  return out;
}

export function buildCourseSession(
  course,
  progress = {},
  nowMs = Date.now(),
  limit = 10,
  moduleId = null,
  audioMap = {},
) {
  const phrases = flattenCourse(course).filter((phrase) => !moduleId || phrase.moduleId === moduleId);
  const recall = phrases
    .map((phrase, order) => ({phrase, order, bucket: priorityBucket(phrase, progress, nowMs)}))
    .sort((a, b) => a.bucket - b.bucket || a.order - b.order)
    .map(({phrase}) => makeTask(phrase, 'recall'));

  const supplemental = [];
  for (const phrase of phrases) {
    const recallItem = recallProgress(progress, phrase.id);
    if (!attempts(recallItem)) continue;
    const meaningId = taskId(phrase.id, 'meaning');
    if (!attempts(progress[meaningId])) supplemental.push(makeTask(phrase, 'meaning'));
    if (phrase.dialogue) {
      const dialogueId = taskId(phrase.id, 'dialogue');
      const dialogueItem = progress[dialogueId];
      const due = Number(dialogueItem?.next_review_at || 0) <= nowMs;
      if (!attempts(dialogueItem) || due) supplemental.push(makeTask(phrase, 'dialogue'));
    }
    for (const audioTask of audioTaskCandidates(phrase, progress, audioMap)) {
      const audioProgress = progress[audioTask.id];
      const due = Number(audioProgress?.next_review_at || 0) <= nowMs;
      if (!attempts(audioProgress) || due) supplemental.push(audioTask);
    }
  }

  return mixTasks(recall, supplemental, limit);
}

export function phraseProgress(phrase, progress = {}) {
  const recall = progress[taskId(phrase.id, 'recall')] || {};
  const meaning = progress[taskId(phrase.id, 'meaning')] || {};
  const dialogue = progress[taskId(phrase.id, 'dialogue')] || {};
  const dictation = progress[taskId(phrase.id, 'dictation')] || {};
  const audioResponse = progress[taskId(phrase.id, 'audio-response')] || {};
  return {
    attempted:
      attempts(recall) > 0 ||
      attempts(meaning) > 0 ||
      attempts(dialogue) > 0 ||
      attempts(dictation) > 0 ||
      attempts(audioResponse) > 0,
    mastered: recall.status === 'mastered' || Number(recall.review_step ?? -1) >= 4,
    contextAttempted: attempts(dialogue) > 0 || attempts(audioResponse) > 0,
    recallAttempts: attempts(recall),
    meaningAttempts: attempts(meaning),
    dialogueAttempts: attempts(dialogue),
    dictationAttempts: attempts(dictation),
    audioResponseAttempts: attempts(audioResponse),
  };
}

export function moduleProgress(module, progress = {}) {
  const total = (module.phrases || []).length;
  const learned = (module.phrases || []).filter((phrase) => {
    const item = phraseProgress(phrase, progress);
    return item.mastered && item.contextAttempted;
  }).length;
  return {
    learned,
    total,
    percent: total ? Math.round((learned / total) * 100) : 0,
  };
}
