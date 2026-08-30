# Player character LEO V1

Canonical dynamic player speech for The Miner. This is a runtime library, not
an ambient playlist: each clip belongs to a confirmed gameplay event and uses
the single shared voice channel.

- Source SSOT: `values/playerVoiceCharacterLeoV1.json`
- Runtime projection: `values/playerVoiceCharacterLeoV1.generated.js`
- Generated MP3s: `audio/`
- Provenance: `2026-08-30-player-character-leo-v1-manifest.json`
- Interactive review: `review/index.html`

The accepted LEO Titan-discovery take is copied byte-for-byte from the V2
audition library. The other 95 clips are resumable OpenRouter generations.
The batch estimates USD 0.138585 and has a stricter USD 1 local cap under the
user's EUR 5 ceiling. API credentials must never be written here.

Legacy random player voice lines are disabled. Merchant lines remain separate,
roll at 35% on shop open, and cannot interrupt player, narration, or NPC speech.
`?playerVoiceMode=stress10x` multiplies event chance by ten (capped at 100%) and
divides cooldowns and quiet tails by ten while preserving the one-channel,
two-item bounded queue. Use `?playerVoices=0` for rollback and F8 to audition
the selected `?playerVoiceFamily=<familyId>` during development.
