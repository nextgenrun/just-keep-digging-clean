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
  }

  /**
   * Fallback key registration for testing without inputHandler
   * @returns {Object} Map of keys
   * @private
   */
  _registerFallbackKeys() {
    const scene = this.scene;
    
    return scene.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      aimLeft: Phaser.Input.Keyboard.KeyCodes.A,
      aimRight: Phaser.Input.Keyboard.KeyCodes.D,
      aimUp: Phaser.Input.Keyboard.KeyCodes.W,
      aimDown: Phaser.Input.Keyboard.KeyCodes.S,
      mine: Phaser.Input.Keyboard.KeyCodes.F,
      reset: Phaser.Input.Keyboard.KeyCodes.R,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      g: "G",
      z: "Z",
      q: "Q",
      c: Phaser.Input.Keyboard.KeyCodes.C,
    });
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
   * Get Z input (for gem vision)
   * @returns {boolean}
   */
  getZInput() {
    return this.keys.z.isDown;
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

  /**
   * Get controlled downward flight input
   * @returns {boolean}
   */
  getFlyDownInput() {
    if (!this.controlsEnabled) {
      return false;
    }
    return (this.keys.shift.isDown && this.keys.aimDown.isDown) || false;
  }
  
  /**
   * Get Q input (for quickslash ability)
   * @returns {boolean}
   */
  getQuickslashInput() {
    if (!this.controlsEnabled) {
      return false;
    }
    return this.keys.q.isDown || false;
  }
  
  /**
   * Get C input (for thunder strike ability)
   * @returns {boolean}
   */
  getThunderStrikeInput() {
    if (!this.controlsEnabled) {
      return false;
    }
    return Phaser.Input.Keyboard.JustDown(this.keys.c) || false;
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
      this.keys.aimDown.isDown
    );
  }
}
