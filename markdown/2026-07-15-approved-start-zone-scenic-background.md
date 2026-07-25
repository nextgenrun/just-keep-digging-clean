# Approved Start-Zone Scenic Background

The accepted image-generation mockup keeps the original V11 night mountain town
composition while improving depth, atmosphere, material response, and cool/warm
lighting separation.

Runtime scope is intentionally limited to the NPC surface start zone. The clean
scenic plate replaces the pale legacy town composite while remaining behind live
terrain, player, NPCs, signs, weather, and HUD. Its authored ground line is anchored
to the real world surface; the plate remains fixed when the camera/player moves and
rolls back with `?townScenic=0`.

The approved revision is world-space rather than camera-following. The plate is
split at runtime: sky/town art stays behind gameplay, while a dedicated 13 by 8
continuous earth source is sampled into facade cells over every solid tile. Facade
cells read but never write `WorldModel`, disappear when their real tile becomes air,
retain crack-stage feedback, and preserve resource/special identity with compact
recognition art above the soil instead of restoring the old square tile base.

Only the first eight visual tile rows beneath the town use the facade in this approval
stage. Deeper underground regions and the second world are unchanged.
