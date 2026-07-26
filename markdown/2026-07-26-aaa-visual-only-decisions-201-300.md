# AAA Visual-Only Decisions 201–300

**Recorded:** 2026-07-26  
**Source list:** [2026-07-26-aaa-visual-only-candidates-201-300.md](2026-07-26-aaa-visual-only-candidates-201-300.md)  
**Status:** Visual directions and all five comparison sheets approved by the user on 2026-07-26; `productionChanged: false`

The approval locks the five comparison sheets as the target presentation. It does not silently promote review images or authorize low-quality substitutes; production assets still require the documented ImageGen, in-game verification, rollback, and validation gates.

## Decision key and hard constraints

- `Approved` approves the visual direction, not runtime wiring.
- `Rejected` removes the candidate from this proposal.
- `MP` preserves the user's exact shorthand as unresolved. It is not implementation approval.
- User-local item `1` maps to candidate `201`; item `50` maps to `250`.
- “P/Q/R/S/T all yes” approves candidates `251–300`.
- Any new visible art must be high-quality, project-matched ImageGen work and visually approved in an in-game composition before wiring.
- No low-quality HTML/CSS, primitive Phaser shapes, placeholder assets, debug visuals, or extra HUD clutter.
- There is no visible pickaxe/tool presentation and no visible gear presentation. Rejected legacy suggestions must not reintroduce either.
- Every future implementation slice must be independently disableable and Git-revertible.

**Tally:** 81 approved · 16 rejected · 3 unresolved (`MP`)

## K. Character, equipment, and Flight presentation

| ID | Candidate | Decision | Note |
|---:|---|---|---|
| 201 | Pickaxe-head specular travel | Rejected | Legacy: no visible pickaxe visuals. |
| 202 | Hand-to-handle registration polish | Rejected | Legacy: no visible pickaxe visuals. |
| 203 | Tool shadow sweep | Rejected | Legacy: no visible tool visuals. |
| 204 | Tool-head inertia offset | Rejected | Legacy: no visible tool visuals. |
| 205 | Footplant sole compression | Approved | Grounding polish only. |
| 206 | Turn-settle accessory follow-through | Rejected | No visible gear presentation. |
| 207 | Flight ignition compression | MP | Unresolved; do not wire. |
| 208 | Low-altitude Flight pressure halo | MP | Unresolved; do not wire. |
| 209 | Flight braking ribbon curl | MP | Unresolved; do not wire. |
| 210 | Torch-behind-body light masking | Approved | Spatial light polish. |

## L. Mining contact, debris, and cavity depth

| ID | Candidate | Decision | Note |
|---:|---|---|---|
| 211 | Pickaxe edge-contact glint | Rejected | Legacy: no visible pickaxe visuals. |
| 212 | Pre-crack contact indentation | Approved | Material contact only. |
| 213 | Stone powder clump breakup | Approved | High-quality authored texture family. |
| 214 | Soil impact sheet | Approved | Image-generated art; no primitive sheet. |
| 215 | Metal-seam spark starlets | Approved | Restrained material response. |
| 216 | Crystal-chip internal refraction | Approved | Local and brief. |
| 217 | Debris contact shadows | Approved | First bounce only. |
| 218 | Bounce dust pinpricks | Approved | Sparse and material-colored. |
| 219 | Fresh-cavity rim thickness | Approved | High-impact cavity depth. |
| 220 | Unsupported-ledge underside shade | Approved | Subtle depth cue. |

## M. Resource and rare-material visual identity

| ID | Candidate | Decision |
|---:|---|---|
| 221 | Cross-tile ore-vein continuity | Rejected |
| 222 | Embedded-ore depth offset | Rejected |
| 223 | Resource-specific break silhouette | Rejected |
| 224 | Crystal caustic sweep | Rejected |
| 225 | Metal-seam cold edge line | Approved |
| 226 | Rich-block fine mineral dust | Approved |
| 227 | Packed-block compressed strata | Rejected |
| 228 | Ancient-block mineral bloom | Rejected |
| 229 | Star-block eclipse surround | Approved |
| 230 | Material-signature pickup tail | Approved |

