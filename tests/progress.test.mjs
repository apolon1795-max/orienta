import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserState, createCourseState, normalizeUserState, normalizeCourseState, readUserState, saveLocalState, canFinishStage, getCourseXp, validAge, validGift, exportBackup, importBackup } from '../services/progress.ts';
import { createTestDraft, normalizeTestDraft, getTestWinners } from '../services/testProgress.ts';
import { buildProfileText, courseFingerprint } from '../services/profile.ts';
import { completedState } from './fixtures.mjs';
test('new progress has independent arrays and schema version', () => {
  const a=createUserState(), b=createUserState(); a.course.s1SelectedSpheres.push('it');
  assert.equal(b.course.s1SelectedSpheres.length,0); assert.equal(a.schemaVersion,2);
});
test('malformed storage cannot crash the app or unlock stages', () => {
  for (const value of [null, [], 12, { course: { completedStages:[2,1,0], s2Inputs:null, s1QuizAnswers:'oops', activeStage:3 }, testResult:{scoreType:'__proto__'} }]) {
    const state=normalizeUserState(value); assert.equal(state.testResult,null); assert.equal(state.course.completedStages.length,0);
  }
});
test('legacy archetype is retained, old unrelated modules do not unlock the course', () => {
  const migrated=normalizeUserState({hasOnboarded:true,testResult:{scoreType:'Creator',title:'old',timestamp:'2026'},courseProgress:[{id:1,isCompleted:true}],aiSummary:'Сохранённый текст'});
  assert.equal(migrated.testResult.title,'Творец'); assert.equal(migrated.aiSummary,'Сохранённый текст'); assert.equal(migrated.summarySource,undefined); assert.deepEqual(migrated.course.completedStages,[]);
});
test('completed course, full answers and score restore together', () => {
  const state=completedState(); assert.deepEqual(state.course.completedStages,[0,1,2]); assert.equal(getCourseXp(state.course),130);
  assert.deepEqual(normalizeUserState(JSON.parse(JSON.stringify(state))),state);
  assert.deepEqual(state.courseProgress.map(m=>m.isCompleted),[true,true,true]);
});
test('all stage gates require actual answers', () => {
  const c=completedState().course; assert.ok([0,1,2].every(i=>canFinishStage(c,i)));
  c.s3CrisisAnswers.pop(); assert.equal(canFinishStage(c,2),false);
  c.s2Values.pop(); assert.equal(canFinishStage(c,1),false);
  c.s1SelectedSpheres=[]; assert.equal(canFinishStage(c,0),false);
  assert.deepEqual(normalizeCourseState(c).completedStages,[]);
});
test('bounded inputs, no whitespace-only required answers', () => {
  assert.ok(validAge('6')); assert.ok(validAge('100'));
  for (const v of ['', '-1', '0', '101', '12.5','NaN']) assert.equal(validAge(v),false);
  assert.ok(validGift('Планшет')); assert.equal(validGift('  '),false); assert.equal(validGift('деньги'),false);
});
test('backup transfers both complete course and unfinished test with history', () => {
  const draft=createTestDraft(); draft.step='question_2';draft.heroData={name:'Эльф 🌿',race:'Эльф'};draft.scores.Commander=1;
  draft.history=[{step:'question_1',heroData:{...draft.heroData},scores:createTestDraft().scores}];
  const result=importBackup(exportBackup(completedState(),draft));
  assert.equal(result.state.course.s2Inputs.s,'Рисую и учусь'); assert.deepEqual(result.testDraft,draft);
});
test('foreign, oversized and broken backups reject with recovery text', () => {
  for(const s of ['nope','{}',JSON.stringify({format:'orienta-backup',version:9,state:{course:{}}}),' '.repeat(200001)]) assert.throws(()=>importBackup(s));
});
test('unavailable storage does not throw; damaged raw input is retained for recovery', () => {
  assert.equal(saveLocalState({setItem(){throw new Error('quota');}},createUserState()),false);
  let recovery; const state=readUserState({getItem(){return '{broken';},setItem(k,v){recovery=v;}});
  assert.equal(state.testResult,null);assert.equal(recovery,'{broken');
});
test('invalid drafts reset safely; ties expose every highest archetype', () => {
  assert.equal(normalizeTestDraft({step:'result',heroData:{name:'X',race:'Эльф'},scores:createTestDraft().scores}).step,'start');
  assert.deepEqual(getTestWinners({Commander:2,Creator:2,Researcher:1,Communicator:0}),['Commander','Creator']);
});
test('profile includes every answer group and remains plain text', () => {
  const state=completedState(); const output=buildProfileText(state);
  for(const v of ['IT и технологии','Творчество и медиа','Рисую и учусь','Графический планшет','Технарь','Смешанный','Следующий шаг']) assert.ok(output.includes(v),v);
  state.course.s2Inputs.s='<script>alert(1)</script>'; assert.ok(buildProfileText(state).includes('<script>'));
});
test('navigation does not invalidate AI; changing an answer does', () => {
  const c=completedState().course, before=courseFingerprint(c);
  c.activeStage=0; assert.equal(courseFingerprint(c),before);
  c.s2Inputs.s='Другая сильная сторона'; assert.notEqual(courseFingerprint(c),before);
});
