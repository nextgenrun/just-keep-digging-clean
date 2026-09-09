# Yes/no library review

Provides a paged 300-script audit with exact event conditions, emotional intention, notes, local progress, export/import and a music/speech preview. Uses existing local audio only. `?qa=1` keeps test choices out of saved progress and mutes preview output. The speech/music preview is a review model; gameplay is unchanged.

## Submitted review

The 2026-09-07 decision receipt preserves the submitted JSON exactly. It approves 246 scripts (225 event reactions and 21 rare thoughts), rejects 54 and leaves none pending. Eighteen approved scripts have 22 existing Leo takes; 228 need recording. See `2026-09-07-submitted-review.md`, `2026-09-07-approved-selection.json` and `2026-09-07-recording-plan.json`.

Rebuild derived approval artifacts with `ai-tools/2026-09-07-import-leo-review-decisions.py`. It verifies the complete catalog hash and every script/condition fingerprint, and refuses to overwrite a different submission. The page offers an explicit button to load submitted choices without silently replacing newer browser edits. Source scripts, fingerprints and gameplay remain unchanged.

## Silent trigger mockup - 2026-09-08

trigger-mockup.html previews 24 proposed trigger families using only the submitted approved wording. It animates confirmation, text-caption timing and a visual music envelope; it makes no audio requests. NPC ownership, stale cues, cooldown and muted-voice cases demonstrate suppression. Trigger decisions use separate, proposal-checked browser storage and export; ?qa=1 disables persistence. It does not import game systems or change the original script/condition approval receipt. See 2026-09-08-trigger-mockup.md.

## Broader trigger mockup - 2026-09-08

trigger-breadth.html groups 37 situations into 12 families, reusing accepted wording and marking nine new scripts as unapproved drafts. Each case has its own cue and exact sentence. It remains silent and keeps its decisions separate from V1. See 2026-09-08-trigger-breadth.md.
