# Flyable Sky Background ImageGen Prompt Manifest

**Date:** 2026-07-26  
**Mode:** Built-in image-generation tool  
**Use case:** `stylized-concept`  
**Production status:** Review only; no runtime wiring

## Moonless v2 correction

The original v1 concepts included a baked moon. That is rejected for production
because `DayNightCycle` already owns the moving sun and moon. The canonical
`*-moonless-v2.png` images were created as three separate built-in edits:

### Direction A moonless edit

```text
Use case: precise-object-edit
Asset type: moonless full-sky regional variation mockup for a Phaser side-view game
Primary request: remove only the single baked full moon/disc from the sky in Image 1 and reconstruct the surrounding stars, blue atmosphere, and cloud edge naturally. This revision represents one reusable regional sky variation across the complete flyable air field, not a sky-island-only background.
Input images: Image 1 is the edit target, Direction A Moonlit Alpine Cloud Sea.
Constraints: preserve the exact camera framing, platform position, platform design, exactly four portal gates, flying player, mountain silhouettes, cloud ocean, aurora, valley lights, palette, detail, and composition; do not move, resize, restyle, add, or remove anything except the baked moon; do not add a replacement sun, moon, planet, eclipse, circular celestial body, bright disc, or large round light anywhere; keep the repaired sky seamless and believable; no text, HUD, logo, watermark, border, or UI.
```

### Direction B moonless edit

```text
Use case: precise-object-edit
Asset type: moonless full-sky regional variation mockup for a Phaser side-view game
Primary request: remove only the single baked full moon/disc from the upper-left sky in Image 1 and reconstruct the surrounding stars, cloud edge, and stellar river naturally. This revision represents a celestial-ruin regional variation within the complete flyable air field, not a sky-island-only background.
Input images: Image 1 is the edit target, Direction B Celestial Ruin Belt.
Constraints: preserve the exact camera framing, portal platform position and design, exactly four portal gates, flying player, broken ring, ruins, chains, stellar river, clouds, mountains, palette, detail, and composition; do not move, resize, restyle, add, or remove anything except the baked moon; do not add a replacement sun, moon, planet, eclipse, circular celestial body, bright disc, or large round light anywhere; the broken architectural stone ring is an ancient ruin and must remain unchanged; keep the repaired sky seamless; no text, HUD, logo, watermark, border, or UI.
```

### Direction C moonless edit

```text
Use case: precise-object-edit
Asset type: moonless full-sky regional variation mockup for a Phaser side-view game
Primary request: remove only the single baked full moon/disc from the upper-left clear sky in Image 1 and reconstruct the surrounding stars and blue atmosphere naturally. This revision represents a movable storm/weather regional variation within the complete flyable air field, not a sky-island-only background.
Input images: Image 1 is the edit target, Direction C Stormbreak Expanse.
Constraints: preserve the exact camera framing, portal platform position and design, exactly four portal gates, flying player, storm wall, lightning, rain curtains, cloud canyon, mountains, valley lights, palette, detail, and composition; do not move, resize, restyle, add, or remove anything except the baked moon; do not add a replacement sun, moon, planet, eclipse, circular celestial body, bright disc, or large round light anywhere; keep the repaired clear sky seamless; no text, HUD, logo, watermark, border, or UI.
```

## Shared references

1. `visual-approval-previews/v11-split-sky-islands-wired-2026-07-13.png`
   - Current world layout and empty-sky problem reference only.
2. `visual-approval-previews/2026-07-26-level1-whole-surface-village-panorama-v1.png`
   - Approved town palette, lighting, mountain, and quality reference only.
3. `sprites/backgrounds/world-v11-sky-islands-v1/level1-platform.webp`
   - Exact Level 1 platform silhouette and material reference.
4. `ai-tools/2026-07-17-steam-screenshot-01-surface.png`
   - Side-view camera, player scale, and current visual-language reference.

Direction B also used the generated Direction A image as a composition and scale
anchor only.

## Direction A — Moonlit Alpine Cloud Sea

