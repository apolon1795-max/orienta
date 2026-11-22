import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi, digest, normalizeCode, provisionLearner } from '../server/api.mjs';
import { openSqliteStore } from '../server/sqlite.mjs';
import { createUserState } from '../services/progress.ts';
import { createTestDraft } from '../services/testProgress.ts';

const invite = 'PILOT-0123-4567-89AB-CDEF';
const code = n => 'ORI-' + n.toString(16).padStart(32, '0');
const opts = {
  now: () => 1800000000000,
  freeRegistrationEnabled: true,
  coursePackage: { script: 'synthetic course', css: 'synthetic css' },
  lessonConfig: [{video:'https://kinescope.io/embed/lesson-test'}, {}, {}, {}, {}, {video:'https://kinescope.io/embed/welcome-test'}]
};
const make = (store, pilotInviteHash = digest(normalizeCode(invite))) => {
  const api = createApi({store, pilotInviteHash, ...opts});
  return async (method, path, body, token, ip = '192.0.2.1') => {
    const response = await api({method,path,headers:token ? {Authorization:'Bearer '+token} : {},body:body ? JSON.stringify(body) : '',ip});
    return {status:response.status,...JSON.parse(response.body)};
  };
};
const redeem = (request,n) => request('POST','/session',{inviteCode:invite.toLowerCase(),code:code(n),consent:true});
test('one shared invite: distinct personal access, private progress and no extra login challenge', async () => {
  const store = openSqliteStore(':memory:'); try {
    const live = make(store);
    const [a,b] = await Promise.all([redeem(live,1),redeem(live,2)]);
    assert.equal(a.status,200); assert.equal(b.status,200);
    assert.notEqual(a.learnerId,b.learnerId); assert.notEqual(a.token,b.token);
    assert.equal(a.courseAvailable,true);
    assert.equal(b.courseAvailable,true);
    const content = await live('GET','/course-content',null,a.token);
    assert.equal(content.status,200);
    assert.deepEqual(content.lessons,opts.lessonConfig);
    const write = await live('PUT','/progress',{baseRevision:0,mutationId:'synthetic-mutation-01',payload:{state:{...createUserState(),hasOnboarded:true},testDraft:createTestDraft()}},a.token);
    assert.equal(write.status,200);
    assert.equal((await live('GET','/progress',null,a.token)).progress.revision,1);
    assert.equal((await live('GET','/progress',null,b.token)).progress.revision,0);
    assert.equal((await redeem(live,1)).learnerId,a.learnerId,'retries reuse the same private profile');
    assert.equal((await live('POST','/session',{code:invite})).status,401,'invitation itself cannot open any profile');
    const revoked = make(store,'');
    assert.equal((await redeem(revoked,3)).status,401);
    assert.equal((await revoked('GET','/course-content',null,b.token)).status,200,'active session still works');
    assert.equal((await revoked('POST','/session',{code:code(2)})).learnerId,b.learnerId,'personal recovery still works');
  } finally {store.close();}
});
test('a 25-person class can redeem concurrently on the same school IP', async () => {
  const store = openSqliteStore(':memory:'); try {
    const live = make(store);
    const results = await Promise.all(Array.from({length:25},(_,i)=>redeem(live,i+1)));
    assert.deepEqual([...new Set(results.map(r=>r.status))],[200]);
    assert.equal(new Set(results.map(r=>r.learnerId)).size,25);
  } finally {store.close();}
});
test('invalid, missing consent and recovery-code collisions cannot mint or elevate accounts', async () => {
  const store = openSqliteStore(':memory:'); try {
    const live = make(store), legacy = await provisionLearner(store);
    assert.equal((await live('POST','/session',{inviteCode:'PILOT-FFFF-FFFF-FFFF-FFFF',code:code(3),consent:true})).status,401);
    assert.equal((await live('POST','/session',{inviteCode:invite,code:code(3),consent:false})).status,400);
    assert.equal((await live('POST','/session',{inviteCode:invite,code:legacy.code,consent:true})).status,409);
    assert.equal((await live('POST','/session',{code:legacy.code})).learnerId,legacy.learnerId);
    assert.equal((await live('POST','/register',{code:code(3),consent:true})).courseAvailable,false);
    assert.equal((await redeem(live,3)).status,409,'free credentials cannot be upgraded by invitation');
    const free = await live('POST','/session',{code:code(3)});
    assert.equal(free.courseAvailable,false);
    assert.equal((await live('GET','/course-content',null,free.token)).status,403);
  } finally {store.close();}
});
