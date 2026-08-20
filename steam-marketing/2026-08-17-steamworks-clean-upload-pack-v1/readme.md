# UNDERSTAR Steamworks clean upload pack v1

Date: 2026-08-17  
Status: local and review-only; nothing has been submitted or published.

## Why this pack exists

The first upload mixed graphical assets, screenshots, source files, icons, a contact sheet and a broadcast slate in one generic Steamworks drop-zone. Steam correctly ignored unrelated source/contact files, but also produced misleading dimension errors for several correctly sized store capsules.

This pack separates every asset category and re-encodes opaque graphical assets as clean RGB files without inherited metadata. The transparent library logo remains RGBA.

## Upload order

1. Open `01-store-assets` and upload only its four PNG files. Prefer each named field rather than the generic drop-zone if Steam still reports an unknown dimension.
2. Open `02-library-assets` and upload each file through its matching Library Asset field.
3. Upload `03-page-background/page_background.png` through Page Background.
4. Do not use `04-screenshots-review-only` as the final screenshot rail yet.
5. Upload `05-client-icons` on the Community and Client Icons page, not this graphical-assets drop-zone.
6. Treat `06-broadcast-review-only` as optional until the exact broadcast field is shown.

The `_english` suffix asks Steamworks to assign the appropriate English localization automatically.

## Expected dimensions

- Header: 920 x 430
- Small: 462 x 174
- Main: 1232 x 706
- Vertical: 748 x 896
- Library capsule: 600 x 900
- Library header: 920 x 430
- Library hero: 3840 x 1240
- Library logo: 1280 x 352, transparent
- Page background: 1438 x 810

`manifest.json` records the decoded dimensions, modes and SHA-256 hashes of every exported image.

