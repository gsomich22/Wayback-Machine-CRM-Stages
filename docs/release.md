# Release notes · starter v0.3.0 / package v7

This folder is the shareable starter source. It has not been published to GitHub or a hosting service. The original launch video and social-post materials remain in the separate version 6 launch ZIP; they are not required to use this starter.

## What changed from v6

- The README explains the value before setup details, with separate paths for Attio, portable fields, AI assistance, and local use.
- Default CRM setup is one field; the eight-field maps remain optional.
- Three importable n8n workflows: Attio stage + company note, Apollo custom field, and generic field output.
- Attio note formatting follows the supplied working company-note layout, including the compact activity bar and spacing.
- Portable `signal.json`, a JSON schema, an HTTP `/v1/signal` endpoint, checked-in examples, and an HTML note preview.
- Claude/ChatGPT context and copyable setup/customization prompts.
- Stage timing is configurable. The six-month Fresh Rebuild default and existing stage labels are unchanged.
- Customer-baseline instructions distinguish historical evidence from recorded CRM stage history. CSV batching and automatic pattern discovery are not implemented.

The private enrichment workflow was used as a formatting reference. Its credentials, personal contacts, company data, instance identifiers, and unrelated enrichment modules are not distributed.

## Verification scope

Local checks cover the analysis engine, pagination/retries, incomplete retrieval, mocked Attio/Apollo API contracts, real local HTTP routes, note formatting, and executable n8n Code-node logic for company matching and note ownership. The offline demo and stage-history command were run. See `verification/RESULTS.md` for the final count and checks.

These checks do not establish a successful n8n import or credentialed CRM execution. Before using a list, import the workflow in your n8n instance and run it against one test account. For Attio, inspect the rendered note and run again to confirm the managed note is reused. API access, workspace permissions, select options, and renderer details are account-specific.

## Share or publish

Share the supplied ZIP or copy this folder into a new repository. If making a public repository, include source, config, docs, synthetic examples, workflow JSON, and tests. Exclude `.env`, credentials, pinned executions, real analysis outputs, local field maps, and customer data. The `.gitignore` includes the common local files.

Run `npm test` and `npm run demo` from a fresh extraction before release. Do not claim a hosted service is included: the owner must deploy it for cloud automation, or use the local command route.
