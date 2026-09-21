# Contributing

Use Node 22+. Run `npm test` and `npm run demo` before submitting changes. Add deterministic synthetic CDX fixtures for new rules. Keep the core independent of CRM credentials and use injected transports for adapter tests.

Document threshold changes in `docs/detection.md` and bump the engine version. Preserve the difference between archive evidence, inferred findings and observed CRM stage history. Do not add real prospect lists, API keys, private workspace IDs or client assets to tests or examples.
