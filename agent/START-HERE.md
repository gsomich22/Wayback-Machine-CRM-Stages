# Set this up with Claude or ChatGPT

Use your assistant as a guide to the files, setup, and customization. The analysis itself runs in Node.js or through the supplied service. Uploading a ZIP into a chat does not by itself install a CRM integration or grant account access.

## If you are starting in a normal chat

Attach the starter ZIP if your chat supports ZIPs. Otherwise attach `README.md`, `QUICKSTART.md`, the guide for your destination, and `examples/example-output.json`. Ask the assistant to explain the result and walk you through the appropriate setup. Share the relevant workflow JSON when you want help editing it.

Use this prompt:

> I want to use this Website History Signals Starter with [Attio / Apollo / Clay / my CRM]. I am [comfortable / not comfortable] with code. First read the README and destination guide, explain what I will get, and tell me which account details I need. Start with the offline example. Help me connect only the website-activity field, using a multi-select dropdown wherever supported; for Attio, include the formatted company note. Keep the default six-month Fresh Rebuild rule. Use the supplied evidence and do not invent website changes. Tell me whether you can actually execute code and access my tools, or whether I need to run the steps. Keep API keys in environment variables or n8n credentials, not chat messages. Show the preview before enabling writes.

## If your assistant can work in a local folder

Open the extracted folder, then use:

> Read README.md, QUICKSTART.md, and agent/editing-guide.md. Run the offline demo and tests if you have a terminal. Help me configure [destination] using the one-field path. Preserve the provided Attio note formatter when relevant. Report what you actually tested. Use my connected tools only within the access and actions I authorize.

The optional instruction file [website-history-signal.md](website-history-signal.md) gives a coding assistant the output contract and boundaries. It is plain project context, not an automatically installed Claude Skill, MCP server, or ChatGPT action.

## Ask for a useful adaptation

> Adapt the generic n8n workflow to update our [CRM] company field [field name/API ID]. We identify companies by [domain/record ID]. Keep preview mode, coverage checks, and one-company-at-a-time processing. Use the CRM’s official API documentation and explain anything I must configure in my account.

Do not paste your full private enrichment workflow or customer data into a public repository. The starter contains only the reusable website-history portion and synthetic examples.