## N. Underground scenic life and authored depth

| ID | Candidate | Decision |
|---:|---|---|
| 231 | Root-tip secondary sway | Rejected |
| 232 | Condensation bead lifecycle | Rejected |
| 233 | Wall-moisture specular trails | Rejected |
| 234 | Cave-puddle reflection ripple | Rejected |
| 235 | Floor-grit depth bands | Approved |
| 236 | Stalactite near-layer parallax | Approved |
| 237 | Distant-cavern silhouette occlusion | Approved |
| 238 | Alcove dust eddies | Approved |
| 239 | Cave-mouth mist curl | Approved |
| 240 | Cavity-corner ambient occlusion | Approved |

## O. Surface, town, and prop polish

| ID | Candidate | Decision |
|---:|---|---|
| 241 | Chimney-smoke layered roll | Approved |
| 242 | Window-interior parallax shadow | Approved |
| 243 | Door-threshold light spill | Approved |
| 244 | Wet-roof specular travel | Approved |
| 245 | Eave-drip rhythm variation | Approved |
| 246 | After-rain puddle micro-ripples | Approved |
| 247 | Wind-skittered ground litter | Approved |
| 248 | Merchant-work prop motion | Approved |
| 249 | Mine-entrance dust curtain | Approved |
| 250 | Town-foreground structure parallax | Approved |

## P. High-quality rain, snow, and storm art

| ID | Candidate | Decision |
|---:|---|---|
| 251 | Clean rain-streak atlas replacement | Approved |
| 252 | Rain-shape depth family | Approved |
| 253 | Snowflake atlas activation review | Approved |
| 254 | Wind-blown snow powder sheet | Approved |
| 255 | Snow-contact powder puff | Approved |
| 256 | Rain edge-glints on metal props | Approved |
| 257 | Roof-runoff streamlets | Approved |
| 258 | Tree-branch rain shedding | Approved |
| 259 | Post-storm terrain mist | Approved |
| 260 | Thundercloud internal vein light | Approved |

## Q. Lighting, shadow, and exposure fidelity

| ID | Candidate | Decision |
|---:|---|---|
| 261 | Overhang light occlusion | Approved |
| 262 | Player and prop contact shadows | Approved |
| 263 | Wet-material specular response | Approved |
| 264 | Crystal-colored penumbra | Approved |
| 265 | Soft player-light penumbra | Approved |
| 266 | Light-source handoff blend | Approved |
| 267 | Torch-shadow direction inertia | Approved |
| 268 | Emissive bloom-radius discipline | Approved |
| 269 | Visible-crack light leak | Approved |
| 270 | Lightning exposure recovery | Approved |

## R. Ability, vehicle, and special-effect art

| ID | Candidate | Decision |
|---:|---|---|
| 271 | Image-generated Quickslash blade core | Approved |
| 272 | Quickslash edge-vapor curl | Approved |
| 273 | Image-generated Thunder bolt family | Approved |
| 274 | Thunder scorch ghost | Approved |
| 275 | Heavy Punch air-lens compression | Approved |
| 276 | Heavy Punch dust shear | Approved |
| 277 | Arc Core mechanical iris wake-up | Approved |
| 278 | Arc Core travel spark discipline | Approved |
| 279 | Celestial Engine aura occlusion | Approved |
| 280 | Flight Gem acquisition fracture | Approved |

## S. Chests, relics, portals, pillars, and titans

