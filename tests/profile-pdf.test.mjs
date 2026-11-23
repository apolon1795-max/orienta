import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProfilePdf } from '../services/profilePdf.ts';
const sources = ['OrientaText.ttf','OrientaTitle.ttf'].map(name => {
  const bytes = readFileSync(new URL('../public/design/profile-pdf/' + name, import.meta.url));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset+bytes.byteLength);
});
test('exports searchable A4 PDF and paginates a long Cyrillic section', () => {
  const b = buildProfilePdf({hero:'Алёна',archetype:'Творец',sections:[{title:'Мотивация: авторский опросник',lines:['Свобода: 8 баллов', 'Задача'.repeat(480)]}]},sources);
  const body = Buffer.from(b).toString('latin1');
  assert.ok(body.startsWith('%PDF-1.4'));
  assert.ok(body.endsWith('%%EOF\n'));
  assert.ok(body.includes('/MediaBox [0 0 595.28 841.89]'));
  assert.ok(Number(body.match(/\/Type \/Pages \/Count (\d+)/)?.[1]) > 1);
  assert.equal((body.match(/\/ToUnicode /g) || []).length, 2);
  assert.ok(body.includes('<0401>') || body.includes('<0451>'), 'Cyrillic ё must be present in a Unicode map');
  const xref = Number(body.match(/startxref\n(\d+)\n/)?.[1]);
  assert.ok(body.slice(xref).startsWith('xref\n'));
});
