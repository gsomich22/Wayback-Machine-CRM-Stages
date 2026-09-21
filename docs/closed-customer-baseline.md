# Learn from closed customers first

Start with companies whose outcomes you know. Ask what evidence was available before they became customers, then compare that with the website stages of new accounts.

Use the **Customers** path in the [downloadable skill](../downloads/website-history-skill.zip). Attach your customer CSV directly to the AI conversation or select your connected CRM. The assistant checks the domains, actual close-date field, cohort filters, and handling of multiple deals, then runs the included engine once per domain/date and produces a combined report. See [the two-path guide](../agent/START-HERE.md).

Each analysis uses the actual close date as its cutoff. A rebuild requires confirmation captures; if confirmation only appears after close, it cannot be counted as confirmed at close. Incomplete archive reads stay unresolved. This is an assistant-guided batch workflow, not a separate CSV-upload application.

If you ask to write results back, the skill first confirms the destination and previews exact changes. Historical customer stages belong in separate historical fields or dated notes, never the company’s current website-state field or current managed note.

For developers, the per-row command is:

```sh
node src/cli.mjs analyze --domain example.com --as-of 2025-08-14 --out baseline/example
```

Compare how often each stage appears across customers, ideally alongside noncustomers from a similar period. Differences are associations, not proof that a website stage caused a purchase. Wayback’s current availability may also differ from what was accessible on the historical date.

## Time in stage and engagement

For actual recorded CRM stage changes, use the separate report:

```sh
node src/cli.mjs history --input examples/stage-history.json --out report
```

Replace the example with your own stage-change events and engagement dates. `report/stage-duration.json` reports time in each recorded stage and the stage at first logged engagement. It does not reconstruct stage transitions from a single current website analysis, and engagement is not assumed to mean closed-won.
