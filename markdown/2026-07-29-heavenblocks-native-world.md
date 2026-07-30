# Heavenblocks Native World

**Date:** 2026-07-29  
**Scope:** production gameplay, world geometry, art, progression, crafting,
persistence, health, and rollback

Heavenblocks are part of the authoritative mine rather than images placed over
placeholder collision. Every solid island cell exists in `WorldModel`, carries
its own type and HP, collides through the normal tile collision system, rewards
a named resource, can be damaged through the normal mining path, and persists
as an individual dug hole.

## World ownership

`values/heavenblocksWorldConfig.js` owns all region bounds, topology, material
families, rooms, corridors, arrivals, shrines, relic vaults, barriers, props,
and teleport sockets. `world/generation/HeavenblocksWorldGenerator.js` builds
that geometry after the imported Tiled authority and before the final divider
guard.

| Region | Level | Bounds | Native material | Rare material |
|---|---:|---|---|---|
| Cloud Reef | 1 | x4..57, y3..43 | Cloudstone | Stormglass |
| Halo Bastion | 1 | x63..117, y2..50 | Halostone | Lumenite |
| Eclipse Scar | 2 | x136..219, y1..56 | Cinderstone | Hellglass |

The Level 2 island begins strictly right of the authoritative x132 divider.
The default world seed currently produces 3,881 native non-air cells with no
bedrock inside any island region. Small seven-cell arrival/return and shrine
floor spans are protected from runtime mining and malicious dug-key restores;
all other native material cells remain diggable.

## Visual ownership

`HeavenblocksTerrainRenderer` reads the live model and streams one modular
transparent sprite per visible native cell. Surface, underside, left edge,
right edge, interior, alternate, ore, crystal, barrier, and relic-vault roles
are chosen from topology and tile type. A cell becoming AIR destroys only that
cell's display objects. The semantic and feedback renderers yield the complete
native bounds so no square fallback or duplicate damage art can appear.

The runtime art package contains:

- 48 modular terrain, resource, prop, portal, shrine, barrier, relic-vault,
  component, and capstone WebPs;
- zero facade, island-plate, or region-wide background images;
- retained source atlases, a review contact sheet, and SHA-256 manifest.

`HeavenblocksArtifactSystem` and `HeavenblocksPortalVisualSystem` own the
non-tile presentation. Phaser display
scales are preserved when props and portals pulse; source-image dimensions
never replace the configured tile-space size.

## Progression and crafting

The persistent sequence is:

1. Discover three Ancient Relics in the existing mine.
2. Awaken the Cloud Reef surface altar.
3. Visit and complete Cloud Reef, claiming and installing the Aether Turbine.
4. Cloud completion unlocks both Halo Bastion and Eclipse Scar.
5. Complete those regions and install the Halo Regulator and Eclipse Crucible.
6. The three completed regions plus three installed parts unlock the Small Arc
   Core blueprint.
7. Forge the Small Arc Core from ordinary mine materials plus all six native
   Heavenblocks resources.
8. Use the Small Arc Core to open one vault in each region; the third vault
   grants the Zenith Keystone.
9. Forge the Omega Arc Core from the expanded resource recipe.

Relics and installed parts are eligibility records, not consumed ingredients.
Craft transactions snapshot resources and upgrades and restore both if a spend
or grant fails. Both Arc Cores remain craft-only and hidden from merchant
purchase routes.

## Access and feedback

`HeavenblocksRegionAccessGuard` blocks damage and direct flight entry while a
region is locked, synchronizes physical lock barriers, and returns bypass
attempts to the surface altar. Underground teleporter routes also consult the
same region state before charging or moving the player.

The existing relic discovery presentation remains the global award feedback.
Island relic vaults add a biome-authored burst and title without awarding a
second relic. Region unlock, first arrival, component claim, vault opening,
Zenith grant, locked access, and successful forging each use native Phaser
images, camera effects, and bounded cleanup.

## Persistence, health, and rollback

Save schema v13 retains Heavenblocks progression and Arc Core upgrade ownership.
Native dug cells use the existing dug-tile/source maps; save loading does not
regenerate the islands over restored holes.

Runtime health fails closed unless native geometry, damage guard, barriers,
cell textures, props, shrines, portals, progression, and prompt presentation
are ready. Contracts fail if any region-wide Heavenblocks background directory,
asset key, preload entry, or system returns. The guarded commit runner executes the
native contract, the complete gameplay regression, the production builder, and
an isolated HTTP canary before and after committing. A post-commit failure
creates an exact `git revert`; a pre-commit failure creates no commit.

The removed `sprites/backgrounds/heavenblocks-v1` paintings and
`V11SkyIslandVisualSystem` remain recoverable from Git history, but are not
present in the runtime tree. `?heavenblocksVisuals=0` disables only the native
presentation for comparison; `?heavenblocksGameplay=0` disables the gameplay
entry path without rewriting saved progression.
