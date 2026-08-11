  /**
 * Player Input Handler
 * Registers all keyboard input keys and provides key access
 * Single source of truth for all input key registration
 */
import { USER_SETTINGS, keyToPhaserKey } from "../../systems/UserSettings.js";
import { GAME_CONFIG } from "../../values/gameConfig.js";
import { getAabbAdjacentAimCandidates } from "../../player/playerDirectionalTargets.js";
import { MiningTargetVisualSystem } from "../../systems/visual/MiningTargetVisualSystem.js";
import { MouseDigInputController } from "./MouseDigInputController.js";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
  isGameplayKeybindActionEnabled,
} from "../../values/gameplayDevFlags.js";

export class PlayerInputHandler {
  constructor(scene) {
    this.scene = scene;
    this.aimBox = null;
    this.lastAimTileKey = "";
    this.stableMineTarget = null;
    this.stableMineAim = "";
    this.targetVisual = null;
    this.mouseDigInput = null;
    
    // Register all keys
    this.keys = this._registerKeys();
    
    // Create target feedback and pointer input after keyboard registration.
    this._createAimBox();
    this.mouseDigInput = new MouseDigInputController(scene);
  }

  /**
   * Register all input keys with Phaser
   * @returns {Object} Map of all registered keys
   * @private
   */
  _registerKeys() {
    const scene = this.scene;
    const binds = USER_SETTINGS.getKeybinds();
    const addBoundKey = (actionId) => {
      if (!isGameplayKeybindActionEnabled(actionId) || !binds[actionId]) return null;
      return scene.input.keyboard.addKey(keyToPhaserKey(binds[actionId]));
    };

    // Register movement keys
    const moveLeft = addBoundKey("moveLeft");
    const moveRight = addBoundKey("moveRight");
    const moveUp = addBoundKey("aimUp");
    const moveDown = addBoundKey("aimDown");

    // Register action keys
    const fly = addBoundKey("fly");
    const mine = addBoundKey("dig");
    const interact = addBoundKey("interact");
    const arcCoreVehicle = addBoundKey("arcCoreVehicle");
    const quickslash = addBoundKey("quickslash");
    const thunderStrike = addBoundKey("thunderStrike");
    const torch = addBoundKey("torch");
    const celestialEngine = addBoundKey("celestialEngine");

    // Register system keys
    const restart = addBoundKey("restart");
    const shift = fly;
    const enter = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const devCheat = isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.DEV_CHEATS)
      ? scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V)
      : null;
    const escape = addBoundKey("pause");
    const hardEscape = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const map = addBoundKey("map");
    const muteMusic = addBoundKey("muteMusic");
    const muteSfx = addBoundKey("muteSfx");
    const mainMenuKey = addBoundKey("mainMenu");
    const fullscreen = addBoundKey("fullscreen");
    const screenRecord = GAME_CONFIG.debugMode ? addBoundKey("screenRecord") : null;

    // Prevent browser default behavior for captured keys
    const captureKeys = new Set([
      ...Object.values(binds).map(keyToPhaserKey),
      Phaser.Input.Keyboard.KeyCodes.ENTER,
      ...(isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.DEV_CHEATS)
        ? [Phaser.Input.Keyboard.KeyCodes.V]
        : []),
      Phaser.Input.Keyboard.KeyCodes.ESC,
    ]);
    scene.input.keyboard.addCapture([...captureKeys]);

    // Return organized key map
    return {
      // Movement
      moveLeft,
      moveRight,
      moveUp,
      moveDown,
      
      // Aliases for aim (same as movement)
      aimLeft: moveLeft,
      aimRight: moveRight,
      aimUp: moveUp,
      aimDown: moveDown,
      
      // Actions
      fly,
      mine,
      interact,
      arcCoreVehicle,
      q: quickslash,
      c: thunderStrike,
      torch,
      celestialEngine,
      
      // System
      restart,
      reset: restart,  // Alias for backward compatibility
      shift,
      flyShift: shift,  // Alias for flying
      enter,
      devCheat,
      escape,
      hardEscape,
      map,
      muteMusic,
      muteSfx,
      mainMenuKey,
      fullscreen,
      screenRecord,

      // Legacy compatibility (expose individual keys)
      left: moveLeft,
      right: moveRight,
    };
  }

  /**
   * Get all registered keys
   * @returns {Object} Map of all keys
   */
  getKeys() {
    return this.keys;
  }

  refreshKeybinds() {
    this.keys = this._registerKeys();
    if (this.scene.playerController?.input?.setKeys) {
      this.scene.playerController.input.setKeys(this.keys);
    } else if (this.scene.playerController?.input) {
      this.scene.playerController.input.keys = this.keys;
    }
    this.scene.interactKey = this.keys.interact;
    return this.keys;
  }

  _createAimBox() {
    this.targetVisual = new MiningTargetVisualSystem(this.scene);
    this.aimBox = this.targetVisual.root;
  }

  resolveMiningInputState() {
    const keyboardTarget = this.resolveAimTargetTile();
    return this.mouseDigInput.resolveState(
      keyboardTarget,
      this.scene.playerController.getAimLabel(),
      this.keys,
    );
  }

  acknowledgeMouseMineRequest() {
    this.mouseDigInput?.acknowledgeMineRequest();
  }

  getMouseDigSnapshot() {
    return this.mouseDigInput?.snapshot() || null;
  }

  resolveAimTargetTile() {
    const aim = this.scene.playerController.getAimVector();
    return this.resolveAimTargetTileForVector(aim);
  }

  resolveAimTargetTileForVector(aim) {
    const candidates = this.getAimCandidates(null, aim);
    const inBounds = candidates.filter((candidate) => (
      this.scene.worldModel.inBounds(candidate.tx, candidate.ty)
    ));

    for (const candidate of inBounds) {
      if (this.scene.worldModel.isSolid(candidate.tx, candidate.ty)) {
        return candidate;
      }
    }

    return inBounds[0] ?? null;
  }

  getAimCandidates(baseTile, aim) {
    const body = this.scene.playerController?.physicsBody;
    const tileSize = this.scene.config?.tileSize;
    return getAabbAdjacentAimCandidates(body, tileSize, aim);
  }

  isSolidAimTarget(targetTile) {
    if (!targetTile) {
      return false;
    }

    if (!this.scene.worldModel.inBounds(targetTile.tx, targetTile.ty)) {
      return false;
    }

    return this.scene.worldModel.isSolid(targetTile.tx, targetTile.ty);
  }

  resolveStableMineTarget(rawTarget, mineHeld, aimLabel) {
    const normalizedAim = String(aimLabel || "");
    if (!mineHeld) {
      this.stableMineTarget = null;
      this.stableMineAim = "";
      return rawTarget;
    }

    const latched = this.stableMineTarget;
    const latchStillValid = latched
      && this.stableMineAim === normalizedAim
      && this.scene.worldModel.inBounds(latched.tx, latched.ty)
      && this.scene.worldModel.isSolid(latched.tx, latched.ty);
    if (latchStillValid) return latched;

    this.stableMineTarget = rawTarget ? { tx: rawTarget.tx, ty: rawTarget.ty } : null;
    this.stableMineAim = normalizedAim;
    return rawTarget;
  }

  updateAimBox(targetTile, shouldShow, feedbackState = null) {
    this.targetVisual?.update(targetTile, shouldShow, feedbackState);
    this.lastAimTileKey = this.targetVisual?.lastTargetKey || "";
  }

  setAimBoxVisible(visible) {
    this.targetVisual?.setVisible(visible);
  }

  destroy() {
    this.stableMineTarget = null;
    this.stableMineAim = "";
    this.mouseDigInput?.destroy();
    this.targetVisual?.destroy();
    this.mouseDigInput = null;
    this.targetVisual = null;
    this.aimBox = null;
  }
}
