# Website History Lite: start here

[Download Website History Lite](../downloads/website-history-lite-skill.zip) · [Read its instructions](../skills/website-history-lite/SKILL.md)

The download includes the analysis engine, so you don't need a separate service. If your assistant supports importing skills, import the ZIP. Otherwise extract or attach it in a conversation and ask the assistant to follow `website-history-lite/SKILL.md`.

## How to use it

Attach a CSV of companies (or paste a list of domains) and say:

> run wayback on this csv

| Path | What you get | What you need |
|---|---|---|
| **Leads** | Each company's current website stage and the evidence behind it | Company names and domains |
| **Customers** | The website stage as of each customer's close date | Domains plus actual close dates |

## What you get back

- A branded HTML report: stage mix, search, filters, and an expandable card for each company. It works offline in any browser.
- A CSV ready to import into your CRM: Company Name, Domain, Website Stage, Website Stage Refreshed.
- On the first run, steps for adding those two fields to your CRM's company records.

Lite never connects to your CRM. You import the CSV yourself, matched on domain. The full **Website History** skill on [Agensi](https://www.agensi.io) also reads your list straight from a connected CRM, writes the stages back after you approve a preview, keeps every run in a hub, and schedules re-checks.

## Requirements

File access, Node.js 22+, and internet access to reach the public Internet Archive. If those aren't available, the assistant says so and doesn't claim to have analyzed anything.

For technical customization, see [the editing guide](editing-guide.md).
