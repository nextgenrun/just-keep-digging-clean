# Failed v1 retarget proof

Do not use this animation result.

The v1 checks only proved that 22 named bones received keys. They did not prove
that the source and target rest spaces, hierarchy, or proportions were
compatible. The visible output is invalid because:

- the Survival and Meshy armatures use different coordinate bases;
- the Meshy spine hierarchy is `Hips -> Spine02 -> Spine01 -> Spine`, while v1
  mapped those three spine bones in reverse;
- rotations were copied in armature space without a common retarget pose;
- pelvis translation, character-scale compensation, and foot contact were not
  handled.

The isolated corrected candidate is the sibling
`legacy-miner-walk-fit-v2` review folder. Nothing from either review is loaded
by the game runtime.
