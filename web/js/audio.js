export function selectBuryatVoice(voices = []) {
  return voices.find((voice) => String(voice?.lang || '').toLowerCase().startsWith('bxr')) || null;
}

export function hasVerifiedAudio(audioMap = {}, phraseId) {
  const entry = audioMap?.[phraseId];
  return Boolean(entry?.verified && typeof entry?.src === 'string' && entry.src.trim());
}

export function makeAudioTask(phrase, mode = 'dictation', audioEntry = null) {
  if (!phrase || !audioEntry?.verified || !audioEntry?.src) return null;
  if (mode === 'dictation') {
    return {
      id: `course:${phrase.id}:dictation`,
      phrase,
      mode,
      audio: audioEntry,
      prompt: 'Послушай и напиши дословно по-бурятски.',
      promptLabel: 'Диктант на слух',
      answers: [phrase.bxr, ...(phrase.alternatives || [])],
      answerLanguage: 'bxr',
      new: [],
      hint: phrase.hint || '',
      skeleton: phrase.skeleton || '',
      note: phrase.note || '',
    };
  }
  if (mode === 'audio-response' && phrase.dialogue) {
    return {
      id: `course:${phrase.id}:audio-response`,
      phrase,
      mode,
      audio: audioEntry,
      prompt: phrase.dialogue.promptRu || 'Ответь на услышанную реплику.',
      promptBxr: phrase.dialogue.promptBxr || '',
      promptLabel: 'Ответь на слух',
      answers: [phrase.bxr, ...(phrase.alternatives || [])],
      answerLanguage: 'bxr',
      new: [],
      hint: phrase.hint || '',
      skeleton: phrase.skeleton || '',
      note: phrase.note || '',
    };
  }
  return null;
}

export function audioTaskCandidates(phrase, progress = {}, audioMap = {}) {
  const entry = audioMap?.[phrase?.id];
  if (!hasVerifiedAudio(audioMap, phrase?.id)) return [];
  const recall = progress[`course:${phrase.id}:recall`] || {};
  if (!Number(recall.attempts || 0)) return [];
  const tasks = [makeAudioTask(phrase, 'dictation', entry)].filter(Boolean);
  if (phrase.dialogue) tasks.push(makeAudioTask(phrase, 'audio-response', entry));
  return tasks.filter(Boolean);
}
