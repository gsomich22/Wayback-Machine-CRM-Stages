import React, {useState, useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import AnimatedList from './components/AnimatedList.jsx';
import {summarize, STAGES, COLORS} from '../../../skills/website-history-lite/scripts/report-data.mjs';
import './fonts.css';
import './report.css';
const report = JSON.parse(document.getElementById('report-data').textContent);
const stats = summarize(report);
const customer = report.mode === 'customers';
const color = stage => COLORS[[...STAGES,'Unresolved','Missing input'].indexOf(stage)] || '#A0908F';
const monthLabel = value => {
  if (!/^\d{4}-\d{2}$/.test(value || '')) return value || '';
  return new Date(`${value}-15T12:00:00Z`).toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
};
// Plain anchors with a visible fallback address: some chat previews block new tabs, so the link text stays copyable.
function ArchiveLink({href, children}) {
  return <a className="archive-link" href={href} target="_blank" rel="noopener noreferrer" title={href}>{children} <span aria-hidden="true">↗</span></a>;
}
function Badge({stage, large}) {return <span className={large ? 'badge badge-large' : 'badge'} style={{'--stage-color':color(stage)}}>{stage}</span>}
function EvidencePoints({row}) {
  const source=row.error || row.evidence_summary || 'No supporting summary was supplied.';
  const summary=source.startsWith(row.stage+'. ') ? source.slice(row.stage.length+2) : source;
  const points=summary.split(/(?<=[.!?])\s+(?=[A-Z])|[\r\n]+|;\s+(?=[A-Z])/u).map(s=>s.trim()).filter(Boolean);
  return <ul className="evidence-points">{points.map((point,index)=>{
    const label=point.match(/^([^:]{1,65}):\s*(.+)$/);
    return <li key={index}>{label ? <><strong>{label[1]}:</strong> {label[2]}</> : point}</li>;
  })}</ul>;
}
function DateLink({href, label}) {
  return href ? <a className="date-link" href={href} target="_blank" rel="noopener noreferrer" title={`Archived snapshot, ${label}`}>{label} <span aria-hidden="true">↗</span></a> : <b>{label}</b>;
}
const CalendarIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>;
function SignalWindow({row}) {
  if (!row.signal_start) return null;
  return <div className="signal-window" style={{'--stage-color':color(row.stage)}}>
    <span className="signal-icon"><CalendarIcon/></span>
    <div className="signal-body">
      <span className="signal-title">When it changed</span>
      <div className="signal-track">
        <div className="signal-point"><DateLink href={row.before_url} label={monthLabel(row.signal_start)}/></div>
        {row.signal_end && row.signal_end !== row.signal_start && <><span className="signal-line" aria-hidden="true"/><div className="signal-point"><DateLink href={row.after_url} label={monthLabel(row.signal_end)}/></div></>}
      </div>
    </div>
  </div>;
}
function Shots({label, list}) {
  if (!list.length) return null;
  return <figure className="shots"><figcaption>{label}</figcaption><div className="shots-row">{list.map((img,i)=><a key={i} href={img.archive_url || undefined} target="_blank" rel="noopener noreferrer" className="shot" title={img.captured ? `Archived capture, ${img.captured}` : 'Archived capture'}><img src={img.src} alt={`${label} archived image ${i+1}`} loading="lazy"/>{img.captured && <span>{img.captured}</span>}</a>)}</div></figure>;
}
function Company({row,index}) {
  return <details className="company-card" style={{'--stage-color':color(row.stage)}}><summary>
    <span className="row-num">{String(index+1).padStart(2,'0')}</span>
    <span className="company"><strong>{row.company}</strong>{row.domain ? <a className="domain-link" href={`https://${row.domain}`} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}>{row.domain}</a> : <span>Domain missing</span>}</span>
    <Badge stage={row.stage} large/><span className="expand" aria-hidden="true">+</span>
  </summary><div className="evidence"><SignalWindow row={row}/><div><h3>{row.resolution === 'analyzed' ? 'What the archive tells us' : 'Needs a closer look'}</h3><EvidencePoints row={row}/>
    {row.archive_url && <ArchiveLink href={row.archive_url}>Explore the full archive</ArchiveLink>}
  </div>
    {(row.before_images.length > 0 || row.after_images.length > 0) && <div className="visuals"><Shots label="Before" list={row.before_images}/><Shots label="After" list={row.after_images}/><p className="visuals-note">Real images the site served, pulled from the archive at each end of the window.</p></div>}
  </div></details>;
}
function App() {
  const [query,setQuery]=useState(''), [stage,setStage]=useState('All stages'), [page,setPage]=useState(1);
  const filtered = useMemo(()=>report.rows.filter(r=>(stage==='All stages'||r.stage===stage)&&`${r.company} ${r.domain}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())),[query,stage]);
  const visible=filtered.slice(0,page*50);
  const setFilter=s=>{setStage(s);setPage(1)};
  const stageCount=stats.counts.filter(c=>!['Unresolved','Missing input'].includes(c.stage)).length;
  const jumpTo=s=>{setFilter(stage===s ? 'All stages' : s);document.getElementById('results').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})};
  return <>
    <div className="page-shell">
      <header className="masthead"><a className="wordmark" href="https://www.gtmgrace.com/" target="_blank" rel="noopener noreferrer" aria-label="GTM Grace website">gtm<span>grace</span><b>✳</b></a>{report.demo && <span className="demo-label">Synthetic demo</span>}</header>
      <main>
        <section className="hero"><div className="hero-copy">
          <h1>{customer ? <>Before they bought,<br/><em>the web left clues.</em></> : <>Good timing.<br/><em>Written in the web.</em></>}</h1>
          <p className="hero-sub">{customer ? 'A look at the website patterns present when your customers closed. A little more context for what comes next.' : 'A clearer view of where your leads are today, through the changes their websites left behind.'}</p>
        </div><div className="cover-art" aria-hidden="true"><div className="art-orbit"/><span className="art-caption">The past has patterns.</span><div className="art-block block-one"><span>Observe</span><b>↗</b></div><div className="art-block block-two"><span>Connect</span><div className="art-lines"><i/><i/><i/><i/><i/></div></div><div className="art-block block-three"><span>Understand</span><b>✳</b></div><span className="art-foot">Less guesswork. More context.</span></div></section>
        <section className="metrics" aria-label="Report summary"><div className="metric"><span className="metric-label">In this collection</span><strong>{stats.total.toLocaleString()}</strong><span>{report.count_unit} in the cohort</span></div><div className="metric"><span className="metric-label">Archive reads complete</span><strong>{stats.analyzed.toLocaleString()}<small> / {stats.total}</small></strong><span>{stats.informative} with an informative stage</span></div><div className="metric"><span className="metric-label">Keep in view</span><strong>{String(stats.unresolved).padStart(2,'0')}</strong><span>unresolved or missing input</span></div></section>
        <section className="distribution"><div className="panel-heading"><h2>Stage <em>mix</em></h2><span>{stageCount} {stageCount===1 ? 'stage' : 'stages'} · {stats.total} {report.count_unit}</span></div>
          {stats.total ? <><div className="stacked-bar" role="img" aria-label={stats.counts.map(c=>`${c.stage}: ${c.count} of ${stats.total}`).join('; ')}>{stats.counts.map(c=><span key={c.stage} style={{flexGrow:c.count,background:c.color}} title={`${c.stage}: ${c.count}`}/>)}</div>
          <div className="stage-tiles">{stats.counts.map(c=><button key={c.stage} className={stage===c.stage ? 'stage-tile active' : 'stage-tile'} style={{'--stage-color':c.color}} onClick={()=>jumpTo(c.stage)} aria-pressed={stage===c.stage}><b>{c.count}</b><span>{c.stage}</span><small>{Math.round(c.count/stats.total*100)}%</small></button>)}</div></> : <p className="empty">No records in this collection yet.</p>}
          <p className="chart-note">Share of all {stats.total} {report.count_unit}. Tap a stage to filter the companies below. Unresolved is never treated as quiet.</p>
        </section>
        <section className="results interactive-results" id="results"><div className="results-heading"><h2>Company <em>Drill-Down</em></h2></div>
          <div className="toolbar"><label className="search"><span aria-hidden="true">⌕</span><input aria-label="Search companies" placeholder="Find a company or domain…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></label><label className="filter"><span className="sr-only">Filter by stage</span><select value={stage} onChange={e=>setFilter(e.target.value)}><option>All stages</option>{stats.counts.map(c=><option key={c.stage}>{c.stage}</option>)}</select></label><span className="result-count" aria-live="polite">{filtered.length} of {stats.total} {report.count_unit}</span></div>
          {visible.length ? <AnimatedList items={visible} renderItem={(row,index)=><Company row={row} index={index}/>}/> : <div className="empty">{stats.total ? 'No matches. Try another name or stage.' : 'No records were supplied for this report.'}{stats.total>0&&<button onClick={()=>{setQuery('');setFilter('All stages')}}>Clear filters</button>}</div>}
          {visible.length<filtered.length && <button className="load-more" onClick={()=>setPage(page+1)}>Show next {Math.min(50,filtered.length-visible.length)} records ↓</button>}
        </section>
        <section className="print-only"><h2>All results</h2>{report.rows.map((r,i)=><article key={i}><h3>{r.company}: {r.stage}</h3><p>{r.domain}{r.signal_start ? ` · Changed ${monthLabel(r.signal_start)}${r.signal_end && r.signal_end!==r.signal_start ? ` to ${monthLabel(r.signal_end)}` : ''}` : ''}</p><p>{r.error || r.evidence_summary}</p>{r.archive_url&&<p>{r.archive_url}</p>}</article>)}</section>
      </main>
      <footer className="signature"><div><span className="signature-tag">A little research. A better starting point.</span><p>Made with <em>perspective.</em></p></div><a className="signature-link" href="https://www.gtmgrace.com/" target="_blank" rel="noopener noreferrer">gtmgrace.com <b aria-hidden="true">↗</b></a></footer>
    </div>
  </>;
}
createRoot(document.getElementById('root')).render(<App/>);
