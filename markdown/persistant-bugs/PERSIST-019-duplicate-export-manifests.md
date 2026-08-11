# PERSIST-019: Identical generated export manifests are stored in multiple trees

- Status: confirmed repository debt
- Severity: P3
- Category: exact generated-file duplication / provenance drift
- Evidence: the current SHA-256 scan found five exact duplicate manifest groups, ten files total, under non-discarded `exports/`. Examples include the identical `clean-overwrite-runtime-v3-manifest.json` in `exports/cleaned/...` and `exports/dig_game_runtime_bg_props_v1/cleaned/...`, and the identical `manifest_true_separate_v1.json` in two runtime export trees.
- Failure: identical generated artifacts have multiple apparent owners and paths. A future exporter can update one copy while consumers or reviewers inspect another, and storage grows without adding information.
- Scope note: identical animation payload JSON files were not filed because repeated frame data can be intentional; this record is limited to duplicate export manifests with parallel tree ownership.
- Permanent solution: make the exporter emit one canonical manifest path, keep a provenance/index file for aliases, and archive superseded export trees under the repository archive policy. Add a duplicate-hash gate for generated manifests outside explicitly approved snapshot directories.
- Verification contract: every generated manifest has one canonical path and one producer; any retained duplicate must be declared as a snapshot or alias with provenance.
