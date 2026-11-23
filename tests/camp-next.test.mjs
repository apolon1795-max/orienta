import test from 'node:test';
import assert from 'node:assert/strict';
import { campNext } from '../services/campNext.ts';
const blank={signedIn:false,hasLocalResult:false,hasSavedResult:false,testStarted:false,courseAvailable:false,courseStarted:false,courseComplete:false,cardReady:false,transfer:'hidden'};
const next=patch=>campNext({...blank,...patch});
test('first run prioritizes test even when signed in and entitled',()=>{
 assert.equal(next({}).step,'test');
 assert.equal(next({signedIn:true,courseAvailable:true}).step,'test');
 assert.equal(next({testStarted:true}).label,'Продолжить тест на архетип');
});
test('finished local result signs in or explicitly saves, never bypasses transfer',()=>{
 assert.equal(next({hasLocalResult:true}).step,'sign-in');
 assert.equal(next({signedIn:true,courseAvailable:true,hasLocalResult:true,courseStarted:true,transfer:'available'}).step,'transfer');
 assert.equal(next({signedIn:true,courseAvailable:true,hasLocalResult:true,transfer:'blocked'}).step,'map');
});
test('first eligible course entry opens map; returning course opens saved continuation',()=>{
 const ready={signedIn:true,hasSavedResult:true,courseAvailable:true};
 assert.equal(next(ready).step,'map');
 assert.match(next(ready).help,/приветственное видео/);
 assert.equal(next({...ready,courseStarted:true}).step,'resume');
 assert.equal(next({...ready,courseStarted:true,courseComplete:true,cardReady:true}).step,'profile');
 assert.equal(next({...ready,courseAvailable:false}).step,'wait');
});
