import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { profileSections, buildProfileText } from '../services/profile.ts';
import { scoreInterests, scoreMotivation } from '../services/assessments.ts';
import { aiReportBlocks } from '../services/aiReport.ts';
import { INTEREST_TYPES, MOTIVATORS } from '../data/assessments.ts';
import { SKILLS_QUESTIONS, CRISIS_QUESTIONS } from '../data/course.ts';
import { renderAiSummary } from '../server/ai.mjs';
import { completedState } from './fixtures.mjs';

test('both score tables descend and preserve authored order across equal scores, including all zeros', () => {
  for (const values of [true, false]) {
    const state = completedState();
    if (!values) { state.course.hollandAnswers=[]; state.course.motivationAnswers=[]; }
    const sections = profileSections(state);
    for (const [prefix, scores, labels, suffix] of [
      ['Профессиональные интересы:', scoreInterests(state.course.hollandAnswers), Object.fromEntries(Object.entries(INTEREST_TYPES).map(([key, data])=>[key,data.title])), '/4'],
      ['Мотивация:', scoreMotivation(state.course.motivationAnswers), MOTIVATORS, ' баллов'],
    ]) {
      const lines=sections.find(section=>section.title.startsWith(prefix)).lines.slice(1,-1);
      const originalKeys=Object.keys(labels);
      const rowKeys=lines.map(line=>originalKeys.find(key=>line===labels[key]+': '+scores[key]+suffix));
      assert.equal(rowKeys.length, originalKeys.length);
      assert.equal(new Set(rowKeys).size, originalKeys.length);
      assert.ok(rowKeys.every(Boolean));
      for(let i=1; i<rowKeys.length; i++) {
        assert.ok(scores[rowKeys[i-1]]>=scores[rowKeys[i]]);
        if(scores[rowKeys[i-1]]===scores[rowKeys[i]]) assert.ok(originalKeys.indexOf(rowKeys[i-1])<originalKeys.indexOf(rowKeys[i]));
      }
    }
  }
});

test('scenarios display authored choices, resolve reused labels in context, preserve unanswered responses', () => {
  const state=completedState();
  Object.assign(state.course,{s3CrisisAnswers:['Боец','Дипломат','Без ответа','Боец']});
  const situation=profileSections(state).find(section=>section.title==='Подход к задачам').lines;
  for (const [i, field] of ['s3Thinking','s3Team','s3Learning'].entries()) {
    assert.ok(situation[i].endsWith(SKILLS_QUESTIONS[i].opts.find(option=>option.type===state.course[field]).t));
  }
  assert.equal(situation[3],'Ведущий заболел, колонка сломалась: '+CRISIS_QUESTIONS[0].opts.find(option=>option.type==='Боец').t);
  assert.equal(situation[4],'Друзья в команде поссорились: '+CRISIS_QUESTIONS[1].opts.find(option=>option.type==='Дипломат').t);
  assert.equal(situation[5],'Флешка с презентацией осталась дома: Без ответа');
  assert.equal(situation[6],'Пропал интернет во время турнира: '+CRISIS_QUESTIONS[3].opts.find(option=>option.type==='Боец').t);
  assert.notEqual(situation[3].split(': ')[1],situation[6].split(': ')[1]);
});

const structured=renderAiSummary({
  summary:'Ты описал, как хочешь работать в небольшой команде.',
  strengths:['Готовность делать проект небольшими шагами.','Умение выслушать участников команды.'],
  directions:[
    {profession:'Иллюстратор',reason:'Можно сочетать визуальную работу с проектами в команде.',trial:'Сделай обложку для школьного журнала.'},
    {profession:'Разработчик игр',reason:'Здесь важны небольшие тестируемые шаги.',trial:'Попробуй придумать простую механику.'},
  ],
  nextStep:'Выбери один небольшой проект и обсуди его с наставником.',
});

test('the actual provider storage format and legacy markdown-like output keep headings, lists and text', async () => {
  const blocks=aiReportBlocks(structured);
  assert.deepEqual(blocks.map(x=>x.kind),['paragraph','heading','bullets','heading','ordered','heading','paragraph','paragraph']);
  assert.deepEqual(blocks[4].items.map(x=>x.title),['Иллюстратор','Разработчик игр']);
  assert.match(blocks[4].items[0].details[1],/^Попробуй: Сделай обложку/);
  const legacy='## Старый разбор\n\n**Сильная сторона** в тексте.\n\n- Первый пункт\n* Второй пункт\n\n2) Деталь\nОписание.\n\nОбычный абзац.';
  assert.deepEqual(aiReportBlocks(legacy).map(x=>x.kind),['heading','paragraph','bullets','ordered','paragraph']);
  assert.equal(aiReportBlocks(legacy)[3].start,2);
  const state=completedState(); state.summarySource='ai'; state.aiSummary=legacy;
  assert.ok(buildProfileText(state).endsWith(legacy),'text export includes the unchanged stored report, not rendered markup');
});

test('React renders reused sections with semantic readable markup, escaping legacy/provider HTML', async () => {
  const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  try {
    const { AiReport }=await vite.ssrLoadModule('/components/AiReport.tsx');
    const text=structured+'\n\n### История\n\n**Выделение** рядом с <script>alert(1)</script> и [ссылкой](javascript:alert(1)).';
    const html=renderToStaticMarkup(React.createElement(AiReport,{text}));
    assert.match(html,/<h3>На что можно опереться<\/h3><ul><li>/);
    assert.match(html,/<ol start="1"><li><strong>Иллюстратор<\/strong><p>/);
    assert.match(html,/<strong>Попробуй:<\/strong>/);
    assert.match(html,/<h3>История<\/h3>/);
    assert.match(html,/<strong>Выделение<\/strong> рядом с &lt;script&gt;/);
    assert.doesNotMatch(html,/<script|<a\s|onclick=/i);
    const { ProfileView }=await vite.ssrLoadModule('/components/ProfileView.tsx');
    const state=completedState(); state.aiSummary=text; state.summarySource='legacy';
    const profile=renderToStaticMarkup(React.createElement(ProfileView,{state,aiConfigured:true,generating:false}));
    assert.match(profile,/Ранее сохранённый вывод/);
    assert.match(profile,/По кнопке ответы из профкарты отправятся во внешний ИИ-сервис/);
    assert.match(profile,/Запрос обрабатывается за пределами России/);
    assert.doesNotMatch(profile,/OpenAI|ProxyAPI/);
  } finally { await vite.close(); }
});
