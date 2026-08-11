# PERSIST-015: Declared visual-region SSOT is unreachable from production

- Status: confirmed contract drift
- Severity: P2
- Category: orphaned configuration / documentation mismatch
- Evidence: `values/worldVisualRegions.js` exports `WORLD_VISUAL_REGIONS` and `resolveWorldVisualRegions`, but the active import graph has no consumer for that module. `values/readme.md` describes `worldVisualRegions.js` as part of the scenic-v2 visual SSOT. The active scenic runtime instead imports the depth backdrop stages directly. The separately unreachable `WorldVisualShallowCavernStage.js` is explicitly documented as a compatibility export and is not counted as an active defect.
- Failure: edits to the declared region SSOT cannot affect production rendering, while maintainers are told that the file owns runtime visual regions. This creates a dead configuration path and makes it unclear which module controls scenic coverage.
- Permanent solution: choose one owner. Either wire `WORLD_VISUAL_REGIONS` into the active scenic runtime and remove parallel region decisions, or mark the file review-only/archive it and correct `values/readme.md`. Add an orphan-value gate for production-designated modules.
- Verification contract: every file described as production SSOT must have an active consumer; every intentionally unreachable review or compatibility module must carry an explicit review/archive marker.
