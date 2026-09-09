# Approved SFX findings V1

## 2026-08-31 promoted Freesound cues

Only these three newly approved cues are production-wired. The other panic,
Star-aura, release-arc, and deep-ambience candidates remain inside the audio
review sandbox.

- `star-destruction-shockwave-freesound-814053.mp3` — **Shockwave** by qubodup,
  Freesound 814053, CC0 1.0. Public 44.1 kHz stereo HQ preview.
- `level-up-short-freesound-320655.mp3` — **Level Up 01** by rhodesmas,
  Freesound 320655, CC BY 4.0. This is the canonical higher-quality source of
  the approved re-encoded Freesound 337049 copy.
- `level-up-epic-freesound-682633.mp3` — **Level up** by Bastianhallo,
  Freesound 682633, CC0 1.0. Public 44.1 kHz stereo HQ preview.

Checksums, measured loudness, source URLs, and license URLs are recorded in
`2026-08-31-freesound-approved-sfx-manifest.json`.

Production-owned derivatives of the four candidates explicitly rated `good` in `2026-08-14-openrouter-sfx-first-ratings-v2.json`.

| Runtime file | Finding | Intended event |
|---|---|---|
| `seismic-warning-distant-collapse.ogg` | `seismic-warning-source` | Earthquake warning |
| `seismic-warning-heavy-collapse.ogg` | `seismic-warning-heavy` | Earthquake warning alternate |
| `rare-discovery-clean-reward.ogg` | `rare-discovery-source` | Retired after gameplay audition; not loaded or played |
| `rare-discovery-tight-reward.ogg` | `rare-discovery-tight` | Retired after gameplay audition; not loaded or played |

The assets are encoded as OGG review previews. Only the seismic family remains
registered at runtime. The reward candidates remain on disk as audition
evidence but are intentionally excluded from preload and playback.
