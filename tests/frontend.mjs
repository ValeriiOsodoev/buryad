import assert from 'node:assert/strict';
import {conjugate, simplePast} from '../web/js/conjugate.js';
import {answerMatches, normalizeBuryat, similarity} from '../web/js/normalize.js';
import {mergeProgress, nextReview} from '../web/js/progress.js';
import {buildSession} from '../web/js/session.js';
import {
  buildCourseSession,
  flattenCourse,
  makeTask,
  moduleProgress,
  nextHint,
  phraseProgress,
  taskId,
} from '../web/js/course.js';

assert.equal(normalizeBuryat(' МҮНӨӨ! '), 'муноо');
assert.equal(normalizeBuryat('hайн'), 'һайн');
assert.equal(answerMatches('муноо эдеэлхэб', ['Мүнөө эдеэлхэб']), true);
assert.equal(answerMatches('би ойлгоноб', ['Би ойлгооб']), false);
assert.equal(similarity('ши хаанаш', 'Ши хаанаш'), 100);

assert.equal(simplePast('ябаха'), 'ябаба');
assert.equal(simplePast('ерэхэ'), 'ерэбэ');
assert.equal(simplePast('болохо'), 'болобо');
const understand = {infinitive:'ойлгохо',present:'ойлгоно',past:'ойлгоо',future:'ойлгохо'};
assert.equal(conjugate(understand, 'present', false, '1sg'), 'ойлгоноб');
assert.equal(conjugate(understand, 'present', false, '3pl'), 'ойлгонод');
assert.equal(conjugate(understand, 'resultative', false, '2sg'), 'ойлгоош');
assert.equal(conjugate(understand, 'resultative', false, '3pl'), 'ойлгоо');
assert.equal(conjugate(understand, 'simplePast', false, '1sg'), 'ойлгобоб');
assert.equal(conjugate(understand, 'future', false, '1pl'), 'ойлгохобди');
assert.equal(conjugate(understand, 'future', true, '1sg'), 'ойлгохогүйб');
assert.equal(conjugate(understand, 'simplePast', true, '2sg'), 'ойлгоогүйш');

const NOW = 1_700_000_000_000;
let review = nextReview({}, true, NOW);
assert.equal(review.review_step, 0);
assert.equal(review.next_review_at, NOW + 10 * 60_000);
review = nextReview(review, true, NOW);
assert.equal(review.review_step, 1);
assert.equal(review.next_review_at, NOW + 24 * 60 * 60_000);
review = nextReview(review, false, NOW);
assert.equal(review.review_step, 0);
assert.equal(review.next_review_at, NOW + 10 * 60_000);

const merged = mergeProgress(
  {x:{attempts:3,correct:2,streak:2,status:'learning',last_answer:'A',updated_at:'2026-09-17T10:00:00Z'}},
  {x:{attempts:2,correct:2,streak:1,status:'learning',last_answer:'B',updated_at:'2026-09-17T11:00:00Z'},y:{attempts:1,correct:1,streak:1}},
);
assert.equal(merged.x.attempts, 3);
assert.equal(merged.x.correct, 2);
assert.equal(merged.x.last_answer, 'B');
assert.equal(merged.y.attempts, 1);

const lessons = [{id:'a',title:'A',exercises:[{id:'new',ru:'new'},{id:'due',ru:'due'},{id:'weak',ru:'weak'}]}];
const session = buildSession(lessons, {
  due:{attempts:2,correct:2,next_review_at:NOW-1,streak:2},
  weak:{attempts:4,correct:1,next_review_at:NOW+999999,streak:0},
}, NOW, 3);
assert.equal(session.length, 3);
assert.equal(session[0].id, 'weak');
assert.equal(session[1].id, 'due');
assert.equal(session[2].id, 'new');

const sampleCourse = [{
  id:'intro',title:'Знакомство',description:'',phrases:[
    {id:'p1',ru:'Да.',bxr:'Тиимэ.',alternatives:[],new:[['тиимэ','да']],hint:'тиимэ',skeleton:'Т____.',dialogue:{promptRu:'Ты согласен.'}},
    {id:'p2',ru:'Я дома.',bxr:'Би гэртээ.',alternatives:[],new:[],hint:'гэртээ',skeleton:'Би ____.',dialogue:{promptRu:'Где ты?'}},
    {id:'p3',ru:'Спасибо.',bxr:'Баярлаа.',alternatives:[],new:[],hint:'баярлаа',skeleton:'____.'},
  ],
}];
const flat = flattenCourse(sampleCourse);
assert.equal(flat.length, 3);
assert.equal(flat[0].moduleId, 'intro');
assert.equal(taskId('p1','recall'), 'course:p1:recall');
const recallTask = makeTask(flat[0], 'recall');
assert.equal(recallTask.id, 'course:p1:recall');
assert.equal(recallTask.prompt, 'Да.');
assert.deepEqual(recallTask.answers, ['Тиимэ.']);
const meaningTask = makeTask(flat[0], 'meaning');
assert.equal(meaningTask.prompt, 'Тиимэ.');
assert.deepEqual(meaningTask.answers, ['Да.']);
assert.equal(nextHint(recallTask, 0).text, 'тиимэ');
assert.equal(nextHint(recallTask, 1).text, 'Т____.');
assert.equal(nextHint(recallTask, 2).revealed, true);
assert.equal(nextHint(recallTask, 2).text, 'Тиимэ.');

const courseProgress = {
  'course:p1:recall': {attempts:4,correct:1,streak:0,next_review_at:NOW+999999,status:'learning'},
  'course:p2:recall': {attempts:2,correct:2,streak:2,next_review_at:NOW-1,status:'learning'},
};
const courseSession = buildCourseSession(sampleCourse, courseProgress, NOW, 4);
assert.equal(courseSession[0].phrase.id, 'p1');
assert.equal(courseSession[1].phrase.id, 'p2');
assert.equal(courseSession[2].phrase.id, 'p3');
assert.equal(courseSession.length, 4);

const pp = phraseProgress(flat[0], {
  'course:p1:recall': {attempts:5,status:'mastered'},
  'course:p1:dialogue': {attempts:1,status:'learning'},
});
assert.equal(pp.mastered, true);
assert.equal(pp.contextAttempted, true);
const mp = moduleProgress(sampleCourse[0], {
  'course:p1:recall': {attempts:5,status:'mastered'},
  'course:p1:dialogue': {attempts:1,status:'learning'},
});
assert.equal(mp.total, 3);
assert.equal(mp.learned, 1);
assert.equal(mp.percent, 33);

console.log('frontend learning and course tests: ok');
