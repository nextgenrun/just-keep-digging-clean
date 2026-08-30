# Weather Ambience V1

Production-owned seamless derivatives of the six Sonniss GameAudioGDC 2019
weather recordings approved by the user on 2026-08-30.

The offline build uses only the first twelve seconds that were explicitly
auditioned. It produces ten-second stereo PCM loops at 32 kHz, using the final
two seconds as a wraparound crossfade and conservative RMS normalization.

Runtime selection is contextual: one rain recording and one wind recording may
be selected at a time. Rain recordings are not stacked; brief overlap is limited
to the fade between exterior, shelter, and storm contexts. Assets are registered
at boot but loaded only when weather needs them.

See `manifest.json` for source IDs, hashes, edit settings, and license links.
Rebuild with:

```powershell
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  pipelines/audio/2026-08-30-build-weather-ambience-v1.py
```
