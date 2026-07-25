# Ground Strike - Hand Contact v1

Very small Blender workspace for tweaking only
`survival-ual-player-v1-attack-down-ground-strike-anim`.

The file opens on source frame 16, which becomes runtime contact frame 18.
The original `DGAL_ground-strike` action remains protected. All editing happens
on `DGAL_EDIT_ground-strike_hand-contact-v1`, and nothing in this directory is
loaded by the game.

## Three steps

1. Press **Select Green Hand Control**.
2. Drag the blue Z arrow down until the right glove touches the green floor.
   Auto IK moves the complete arm.
3. Press **Save Hand Contact Pose**, then **Save My Blender Tweak**.

Launch from the repository root:

```powershell
& .\ai-tools\2026-07-22-launch-ground-strike-hand-contact.ps1
```

Recreate the clean review copy with `-Rebuild`. This still does not promote the
edit to runtime sprites; promotion remains a separate approval step.
