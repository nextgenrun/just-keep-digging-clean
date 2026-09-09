# 2026-09-07 mystery voice audition and design audit

This listening mockup contains 12 new scripts in Leo and four identical-script comparisons in Rex: 16 generated recordings. No game runtime imports this catalog or these assets.

## Character direction

A practical miner whose short reactions reveal an unexplained past. Use ordinary words and natural speech. Mystery lives in recognition and memory; dark humour follows a concrete event. Urgent calls name the hazard. Avoid lore explanations, theatrical creepiness, whispering and added reverb.

The mild and strong variants are alternatives. Do not stack every clue into one expedition. Suggested wording: B1, C1 and D1, A1 or E1 for humour, E2 for a rare personal close escape. Voice preference remains a listening decision.

## Current relevance problems

- world/playScene/PlaySceneSetup.js:693-698: Star speech is emitted outside the positive reward guard. Require a real first Star award.
- systems/visual/TitanDiscoverySystem.js:154-158: voice is requested immediately after launching the cinematic. Require completed presentation and continued visibility of the same Titan.
- world/playScene/PlayerVoiceRetentionBridge.js:36-40: quake aftermath carries global opened-passage information. This does not prove the player survived danger. Track personal exposure and calm.
- systems/environment/EarthquakeSystem.js:188-202: any positive warning proximity qualifies. Require actual nearby danger and a fresh warning.
- world/playScene/PlayerVoiceInventoryBridge.js:25: cosmetic HUD capacity cannot establish an actual carrying limit. Omit bag-full speech.
- sound/EventVoiceLineDirector.js:130-144: remarks can wait in a queue. Revalidate at actual playback, including asynchronous asset completion. Skip a busy or stale opportunity.
- world/playScene/PlayerVoiceRetentionBridge.js:10-19: material discovery groups multiple ores. Gold-specific wording requires gold material and an actual inventory gain.

These are audit findings and proposed fixes. The runtime changes are pending design review.

## Proposed rules

Exact conditions, exclusions, expiry windows and frequencies appear beside every recording and in values/playerVoiceMysteryReviewV1.json.

One speaker at a time. A 90-second player-speech gap, at least four minutes between mystery remarks, no more than two mystery remarks in ten minutes, and no repeated exact line within the same session. First-discovery opportunities are consumed per save. Never save a blocked comment for a later unrelated moment.

Routine digging, ordinary rewards, walking, idle time, combos, short Town loops and cosmetic bag fullness remain silent.

## Listening and verification

Open review/index.html through the local server or directly as a file. Accept/reject applies to the wording and its displayed condition. Voice preference and notes are separate. Prepare a reply to paste into the conversation. Decisions stay in the browser; nothing is sent automatically.

All 16 recordings: raw/output hashes match, mono 48 kHz MP3, duration 1.36–2.85 seconds, successful browser playback starts. Both montages played. Accept/reject and reply preparation passed in temporary QA mode without saving decisions. Layout was visually inspected at the normal browser viewport. Browser warning/error log was empty.

Final decoded loudness: -16.75 to -16.03 LUFS; true peak: -2.46 to -2.30 dB. The generator aims within 0.35 LU of -16; four clips retain a small target miss after three bounded passes. All recordings fall within a 0.72 LU spread. Exact measurements are retained. Speech was trimmed and levelled with a peak limiter; speed and pitch were not changed. Original MP3s are preserved.

Human listening approval and the future in-game mix/trigger test remain pending. Browser playback does not establish that a listener likes or understands the delivery.

## Provenance

- Catalog: values/playerVoiceMysteryReviewV1.json.
- Generator: ai-tools/2026-09-07-generate-mystery-voice-review.py.
- Model: x-ai/grok-voice-tts-1.0; stock Leo and Rex voices.
- Editorial direction is documented for review. The endpoint receives each plain transcript and selected voice.
- raw/ preserves original replies and request receipts; audio/ contains processed clips and montages.
- 2026-09-07-audition-manifest.json records transcripts, voices, hashes, durations, loudness and montage timelines.
- --process-only rebuilds from matching raw receipts without credentials or API requests. Put the installed ffmpeg and ffprobe on PATH first.
- Normal generation uses a non-echoing in-memory key prompt. Credentials are never written to the catalog, page, manifest, receipt or command line.
- This batch used 16 recordings and 389 input characters. Character-rate cost estimate: USD 0.005835; this is not an account billing receipt.
