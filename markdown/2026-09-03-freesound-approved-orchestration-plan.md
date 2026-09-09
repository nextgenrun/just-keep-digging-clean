# Approved Freesound orchestration — implementation plan

## Authority and scope

The user requests a plan followed by wiring **all approved** entries from
`understar-freesound-review-decisions (2).json`, exported 2026-09-03.
Its SHA-256 is `9968a81d2fb652b749543e7e3c18bcf105975ab1952a533c31b5dab94ec62ed7`:
562 approved, 775 rejected; every approved ID resolves in the existing catalog.
This supersedes the previous Freesound export, not the earlier 51 approved
runtime sources. Rejected and unreviewed candidates must remain disconnected.

No changes to damage, movement, rewards, panic accumulation, Star refuge radius,
world generation, saves, or existing approved Star destruction/level-up cues.
No new audio service, credential storage, or automatic approval mechanism.

## Batches, in order

1. Freeze the exact export; assign every approved ID a named runtime role.
   Download only its catalogued public HQ preview. Preserve source and license
   URLs, creator, hashes, declared original format, and preview provenance.
   Prepare short onset-aligned one-shots and bounded seam-treated loops;
   measure every derivative. These are preview-derived game assets, not claimed
   lossless originals. Generate a complete attribution file and coverage report.
2. Add bounded contextual variant banks to the existing audio routing. Dirt
   (4), stone (19), metal (91), fracture (79), footsteps (32), Flight (10),
   rewards (15), and UI (56) follow real contacts/transitions/transactions.
   Small matched banks rotate gradually; no immediate repeat or late queued hit.
   Preserve the existing approved fallback until the selected bank is ready.
3. Add Star sound pockets using the 80 approved Star textures: stable site
   identity, finite hearing radius, player-relative direction, smooth distance
   fades, muffling through rock, and one dominant site with bounded handover.
   A separate near-refuge texture communicates arrival. Consumption removes the
   emitter immediately; it does not alter the Star's gameplay influence radius.
4. Route 84 danger candidates by meaning: heartbeat/panic follows actual panic
   state; rumble follows an aware seismic threat. Route 92 structural wood
   recordings as sparse strain/creak details in appropriate structural contexts.
   Quiet refuge, speech, pause, and inactive scenes suppress optional detail.
   Do not run unrelated atmosphere, heartbeat, and warning timers independently.
5. Expose a save-free interactive orchestration review using the actual runtime
   controllers, with distance/occlusion, panic/recovery, material, and overlap
   controls and explicit currently-playing IDs. Keep the original review export
   and candidate approvals intact.

## Mix and performance contract

- Keep source preparation, role gain, category/speech ducking, and master gain
  distinct; apply each once. Use measured source peaks and shared headroom.
- Essential warning/reward feedback must not be evicted by decorative sounds.
- Load a bounded working set on demand; never preload all 562 at game boot.
- Limit simultaneous beds, accents, and rapid repeats. Loading may warm a future
  event but may not replay an old contact after its animation has passed.
- Source approval is preserved independently from derivative QC and actual
  wiring coverage. A missing or failed derivative is a reported failure, not
  silently called wired.
- All tuning lives in `values/`; new runtime responsibilities stay in `sound/`.
  Extend existing hooks rather than adding a second gameplay event authority.

## Two independent audits

**Timing/lifecycle:** all 562 approvals have reachable approved-only routes;
contact cadence, no late loading callbacks, palette rotation, Star direction,
near/far thresholds and rock opening, two-Star handover, consumption, panic
entry/recovery, Flight transitions, pause/mute/resume/teardown, and bounded
loading/residency. Run relevant existing audio and movement contracts.

**Volume:** decode and measure every prepared asset; verify onset, duration,
loop boundary, peak/RMS, role gain and category/master application. Stress
overlap, speech duck, near-Star plus mining, and danger plus reward separately.
Check real browser playback and readable diagnostics. Automated results do not
claim subjective acceptance, hardware speaker coverage, or full-repository
health. Record remaining limits honestly in the final audit.

## Progress

- Planning and exact approval-count verification complete.
- All five implementation batches complete: 562 prepared, attributed and wired.
- Timing (12 checks) and volume (8 checks) audits pass; all 16 focused regression
  contracts pass. Native-channel waveform checks cover all 562 assets and six
  overlap renders with zero clipping. Browser evidence includes actual Star and
  earth-contact playback, with listening/coverage limits stated explicitly.
- Results and handoff: [completion audit](2026-09-03-freesound-approved-orchestration-audit.md).
