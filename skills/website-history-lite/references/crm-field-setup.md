# CRM field setup and import

Two fields on the Company object (Account in Apollo and Salesforce):

- **Website Stage**: single select with the 10 stage options
- **Website Stage Refreshed**: date

Menu names shift between CRM versions. If a step doesn't match what the user sees, describe the goal ("add a dropdown field to Companies") and let them find it.

## Attio

**Setup:** Companies → the attribute settings (the `+` at the end of the columns, or Settings → Objects → Companies) → add a **Select** attribute called Website Stage with the 10 options, then a **Date** attribute called Website Stage Refreshed.

**Import:** Companies → Import CSV → match on **Domain**, and map the two columns to the new attributes.

## Apollo

**Setup:** Settings → Objects/Fields → **Accounts** → add a **Picklist** field (Website Stage, 10 options) and a **Date** field (Website Stage Refreshed).

**Import:** Accounts → Import → CSV → match on **Domain** → map the two columns. Choose "update existing" so it doesn't create duplicates.

## HubSpot

**Setup:** Settings → Properties → **Company properties** → create a **Dropdown select** property (Website Stage) and a **Date picker** property (Website Stage Refreshed).

**Import:** Import → File from computer → Companies → match on **Company domain name**.

## Salesforce

**Setup:** Setup → Object Manager → **Account** → Fields & Relationships → New → **Picklist** (Website Stage), then **Date** (Website Stage Refreshed). Add both to the page layout.

**Import:** Data Import Wizard → Accounts → update existing records, matching on the Website/Domain field.

## Clay

**Setup:** No CRM fields. Add two columns to the table (Website Stage as text or a select, Website Stage Refreshed as a date).

**Import:** Import the CSV into the table, or match it to existing rows on Domain.

## Something else / none

For another CRM: any dropdown field plus a date field on Companies works. Import matching on domain.

For none: skip setup and just keep the CSV and the HTML report.
