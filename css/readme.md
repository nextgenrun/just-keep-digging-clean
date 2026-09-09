# CSS

`style.css` owns the document shell around Phaser, including canvas scaling and
the accessible fullscreen fallback control. The fullscreen button is anchored
to the top-right utility rail below the audio controls so it cannot cover the
bottom-right Inventory target or its live key hint.


Menu atmosphere (2026-09-07): `values/menuAtmosphere.js` owns the shared six-scene
configuration. `ui/components/MenuBackgroundView.js` owns silent video playback,
poster fallback, reduced motion, visibility and teardown. Tailwind 4.3.3 builds
`css/menu-shell.css`; the local Radash 12.1.1 module debounces resize work.

Loading foreground (2026-09-07): menu-loading.css styles the user-requested CSS
boot/world/portal foreground: the existing HUD meter frame, readable rotating
tips and an asset-backed retry control. Its design tokens live in
values/menuLoadingTheme.css.
