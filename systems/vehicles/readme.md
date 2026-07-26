# Vehicle systems

Runtime ownership, control, and mining-footprint behavior for player-controlled vehicles. The Arc Core reuses the normal player controller and ability systems with a 2x2 footprint; the Molten Arc Forge grants the existing ownership ID after the Heavenblocks recipe succeeds. Its Zenith recipe evolves it into the four-times-larger Omega Arc Core with an 8x8 footprint.

`ArcCoreVisualSystem.js` renders the approved fixed-center Piskel layers for
distinct Small/Omega idle motion, dig beams and impacts, and cloud board/exit
transitions. `ArcCoreVehicleSystem.js` owns gameplay state and uses the
remappable `arcCoreVehicle` action, which defaults to `B`; `F` remains digging.
Use `?arcCoreVisualsV3=0` to retain the legacy body-only rollback.
