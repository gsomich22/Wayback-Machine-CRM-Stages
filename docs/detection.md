# Detection model · engine v0.3.0

This implementation uses CDX metadata and conservative, deterministic thresholds. It does not fetch archived HTML or compare rendered page screenshots. `length` is an archived record/response size proxy, not a site's visual size. Digests can change for dynamic content as well as redesigns. URL inventory counts measure URLs represented in captures, not a full census of the live website.

## Inputs and coverage

Homepage: five years, exact homepage URL, successful HTML captures, at most one capture per day. Inventory: two years, domain and subdomains, HTML status 200/404/410. Both use resume keys and a bounded page budget (default 15 pages of 15,000 rows per query, each page retried up to three times on connection failures and 429/5xx, 60 seconds per request, 360 seconds for the whole analysis; all adjustable). Failed or truncated inputs are flagged and excluded from the affected detector. Complete retrieval means the bounded query finished; it does not mean Wayback has complete website coverage. CDX returns inventory rows ordered by URL key, not by date, so a truncated inventory is a biased sample and can change the state; that is why partial results are never written to a CRM.

Within each month, homepage metrics are median positive response length, distinct valid digests and capture days. Inventory uses the latest response per normalized URL in that month, counting successful versus removed URLs. It removes `www`, URL fragments and trailing slash duplicates, but retains query strings.

## Findings

- Rebuild: three contiguous baseline months, then a >=25% absolute length shift with >=3 digests in the change month. The next two consecutive months must remain within 15% of the changed value and >=20% away from the baseline. Strong at >=40% shift and >=4 digests. The finding ends at the second confirmation month; that is not a claimed launch date.
- Iteration: a contiguous 3–6 month window; >=3 months with >=3 digests, >=45% cumulative absolute size movement, <20% net change, and at least one reversal of a >=3% movement. Windows overlapping detected rebuilds are excluded. Strong at >=80% movement.
- Quiet: 12 contiguous months, >=18 capture days, median monthly distinct digest count <=1.5 and <20% drift between the first and last three-month baselines.
- Expansion: six contiguous inventory months; median live URLs in the final three months rises by >=25 and >=35% against the first three. Strong at >=50 additional URLs or >=60% growth.
- Streamlining: the reverse thresholds, plus final-three-month removals totaling >=25 or >=25% of baseline. Strong at >=50 removals.

Overlapping findings of the same type are merged. All findings remain in JSON and the note; the latest ending finding drives the state. Overlap may represent several possible interpretations, so inspect evidence before choosing an outreach angle.

The note’s activity bar uses digest transitions and month-to-month response-size movement; this presentation score does not change the detector thresholds above.

## Current state

The timing values below are the defaults in `config/stage-rules.json`. Month differences are computed from the finding's end to the analysis month:

| Latest finding | Age | State |
|---|---|---|
| Rebuild | 0–6 months | Fresh Rebuild |
| Rebuild | 7–42 months | Stale After Rebuild |
| Rebuild | >42 months | Gone Quiet |
| Iteration / expansion / streamlining / quiet | <12 months | Actively Iterating / Expanding / Streamlining / Long Quiet Stretch |
| Those same findings | >=12 months | Gone Quiet |
| No finding, <6 homepage months | Any | Insufficient History |
| No finding, >=6 homepage months | Any | No Strong Signal |
| Both archive queries failed/incomplete | Any | Unknown |

Gone Quiet describes the age of the latest detected finding. It does not establish current inactivity. Partial analysis can still display a provisional finding, but CRM writes are refused until both queries complete.

## Reporting and outreach

The history report takes explicit CRM state changes and an optional engagement date. Intervals are half-open (start inclusive, next change exclusive); an engagement on a transition belongs to the new state. Durations end at the report date. Missing engagement stays null. Recording a state once cannot reconstruct time spent in that state before the observation.

The launch intro graphic assumes a person confirmed the launch and selected a relevant contact. This repo exports evidence; sequence creation and sending remain in your outreach tool.

Primary input contract: [Internet Archive CDX server documentation](https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server).
