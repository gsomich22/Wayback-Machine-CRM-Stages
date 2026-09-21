# Website History Signals: assistant context

This is context to use when a user asks you to work on this starter; it does not authorize external writes.

Read README.md and the destination guide first. The package has one deterministic engine and destination adapters. Prefer the one-field setup with a multi-select dropdown wherever supported. Attio sends a one-element array with PUT (replace, not append). Apollo multi-select mappings resolve stage labels to picklist option IDs. Text is an explicit legacy fallback. Attio additionally gets the formatted managed company note.

## Contracts

- `analyzeDomain(domain)` in `src/archive.mjs` reads public CDX data and returns the full analysis. `analyze(fixture)` is offline.
- `analysis.json` is the full result; it is the input for `sync`. Do not substitute the portable `signal.json` in that command.
- `signalObject(result)` returns the contract in `config/output-schema.json`. `website_activity_stage` and `website_activity_state` are aliases.
- Only `status === "complete"` / `coverage === "complete"` results can be written. Insufficient History is a valid completed retrieval, distinct from an API failure.
- `/v1/signal` returns the portable object and formatted note. `/v1/analyze` returns flat fields plus findings. Both read only; neither writes to a CRM.
- The standalone n8n adapters require the analysis service. See docs/n8n.md for credentials and host reachability.

## Preserve these behaviors

Use the default stage timing in config/stage-rules.json unless asked to change it. Fresh Rebuild lasts through age six calendar months, measured from the latest finding’s confirmation/end month. Keep the existing stage labels.

Preserve the Attio note’s hourglass heading, plain-text bar capped at 48 glyph positions, year alignment, max aggregation, nonbreaking-space gaps, dated findings, and archive link. Keep missing archive periods blank. Do not fabricate account size, revenue, contacts, confidence percentages, exact launch dates, or purchase intent.

The note title and ownership marker allow repeat updates. Do not overwrite a note without the marker or ignore duplicate matches. Credentials belong in n8n or environment variables; imports must not contain pinned customer data or private credential references.

## Implementation

Node.js 22+, built-in modules only. Edit scripts/build-workflows.mjs and regenerate the imports if their logic changes. Run npm test and the offline demo. State separately whether you tested API mocks, imported into actual n8n, or performed a credentialed CRM write.

A normal chat may lack filesystem, terminal, network, or CRM tools. Explain those constraints instead of claiming you ran the workflow.
