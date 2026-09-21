# Inputs and reports

## Customers: stage at close

Minimum input is company name or label, public domain, and an actual close date. CSV headers need not match exactly: inspect the header/sample, propose a mapping, and ask about ambiguous fields. A CRM source also requires a clear account/workspace, customer qualification rule (for example a particular closed-won stage), date range or list, and the deal-to-company relationship.

Ask whether multiple closed deals for one company should be analyzed individually, or whether the user wants the first or latest close. Do not silently choose. Prefer one row per deal when that is the requested cohort. An account creation date, forecast close date, or last-modified timestamp is not a substitute for actual close. For timestamps, establish the calendar-date timezone when it could change the cutoff. Ask about ambiguous day/month formats; missing dates remain missing-input rows.

Read only needed CRM fields: company label/domain, actual close date, stable company/deal IDs, and the fields required for the cohort filter. Follow pagination within the approved cohort; record any retrieval limit. Retain source record IDs for matching, but never include API tokens in inputs or reports.

Example normalized input:

```json
[
  {"input_id":"customer-001","company":"Example Brand","domain":"example.com","closed_date":"2025-08-14"}
]
```

A domain can appear more than once with different dates. Do not deduplicate away distinct purchases. Resolve company aliases or historical domains with the user rather than silently assuming a current domain is the historical one.

Output columns:

`input_id, company, domain, closed_date, stage_at_close, resolution, archive_coverage, signal_start, signal_end, evidence_summary, archive_url, error`

Add source company/deal IDs only when available. `resolution` is `analyzed`, `unresolved`, or `missing_input`. For failed/incomplete archive reads, leave `stage_at_close` empty and preserve the reason. A complete retrieval may still return Insufficient History: report that label and count it separately from informative stages.

The engine excludes captures after the cutoff. A rebuild observed before close but confirmed only afterward must not appear as confirmed at close. The finding’s end is a confirmation month, not an exact launch date. State results as retrospective analysis of archive evidence through the cutoff; the archive may have changed since that date.

Summarize stage counts with denominators: cohort size, eligible records, completed retrievals, informative stages, insufficient/no-signal results, and unresolved rows. State whether counts represent deals or unique companies. A customer-only cohort cannot establish that a stage predicts purchasing; that would need a suitable comparison group. Do not invent an optimal stage from a small or incomplete sample.

## Leads: current stage

Minimum input is a public company domain; preserve a company label and stable source ID if provided. With a CRM connection, resolve the target account/workspace and list/filter before reading. Ask whether existing customers should be excluded if that affects the requested lead cohort. Close dates are not required.

Example normalized input:

```json
[
  {"input_id":"lead-001","company":"Example Brand","domain":"example.com"}
]
```

Output columns:

`input_id, company, domain, analyzed_at, website_activity_state, resolution, archive_coverage, signal_start, signal_end, evidence_summary, archive_url, error`

Use the same coverage and missing-input rules as Customers. Group leads by stage for research, retain links and dates, and recommend inspecting the archive/current site before choosing an outreach angle. Do not enroll contacts, create sales sequences, or send messages.

## CSV handling

Use a proper CSV parser with quoted-field support, not splitting on commas. Preserve identifiers as strings. Ask about unclear column mappings instead of inferring a domain from a company name or inventing dates. Escape cells beginning with spreadsheet formula characters when creating downloadable CSVs. Only send public domains/cutoffs to Wayback, never entire customer exports.
