# Living menu scenery in HD

Current boot, main menu, save menu and loading scenery. Six silent H.264 MP4s, 1920x1080, 24 fps, 11.83-14.88 seconds. These are local Lanczos upscales of the 720p generated footage; no AI detail reconstruction, sharpening or full-screen dimming is applied.

Aurora is 32.35% slower than v3; starfall 30.30%; forest 14.81%; grotto 17.86%; embers 20.69%; foundry 23.33%. Linear temporal interpolation smooths the retiming. The grotto retains its original central cave art while water and flames move.

The encoded end-to-start overlap and shared two-video, 1.8-second buffered dissolve keep one selected scene repeating continuously. The videos do not rotate through different backgrounds. Original posters remain available for reduced motion and media fallback.

Rebuild with `ai-tools/2026-09-07-build-menu-hd.py`. Settings are in `values/menuAtmosphereLiving.json`; source provenance, output hashes and browser evidence are in `testing/2026-09-07-menu-atmosphere/`.
