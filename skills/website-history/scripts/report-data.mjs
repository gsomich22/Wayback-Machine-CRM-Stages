// Shared by the offline renderer and browser report. No CRM or network access.
export const STAGES = ['Fresh Rebuild', 'Stale After Rebuild', 'Actively Iterating', 'Expanding', 'Streamlining', 'Long Quiet Stretch', 'Gone Quiet', 'No Strong Signal', 'Insufficient History', 'Unknown'];
export const COLORS = ['#7045ff', '#132440', '#5f7e6c', '#8765d8', '#456776', '#9b8171', '#747b86', '#a69f91', '#c0b8a9', '#827b8e'];
const text = value => value == null ? '' : String(value);
function date(value, label, optional = false) {
  if (optional && !value) return '';
  const s = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s)) || new Date(s).toISOString().slice(0,10) !== s) throw new Error(`${label} must be a real YYYY-MM-DD date`);
  return s;
}
function archiveLink(value) {
  if (!value) return '';
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && u.hostname === 'web.archive.org' && !u.username && !u.password ? u.href : '';
  } catch { return ''; }
}
export function normalizeReport(input) {
  if (!input || !['customers', 'leads'].includes(input.mode) || !Array.isArray(input.rows)) throw new Error('Report requires mode: customers or leads, and a rows array');
  const generatedAt = date(input.generated_at, 'generated_at');
  const unit = input.count_unit || 'records';
  if (!['records', 'deals', 'companies'].includes(unit)) throw new Error('count_unit must be records, deals, or companies');
  const rows = input.rows.map((row, index) => {
    if (!row || typeof row !== 'object') throw new Error(`Invalid row ${index + 1}`);
    const resolution = row.resolution;
    if (!['analyzed', 'unresolved', 'missing_input'].includes(resolution)) throw new Error(`Row ${index + 1} requires an explicit resolution`);
    let stage = input.mode === 'customers' ? row.stage_at_close : row.website_activity_state;
    const coverage = text(row.archive_coverage);
    if (resolution === 'analyzed' && coverage !== 'complete') throw new Error(`Row ${index + 1}: analyzed requires complete archive_coverage`);
    if (resolution === 'analyzed' && !STAGES.includes(stage)) throw new Error(`Row ${index + 1}: unknown or missing stage`);
    if (resolution !== 'analyzed') stage = resolution === 'missing_input' ? 'Missing input' : 'Unresolved';
    const cutoff = date(input.mode === 'customers' ? row.closed_date : row.analyzed_at, `Row ${index + 1} analysis date`, resolution !== 'analyzed');
    return {
      input_id: text(row.input_id || `row-${index + 1}`), company: text(row.company || row.domain || 'Unnamed company'),
      domain: text(row.domain), date: cutoff, stage, resolution, archive_coverage: coverage || 'unavailable',
      signal_start: text(row.signal_start), signal_end: text(row.signal_end), evidence_summary: text(row.evidence_summary),
      archive_url: archiveLink(row.archive_url), error: text(row.error),
    };
  });
  // Report counts describe rows, including separate deals for the same company.
  return {mode: input.mode, title: text(input.title || 'Website history'), cohort: text(input.cohort || 'Selected records'), generated_at: generatedAt, count_unit: unit, demo: input.demo === true, rows};
}
export function summarize(report) {
  const counts = [...STAGES, 'Unresolved', 'Missing input'].map((stage, i) => ({stage, count: report.rows.filter(r => r.stage === stage).length, color: COLORS[i] || '#b9b2a4'})).filter(x => x.count);
  const analyzed = report.rows.filter(r => r.resolution === 'analyzed').length;
  const informative = report.rows.filter(r => r.resolution === 'analyzed' && !['Insufficient History', 'No Strong Signal', 'Unknown'].includes(r.stage)).length;
  return {total: report.rows.length, analyzed, informative, unresolved: report.rows.length - analyzed, counts};
}
export function toCsv(report) {
  const headers = ['input_id','company','domain',report.mode === 'customers' ? 'closed_date' : 'analyzed_at',report.mode === 'customers' ? 'stage_at_close' : 'website_activity_state','resolution','archive_coverage','signal_start','signal_end','evidence_summary','archive_url','error'];
  const cell = value => {
    let s = text(value);
    if (/^[\s]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [headers, ...report.rows.map(r => [r.input_id,r.company,r.domain,r.date,r.resolution === 'analyzed' ? r.stage : '',r.resolution,r.archive_coverage,r.signal_start,r.signal_end,r.evidence_summary,r.archive_url,r.error])].map(row => row.map(cell).join(',')).join('\r\n');
}
