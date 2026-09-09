# Core action audio cleanup - 2026-09-05

The main defect was semantic routing and event stacking. The former 91-source
ore-contact bank included twelve electric-guitar notes, domestic metal objects,
and water-bottle hits. The 79-source crystal bank included a radio beep, melodic
texture, reversed ice sounds and all nine rejected clips from the supplied
September 5 export. Prior recording approval was being treated as approval for
a broad keyword-derived gameplay role.

`values/coreActionAudio.js` now selects 4 dirt footsteps, 2 earth contacts,
3 stone contacts, 4 metallic pickaxe contacts and 2 short physical crystal
fractures. The metallic pickaxe recordings previously sat in the stone role.
The complete 562-source approval/provenance registry and every source audio file
are retained. The active projection has 352 sources. The 211 excluded core
routes are documented in `testing/audio-design-cleanup-2026-09-05/excluded-core-routes.json`;
this is a routing exclusion, not a new subjective rejection of every recording.

Main-world and cave mining now use the same material path. A final hit plays
one primary break; non-final hits play one primary material contact. The
separate generic tool layer is removed, swings are quieter, and routine break
and movement gains are restrained. The retained hard-floor bank also had one 546 ms footstep peaking over 12 dB
above its companions. It is excluded from walking; the two short contacts
(128 and 206 ms) are calibrated by active RMS to match the dirt contact family,
with no immediate repeat and no source waveform changes. See
`hard-footstep-calibration.json` in the comparison folder.

Footsteps require actual grounded movement
and respect a short anti-spam interval. Ordinary landings use a foot contact;
heavy debris is reserved for hard falls and follows the contacted material.
Landing strength uses immediate pre-contact downward speed instead of the
maximum speed reached earlier in the flight. Spawn, controller changes and
teleports are silent. The cave update also observes its own player's motion.

Core banks warm their small working sets through the existing bounded loader.
A cold contact warms its intended family and is dropped; it never substitutes
an unrelated recording or replays a stale contact after loading. No new external
AI generation service was invoked and no source waveform was overwritten.

The active re-audit catalog has 764 clips and reports the new gains. Physical
card IDs and browser storage keys are unchanged. The complete supplied review
export is copied byte-for-byte to the comparison folder; the three keeps and
one user gain override remain applicable. The nine rejected clips are outside
the active core routes. The audit page itself remains review-only.

## Listening and validation

Open http://127.0.0.1:8080/testing/audio-design-cleanup-2026-09-05/ for eight
before/after sequences (16 WAV renders). The snapshot loader runs the actual
pre-cleanup modules without swapping live files. Capture includes natural clip
completion, explicit stop times, playback rates and mixer gain changes. Renders
use actual decoded recordings; all 16 have zero clipped samples. Music, speech
ducking, hardware output and live player timing are outside this fixture.

Six focused audio/catalog contracts pass, including twelve new behavioral
checks for real main/cave dispatch, Star isolation, movement admission, braked
landings, cold loads, residency bounds, variants, mute and retained review IDs.
The broader inherited audio/movement/threat suite passes 15 of 16 checks. The
remaining music/Hardcore source assertion also fails with the pre-cleanup audio
snapshot and is unrelated to this patch. Two initially reported earthquake
failures disappeared after independent changes to those tests during this shared
checkout task; both now pass in current and audio-snapshot runs. No earthquake
files were edited by this cleanup. Exact outputs are in `final-audit.json`.

HTTP checks confirm that the comparison, catalog and SoundSystem served on the
existing localhost:8080 endpoint match the current workspace bytes. Browser
control timed out, so there is no claim of a manual browser playthrough or
subjective listening approval. The selected clips and mix still need the user's
listening judgment before completing the wider sound review.

Before snapshots, the prepared patch checkpoint, source credits, excluded
routes, full review export, traces and verification reports are all kept under
`testing/audio-design-cleanup-2026-09-05/`. No deployment or Git staging occurred.


Follow-up: the counts and mix in this document record the first cleanup. See `2026-09-05-pickup-footstep-audio-followup.md` for the current tuning and the real-body ground-probe correction missed by the earlier fixture.
