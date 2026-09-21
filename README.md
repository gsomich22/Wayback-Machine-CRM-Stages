# Website History Signals Starter

**Turn a company’s website history into useful CRM context.**

Give it a domain. Get a website-activity stage, dated evidence, and a readable summary of what changed in its public archive history. Use the stage to organize accounts, spot patterns across customers, and decide which websites deserve a closer look.

For **Attio**, the starter writes the stage to a **Multi-select** dropdown and creates a formatted company note. For **Apollo, Clay, or another CRM**, start with one custom field: **Website activity state**, using multi-select wherever supported. Apollo’s writer maps stage names to your picklist option IDs; text is a legacy fallback.

You do not need to understand the code to understand the output. You will need someone comfortable connecting a workflow or running a small service to automate it.

## What you get

| Path | Result | Start here |
|---|---|---|
| Attio | One website-activity field + a company note with an activity bar, dated findings, and an archive link | [Attio setup](docs/attio.md) |
| Apollo | One custom account field; ready-to-import n8n workflow or local command | [Apollo setup](docs/apollo.md) |
| Clay / another CRM | A field value you can map into your table or CRM, through HTTP, n8n, or CSV | [Portable field setup](docs/generic.md) |
| Claude / ChatGPT / desktop AI | Downloadable skill: Customers at close or Leads today, from a CSV or connected CRM | [Download skill](downloads/website-history-skill.zip) · [Start here](agent/START-HERE.md) |
| Local preview | Sample JSON, CSV, and the Attio note, with no account connection | [Quickstart](QUICKSTART.md) |

The starter’s original source code is free and MIT-licensed. The optional report interface includes React Bits under its bundled third-party license. Your n8n plan, CRM/API access, and any hosting are separate. No paid enrichment provider or AI API is required by the analysis engine.

## What it looks like

A fictional company might return:

> **Northline · Fresh Rebuild**  
> **April–June 2026 · Major Rebuild Signal**  
> A change in archived response length persisted for two later months. Open the snapshots to check whether it reflects a redesign.

The Attio note adds a compact year-by-year activity bar and links to the archive. It follows the formatting of the original working company-note flow: `⧗` headings, `◈` dated findings, `│` detail lines, and generous spacing.

[Read the example note](examples/example-note.md) · [Open the portable JSON](examples/example-output.json) · [View the formatted preview](examples/attio-note-preview.html)

The preview uses synthetic data. Exact type sizing and wrapping depend on Attio’s renderer and the width of the note panel.

## The stages

| Website activity state | What it suggests |
|---|---|
| Fresh Rebuild | A substantial archived change was recently confirmed |
| Stale After Rebuild | A rebuild-like finding is older, but still within the configured window |
| Actively Iterating | Repeated changes and reversals appeared in the archive |
| Expanding | More live URLs appeared in archived inventory |
| Streamlining | Fewer live URLs and more removal responses appeared |
| Long Quiet Stretch | A well-covered stretch was relatively stable |
| Gone Quiet | The most recent qualifying finding has aged beyond its window |
| No Strong Signal | There is history, but nothing crossed the detection thresholds |
| Insufficient History | There is too little homepage history to classify confidently |
| Unknown | The required archive evidence could not be retrieved |

These are **website-research stages**, stored in a custom field. Your sales pipeline stages—such as Qualified, Opportunity, and Closed Won—stay separate.

The default Fresh Rebuild window is **0–6 calendar months after the finding’s confirmation month**, matching the previous ZIP. Rules live in [config/stage-rules.json](config/stage-rules.json). [How stages work](docs/how-stages-work.md) explains the dates and customization.

## Try it without connecting anything

With Node.js 22 or newer installed, open a terminal in this folder:

```sh
npm run demo
```

Open `demo-output/attio-note.md` or `demo-output/signal.json`. The demo uses a fictional company and makes no network calls. There are no runtime packages to install.

To read a real company:

```sh
npm run analyze -- --domain example.com --out analysis
```

