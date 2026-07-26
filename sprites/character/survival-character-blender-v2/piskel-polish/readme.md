# Survival Blender v2 Piskel polish

Editable post-render animation sources generated from the protected Blender v2
runtime sheets. The Blender master remains the motion and mesh authority.

Run `python tools/piskel-mcp/character_piskel_pipeline.py polish --ids <id>`
after editing. Manifest-selected body anchors, one animation-wide scale, and
the authored frame order are applied before a polished runtime sheet is built.
Per-frame rescaling is forbidden because it creates visible breathing/pulsing.

