/**
 * Player Input Handler
 * Processes raw keyboard input into player-specific state
 * Manages button state tracking and aim direction
 */
import { GAME_CONFIG } from '../values/gameConfig.js';

export class PlayerInput {
  constructor(scene, inputHandler = null) {
    this.scene = scene;
    this.inputHandler = inputHandler;
    
    // Get keys from inputHandler (single source of truth)
    if (inputHandler) {
      const keys = inputHandler.getKeys();
      if (keys) {
        this.keys = keys;
        console.log('[PlayerInput] Using keys from inputHandler');
      } else {
        console.warn('[PlayerInput] inputHandler.getKeys() returned null - registering keys directly');
        this.keys = this._registerFallbackKeys();
      }
    } else {
      // Fallback: register keys directly (for testing without inputHandler)
      console.warn('[PlayerInput] No inputHandler provided - registering keys directly');
      this.keys = this._registerFallbackKeys();
    }
    
    // Aim direction
    this.aim = { x: 1, y: 0, label: "RIGHT" };

    // Controls enabled flag
    this.controlsEnabled = true;

    // Mine input edge-detection state
    this._lastMineState = false;
    this._queuedQuickslashInput = false;
    this._queuedThunderStrikeInput = false;
  }

  /**
   * Fallback key registration for testing without inputHandler
   * @returns {Object} Map of keys
   * @private
   */
  _registerFallbackKeys() {
    const scene = this.scene;
    
    const keys = scene.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      aimLeft: Phaser.Input.Keyboard.KeyCodes.A,
      aimRight: Phaser.Input.Keyboard.KeyCodes.D,
      aimUp: Phaser.Input.Keyboard.KeyCodes.W,
      aimDown: Phaser.Input.Keyboard.KeyCodes.S,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
      mine: Phaser.Input.Keyboard.KeyCodes.F,
      reset: Phaser.Input.Keyboard.KeyCodes.R,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      z: "Z",
      q: "Q",
      thunderStrike: Phaser.Input.Keyboard.KeyCodes.V,
    });
    keys.c = keys.thunderStrike;
    return keys;
  }
  
  /**
   * Set whether controls are enabled
   * @param {boolean} enabled
   */
  setControlsEnabled(enabled) {
    this.controlsEnabled = enabled;
  }

  setKeys(keys) {
    this.keys = keys;
  }
  
  /**
   * Get horizontal movement input
   * @returns {Object} { left: boolean, right: boolean }
   */
  getHorizontalMovement() {
    if (!this.controlsEnabled) {
      return { left: false, right: false };
    }
    
    return {
      left: this.keys.left.isDown || false,
      right: this.keys.right.isDown || false
    };
  }
  
  /**
   * Get vertical aim input
   * @returns {Object} { up: boolean, down: boolean }
   */
  getVerticalAim() {
    if (!this.controlsEnabled) {
      return { up: false, down: false };
    }
    
    return {
      up: this.keys.aimUp.isDown || false,
      down: this.keys.aimDown.isDown || false
    };
  }
  
  /**
   * Check if the up/aim-up key is currently held.
   * @returns {boolean}
   */
  isUp() {
    return this.getVerticalAim().up;
  }

  consumeSurfaceDropInput() {
    if (!this.controlsEnabled || this.keys.shift?.isDown) return false;
    return Phaser.Input.Keyboard.JustDown(this.keys.aimDown) || false;
  }

  /**
   * Get mine input
   * @returns {boolean}
   */
  getMineInput() {
    const result = this.controlsEnabled && this.keys.mine.isDown;
    
    // Log when F key is pressed
    if (result && !this._lastMineState) {
      console.log('[INPUT] F key pressed - mining triggered');
    }
    this._lastMineState = result;
    
    return result;
  }
  
  /**
   * Get reset input
   * @returns {boolean}
   */
  getResetInput() {
    // Only allow reset input in debug mode
    if (!GAME_CONFIG.debugMode) {
      return false;
    }
    
    const result = Phaser.Input.Keyboard.JustDown(this.keys.reset);
    
    // Log when R key is pressed
    if (result) {
      console.log('[INPUT] R key pressed - reset triggered');
    }
    
    return result;
  }
  
  /**
   * Get fly input
   * @returns {boolean}
   */
  getFlyInput() {
    if (!this.controlsEnabled) {
      return false;
    }
    return this.keys.shift.isDown || false;
  }

  consumeJumpInput() {
    if (!this.controlsEnabled || !this.keys.jump) return false;
    return Phaser.Input.Keyboard.JustDown(this.keys.jump) || false;
  }

  getFlightMovement() {
    if (!this.controlsEnabled) return { x: 0, y: 0 };
    const horizontal = this.getHorizontalMovement();
    const vertical = this.getVerticalAim();
    return {
      x: horizontal.left ? -1 : horizontal.right ? 1 : 0,
      y: vertical.up ? -1 : vertical.down ? 1 : 0,
    };
  }

  
  /**
   * Get Q input (for quickslash ability)
   * @returns {boolean}
   */
  queueQuickslashInput() {
    if (!this.controlsEnabled) return false;
    this._queuedQuickslashInput = true;
    return true;
  }

  getQuickslashInput() {
    const queued = this._queuedQuickslashInput;
    this._queuedQuickslashInput = false;
    if (!this.controlsEnabled) {
      return false;
    }
    return queued || this.keys.q.isDown || false;
  }
  
  /**
   * Get the configured Thunder Strike input.
   * @returns {boolean}
   */
  queueThunderStrikeInput() {
    if (!this.controlsEnabled) return false;
    this._queuedThunderStrikeInput = true;
    return true;
  }

  getThunderStrikeInput() {
    const queued = this._queuedThunderStrikeInput;
    this._queuedThunderStrikeInput = false;
    if (!this.controlsEnabled) {
      return false;
    }
    const key = this.keys.thunderStrike || this.keys.c;
    return queued || (key && Phaser.Input.Keyboard.JustDown(key)) || false;
  }
  
  /**
   * Update aim direction based on current input
   */
  updateAim() {
    if (!this.controlsEnabled) {
      return;
    }

    if (this.keys.aimUp.isDown && this.keys.aimLeft.isDown) {
      this.aim = { x: -1, y: -1, label: "UP-LEFT" };
    } else if (this.keys.aimUp.isDown && this.keys.aimRight.isDown) {
      this.aim = { x: 1, y: -1, label: "UP-RIGHT" };
    } else if (this.keys.aimDown.isDown && this.keys.aimLeft.isDown) {
      this.aim = { x: -1, y: 1, label: "DOWN-LEFT" };
    } else if (this.keys.aimDown.isDown && this.keys.aimRight.isDown) {
      this.aim = { x: 1, y: 1, label: "DOWN-RIGHT" };
    } else if (this.keys.aimUp.isDown) {
      this.aim = { x: 0, y: -1, label: "UP" };
    } else if (this.keys.aimDown.isDown) {
      this.aim = { x: 0, y: 1, label: "DOWN" };
    } else if (this.keys.left.isDown) {
      this.aim = { x: -1, y: 0, label: "LEFT" };
    } else if (this.keys.right.isDown) {
      this.aim = { x: 1, y: 0, label: "RIGHT" };
    }
  }
  
  /**
   * Get current aim label
   * @returns {string}
   */
  getAimLabel() {
    return this.aim.label;
  }
  
  /**
   * Get current aim vector
   * @returns {Object} { x: number, y: number }
   */
  getAimVector() {
    return this.aim;
  }

  /**
   * Check if player has any movement input
   * @returns {boolean}
   */
  hasMovementInput() {
    if (!this.controlsEnabled) {
      return false;
    }

    return (
      this.keys.left.isDown ||
      this.keys.right.isDown ||
      this.keys.aimUp.isDown ||
      this.keys.aimDown.isDown ||
      this.keys.jump?.isDown
    );
  }
}