| ID | Candidate | Decision |
|---:|---|---|
| 281 | Chest-latch snap highlight | Approved |
| 282 | Chest-interior light volume | Approved |
| 283 | Coin-arc floor shadows | Approved |
| 284 | Coin-face rotation variants | Approved |
| 285 | Star reflection echo | Approved |
| 286 | Relic dust-curtain peel | Approved |
| 287 | Portal-frame surface refraction | Approved |
| 288 | Portal destination tint harmony | Approved |
| 289 | Milestone Pillar groove illumination | Approved |
| 290 | Titan ambient pressure dust | Approved |

## T. UI-art replacement and visual consistency cleanup

| ID | Candidate | Decision |
|---:|---|---|
| 291 | Generated hover-tooltip frame family | Approved |
| 292 | Ability-icon silhouette normalization | Approved |
| 293 | Target-reticle corner-art atlas | Approved |
| 294 | Flat-cyan-frame replacement pass | Approved |
| 295 | HUD bevel-thickness unification | Approved |
| 296 | Icon emissive-intensity normalization | Approved |
| 297 | Typography baseline and padding pass | Approved |
| 298 | Sprite alpha-fringe cleanup | Approved |
| 299 | Animation exposure continuity | Approved |
| 300 | Per-biome hero-composition pass | Approved |

## Review-only comparison set

These are visual targets, not evidence of live implementation.

1. **Underground depth and material contact** — represents 212–220, 235–240, and 261–269.
   - [Side-by-side review sheet](../visual-approval-previews/2026-07-26-comparison-sheet-underground-v1.png)
   - [Current runtime capture](../visual-approval-previews/2026-07-26-comparison-underground-before.jpg)
   - [Proposed ImageGen composition v1](../visual-approval-previews/2026-07-26-comparison-underground-after-v1.png)
2. **Living surface and town staging** — represents 241–250 and 262.
   - [Side-by-side review sheet](../visual-approval-previews/2026-07-26-comparison-sheet-surface-life-v1.png)
   - [Current supplied gameplay frame](../visual-approval-previews/2026-07-26-comparison-surface-before.png)
   - [Proposed ImageGen composition v1](../visual-approval-previews/2026-07-26-comparison-surface-life-after-v1.png)
3. **Rain quality and wet-material response** — represents 251–259 and 263.
   - [Side-by-side review sheet](../visual-approval-previews/2026-07-26-comparison-sheet-rain-v1.png)
   - [Reconstructed current procedural baseline](../visual-approval-previews/2026-07-26-comparison-rain-baseline-reconstruction.png)
   - [Proposed premium ImageGen composition v1](../visual-approval-previews/2026-07-26-comparison-rain-after-v1.png)
4. **Quickslash contact art** — represents 271–272.
   - [Side-by-side review sheet](../visual-approval-previews/2026-07-26-comparison-sheet-quickslash-v1.png)
   - [Current neutral gameplay frame](../visual-approval-previews/2026-07-26-comparison-surface-before.png)
   - [Proposed premium ImageGen contact frame v1](../visual-approval-previews/2026-07-26-comparison-quickslash-after-v1.png)
5. **Flight Gem tutorial art replacement** — represents 291, 294–295, and 297.
   - [Side-by-side review sheet](../visual-approval-previews/2026-07-26-comparison-sheet-flight-tooltip-v1.png)
   - [Current supplied gameplay frame](../visual-approval-previews/2026-07-26-comparison-surface-before.png)
   - [Proposed high-quality ImageGen frame v1](../visual-approval-previews/2026-07-26-aaa-flight-gem-tooltip-review-v1.png)

### Comparison caveats

- The underground and surface “before” images are real gameplay frames.
- The rain “before” is explicitly a reconstruction of the currently audited procedural streak/ring approach because no deterministic runtime rain preview was exposed during this review.
- The Quickslash comparison is a neutral/current frame against a proposed single contact frame, not a synchronized animation capture.
- ImageGen compositions communicate target finish, layering, material response, and clutter limits. They do not authorize changed terrain, props, UI, character anatomy, or gameplay geometry.
- No comparison asset is registered, loaded, or wired into runtime.
