# Import and connect in n8n

These are ordinary workflow JSON files, using built-in nodes. There is no community node to install.

## Before importing

You need n8n, a reachable copy of the included analysis service, and its token. Start the service using [QUICKSTART](../QUICKSTART.md). In n8n Cloud, use your deployed HTTPS URL; `localhost` cannot reach a service on your laptop. Self-hosted n8n needs a URL reachable from its own host or container.

The archive can take several minutes. The analysis HTTP node waits up to 400 seconds and the workflow allows 900 seconds. Your hosting proxy, n8n plan, and instance must permit these durations. Use the local CLI/CSV route if they do not.

## Import

Create a workflow, open its menu, and choose **Import from File**. Select one:

| File | What happens after analysis |
|---|---|
| `attio-website-history-note.json` | Finds an existing company by domain, updates one field, and creates/updates its managed note |
| `apollo-stage-field.json` | Updates one custom field on the account ID you supply |
| `generic-stage-field.json` | Returns portable field output; you connect your destination afterward |

All three start with a manual trigger, include a Setup node, and are inactive. No credential IDs, pinned customer data, instance IDs, or account tokens are included.

## Connect credentials

Create **Header Auth** credentials in n8n. The credential’s display name is your choice; the HTTP header name and value must match:

| Credential purpose | Header name | Header value | Nodes |
|---|---|---|---|
| Signals service | `Authorization` | `Bearer YOUR_SIGNALS_API_TOKEN` | Analyze website |
| Attio | `Authorization` | `Bearer YOUR_ATTIO_API_TOKEN` | Find company; Find managed note; Update website stage; Create or update note |
| Apollo | `x-api-key` | Your Apollo API key, without `Bearer` | Update Apollo field |

In each HTTP node, keep Authentication as Generic Credential Type → Header Auth, then select the right credential. Tokens go in credentials, not Setup or JSON expressions.

## Fill in Setup

- `domain`: the company’s public domain.
- `signals_base_url`: service URL without `/v1/signal`, for example `https://signals.yourdomain.com`.
- `apply_changes`: leave `false` for a preview; change to `true` when ready to write.
- Attio: `stage_attribute` is your Multi-select company attribute’s API slug. Create every exact stage option first.
- Apollo: keep `stage_field_type: multiselect` and fill `stage_option_ids` with the JSON from your completed `examples/apollo-stage-options.json`. `account_id` is an existing account’s ID; `stage_field_id` is its custom account field ID. Check that the account belongs to the domain. `account.<id>` or the bare 24-character field ID works.

The generic workflow does not write anywhere; its `apply_changes` setting is unused.

## Run and inspect

Execute the workflow. Open **Preview signal** for the full result and note. In Attio/Apollo, the false branch ends at **Preview only**, without contacting the CRM. When ready, change the boolean to `true` and execute again; the workflow retrieves fresh evidence.

For a first real write, use a test record. Check the field, open the Attio note if applicable, then run again and confirm the same managed note is updated. HTTP errors stop the workflow. Do not enable Continue On Fail or Never Error on these nodes: a failed archive read must not become a CRM stage.

## Feed a list or another workflow

The imports process **one company per execution**. Replace the manual trigger/Setup with your input mapping, preserving its fields and boolean types. Use n8n’s Loop Over Items with batch size one, or Execute Sub-workflow once per company. The code intentionally rejects multiple input items because note lookups produce their own pages and a batch would make company matching ambiguous.

If adding a webhook, set authentication on it, validate its input, and choose a response strategy compatible with a multi-minute analysis. No public, unauthenticated webhook is bundled.

For the generic path, connect **Stage field output** to your CRM’s Update Record node and map the `website_activity_states` array to your multi-select field, resolving option IDs where needed. Use scalar `website_activity_state` only for a text fallback. Replace the current selection instead of appending it. Resolve an existing record by domain or an explicitly supplied record ID; do not create a duplicate account for each run.

## For maintainers

Edit `scripts/build-workflows.mjs`, then run:

```sh
node scripts/build-workflows.mjs
npm test
```

Workflow Code nodes are executed in automated tests with representative n8n inputs. HTTP request structures were checked against official docs. A real n8n import and execution has not been performed in the author’s environment; confirm credentials, import compatibility, pagination, and note rendering in your instance before a broad rollout.

References: [n8n import/export](https://docs.n8n.io/workflows/export-import/), [HTTP Request node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/).
