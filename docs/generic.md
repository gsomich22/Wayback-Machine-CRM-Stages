# One field for Clay or another CRM

The smallest useful integration is:

```text
domain → website history analysis → Website activity state
```

Create a custom **text** field named Website activity state. Map `website_activity_state` from the output into it. In the portable signal, `website_activity_stage` is an identical alias for people who call it a stage; the two values always match.

## Pick the connection that fits

**n8n:** import `workflows/n8n/generic-stage-field.json`. Follow [n8n setup](n8n.md), then connect **Stage field output** to your CRM’s Update Record node. The template deliberately ends at output: each destination has its own record lookup, credentials, and custom-field IDs. Match an existing account before writing.

**Clay:** follow [the Clay guide](clay.md). Return only `website_activity_state` if that is all you need. Analysis date and archive URL are useful optional columns.

**CSV:** run the local analysis, then import `analysis/fields.csv`. Match the `domain` column to existing companies and map only the website-activity column. Check `coverage` before importing: files can be saved for inspection even when an archive query was incomplete. Use only rows marked `complete`.

**Your own integration:** call `POST /v1/analyze` for fields or `POST /v1/signal` for the full portable object. Require HTTP 200 and `coverage === "complete"`. Preserve record matching and show errors rather than substituting Gone Quiet when a lookup fails.

## Optional fields

| Output key | Purpose |
|---|---|
| `website_activity_state` | The default stage field |
| `analyzed_at` | Date of the last successful analysis |
| `archive_url` | Evidence link |
| `last_signal` | Latest finding label |
| `signal_start`, `signal_end` | Finding months; not a confirmed launch date |
| `coverage` | Retrieval status |
| `review_prompt` | Reminder to inspect the evidence |

All eight legacy fields are strings. You can add them later without changing the engine. Only write fields your CRM actually has. This starter contains direct writers for Attio and Apollo; other CRM mappings need your own destination node or API adapter.
