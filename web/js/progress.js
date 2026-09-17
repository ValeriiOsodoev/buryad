const REVIEW_DELAYS = [10 * 60_000, 24 * 60 * 60_000, 3 * 24 * 60 * 60_000, 7 * 24 * 60 * 60_000, 21 * 24 * 60 * 60_000, 45 * 24 * 60 * 60_000];

export function nextReview(current = {}, correct, nowMs = Date.now()) {
  const previousStep = Number(current.review_step ?? -1);
  const reviewStep = correct ? Math.min(previousStep + 1, REVIEW_DELAYS.length - 1) : 0;
  const streak = correct ? Number(current.streak || 0) + 1 : 0;
  return {
    ...current,
    review_step: reviewStep,
    next_review_at: nowMs + REVIEW_DELAYS[reviewStep],
    streak,
    status: reviewStep >= 4 ? 'mastered' : 'learning',
  };
}

export function mergeProgress(local = {}, remote = {}) {
  const out = {...remote};
  for (const [id, localItem] of Object.entries(local)) {
    const remoteItem = remote[id];
    if (!remoteItem) {
      out[id] = {...localItem};
      continue;
    }
    const localTime = Date.parse(localItem.updated_at || 0) || 0;
    const remoteTime = Date.parse(remoteItem.updated_at || 0) || 0;
    const newest = localTime > remoteTime ? localItem : remoteItem;
    out[id] = {
      ...remoteItem,
      ...newest,
      attempts: Math.max(Number(localItem.attempts || 0), Number(remoteItem.attempts || 0)),
      correct: Math.max(Number(localItem.correct || 0), Number(remoteItem.correct || 0)),
      streak: Math.max(Number(localItem.streak || 0), Number(remoteItem.streak || 0)),
      review_step: Math.max(Number(localItem.review_step ?? -1), Number(remoteItem.review_step ?? -1)),
      next_review_at: Math.min(
        Number(localItem.next_review_at || Number.MAX_SAFE_INTEGER),
        Number(remoteItem.next_review_at || Number.MAX_SAFE_INTEGER),
      ),
    };
  }
  return out;
}

export {REVIEW_DELAYS};
