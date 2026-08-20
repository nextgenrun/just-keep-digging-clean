import json
import sys
from pathlib import Path

import bpy


def argument(name):
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    prefix = f"--{name}="
    for value in argv:
        if value.startswith(prefix):
            return value[len(prefix) :]
    raise RuntimeError(f"Missing {prefix}<value>")


body_name = argument("body")
output_path = Path(argument("output"))
body = bpy.data.objects[body_name]

material_counts = {}
for index, slot in enumerate(body.material_slots):
    polygons = [polygon for polygon in body.data.polygons if polygon.material_index == index]
    vertex_indices = sorted({vertex for polygon in polygons for vertex in polygon.vertices})
    coordinates = [body.data.vertices[vertex].co for vertex in vertex_indices]
    material_counts[slot.material.name if slot.material else f"slot-{index}"] = {
        "slot": index,
        "polygons": len(polygons),
        "loops": sum(len(polygon.vertices) for polygon in polygons),
        "vertices": len(vertex_indices),
        "bounds": {
            "min": [min(point[axis] for point in coordinates) for axis in range(3)],
            "max": [max(point[axis] for point in coordinates) for axis in range(3)],
        } if coordinates else None,
    }

report = {
    "blend": bpy.data.filepath,
    "body": body.name,
    "vertices": len(body.data.vertices),
    "edges": len(body.data.edges),
    "polygons": len(body.data.polygons),
    "modifiers": [
        {"name": modifier.name, "type": modifier.type}
        for modifier in body.modifiers
    ],
    "materials": material_counts,
    "vertexGroups": [group.name for group in body.vertex_groups],
    "shapeKeys": [
        block.name for block in body.data.shape_keys.key_blocks
    ] if body.data.shape_keys else [],
}

output_path.parent.mkdir(parents=True, exist_ok=True)
output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
print(f"SURVIVAL_GEOMETRY_AUDIT_OK output={output_path}")
