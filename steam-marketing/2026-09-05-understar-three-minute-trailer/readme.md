# UNDERSTAR — The Depths Are Calling

Completed 2026-09-05. A three-minute gameplay trailer for Steam marketing.

## Deliverables

- **understar-gameplay-trailer-3min.mp4** — final master, exactly 180.000 seconds / 10,800 frames, 1920×1080 at 60 fps. H.264 High 4.2, approximately 20 Mbps video, AAC 320 kbps, 48 kHz stereo, fast-start MP4.
- **poster-gameplay.png** — an uncaptioned 1920×1080 frame from the actual trailer.
- **understar-gameplay-trailer.blend** — Blender 5.1.2 Video Sequencer project with 34 cuts, editable text, logos and mastered audio. Keep this folder and its work/ subfolder together. Native Blender title spacing differs from the final libass render; titles.ass is authoritative for the delivered master.
- **preview.html** — local playback review with chapter buttons and download links. Run work/media-preview-server.py and open http://127.0.0.1:8775/preview.html for working chapter seeking.
- **edit.json**, **source-manifest.json**, **titles.ass**, **titles.srt** — timing, sources and editable titles. The SRT contains the on-screen editorial titles; there is no voiceover.
- **contact-sheet-1.jpg** through **contact-sheet-3.jpg** — inspection frames across the entire master.
- **media-verification.json**, **audio-mastering.json**, **blender-verification.json** — measured output and project checks.

## Edit

| Time | Sequence |
| --- | --- |
| 00:00–00:16 | Celestial action hook, Mossback glimpse, UNDERSTAR title |
| 00:16–00:53 | Surface town, mining, deeper materials and flight |
| 00:53–01:20 | Star discovery, three-panel star montage, mining combos |
| 01:20–01:53 | Wayward Star, Hollow Sun, Comet Engine and deeper mining |
| 01:53–02:05 | Mossback Titan discovery |
| 02:05–02:16 | Worldroot and return to town |
| 02:16–02:54 | Accelerating gameplay montage |
| 02:54–03:00 | Logo and Steam wishlist call to action |

## Sources and sound

The trailer uses real game canvas recordings, the existing UNDERSTAR runtime logo and Barlow Semi Condensed fonts. New recordings were made from the current checkout through the game's recorder and an isolated local filming page. The filming session staged unlocked progression and scene positions, then used native gameplay actions and effects. Selected August recordings add ordinary mining, cave flight, town and stars. All gameplay keeps its original timing; modest crops, color balancing, titles and an editorial split screen were applied.

No generated cinematic footage or external stock footage appears in the master. The two accidental God Mode takes and underlit or disabled-Level2 takes were excluded. The existing game source code and normal save slots were not modified.

Music: tor-music-boss-breakthrough-final-opening-heroic-impact-i04-b03-c01-v01.mp3 from sound/playlists. Effects come from the new recordings and the approved rare-discovery-tight-reward.ogg cue. Older footage's audio is muted to avoid competing music. The mix has shaped music levels, native action sounds and a two-pass loudness master; measured final audio is -15.12 LUFS with -1.28 dBTP.

## Verification

The final file passed a complete FFmpeg decode. FFprobe confirms exactly 180 seconds, 10,800 frames, 1920×1080, 60/1 fps, square pixels, BT.709, 48 kHz stereo AAC. All three final contact sheets and the Blender endcard were visually inspected. Browser playback, chapter seeking, the three-star montage, the endcard and completion at 180 seconds were verified without a media error. Blender reports all referenced video and sound files present.

Export settings follow [Steamworks trailer guidance](https://partner.steamgames.com/doc/store/trailer). This is a local deliverable; it has not been uploaded or published.

## Rebuild

Use the installed Python runtime with:
1. pipelines/video/2026-09-05-build-understar-three-minute.py
2. pipelines/video/2026-09-05-finish-understar-three-minute.py

Create the editable project with Blender --background --python pipelines/video/2026-09-05-build-trailer-blender.py.

The pipeline retains per-cut normalized video, PCM effects, separate audio stems, the mastered WAV, source inventories and render logs under work/. Existing output files are reused on reruns; remove only the specific generated output you intentionally want to rebuild.

## Simple editing in Shotcut

Open understar-shotcut.mlt in Shotcut. The finished MP4 is divided into its 34 original scenes on one timeline, with music and titles included. Select a scene and press X to remove it and close the gap. Press S at the playhead to split within a scene. Ctrl+S saves the project; Ctrl+E exports the edited video.

Shotcut portable is at C:/Users/Mila/AppData/Local/Programs/Shotcut-26.8.1-portable/Shotcut/shotcut.exe. A desktop shortcut opens this trailer project. No account is required.
