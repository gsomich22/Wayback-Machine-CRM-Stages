# Clay: enrichment columns, no notes

## CSV path

Run `analyze` for each domain and import `fields.csv` into a Clay table. Only import rows whose `coverage` is `complete`; partial files are saved for inspection, not automatic updates. Its columns are `domain` plus the eight field keys (`website_activity_state`, `last_signal`, `signal_start`, `signal_end`, `analyzed_at`, `archive_url`, `coverage`, `review_prompt`). Match rows using `domain`. Every output is a scalar field; there is no note field. Keep the analysis date and archive link beside the state.

## HTTP enrichment path

Run the included server with `SIGNALS_API_TOKEN` set to a random secret of at least 16 characters:

```sh
npm start
```

It binds to `127.0.0.1:8787` by default. Clay cannot reach your laptop's localhost. To use it from Clay, deploy this repo on a Node host (a Dockerfile is included), set `HOST=0.0.0.0`, store the token in the host's secrets, and expose it through HTTPS. Set `PORT` if your host requires it. No hosting account is bundled.

Each request reads the public archive, which takes 30 seconds to a few minutes per domain, so the server is not fast and the settings below matter.

In Clay, add an HTTP API enrichment (manual configuration):

| Setting | Value |
|---|---|
| HTTP method | `POST` |
| API endpoint URL | your HTTPS service URL followed by `/v1/analyze` |
| Header fields | `Authorization`: `Bearer YOUR_SIGNALS_API_TOKEN`. Save it as an HTTP API (Headers) account so Clay encrypts it. `Content-Type: application/json` is set by Clay automatically. |
| JSON body | `{"domain": "/Domain"}` using Clay's column reference for your domain column (string references need the quotes) |
| Field paths to return | `website_activity_state`, `last_signal`, `signal_start`, `signal_end`, `analyzed_at`, `archive_url`, `coverage`, `review_prompt`, and optionally `findings` |
| Response timeout | `400000` ms |
| Retry on failure | on, for 429, 502 and 503 |
| Rate limiting | Request limit `2`, Duration `60000` ms to begin with |

Start by mapping only `website_activity_state` to a column. Add the other paths if useful. `findings` keeps the dated evidence as an array. There is no note creation or note output on this route.

Responses:

- `200` with `domain`, the eight fields and `findings`.
- `503` when archive coverage is incomplete; the body includes `errors` explaining which query fell short. Retry the row later rather than writing a state.
- `502` when the archive could not be read at all; `detail` carries the reason.
- `429` when both worker slots are busy (`SIGNALS_MAX_CONCURRENT`, default 2).
- `401` for a wrong token, `400` for a body without a public domain.

`GET /health` is a simple availability check and does not call the archive. `SIGNALS_MAX_PAGES` (default 15), `SIGNALS_PAGE_SIZE` (default 15000) and `SIGNALS_TIMEOUT_SECONDS` (default 360) bound each archive read; see `.env.example`. For a table of hundreds of domains, the CSV path with a local loop is usually simpler than waiting on per-row enrichment.

Primary reference: [Clay HTTP API enrichment](https://university.clay.com/docs/http-api-integration-overview). Checked September 17, 2026.

## Multi-select destinations

When sending the stage from Clay to a CRM, prefer a multi-select field and wrap the scalar stage as a one-element array, resolving the destination’s option IDs if required. Replace the current selection on refresh. Clay’s raw HTTP/CSV output remains a scalar string; use a text column when your Clay table does not offer a compatible multi-select column.
