import assert from 'node:assert/strict';
import {answerMatches, normalizeBuryat, similarity} from '../web/js/normalize.js';

assert.equal(normalizeBuryat(' МҮНӨӨ! '), 'муноо');
assert.equal(normalizeBuryat('hайн'), 'һайн');
assert.equal(answerMatches('муноо эдеэлхэб', ['Мүнөө эдеэлхэб']), true);
assert.equal(answerMatches('би ойлгоноб', ['Би ойлгооб']), false);
assert.equal(similarity('ши хаанаш', 'Ши хаанаш'), 100);
console.log('frontend normalization tests: ok');
