# High-impact v2 10K geometry audit — 2026-07-30

## Verdict

**geometry-invariants-pass-anchor-review-required.** The hard geometry gate is PASS with 0 hard failure(s). This is audit evidence only; no image, manifest, runtime, or gameplay value was rewritten.

## Hard invariants

| Check | Result |
|---|---|
| Actual PNG inventory | 10,000 (1,000 p00 + 9,000 derivatives) |
| RGBA 320×256 decode | PASS |
| Nonzero support equality | 0 mismatches |
| p02–p09 alpha-byte equality | 0 mismatches |
| p01 weighted-centroid hard gate | max 0.3681 px; limit 0.5 px |

## p01 restrained-alpha classification

p01 has 675 threshold-only changes and 325 threshold-identical frames. A threshold-only change means alpha > 12 changed while the alpha > 0 support mask stayed pixel-identical; it is not a slice move.

- Visible-bounds threshold changes: 470
- Visible-bottom threshold changes: 193
- Core-box threshold changes: 560
- Review outliers: 157
- Visible-area retention: minimum 0.2741, median 0.9763
- Alpha-weighted centroid shift: p95 0.0464 px, p99 0.1793 px

### Largest p01 threshold-box changes

| Source | Master | Edge delta L/T/R/B px | Area retained | Weighted shift px | Robust y99 delta px |
|---|---:|---:|---:|---:|---:|
| `a0525-rain-warm-steam-f05` | m22 | [1, 94, -3, 0] | 0.3136 | 0.2066 | 0.0 |
| `a0541-lightning-fork-flash-f01` | m23 | [2, 0, -6, -47] | 0.3922 | 0.0376 | -35.88 |
| `a0505-rain-drop-cycle-f05` | m22 | [1, 40, 0, 0] | 0.375 | 0.2334 | -0.23 |
| `a0545-lightning-fork-flash-f05` | m23 | [0, 0, -12, -36] | 0.7035 | 0.0453 | -1.2 |
| `a0602-player-torch-light-loop-f02` | m26 | [36, 4, -4, -2] | 0.6942 | 0.0619 | -2.0 |
| `a0644-star-pillar-light-loop-f04` | m27 | [2, 36, -1, -4] | 0.9184 | 0.009 | -3.0 |
| `a0162-torch-flicker-lobe` | m08 | [1, 1, -34, 0] | 0.9601 | 0.0021 | -0.81 |
| `a0035-cooling-slag-fracture` | m02 | [0, 0, -1, -33] | 0.9865 | 0.0007 | 0.0 |
| `a0601-player-torch-light-loop-f01` | m26 | [30, 5, -3, -3] | 0.7508 | 0.0677 | -2.0 |
| `a0590-volcanic-steam-loop-f05` | m25 | [1, 29, -1, 0] | 0.8302 | 0.0225 | 0.0 |
| `a0789-prism-nursery-loop-f04` | m33 | [0, 25, -11, -4] | 0.9123 | 0.0077 | -1.0 |
| `a0110-horizon-lightning-branch` | m05 | [24, 0, -3, -6] | 0.9081 | 0.0084 | -0.32 |

## Mining and ground-damage priority

140 mining sources were scanned. p01 changed the >12 threshold mask on 140; 69 changed visible bounds and 22 changed the exact bottom, but **0 changed the robust y99 ground edge by more than 1 px**.

## Source-sequence anchor risks

150/150 sequence groups expose only the generic `pivot/contactAnchor = {0.5, 0.5}` metadata. Source-frame motion therefore remains review-only until an explicit `ground`, `ceiling`, `center`, or `free-motion` anchor mode is authored.

| Watch group | Frame IDs | Robust y99 values | Largest ground-edge outlier |
|---|---|---:|---|
| `m23-wind-dust-gust` | `a0536-wind-dust-gust-f01`, `a0537-wind-dust-gust-f02`, `a0538-wind-dust-gust-f03`, `a0539-wind-dust-gust-f04`, `a0540-wind-dust-gust-f05` | [147.0, 149.0, 219.0, 147.0, 147.0] | `a0538-wind-dust-gust-f03` (+72.0 px from median) |
| `m31-spike-warning-effect` | `a0736-spike-warning-effect-f01`, `a0737-spike-warning-effect-f02`, `a0738-spike-warning-effect-f03`, `a0739-spike-warning-effect-f04`, `a0740-spike-warning-effect-f05` | [110.0, 122.0, 132.0, 123.0, 225.0] | `a0740-spike-warning-effect-f05` (+102.0 px from median) |

## Deterministic pre-wiring rule

1. Hard-fail any non-RGBA/320×256 file, empty alpha, nonzero-support mismatch, p02–p09 alpha mismatch, or p01 weighted-centroid shift over 0.5 px.
2. Review p01 when visible area falls below 0.75, a threshold-box edge moves over 8 px, weighted centroid moves over 0.25 px, or robust y01/y99 moves over 1 px.
3. Add explicit sequence `anchorMode` and anchor-line metadata before interpreting source-frame travel as planted or intentional.
4. Keep quarantined/rejected source-master decisions separate; a green geometry audit does not approve their artwork.

## Reproduce

```powershell
python ai-tools/2026-07-30-audit-high-impact-v2-geometry.py
```

Scanned manifest SHA-256: `72111894f14a720afad242615fcba7ee061b6d6cc1d3a679e4b6f4758990d04d`
