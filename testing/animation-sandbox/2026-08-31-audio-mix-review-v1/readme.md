# UNDERSTAR audio decision review

Phaser review lab for choosing one clearly named sound or mix, hearing exactly
what is active, and recording an approve/reject note. The expanded library has
85 playable sources and 82 review items across eight categories. That includes
the production references, 69 additional review-only local candidates, and a
separate 24-link public discovery queue that is not downloaded or preloaded.

Run from the repository root:

```bash
python serve.py 8080
```

Then open:

`http://127.0.0.1:8080/testing/animation-sandbox/2026-08-31-audio-mix-review-v1/`

## Review workflow

1. Pick `PANIC`, `CAVE`, `MINING`, `STAR`, `MOVE`, `UI`, `REWARD`, or
   `WEATHER`.
2. Pick one named item. Selecting it starts that item and stops the prior one.
3. Read `NOW PLAYING` and `AUDIBLE NOW` to see every loop, hit, queued cue, gain,
   and sequence position currently involved.
4. Press `APPROVE` or `REJECT`. The item receives a persistent check or cross;
   `CLEAR` returns it to open.
5. `EXPORT DECISIONS JSON` downloads the complete local review record.

Each category shows six items at a time. Use the page arrows for direct page
navigation. `J` and `K` move through the complete category and automatically
cross page boundaries, so keyboard review never gets trapped on one page.

The `CAVE` category includes the original three solo beds, their combined mix,
two source-approved cave windows, tunnel wind, water seep, and eight accepted
deep-creepy candidates. `MINING` now separates dirt swings, dirt impacts, dirt
break, stone body, tool contact, and stone break instead of hiding everything
inside one demo sequence.

## Keyboard

- `J` / `K`: previous or next item inside the selected category.
- Space or `R`: play the selected item again.
- `Y`: approve; `N`: reject; `C`: clear the selected decision.
- `M`: mute; `0`: stop and return to no item selected.
- Existing direct shortcuts `1`–`9` and `D` still open their matching scenes.

## Acceptance boundary

- The fixed 0.72 output cap cannot be raised in the UI.
- Estimated simultaneous gain must remain at or below 0.42.
- No scene targets more than three loop beds. Fade-out tails are marked `↘`, and
  incoming transients wait one second when changing an already-audible scene so
  every pairwise transition stays inside the 0.42 estimate budget.
- Sequential dig hits replace an unfinished prior run on replay, so repeated
  clicks cannot leave delayed hits queued or stack the reference samples.
- Approve/reject state is stored only in browser-local review data and can be
  exported as JSON. It never promotes, deletes, or production-wires an asset.
- Panic threshold transients honor the live 9-second notice cooldown.
- Automatic voice and voice interruption are disabled.
- The three newly approved Freesound cues are marked `approved-runtime` and
  mirror the production gain route. Panic, Star-aura, release-arc, and creepy-
  ambience candidates remain `runtimeEligible: false` and sandbox-only. The
  dig pair and rain/wind files are labelled as current runtime references; this
  lab does not alter their production routing.
- All 69 expansion sources are marked `sandbox-candidate` and
  `runtimeEligible: false`. Sonniss source approval, GOOD tagging, or presence
  in `02_ACCEPTED_CANDIDATES` is not treated as runtime approval.
- The 24 online candidates are metadata links only under
  `public-candidate-index-2026-09-01`; they are not silently downloaded by the
  page. The two Kinoton leads retain an explicit extra-terms review flag.
- The canvas relies on Phaser's FIT scaler without a second CSS size clamp, so
  pointer hit areas match the rendered controls. The nine 94 px floor cells are
  centered inside the gameplay pane.
- Browser state, review decisions, category, pending hits, and audible sources
  are exposed at `window.__audioMixReview.snapshot()` and on the canvas/body
  datasets for interaction tests.

The audit still surfaces the existing panic semantic reuse: warning, critical,
and near-death calls currently share one cue family. The earlier Star `.wav` /
`.ogg` metadata mismatch is fixed and covered by the contract.
