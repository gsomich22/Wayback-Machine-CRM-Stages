# Apollo: one custom account field

Create one **Picklist (Multi-Select)** account field named **Website activity state**. This starter updates that field, leaving your normal account/pipeline stage separate. It does not create notes or enroll contacts in sequences.

## Find the field and account IDs

Create an API key with access to `api/v1/accounts/update` and `api/v1/fields/index` (or a master key). Export it as `APOLLO_API_KEY` in your shell for this lookup:

```sh
curl --fail-with-body -H "x-api-key: $APOLLO_API_KEY" \
  'https://api.apollo.io/api/v1/fields?source=custom'
```

Find the field whose `modality` is `account` and whose label matches yours. Its ID may look like `account.<24-character id>`. The starter accepts that or the bare 24-character ID. Create the exact options in [the stage list](how-stages-work.md), then copy each option’s ID from the field’s picklist metadata (`meta.picklist_values`). Map labels to IDs using `examples/apollo-stage-options.json`. Option IDs are distinct from the field ID. Missing or placeholder options stop the write.

Find the existing account’s 24-character ID in its URL or the accounts search API. Verify that it belongs to the domain you intend to analyze. An Apollo organization ID is not necessarily your saved account ID.

## n8n

Import `workflows/n8n/apollo-stage-field.json` and follow [n8n setup](n8n.md). Set the domain, service URL, account ID, and field ID in Setup. Keep `stage_field_type` as `multiselect`. Paste your completed label-to-option-ID JSON into `stage_option_ids`. Connect Signals and Apollo credentials. Preview with `apply_changes: false`; then set it to `true` to update the account field.

## Local route

Copy `examples/apollo-stage-only.json` to `apollo-fields.local.json` and replace `id` with your field ID and the `options` placeholders with your picklist option IDs. Keep `type: "multiselect"` and the left-hand key `website_activity_state`.

```sh
npm run analyze -- --domain example.com --out analysis
node src/cli.mjs sync --target apollo --input analysis/analysis.json \
  --record-id YOUR_APOLLO_ACCOUNT_ID --map apollo-fields.local.json
```

After reviewing the dry run, set `APOLLO_API_KEY` in `.env` and apply:

```sh
node --env-file=.env src/cli.mjs sync --target apollo --input analysis/analysis.json \
  --record-id YOUR_APOLLO_ACCOUNT_ID --map apollo-fields.local.json --apply
```

The adapter sends one current option, not a history of previous states. For an existing text field, explicitly set `stage_field_type: "text"` in n8n or use a plain field-ID string in the local map. That is a compatibility fallback, not the default. To migrate, create a multi-select field and point the workflow/map at it; the starter does not change field types in your account.

Optional: map more fields using `examples/apollo-fields.json`. The minimum stays one field.

The request is `PATCH /api/v1/accounts/{account_id}` with `{"typed_custom_fields":{"<field id>":["<Fresh Rebuild option id>"]}}` and `x-api-key` authentication. Your account/API access must allow this endpoint. API errors stop the run; no note or outreach is created.

References: [update an account](https://docs.apollo.io/reference/update-an-account), [list fields](https://docs.apollo.io/reference/get-a-list-of-fields), [custom account fields](https://knowledge.apollo.io/hc/en-us/articles/4412498754445-Create-Custom-Account-Fields).
