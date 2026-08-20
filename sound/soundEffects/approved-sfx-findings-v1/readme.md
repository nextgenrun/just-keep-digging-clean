# Approved SFX findings V1

Production-owned derivatives of the four candidates explicitly rated `good` in `2026-08-14-openrouter-sfx-first-ratings-v2.json`.

| Runtime file | Finding | Intended event |
|---|---|---|
| `seismic-warning-distant-collapse.ogg` | `seismic-warning-source` | Earthquake warning |
| `seismic-warning-heavy-collapse.ogg` | `seismic-warning-heavy` | Earthquake warning alternate |
| `rare-discovery-clean-reward.ogg` | `rare-discovery-source` | Ancient Relic or Titan discovery |
| `rare-discovery-tight-reward.ogg` | `rare-discovery-tight` | Ancient Relic or Titan discovery alternate |

The assets are encoded as OGG previews for efficient Phaser loading. The rejected mining family and the `maybe` crystal candidate are intentionally excluded. Runtime registration is centralized in `values/audioConfig.js`; preload and playback must remain synchronized through `BootScene` and `SoundSystem`.

