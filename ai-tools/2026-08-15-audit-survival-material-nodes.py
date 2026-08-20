"""Audit the current Survival Blender material sockets for V3.1 tuning."""

from __future__ import annotations

import json
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "values/survivalMaterialQualityV31Review.json").read_text(encoding="utf-8"))
OUTPUT = ROOT / CONFIG["outputRoot"]


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    report = {"materials": {}}
    for name in CONFIG["materials"]:
        material = bpy.data.materials.get(name)
        if not material or not material.node_tree:
            raise RuntimeError(f"Missing node material: {name}")
        principled = next(
            (node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None
        )
        if not principled:
            raise RuntimeError(f"Missing Principled BSDF: {name}")
        normals = [node for node in material.node_tree.nodes if node.type == "NORMAL_MAP"]
        report["materials"][name] = {
            "principledInputs": {
                socket.name: {
                    "linked": socket.is_linked,
                    "default": list(socket.default_value) if hasattr(socket.default_value, "__len__")
                    else socket.default_value,
                }
                for socket in principled.inputs
            },
            "normalMaps": [
                {"name": node.name, "strength": node.inputs["Strength"].default_value}
                for node in normals
            ],
            "links": [
                {
                    "fromNode": link.from_node.name,
                    "fromType": link.from_node.type,
                    "fromSocket": link.from_socket.name,
                    "toSocket": link.to_socket.name,
                }
                for link in material.node_tree.links
                if link.to_node == principled
            ],
        }
    path = OUTPUT / CONFIG["materialAudit"]
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"SURVIVAL_MATERIAL_AUDIT_OK output={path}")


if __name__ == "__main__":
    main()