The `analysis` folder will contain the portable signal, full analysis, formatted note, and field exports. A live read can take several minutes. The public archive can be unavailable; incomplete results are saved for review and blocked from CRM writes.

## Connect it when you are ready

**The simplest CRM setup is one field.** The other seven fields from the earlier package are optional.

Import a workflow from [workflows/n8n](workflows/n8n), connect your own credentials, and run it with `apply_changes` set to `false` first. Attio and Apollo writes are enabled when you change that setting to `true`. The generic workflow stops at portable field output, ready for your own destination node.

The workflows call the included analysis service. **n8n Cloud and Clay need a reachable service URL; importing a workflow does not host the engine.** A local command is the fastest path if you do not want hosting. The [quickstart](QUICKSTART.md) separates local use from automation setup.

## Use it with your AI assistant

[Download the Customers & Leads skill](downloads/website-history-skill.zip). Give your assistant the skill and choose **Customers** (website stages at close) or **Leads** (current stages). Attach a CSV directly to that conversation, or use a connected CRM. There is no separate upload site.

The assistant asks about the relevant records and fields, runs the included engine where code execution and internet access are available, and returns a report. If you want results in your CRM, it first resolves the workspace, record matching, field/options, and note handling, then shows the proposed changes and waits for your approval. Historical customer results stay separate from current website states.

Both paths include a **gtmgrace.com-branded HTML report** in the cream, navy, violet, and sage palette: stage mix, searchable company results, expandable evidence, CSV export, and a website signature. The exported file works offline; no hosting or frontend setup is needed. A separate CSV is included; in-chat export controls offer a copyable assistant request when browser actions are blocked. [Leads example](examples/report-leads.html) · [Customers example](examples/report-customers.html) (synthetic data; download and open in a browser).

[Two-path guide and starter prompt](agent/START-HERE.md)

## Put the stages to work

Start with a few companies you already know. Compare the findings with the actual websites and adjust the timing rules to fit your research.

Then save a CRM view for a stage such as Fresh Rebuild. Review the evidence before choosing an outreach angle. Refresh the analysis on your own schedule: stages describe the date they were analyzed and do not change automatically.

For customer research, compare the website evidence available **before each close date**, then look for recurring patterns. The [customer baseline guide](docs/closed-customer-baseline.md) shows how to avoid using later website changes as earlier evidence. The included stage-history report also measures time in stages from recorded CRM events.

## What the signal can tell you

Wayback Machine metadata can show patterns worth investigating. It cannot establish a visual redesign, an exact launch date, purchase intent, or every page on a live website. Blank periods in the bar mean missing or thin archive evidence, not inactivity. “Complete” means the requested archive queries finished, not that the archive contains every website change.

[Detection details](docs/detection.md) · [Troubleshooting](docs/troubleshooting.md) · [Verification and release notes](docs/release.md) · [License](LICENSE)

## For people who want to tinker

- `src/analyze.mjs`: deterministic analysis; `src/archive.mjs`: public archive retrieval.
- `src/note.mjs`: Attio formatting; `src/output.mjs`: portable signal object.
- `config/`: stage timing and the portable JSON schema.
- `workflows/n8n/`: Attio, Apollo, and generic workflow imports.
- `scripts/build-workflows.mjs`: rebuild the workflow JSON after editing its logic.
- `skills/website-history/`: the Customers/Leads skill, offline HTML renderer, and CRM confirmation rules.
- `ui/report/` (repository checkout): editable React report source; run `npm ci --prefix ui/report` and `npm run build --prefix ui/report` to rebuild bundled assets.
- `downloads/website-history-skill.zip`: self-contained skill export; rebuild with `python3 scripts/export-skill.py`.
- `agent/`: the two-path starting guide and technical adaptation context.
- `tests/`: analysis, API contracts, note formatting, and workflow safeguards.

Run `npm test` before sharing changes. This release has local automated verification; an import-and-execute check in your n8n instance and a live write to a test CRM company remain setup checks. No live CRM records were changed to build this package.
