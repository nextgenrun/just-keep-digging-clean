# Player animation optimisation 500 review v1

Review-only visual package for the next player-animation polish pass. It does
not change production manifests, profiles, runtime sheets, or scene code.

## What is included

- Exactly 500 concrete optimisation points: 20 animation families multiplied
  by 25 repeatable polish lenses.
- Search, family, lens, and priority filters.
- Three synchronized Before/After loops for the strongest measured remaining
  faults:
  - stationary SIDE / Quickslash contact and release;
  - hard-landing finish into Idle;
  - wall-brace entry, loop, and release.
- Numeric source-frame metrics, collision guides, visible bounds, and anchors.
- Local-only approval buttons for review. Approval never wires production.

## Build

From the repository root:

```powershell
python testing/animation-sandbox/player-animation-optimization-500-review-v1/build_review.py
```

The build reads the production source sheets but writes only inside this review
directory. Generated artifacts live in `generated/`.

## Open

```text
http://127.0.0.1:8090/testing/animation-sandbox/player-animation-optimization-500-review-v1/
```

## Review contract

Run:

```powershell
node testing/2026-07-30-player-animation-optimization-500-review-contract.mjs
```

The contract verifies the complete 20 × 25 matrix, unique IDs, measurable
candidate improvements, artifact dimensions, review isolation, and the absence
of production imports.
