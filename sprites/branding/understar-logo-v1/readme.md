# UNDERSTAR Logo V1

Approved Rift Monolith floating logo for the boot splash, loading screen, main
menu, and save-slot menu.

- Runtime asset: `understar-rift-monolith-runtime.png`
- Dimensions: `1555 x 462`
- Format: RGBA PNG with transparent corners and a tightly cropped wide canvas
- Review source:
  `visual-approval-previews/understar-floating-logo-redesign-v1/understar-floating-logo-01-rift-monolith.png`

The dark review backdrop was changed to flat `#ff00ff` with the built-in image
editing workflow. The installed chroma-removal helper then produced a soft
alpha matte with despill, and the transparent result was cropped with 24 pixels
of padding. No game code loads the chroma-key intermediate.

`values/branding.js` owns the runtime asset route. The legacy logo remains in
`sprites/branding/logo-enter-v-1/` as unreferenced rollback evidence.
