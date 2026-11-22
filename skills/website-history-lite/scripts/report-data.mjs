// Shared by the offline renderer and browser report. No CRM or network access.
export const STAGES = ['Fresh Rebuild', 'Stale After Rebuild', 'Actively Iterating', 'Expanding', 'Streamlining', 'Long Quiet Stretch', 'Gone Quiet', 'No Strong Signal', 'Insufficient History', 'Unknown'];
// GTM Grace palette, deepened where needed so cream text stays readable on every stage chip.
export const COLORS = ['#8C1A3E', '#B0466A', '#C2561B', '#1C7A6B', '#5C2A5E', '#3E6B64', '#280829', '#6E5A6F', '#86717F', '#94858A', '#7A6870', '#A0908F'];
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
// Wayback resolves a partial timestamp (YYYYMM) to the nearest real capture, so these always land on a snapshot.
const DOMAIN = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
export function snapshotLink(domain, month) {
  const d = text(domain).trim().toLowerCase(), m = text(month).replace('-', '');
  if (!DOMAIN.test(d) || !/^\d{6}$/.test(m)) return '';
  return `https://web.archive.org/web/${m}/https://${d}/`;
}
// Archived images arrive pre-embedded as small data URLs (kit feature). Anything else is dropped.
function images(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 3).filter(i => i && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(i.src || '') && i.src.length < 400000)
    .map(i => ({src: i.src, captured: text(i.captured), archive_url: archiveLink(i.archive_url)}));
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
      archive_url: archiveLink(row.archive_url) || (DOMAIN.test(text(row.domain).trim()) ? `https://web.archive.org/web/*/${text(row.domain).trim().toLowerCase()}` : ''),
      before_url: snapshotLink(row.domain, row.signal_start), after_url: snapshotLink(row.domain, row.signal_end), error: text(row.error),
      before_images: images(row.before_images), after_images: images(row.after_images),
    };
  });
  // Report counts describe rows, including separate deals for the same company.
  return {mode: input.mode, title: text(input.title || 'Website history'), cohort: text(input.cohort || 'Selected records'), generated_at: generatedAt, count_unit: unit, demo: input.demo === true, rows};
}
export function summarize(report) {
  const counts = [...STAGES, 'Unresolved', 'Missing input'].map((stage, i) => ({stage, count: report.rows.filter(r => r.stage === stage).length, color: COLORS[i] || '#acbfa9'})).filter(x => x.count);
  const analyzed = report.rows.filter(r => r.resolution === 'analyzed').length;
  const informative = report.rows.filter(r => r.resolution === 'analyzed' && !['Insufficient History', 'No Strong Signal', 'Unknown'].includes(r.stage)).length;
  return {total: report.rows.length, analyzed, informative, unresolved: report.rows.length - analyzed, counts};
}
// CRM import file: one row per analyzed company. Unresolved rows stay out so a failed check never overwrites a real stage.
export function toImportCsv(report, fields = {}) {
  const stageField = fields.stageField || 'Website Stage', dateField = fields.dateField || 'Website Stage Refreshed';
  const cell = value => {
    let s = text(value);
    if (/^[\s]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const rows = report.rows.filter(r => r.resolution === 'analyzed').map(r => [r.company, r.domain, r.stage, r.date]);
  return [['Company Name', 'Domain', stageField, dateField], ...rows].map(row => row.map(cell).join(',')).join('\r\n');
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
