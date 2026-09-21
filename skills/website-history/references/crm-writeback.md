# Required discovery before CRM upload or writeback

The user may provide a CSV and later choose a CRM destination, or read from one CRM and write to another. Confirm the destination separately from the source. A connection, an instruction to analyze, or a request for a CSV does not authorize importing or updating CRM data.

Ask concise, grouped questions for unresolved details. Inspect available metadata read-only to offer concrete options instead of asking the user to guess API IDs. Reuse confirmed answers; do not repeatedly ask about settled details.

## Resolve these details

1. **Destination:** CRM product, exact account/workspace/environment, and object/list receiving results. Is this a company/account, deal, or list entry? Confirm the actual connected account.
2. **Record match and scope:** exact reviewed cohort, number of rows, source-to-destination ID mapping or unique domain match, and how to handle missing/duplicate records. Default to updating uniquely matched existing records and skipping ambiguous/unmatched rows. Creating records requires separate explicit agreement.
3. **Field mapping:** actual attribute API slug/ID, field type, exact allowed options, and option IDs where required. Prefer multi-select if supported. Ask about existing Text/single-select fields; propose a new multi-select field instead of converting/deleting it silently. Field creation and option creation are separate schema changes to include in the approval preview.
4. **Meaning:** Leads use the current website-activity field. Customers use a distinct historical field such as Website state at close. For multiple closes per company, use a deal field or dated historical records; do not collapse them into a single company value without an agreed rule.
5. **Notes:** field only or field plus note? Confirm note title, target object, and whether to create a new note or update an explicitly identified managed note. A historical note must have a distinct title including close date/deal identity. Do not overwrite current notes or handwritten research.
6. **Update policy:** replace the previous website-state selection with the new one, preserve unrelated fields, and skip incomplete results. Identify any deliberate exceptions. Do not append a sequence of old states, erase fields for failed analysis, or alter sales pipeline stages.
7. **Access:** verify the tool/token can perform the proposed operations. Request a connection through the assistant’s normal credential UI or environment, not by pasting secrets into chat. Do not expand permissions or use another connected account as a workaround.

## Preview, then confirmation

Complete read-only matching and analysis first. Show the exact destination, object, field names/types/options, record IDs (or an attached full manifest with representative rows), before → after values, note examples, counts, skipped rows, and any proposed field/option creation. Include the intended import/update mechanism.

Then ask a concrete question, for example:

> Update these 18 matched company records in [workspace], replacing [field] with the previewed selections and adding/updating the shown managed notes? The 3 unresolved rows will be skipped. No records or fields will be created.

Wait for an explicit affirmative response to this concrete preview. Do not upload the CSV, run `sync --apply`, call a mutation API, or start an import while confirmation is pending. Consent to a prior batch is not consent to additional records, another workspace, changed field mappings, schema changes, or a different note policy.

After confirmation, operate only on the approved manifest. Inspect current values again if the preview is stale or another process may have changed them. Start with one approved record, verify its result read-only, then continue serially. If the first write reveals a schema or matching error, stop the batch. Record successes and failures. An uncertain response to note creation may mean the note exists: inspect before retrying instead of creating duplicates. Do not blindly rerun the whole batch after partial success.

## Destination-specific behavior

**Attio:** the bundled Leads adapter uses a multi-select stage array and `PUT /v2/objects/companies/records/{record_id}` to replace the previous selection; notes use separate create/update calls. The CLI requires an existing company UUID but does not verify its domain itself: perform that match read-only before preview. Its default note title is `Website History · domain`; do not use stock `sync` for Customers because it would reuse the current company note. Prepare a separate historical field/note plan using the available CRM tools/API. Read `ENGINE/docs/attio.md` for the packaged adapter contract.

**Apollo:** a multi-select mapping needs the custom account field ID and each picklist option’s ID. The bundled map shape is `{ "website_activity_state": { "id": "field-id", "type": "multiselect", "options": { "Fresh Rebuild": "option-id" } } }`. Never guess option IDs or put display labels into ID-only payloads. Read `ENGINE/docs/apollo.md` for the contract. Legacy text mode is a fallback only when selected explicitly.

**Other CRMs / CSV imports:** confirm the destination’s array, option-ID, or delimiter requirements and replacement semantics from its available tool schema or official API docs. Do not assume Attio’s PUT behavior applies everywhere. If the assistant cannot perform or verify the requested write, return the reviewed mapping and export, clearly marked not uploaded. The user importing it themselves is a separate action.
