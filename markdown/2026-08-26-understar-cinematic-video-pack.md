# UNDERSTAR Cinematic Video Pack

Date: 2026-08-26  
Status: implemented and locally verified; not published

## Outcome

UNDERSTAR now has two runtime cinematics and three review-ready marketing
exports built from the approved game art direction, current lore, generated
motion, recorded narration, game-owned music, atmospheric sound, and readable
mute-viewer captions.

## Deliverables

Runtime:

- `sprites/cinematics/understar-cinematics-v1/understar-opening-v1.mp4` —
  25-second 1920x1080 opening before the main menu.
- `sprites/cinematics/understar-cinematics-v1/mossback-discovery-v1.mp4` —
  15-second 1920x1080 reveal for newly discovering Mossback Wanderer.

Marketing:

- `steam-marketing/2026-08-26-cinematic-video-pack-v1/understar-cinematic-trailer-v1.mp4`
  — 30-second 1920x1080 cinematic companion to a gameplay trailer.
- `understar-short-01-mossback-v1.mp4` — 15-second 1080x1920 Titan hook.
- `understar-short-02-depth-v1.mp4` — 15-second 1080x1920 progression hook.

The shorts end with a Steam-wishlist call to action. All five finals include a
mixed audio track and burned captions; editable SRT and ASS files remain under
the marketing package's `captions/` directory.

## Story and visual contract

The opening follows the canonical loop and promise: the remembering mine,
Flight, living depth biomes, and the waiting Understar. The first-Titan scene
uses the exact Mossback identity: a turtle-like Root-Bearer with a bark-and-
stone shell, teal fissures, and the established line, “That is not a statue.
It is breathing.” The trailer advertises mastery, rare Stars, 25 Titans, and
the Understar without presenting generated shots as gameplay capture.

## Generation and editing

`ai-tools/2026-08-26-generate-understar-cinematic-source.py` submits a bounded
eight-shot OpenRouter plan, polls asynchronous jobs, generates five narration
tracks, and writes provenance without storing the API key. The hard video cap
is USD 10; recorded video usage was USD 4.16.

`ai-tools/2026-08-26-edit-understar-cinematic-pack.py` uses the repository's
open-source FFmpeg lane to normalize source motion, assemble exact timelines,
mix narration/music/ambience to -16 LUFS, burn captions, write editable caption
files, create posters, and hash every final output.

## Runtime behavior

Boot transitions to `OpeningCinematicScene`, which streams the MP4 only when it
is needed. A click or key press starts reliable audio. Holding Space, Enter,
or Escape for two seconds skips playback; releasing early cancels and resets
the hold. Escape uses the same hold contract at the pre-play gesture gate, and
click cannot bypass it. An approved antique HUD frame and live gold fill show
hold progress. Decode, startup, or completion failures fail open to the main
menu.

Mossback's cinematic is requested only after the authoritative retention
system accepts a newly discovered first-Titan id. The player acquires a normal
scene suspension, controls and notifications pause, and all gameplay authority
is restored after complete, skip, or failure. The video player never discovers
a Titan, changes terrain, awards progress, or writes a save.

Local QA selectors:

- `?cinematic=mossback` previews the Mossback final through the opening player
  in development only.
- `?cinematics=0` disables both runtime videos without removing media or
  discovery progress.

## Verification

- Eight generated motion clips and five narration outputs completed.
- Five final hashes, durations, dimensions, and audio streams are recorded in
  `media-verification.json` and rechecked by the cinematic contract.
- Final contact sheets verify clean subtitle replacement, phone-safe vertical
  framing, readable CTAs, coherent motion, and stable Mossback identity.
- In-app browser QA at 1280x720 verifies the new hold instruction, active
  playback, quick-Space release without skipping, natural completion, and a
  clean warning/error log. The deterministic contract separately proves 50%
  mid-hold progress, release reset, full two-second completion, pre-start
  Escape parity, and click-bypass prevention.
- The development Mossback route verifies its gesture gate, active playback,
  natural completion to the menu, and a clean warning/error log. At 390x844,
  the same route remains fully visible inside the centered landscape canvas,
  without clipping or media errors.
- `testing/2026-08-26-cinematic-video-pack-contract.mjs`, the existing Titan
  footprint contract, the retention contract, and the production deployment
  asset-collector smoke pass.

## Publication and rollback

Nothing was uploaded to Steam or a social platform. The marketing exports are
review-only. `?cinematics=0` is the immediate runtime rollback; the structural
rollback is the opening-scene route plus `TitanDiscoveryCinematicController`.
Neither rollback alters discoveries, saves, generated media, or marketing
exports.
