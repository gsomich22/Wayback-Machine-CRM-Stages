# When a run needs attention

| What you see | What to check |
|---|---|
| Demo will not start | Open a terminal in the extracted folder; use Node.js 22+ |
| HTTP 401 | The correct Header Auth credential is selected; service token and credential match |
| HTTP 400 | Send a public domain in JSON, without credentials or a port |
| HTTP 429 from the service | Both worker slots are busy; process fewer companies concurrently and retry later |
| HTTP 502 / archive connection failure | Wayback could not be read; retry later |
| HTTP 503 / partial coverage | A query did not finish; retry later or increase page/time budgets |
| Connection refused from n8n / Clay | The service must be reachable from that tool, not just your laptop’s browser |
| Gateway timeout around a fixed duration | Your hosting proxy or workflow plan may have a shorter limit than the analysis; use a suitable host or the local route |
| Insufficient History with complete coverage | Retrieval finished but Wayback has too little useful history; this is not an authentication error |
| No company / multiple companies in Attio | Fix the existing company’s domain or resolve duplicates; the workflow will not create a company for you |
| Unknown Attio attribute / select option | Check that the field is Multi-select, check its API slug, and create every exact stage option |
| Note title exists but is not managed | Rename that unrelated note so the starter can create its own |
| Stage updated, note failed | Inspect Attio, fix the note error, then rerun serially; the two writes are not transactional |
| Apollo field ID rejected | Use the account custom field ID from the fields API; replace the example placeholder |

## Large sites

The public archive is variable. The default budget is 15 pages of 15,000 rows per query and 360 seconds for the full analysis. The engine retries failed archive pages up to three times. A larger local run can use:

```sh
npm run analyze -- --domain example.com --max-pages 30 --timeout 600 --out analysis
```

For the service, set `SIGNALS_MAX_PAGES` and `SIGNALS_TIMEOUT_SECONDS` before starting it. If raising the budget above 360 seconds, also raise the caller’s timeout and its host/proxy limit.

A `complete` result means the requested, bounded queries ended without truncation. It does not guarantee complete historical coverage of a website.

## Running in an AI sandbox

The downloadable skill uses `scripts/run-analysis.mjs`, which starts the engine with a 600-second overall budget and 120 seconds per request. Keep the command runner alive for at least 660 seconds and poll the existing process if it yields; do not launch another copy just because the first request is slow. Core CLI/service defaults stay at 360/60 seconds unless overridden. CLI callers can set `--request-timeout` separately from `--timeout`.

If a proxy is configured, the skill launcher enables `NODE_USE_ENV_PROXY=1` at process startup. Built-in fetch proxy support requires Node 22.21+ or 24+ ([Node documentation](https://nodejs.org/en/learn/http/enterprise-network-configuration)). Older Node versions fail before a live query with a useful error; use an available compatible runtime. Preserve existing proxy and certificate settings. A longer timeout does not repair blocked network access or a missing proxy.

## Export controls in chat previews

Some embedded previews block downloads and print dialogs. The report offers a selectable, copyable request for your assistant instead; it cannot automatically type into the conversation. The skill also delivers the CSV as a separate attachment. To print directly, download the HTML and open it in a browser, then use Print or Save as PDF. If clipboard access is blocked, select and copy the visible request manually.
