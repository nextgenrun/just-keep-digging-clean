# ElevenLabs Layered SFX Mockup

## Outcome

The review-only ElevenLabs pilot covers eight representative Dig Game sound
families: dirt mining, stone break, crystal break, robot power-on, void-gate
pulse, UI confirmation, darkness-edge ambience, and void-gate ambience.

Each family contains one complete reference effect and four separately
generated mix layers. The browser sampler can audition the reference, each
layer, or all isolated layers together. Nothing is registered with BootScene,
SoundSystem, SoundLibraryManager, or another runtime surface.

## Spend boundary

The complete one-take plan is capped at 40 requests and 144 seconds of audio.
Using the documented fixed-duration API estimate of 20 ElevenLabs credit units
per second, the required ceiling is 2,880 credit units. The generator refuses
live execution unless both ceilings are passed explicitly.

The completed live batch returned 40 successful files and zero failures. The
API response headers reported 1,440 total cost units for the 144 generated
seconds, so the 2,880-unit execution ceiling remained deliberately
conservative. The final MP3 package is 2,342,316 bytes.

## Review boundary

All generated filenames end in `__UNTESTED.mp3` and stay under
`SoundLibrary_Review/00_INBOX_RAW_EXPORTS/`. Human listening is mandatory.
Only explicitly rated-good candidates may progress through the existing review
folders; this mockup does not change the game runtime.

## Security

The generator accepts no command-line key. `ELEVENLABS_API_KEY` is read from the
process environment, never written to the manifest, and sanitized from API
errors before they are recorded.

After generation, the temporary process environment and Windows clipboard were
cleared, and a repository scan found no stored API key.
