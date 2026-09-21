# Learn from closed customers first

Start with companies whose outcomes you know. Ask what evidence was available before they became customers, then compare that with the website stages of new accounts.

Use [examples/closed-customers.csv](../examples/closed-customers.csv) as your input checklist. Its companies are fictional. For each real row, run an analysis with the close date as its cutoff:

```sh
npm run analyze -- --domain example.com --as-of 2025-08-14 --out baseline/example
```

The archive queries and classifier use that date. A rebuild requires later confirmation captures; a rebuild first seen before close but confirmed after close must not be counted as known at close. The cutoff prevents those later captures from entering the result.

Record `state` as `stage_at_close`, `signals` as the dated evidence, and `status` as coverage. Keep incomplete results in an “unresolved” group and retry them; do not treat them as quiet. The current starter runs this one company at a time. It does not automatically batch the CSV or infer a winning sales pattern.

Compare how often each stage appears across customers, ideally alongside noncustomers from a similar period. Differences are associations, not proof that a website stage caused a purchase. Wayback’s current availability may also differ from what was accessible on the historical date.

## Time in stage and engagement

For actual recorded CRM stage changes, use the separate report:

```sh
node src/cli.mjs history --input examples/stage-history.json --out report
```

Replace the example with your own stage-change events and engagement dates. `report/stage-duration.json` reports time in each recorded stage and the stage at first logged engagement. It does not reconstruct stage transitions from a single current website analysis, and engagement is not assumed to mean closed-won.
