export function buildSession(lessons, progress = {}, nowMs = Date.now(), limit = 10) {
  const exercises = lessons.flatMap((lesson) => lesson.exercises.map((exercise) => ({...exercise, lessonTitle: lesson.title, lessonId: lesson.id})));
  const weak = [];
  const due = [];
  const fresh = [];
  const later = [];

  for (const exercise of exercises) {
    const item = progress[exercise.id];
    if (!item || !item.attempts) {
      fresh.push(exercise);
      continue;
    }
    const accuracy = Number(item.correct || 0) / Math.max(1, Number(item.attempts || 0));
    if (accuracy < 0.6 || Number(item.streak || 0) === 0) {
      weak.push(exercise);
    } else if (Number(item.next_review_at || 0) <= nowMs) {
      due.push(exercise);
    } else {
      later.push(exercise);
    }
  }

  return [...weak, ...due, ...fresh, ...later].slice(0, limit);
}
