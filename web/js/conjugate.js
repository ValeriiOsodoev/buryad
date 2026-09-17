export const PERSON_LABELS = [
  ['1sg', 'би'],
  ['2sg', 'ши'],
  ['3sg', 'тэрэ'],
  ['1pl', 'бидэ'],
  ['2pl', 'та'],
  ['3pl', 'тэдэ'],
];

const REGULAR_ENDINGS = {
  '1sg': 'б',
  '2sg': 'ш',
  '3sg': '',
  '1pl': 'бди',
  '2pl': 'т',
  '3pl': 'д',
};

// The resultative -аа/-ээ/-оо/-өө form is the everyday past taught in the
// beginner course. In 3pl the pronoun already carries plurality, so the
// conversational form is shown without an extra -д.
const RESULTATIVE_ENDINGS = {...REGULAR_ENDINGS, '3pl': ''};
const NEGATIVE_ENDINGS = {...REGULAR_ENDINGS, '3pl': ''};

export function simplePast(infinitive) {
  if (infinitive.endsWith('ха')) return `${infinitive.slice(0, -2)}ба`;
  if (infinitive.endsWith('хэ')) return `${infinitive.slice(0, -2)}бэ`;
  if (infinitive.endsWith('хо')) return `${infinitive.slice(0, -2)}бо`;
  return infinitive;
}

export function conjugate(verb, tense, negative, person) {
  let base;
  if (tense === 'present') base = verb.present;
  else if (tense === 'resultative') base = verb.past;
  else if (tense === 'simplePast') base = simplePast(verb.infinitive);
  else if (tense === 'future') base = verb.future;
  else throw new Error(`Unknown tense: ${tense}`);

  if (negative) {
    // Standard everyday negation of a completed action is the resultative
    // form + -гүй: ойлгоогүйб, ерээгүйш, etc.
    const negativeBase = tense === 'simplePast' ? verb.past : base;
    return `${negativeBase}гүй${NEGATIVE_ENDINGS[person] ?? ''}`;
  }

  const endings = tense === 'resultative' ? RESULTATIVE_ENDINGS : REGULAR_ENDINGS;
  return `${base}${endings[person] ?? ''}`;
}
