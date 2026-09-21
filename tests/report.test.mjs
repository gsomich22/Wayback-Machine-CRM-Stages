import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const source = new URL('../skills/website-history/scripts/',import.meta.url);
const scripts = existsSync(source) ? source : new URL('../../',import.meta.url);
const {normalizeReport,summarize,toCsv} = await import(new URL('report-data.mjs',scripts));
const {renderReport} = await import(new URL('render-report.mjs',scripts));
const row = {input_id:'1',company:'Example',domain:'example.com',analyzed_at:'2026-09-21',website_activity_state:'Fresh Rebuild',archive_coverage:'complete',resolution:'analyzed',evidence_summary:'Observed change.',archive_url:'https://web.archive.org/web/*/example.com'};
const base = {mode:'leads',generated_at:'2026-09-21',rows:[row]};
test('report keeps incomplete and missing rows in totals without assigning a stage',()=>{
  const r=normalizeReport({...base,rows:[row,{...row,input_id:'2',resolution:'unresolved',archive_coverage:'partial'},{...row,input_id:'3',resolution:'missing_input',analyzed_at:''},{...row,input_id:'4',website_activity_state:'No Strong Signal'}]});
  const s=summarize(r);
  assert.equal(s.total,4);assert.equal(s.analyzed,2);assert.equal(s.informative,1);assert.equal(s.unresolved,2);
  assert.equal(s.counts.reduce((n,c)=>n+c.count,0),4);
  assert.equal(r.rows[1].stage,'Unresolved');assert.equal(r.rows[2].stage,'Missing input');
});
test('customer report uses close-stage and date, preserving multiple deals',()=>{
  const r=normalizeReport({...base,mode:'customers',count_unit:'deals',rows:[{...row,closed_date:'2024-04-12',stage_at_close:'Expanding'},{...row,input_id:'deal2',closed_date:'2025-05-01',stage_at_close:'Gone Quiet'}]});
  assert.equal(r.rows[0].date,'2024-04-12');assert.equal(r.rows[0].stage,'Expanding');assert.equal(summarize(r).total,2);
  assert.throws(()=>normalizeReport({...base,mode:'customers'}),/stage/);
});
test('rejects ambiguous or inconsistent completed inputs; handles empty reports',()=>{
  assert.throws(()=>normalizeReport({...base,rows:[{...row,analyzed_at:'2026-02-30'}]}),/real/);
  assert.throws(()=>normalizeReport({...base,rows:[{...row,archive_coverage:'partial'}]}),/complete/);
  assert.throws(()=>normalizeReport({...base,rows:[{...row,resolution:undefined}]}),/resolution/);
  assert.deepEqual(summarize(normalizeReport({...base,rows:[]})),{total:0,analyzed:0,informative:0,unresolved:0,counts:[]});
});
test('HTML data cannot close its script or create markup; archive links are allowlisted',()=>{
  const attack='</script><img src=x onerror=alert(1)>';
  const input={...base,title:attack,rows:[{...row,company:attack,archive_url:'javascript:alert(1)'}]};
  const html=renderReport(input);
  assert.ok(!html.includes(attack));assert.ok(html.includes('\\u003c/script>'));
  assert.equal(normalizeReport(input).rows[0].archive_url,'');
  assert.equal(normalizeReport({...base,rows:[{...row,archive_url:'https://web.archive.org.evil.test/'}]}).rows[0].archive_url,'');
  assert.ok(html.includes('https://gtmgrace.com'));
  assert.ok(!/<script[^>]+src=/.test(html));assert.ok(!/<link[^>]+href=/.test(html));
});
test('CSV preserves quoted text and neutralizes formulas; unresolved has blank stage',()=>{
  const csv=toCsv(normalizeReport({...base,rows:[{...row,company:'=HYPERLINK("bad")'},{...row,company:'Comma, "name"\nline',resolution:'unresolved',archive_coverage:'partial'}]}));
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(csv.includes('"Comma, ""name""\nline"'));
  assert.ok(csv.includes('"2026-09-21","","unresolved"'));
});
