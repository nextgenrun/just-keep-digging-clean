# Leo trigger mockup - 2026-09-08

Review page: trigger-mockup.html

This is a silent storyboard, not a runtime change or a new recording pass. It uses 24 exact approved scripts from the submitted 300-line review and nine illustrative trip rows. All proposed timing, conditions, existing art paths and examples are owned by values/playerVoiceTriggerReviewV1.js. No game system imports that configuration.

## Proposal to audit

- Common bronze, iron, silver and gold awards can recur on fresh collection. They share a 45-second gap instead of ending after a once-per-save discovery.
- Real departures can recur once per trip; visible regions once per session. Town-return eligibility is proposed at 100 m instead of 300 m.
- Ordinary remarks have a 25-second minimum gap, with at most eight in five active minutes. No admission chance roll. These are ceilings, not speech timers.
- Speak within the visible moment: normally start after 0.45 seconds and discard stale cues after 2-3 seconds. Warning admission expires after 0.9 seconds and speech starts immediately.
- Warnings bypass ordinary spacing, retain their own 45-second gap, and never interrupt speech. A blocked warning leaves the visual warning available.
- Cinematics, narration and NPC conversations own the shared speech channel, including pauses between dialogue sentences. A blocked player reaction does not wait for a late replay.
- Random thoughts retain 27-33 active-minute opportunities, safety and quiet gates, a two-minute window and no backlog.
- Music is visualized at 24% of the chosen baseline, easing down over 0.9 seconds and returning over 2.4 seconds after a short hold. Caption duration is an illustrative 2.8 seconds, not a measured recording.

The page explicitly labels each change from the previous script-review trigger definitions. Existing approved wording and the original condition fingerprints are not rewritten. Proposed emotional delivery notes are direction for a future audition, not listening acceptance.

## Review decisions

There are 24 independent trigger yes/no decisions with optional notes. They use a new browser-storage key, bind to the exact moment proposal, catalog hash and timing policy, and export separately from the original 300-line submission. QA mode (?qa=1) does not save test choices. There are no voice-generation calls, speech-synthesis calls or audio playback elements.

## Verification

- JavaScript syntax checks passed for the values and both page modules.
- All 24 main scripts and nine trip examples match accepted IDs and their actual groups.
- Browser: all 24 moments render their script and conditions; the gold confirmation precedes its caption and the visual music level returns to 100%.
- Browser: NPC ownership blocks player speech and retains the shared lowered music bed. Stale cues, cooldown and muted speech block without a Leo dip. Rare thoughts are blocked during NPC dialogue.
- Browser: danger captions start immediately. Both yes/no choices and notes reach the prepared chat reply; reloading QA clears test votes.
- Desktop screenshot and DOM bounds show no horizontal overflow. The page includes narrow-layout CSS; no separate device simulation was performed.
- Original catalog SHA-256 remains 678a3d6c30870ae87d2288f57268a41097996455d3ec410bcd549f364eb0b99b.
- Original submission SHA-256 remains acf8c6601e292d9295d23712bc335c785b655d27a4330d06587fb7f9942d706c.
