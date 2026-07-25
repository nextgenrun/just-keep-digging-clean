"""Write the imported Survival skeletal material slot order for Blender remapping."""

from __future__ import annotations

import json
from pathlib import Path

import unreal


mesh = unreal.load_asset(
    "/Game/SurvivalMotion/Character/SK_SurvivalCharacter_Fab_v1.SK_SurvivalCharacter_Fab_v1"
)
if not isinstance(mesh, unreal.SkeletalMesh):
    raise RuntimeError("Imported Survival skeletal mesh is unavailable")

rows = []
for index, slot in enumerate(mesh.get_editor_property("materials")):
    rows.append(
        {
            "index": index,
            "slotName": str(slot.get_editor_property("material_slot_name")),
            "importedSlotName": str(slot.get_editor_property("imported_material_slot_name")),
            "material": str(slot.get_editor_property("material_interface")),
        }
    )

output = Path(unreal.Paths.project_dir()) / "SourceAssets" / "survival-material-slots.json"
output.write_text(json.dumps(rows, indent=2), encoding="utf-8")
unreal.log(f"SURVIVAL_MATERIAL_SLOTS_OK count={len(rows)} output={output}")
