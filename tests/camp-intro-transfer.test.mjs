import test from 'node:test';
import assert from 'node:assert/strict';
import { ProfileSession } from '../services/profileSession.ts';
import { freshFreeProgress } from '../services/freeProgress.ts';
import { normalizeUserState } from '../services/progress.ts';
import { createTestDraft } from '../services/testProgress.ts';
import { completedState } from './fixtures.mjs';

test('explicit Camp archetype transfer preserves an entitled user’s existing course and cannot replace a result', async () => {
 const state=completedState(); state.testResult=null;
 const original=structuredClone(state.course);
 let progress={revision:7,payload:{state,testDraft:createTestDraft()},updatedAt:1};
 let puts=0;
 const transport=async (url,init)=> {
   if (url.endsWith('/session')) return Response.json({token:'A'.repeat(43),learnerId:'a'.repeat(36),expiresAt:Date.now()+60000,courseAvailable:true,progress});
   assert.ok(url.endsWith('/progress')); assert.equal(init.method,'PUT'); puts++;
   const {baseRevision,payload,mutationId}=JSON.parse(init.body);
   assert.equal(baseRevision,7);assert.match(mutationId,/^[a-f0-9]{32}$/);
   assert.deepEqual(payload.state.course, original);
   progress={revision:8,payload:{...payload,state:normalizeUserState(payload.state)},updatedAt:2};
   return Response.json({progress});
 };
 const storage=new Map();
 const client=new ProfileSession('https://local.test',transport,{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)});
 const candidate=freshFreeProgress();candidate.draft.step='result';candidate.draft.scores.Commander=5;candidate.draft.heroData.name='Герой';candidate.result={scoreType:'Commander'};
 await client.signIn('code');
 assert.equal(puts,0,'sign-in does not silently transfer draft');
 await client.saveIntro(candidate);
 assert.equal(puts,1);
 assert.equal(client.snapshot.payload.state.testResult.scoreType,'Commander');
 assert.deepEqual(client.snapshot.payload.state.course,original);
 await assert.rejects(client.saveIntro(candidate),/уже есть результат/);
 assert.equal(puts,1);
});

test('visible eligibility separates a saved local result from a cloud result and blocks other profile ownership', async () => {
 const { archetypeTransferState } = await import('../services/archetypeTransfer.ts');
 const state=completedState(); state.testResult=null;
 const local=freshFreeProgress(); local.draft.step='result'; local.result={scoreType:'Commander'};
 const cloud={state,testDraft:createTestDraft()};
 const id='our-learner', other='other-learner';
 assert.equal(archetypeTransferState(local,null,id,cloud),'available','anonymous browser result needs explicit confirmation');
 assert.equal(archetypeTransferState(local,id,id,cloud),'available');
 assert.equal(archetypeTransferState(local,other,id,cloud),'hidden','never offer another named profile\'s local result');
 assert.equal(archetypeTransferState(local,null,undefined,cloud),'hidden','no saving while signed out');
 assert.equal(archetypeTransferState(local,null,id,{...cloud,testDraft:{...cloud.testDraft,step:'choose_name'}}),'blocked');
 assert.equal(archetypeTransferState(local,null,id,{...cloud,state:completedState()}),'hidden','existing cloud archetype wins');
 assert.equal(archetypeTransferState({...local,draft:{...local.draft,step:'choose_name'}},null,id,cloud),'hidden');
});

test('an already started cloud archetype test is untouched even with the five course stages done', async () => {
 const state=completedState(); state.testResult=null;
 const draft=createTestDraft(); draft.step='choose_name';
 const progress={revision:7,payload:{state,testDraft:draft}};
 let writes=0;
 const transport=async (url,init)=>{
   if(url.endsWith('/session')) return Response.json({token:'A'.repeat(43),learnerId:'b'.repeat(36),expiresAt:Date.now()+60000,courseAvailable:true,progress});
   if(init.method==='PUT') writes++;
   throw Error('no write expected');
 };
 const storage=new Map();
 const client=new ProfileSession('https://local.test',transport,{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)});
 const local=freshFreeProgress();local.draft.step='result';local.result={scoreType:'Commander'};
 await client.signIn('code');
 await assert.rejects(client.saveIntro(local),/уже есть результат или начатый тест/);
 assert.equal(writes,0);
 assert.deepEqual(client.snapshot.payload,JSON.parse(JSON.stringify(progress.payload)));
});
