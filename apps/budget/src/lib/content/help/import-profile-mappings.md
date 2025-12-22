---
title: Column Mappings
description: How CSV columns map to transaction fields
related: [settings-import-profiles, import-page]
---

# Column Mappings

Shows how CSV columns are mapped to transaction fields.

## Common Mappings

| CSV Column | Transaction Field |
|------------|-------------------|
| Date | Transaction Date |
| Description | Payee/Merchant |
| Amount | Transaction Amount |
| Credit/Debit | Separate inflow/outflow |
| Memo/Notes | Additional notes |
| Category | Category suggestion |

## How Mappings Work

During import, you tell the app which CSV column contains which data:
- "Column A is the date"
- "Column B is the description"
- etc.

These mappings are saved with the profile.

## Editing Mappings

Column mappings are set during import and cannot be edited directly. To change mappings:
1. Import a new file with this profile
2. Adjust the mappings during import
3. Save to update the profile

## Tips

- Review mappings if imports seem incorrect
- Different banks use different column names
- The profile remembers column positions, not names
