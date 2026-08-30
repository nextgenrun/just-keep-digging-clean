# Audio runtime sandbox

Review-only, save-free A/B simulation built from a direct audit of the live
`SoundSystem`, Boot audio registration, gameplay call sites, and material rates.

- Open `/testing/audio-runtime-sandbox/index.html` through the repository server.
- Click `Start audio comparison`, then switch between `Sonniss candidate` and
  `Current runtime` while using A/D, Space, Shift + W/S, E, or the buttons.
- The current lane mirrors live dig/break material pitch rates and registered
  files. The candidate lane holds Sonniss recordings at 1.00x pitch.
- Flight and landing are correctly silent in the current lane because the real
  runtime has no dedicated callsite; only the candidate lane proposes them.
- The page imports no game modules, touches no saves, and registers no assets.

Run `node testing/2026-08-27-audio-runtime-sandbox-contract.mjs` for the static
asset and isolation contract.
