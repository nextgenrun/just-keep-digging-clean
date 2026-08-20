# UNDERSTAR Steam Store Localization Pack V1

Upload-ready Steamworks store-page localization for app `1253785`.

## Included languages

- English (edited source copy)
- Dutch
- German
- French
- Spanish (Spain)

The remaining Steam language objects are preserved exactly as exported and left blank. This lets the file be uploaded now without implying that unreviewed translations are complete.

## Files

- `storepage_1253785_localized_en_nl_de_fr_es.json` — file to upload in Steamworks.
- `2026-08-18-build-storepage-localization.mjs` — deterministic merger and validation script.
- `2026-08-18-storepage-translations.json` — reviewed translation source used by the merger.

## Validation

The build script verifies the app ID, language keys, field keys, non-empty translated values, BBCode balance, and preservation of untouched language slots. A native-speaker editorial pass is still recommended before publicly publishing any translated store page.

