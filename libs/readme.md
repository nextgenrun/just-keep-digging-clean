# Libs

libs directory.


Menu atmosphere (2026-09-07): `values/menuAtmosphere.js` owns the shared six-scene
configuration. `ui/components/MenuBackgroundView.js` owns silent video playback,
poster fallback, reduced motion, visibility and teardown. Tailwind 4.3.3 builds
`css/menu-shell.css`; the local Radash 12.1.1 module debounces resize work.
