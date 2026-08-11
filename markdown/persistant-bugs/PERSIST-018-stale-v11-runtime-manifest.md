# PERSIST-018: Stale V11 runtime manifest remains beside live replacement manifests

- Status: confirmed
- Severity: P2
- Category: stale generated artifact / duplicated runtime contract
- Evidence: `values/v11BackgroundRuntimeManifest.js:1` identifies itself as a generated file, but the active import graph has no consumer for it. Its data records `missingGroups` at `:22` and `runtimeWired:false` at `:26`. The live background owner imports `values/v11PolishedSurfaceRuntimeManifest.js` and `values/v11DepthBackgroundRuntimeManifest.js` from `world/rendering/WorldBackgroundMasterSystem.js:5-6`.
- Failure: maintainers see a production-looking `V11_BACKGROUND_RUNTIME_MANIFEST` beside the active manifests, but it describes an incomplete, unwired export. A future change can select the wrong manifest or make an apparently valid generated artifact authoritative by accident.
- Permanent solution: keep one manifest registry with explicit status (`active`, `review`, `superseded`) and provenance. Archive or remove the unconsumed incomplete manifest after confirming no external pipeline depends on it, or make its non-production status explicit in its filename and metadata. Add an orphan-generated-artifact gate.
- Verification contract: every production-looking runtime manifest has one active consumer and passes completeness checks; superseded manifests cannot sit beside active owners without an explicit status marker.
