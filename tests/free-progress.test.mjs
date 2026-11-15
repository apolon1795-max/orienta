import test from 'node:test';
import assert from 'node:assert/strict';
import { freshFreeProgress, readFreeProgress, saveFreeProgress, FREE_INTRO_KEY } from '../services/freeProgress.ts';

test('free intro saves only its own tab-scoped key and cannot overwrite a course profile', () => {
 const values=new Map([['appState_ru','private course'],['orienta_sync_v1:someone','private cloud']]);
 const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 const p=freshFreeProgress();p.draft.step='choose_name';p.draft.heroData.race='Эльф';
 assert.equal(saveFreeProgress(storage,p),true);
 assert.equal(readFreeProgress(storage).draft.step,'choose_name');
 saveFreeProgress(storage,freshFreeProgress());
 assert.equal(values.get('appState_ru'),'private course');assert.equal(values.get('orienta_sync_v1:someone'),'private cloud');
});
test('free intro handles unavailable/corrupt storage and forged result safely', () => {
 assert.deepEqual(readFreeProgress({getItem:()=>'{oops'}),freshFreeProgress());
 assert.equal(saveFreeProgress({setItem:()=>{throw Error();}},freshFreeProgress()),false);
 for(const scoreType of ['__proto__','constructor','unknown']) {
  const value={...freshFreeProgress(),result:{scoreType}};
  assert.equal(readFreeProgress({getItem:()=>JSON.stringify(value)}).result,null);
 }
});
