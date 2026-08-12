# Scenes

UI module — scenes.

`PlayScene.js` is the Phaser composition root. It injects concrete modal,
notification, HUD, inventory, shop, and recovery ports into the world layer;
world modules no longer import UI implementations. Its read-only legacy
`gameState`, `paused`, `isInDialogue`, and `isInShop` getters are backed by the
scene mode controller while the migration continues.

The live frame is registered across input, simulation, world, presentation,
camera/lighting, and telemetry boundaries. A presentation fault quarantines
only that registration. A progression, simulation, or persistence fault blocks
input, prevents further save writes, and opens the authored recovery surface so
the player can reload the previous valid snapshot or return to the menu.

`BootScene.js` mini-preloads the regular loading-screen logo/background and
the retained deferred-feature loading chrome before starting its full queue.
`WorldLoadScene.js` uses the same pre-minigame progress/failure API while
loading the selected character and nearby world package. The retired loading
minigame package is preserved under `archive/2026-08-03-loading-mining-minigame/`.

`CaveScene.js` preloads one authored 3:1 interior for the selected cave identity.
`CaveLevelPresentationSystem` stretches that single image across the world and
keeps the approved left entrance unchanged; it never repeats cards or adds
Meshy shell actors. `CaveWorldModel` owns only ordinary mineable terrain.
Compact cave rollback behavior remains unchanged.


`StartMenuScene.js` exposes visible, slot-aware Export Save and Import Save
buttons in the 1280x720 safe area. Empty slots can receive an import, while
export remains disabled until the selected slot contains save data.

Its default presentation now uses high-resolution authored bitmap chrome for
all three save dossiers, selected/hover states, clear/import/backup dialogs,
save-rule choice cards, and save-flow action buttons. Dynamic slot and backup
data remains Phaser text, existing hit zones and keyboard paths stay unchanged,
and `?saveMenuArt=0` restores the prior Graphics surfaces without changing
save or transition behavior.

Every empty slot now composes two explicit decisions before launch:
the illustrated `StartModeSelectionOverlay` Casual/Permadeath Hardcore rules,
then `StartTutorialChoiceOverlay` Yes/No. Keyboard listeners attach on the next
scene tick so the Space/Enter event that opens one decision cannot silently
accept it or skip the next decision. Existing saves bypass both prompts and use
their persisted settings and tutorial state. `WorldLoadScene` preserves both
new-save choices through loading and retry. The resulting explicit new-save
launch skips the later old/remote-save restore probe, preventing a failed
remote permadeath deletion from resurrecting the erased run.

The save-slot export and rotating-backup controls visibly show `OATH LOCKED`
for Hardcore. Backups remain counted for the death purge but cannot be restored
to rewind low GP, stress, position, or a committed Wurm warning.

`BootScene.js` preloads the ten approved Milestone/Star Pillar stage sprites,
the constellation Star Heart used inside Star Pillar sockets, and only the Level
1 facade recognition atlas and start chunk;
`LevelOneGroundFacadeSystem` streams the remaining eight chunks from their pure
values manifest as the surface camera moves.

Weather preload is values-driven: Boot queues only the approved cloud,
atmosphere, and lightning atlases plus the clean 32-frame ImageGen particle
sheet. The rejected broad rain/snow/water sheets are not part of the runtime
queue.

Ground-damage preload is also values-driven. Boot queues exactly one atlas from
`getWorldVisualDamagePreloadAssets()`: polished Piskel V2 by default, or the
byte-intact V1 atlas for `?groundDamageAtlas=legacy`. Both use the same texture
key and frame geometry, so the painter and preload cannot disagree; the Piskel
projects and review exports are never queued.

The FX preload also queues the single generated mining-target corner overlay
from `values/miningTargetFeedback.js`; the explicit rectangle rollback skips
that texture.

When NPC activities are enabled, `BootScene.js` also preloads the 48 transparent
v10 Piskel-normalized planted-idle cutouts declared by
`values/npcActivityConfig.js`. It never loads a visual-approval board or any
rejected walking frame.

The archived Shadow Miner idle atlas is intentionally excluded from the live
boot queue. No production system consumes it; loading the 3840x3840 sheet only
adds texture pressure and can prevent PlayScene from starting on constrained
renderers. The smaller active Shadow Miner sheet remains available.

The shared UI Boot preload keeps the 25 independent Titan surface stances, the
walk plinth, underground dais, resonance overlay, guidance pointer, and 25
compact archive portraits resident. Escape can therefore open TITANS immediately
instead of placing its UI behind the deep-world streaming queue. Other optional
feature packages still honor `?runtimeFeatureAssets=0`, while `?titans=0` still
disables the complete Titan feature. Source chroma, alpha masters, contact
sheets, and intermediate atlases remain tooling-only.


`WorldLoadScene` also queues only the save slot's current Campfire tier and its
next upgrade before PlayScene starts; the other eight tiers no longer occupy
Boot transfer or decoded memory.

`BootScene.js` also queues exactly the 25 live modular surface-prop cutouts
returned by `getSurfacePropPreloadAssets()`: the retained 18-piece Level
1/Level 2 kit plus seven additive Level 2 chapter anchors. Review panoramas,
chroma sources, alpha masters, scale sheets, and retained Level 2 v1 tone
sources are never loaded at runtime.
