# Start here

Choose one route. You can look at the examples before installing anything.

## 1. I want to see the result

Open [the example note](examples/example-note.md), [the visual preview](examples/attio-note-preview.html), or [the example JSON](examples/example-output.json). The company is fictional.

To generate those results yourself, install Node.js 22+ and open a terminal in the extracted starter folder:

```sh
npm run demo
```

Success looks like: `northline.example: Fresh Rebuild (complete)` and a new `demo-output` folder. This works offline and does not need an API key.

## 2. I want to analyze one real company

```sh
npm run analyze -- --domain example.com --out analysis
```

Replace `example.com` with the company’s domain. The command reads Wayback Machine, not your CRM.

| File | Use it for |
|---|---|
| `analysis/signal.json` | Portable JSON for an assistant or your own integration |
| `analysis/analysis.json` | Full evidence and the input to the local `sync` command |
| `analysis/attio-note.md` | The company-note text, ready to review |
| `analysis/fields.csv` | Importing fields into a table or CRM |
| `analysis/clay-row.json` | Field-only JSON plus findings |

Do not sync an incomplete result. Retry later or see [troubleshooting](docs/troubleshooting.md).

## 3. I want the Attio note and stage

You need an existing company in Attio, one custom company field, and an Attio API token. Create a Multi-select dropdown named **Website activity state**, slug `website_activity_state`, with the exact options in [the stage list](docs/how-stages-work.md).

**Local route — no hosting:** follow [Attio setup](docs/attio.md), preview the saved analysis, then apply it. You supply the company’s record ID.

**n8n route:** start the analysis service below, import `workflows/n8n/attio-website-history-note.json`, and follow [n8n setup](docs/n8n.md). You supply a domain; the workflow finds exactly one existing Attio company. Credentials stay in n8n.

## 4. I want a stage in Apollo, Clay, or another CRM

Create one custom multi-select field named **Website activity state** wherever the destination supports it; use text only as a compatibility fallback. Apollo requires picklist option IDs as well as the field ID. Use the [Apollo workflow](docs/apollo.md), [Clay HTTP/CSV guide](docs/clay.md), or [generic field workflow](docs/generic.md). Add optional evidence fields later.

## 5. I want my AI assistant to analyze customers or leads

[Download the skill](downloads/website-history-skill.zip), then follow [the short two-path guide](agent/START-HERE.md). Customers uses actual close dates; Leads uses the current analysis date. Both accept a CSV attached to the conversation or a connected CRM. The assistant produces a report and asks about CRM details before proposing an upload or update. It waits for approval of that preview before writing anything.

The ZIP includes the engine. A capable desktop assistant can run it locally without service hosting; it still needs Node.js 22+ and internet access.

## Start the analysis service for automation

The service reads the archive and returns JSON. It holds no CRM credentials and makes no CRM writes.

1. Copy `.env.example` to `.env`.
2. Set `SIGNALS_API_TOKEN` to a random secret of at least 16 characters. Leave the CRM tokens blank if using n8n.
3. Start it from the package folder:

```sh
node --env-file=.env src/server.mjs
```

Local URL: `http://127.0.0.1:8787`. `GET /health` should return `{"status":"ok"}`. `npm start` also works if the environment variables are already exported; it does not load `.env` automatically.

For n8n Cloud or Clay, deploy the folder using the included Dockerfile or a Node host. Set `HOST=0.0.0.0`, put the token in the host’s secret settings, expose HTTPS, and use that HTTPS URL in the workflow. Choose a host/proxy that allows requests lasting at least 400 seconds. Hosting and account provisioning are not bundled.

If n8n runs in Docker on your own computer, its `localhost` is the n8n container. Use a service name on a shared Docker network, or an explicitly configured host address. On Docker Desktop, `host.docker.internal` may be used with the service listening on `0.0.0.0` and an appropriate firewall. See [n8n setup](docs/n8n.md).

Example request (with `SIGNALS_API_TOKEN` already exported in your shell):

```sh
curl --fail-with-body -X POST http://127.0.0.1:8787/v1/signal \
  -H "Authorization: Bearer $SIGNALS_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"domain":"example.com"}'
```

`POST /v1/signal` returns the portable signal and note. `POST /v1/analyze` returns the smaller field-only result for Clay. Both require the same token and body, and both reject incomplete retrieval with HTTP 503.
