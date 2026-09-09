# Live Survival run

The public Survival Character by Arberry uses its original Epic-compatible skeleton and a standard four-influence runtime skin.
The motion is the retained Quaternius Jog_Fwd_Loop, consolidated as DGAL_locomotion-jog.
No character sprite sheet is generated for this run.

Rebuild with Blender 5.1 using ai-tools/2026-09-06-export-skeletal-run.py.
The source Blender file and FBX carriers remain unchanged. manifest.json records their provenance.
The runtime uses a fixed camera and fixed mesh scale; bones animate continuously.

Run the Node packer after export: ai-tools/2026-09-06-pack-skeletal-run.mjs. It bounds embedded PBR textures to 1024px and names the single retained clip. Runtime GLB vertices use their four strongest normalized skeleton weights.
