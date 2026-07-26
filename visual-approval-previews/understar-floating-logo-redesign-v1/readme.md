# UNDERSTAR Floating Logo Redesign V1

**Status:** Rift Monolith approved and promoted to runtime on 2026-07-26.

Review-only floating-title concepts for the renamed game. Nothing in this
folder is loaded by Phaser. The approved production cutout lives at
`sprites/branding/understar-logo-v1/understar-rift-monolith-runtime.png`.

## Source direction

- New-name and material reference:
  `ai-tools/2026-07-17-understar-steam-assets/understar-approved-cover-source-rounded-u.png`
- Existing floating-menu silhouette reference:
  `sprites/branding/logo-enter-v-1/20260316_0321_Just Keep Digging Logo_simple_compose_01kkt3qqn1f9c95wecwtsbqe9y-Photoroom.webp`
- Runtime target reviewed from `ui/scenes/MainMenuScene.js`: a wide logo displayed
  within roughly `560 x 185` pixels and floated vertically by the menu tween.

The old logo was used only to understand the compact menu silhouette. Its old
name, cartoon treatment, tools, skull, and ore props were explicitly excluded.

## Directions

1. `understar-floating-logo-01-rift-monolith.png`
   - Closest to the approved Steam-cover identity.
   - Cracked meteorite faces, bronze edging, cyan fissures, and a star underline.
   - Strongest continuity with the existing approved UNDERSTAR wordmark.

2. `understar-floating-logo-02-horizon-cut.png`
   - Slimmest and clearest direction at the current menu display size.
   - A single cyan horizon fault divides pale meteorite from dark obsidian.
   - The star aperture is integrated into the `A`, with no backing plaque.

3. `understar-floating-logo-03-starcore-crest.png`
   - Most emblematic and most similar to a floating physical crest.
   - The wordmark sits on shallow bedrock above a restrained star-core aperture.
   - Strong icon value, but its taller silhouette needs the most menu space.

## Generation prompt set

All three were generated with the built-in image-generation workflow as
review mockups on a neutral dark vignette. Every prompt required:

- the exact visible text `UNDERSTAR`, spelled `U N D E R S T A R`;
- a one-line, standalone, floating logo readable around `560 x 185`;
- the approved rounded `U`, meteorite-silver, basalt, aged-bronze, and cyan
  brand language;
- no subtitle, tagline, other text, old-name wording, tools, skulls, ore
  nuggets, cartoon styling, UI, scenery, or watermark.

The direction-specific prompt additions were:

- **Rift Monolith:** thick dimensional letters, restrained cyan cracks
  converging on a four-point star, and a segmented bronze underline.
- **Horizon Cut:** condensed letters split by one thin cyan horizontal fault,
  pale meteorite above, dark obsidian below, and a star aperture in the `A`.
- **Starcore Crest:** bold condensed letters on a shallow crescent of broken
  bedrock with a secondary circular cyan star core and thin bronze orbital arcs.

Rift Monolith was selected for production. `values/branding.js` now routes the
shared `brand-logo` key to its transparent runtime cutout, so the boot splash,
loading screen, main menu, and save-slot menu all receive the approved logo.
Horizon Cut and Starcore Crest remain review-only alternatives.
