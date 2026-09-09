# Save Menu V1

High-resolution authored bitmap chrome for the production Play → save flow.

- Slot frames: `870x600` RGBA, displayed at `290x200` logical pixels.
- Choice frames: `870x810` RGBA, displayed at `290x270` logical pixels.
- Confirm/import/backup frames are each built at exactly three times their
  existing logical panel geometry.
- Buttons reuse the approved authored main-menu plate family while retaining
  the existing text, icon, hint, hit zone, enabled state, and callback contract.
- This pack retains the modal, setup and rollback frame family. The Save Slots
  screen uses ../save-menu-baked-v2/ complete cards and instruction plaques;
  only saved values and changing save state remain live there.
- `?saveMenuArt=0` restores the previous Graphics surfaces without changing
  any save, file-transfer, input, or scene-transition behavior.

Build with:

`python ai-tools/2026-08-03-build-save-menu-v1.py`

Asset hashes, alpha bounds, source crops, and exact dimensions are recorded in
`manifest-v1.json`.
