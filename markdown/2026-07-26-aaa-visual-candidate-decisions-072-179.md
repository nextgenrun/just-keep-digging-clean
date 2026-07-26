# AAA Visual Candidate Decisions 072–179

**Recorded:** 2026-07-26  
**Source list:** `markdown/2026-07-26-gameplay-retention-200-candidates.md`  
**Status:** Visual and design review only; no production wiring in this pass  
**Rollback:** Inherits the scoped checkpoint, feature-gate, per-slice commit, validation-evidence, and normal-Git-revert contract in `markdown/2026-07-26-gameplay-candidate-decisions-001-071.md`.

## Global approval rules

- “Yes” approves the direction, not automatic runtime promotion.
- Every new player-facing image, particle texture, prop treatment, tooltip, and HUD element must use high-quality project-matched art. No flat HTML/CSS, generic Phaser primitives, debug rectangles, or placeholder textures may ship.
- Any candidate explicitly marked for visual approval remains `reviewOnly: true` and `productionChanged: false` until its in-game composition is approved.
- Coordinate atmosphere and effect intensity centrally. Multiple approved effects must not become a “system of systems” that all compete for attention.
- Keep gameplay, collision, rewards, saves, and authoritative world state unchanged unless separately approved.

## Decisions

| # | Candidate | Decision | Required interpretation |
|---:|---|---|---|
| 72 | Loose ledge pebble drops | **Approved with art gate** | Use a high-quality generated pebble/debris asset and visually approve it in-game before wiring. |
| 73 | Rubble layered collapse | **Rejected** | Do not wire. |
| 74 | Bedrock scrape heat | **Rejected** | Do not wire. |
| 75 | Crystal facet light travel | **Rejected** | Do not wire. |
| 76 | Geode interior depth shimmer | **Approved** | Visible geodes only; no hidden-location hint. |
| 77 | Ancient material dust behavior | **Rejected** | Do not wire. |
| 78 | Earthquake loosened-tile jitter | **Rejected** | Do not wire. |
| 79 | Earthquake passage settling | **Approved** | World-space settling only; no UI highlight. |
| 80 | Material-band crossfade | **Approved** | Crossfade existing visual bands without changing material authority. |
| 81 | Three-depth dust field | **Approved** | Keep the total particle cap unchanged. |
| 82 | Vertical-shaft air pull | **Approved** | Derive only from currently visible open geometry. |
| 83 | Player wake through motes | **Approved** | Near-field response with bounded particle work. |
| 84 | Mining pressure wake | **Approved** | Use existing ambient particles before contact debris. |
| 85 | Ceiling grit after impact | **Rejected** | Do not wire. |
| 86 | Cave fog layer breathing | **Approved** | Opposing slow layers; avoid obvious alpha pulsing. |
| 87 | Cave-entry fog displacement | **Approved** | Part locally around the player and close behind. |
| 88 | Foreground silhouette drift | **Approved** | Very small camera-relative movement only. |
| 89 | Occluder edge softness motion | **Approved** | Never alter authoritative visibility. |
| 90 | Light-ray particulate travel | **Approved** | Sparse particles only. |
| 91 | Ray response to camera angle | **Approved** | Preserve fixed world anchors. |
| 92 | Distant backdrop slow life | **Approved** | One restrained animated idea per region. |
| 93 | Backdrop motion desynchronization | **Approved** | Stable seeded phases. |
| 94 | Foreground/background counter-motion | **Approved** | Speed/depth presentation only. |
| 95 | Old-route calmness | **Approved** | Reduce motion without making old routes visually dead. |
| 96 | Fresh-route settling | **Approved** | Short-lived and bounded. |
| 97 | Depth-pressure particle change | **Rejected** | Do not wire. |
| 98 | Level 2 motion dialect | **Approved with clutter gate** | Route through shared atmosphere/motion coordination; do not stack independent effects that all demand attention. |
| 99 | Quiet-frame governor | **Approved** | This becomes the central readability governor for overlapping major effects. |
| 100 | Underground stillness pockets | **Approved** | Use authored restraint to increase contrast between regions. |
| 101 | Campfire flame shape variation | **Approved** | Preserve light radius and buff behavior. |
| 102 | Campfire smoke wind bend | **Approved** | Use authoritative weather wind. |
| 103 | Campfire ember lift | **Approved** | Sparse, pooled, and cleared before HUD depth. |
| 104 | Lantern micro-sway | **Approved with visual-art gate** | No cheap procedural or HTML-like presentation. Produce and approve a high-quality in-game image-generation look before wiring. |
| 105 | Lantern light lag | **Approved** | Tiny light lag tied to the approved sway only. |
| 106 | Stall-cloth wind response | **Rejected** | Do not wire. |
| 107 | Sign-chain secondary motion | **Rejected** | Do not wire. |
| 108 | Merchant idle phase offsets | **Approved** | Stable NPC-seeded phases. |
| 109 | Merchant player-facing glance | **Approved** | Restrained visual acknowledgement only. |
| 110 | Merchant return-to-work motion | **Approved** | Ease back instead of snapping. |
| 111 | Town footstep material response | **Approved** | Reuse ground-contact events and town material color. |
| 112 | Town floor scuff fade | **Approved** | Very faint, short-lived, and strongly capped. |
| 113 | Rooftop dust gusts | **Rejected** | Do not wire. |
| 114 | Cloud-layer speed separation | **Feasible; awaiting final yes/no** | Separate generated cloud actors already support far and normal render depths, so those can move independently. Clouds baked into the scenic beauty plate cannot be separated safely and must remain static. |
| 115 | Distant silhouette crossings | **Approved** | Rare, tiny, non-interactive, and far behind play. |
| 116 | Sky-island weight drift | **Approved with visual-verification gate** | Never wire a low-quality approximation. First approve the full in-game look; move render transforms only while collision and teleport destinations remain fixed. |
| 117 | Sky-island underside motes | **Approved** | Sparse and scale-building, not a locator. |
| 118 | Surface depth parallax | **Approved** | Separate only layers that actually exist independently. |
| 119 | Town night-light awakening | **Approved** | Stagger spatially through existing light authority. |
| 120 | Dawn atmosphere reset | **Approved** | Different layers recover at different restrained rates. |
| 121 | Rain depth layers | **Approved only after weather-art replacement** | Current procedural rain streaks read as low quality, and the generated rain atlas is disabled because of matte artifacts. Create and visually approve clean high-quality rain assets first. Snow atlas art exists but current weather kinds do not meaningfully exercise snow yet. |
| 122 | Collision-aware rain splashes | **Approved using earlier assets** | Reuse the previously generated and approved water/splash/ripple assets; do not substitute procedural rings. Preserve real collision sampling. |
| 123 | Splash normal alignment | **Approved** | Align approved impact art to actual collision normals. |
| 124 | Wind-driven rain curvature | **Approved** | Apply only after clean rain art is approved. |
| 125 | Player rain wake | **Approved** | Near-field only and centrally intensity-governed. |
| 126 | Cloud pre-lightning bloom | **Approved** | Bloom only the responsible independent cloud region. |
| 127 | Lightning silhouette rim | **Approved** | Extremely brief and silhouette-focused. |
| 128 | Lightning depth delay | **Approved** | Millisecond-scale layer choreography. |
| 129 | Storm particle suppression at impact | **Approved** | Reduce ordinary weather noise so lightning owns the frame. |
| 130 | Moving torch flicker | **Approved** | Small velocity-aware lean; preserve visibility authority. |
| 131 | Mining light kick | **Approved** | Local exposed-edge response, never full-screen. |
| 132 | Material-aware light response | **Approved** | Presentation parameters only; preserve material identity. |
| 133 | Campfire bounce movement | **Rejected** | Do not wire. |
| 134 | Crystal secondary bounce | **Approved** | Visible crystals only; no hidden illumination. |
| 135 | Dust catches light | **Approved** | Query simplified local light volumes; do not globally tint all dust. |
| 136 | Darkness-edge softness motion | **Approved** | Subtle shader-boundary motion without increasing revealed area. |
| 137 | Depth color-grade crossfade | **Approved** | Smooth existing grades by depth. |
| 138 | Impact exposure pulse | **Approved** | Tiny localized lift only; never a full white frame. |
| 139 | Earthquake dust-light occlusion | **Approved** | Restore clarity with dust settling; do not alter gameplay light rules. |
| 140 | Weather clear-out choreography | **Approved** | Fade weather layers in a readable sequence. |
| 141 | Acceleration-based look-ahead | **Approved; existing-config audit completed** | Look-ahead values exist, but the current live camera updater applies shake only. Implement as a new bounded presentation path with zero offset during precise mining. |
| 142 | Fall-aware vertical lead | **Rejected** | Do not wire. |
| 143 | Landing camera compression | **Approved** | Tiny settle separate from shake. |
| 144 | Mining contact nudge | **Approved** | One-to-two-pixel directional nudge with immediate recovery. |
| 145 | Crit directional punch | **Approved** | Sharper and shorter, not simply stronger generic shake. |
| 146 | Quickslash camera lead | **Approved** | Recover before the next input. |
| 147 | Thunder charge framing | **Rejected** | Do not alter camera zoom. |
| 148 | Earthquake layered sway | **Approved** | Different amplitudes per independently rendered layer. |
| 149 | Shake source falloff | **Unresolved: “MP”** | Preserve the supplied response exactly; do not assume yes or no. |
| 150 | Frequency-specific shake | **Unresolved: “MP”** | Preserve the supplied response exactly; do not assume yes or no. |
| 151 | Portal entry pull | **Approved** | Small, brief, and comfort-bounded. |
| 152 | Portal tunnel parallax | **Approved** | Reuse existing portal particles in opposing layers. |
| 153 | Portal arrival reverse pull | **Approved** | Reverse the same pool to connect entry and arrival. |
| 154 | Cave-entry depth peel | **Approved** | Coordinate foreground, fog, and background rather than adding an overlay. |
| 155 | Cave-exit eye adaptation | **Approved and expanded** | Add subtle eye adaptation across darkness/light transitions, not only cave exit. Current PostFX is disabled due to a sprite-visibility regression, so restore and validate that foundation before wiring adaptation. |
| 156 | Town-return camera settle | **Approved** | No summary panel required. |
| 157 | Discovery camera restraint | **Rejected** | Do not wire. |
| 158 | Cinematic input cancellation | **Approved** | Any player movement immediately cancels optional camera flourishes. |
| 159 | Low-FPS motion simplification | **Rejected** | Do not add this candidate as specified. Existing performance safety remains. |
| 160 | Reduced-motion coherence | **Approved** | Respect current reduced-motion settings while preserving clear contact silhouettes. |
| 161 | Chest lid weight | **Approved** | Anticipation, fast open, small rebound. |
| 162 | Chest dust seal break | **Approved** | Thin, short-lived seam release. |
| 163 | Chest money fountain discipline | **Approved** | Fewer representative coins; reward amount remains immediate and exact. |
| 164 | Chest-star contrast beat | **Approved** | Star owns the center when present. |
| 165 | Star pickup spiral | **Approved** | Collection remains immediate. |
| 166 | Star trail taper | **Approved** | Curved, fast-tapering world trail rather than a straight UI line. |
| 167 | Star world-light response | **Approved** | Brief local exposed-edge response only. |
| 168 | Relic pedestal wake-up | **Approved** | Only after the relic is already visible; never a locator. |
| 169 | Relic pickup orbit layers | **Approved** | World-space rings collapse into the player. |
| 170 | Relic residual floor mark | **Approved** | Faint and short-lived. |
| 171 | Portal idle depth distortion | **Approved** | Keep outer silhouette quiet. |
| 172 | Portal activation wave | **Approved** | One clean world-space ring, no text. |
| 173 | Portal particle suction | **Approved** | Existing motes only during teleport phases. |
| 174 | Portal silhouette stretch | **Approved** | Visual transform only; preserve physics and safe landing. |
| 175 | Level 2 portal motion identity | **Approved** | Use motion cadence and particle direction, not another label. |
| 176 | Milestone Pillar ambient orbit | **Approved** | Sparse idle motes; accelerate only on actual completion. |
| 177 | Pillar completion pulse | **Approved** | Carry through the pillar into nearby floor seams. |
| 178 | Titan scale reveal | **Approved** | Reveal scale through atmosphere and silhouette, not a banner. |
| 179 | Celestial Engine layered aura | **Approved** | Separate slow mass, medium rotation, and fast sparks under one shared intensity budget. |

