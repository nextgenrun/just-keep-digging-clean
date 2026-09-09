# Menu atmosphere v1

Six silent MP4 loops derived from the six existing menu paintings through OpenRouter Seedance 2.0 Mini. Each is 1280 x 720, 24 fps, 20.5 seconds. Original geometry remains fixed; only a blurred and limited atmospheric variation is mixed into the original painting. A 1.5-second circular overlap is slowed 2.4 times without reversed frames or camera motion.

`values/menuAtmosphere.js` owns selection and display settings. `ui/components/MenuBackgroundView.js` retains the full-resolution original poster, streams only the selected clip, fades it in, honors still/reduced-motion/data-saver preferences and cleans up its video texture. Source provenance, costs and decoded seam measurements are in `testing/2026-09-07-menu-atmosphere/`.

Runtime repetition uses a primed second instance of the same MP4 and a soft 1.8-second overlap before file end. The hidden copy rewinds, the selected scene remains fixed, and the combined video opacity stays constant. Source MP4 hashes are unchanged; follow-up playback evidence is in `end-to-start-before.json` and `end-to-start-after.json` in the review directory.
