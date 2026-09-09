# Level 1 live background V6 evidence

Open gallery.html through canonical serve.py on port 8195, or the normal game
root with ?revision=level-one-live-v6. No layeredSky flag is needed in gameplay.

runtime-verification.json records 19 final game views, real D walking and
Shift/W/D powered flight, normal bird admission, paused motion, storm suppression,
underground culling, background cleanup, scene re-entry and explicit rollback.
The isolated headless Chrome run uses jkd_e2e=1 to disable save writes.

level-one-live-v6.mp4 is a 1920x1080, 30 fps H.264 export of the actual game
canvas recording. Birds use their normal schedule; leaf/glimmer events and the
clock change are explicitly staged for coverage. The original WEBM is retained.
The MP4 is silent because it records the visual canvas only.

contract.json, ridge-join-contract.json, geometry-checks.json,
visual-contract.json and cloud-polish-contract.json contain focused checks.
The separate atmosphere contract also passed in the recorded command output.
The ridge-polish comparison retains the earlier vertical-fade example and
corrected runtime views. Stone shapes at the far east are solid bedrock,
not scenery join artifacts.

Two NPC/Star Scar disposal findings reproduced with the previous background;
background frames/textures release completely and normal re-entry succeeds.
Six WebGL framebuffer-query warnings remain recorded. No uncaught JS errors
or asset/frame/shader warnings occurred. Wide diagnostic zoom 0.6 has the
previously reported screen-overlay coverage limitation; normal gameplay is
zoom 1. See markdown/2026-09-06-level-one-live-backgrounds-v6.md for the final
scope, source provenance and limitations.
