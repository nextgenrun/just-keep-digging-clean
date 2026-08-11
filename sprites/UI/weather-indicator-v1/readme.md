# Weather indicator v1

ImageGen-authored production HUD package for the top-right world-state panel.
The package replaces the former empty narrow frame and emoji weather symbols.

- `world-state-weather-v2.png` provides the 768x209 transparent blackened-steel,
  bronze, and cyan frame with an icon well, two live-text bays, and an authored
  intensity-track recess.
- `weather-clear.png`, `weather-drizzle.png`, `weather-rain.png`,
  `weather-storm.png`, and `weather-snow.png` are 192x192 transparent dynamic
  medallions. Phaser selects the current state; the PNGs own presentation only.
- Live time, day/season, weather label, temperature, and intensity remain
  runtime data owned by `HUDSystem`.
- Chroma-key removal used the ImageGen skill helper with a soft matte, one-pixel
  contraction, one-pixel feather, and spill cleanup. Runtime files were then
  alpha-cropped and Lanczos-downscaled; the original generated images remain in
  the Codex generated-image store.
- Asset keys and paths are owned by `values/assetKeys.js` and
  `values/approvedHudSkin.js`. Missing approved textures preserve the legacy HUD
  fallback contract.
