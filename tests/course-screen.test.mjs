import { test } from 'node:test';
import assert from 'node:assert/strict';
import { courseScreenKey } from '../services/courseScreen.ts';
import { createCourseState } from '../services/progress.ts';

test('editing text, selecting within a prompt, quiz feedback and cloud/media updates keep the same displayed screen', () => {
  const base = createCourseState();
  for (const [screen, change] of [
    [{activeStage:0, s1Phase:'quiz'}, {s1QuizFeedback:'Верно!', s1QuizAnswers:[0]}],
    [{activeStage:1, s2Phase:'swot1'}, {s2Inputs:{...base.s2Inputs,s:'учусь быстро'}}],
    [{activeStage:1, s2Phase:'values'}, {s2Values:['Свобода']}],
    [{activeStage:3, s4Phase:'dream'}, {s4Dream:'Проектирую игры'}],
    [{activeStage:4, s5Phase:'holland'}, {hollandAnswers:[0,1], s4Dream:'Изменение неактивного этапа'}],
  ]) {
    const current = {...base,...screen};
    assert.equal(courseScreenKey(current), courseScreenKey({...current,...change}));
  }
});

test('continuing to a new displayed exercise changes the anchor even within the same phase', () => {
  const base = createCourseState();
  for (const [screen, change] of [
    [{activeStage:0,s1Phase:'tinder'}, {s1CardIndex:1}],
    [{activeStage:0,s1Phase:'jobs'}, {s1ProfessionIndex:1}],
    [{activeStage:0,s1Phase:'quiz'}, {s1QuizIndex:1}],
    [{activeStage:1,s2Phase:'swot1'}, {s2Phase:'swot2'}],
    [{activeStage:1,s2Phase:'gifts'}, {s2GiftIndex:1}],
    [{activeStage:2,s3Phase:'crisis'}, {s3CrisisIdx:1}],
    [{activeStage:3,s4Phase:'dream'}, {s4Phase:'place'}],
    [{activeStage:4,s5Phase:'motivation'}, {s5Index:1}],
    [{activeStage:3,s4Phase:'done'}, {activeStage:4}],
  ]) {
    const current = {...base,...screen};
    assert.notEqual(courseScreenKey(current), courseScreenKey({...current,...change}));
  }
});
