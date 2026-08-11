# PERSIST-008: The asset catalog is only shallow-frozen but mutated at runtime

Severity: `P4`
Status: confirmed active contract inconsistency
Area: asset ownership and boot state

## Evidence

- `values/assetKeys.js:1` declares `ASSET_KEYS` with `Object.freeze`, which presents the root catalog as immutable.
- Nested `audio.music.playlist` and `audio.voiceLines.playerRandomFiles` remain mutable at `values/assetKeys.js:637` and `:674`.
- `ui/scenes/BootScene.js:1182` replaces the nested playlist array after reading the manifest.
- `ui/scenes/BootScene.js:1187` replaces the nested random voice-file array after reading the manifest.
- Other modules consume the same shared object, so asset identity and manifest state depend on boot ordering and mutation.

## Impact

The catalog has a split ownership contract: static asset IDs look immutable, but boot-time data is stored back into the same global object. Tests, scenes, and tools can observe different values depending on whether `BootScene.preloadAudio()` has run. The current behavior is intentional for dynamic manifests and did not produce a load error, so this is contract debt rather than a confirmed startup break.

## Permanent solution setup

- Keep `ASSET_KEYS` as a deeply immutable static catalog.
- Store fetched playlist and voice manifests in a separate validated `RuntimeAudioManifest` state object.
- Pass that state to the audio system explicitly or expose a read-only snapshot after boot.
- Add a development assertion that static asset IDs are never reassigned.
- Add boot-order tests for consumers reading audio state before and after manifest loading.

