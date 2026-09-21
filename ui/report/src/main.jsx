import React, {useState, useMemo, useRef} from 'react';
import {createRoot} from 'react-dom/client';
import AnimatedList from './components/AnimatedList.jsx';
import {summarize, STAGES, COLORS, toCsv} from '../../../skills/website-history/scripts/report-data.mjs';
import './report.css';
const report = JSON.parse(document.getElementById('report-data').textContent);
const stats = summarize(report);
const customer = report.mode === 'customers';
const dateLabel = value => value ? new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}) : 'Date unavailable';
const color = stage => COLORS[STAGES.indexOf(stage)] || '#9b9486';
function saveCsv() {
  const url = URL.createObjectURL(new Blob(['\ufeff',toCsv(report)],{type:'text/csv;charset=utf-8'}));
  const a = document.createElement('a'); a.href=url; a.download=`website-history-${report.mode}-${report.generated_at}.csv`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Badge({stage}) {return <span className="badge" style={{'--stage-color':color(stage)}}><i/>{stage}</span>}
function Company({row,index}) {
  return <details className="company-card"><summary>
    <span className="row-num">{String(index+1).padStart(2,'0')}</span>
    <span className="company"><strong>{row.company}</strong><span>{row.domain || 'Domain missing'}</span></span>
    <span className="row-date"><small>{customer ? 'Closed' : 'As of'}</small>{dateLabel(row.date)}</span>
    <Badge stage={row.stage}/><span className="expand" aria-hidden="true">+</span>
  </summary><div className="evidence"><div><span className="eyebrow">{row.resolution === 'analyzed' ? 'What the archive tells us' : 'Needs a closer look'}</span><p>{row.error || row.evidence_summary || 'No supporting summary was supplied.'}</p>
    {row.archive_url && <a href={row.archive_url} target="_blank" rel="noopener noreferrer">Explore the archive <span aria-hidden="true">↗</span></a>}
  </div><dl><div><dt>Archive retrieval</dt><dd>{row.archive_coverage}</dd></div><div><dt>Signal window</dt><dd>{row.signal_start || '—'}{row.signal_end && ` → ${row.signal_end}`}</dd></div><div><dt>Record reference</dt><dd>{row.input_id}</dd></div></dl></div></details>;
}
function App() {
  const [exportAction,setExportAction]=useState(null), [copyStatus,setCopyStatus]=useState('');
  const requestRef=useRef(null);
  const embedded=window.self!==window.top;
  const request=exportAction==='csv'
    ? 'Please attach a downloadable CSV of all records in the website-history report already generated in this conversation. Use the existing results; do not rerun archive analysis or change CRM data.'
    : 'Please provide a print-ready PDF of the website-history report already generated in this conversation. If PDF generation is unavailable, attach the existing HTML file and explain how to open it in a browser and print or save as PDF. Use the existing results; do not rerun archive analysis or change CRM data.';
  function exportOrHelp(action) {
    setExportAction(action);setCopyStatus('');
    if (!embedded) {
      try {if(action==='csv') saveCsv(); else window.print();}
      catch { /* The visible help panel also covers a blocked browser action. */ }
    }
  }
  async function copyRequest() {
    try {await navigator.clipboard.writeText(request);setCopyStatus('Copied. Paste this into your conversation.');}
    catch {requestRef.current?.focus();requestRef.current?.select();setCopyStatus('Select and copy the request below, then paste it into your conversation.');}
  }
  const [query,setQuery]=useState(''), [stage,setStage]=useState('All stages'), [page,setPage]=useState(1);
  const filtered = useMemo(()=>report.rows.filter(r=>(stage==='All stages'||r.stage===stage)&&`${r.company} ${r.domain} ${r.input_id}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())),[query,stage]);
  const visible=filtered.slice(0,page*50);
  const setFilter=s=>{setStage(s);setPage(1)};
  const stageCount=stats.counts.filter(c=>!['Unresolved','Missing input'].includes(c.stage)).length;
  return <>
    <div className="page-shell">
      <header className="masthead"><a className="wordmark" href="https://www.gtmgrace.com/" target="_blank" rel="noopener noreferrer" aria-label="GTM Grace website">gtm<span>grace</span><b>✳</b></a><span className="masthead-label">WEBSITE INTELLIGENCE</span><span className="edition">FIELD NOTES / {report.generated_at.slice(0,4)}</span></header>
      <main>
        <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="status-dot"/>{customer ? 'The customer edition' : 'The lead edition'}{report.demo && <span className="demo-label">Synthetic demo</span>}</div>
          <h1>{customer ? <>Before they bought,<br/><em>the web left clues.</em></> : <>Good timing.<br/><em>Written in the web.</em></>}</h1>
          <p className="hero-sub">{customer ? 'A look at the website patterns present when your customers closed. A little more context for what comes next.' : 'A clearer view of where your leads are today, through the changes their websites left behind.'}</p>
          <div className="report-meta"><span>{report.title}</span><span>{dateLabel(report.generated_at)}</span></div>
        </div><div className="cover-art" aria-hidden="true"><div className="art-orbit"/><span className="art-caption">THE PAST HAS PATTERNS.</span><div className="art-block block-one"><span>01 / OBSERVE</span><b>↗</b></div><div className="art-block block-two"><span>02 / CONNECT</span><div className="art-lines"><i/><i/><i/><i/><i/></div></div><div className="art-block block-three"><span>03 / UNDERSTAND</span><b>✳</b></div><span className="art-foot">LESS GUESSWORK. MORE CONTEXT.</span></div></section>
        <section className="metrics" aria-label="Report summary"><div className="metric"><span className="eyebrow">In this collection</span><strong>{stats.total.toLocaleString()}</strong><span>{report.count_unit} in the cohort</span></div><div className="metric"><span className="eyebrow">Archive reads complete</span><strong>{stats.analyzed.toLocaleString()}<small> / {stats.total}</small></strong><span>{stats.informative} with an informative stage</span></div><div className="metric"><span className="eyebrow">Keep in view</span><strong>{String(stats.unresolved).padStart(2,'0')}<span className="metric-asterisk">✳</span></strong><span>unresolved or missing input</span></div></section>
        <section className="distribution"><div className="section-intro"><span className="eyebrow">01 / The bigger picture</span><h2>Patterns, meet<br/><em>perspective.</em></h2><p>{report.cohort}</p><p className="muted">{customer ? 'Each stage uses archive evidence through that record’s close date.' : 'Each stage reflects archive evidence through its analysis date.'} Counts represent {report.count_unit}; every row is included.</p></div><div className="stage-panel"><div className="panel-heading"><strong>Stage mix</strong><span>{stageCount} {stageCount===1 ? 'stage' : 'stages'} · {stats.total} {report.count_unit}</span></div>
          {stats.total ? <><div className="stacked-bar" role="img" aria-label={stats.counts.map(c=>`${c.stage}: ${c.count} of ${stats.total}`).join('; ')}>{stats.counts.map(c=><span key={c.stage} style={{width:`${c.count/stats.total*100}%`,background:c.color}}/>)}</div><div className="stage-legend">{stats.counts.map(c=><button key={c.stage} className={stage===c.stage ? 'legend-row active' : 'legend-row'} onClick={()=>{setFilter(stage===c.stage ? 'All stages' : c.stage);document.getElementById('results').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}} aria-pressed={stage===c.stage}><span><i style={{background:c.color}}/>{c.stage}</span><span><b>{c.count}</b><small>{Math.round(c.count/stats.total*100)}%</small></span></button>)}</div></> : <p className="empty">No records in this collection yet.</p>}
          <p className="chart-note">Share of all {stats.total} {report.count_unit}. Unresolved is never treated as quiet.</p>
        </div></section>
        <section className="results interactive-results" id="results"><div className="results-heading"><div><span className="eyebrow">02 / The details</span><h2>Every company.<br className="mobile-break"/> <em>A little clearer.</em></h2></div><div className="actions"><button onClick={()=>exportOrHelp('csv')}>Export all CSV <span aria-hidden="true">↓</span></button><button className="print-button" onClick={()=>exportOrHelp('print')} aria-label="Print full report">Print ↗</button></div></div>
          {exportAction && <section className="export-help" aria-label="Export and print help"><div className="export-help-heading"><strong>{embedded ? 'Get this file from your assistant' : 'If the browser action did not open'}</strong><button aria-label="Dismiss export help" onClick={()=>setExportAction(null)}>×</button></div><p>{embedded ? 'Chat previews can block downloads and printing. Use the CSV attached to the conversation, or download the HTML and open it in a browser. You can also copy this request for your assistant.' : 'Use the attached CSV, or open this HTML as a downloaded file in your browser. You can also ask your assistant using the request below.'}</p><label htmlFor="export-request">Request for your assistant</label><textarea id="export-request" ref={requestRef} readOnly value={request} onFocus={e=>e.target.select()}/><div className="copy-row"><button onClick={copyRequest}>Copy request</button><span role="status">{copyStatus || 'This does not send a message or update your CRM.'}</span></div></section>}
          <div className="toolbar"><label className="search"><span aria-hidden="true">⌕</span><input aria-label="Search companies" placeholder="Find a company or domain…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></label><label className="filter"><span className="sr-only">Filter by stage</span><select value={stage} onChange={e=>setFilter(e.target.value)}><option>All stages</option>{stats.counts.map(c=><option key={c.stage}>{c.stage}</option>)}</select></label><span className="result-count" aria-live="polite">{filtered.length} of {stats.total} {report.count_unit}</span></div>
          {visible.length ? <AnimatedList items={visible} renderItem={(row,index)=><Company row={row} index={index}/>}/> : <div className="empty">{stats.total ? 'No matches. Try another name or stage.' : 'No records were supplied for this report.'}{stats.total>0&&<button onClick={()=>{setQuery('');setFilter('All stages')}}>Clear filters</button>}</div>}
          {visible.length<filtered.length && <button className="load-more" onClick={()=>setPage(page+1)}>Show next {Math.min(50,filtered.length-visible.length)} records ↓</button>}
        </section>
        <section className="print-only"><h2>All results</h2>{report.rows.map((r,i)=><article key={i}><h3>{r.company} — {r.stage}</h3><p>{r.domain} · {customer?'Closed':'As of'} {r.date || 'Date unavailable'} · Retrieval: {r.archive_coverage}</p><p>{r.error || r.evidence_summary}</p>{r.archive_url&&<p>{r.archive_url}</p>}</article>)}</section>
        <aside className="method-note"><span className="note-symbol" aria-hidden="true">↳</span><div><strong>Context is the point.</strong><p>Website stages describe archive patterns, not buying intent or verified redesign dates. {customer ? 'Customer patterns are retrospective; this cohort alone cannot predict who will buy.' : 'Review the evidence before choosing an outreach angle.'} No Strong Signal and Insufficient History remain visible in the results. This report does not update your CRM.</p></div></aside>
      </main>
      <footer className="signature"><div><span className="eyebrow">A little research. A better starting point.</span><p>Made with perspective.</p></div><a href="https://www.gtmgrace.com/" target="_blank" rel="noopener noreferrer"><span>by Grace</span><strong>gtmgrace.com <b aria-hidden="true">↗</b></strong></a></footer>
    </div>
  </>;
}
createRoot(document.getElementById('root')).render(<App/>);