## Current-system audit answers

### 114 — Is cloud-layer speed separation possible?

**Yes, with a strict boundary.** `SkylineWeatherVfxSystem` already creates independent cloud actors and assigns separate far/normal render depths. These actors can receive different movement speeds. The scenic surface beauty plate is baked; any cloud painted into that plate must stay static unless the source art is regenerated as separate layers.

### 121–122 — Weather art status

- Runtime rain still uses generated primitive streak textures through `WeatherParticleTextures`.
- The earlier image-generated rain atlas is deliberately disabled because its frames contain rectangular matte artifacts.
- The earlier snow atlas is configured and enabled, but the active weather-kind path currently centers on drizzle, rain, and storm, so snow is not a completed live weather experience.
- Earlier water splash/ripple/spray art exists and is the correct starting asset set for #122, subject to in-game visual approval.

### 141 — Does acceleration look-ahead already exist?

**Not in the live updater.** `cameraLookAheadPx` and `cameraLookAheadLerp` values exist in `values/gameConfig.js`, but `updateCameraSystems()` currently updates camera shake only. The candidate is approved as a bounded new presentation path, not as a duplicate.

### 155 — Eye-adaptation foundation

Brightness, exposure, depth grading, day/night, and lighting snapshots provide appropriate inputs. However, `POSTFX_CONFIG.enabled` is currently false because of a sprite-visibility regression. That regression must be resolved and validated before eye adaptation is promoted.

