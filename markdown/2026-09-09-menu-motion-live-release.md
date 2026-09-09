# Approved menu motion SSH release — 9 September 2026

Published build **6793e7c5ce64** to https://www.nextgen.run/diggame-beta-1/ over the saved SSH connection after the user approved Quiet sky and explicitly requested publication. Base: `35b25aa356da`.

## Scope

The release was constructed from a fresh live hash inventory and public-source snapshot. The saved `approved-runtime.patch` supplied the nine approved source edits; later local resource/icon changes were excluded. All other changed module bodies were verified to differ only in their build cache key. Eight approved media files were included: six native 720p/30 fps scene loops, the full transparent logo loop, and its original-color poster.

The approved logo animation, dark contour and localized sky shade are active in loading/menu views. The brightness grade and backing plaque are disabled. Scenery transfer size is 45.35% lower than the previous 60 fps files, at the same resolution and motion speed. Old scene files remain on disk for compatibility; no game files were deleted.

## Publication evidence

- Uploaded: 1,499 files / 91,142,706 bytes, including versioned modules and matching gzip sidecars.
- Final verified live content: 8,549 files / 4,908,286,210 bytes.
- SHA-256 checks cover the entire resulting live tree, including all unchanged files.
- Original `.htaccess` restored byte-for-byte; maintenance is off.
- Backend/PHP files, private player storage and other sites were not changed.
- A deployment lock and scoped private transaction copies protect promotion/rollback. The maximum planned footprint was 4,922,964,018 bytes, below the configured 10 GB limit.

## Validation

All 1,106 public JavaScript modules passed V8 module syntax parsing. The exact release preview used a hash-verified copy of the previously deployed package for unchanged files, and reached loading, cinematic gate, cinematic and menu without browser errors/warnings. The public canonical URL loaded all three entry scripts with `v=6793e7c5ce64` and displayed the approved moving loading presentation. It then passed the opening gate/cinematic and reached the main menu with the approved full animated logo and moving scenery. No browser errors or warnings were recorded through this public flow.

Direct HTTP byte-range probes from the SSH host received HTTP 403 and are not counted as public-delivery proof. The normal in-app browser successfully loaded the same published game and rendered its animation. Media byte-range handling was verified in the local production-handler preview earlier; no server security settings were weakened for the probe.

## Artifacts and tools

Deployment inventory, plan, private staging/promotion receipts and final verification are in `.tmp/menu-motion-live-20260909/`. Screenshots and public browser evidence are under `testing/2026-09-09-menu-logo-motion/`.

Preparation: `tools/2026-09-09-prepare-menu-release.py`. Verification: `tools/2026-09-09-check-menu-release.cjs`. Exact-package preview: `tools/2026-09-09-serve-menu-release.py`. SSH stage/apply/verify/rollback: `tools/2026-09-09-deploy-menu-release.py` and its scoped remote helper.
