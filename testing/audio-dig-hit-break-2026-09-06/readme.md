# Dig, hit and break audio audit - 2026-09-06

Open the focused review at `/testing/audio-dig-hit-break-2026-09-06/` through canonical `serve.py`.

The audit contains **19 unique current recordings across 116 routing cases**. It covers swings; earth, stone and metal hits; earth/stone/crystal destruction; blocked hits; disabled-bank fallbacks; Star hit/destruction; representative cave dispatch; and separately labelled Level Two material routes. It audits the current mix without changing gameplay or source files.

## Findings to audition first

- Dirt hit A and B have their main energy approximately 61 ms into the source. B also has a 705 ms source tail. Actual material rate changes these durations.
- The blocked-hit recording (`libToolContact`) lasts 1.2 seconds, with its main body about 49 ms in. The disabled-bank hard-material fallback uses the same recording at a lower gain.
- Metal hits have prompt attacks but last 434-581 ms before material pitch changes. The longest becomes about 684 ms on steel. Audition overlap and ringing, including the quieter tail.
- Stone/metal destruction share one recording. Playback rate and gain distinguish materials, but the underlying texture stays shared.
- The Star-hit cue is a musical chime with its main body about 389 ms into a 1.144-second recording. Check whether that sustained tone belongs on each partial Star hit.
- The Star-hit chime has an estimated solo peak 10.6 dB above the loudest ordinary hit in this audit. This is a peak comparison, not perceived loudness or LUFS.
- Crystal break A and B differ by 6.7 dB in estimated peak at the same dispatch; compare their balance before approving the pair.
- Star destruction is a separate 7.385-second special cue. Its long duration should be judged in the rare Star-consumption context, not automatically treated as a routine-contact fault.
- Stone hit recordings are 142-164 ms with prompt attacks; current earth/stone/crystal break edits also have prompt main bodies. These are useful timing comparisons, not listening approvals.

Cold-load verification corrects an initial audit assumption: missing current material hits are silently dropped and warmed. Loading completion does not replay the contact and does not insert another family. The fallback audition is the explicit disabled-bank route, not ordinary cold loading.

## Measurements

These are decoded source/window measurements at native channel count. Main body means the first 5 ms RMS window reaching 45% of maximum RMS; it is not the first nonzero sample or a claim that everything before it is silent. Estimated peak is source peak times captured solo output gain, excluding interactions with other simultaneous game sounds. It is not LUFS.

| Recording | Current buffer ms | Main body ms | Estimated solo peak dBFS across routes |
|---|---:|---:|---:|
| Swing / whoosh | 457 | 36 | -32.1 to -32.1 |
| Dirt hit A | 359 | 61 | -21.5 to -21.5 |
| Dirt hit B | 705 | 61 | -20.4 to -20.4 |
| Stone hit A | 143 | 0 | -28.7 to -28.7 |
| Stone hit B | 142 | 0 | -25.7 to -25.7 |
| Stone hit C | 164 | 0 | -26.1 to -26.1 |
| Metal hit A | 434 | 0 | -24.2 to -24.2 |
| Metal hit B | 470 | 1 | -23.2 to -23.2 |
| Metal hit C | 543 | 0 | -24.6 to -24.6 |
| Metal hit D | 581 | 0 | -24.6 to -24.6 |
| Earth destruction | 320 | 7 | -20.4 to -19.4 |
| Stone / metal destruction | 300 | 2 | -21.5 to -20.0 |
| Crystal break A | 140 | 6 | -27.0 to -27.0 |
| Crystal break B | 155 | 6 | -20.3 to -20.3 |
| Blocked hit / hard fallback | 1200 | 49 | -24.0 to -20.9 |
| Dirt fallback A | 102 | 26 | -15.0 to -15.0 |
| Dirt fallback B | 102 | 27 | -18.5 to -18.5 |
| Star hit chime | 1144 | 389 | -9.8 to -9.8 |
| Star destruction | 7385 | 7 | -17.0 to -17.0 |

## Review controls and evidence

`capture.mjs` invokes actual `PlaySceneGameplay`, cave feedback and `SoundSystem` routing with controlled clocks, captures source/gain/rate/window choices, and retains the active audit's source IDs. `measure.py` measures the unchanged originals and current playback windows. `values/audioDigHitBreakReview.js` holds the review configuration. `player.js` preloads only the 19 recordings and uses the actual SoundSystem for source audition and the four-hit/one-break example.

Each recording has context-specific gain/rate playback, original-source playback at the same gain/rate, a fixed 500 ms repetition example, KEEP/REJECT, issue tags, notes and JSON export. The shared KEEP/REJECT store retains the existing main audit identity. Notes use a separate store. Writes merge the latest stored decisions; no review state is automatically approved or applied to gameplay. The export includes the focused decisions, notes and any native check result shown on the page.

The sequence is explicitly scripted: 500 ms between actions and a 110 ms swing lead. It exercises current audio methods but is not a gameplay recording or animation/contact proof. The native check button checks all 19 buffers for gain, rate, duration, completion, voice cleanup and cache/source preservation.

`verification.json` records five passing focused checks: complete source coverage, all routing cases, matching cave/main routes, source/ID/reject preservation, and no delayed cold-load replay. `served-files.json` records byte-identical canonical HTTP checks and static module/DOM checks. Source SHA-256 hashes are recorded per item. The nine rejects from the provided export are excluded.

Browser verification is **pending**: the browser tool timed out and reset its session repeatedly, including on a basic no-browser connection check. No visual inspection, native playback pass or listening approval is claimed for this new page. The in-page check can record its result into the audit export. The app queued this page to open in the current task.

## Shared source callers outside this focused mining audit

The same hit/break recordings also appear in Wurm events, Arc Core work, celestial abilities and the Shadow Miner. Random events reuse the Star chime at different rates. The jackpot's separate `mine-hit` failure cue is a non-mining interaction and is outside this scope. No non-mining routing is changed here.

Rebuild from the repository root with the bundled Node/Python:

1. `node testing/audio-dig-hit-break-2026-09-06/capture.mjs`
2. `python testing/audio-dig-hit-break-2026-09-06/measure.py`
3. `node testing/audio-dig-hit-break-2026-09-06/verify.mjs`

The only change to the earlier review is a navigation link. Its previous HTML is retained as `previous-review-index-before.html`.
