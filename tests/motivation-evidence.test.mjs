import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOLLAND_QUESTIONS, MOTIVATORS, MOTIVATION_QUESTIONS } from '../data/assessments.ts';
import { scoreMotivation, rankScores, summarizeMotivationChoices } from '../services/assessments.ts';
import { profileSections, courseFingerprint } from '../services/profile.ts';
import { completedState } from './fixtures.mjs';

test('each interest theme has equal opportunities; motivation key does not', () => {
  const weights = HOLLAND_QUESTIONS.reduce((acc, { type }) => ({...acc, [type]: (acc[type] || 0) + 2}), {});
  assert.deepEqual(weights, {R:4,I:4,S:4,E:4,A:4,C:4});
  const maxima = Object.fromEntries(Object.keys(MOTIVATORS).map(key => [
    key, MOTIVATION_QUESTIONS.reduce((sum,q) => sum + Math.max(...q.options.map(o=>o.scores[key] || 0)),0),
  ]));
  assert.deepEqual(maxima, {salary:9, conditions:9, goals:14, contacts:9, stability:9, recognition:9, challenge:6, power:11, variety:9, creativity:15, development:9, meaningful:12});
  assert.deepEqual(Object.values(MOTIVATION_QUESTIONS[1].options[0].scores), [2,2]);
});

test('ledger shows factual options without rekey, and ignores absent/invalid positions', () => {
  assert.deepEqual(summarizeMotivationChoices([3, 0, 4, -1, NaN]), [
    { index:0, question: MOTIVATION_QUESTIONS[0].text, choice:'Он полезен людям' },
    { index:1, question: MOTIVATION_QUESTIONS[1].text, choice:'Придумать бизнес-план' },
  ]);
  assert.deepEqual(summarizeMotivationChoices([]),[]);
});

test('evidence precedes the descending raw points without recomputing progress or changing legacy defaults', () => {
  const state = completedState();
  const before = structuredClone(state);
  const hash = courseFingerprint(state.course);
  const answers = state.course.motivationAnswers;
  const scores = rankScores(scoreMotivation(answers)).map(([key, value]) => MOTIVATORS[key] + ': ' + value + ' баллов');
  const original = profileSections(state);
  const evidence = profileSections(state, {motivationEvidence:true});
  const ledger = evidence.findIndex(s=>s.title==='Что ты выбрал в опроснике о мотивации');
  const raw = evidence.findIndex(s=>s.title==='Мотивация: баллы по ключу');
  assert.ok(ledger > -1 && ledger < raw);
  assert.equal(evidence[ledger].lines.length, 10);
  assert.match(evidence[raw].lines[0], /не то, что для тебя важнее/);
  assert.deepEqual(evidence[raw].lines.slice(1,-1),scores);
  assert.deepEqual(original.find(s=>s.title==='Мотивация: авторский опросник').lines.slice(1,-1),scores);
  assert.doesNotMatch(evidence.flatMap(s=>s.lines).join('\n'),/Наиболее выраженные мотиваторы/);
  const situations = evidence.find(s=>s.title==='Подход к задачам').lines;
  assert.ok(situations.includes('Новый навык за месяц: Сразу попробую говорить, даже если буду ошибаться'));
  assert.match(original.find(s=>s.title==='Подход к задачам').lines[2], /начну колдовать/);
  assert.doesNotMatch(situations.join(' '), /колдовать/);
  assert.deepEqual(profileSections(state), original);
  assert.deepEqual(state,before);
  assert.equal(courseFingerprint(state.course),hash);
});
