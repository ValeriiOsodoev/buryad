export function normalizeBuryat(value) {
  return value
    .toLowerCase()
    .trim()
    .replaceAll('h', 'һ')
    .replaceAll('ё', 'е')
    .replaceAll('ү', 'у')
    .replaceAll('ө', 'о')
    .replace(/[.,!?;:“”"'«»—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function answerMatches(value, accepted) {
  const candidate = normalizeBuryat(value);
  return accepted.some((item) => normalizeBuryat(item) === candidate);
}

export function similarity(a, b) {
  const x = normalizeBuryat(a).split(' ').filter(Boolean);
  const y = normalizeBuryat(b).split(' ').filter(Boolean);
  if (!y.length) return 0;
  const hits = y.filter((word) => x.includes(word)).length;
  return Math.round((hits / y.length) * 100);
}
