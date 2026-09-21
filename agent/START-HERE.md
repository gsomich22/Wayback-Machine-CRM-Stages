# Analyze customers or leads with your AI assistant

[Download the Website History skill](../downloads/website-history-skill.zip) · [Read its instructions](../skills/website-history/SKILL.md)

The download includes the analysis engine, so you do not need a separate service just to run this with a capable desktop assistant. If your assistant supports importing skills, use the ZIP. Otherwise extract or attach it in a conversation and ask the assistant to follow `website-history/SKILL.md`. Attaching files does not itself install tools or connect a CRM.

Choose one path:

| Path | What you learn | What you provide |
|---|---|---|
| **Customers** | The website stage as of each customer’s close date, plus patterns across customers | A CSV or CRM connection with domains and actual close dates |
| **Leads** | Each company’s current website stage and supporting evidence | A CSV or CRM connection with company domains |

Use this prompt:

> Use the Website History skill to analyze my [customers / leads]. My data is [in the attached CSV / in my connected CRM]. Ask me what you need to identify the right records and fields, then produce a report. Before uploading anything or changing CRM data, confirm the destination, matching rules, fields and options, and note handling with me. Show the exact proposed changes and wait for my approval.

Your assistant can inspect headers or CRM field definitions to make those questions concrete. For Customers, it will also clarify which actual close date to use and how to handle multiple deals for one company. For Leads, it will clarify the list or filter and the analysis date.

**You get a report first:** a polished, gtmgrace.com-branded HTML file with stage breakdowns, searchable results, expandable evidence, and CSV export. Open it in your browser; it works offline. CRM writeback is optional. The skill prefers multi-select stage fields where supported, keeps historical customer results separate from current stages, and skips unresolved records. It never treats a CSV or connection as permission to upload data.

The assistant needs file access, Node.js 22+, and internet access to run the bundled engine. A CRM connector alone is not enough. If those capabilities are unavailable, it can prepare the input and explain what remains unrun, but it must not claim to have analyzed the websites.

For technical customization of the starter, see [the editing guide](editing-guide.md).
