# Hud

UI module — hud.

- `XPProgressBar.js` and `UIMuteToggle.js` use the approved HUD image frames when the complete skin is loaded, otherwise retaining their procedural legacy presentation.
- `UIMuteToggle.js` routes Music/SFX confirmation through the shared
  `UINotificationSystem`; it does not create an independent short-lived toast
  that could cover another card or the XP bar.
