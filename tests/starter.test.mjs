import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { once } from 'node:events';
import { analyze, classify } from '../src/analyze.mjs';
import { renderNote } from '../src/adapters.mjs';
import { makeServer } from '../src/server.mjs';
const fixture = JSON.parse(await fs.readFile(new URL('../examples/archive.json', import.meta.url)));
test('starter rebuild window is configurable without changing the detected evidence', () => {
 const f = [{type:'rebuild', start:'2025-10', end:'2025-12'}];
 assert.equal(classify(f,'2026-06'), 'Fresh Rebuild');
 assert.equal(classify(f,'2026-07'), 'Stale After Rebuild');
 assert.equal(classify(f,'2026-11', {freshRebuildMaxAgeMonths:11}), 'Fresh Rebuild');
 assert.throws(()=>classify(f,'2026-07', {freshRebuildMaxAgeMonths:-1}), /freshRebuildMaxAgeMonths/);
});
test('Attio note preserves the production layout and exposes gaps instead of claiming inactivity', () => {
 const r = analyze(fixture), note = renderNote(r);
 assert.match(note, /### ⧗ Wayback Machine ⧗/);
 assert.match(note, /◈ \*\*April 2026 to June 2026\*\* · _Major Rebuild Signal_/);
 assert.match(note, /│   /);
 assert.match(note, /\[link to wayback machine →\]/);
 assert.ok(note.includes('_'.repeat(111)));
 assert.ok(note.includes('\u00a0\n\n\u00a0'));
 assert.match(note, /Managed by Website History Signals/);
 const bar=note.split('\n').find(l=>/^[▁▂▃▄▅▆▇█\u00a0]+$/.test(l) && /[▁▂▃▄▅▆▇█]/.test(l));
 assert.ok(bar && bar.length<=48);
 const empty=renderNote(analyze({...fixture,homepage:[],inventory:[]}));
 assert.match(empty,/No archived history/);
});
test('full signal HTTP route delivers portable JSON and the formatted note while Clay remains field-only', async () => {
 const server=makeServer({token:'test-token-123456789',analyzer:async()=>analyze(fixture)});
 server.listen(0,'127.0.0.1'); await once(server,'listening');
 try {
  const base=`http://127.0.0.1:${server.address().port}`;
  const opts={method:'POST',headers:{Authorization:'Bearer test-token-123456789'},body:JSON.stringify({domain:fixture.domain})};
  const res=await fetch(base+'/v1/signal',opts);
  assert.equal(res.status,200);
  const body=await res.json();
  assert.equal(body.website_activity_stage,'Fresh Rebuild');
  assert.match(body.note_markdown,/⧗ Wayback Machine ⧗/);
  assert.ok(Array.isArray(body.detected_signals));
  assert.equal(body.coverage,'complete');
  assert.equal(body.schema_version,1);
  const clay=await (await fetch(base+'/v1/analyze',opts)).json();
  assert.equal(clay.website_activity_state,body.website_activity_stage);
  assert.ok(!('note_markdown' in clay));
 } finally {server.close(); await once(server,'close');}
});

test('signal route refuses partial evidence just like the field-only route', async () => {
 const server=makeServer({token:'test-token-123456789',analyzer:async()=>({...analyze(fixture),status:'partial',errors:['inventory incomplete']})});
 server.listen(0,'127.0.0.1'); await once(server,'listening');
 try {
  const res=await fetch(`http://127.0.0.1:${server.address().port}/v1/signal`,{method:'POST',headers:{Authorization:'Bearer test-token-123456789'},body:JSON.stringify({domain:fixture.domain})});
  assert.equal(res.status,503);
  assert.deepEqual((await res.json()).errors,['inventory incomplete']);
 } finally {server.close();await once(server,'close');}
});
