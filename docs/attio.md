# Attio: one stage and a company note

The default setup needs **one custom company field**. The note carries the evidence, so you do not have to create a field for every finding.

## Prepare your account once

1. Under Attio’s company-object settings, create a **Multi-select** (multi-select dropdown) attribute named **Website activity state**. Add every exact option in [the stage list](how-stages-work.md). Check that its API slug is `website_activity_state`. If you use another slug, enter it in n8n’s Setup node or your local field-map file.
2. Create an API token with `record_permission:read-write`, `object_configuration:read`, and `note:read-write` scopes.
3. Choose an existing test company with its domain filled in.

The stage is always written as a one-element array, such as `["Fresh Rebuild"]`, using Attio’s `PUT` record-update endpoint. This replaces previous selections rather than accumulating old states. The classifier still chooses one current state; the multi-select field provides the dropdown presentation and leaves room for future expansion. Missing options cause an error. Do not use a sales pipeline Status attribute for this field.

**If you already created a Text or single-select field:** create a new Multi-select attribute with the same stage options, then point `stage_attribute` (n8n) or the field map (local command) at its API slug. Keep the old field until you have verified the new one. This code change does not convert or delete fields in your account.

## Option A: n8n

Follow [the n8n guide](n8n.md) and import `workflows/n8n/attio-website-history-note.json`.

Set the company domain, the analysis-service URL, and the attribute slug in **Setup**. Connect a Signals Header Auth credential to **Analyze website**, and an Attio Header Auth credential to all four Attio HTTP nodes. Leave `apply_changes: false` for the preview.

When you set `apply_changes: true`, the workflow:

1. Analyzes the domain and rejects incomplete results.
2. Queries existing Attio companies by domain. Zero or multiple matches stop the run.
3. Checks the matched record’s domain and reads all note pages, within a 2,000-note limit.
4. Updates the website-activity field.
5. Creates the formatted note, or replaces its own existing note.

Run one company per execution. For lists, use a batch-size-one loop or a separate execution per company. Do not feed a batch directly into this workflow or run simultaneous writes for the same company.

## Option B: local command, no analysis-service hosting

Analyze the company:

```sh
npm run analyze -- --domain example.com --out analysis
```

Copy the company record UUID from Attio’s company URL or the records API. Confirm it belongs to the analyzed domain. Preview:

```sh
node src/cli.mjs sync --target attio --input analysis/analysis.json \
  --record-id YOUR_COMPANY_RECORD_UUID --map examples/attio-stage-only.json
```

This prints the field update and note without making API requests. Set `ATTIO_API_TOKEN` in `.env`, then apply:

```sh
node --env-file=.env src/cli.mjs sync --target attio --input analysis/analysis.json \
  --record-id YOUR_COMPANY_RECORD_UUID --map examples/attio-stage-only.json --apply
```

The local route uses your supplied record ID; unlike the n8n route, it does not look up or independently verify the company’s domain. Check the match before applying.

## The note

Title: `Website History · example.com`.

The layout preserves the website-history section from the working company-note workflow: linked domain, `### ⧗ Wayback Machine ⧗`, year headings, a plain-text activity bar, `◈` dated findings, `│` evidence lines, the italic archive link, nonbreaking-space paragraphs, and a 111-underscore divider.

The bar is capped at 48 characters, aggregates activity by maximum so spikes remain visible, and leaves thin or missing periods blank. The engine uses the original transition/response-size activity score for presentation while retaining this starter’s conservative signal detectors. The private enrichment flow’s sales estimates, contacts, hiring, intent data, credentials, and company data are not part of this standalone note.

A footer records the analysis date, coverage, and review guidance. Formatting has been checked as Markdown and in a local preview; verify final wrapping in your Attio account.

## Repeat runs and recovery

Both integrations find their note by title and the marker `Managed by Website History Signals`. An unrelated note with that title, duplicate titles, or an incomplete note listing stops the update. Other research notes are left alone. Keep handwritten research in a separate note: this tool replaces its managed note’s content.

Field and note updates are separate API calls. If the field succeeds but the note fails, fix the error and rerun. The local command can reuse the same saved analysis. The n8n run analyzes again and searches for the managed note before writing. After a timed-out note creation, inspect Attio before retrying; do not automatically retry the final POST or run concurrent writes.

## Optional extra fields

`examples/attio-fields.json` maps all eight legacy fields. Create only the fields you keep in that map. The local adapter omits empty optional values, which means old values in those fields remain; the managed note always shows the current result. The one-field setup avoids this ambiguity.

References: [Attio record updates](https://docs.attio.com/rest-api/endpoint-reference/records/update-a-record-overwrite-multiselect-values), [select values](https://docs.attio.com/rest-api/attribute-types/attribute-types-select), [list notes](https://docs.attio.com/rest-api/endpoint-reference/notes/list-notes), [create a note](https://docs.attio.com/rest-api/endpoint-reference/notes/create-a-note), [update a note](https://docs.attio.com/rest-api/endpoint-reference/notes/update-a-note).
