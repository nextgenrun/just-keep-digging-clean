# Steam Motion Pack V1

Date: 2026-08-16  
Status: review-only; not uploaded to Steam; not wired into the game

## Intended placement

These 1170x658 animated WebP files are sized for the Steam **About This Game**
column. They are feature illustrations assembled from production game art, not
gameplay screenshots and not capsule images.

- `star-block-break-release-*-loop-v1.webp` — four Star Block impact, fracture,
  and floating-core release variants using the game's exact cyan, lavender,
  gold, and violet rarity art.
- `three-material-break-montage-loop-v1.webp` — hard stone, magma, and geode
  destruction families from the live tile-break atlas.
- `understar-reveal-ambient-loop-v1.webp` — subtle motion treatment of the
  production 2,000 m Understar finale backdrop.
- matching `*-poster.png` files — static fallbacks and review thumbnails.
- `star-break-sequence-concept-v1.png` — ImageGen sequence direction only. It
  contains a baked checkerboard and must not be used as a transparent runtime
  sprite sheet.

## Suggested order and alt text

1. Place the material break montage near the mining/combo paragraph. Alt text:
   `Stone, magma, and geode materials bursting apart in three distinct mining effects.`
2. Place one Star Block loop near the rare-discoveries paragraph, or alternate
   the four colours between feature sections. Alt text example:
   `A cyan crystal Star Block fractures and releases a luminous floating star core.`
3. Use the Understar loop as the final visual tease only if the 2,000 m ending
   is launch-available in the Steam build. Alt text:
   `An enormous white-gold Understar fills a ruined blackglass cavern.`

## Steam boundaries

- Do not upload these files as screenshots; Valve requires the screenshot rail
  to show actual gameplay.
- Do not use them as capsules; base capsules require correctly sized static key
  art plus the readable game logo and have separate text rules.
- The assets contain no copy so one visual can be shared across localizations.
- Confirm every depicted feature is available in the reviewed launch build.

## Rebuild

```powershell
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' ai-tools\2026-08-16-build-steam-motion-pack-v1.py
```

The builder only reads existing production art and writes this review package.
