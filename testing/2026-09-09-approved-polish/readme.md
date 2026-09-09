# Approved asset polish evidence — 2026-09-09

`index.html` displays the 24 runtime assets and the two review-only cave compositions. #26 and #28 are not imported by game code. Their prompts are retained in `mockup-prompts.json`; the full runtime prompt set and alpha/hash manifest are in `sprites/UI/approved-polish-2026-09-09/manifest.json`.

The full-game fixture is `../2026-09-09-approved-polish-review.html?jkd_e2e=1&cinematics=0`. Its explicit local-only controls require save blocking. The collapse preview uses the actual cinematic and recap views without consuming a life or writing a memorial. Runtime regression coverage is `../2026-09-09-approved-polish-contract.mjs`.