```text
Use case: stylized-concept
Asset type: 16:9 side-view Phaser game environment direction mockup for the flyable sky above town
Primary request: create Direction A, “Moonlit Alpine Cloud Sea,” a major visual revamp of the currently empty/repeating air space between the approved mountain town and the Level 1 sky-island portal platform.
Input images: Image 1 is the current full-world sky-island preview and is a scale/layout problem reference only—do not copy its flat gray emptiness; Image 2 is the approved moonlit town panorama and is the palette, lighting, mountain, and painterly-quality reference only; Image 3 is the exact current Level 1 sky-island platform silhouette/material reference; Image 4 is the current gameplay screenshot and is the player scale, side-view camera, and visual-language reference only.
Scene/backdrop: very high altitude above the same moonlit alpine valley; deep navy-to-cobalt atmosphere, a vast irregular ocean of volumetric clouds far below, layered distant mountain chains fading with altitude, sparse stars, a restrained aurora ribbon, and several unique non-repeating cloud banks at different depths. Faint warm town lights may be visible far below near the lower edge, but do not repaint or redesign the approved town.
Subject: preserve the recognizable long dark stone-and-cyan-crystal sky-island portal platform with four small eclipse gates, placed across the upper-right/upper-middle portion at believable gameplay scale; show one small pale-clothed miner flying horizontally through the open air corridor, about 8–10% of image height.
Style/medium: high-detail painterly 2D side-scroller environment with AAA Unreal/Unity pre-rendered depth and materials translated into Phaser-ready layered concept art; crisp gameplay silhouettes, subtle PBR stone response, natural atmospheric perspective.
Composition/framing: wide 16:9 side-on gameplay camera; open central flight corridor; island occupies roughly 55–65% of frame width, not the entire screen; player clearly readable against quieter sky; upper-left and upper-right corners remain visually calm for existing HUD; foreground wisps frame edges without covering player or island.
Lighting/mood: cool moonlight, soft cyan portal/crystal glow, sparse warm glints far below; wondrous, lonely, readable, premium.
Constraints: town is approved and must remain unchanged/offscreen except for a very distant lower-edge continuity hint; do not redesign the island platform or portal count; no giant solid mine block; no foreground terrain grid; no mirrored clouds, repeated mountain stamps, obvious tiling, bilateral symmetry, hard vertical seams, or baked duplicate motifs; no text, labels, title card, logo, HUD, watermark, UI, or border; must look implementable as separate far-sky, far-cloud, mountain-horizon, near-cloud, celestial, and particle parallax layers.
```

## Direction B — Celestial Ruin Belt

```text
Use case: stylized-concept
Asset type: 16:9 side-view Phaser game environment direction mockup for the flyable sky above town
Primary request: create Direction B, “Celestial Ruin Belt,” a visually distinct major revamp of the empty/repeating air space around the Level 1 portal island, while keeping the comparison camera and gameplay scale close to Direction A.
Input images: Image 1 is Direction A and is the composition/scale anchor only—replace its natural alpine-cloud background with this celestial-ruin direction; Image 2 is the current full-world sky-island preview and is a layout problem reference only; Image 3 is the approved town panorama and is the moonlit palette/quality continuity reference only; Image 4 is the exact Level 1 platform silhouette/material reference; Image 5 is the current gameplay screenshot and is the player-scale and side-view visual-language reference only.
Scene/backdrop: high above the approved moonlit alpine town where the atmosphere thins into a deep indigo celestial belt. A luminous river of stars and thin cloud streams crosses the far sky. Enormous ancient sky-ruin fragments exist only in the far and middle distance: a broken non-symmetrical stone ring, isolated suspended monoliths, incomplete bridge remnants, tiny hanging chains, and a few dim cyan/gold rune windows. The ruins must feel like unique Unreal/Unity 3D environment assets pre-rendered into modular parallax silhouettes, not a repeated wallpaper. Keep the town itself offscreen except perhaps tiny warm lights at the lowest edge.
Subject: preserve the recognizable long dark stone-and-cyan-crystal sky-island platform with exactly four small eclipse gates, placed upper-right/upper-middle at believable gameplay scale; show one small pale-clothed miner flying horizontally through a clear central-left corridor, about 8–10% of image height.
Style/medium: high-detail painterly 2D AAA side-scroller environment with realistic 3D-baked stone, atmospheric perspective, restrained fantasy ornament, and crisp Phaser gameplay readability.
Composition/framing: wide 16:9 side-on gameplay camera; comparable island/player placement to Direction A; large quiet negative-space flight lane through the center; ruins frame the lane from far background and edges without becoming collision-looking foreground; upper corners remain calm enough for existing HUD.
Lighting/mood: deep moonlit indigo, cold cyan portal energy, sparse antique gold in distant ruins, a faint violet stellar glow; mysterious, ancient, premium, exploratory.
Constraints: approved town remains unchanged and offscreen; preserve island identity and four portals; do not turn the platform into a giant mineable block; no foreground terrain grid; no huge ruin directly behind the player; no mirrored architecture, repeated monolith stamps, bilateral symmetry, obvious tiling, hard seams, or duplicated motifs; no text, labels, title card, HUD, logo, watermark, border, or UI; must look decomposable into far-starfield, stellar-river, far-ruin silhouettes, middle-ruin cutouts, cloud-stream, and particle layers.
```

