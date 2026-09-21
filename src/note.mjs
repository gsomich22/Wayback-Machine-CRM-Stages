export const NOTE_MARKER = 'Managed by Website History Signals';
const NBSP = '\u00a0';
const GAP2 = `\n\n${NBSP}\n\n${NBSP}\n\n`;
const GLYPHS = '▁▂▃▄▅▆▇█';
const monthsFull = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const dateLabel = ym => `${monthsFull[Number(ym.slice(5,7))-1]} ${ym.slice(0,4)}`;
// Same presentation budget as the supplied production company-note formatter.
// Include missing calendar years so the labels align with the bar.
export function activityChart(months) {
  if (months.length < 6) return null;
  const ordered = [...months].sort((a,b)=>a.month.localeCompare(b.month));
  const first = Number(ordered[0].month.slice(0,4));
  const last = Number(ordered.at(-1).month.slice(0,4));
  const count = last-first+1;
  // Local fixtures can cover more than the live five-year window.
  if (count > 48) return null;
  const perYear = Math.max(1, Math.min(12, Math.floor(48/count)));
  const years = Array.from({length:count},(_,i)=>first+i);
  const byMonth = new Map(months.map(m=>[m.month,m]));
  let bar = '';
  for (const y of years) for (let b=0;b<perYear;b++) {
    const values=[];
    for (let mo=Math.floor(b*12/perYear)+1; mo<=Math.floor((b+1)*12/perYear); mo++) {
      const m=byMonth.get(`${y}-${String(mo).padStart(2,'0')}`);
      if (m?.chartCoverage === 'good' && Number.isFinite(m.activity)) values.push(m.activity);
    }
    bar += values.length ? GLYPHS[Math.max(0,Math.min(7,Math.round((Math.max(...values)-1)/4*7)))] : NBSP;
  }
  bar=bar.replace(/\u00a0+$/,'');
  if (!bar) return null;
  return {years:years.join(NBSP.repeat(Math.max(1,Math.round(perYear*2.3)-4))),bar};
}
export function renderNote(r) {
  const blocks=[`[${r.domain}](https://${r.domain}) · **${r.state}**`];
  const lines=['### ⧗ Wayback Machine ⧗',''];
  const months=r.homepageMonthly ?? [];
  const chart=activityChart(months);
  if(chart) lines.push(`### ${chart.years}`,chart.bar,'');
  for(const s of r.signals ?? []) {
    const range=s.start===s.end ? dateLabel(s.start) : `${dateLabel(s.start)} to ${dateLabel(s.end)}`;
    lines.push(`◈ **${range}** · _${s.label}_`,`│   ${s.reason}`,`│   ${s.strength} heuristic evidence.`, '');
  }
  if(!r.signals?.length) lines.push(r.status==='unavailable' ? 'Archive history could not be read for this domain.' : !months.length && !r.inventoryMonthly?.length && !r.coverage?.homepageMonths && !r.coverage?.inventoryMonths ? 'No archived history available in the requested window.' : 'No qualifying website-change signal stood out in the available history.', '');
  lines.push(`_[link to wayback machine →](${r.archiveUrl})_`,'',NBSP,'','_'.repeat(111));
  blocks.push(lines.join('\n'));
  blocks.push(`Analyzed: ${r.asOf} · Coverage: ${r.status}\n\nHomepage coverage: ${r.coverage?.homepageMonths ?? 0} months. Inventory coverage: ${r.coverage?.inventoryMonths ?? 0} months.\n\n${r.reviewPrompt}\n\nThe bar summarizes archived homepage activity; blank periods mean missing or thin evidence. Archive metadata does not prove a visual redesign or buying intent.\n\n*${NOTE_MARKER}.*`);
  return blocks.join(GAP2);
}
