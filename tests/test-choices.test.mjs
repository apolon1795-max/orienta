import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TEST_CHOICES } from '../data/testChoices.ts';
import { createTestDraft, normalizeTestDraft, SCORE_KEYS } from '../services/testProgress.ts';
import { readFreeProgress } from '../services/freeProgress.ts';
test('five fixed answer orders have unique stable IDs and one of each archetype', () => {
 const groups=Object.values(TEST_CHOICES);assert.equal(groups.length,5);
 assert.equal(new Set(groups.flat().map(x=>x.id)).size,20);
 for(const group of groups) assert.deepEqual(group.map(x=>x.archetype).sort(),[...SCORE_KEYS].sort());
 assert.equal(new Set(groups.map(g=>g.map(x=>x.archetype).join(','))).size,5);
 for(let position=0;position<4;position++) assert.equal(new Set(groups.slice(0,4).map(g=>g[position].archetype)).size,4);
});
test('panda keeps original joke and now scores creativity; research option actually compares answers',()=>{
 const q4=TEST_CHOICES.question_4;
 assert.deepEqual(q4.find(x=>x.id==='q4-4'),{id:'q4-4',text:'Придумываю четвёртый путь. Он включает лодку и панду.',archetype:'Creator'});
 assert.equal(q4.find(x=>x.id==='q4-3').archetype,'Researcher');assert.match(q4.find(x=>x.id==='q4-3').text,/Собираю ответы, сравниваю/);
});
test('original vivid jokes are preserved and selected answer is resolved by ID, not position',()=>{
 const text=JSON.stringify(TEST_CHOICES);
 for(const joke of ['говорящий суп','хлебного мякиша','пельмени','учителя по химии','И камень будет рад','крёстным у его сына','блёстки']) assert.ok(text.includes(joke),joke);
 const source=fs.readFileSync(new URL('../components/TestView.tsx',import.meta.url),'utf8');
 assert.match(source,/TikTok/);assert.match(source,/item\.id === selectedOptionId/);assert.doesNotMatch(source,/options\[selectedOption/);
});
test('old completed scores and in-progress history remain unchanged, including legacy panda points',()=>{
 const old=createTestDraft();old.step='result';old.heroData={name:'Пробный герой',race:'Человек'};old.scores={Commander:0,Creator:0,Researcher:5,Communicator:0};
 old.history=[{step:'question_4',heroData:{...old.heroData},scores:{Commander:0,Creator:0,Researcher:3,Communicator:0}}];
 assert.deepEqual(normalizeTestDraft(old),old);
 const restored=readFreeProgress({getItem:()=>JSON.stringify({draft:old,result:{scoreType:'Researcher'}})});
 assert.deepEqual(restored.draft.scores,old.scores);assert.equal(restored.result.scoreType,'Researcher');
 const inProgress={...old,step:'question_5',scores:{Commander:0,Creator:0,Researcher:4,Communicator:0}};
 assert.deepEqual(normalizeTestDraft(inProgress),inProgress);
});
