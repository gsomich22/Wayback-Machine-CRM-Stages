#!/usr/bin/env node
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, resolve, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeReport, summarize, toCsv} from './report-data.mjs';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderReport(input) {
  const report = normalizeReport(input), stats = summarize(report);
  const assets = new URL('../assets/report/', import.meta.url);
  const js = readFileSync(new URL('report.js', assets), 'utf8').replace(/<\/script/gi, '<\\/script');
  const css = readFileSync(new URL('report.css', assets), 'utf8');
  const data = JSON.stringify(report).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  const fallback = `<main class="fallback"><p>GTM GRACE / WEBSITE INTELLIGENCE</p><h1>${escapeHtml(report.title)}</h1><p>${report.mode === 'customers' ? 'Customers · stage at close' : 'Leads · current stage'} · ${stats.total} ${report.count_unit} · ${report.generated_at}${report.demo ? ' · Synthetic demo' : ''}</p><p>${escapeHtml(report.cohort)}</p><table><thead><tr><th>Company</th><th>Analysis date</th><th>Stage</th><th>Evidence / issue</th></tr></thead><tbody>${report.rows.map(r=>`<tr><td>${escapeHtml(r.company)}<br>${escapeHtml(r.domain)}</td><td>${r.date || 'Missing date'}</td><td>${escapeHtml(r.stage)}</td><td>${escapeHtml(r.error || r.evidence_summary)}</td></tr>`).join('')}</tbody></table><p>Archive evidence is a research signal, not proof of buying intent. ${report.mode === 'customers' ? 'Stages are retrospective, using evidence through each close date.' : ''}</p><footer>Made with perspective. <a href="https://www.gtmgrace.com/">gtmgrace.com ↗</a></footer></main>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'; base-uri 'none'; form-action 'none'"><title>${escapeHtml(report.title)} — GTM Grace</title><style>${css}</style></head><body><div id="root">${fallback}</div><script type="application/json" id="report-data">${data}</script><script>${js}</script></body></html>`;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2) throw new Error('Usage: node render-report.mjs input.json output.html');
    if (extname(args[1]).toLowerCase() !== '.html') throw new Error('Output must have an .html extension');
    const input = JSON.parse(readFileSync(resolve(args[0]), 'utf8'));
    const html = renderReport(input);
    mkdirSync(dirname(resolve(args[1])), {recursive:true});
    writeFileSync(resolve(args[1]), html);
    const csvPath = resolve(args[1]).slice(0,-5) + '.csv';
    writeFileSync(csvPath, toCsv(normalizeReport(input)));
    console.log(`Report saved: ${resolve(args[1])}\nCSV saved: ${csvPath}`);
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
