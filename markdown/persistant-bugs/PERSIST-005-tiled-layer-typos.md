# PERSIST-005: Authored tiled layer identifiers contain spelling errors

Severity: `P4`
Status: confirmed active naming inconsistency; currently behaviorally consistent
Area: authored visual data

## Evidence

`values/tiledBackgroundObjects.js` repeats these identifiers across layer metadata, layer maps, and layer order:

- `v2_6_mid_terrein_masses` uses `terrein` instead of `terrain`.
- `v2_11_near_probs_seambreakers` uses `probs` instead of `props`.

The references are currently consistent, so the identifiers resolve today. The defect is the public data naming contract, not a currently missing lookup.

## Impact

The misspellings make searches, tooling, and future data additions error-prone. A contributor can create the correctly spelled key in one location and leave the misspelled key in another, producing a silent missing layer or an apparently empty visual region.

## Permanent solution setup

- Define canonical layer IDs in one schema module rather than repeating raw strings.
- Migrate to correctly spelled IDs through a versioned data migration, not a blind rename.
- Keep a temporary alias map for old authored data and emit a development warning when an alias is read.
- Validate that every `layerOrder` entry exists in the layer map and that every layer map entry is intentionally ordered.
- Add a spelling and unknown-ID check to the authored-data CI gate.

