import test from 'node:test';
import assert from 'node:assert/strict';
import { ProfileSession } from '../services/profileSession.ts';
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const ok=data=>new Response(JSON.stringify(data),{status:200});
test('a delayed protected module is discarded after sign-out',async()=>{
 let complete;
 const fetch=async(url,options)=>{
  if(url.endsWith('/course-content'))return new Promise(resolve=>{complete=resolve;});
  if(options.method==='DELETE')return ok({ok:true});
  return ok({token:'x'.repeat(43),learnerId:'11111111-1111-4111-8111-111111111111',expiresAt:Date.now()+100000,courseAvailable:true,progress:{revision:0,payload:null,updatedAt:0}});
 };
 const client=new ProfileSession('https://qa.invalid',fetch,storage());await client.signIn('synthetic');const request=client.loadCourse();await client.signOut();complete(ok({script:'secret'}));await assert.rejects(()=>request,/Сессия изменилась/);assert.equal(client.state.status,'signed-out');
});

test('browser fetch is invoked without binding it to ProfileSession',async()=>{
 const transport=function(){assert.equal(this,undefined);return Promise.resolve(ok({ok:true,registrationAvailable:true}));};
 const client=new ProfileSession('https://qa.invalid',transport,storage());await client.start();assert.equal(client.state.registrationAvailable,true);client.dispose();
});

test('pilot join signs in once, delegates same session and only publishes ephemeral arrival',async()=>{
 const observed=[];
 const session={token:'x'.repeat(43),learnerId:'11111111-1111-4111-8111-111111111111',expiresAt:Date.now()+100000};
 const secret='ORI-'+'A'.repeat(32), invite='PILOT-0123-4567-89AB-CDEF';
 const stub=async (url, options)=>{
  observed.push({path:new URL(url).pathname,method:options.method,input:options.body ? JSON.parse(options.body):null,auth:options.headers.authorization});
  return ok({...session,courseAvailable:true,progress:{revision:0,payload:null,updatedAt:0}});
 };
 const saved=storage(), client=new ProfileSession('https://qa.invalid',stub,saved);
 await client.joinPilot(invite,secret);
 assert.equal(client.state.justJoinedWithInvite,true);
 assert.equal(client.state.courseAvailable,true);
 assert.deepEqual(client.getSessionForCourse(),session);
 await client.loadCourse();
 assert.deepEqual(observed.map(row=>row.path),['/session','/course-content']);
 assert.deepEqual(observed[0].input,{inviteCode:invite,code:secret,consent:true});
 assert.equal(observed[1].auth,'Bearer '+session.token);
 assert.equal(saved.getItem('orienta_session_v1'),JSON.stringify(session));
 client.consumeInviteArrival(); assert.equal(client.state.justJoinedWithInvite,false);
 client.dispose();
 const reopened = new ProfileSession('https://qa.invalid',stub,saved);
 await reopened.start({blockingHealth:false});
 assert.equal(reopened.state.justJoinedWithInvite,undefined);
 assert.equal(reopened.state.courseAvailable,true);
});

test('optional health does not block restoring a logged-in profile',async()=>{
 const session={token:'x'.repeat(43),learnerId:'11111111-1111-4111-8111-111111111111',expiresAt:Date.now()+100000};
 const saved=storage();saved.setItem('orienta_session_v1',JSON.stringify(session));
 let releaseHealth; const optional = new Promise(resolve => {releaseHealth=resolve;});
 const stub=async (url)=>url.endsWith('/health')?optional:ok({...session,courseAvailable:true,progress:{revision:0,payload:null,updatedAt:0}});
 const client=new ProfileSession('https://qa.invalid',stub,saved);
 try {
   await client.start({blockingHealth:false});
   assert.equal(client.state.status,'saved');
   assert.equal(client.state.courseAvailable,true);
   assert.deepEqual(client.getSessionForCourse(),session);
 } finally {releaseHealth(ok({ok:true}));client.dispose();}
});
