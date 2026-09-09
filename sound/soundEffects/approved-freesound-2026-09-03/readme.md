# Approved Freesound gameplay derivatives

Local, measured derivatives of exactly the user's 562 approved public HQ
previews. Original lossless files were not downloaded. `manifest.json` preserves
approval, source/creator/license links, hashes, exact edits, levels and durations.
`CREDITS.txt` supplies the distributed audio attribution and modification notice.

Reproduce with the explicit frozen export and
`pipelines/audio/prepareFreesoundApprovals.py --execute --decisions <export>`.
The command resumes already verified files and fails rather than projecting an
incomplete approval set. Runtime controllers load only a bounded working set.
