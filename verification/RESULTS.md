## Customers & Leads skill export verification

- Skill metadata validation passed.
- The standalone ZIP passed all 35 engine tests and the offline demo after extraction.
- All local Markdown links in the exported ZIP resolve; repeated exports are byte-identical.
- The export excludes local credentials and repository metadata.
- CRM clarification, historical/current separation, and explicit preview confirmation are specified in the skill instructions. Model adherence, platform installation, and live CRM writes were not exercised.

## Multi-select update verification

- 35 tests passed on Node.js 22 and 26, including replacement of prior Attio selections, custom attribute mapping, Apollo option-ID mapping, missing-option rejection, and workflow defaults.
- Offline demo passed. All JSON parsed; local Markdown links resolved.
- The user-edited example note, HTML preview, and note formatter are unchanged from the latest GitHub version.
- No credentialed CRM writes were made; account-specific multi-select compatibility remains a live setup check.

# Verification · September 21, 2026

- 32 automated tests passed under Node.js 22 and Node.js 26: analysis, archive pagination/retries, CRM request contracts, local HTTP endpoints, note formatting, and workflow Code-node safeguards.
- Fresh ZIP extraction passed all 32 tests, the offline demo, and the stage-history report.
- Workflow regeneration reproduced the included JSON files byte-for-byte.
- One-field Attio dry run produced exactly one attribute plus the formatted company note, without any CRM requests.
- Portable example validated against the bundled JSON Schema.
- All JSON files parsed and all local Markdown links resolved.
- Workflow imports contain no credential objects or pinned execution data; their node connections resolve.
- Original workflow credential and instance identifiers were checked against shareable text files; none were found.
- The HTML note preview was opened and visually inspected in the browser. This is a local preview, not a screenshot of a live Attio note.

Not exercised: a live Wayback read in this revision, a real n8n import/execution, a credentialed Attio/Apollo write, deployment to a host, and final Attio renderer behavior. Existing archive retrieval remains covered by deterministic tests. No live CRM data was changed.

The workflow files are supplied as importable starters. Connect and verify one test company in your own account before running a list. n8n Cloud and Clay require a reachable hosted analysis service; no hosting account or endpoint is included.
