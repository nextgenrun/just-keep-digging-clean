# Weather Transition And Rain Polish

## Outcome

Rain, snow, and storm presentation now follow a shared time-based envelope instead of switching off when the weather director changes its phase label. Natural phases last longer and retarget intensity less often, while manual `forceWeather` still snaps to the current forced state for deterministic review tooling.

Direct rain keeps the approved ImageGen particle sheet and exact swept world collision. Its peak spawn budget is reduced from 1,072 configured drops per second across the three layers to 610, active drops are capped at 400 instead of 620, foreground streaks are narrower and less opaque, and splash density is reduced. Per-drop alpha variation keeps the remaining rain from reading as a uniform screen pattern.

The same eased rain amount now drives direct streaks, secondary mist/splashes/ripples, rain audio, world wetness, underground signal, tint, lighting snapshots, and storm visibility. Existing drops still finish their collision path against real terrain and ceilings.

## Recorded ambience

The procedural surface noise is now a temporary load fallback rather than the main rain sound. Six user-approved Sonniss GameAudioGDC 2019 recordings are promoted as seamless, license-tracked runtime loops: open rain, roof rain, sheltered heavy rain, distant storm, open wind, and strong wind.

`WeatherRecordedAmbienceController` selects exactly one rain bed for the current exposure and storm state, plus at most one wind bed. Hysteresis prevents shelter, storm, and wind thresholds from chattering; context changes use long gain fades instead of hard stops. The procedural layers fade away as recorded coverage rises and remain available underground or if an asset cannot load.

The loops are registered with the shared sound system but not queued for boot. Their deterministic offline build and source/runtime hashes are recorded in `sound/soundEffects/weather-ambience-v1/manifest.json`.

## Verification

- `testing/2026-08-30-weather-transition-polish-contract.mjs`
- `testing/2026-08-30-recorded-weather-ambience-contract.mjs`
- Existing world precipitation and swept-collision contracts
- Syntax checks for every touched JavaScript module
- Local save-safe canvas review: `Shift+F12` eases into rain and `Shift+F11` eases back to clear; the unmodified F11/F12 deterministic clear/snow previews remain available
- Local runtime proof: all six loops stay off the boot queue (`303` registered / `20` queued), while open-rain and open-wind assets return HTTP 200 when naturally requested

## Scope

No weather artwork, collision geometry, world solids, shelter masks, gameplay rewards, or save data changed. The tuning remains centralized in `values/weatherConfig.js`.