## Direction C — Stormbreak Expanse

```text
Use case: stylized-concept
Asset type: 16:9 side-view Phaser game environment direction mockup for the flyable sky above town
Primary request: create Direction C, “Stormbreak Expanse,” the most dynamic visual direction for the currently empty/repeating flyable air around the Level 1 portal island.
Input images: Image 1 is the current full-world sky-island preview and is a layout problem reference only—do not copy its flat empty sky; Image 2 is the approved town panorama and is the moonlit palette/quality continuity reference only; Image 3 is the exact current Level 1 platform silhouette/material reference; Image 4 is the current gameplay screenshot and is the player-scale, side-view camera, and visual-language reference only.
Scene/backdrop: a vast moonlit storm front split open above the same alpine valley. On the left and center, a readable deep-cobalt clear corridor with stars; on the right and high background, towering sculpted thunderheads with internal violet-blue light, distant fork lightning, rain curtains, and flowing cloud canyons. A bright atmospheric break in the clouds leads toward the island. Far below, dark mountain ridges and tiny warm town lights establish altitude. Use several unique cloud masses at different depths and sweeping diagonal weather flow so it feels alive without wallpaper repetition.
Subject: preserve the recognizable long dark stone-and-cyan-crystal sky-island platform with exactly four small eclipse gates, upper-right/upper-middle at believable gameplay scale; show one small pale-clothed miner flying horizontally through the calm central-left corridor, about 8–10% of image height. Keep lightning behind or beyond the island, never striking the player or obscuring the path.
Style/medium: high-detail painterly AAA 2D side-scroller environment using Unreal-style volumetric-cloud and Niagara-storm quality translated into Phaser-ready baked layers and lightweight particles; realistic atmosphere, crisp gameplay silhouettes.
Composition/framing: wide 16:9 side-on gameplay camera; island occupies roughly one-third to one-half of the frame width in the upper right; player is centered-left; calm readable flight lane across center; storm mass frames right/top and cloud shelf frames lower edge; visual energy points toward the island; upper HUD corners remain relatively calm.
Lighting/mood: cold moonlit cobalt, electric violet/cyan lightning, silver cloud rims, subtle warm valley pinlights; dangerous but majestic, kinetic, premium.
Constraints: approved town remains unchanged and far below; preserve island identity and four portals; no giant mineable island mass; no foreground terrain grid; no lightning across the player silhouette; no mirrored thunderheads, repeated lightning bolts, bilateral symmetry, obvious tiling, duplicated cloud stamps, or hard seams; no text, labels, title card, HUD, logo, watermark, border, or UI; must look decomposable into base gradient, far mountains, far storm wall, rain-curtain, near cloud, lightning/VFX, and particle layers for animated Phaser parallax.
```
