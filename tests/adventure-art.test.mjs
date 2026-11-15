import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
test('every hero has all five scenes and four archetypes',()=>{
 for(const race of ['human','elf','orc','troll']) for(const scene of ['q1','q2','q3','q4','q5','Commander','Creator','Researcher','Communicator']) {
   const file=resolve(root,`public/design/heroes/${race}/${scene}.webp`);
   assert.ok(existsSync(file),`${race}/${scene}`);
   const data=readFileSync(file);assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
 }
 for(const scene of ['group','pigeon'])assert.ok(existsSync(resolve(root,`public/design/general/${scene}.webp`)));
});
test('three approved camp icons remain unchanged',()=>{
 const expected={"archetype": "c5c1cfa315c1e257340bd3ff9122e15983894bf9f71947e550a4e1f0f43d1a40", "course": "2bce7cfc97712785ebd192642fa34d54bfe35eed63cc6517b2a53effe781bf15", "community": "4c9795d607f503669f69eb03419fe96427de01313dfb2e1a15916ce3caa8fca7"};
 for(const [name,hash] of Object.entries(expected))assert.equal(createHash('sha256').update(readFileSync(resolve(root,`public/design/${name}.png`))).digest('hex'),hash);
});
