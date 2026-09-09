# Merchant welcome blend

One quiet cue for the short merchant gesture before the shop reveal. The blend combines an authored fabric-like rustle, a softened coin tick and a warm, muted crystal tail. The runtime uses the small OGG; the WAV is a lossless listening preview. Both contain the same mix.

Sources: [Coins13.wav](https://freesound.org/people/doudar41/sounds/573361/) by doudar41, CC0 1.0; [User Interface Magic Chimes](https://freesound.org/people/mikiko850/sounds/849807/) by mikiko850, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Both source derivatives were already approved in the project. The chime attribution and license continue to apply to this edited composite.

Changes: trim, low-pass filtering, slight pitch reduction, shorter shaped envelopes, quiet authored rustle and warm sine body. See manifest.json for source/output hashes and decoded measurements. No clipped samples; measured OGG peak 0.512. Runtime gain 0.22 times the existing UI volume, then the existing SFX and master buses.

Rebuild: run pipelines/audio/buildMerchantWelcome.py with the path to a trusted FFmpeg executable as its optional first argument. NumPy is required.
