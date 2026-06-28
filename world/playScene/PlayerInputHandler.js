  /**
 * Player Input Handler
 * Registers all keyboard input keys and provides key access
 * Single source of truth for all input key registration
 */
import { USER_SETTINGS, keyToPhaserKey } from "../../systems/UserSettings.js";

export class PlayerInputHandler {
  constructor(scene) {
    this.scene = scene;
    this.aimBox = null;
    this.lastAimTileKey = "";
    
    // Register all keys
    this.keys = this._registerKeys();
    
    // Create aim box for visual feedback
    this._createAimBox();
  }

  /**
   * Register all input keys with Phaser
   * @returns {Object} Map of all registered keys
   * @private
   */
  _registerKeys() {
    const scene = this.scene;
    const binds = USER_SETTINGS.getKeybinds();
    const addBoundKey = (actionId) => scene.input.keyboard.addKey(keyToPhaserKey(binds[actionId]));

    // Register movement keys
    const moveLeft = addBoundKey("moveLeft");
    const moveRight = addBoundKey("moveRight");
    const moveUp = addBoundKey("aimUp");
    const moveDown = addBoundKey("aimDown");

    // Register action keys
    const jump = addBoundKey("jump");
    const mine = addBoundKey("dig");
    const interact = addBoundKey("interact");
    const gemVision = addBoundKey("gemVision");
    const gemDashAlt = addBoundKey("gemDash");
    const quickslash = addBoundKey("quickslash");
    const thunderStrike = addBoundKey("thunderStrike");
    const torch = addBoundKey("torch");

    // Register system keys
    const restart = addBoundKey("restart");
    const shift = jump;
    const enter = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const devCheat = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V);
    const escape = addBoundKey("pause");
    const hardEscape = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const muteMusic = addBoundKey("muteMusic");
    const muteSfx = addBoundKey("muteSfx");
    const mainMenuKey = addBoundKey("mainMenu");
    const fullscreen = addBoundKey("fullscreen");

    // Prevent browser default behavior for captured keys
    const captureKeys = new Set([
      ...Object.values(binds).map(keyToPhaserKey),
      Phaser.Input.Keyboard.KeyCodes.ENTER,
      Phaser.Input.Keyboard.KeyCodes.V,
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
      jump,
      mine,
      interact,
      z: gemVision,
      g: gemDashAlt,
      q: quickslash,
      c: thunderStrike,
      torch,
      
      // System
      restart,
      reset: restart,  // Alias for backward compatibility
      shift,
      flyShift: shift,  // Alias for flying
      enter,
      devCheat,
      escape,
      hardEscape,
      muteMusic,
      muteSfx,
      mainMenuKey,
      fullscreen,

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
    this.aimBox = this.scene.add
      .rectangle(0, 0, this.scene.config.tileSize, this.scene.config.tileSize)
      .setStrokeStyle(2, 0xf6df80, 0.95)
      .setFillStyle(0xf6df80, 0.14)
      .setDepth(30)
      .setVisible(false);
  }

  resolveAimTargetTile() {
    const playerTile = this.scene.playerController.state.getPlayerTile();
    const aim = this.scene.playerController.getAimVector();
    const candidates = this.getAimCandidates(playerTile, aim);

    for (const candidate of candidates) {
      if (!this.scene.worldModel.inBounds(candidate.tx, candidate.ty)) {
        continue;
      }

      if (this.scene.worldModel.isSolid(candidate.tx, candidate.ty)) {
        return candidate;
      }
    }

    return candidates[0] ?? null;
  }

  getAimCandidates(baseTile, aim) {
    if (aim.x !== 0) {
      return [
        { tx: baseTile.tx + aim.x, ty: baseTile.ty },
        { tx: baseTile.tx + aim.x, ty: baseTile.ty + 1 },
        { tx: baseTile.tx + aim.x, ty: baseTile.ty - 1 },
      ];
    }

    if (aim.y > 0) {
      return [
        { tx: baseTile.tx, ty: baseTile.ty + 1 },
        { tx: baseTile.tx - 1, ty: baseTile.ty + 1 },
        { tx: baseTile.tx + 1, ty: baseTile.ty + 1 },
      ];
    }

    return [
      { tx: baseTile.tx, ty: baseTile.ty - 1 },
      { tx: baseTile.tx - 1, ty: baseTile.ty - 1 },
      { tx: baseTile.tx + 1, ty: baseTile.ty - 1 },
    ];
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

  updateAimBox(targetTile, shouldShow) {
    if (!shouldShow) {
      this.lastAimTileKey = "";
      this.aimBox.setVisible(false);
      return;
    }

    const tileKey = `${targetTile.tx},${targetTile.ty}`;
    if (this.lastAimTileKey === tileKey && this.aimBox.visible) {
      return;
    }

    const worldPosition = this.scene.worldModel.tileToWorld(targetTile.tx, targetTile.ty);
    this.aimBox.setPosition(worldPosition.x, worldPosition.y);
    this.aimBox.setVisible(true);
    this.lastAimTileKey = tileKey;
  }

  setAimBoxVisible(visible) {
    this.aimBox.setVisible(visible);
  }

  destroy() {
    if (this.aimBox) {
      this.aimBox.destroy();
    }
  }
}
