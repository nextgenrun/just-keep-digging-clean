# Leo 300-line audit — 2026-09-07

This package is a script, persona, trigger and mixing review. It does not replace the current gameplay voice library.

## Library

- Exactly 300 unique scripts: 276 event reactions in 23 groups, plus 24 context-independent wandering thoughts.
- Three to nine spoken words per script. The intended recording target is 1–4 seconds; new recordings have not been generated or timed.
- All 12 original restrained scripts and the eight additional emotional-audition scripts remain eligible. Twenty scripts have existing Leo audio references, including four original/expressive comparisons.
- L001–L300 IDs remain stable. The source lives under values/player-voice-library-300-review-v1.
- Scripts sharing a moment are alternatives. Approval of twelve variants never means twelve reactions to one event.
- L193, “I used to hate daylight,” specifically requires actual daylight.
- Persona: a capable, tired drifter with ordinary needs, dry humour and reluctant affection. Ancient familiarity and incomplete memories suggest a past without fixing a biography.

## Auditing

Single-line mode advances after Yes or No. Twelve-per-page mode, event/decision filters, search, notes, resume, JSON download/import, CSV and a compact chat reply support a full audit.
Decisions are stored separately from the earlier reviews. Fingerprints keep decisions attached to unchanged wording, emotion and conditions. Added audio does not invalidate a script decision.
QA uses separate or disabled storage and muted output. The delivered page has no QA flag and begins with 300 unreviewed lines.

## Proposed playback rules

- NPC conversations, narration and cinematics reserve one speech channel, including loading and lead-in. Events and random lines do not interrupt active speech.
- “NPC conversation” means a speech/text dialogue reservation. A quiet transaction panel alone need not reserve the channel. Purchase reactions still require success, visible confirmation, no active NPC conversation and the shared quiet gap.
- One reaction per authoritative transaction or reveal. Recheck the visible cue, current scene, safety and freshness immediately before audio starts. Expired player lines are discarded.
- Normal player spacing is at least 90 seconds, with a four-per-ten-minute ceiling and additional family/flavour limits.
- Urgent rock/stress warnings must start while their cue is current and clear the other-speech gate. Critical admission never authorizes voice interruption.
- Random opportunities occur after 27–33 minutes of active gameplay; menus, pause and hidden tabs do not advance the timer. Safety and quiet gaps are required. There is no missed-line backlog.
- Music approaches 24% of the user's baseline over about 900 ms, stays lowered through speaker handoffs, then returns over about 2400 ms after a 450 ms hold. It never writes over the user's preference.
- The music preview uses a Web Audio exponential approach. Its 300/800 ms time constants produce approximately 95% of the fade by 900/2400 ms, following the [AudioParam documentation](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime).

## Verified

- Builder validates counts, uniqueness, stable IDs, word limits, source evidence paths and the hashes of every reused Leo recording.
- CSV contains all 300 scripts plus a header.
- Focused contract covers paused/hidden/menu time, NPC/narration/danger/event suppression, quiet gaps, 27/33-minute bounds, missed-window discard and the smooth envelope.
- Browser: Yes/No, auto-advance, notes, chat reply, filters, twelve-card pages, L193's daylight condition and the L300 final page passed.
- Browser: isolated stored decisions survived a reload with the correct resume point and overall note. The actual user namespace remained empty.
- Browser: existing music and voice decoded without media errors. The visible gain trace eased through 39%, 30%, 25%, 24%, then recovered through 41%, 64%, 76%, 90%, 95%, 99%.
- Browser: an event attempt during NPC speech was skipped. A queued NPC began after Leo finished, using the same single voice element; music stayed at 24% across the handoff.
- Browser: 30 simulated paused minutes added zero active time; an open NPC conversation held the due thought without creating audio; closing it allowed one thought and rescheduled the next opportunity.
- Normal viewport screenshot inspected. JavaScript syntax checks and credential scan passed. Browser console contained no errors during these checks.

## Integration work after the audit

The current VoiceLineVolumeDucker toggles gains immediately; the live director can queue player reactions past a recognizable moment. The inventory indicator is visual fullness, not a physical inventory limit.
Use the existing VoiceLineManager/EventVoiceLineDirector ownership when integrating the accepted library. Add explicit dialogue/cinematic reservations, the fresh-context recheck, the active-play timer and a tweened gain envelope there.
Quake aftermath needs a personal-exposure/near-miss ledger; raw quake recap alone is not sufficient. New level/talent/Ember/tree/fire adapters need their confirmed award or reveal completion. Do not infer them from ticking state, camera proximity or save restoration.
The review speech bus demonstrates arbitration and fades; it is not proof of in-game event detection. Final recordings and gameplay verification follow the yes/no script pass.
