import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi, provisionLearner } from '../server/api.mjs';
import { setCourseAccess } from '../server/course-access.mjs';
const memory=()=>{const map=new Map();return {get:async k=>structuredClone(map.get(k)||null),compareAndSet:async(k,r,v)=>{const old=map.get(k);if((old?.revision||0)!==r)return false;map.set(k,{revision:r+1,value:structuredClone(v)});return true;}};};
test('course code and media are server-gated for guests/free/revoked and retained for pilot/verified access',async()=>{
 const lessonConfig = [...Array.from({length:5},(_,i)=>({video:'https://media.example/private-video-'+(i+1),captions:''})),{video:'https://media.example/private-welcome',captions:''}];
 const store=memory(),api=createApi({store,freeRegistrationEnabled:true,coursePackage:{script:'PRIVATE_COURSE_SENTINEL',css:'private-style'},lessonConfig});
 const call=async(path,body,token='',method=body?'POST':'GET')=>{const r=await api({path,method,body:body?JSON.stringify(body):'',ip:'127.0.0.1',headers:token?{authorization:'Bearer '+token}:{}});return {...r,data:JSON.parse(r.body)};};
 let r=await call('/course-content');assert.equal(r.status,401);assert.doesNotMatch(r.body,/PRIVATE_COURSE|private-video|private-welcome/);
 const code='ORI-'+ 'B'.repeat(32);await call('/register',{code,consent:true});const free=await call('/session',{code});
 r=await call('/course-content',null,free.data.token);assert.equal(r.status,403);assert.doesNotMatch(r.body,/PRIVATE_COURSE|private-video|private-welcome/);
 await setCourseAccess(store,{learnerId:free.data.learnerId,expectedRevision:0,status:'active',reference:'synthetic_verified_payment'});
 r=await call('/course-content',null,free.data.token);assert.equal(r.status,200);assert.equal(r.data.script,'PRIVATE_COURSE_SENTINEL');assert.equal(r.headers['cache-control'],'no-store');assert.deepEqual(r.data.lessons,lessonConfig);
 await setCourseAccess(store,{learnerId:free.data.learnerId,expectedRevision:1,status:'revoked',reference:'synthetic_verified_payment'});
 assert.equal((await call('/course-content',null,free.data.token)).status,403);
 const legacy=await provisionLearner(store);const login=await call('/session',{code:legacy.code});assert.equal((await call('/course-content',null,login.data.token)).status,200);
 await call('/session',null,login.data.token,'DELETE');assert.equal((await call('/course-content',null,login.data.token)).status,401);
});
