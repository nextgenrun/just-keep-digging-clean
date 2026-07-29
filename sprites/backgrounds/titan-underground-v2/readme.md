# Titan Underground V2

Production underground Titan presentation assets.

- `titan-dais-v1.png` is the 1024x384 transparent ImageGen-authored basalt
  footing. Runtime keeps it substantially smaller than every Titan. The surface
  gallery reuses this exact art at a still smaller 2.1 by 0.36 tile presentation
  instead of the retired deep Titan Walk plinth.
- `titan-cover-resonance-v1.png` is the 512x512 transparent ImageGen-authored
  mineral-resonance overlay applied only to still-solid authoritative creature
  footprint tiles near the chamber. It renders on the shared emissive layer so
  terrain/occlusion cannot bury it, while darkness still limits distant cells.
- `2026-07-28-titan-underground-footprints-v2.json` pins every 768px stance
  source hash and its projected tile mask.

Both runtime images were generated with built-in ImageGen on flat magenta
chroma backgrounds, extracted with the installed soft-matte/despill helper,
alpha-cropped, and losslessly resized for runtime. The 25 existing
`titan-surface-stances-v1` cutouts are reused as the sharp underground creature
layer; the compact 256px creatures remain archive-thumbnail assets.
