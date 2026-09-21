import fs from 'node:fs/promises';
const dir=new URL('../workflows/n8n/',import.meta.url);
const expr=s=>'={{ '+s+' }}';
function make(name){return {name,nodes:[],connections:{},active:false,settings:{executionOrder:'v1',executionTimeout:900},pinData:{},tags:[]};}
function add(w,name,type,parameters,version=1,notes='') {const n={parameters,id:`node-${w.nodes.length+1}`,name,type:`n8n-nodes-base.${type}`,typeVersion:version,position:[w.nodes.length*240,300],...(notes?{notes,notesInFlow:true}:{})};w.nodes.push(n);return n;}
function link(w,a,b,port=0){w.connections[a]??={main:[]};while(w.connections[a].main.length<=port)w.connections[a].main.push([]);w.connections[a].main[port].push({node:b,type:'main',index:0});}
function code(w,name,jsCode){return add(w,name,'code',{jsCode},2);}
function http(w,name,method,url,body,credential='Attio'){
 return add(w,name,'httpRequest',{method,url,authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',...(body?{sendBody:true,specifyBody:'json',jsonBody:body}:{}),options:{timeout:30000,response:{response:{responseFormat:'json'}},redirect:{redirect:{followRedirects:false}}}},4.2,`Select your ${credential} Header Auth credential here. See QUICKSTART.md.`);
}
function base(name,extra={}){
 const w=make(name);
 add(w,'Run manually','manualTrigger',{});
 add(w,'Setup','set',{assignments:{assignments:Object.entries({domain:'example.com',signals_base_url:'http://localhost:8787',apply_changes:false,...extra}).map(([name,value],i)=>({id:`setting-${i}`,name,value,type:typeof value}))},options:{}},3.4);
 code(w,'Validate setup',String.raw`if ($input.all().length !== 1) throw new Error('Run one company at a time; use a batch-size-one loop for lists.');
const c={...$input.first().json};
if (typeof c.domain !== 'string') throw new Error('Enter a company domain.');
c.domain=c.domain.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0].replace(/\.$/,'');
if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(c.domain)) throw new Error('Enter a public company domain.');
if (typeof c.signals_base_url !== 'string' || !/^https?:\/\/[^\s@?#]+$/.test(c.signals_base_url)) throw new Error('Enter the Signals service URL.');
c.signals_base_url=c.signals_base_url.replace(/\/+$/,'');
if (typeof c.apply_changes !== 'boolean') throw new Error('apply_changes must be a boolean.');
if (c.stage_attribute && !/^[a-z0-9_]+$/.test(c.stage_attribute)) throw new Error('Use the Attio attribute API slug for stage_attribute.');
return [{json:c}];`);
 const analysis=http(w,'Analyze website','POST',expr("$json.signals_base_url + '/v1/signal'"),expr('JSON.stringify({domain:$json.domain})'),'Signals');analysis.parameters.options.timeout=400000;
 code(w,'Preview signal',String.raw`const r=$input.first().json;
if (r.coverage!=='complete' || !r.website_activity_stage || r.domain!==$('Validate setup').first().json.domain) throw new Error('Incomplete or mismatched analysis; do not update the CRM.');
return [{json:r}];`);
 const ns=['Run manually','Setup','Validate setup','Analyze website','Preview signal'];for(let i=0;i<ns.length-1;i++)link(w,ns[i],ns[i+1]);
 return w;
}
function gate(w){
 add(w,'Apply changes?','if',{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:'apply-enabled',leftValue:expr("$('Validate setup').first().json.apply_changes"),rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}},2.2);
 link(w,'Preview signal','Apply changes?');
 code(w,'Preview only',"return [{json:{applied:false,message:'Preview only. Review the signal, then set apply_changes to true in Setup.',signal:$('Preview signal').first().json}}];");
 link(w,'Apply changes?','Preview only',1);
}
const attio=base('Website History · Attio stage and company note',{stage_attribute:'website_activity_state'});gate(attio);
http(attio,'Find company','POST','https://api.attio.com/v2/objects/companies/records/query',expr("JSON.stringify({filter:{domains:{domain:{$eq:$('Preview signal').first().json.domain}}},limit:2})"));link(attio,'Apply changes?','Find company');
code(attio,'Resolve company',String.raw`const records=$input.first().json.data;
const signal=$('Preview signal').first().json;
if(!Array.isArray(records) || records.length!==1) throw new Error('Expected exactly one existing Attio company for this domain. Resolve the match in Attio and retry.');
const record=records[0];
const domains=(record.values?.domains ?? []).map(v=>String(v.domain ?? '').toLowerCase().replace(/^www\./,'').replace(/\.$/,''));
if(!domains.includes(signal.domain)) throw new Error('Matched company domain does not equal the analyzed domain.');
const recordId=record.id?.record_id;
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recordId ?? '')) throw new Error('Missing valid Attio company record ID.');
return [{json:{...signal,recordId}}];`);link(attio,'Find company','Resolve company');
const notes=http(attio,'Find managed note','GET','https://api.attio.com/v2/notes');
notes.parameters.sendQuery=true;notes.parameters.queryParameters={parameters:[{name:'parent_object',value:'companies'},{name:'parent_record_id',value:expr('$json.recordId')},{name:'limit',value:'50'}]};
notes.parameters.options.pagination={pagination:{paginationMode:'updateAParameterInEachRequest',parameters:{parameters:[{type:'qs',name:'offset',value:expr('$pageCount * 50')}]},paginationCompleteWhen:'other',completeExpression:expr('$response.body.data.length < 50'),limitPagesFetched:true,maxRequests:40,requestInterval:150}};
link(attio,'Resolve company','Find managed note');
code(attio,'Prepare Attio write',String.raw`const r=$('Resolve company').first().json;
const config=$('Validate setup').first().json;
const pages=$input.all().map(i=>i.json);
if(!pages.length || pages.some(p=>!Array.isArray(p.data)) || pages.at(-1).data.length>=50) throw new Error('Note lookup incomplete. Stop before writing; check pagination.');
const matches=pages.flatMap(p=>p.data).filter(n=>n.title===r.note_title);
if(matches.length>1) throw new Error('Multiple matching notes. Resolve duplicates in Attio before retrying.');
const existing=matches[0];
if(existing && !(existing.content_plaintext ?? existing.content_markdown ?? '').includes('Managed by Website History Signals')) throw new Error('The matching note is not managed by this starter. Rename it before continuing.');
const noteId=existing?.id?.note_id;
if(existing && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(noteId ?? '')) throw new Error('Missing valid note ID.');
const note={title:r.note_title,format:'markdown',content:r.note_markdown};
return [{json:{recordId:r.recordId,recordBody:{data:{values:{[config.stage_attribute]:r.website_activity_stage}}},noteMethod:existing?'PATCH':'POST',noteUrl:'https://api.attio.com/v2/notes'+(existing?'/'+encodeURIComponent(noteId):''),noteBody:{data:existing?note:{parent_object:'companies',parent_record_id:r.recordId,...note}}}}];`);link(attio,'Find managed note','Prepare Attio write');
http(attio,'Update website stage','PATCH',expr("'https://api.attio.com/v2/objects/companies/records/' + $json.recordId"),expr('JSON.stringify($json.recordBody)'));link(attio,'Prepare Attio write','Update website stage');
http(attio,'Create or update note',expr("$('Prepare Attio write').first().json.noteMethod"),expr("$('Prepare Attio write').first().json.noteUrl"),expr("JSON.stringify($('Prepare Attio write').first().json.noteBody)"));link(attio,'Update website stage','Create or update note');
code(attio,'Done',"return [{json:{applied:true,domain:$('Preview signal').first().json.domain,website_activity_state:$('Preview signal').first().json.website_activity_stage,note_action:$('Prepare Attio write').first().json.noteMethod==='POST'?'created':'updated'}}];");link(attio,'Create or update note','Done');
const generic=base('Website History · Portable stage field');
code(generic,'Stage field output',"const r=$input.first().json; return [{json:{domain:r.domain,website_activity_state:r.website_activity_stage,analyzed_at:r.analyzed_at,archive_url:r.archive_url,coverage:r.coverage}}];");link(generic,'Preview signal','Stage field output');
const apollo=base('Website History · Apollo account stage field',{account_id:'YOUR_APOLLO_ACCOUNT_ID',stage_field_id:'YOUR_ACCOUNT_CUSTOM_FIELD_ID'});gate(apollo);
code(apollo,'Prepare Apollo write',String.raw`const c=$('Validate setup').first().json, r=$('Preview signal').first().json;
const fieldId=String(c.stage_field_id ?? '').replace(/^account\./,'');
if(!/^[0-9a-f]{24}$/i.test(c.account_id ?? '') || !/^[0-9a-f]{24}$/i.test(fieldId)) throw new Error('Enter the Apollo account ID and custom account field ID. The field ID can begin with account.');
return [{json:{accountId:c.account_id,body:{typed_custom_fields:{[fieldId]:r.website_activity_stage}}}}];`);link(apollo,'Apply changes?','Prepare Apollo write');
http(apollo,'Update Apollo field','PATCH',expr("'https://api.apollo.io/api/v1/accounts/' + $json.accountId"),expr('JSON.stringify($json.body)'),'Apollo');link(apollo,'Prepare Apollo write','Update Apollo field');
for(const [file,w] of [['attio-website-history-note.json',attio],['generic-stage-field.json',generic],['apollo-stage-field.json',apollo]]){
 add(w,'Read me first','stickyNote',{content:'## Start here\n1. Read QUICKSTART.md and docs/n8n.md.\n2. Set the domain and service URL in Setup.\n3. Connect the named Header Auth credentials to HTTP nodes.\n4. Keep apply_changes false for a preview.\n\nRun ONE company per execution. Use a batch-size-one loop for lists.\nNo credentials or customer data are included.\nAn analysis service is required; this workflow is an adapter.',height:320,width:450},1);
 w.nodes.at(-1).position=[0,-100];
 await fs.writeFile(new URL(file,dir),JSON.stringify(w,null,2)+'\n');
}
