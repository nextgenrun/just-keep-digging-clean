# Mixamo candidate library v1

Review-only animation source, retarget, render, and acceptance workspace for the
approved Survival character. Mixamo clips are imported as animation carriers,
retargeted to the original 160-bone rig, and rendered with matched camera,
materials, scale, and timing. Nothing in this directory is loaded by runtime.

The review UI records browser-local `accept`, `maybe`, and `reject` decisions.
Those decisions are not promotion authority. Any accepted motion still needs a
separate corrective pass and explicit runtime approval.

The user explicitly approved Hurricane Kick for Quickslash on 2026-08-19. Its
FBX remains a source carrier here; production consumes only the V4-retargeted,
gated 256 px sheet and keeps mining, GP, hitbox, collider and no-jump authority
unchanged.
