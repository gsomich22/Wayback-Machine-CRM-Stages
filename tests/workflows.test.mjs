import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const folder=new URL('../workflows/n8n/',import.meta.url);
async function workflow(name){return JSON.parse(await fs.readFile(new URL(name,folder),'utf8'));}
function execute(w,name,input,previous={}) {
 const code=w.nodes.find(n=>n.name===name).parameters.jsCode;
 return vm.runInNewContext(`(function(){${code}\n})()`,{$input:{all:()=>input.map(json=>({json})),first:()=>({json:input[0]})},$:(key)=>({first:()=>({json:previous[key]}),all:()=>previous[key].map(json=>({json}))})});
}
const recordId='11111111-1111-4111-8111-111111111111';
const signal={domain:'example.com',coverage:'complete',website_activity_stage:'Fresh Rebuild',note_title:'Website History · example.com',note_markdown:'Managed by Website History Signals'};
test('Attio workflow rejects ambiguous company matching and mismatched domains',async()=>{
 const w=await workflow('attio-website-history-note.json');
 const record={id:{record_id:recordId},values:{domains:[{domain:'example.com'}]}};
 assert.equal(execute(w,'Resolve company',[{data:[record]}],{'Preview signal':signal})[0].json.recordId,recordId);
 assert.throws(()=>execute(w,'Resolve company',[{data:[]}],{'Preview signal':signal}),/exactly one/);
 assert.throws(()=>execute(w,'Resolve company',[{data:[record,record]}],{'Preview signal':signal}),/exactly one/);
 assert.throws(()=>execute(w,'Resolve company',[{data:[{...record,values:{domains:[{domain:'other.com'}]}}]}],{'Preview signal':signal}),/domain/);
});
test('Attio workflow reuses its note and stops for unowned, duplicate or truncated results',async()=>{
 const w=await workflow('attio-website-history-note.json');
 const prev={'Resolve company':{...signal,recordId},'Validate setup':{stage_attribute:'website_activity_state'}};
 const owned={title:signal.note_title,content_plaintext:'Managed by Website History Signals',id:{note_id:recordId}};
 const run=pages=>execute(w,'Prepare Attio write',pages,prev)[0].json;
 assert.equal(run([{data:[]}]).noteMethod,'POST');
 assert.equal(run([{data:[owned]}]).noteMethod,'PATCH');
 assert.equal(JSON.stringify(run([{data:[owned]}]).recordBody.data.values.website_activity_state),JSON.stringify(['Fresh Rebuild']));
 assert.equal(w.nodes.find(n=>n.name==='Update website stage').parameters.method,'PUT');
 assert.throws(()=>run([{data:[{...owned,content_plaintext:'my own research'}]}]),/not managed/);
 assert.throws(()=>run([{data:[owned,owned]}]),/Multiple/);
 assert.throws(()=>run([{data:Array.from({length:50},()=>({title:'Other'}))}]),/incomplete/);
});
test('workflows are credential-free and all graph connections and code nodes resolve',async()=>{
 for(const name of ['attio-website-history-note.json','generic-stage-field.json','apollo-stage-field.json']) {
  const w=await workflow(name); assert.equal(w.active,false);
  const names=new Set(w.nodes.map(n=>n.name));
  assert.equal(names.size,w.nodes.length);
  for(const [source,ports] of Object.entries(w.connections)) {assert.ok(names.has(source));for(const out of ports.main)for(const link of out)assert.ok(names.has(link.node));}
  for(const n of w.nodes){assert.ok(!n.credentials);if(n.type==='n8n-nodes-base.code')new vm.Script(`(function(){${n.parameters.jsCode}\n})`);}
  assert.deepEqual(w.pinData,{});
 }
});

test('workflow preview blocks partial or mismatched signals and Apollo writes only the custom field',async()=>{
 const w=await workflow('apollo-stage-field.json');
 const prev={'Validate setup':{domain:'example.com',account_id:'123456789012345678901234',stage_field_id:'account.abcdefabcdefabcdefabcdef',stage_field_type:'text'},'Preview signal':signal};
 assert.throws(()=>execute(w,'Preview signal',[{...signal,coverage:'partial'}],prev),/Incomplete/);
 assert.throws(()=>execute(w,'Preview signal',[{...signal,domain:'other.com'}],prev),/mismatched/);
 const body=execute(w,'Prepare Apollo write',[signal],prev)[0].json.body;
 assert.equal(body.typed_custom_fields.abcdefabcdefabcdefabcdef,'Fresh Rebuild');
 assert.equal(Object.keys(body).join(','),'typed_custom_fields');
 assert.throws(()=>execute(w,'Prepare Apollo write',[signal],{...prev,'Validate setup':{...prev['Validate setup'],stage_field_id:'placeholder'}}),/account ID/);
});

test('Apollo workflow defaults to multi-select and fails before writing unmapped options',async()=>{
 const w=await workflow('apollo-stage-field.json');
 assert.equal(w.nodes.find(n=>n.name==='Setup').parameters.assignments.assignments.find(a=>a.name==='stage_field_type').value,'multiselect');
 const prev={'Validate setup':{account_id:'123456789012345678901234',stage_field_id:'abcdefabcdefabcdefabcdef',stage_option_ids:JSON.stringify({'Fresh Rebuild':'option-1'})},'Preview signal':signal};
 const value=execute(w,'Prepare Apollo write',[signal],prev)[0].json.body.typed_custom_fields.abcdefabcdefabcdefabcdef;
 assert.equal(JSON.stringify(value),JSON.stringify(['option-1']));
 assert.throws(()=>execute(w,'Prepare Apollo write',[signal],{...prev,'Validate setup':{...prev['Validate setup'],stage_option_ids:'{}'}}),/option ID/);
});
