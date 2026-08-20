import { RANDOM_WORLD_EVENT_CONFIG } from "../../values/randomWorldEvents.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

export class SleepingJackpotWorldSupport {
  constructor(scene, director, flags) {
    this.scene = scene;
    this.director = director;
    this.flags = flags;
    this.cue = null;
    this.cuePhase = null;
  }

  get record() { return this.director.state.sleepingJackpot; }

  reconcileAfterLoad() {
    const record = this.record;
    if (!this.flags.master) {
      this.clearCue();
      return true;
    }
    if (!record) {
      this.clearCue();
      return true;
    }
    const opened = this.scene.specialTileSystem?.openedChestKeys?.has?.(record.chest.key) === true;
    const missing = this.scene.worldModel.getTileType(record.chest.tx, record.chest.ty) !== TILE_TYPES.CHEST;
    if (!opened && !missing) {
      this.syncCue();
      return true;
    }
    const current = this.scene.digSystem?.getResourceTotals?.() || {};
    const restored = { ...current };
    for (const [key, amount] of Object.entries(record.escrow || {})) {
      const next = (restored[key] || 0) + amount;
      if (!Number.isSafeInteger(next)) {
        this.scene.uiNotifications?.danger?.("JACKPOT ESCROW REPAIR NEEDS MANUAL REVIEW", {
          key: "sleeping-jackpot-repair",
          priority: 9,
        });
        return false;
      }
      restored[key] = next;
    }
    this.scene.digSystem.setResourceTotals(restored);
    this.director.clearSleepingJackpot();
    this.scene.uiNotifications?.warning?.("INVALID JACKPOT CHEST REPAIRED  •  ESCROW RESTORED", {
      key: "sleeping-jackpot-repaired",
      priority: 7,
    });
    this.scene.queueDugTilesSave?.();
    this.clearCue();
    return true;
  }

  showCue(tile, phase) {
    const world = this.scene.worldModel.tileToWorld(tile.tx, tile.ty);
    if (!this.cue) {
      const crop = RANDOM_WORLD_EVENT_CONFIG.visuals.crops.rush;
      this.cue = this.scene.add.image(world.x, world.y, RANDOM_WORLD_EVENT_CONFIG.visuals.sigilKey)
        .setCrop(crop.x, crop.y, crop.width, crop.height)
        .setDisplaySize(92, 70)
        .setDepth(RANDOM_WORLD_EVENT_CONFIG.visuals.renderDepth)
        .setBlendMode(Phaser.BlendModes.ADD);
    }
    this.cue.setPosition(world.x, world.y).setVisible(true);
    this.cue._eventTile = { tx: tile.tx, ty: tile.ty };
    this.cuePhase = phase;
  }

  syncCue() {
    const record = this.record;
    if (this.flags.master && record) this.showCue(record.chest, record.phase);
    else this.clearCue();
  }

  update(time) {
    const record = this.record;
    if (record) this.showCue(record.chest, record.phase);
    if (!this.cue) return;
    if (!record && this.cuePhase === "candidate") {
      const player = this.scene.playerController?.getPlayerTile?.();
      const cueTile = this.cue._eventTile;
      if (!player || Math.abs(player.tx - cueTile.tx) + Math.abs(player.ty - cueTile.ty) > 2) {
        this.clearCue();
        return;
      }
    }
    const pulse = 0.5 + Math.sin((Number(time) || 0) * 0.004) * 0.5;
    const sizeScale = 0.92 + pulse * 0.08;
    const world = this.scene.worldModel.tileToWorld(record?.chest?.tx ?? this.cue._eventTile.tx, record?.chest?.ty ?? this.cue._eventTile.ty);
    const cycle = (Number(time) || 0) * 0.0032;
    this.cue.setAlpha(0.58 + pulse * 0.34)
      .setPosition(
        world.x,
        world.y + Math.sin(cycle) * RANDOM_WORLD_EVENT_CONFIG.visuals.sleepingCueBobPx,
      )
      .setAngle(Math.sin(cycle * 0.72) * RANDOM_WORLD_EVENT_CONFIG.visuals.sleepingCueTiltDeg)
      .setDisplaySize(92 * sizeScale, 70 * sizeScale);
    if (this.cuePhase === "awake") this.cue.setTint(0xffd76a);
    else this.cue.clearTint();
  }

  clearCue() {
    this.cue?.destroy();
    this.cue = null;
    this.cuePhase = null;
  }

  destroy() {
    this.clearCue();
    this.scene = null;
    this.director = null;
  }
}
