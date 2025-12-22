---
title: Import Profiles
description: Manage saved CSV import configurations
related: [import-page]
navigateTo: /settings/import-profiles
---

# Import Profiles

Manage your saved import profiles for quickly importing transactions from different banks and sources.

## What Are Import Profiles?

Import profiles save your column mapping configurations so you don't have to set them up each time you import from the same source.

When you import a CSV file, you map columns like:
- Date → Transaction Date
- Description → Payee/Merchant
- Amount → Transaction Amount
- etc.

Saving this as a profile lets you reuse it for future imports.

## Profile Settings

### Profile Name

A descriptive name for this import source (e.g., "Chase Checking", "Amex Gold Card").

### Column Mappings

The saved column positions for each field. These are set during import and displayed here for reference.

### Filename Pattern

An optional pattern to auto-match files to profiles.
- Use `*` as a wildcard
- Example: `chase_*.csv` matches any file starting with "chase_"
- When importing, matching profiles are suggested automatically

### Associated Account

Link a profile to a specific account.
- New transactions import directly to this account
- Saves time selecting the destination account

### Default Profile

Mark a profile as the default for its associated account.
- Auto-selected when importing to that account
- Only one profile per account can be default

## Managing Profiles

### Edit a Profile

Click the edit button to modify:
- Profile name
- Filename pattern
- Associated account
- Default status

Note: Column mappings are set during import and cannot be edited directly.

### Delete a Profile

Remove profiles you no longer need. This doesn't affect previously imported transactions.

## Tips

- Create separate profiles for each bank/card
- Use descriptive names you'll recognize later
- Set filename patterns to auto-match common downloads
- Mark frequently-used profiles as default
- Profiles are workspace-specific
