# Where to make changes

| I want to… | Edit |
|---|---|
| Change how long a stage lasts | `config/stage-rules.json`; restart/redeploy the service |
| Change what counts as a rebuild or expansion | `src/analyze.mjs`; update tests and `docs/detection.md` |
| Change the Attio note appearance | `src/note.mjs`; inspect example output and Attio rendering |
| Rename a destination field | n8n Setup or a copied local field-map JSON |
| Add a CRM | Start with the generic workflow; add record lookup and one field update |
| Change workflow logic | `scripts/build-workflows.mjs`, then rebuild the JSON imports |
| Change the portable JSON contract | `src/output.mjs` and `config/output-schema.json`; preserve compatibility or version it |

Do not rename internal stage values casually: filters, reports, and select options may depend on them. A field’s display label can be “Website Activity Stage” while its API key remains `website_activity_state`.

Run `npm test` and `npm run demo` after changing behavior. Add meaningful checks for new mappings or edge cases. Refresh checked-in examples when the generated output changes.
