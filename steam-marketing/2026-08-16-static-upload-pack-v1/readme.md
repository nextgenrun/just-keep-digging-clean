# UNDERSTAR Steam static upload pack v1

Date: 2026-08-16  
Status: review-only; nothing in this folder has been uploaded to Steam.

## Upload-ready graphical assets

- `store-header-capsule-920x430.png`
- `store-small-capsule-462x174.png`
- `store-main-capsule-1232x706.png`
- `store-vertical-capsule-748x896.png`
- `library-capsule-600x900.png`
- `library-header-capsule-920x430.png`
- `library-hero-artwork-only-3840x1240.png`
- `library-logo-transparent-1280px-wide.png`
- `store-page-background-1438x810.png`
- `client-shortcut-icon-256x256.png`
- `client-app-icon-184x184.jpg`
- `broadcast-slate-1920x1080.png` (optional starting slate; confirm the exact field shown by Steam before upload)

The four store capsules use only artwork plus the exact UNDERSTAR runtime logotype. The slogan from the supplied key art was intentionally left off because Steam base capsules allow only artwork, the game name, and an official subtitle. The library hero is artwork-only, and the library logo has a real transparent background.

## Screenshot gate

Do **not** upload files beginning with `review-only-screenshot-` yet. They are exact-size exports of actual current game captures, but the screenshot rail needs a stronger final pass. Only the surface-town frame is close to store quality. The first-dig capture exposes visible rendering seams, and the talent-tree capture is useful only as one supporting UI image.

Capture these five final 1920x1080 or larger, 16:9 gameplay moments after the seam issue is resolved:

1. Surface town with the player clearly separated from the NPC silhouettes.
2. Active mining contact with particles and a readable material block.
3. A Star Block breaking and releasing its star.
4. Mid-depth flight or ability use with the character and environment both readable.
5. A late-game Understar/2,000 m payoff frame.

Use at most one menu/UI screenshot, and do not substitute key art or pre-rendered concept art for gameplay.

## Sources and generation

- User reference: `source-user-key-art-reference.png`
- Exact runtime logo: `source-runtime-logo-transparent.png`
- Text-free landscape background: `source-textless-wide-imagegen-v1.png`
- Text-free portrait background: `source-textless-portrait-imagegen-v1.png`
- Deterministic builder: `ai-tools/2026-08-16-build-steam-static-upload-pack-v1.py`

ImageGen was used in reference-guided generation mode only for the two text-free background masters. It was not used to redraw the logo or fabricate gameplay screenshots.

## Validation

`manifest.json` records exact pixel dimensions, color mode, SHA-256, and whether each file is upload-ready. `understar-steam-static-pack-contact-sheet.png` is the quick visual review sheet.

