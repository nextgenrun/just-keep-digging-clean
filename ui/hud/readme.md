# Hud

UI module — hud.

- `XPProgressBar.js` and `UIMuteToggle.js` use the approved HUD image frames when the complete skin is loaded, otherwise retaining their procedural legacy presentation.
- `XPProgressBar.js` also supplies the exact destination segment for V2 XP
  glyph flights and pulses that segment only when the final glyph arrives.
  Semantic icon choice and flight rendering stay in the visual system; the bar
  continues to read authoritative level/XP state rather than changing it.
- `UIMuteToggle.js` routes Music/SFX confirmation through the shared
  `UINotificationSystem`; it does not create an independent short-lived toast
  that could cover another card or the XP bar.