## Visual review assets

### Compact ability bar v2

**Preview:** `visual-approval-previews/2026-07-26-aaa-ability-bar-review-v2.png`  
**State:** `reviewOnly: true`, `productionChanged: false`

- Roughly half-size relative to the first oversized concept.
- Nine compact primary action slots retain existing bindings.
- Mouse hover is demonstrated on Quickslash with a project-matched illustrated tooltip.
- A subordinate strip contains exactly ability shortcuts **1–8**, with no ninth/inventory shortcut.
- Numeric shortcuts remain secondary aliases; existing bindings remain authoritative.

### Flight Gem tooltip v1

**Preview:** `visual-approval-previews/2026-07-26-aaa-flight-gem-tooltip-review-v1.png`  
**State:** `reviewOnly: true`, `productionChanged: false`

- Replaces the flat cyan banner, stacked secondary panel, and oversized yellow arrows with one illustrated obsidian, metal, gold, and violet-crystal plaque.
- Uses only “FIND THE FLIGHT GEM” and “Mine downward through the glowing seam.”
- Uses one small attached crystal direction needle.
- No production tooltip or tutorial code has changed.

## Still unresolved

- Candidate **114** needs a final yes/no after the feasibility answer above.
- Clarify what **“MP”** means for candidates **149** and **150**.
- Both new visual mockups require explicit approval before wiring.
- Candidates **180–200** remain for review.
