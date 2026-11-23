import assert from 'node:assert/strict';
import test from 'node:test';
import {once} from 'node:events';
import {startServer} from '../server/local.mjs';
import {provisionLearner} from '../server/api.mjs';
import {ProgressSync} from '../services/cloudProgress.ts';
import {createTestDraft} from '../services/testProgress.ts';
import {completedState} from './fixtures.mjs';

const storage=()=>{
  const data=new Map();
  return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
};

test('final archetype checks exact acknowledged payload and account, never cache or a mismatching 200',async t=>{
  const {server,store}=startServer({filename:':memory:',port:0});
  await once(server,'listening');
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
  const original=await provisionLearner(store),different=await provisionLearner(store);
  const state=completedState(), result=state.testResult, draft=createTestDraft();
  state.testResult=null;
  const basePayload={state,testDraft:draft};
  assert.ok(await store.compareAndSet('progress:'+original.learnerId,0,{payload:basePayload,mutationId:'seed-archetype-test',updatedAt:Date.now()}));
  const base='http://127.0.0.1:'+server.address().port;
  const persisted=storage(),cached=storage();
  let mode='outage';
  const adapter=async(url,opts)=>{
    if(opts.method==='PUT'&&mode==='outage')return Response.json({error:'storage_unavailable'},{status:503});
    const response=await fetch(url,opts);
    if(opts.method!=='PUT'||!response.ok||mode!=='tampered')return response;
    const json=await response.json();json.progress.payload.state.testResult=null;
    return Response.json(json);
  };
  const opts={base,fetch:adapter,sessionStorage:persisted,storage:cached,restore(){},reset(){},delay:30_000};
  const sync=new ProgressSync(opts);
  t.after(()=>sync.dispose());
  await sync.signIn(original.code);
  const next={state:{...state,testResult:result},testDraft:draft};
  assert.ok(next.state.testResult);
  sync.offer(next);
  await sync.flush();
  assert.equal(sync.state.status,'offline');
  assert.equal(sync.hasConfirmedProgress(original.learnerId,next),false);
  assert.equal((await store.get('progress:'+original.learnerId)).value.payload.state.testResult,null);
  mode='tampered';
  await sync.retry();
  assert.equal(sync.state.status,'saved');
  assert.equal(sync.hasConfirmedProgress(original.learnerId,next),false);
  const fresh=new ProgressSync(opts);
  t.after(()=>fresh.dispose());
  assert.equal(fresh.hasConfirmedProgress(original.learnerId,next),false);
  await fresh.start();
  assert.equal(fresh.hasConfirmedProgress(original.learnerId,next),true);
  assert.equal(fresh.hasConfirmedProgress(different.learnerId,next),false);
  await fresh.signIn(different.code);
  assert.equal(fresh.hasConfirmedProgress(original.learnerId,next),false);
  assert.equal(await store.get('progress:'+different.learnerId),null);
});

test('retry acknowledgement from real authenticated API accepts exact stored archetype only',async t=>{
  const {server,store}=startServer({filename:':memory:',port:0});
  await once(server,'listening');
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
  const learner=await provisionLearner(store),base='http://127.0.0.1:'+server.address().port;
  let offline=true;
  const sync=new ProgressSync({base,sessionStorage:storage(),storage:storage(),restore(){},reset(){},delay:30_000,
    fetch:(url,opts)=>opts.method==='PUT'&&offline?Promise.resolve(Response.json({error:'storage_unavailable'},{status:503})):fetch(url,opts)});
  t.after(()=>sync.dispose());
  await sync.signIn(learner.code);
  const payload={state:completedState(),testDraft:createTestDraft()};
  sync.offer(payload);await sync.flush();
  assert.equal(sync.hasConfirmedProgress(learner.learnerId,payload),false);
  offline=false;await sync.retry();
  assert.equal(sync.hasConfirmedProgress(learner.learnerId,payload),true);
  assert.equal(sync.hasConfirmedProgress(learner.learnerId,{...payload,state:{...payload.state,testResult:null}}),false);
});
