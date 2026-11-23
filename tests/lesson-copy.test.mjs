import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { completedState } from './fixtures.mjs';
import { canFinishStage } from '../services/progress.ts';
import { selectedSituationRows, situationAnswer } from '../services/courseScenarioText.ts';
import { CRISIS_QUESTIONS, SKILLS_QUESTIONS } from '../data/course.ts';
import { HOLLAND_QUESTIONS, MOTIVATION_QUESTIONS } from '../data/assessments.ts';

test('lesson scene wording never changes the stored choice or credits a timed-out answer', () => {
 const course=completedState().course;
 course.s3CrisisAnswers[0]='Без ответа';
 course.s3Learning='Практик';
 assert.equal(selectedSituationRows(course)[2][1],'Сразу попробую говорить, даже если буду ошибаться');
 assert.equal(selectedSituationRows(course)[3][1],'Без ответа');
 assert.equal(course.s3Learning,'Практик');
 assert.ok(canFinishStage(course,2));
 for (const [index, question] of SKILLS_QUESTIONS.entries()) {
   assert.equal(new Set(question.opts.map(option=>situationAnswer('skill',index,option.type))).size,question.opts.length);
 }
 for (const [index, question] of CRISIS_QUESTIONS.entries()) {
   for(const option of question.opts) assert.equal(situationAnswer('crisis',index,option.type),option.t);
 }
});

test('all five protected lessons use a consistent brief and explain outcome based on the real response', async () => {
 const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 globalThis.window={location:{href:'https://fixture.invalid/#course'}};
 try {
  const {CourseView}=await vite.ssrLoadModule('/components/CourseView.tsx');
  const fixture=completedState().course;
  const render=(activeStage, props={})=>renderToStaticMarkup(React.createElement(CourseView,{
    course:{...fixture,activeStage,...props},linear:true,onChange(){},onBack(){},onCompleteCourse(){},isGeneratingAi:false,
  }));
  const fields=['s1Phase','s2Phase','s3Phase','s4Phase','s5Phase'];
  for(const [stage,field] of fields.entries()) {
    const intro=render(stage,{[field]:'intro'});
    assert.match(intro,/Что это<\/dt>.*На что обратить внимание<\/dt>.*Что делать<\/dt>/);
    assert.doesNotMatch(intro,/Что получилось и почему/);
    const done=render(stage,{[field]:'done'});
    assert.match(done,/<h3>Что получилось и почему<\/h3>/);
    assert.ok(canFinishStage(fixture,stage));
  }
  const interests=render(0);
  assert.match(interests,/Программист/);
  assert.match(interests,/Иллюстратор/);
  assert.match(interests,/3 из 3 верно/);
  const reflected=render(1);
  assert.match(reflected,/Графический планшет/);
  assert.match(reflected,/Подарок на 17 лет/);
  assert.match(reflected,/подарки записаны отдельно и не влияют на результат/i);
  assert.match(render(1,{ s2Phase:'swot2' }),/<h2[^>]*><label for="reflection">Что даётся трудно<\/label><\/h2>/,'scroll target is the actual heading, never the keyboard');
  const scenarios=render(2,{s3CrisisAnswers:['Без ответа',...fixture.s3CrisisAnswers.slice(1)]});
  assert.match(scenarios,/ответов про проект и команду/);
  assert.match(scenarios,/Без ответа/);
  assert.match(scenarios,/Сразу попробую говорить/);
  const learning=render(2,{s3Phase:'q3'});
  assert.match(learning,/освоить основы нового языка/);
  assert.doesNotMatch(learning,/колдовать|Главные мотиваторы|Правильно/);
  const dream=render(3);
  assert.match(dream,/Работать в своей студии над играми/);
  assert.match(dream,/Свобода и гибкость/);
  const evidence=render(4,{s5Phase:'holland_result',hollandAnswers:[2,0,0,0,0,0,0,0,0,0,0,0]});
  assert.ok(evidence.includes(HOLLAND_QUESTIONS[0].text));
  assert.ok(!evidence.includes(HOLLAND_QUESTIONS[1].text));
  const noEvidence=render(4,{s5Phase:'holland_result',hollandAnswers:Array(12).fill(0)});
  assert.match(noEvidence,/ни одно направление не выделилось/);
  const motivation=render(4);
  assert.match(motivation,/нельзя сравнивать, что мотивирует тебя сильнее/);
  assert.match(motivation,/<summary>Твои ответы о мотивации<\/summary>/);
  assert.ok(motivation.includes(MOTIVATION_QUESTIONS[0].options[fixture.motivationAnswers[0]].text));
  assert.doesNotMatch(motivation,/Главные мотиваторы/);
 } finally { await vite.close(); delete globalThis.window; }
});
