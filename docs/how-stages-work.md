# How website stages work

The engine finds dated patterns, then assigns a stage from the most recently ending finding. A later finding can replace the stage implied by an earlier rebuild.

The exact values are:

```text
Fresh Rebuild
Stale After Rebuild
Actively Iterating
Expanding
Streamlining
Long Quiet Stretch
Gone Quiet
No Strong Signal
Insufficient History
Unknown
```

## Timing

The default rules match version 6 of the package:

- Rebuild, age 0–6 months: Fresh Rebuild.
- Rebuild, age 7–42 months: Stale After Rebuild.
- Rebuild, older than 42 months: Gone Quiet.
- Iteration, expansion, streamlining, or quiet finding younger than 12 months: its corresponding stage.
- Those other findings at 12 months or older: Gone Quiet.

Age is the difference between calendar months, from the finding’s **end/confirmation month** to the analysis month. A rebuild first observed in April and confirmed through June is Fresh Rebuild through December. This does not claim a June launch date.

No qualifying finding and fewer than six observed homepage months yields Insufficient History; with six or more, No Strong Signal. If neither query completed, the state is Unknown. Partial/unavailable retrieval is never eligible for an automatic CRM write, even if it contains a provisional finding.

## Customize timing

Edit `config/stage-rules.json`:

```json
{
  "freshRebuildMaxAgeMonths": 6,
  "staleRebuildMaxAgeMonths": 42,
  "otherSignalExpiryMonths": 12
}
```

The first two bounds are inclusive; the expiry bound is exclusive for keeping an active stage. To match a “younger than 12 months” Fresh Rebuild rule, set `freshRebuildMaxAgeMonths` to `11`.

The local engine and hosted service read this file at startup. Restart/redeploy after editing. Library users can also pass `rules` to `analyze`. The config changes classification timing, not detection thresholds; those remain documented in [detection.md](detection.md).

## Use the field in your CRM

Save a view filtered to one or more stages. Review the archive and current site before drafting an introduction. Keep a separate record of the date a company changes stage if you want duration reporting. Refreshing a field overwrites the current value; it does not itself build a stage-history dataset.

Schedule refreshes in your own workflow when ready. Until refreshed, the stored state describes the last successful analysis. No schedule is activated by importing these workflows.
