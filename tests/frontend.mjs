import assert from 'node:assert/strict';
import {conjugate, simplePast} from '../web/js/conjugate.js';
import {answerMatches, normalizeBuryat, similarity} from '../web/js/normalize.js';

assert.equal(normalizeBuryat(' МҮНӨӨ! '), 'муноо');
assert.equal(normalizeBuryat('hайн'), 'һайн');
assert.equal(answerMatches('муноо эдеэлхэб', ['Мүнөө эдеэлхэб']), true);
assert.equal(answerMatches('би ойлгоноб', ['Би ойлгооб']), false);
assert.equal(similarity('ши хаанаш', 'Ши хаанаш'), 100);

assert.equal(simplePast('ябаха'), 'ябаба');
assert.equal(simplePast('ерэхэ'), 'ерэбэ');
assert.equal(simplePast('болохо'), 'болобо');
const understand = {
  infinitive: 'ойлгохо',
  present: 'ойлгоно',
  past: 'ойлгоо',
  future: 'ойлгохо',
};
assert.equal(conjugate(understand, 'present', false, '1sg'), 'ойлгоноб');
assert.equal(conjugate(understand, 'present', false, '3pl'), 'ойлгонод');
assert.equal(conjugate(understand, 'resultative', false, '2sg'), 'ойлгоош');
assert.equal(conjugate(understand, 'resultative', false, '3pl'), 'ойлгоо');
assert.equal(conjugate(understand, 'simplePast', false, '1sg'), 'ойлгобоб');
assert.equal(conjugate(understand, 'future', false, '1pl'), 'ойлгохобди');
assert.equal(conjugate(understand, 'future', true, '1sg'), 'ойлгохогүйб');
assert.equal(conjugate(understand, 'simplePast', true, '2sg'), 'ойлгоогүйш');

console.log('frontend normalization and conjugation tests: ok');
