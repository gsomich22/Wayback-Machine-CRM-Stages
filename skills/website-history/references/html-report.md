# Branded results report

After either Customers or Leads analysis, create a **gtmgrace.com-branded HTML report** alongside the data export. Use the bundled renderer; do not redesign it, install UI packages, or ask the user to set up a frontend project. The React Bits animated results list, cream/navy/violet/sage theme, and website signature are already compiled into the assets.

The report works as a single offline HTML file, with search, stage filters, expandable evidence, full CSV download, and a print layout covering every record. It makes no network requests. The archive and signature links open only when clicked. It does not connect to or write to a CRM. Local generation is not an external upload; publishing or sending the result elsewhere still requires user authorization. The HTML contains the provided company data, so do not publish it automatically.

## Prepare the input

Create `report-input.json` in the task's working folder, using the completed per-row results. Supply:

- `mode`: `customers` or `leads`.
- `title`: a concise, accurate collection label.
- `cohort`: the selected list/filter and date range in readable language. Include any retrieval limit or skipped source pages; never label a partial source export as the full cohort.
- `generated_at`: the actual report date as `YYYY-MM-DD`.
- `count_unit`: `records`, `deals`, or `companies`. Counts represent rows; use `companies` only when each row is a distinct company, and `deals` for multiple purchases per company.
- `demo`: set `true` for synthetic example data only; never mix synthetic and real rows.
- `rows`: the fields described in [input-and-report.md](input-and-report.md).

Every row must explicitly include `resolution` and `archive_coverage`. Only `resolution: "analyzed"` with `archive_coverage: "complete"` may carry an analyzed stage. Partial/unavailable results use `unresolved`; missing required input uses `missing_input`. Preserve failed rows and their reasons. The renderer includes them in cohort totals and refuses contradictory completed rows.

For Customers, supply `closed_date` and `stage_at_close`. For Leads, supply `analyzed_at` and `website_activity_state`. Use only engine-derived stages, cutoffs, and evidence summaries. Populate `signal_start`, `signal_end`, and `archive_url` when actually available; do not invent evidence to fill a design. Archive links must be HTTPS links to `web.archive.org`.

Do not put API credentials, private CRM notes, contact data, or unnecessary source fields in the report. `input_id` should be the needed stable row/deal reference. The renderer selects its supported columns and displays untrusted text as text.

Example envelope (synthetic):

```json
{
  "mode": "leads",
  "title": "Independent brands / September",
  "cohort": "Synthetic example — one company, no live research.",
  "generated_at": "2026-09-21",
  "count_unit": "companies",
  "demo": true,
  "rows": [{
    "input_id": "example-001",
    "company": "Example Brand",
    "domain": "example.com",
    "analyzed_at": "2026-09-21",
    "website_activity_state": "Fresh Rebuild",
    "resolution": "analyzed",
    "archive_coverage": "complete",
    "evidence_summary": "Synthetic example of a persistent homepage change.",
    "archive_url": "https://web.archive.org/web/*/example.com"
  }]
}
```

## Generate and deliver

Resolve SKILL to the actual skill folder (the one containing `SKILL.md`) and WORK to the working output folder:

```sh
node SKILL/scripts/render-report.mjs WORK/report-input.json WORK/website-history-report.html
```

This needs Node.js 22+ but no npm install, API key, hosting, or internet. Analysis itself still needs archive access. If Node execution is unavailable, do not claim to have generated the HTML: deliver the validated input and state that report generation remains unrun.

Check that the output opens and that its mode, row counts, dates, evidence, and missing-data labels match the underlying results. If a browser is available, test a search, a stage filter, and an expanded record. Return a clickable download/open link to the HTML, plus the CSV/JSON. Explain briefly that the file opens in a browser. Keep the gtmgrace.com signature and design intact unless the user explicitly requests customization.

The report is a research deliverable, **not a CRM writeback approval screen**. Any subsequent CRM update still follows [crm-writeback.md](crm-writeback.md), including exact destination fields, before/after values, note behavior, and explicit confirmation.
