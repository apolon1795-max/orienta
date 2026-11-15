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
