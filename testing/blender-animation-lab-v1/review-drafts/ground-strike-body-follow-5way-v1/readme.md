# Ground Strike Body Follow - Five-Way Review

Review-only Blender alternatives for `survival-ual-player-v1-attack-down-ground-strike-anim`.

All five approaches keep the striking right hand at the same floor-contact target while varying how the pelvis, spine, neck, and legs support the reach. The protected source action and runtime assets are not changed.

## Approaches

1. `01-upper-body-hinge` - restrained pelvis drop with more chest hinge.
2. `02-balanced-chain` - even motion through hips, torso, neck, and knees.
3. `03-deep-athletic-crouch` - deeper hip and knee compression.
4. `04-forward-lunge` - stronger forward carry and rear-leg brace.
5. `05-impact-compression` - fastest compression into contact with a short weighted hold.

Each approach contains its own `.blend`, frame renders, contact sheet, and animated GIF. Nothing in this folder is loaded by the game.

## Review outputs

- `five-approach-loop-comparison.gif` - synchronized 34-frame comparison.
- `five-approach-contact-comparison.png` - all five contact poses at frame 16.
- `five-approach-motion-sheet.png` - sampled anticipation, contact, and recovery poses.
- `<approach>/<approach>.gif` - full-size loop for one approach.
- `<approach>/<approach>.blend` - isolated editable Blender review file.
- `<approach>/verification.json` - contact, floor, and protected-source checks.

The visible glove surface lands within `0.013` world units of the review floor in every approach. The protected source action signature is unchanged in every generated file.
