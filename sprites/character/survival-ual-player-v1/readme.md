# Survival UAL Player v1

This is the approved `Survival Character FREE` visual donor driven by the
game-approved UAL animation foundation. Unreal Engine 5.8's IK Retargeter owns
the skeleton transfer; the Survival mesh, materials, native skin weights, and
deformation remain the visual authority.

The runtime is weaponless but now includes UAL2 tool-swing mining and upward-hook action sheets. Rejected kick, hook-recovery,
sword/up-strike, and legacy down-facing variants are deliberately excluded.
Gameplay timing, the 31 x 75 collider, and the 0.8-tile visible-height target
remain shared with the UAL profile.

Use `?character=survivalUal` for this body or `?character=ualNative` for the
original UAL mannequin while comparing them in game.

## Folders

- `runtime/` contains the Phaser-ready sheets, manifest, rig markers, and
  contact-aligned frame metadata.

The active moving side-dig is a phase-locked Jog + Jab/Cross pair exported
through the central Piskel pipeline. It is selected only while grounded and
moving toward a LEFT/RIGHT mining target; standing and diagonal actions remain
separate.
