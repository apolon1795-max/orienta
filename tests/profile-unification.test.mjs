import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createApi, provisionLearner } from '../server/api.mjs';
import { importFreeIntro } from '../services/profileIntro.ts';
import { createUserState, normalizeUserState } from '../services/progress.ts';
import { createTestDraft } from '../services/testProgress.ts';
import { freshFreeProgress } from '../services/freeProgress.ts';
const botToken='12345:synthetic_test_only_not_a_real_token';
const now=1800000000000;
const proof=(id=1001,nonce='test')=>{
 const p=new URLSearchParams({auth_date:String(now/1000),user:JSON.stringify({id,first_name:'Тест'}),query_id:nonce});
 const secret=createHmac('sha256','WebAppData').update(botToken).digest();
 p.set('hash',createHmac('sha256',secret).update([...p].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n')).digest('hex'));return p.toString();
};
const memory=()=>{const rows=new Map();return {rows,get:async k=>structuredClone(rows.get(k)||null),compareAndSet:async(k,rev,v)=>{const old=rows.get(k);if((old?.revision||0)!==rev)return false;rows.set(k,{revision:rev+1,value:structuredClone(v)});return true;}};};
const empty=()=>({state:createUserState(),testDraft:createTestDraft()});
const completed=()=>{const p=freshFreeProgress();p.draft.step='result';p.draft.heroData={name:'Тестовый герой',race:'Человек'};p.draft.scores.Creator=5;p.result={scoreType:'Creator',title:'Творец'};return p;};
test('free archetype imports only on explicit call, preserves course and rejects existing account results/drafts',()=>{
 const current=empty(),free=completed();const original=structuredClone(current);const merged=importFreeIntro(current,free);
 assert.deepEqual(current,original);assert.equal(merged.state.testResult.scoreType,'Creator');assert.deepEqual(merged.state.course,normalizeUserState(current.state).course);
 assert.throws(()=>importFreeIntro(merged,completed()),/profile_has_progress/);
 const partial=empty();partial.testDraft.step='choose_name';assert.throws(()=>importFreeIntro(partial,completed()),/profile_has_progress/);
 assert.throws(()=>importFreeIntro(empty(),freshFreeProgress()),/intro_incomplete/);
});
test('code and signed Telegram login resolve same saved profile; no provisioning, no identity takeover, no replay',async()=>{
 const store=memory(), api=createApi({store,now:()=>now,telegramBotToken:botToken});
 const call=async(path,body={},token='',method='POST')=>{const r=await api({ip:'127.0.0.1',path,method,body:method==='GET'?'':JSON.stringify(body),headers:token?{authorization:'Bearer '+token}:{}});return {status:r.status,data:JSON.parse(r.body)};};
 const a=await provisionLearner(store,'test'),b=await provisionLearner(store,'other');
 const login=await call('/session',{code:a.code});assert.equal(login.status,200);
 const merged=importFreeIntro(empty(),completed());
 assert.equal((await call('/progress',{baseRevision:0,mutationId:'synthetic_import_00001',payload:merged},login.data.token,'PUT')).status,200);
 assert.equal((await call('/telegram-link',{initData:proof()},'')).status,401);
 assert.equal((await call('/telegram-link',{initData:proof()},login.data.token)).data.error,'link_confirmation_required');
 assert.equal((await call('/telegram-session',{initData:proof()})).data.error,'telegram_not_linked');
 assert.equal((await call('/telegram-link',{initData:proof(),confirmLink:true},login.data.token)).status,200);
 assert.equal((await call('/telegram-session',{initData:proof()})).data.error,'telegram_replayed');
 const tg=await call('/telegram-session',{initData:proof(1001,'fresh-login')});assert.equal(tg.status,200);assert.equal(tg.data.learnerId,a.learnerId);assert.equal(tg.data.progress.payload.state.testResult.scoreType,'Creator');
 const browser=await call('/session',{code:a.code});assert.deepEqual(browser.data.progress.payload,tg.data.progress.payload);
 const other=await call('/session',{code:b.code});assert.equal((await call('/telegram-link',{initData:proof(1001,'steal'),confirmLink:true},other.data.token)).status,409);
 assert.equal((await call('/telegram-link',{initData:proof(1002,'change'),confirmLink:true},login.data.token)).status,409);
 assert.equal((await call('/telegram-link',{initData:proof(1001,'tg-relink'),confirmLink:true},tg.data.token)).data.error,'code_login_required');
 assert.equal([...store.rows.keys()].filter(k=>k.startsWith('learner:')).length,2);
 const record=await store.get('learner:'+a.learnerId);await store.compareAndSet('learner:'+a.learnerId,record.revision,{...record.value,active:false});
 assert.equal((await call('/telegram-session',{initData:proof(1001,'disabled')})).data.error,'telegram_not_linked');
});
test('Telegram endpoints remain disabled without explicit server configuration',async()=>{
 const api=createApi({store:memory()});const r=await api({path:'/telegram-session',method:'POST',body:JSON.stringify({initData:proof()})});assert.equal(r.status,503);assert.equal(JSON.parse(r.body).error,'telegram_disabled');
});

test('free accounts cannot write course answers or use paid AI; legacy pilot access survives', async()=>{
 const store=memory(), api=createApi({store,now:()=>now,ai:{summarize:()=>{throw Error('must not run');}}});
 const learner=await provisionLearner(store,'synthetic');const row=await store.get('learner:'+learner.learnerId);await store.compareAndSet('learner:'+learner.learnerId,row.revision,{...row.value,kind:'free'});
 const call=async(path,body={},token='',method='POST')=>{const r=await api({ip:'127.0.0.1',path,method,body:JSON.stringify(body),headers:token?{authorization:'Bearer '+token}:{}});return {status:r.status,data:JSON.parse(r.body)};};
 const free=await call('/session',{code:learner.code});assert.equal(free.data.courseAvailable,false);assert.equal(free.data.aiAvailable,false);
 const intro=importFreeIntro(empty(),completed());
 assert.equal((await call('/progress',{baseRevision:0,mutationId:'free_intro_mutation01',payload:intro},free.data.token,'PUT')).status,200);
 intro.state.course.s2Inputs.s='forged paid answer';
 assert.equal((await call('/progress',{baseRevision:1,mutationId:'free_course_forgery01',payload:intro},free.data.token,'PUT')).data.error,'course_access_required');
 assert.equal((await call('/ai-summary',{baseRevision:1},free.data.token)).data.error,'course_access_required');
 const legacy=await provisionLearner(store,'old');assert.equal((await call('/session',{code:legacy.code})).data.courseAvailable,true);
});
