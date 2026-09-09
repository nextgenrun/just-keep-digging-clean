# Animated menu logo and video optimization review — 9 September 2026

## Approved result and scope

Open http://127.0.0.1:8080/testing/2026-09-09-menu-logo-motion/ for three working animated mockups. All use the approved full logo animation and original logo colors. The title treatment switches without restarting either player. Both loading and main-menu compositions are included.

Approved by the user on 9 September 2026: **Quiet sky**, a soft dark shade behind the title plus a dark contour. **Clear silhouette** leaves the scenery undimmed and uses the contour alone. **Stone plaque** uses the existing approved matte backing. There is no brightness post-effect, gamma adjustment, fullscreen color filter, or viewfinder frame.

The approved design is now integrated into the local game: `BrandLogoView`, `LoadingScreenView`, `MainMenuScene`, `LaunchScene`, `BootScene`, and their presentation values. The v6 scenery is the local runtime default; the original-color full animation is promoted to `sprites/branding/understar-motion-v6/understar-logo-loop.webm`. No live upload/release or new API generation was performed. The deployed beta remains unchanged.

## Previous implementation and live observation

Before this integration, `values/branding.js` pointed at a gamma-brightened readable poster, with an additional loading-only brightness factor of 1.45. `BrandLogoView` held those letters still and added only a colored light video. `LoadingScreenView` disabled background motion with `motion:false`. The full approved alpha animation remains available as `understar-logo-loop-alpha-v2.webm`.

The public beta opened successfully in the in-app browser, passed its intro gate, and showed the forest menu with the stone plaque and no console warnings/errors in the sampled logs. Two live screenshots show changes in the logo region and scenery; this does not prove the exact deployed configuration. Direct HTTP source reads returned SiteGround 202 challenge HTML and were not treated as app source. No claim that the complete live logo animation is entirely disabled is made.

## Media

All scenery remains native 1280 × 720, with the v5 motion speed and existing circular composition. No further upscale or brightness/filter layer is applied. The renderer uses the game's density foundation, producing a 1920 × 1080 backing canvas. Reducing media to 30 fps halves the scenic frame-decode and texture-update opportunity versus 60 fps; it does not make the animation run faster or slower.

| Scene | Existing MB | Optimized MB | Smaller |
| --- | ---: | ---: | ---: |
| ember-reaches | 19.12 | 10.69 | 44.1% |
| aurora | 19.57 | 10.74 | 45.1% |
| lantern-forest | 19.28 | 10.57 | 45.1% |
| luminous-grotto | 22.14 | 12.50 | 43.5% |
| quiet-foundry | 25.54 | 13.30 | 47.9% |
| starfall | 20.69 | 11.23 | 45.7% |

Combined scenery: **126.34 → 69.04 MB (45.4% smaller)**. Only the selected scene is decoded. H.264 retains hardware-friendly encoding, one-second keyframes, one reference frame, no B frames, and front-loaded MP4 metadata. The first more aggressive bitrate/deblocking candidate was rejected because it visibly degraded a closing frame. The final configuration retains normal deblocking/CABAC and a higher bitrate ceiling.

Full animated logo: **31.63 → 14.76 MB (53.4% smaller)**, 1120 × 332, transparent VP9, 30 fps, 22.4 seconds. Its full color and alpha frames are linearly interpolated together at the previously approved 0.67x tempo. Alpha range 0–255 verified. The contour shares this same video texture, adding no extra video decoder. This full animation is larger than the faint light-only layer; it is smaller than the approved full-animation source, which is the comparison shown here.

## Verification

All seven outputs were decoded and probed: dimensions, durations, cadence, no audio, source and output SHA-256, frame continuity, and logo alpha. Details are in `optimized-media.json`. All six scenery files have no exact duplicate adjacent frames under the recorded small tolerance. The logo has one duplicate pair from interpolation, not a multi-frame hold. Scenic durations differ from the 60 fps source by at most one 60 fps frame where the source contains an odd frame count.

Controlled forest comparison after all transcoding stopped, same restored logo and 1920 × 1080 rendering:

- Optimized: 86 seconds, 2,583 scenery frames, **0 dropped**; 2,582 logo frames, **0 dropped**. Three natural scenic wraps were 33.4 ms; logo wraps were 16.7–50.1 ms. Recent frame-callback p95 was 33.5 ms for both players.
- Existing 60 fps scenery: 95 seconds, 5,705 scenery frames, **20 dropped (0.35%)**; logo **0 dropped**. This is a comparison of scenic media under the same full-logo composition, not an assertion of the live site's exact performance. At 60 fps, recent callback p95 was 16.8 ms as expected.

Additional checks: foundry ran 133 seconds / 3,987 scenery frames with zero dropped frames and four native wraps at 16.7–33.5 ms. Aurora ran 33 seconds / 1,004 frames with one dropped frame and a 33.3 ms native wrap. The logo remained at zero dropped frames across the 253-second combined sample. MP4 and WebM byte-range requests each returned HTTP 206 with the expected 1,024 bytes and correct MIME types.

All six scenes completed natural wraps in the browser: 10,934 total scenic frames across the six recorded samples, two dropped frames (one Aurora, one Ember), and zero media errors. The scenic join callback gaps were 16.6–33.5 ms. Pause stopped both players and resume restored them. `?menuMotion=0` retained still artwork with no playback instrumentation or console warnings/errors. See `scene-smoke-summary.json`, `paused-browser.json`, and `still-art-browser.json`.

These browser samples demonstrate a lower decoding burden and successful natural loops on this desktop, not a guarantee of zero stutter on every device or network. Remote throttled-network startup and mobile VP9-alpha support have not been qualified for release.

## Reproduce

Run `testing/2026-09-09-menu-logo-motion/serve-review.py` with Python, then open the local URL. It serves the repository on loopback port 8080 with the existing production HTTP handler, including video byte ranges. Port 8080 must be free. No production build is needed and no game saves are touched.

The dated builder is `ai-tools/2026-09-09-optimize-menu-motion.py`; configuration is `values/menuMotionReview20260909.json`. It takes FFmpeg and ffprobe paths from `FFMPEG_EXE` / `FFPROBE_EXE`, needs NumPy, preserves source assets, writes candidates atomically, and resumes from `optimized-media.json`. To intentionally rebuild after changing encoder settings, preserve or remove that review-only result JSON first.

The three `mockup-*.png` loading screenshots and main-menu screenshot accompany the live animated HTML. Earlier `first-*` / `*-first-browser` files are preliminary evidence and do not describe the final candidate.

## Approved runtime verification

The actual local game passed its launch/retry, cinematic gate, cinematic and main-menu flow with the approved larger logo and original colors. The dedicated production loading-component fixture reported the full logo playing at opacity 1 with NORMAL blend, hidden poster, no backing plaque, and v6 scenery at opacity 1. One native scenery decoder plus one shared logo decoder were present; the contour uses the logo texture.

Destroying the loading screen removed both owned video textures (14 → 12 textures in the fixture), zero scenery players remained, and recreation restored playback with the same texture count. A simulated scenery media error fell back to the still scene while retaining the animated logo and usable loading UI. The main-menu native-resolution contract and menu-first loading-order contract passed. `approved-game-menu.png`, `approved-runtime-*.json`, and `approved-runtime.patch` capture the result and scope. The patch compares against the specific files immediately before this integration, preserving unrelated checkout work.

The approved integration is local only. The comparison page remains available, and `runtime-before/` retains the scoped pre-integration source for review.
