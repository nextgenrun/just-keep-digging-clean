/**
 * Above-Ground Decoration System
 * Renders and manages decorative elements for the surface area
 * Uses configuration-based positioning for easy customization
 */

import { ABOVE_GROUND_CONFIG, tileToWorld } from "../../values/aboveGroundDecorations.js";

export class AboveGroundDecorationSystem {
  constructor(scene) {
    this.scene = scene;
    this.decorations = new Map();
    this.lights = new Map();
  }

  /**
   * Create all above-ground decorations
   */
  create() {
    const tileSize = this.scene.config.tileSize;
    const config = ABOVE_GROUND_CONFIG;

    for (const [decoName, decoConfig] of Object.entries(config.decorations)) {
      for (const pos of decoConfig.positions) {
        this.createDecoration(decoName, pos, decoConfig, tileSize);
      }
    }
  }

  /**
   * Create a single decoration at specified position
   */
  createDecoration(name, position, config, tileSize) {
    const spriteKey = config.sprite;

    if (!this.scene.textures.exists(spriteKey)) {
      console.warn(`[DecorationSystem] Sprite not found: ${spriteKey}`);
      return;
    }

    const worldPos = tileToWorld(position.x, position.y, tileSize);

    const sprite = this.scene.add.image(worldPos.x, worldPos.y, spriteKey);
    sprite.setScale(position.scale || 1);
    if (position.flip) {
      sprite.setFlipX(true);
    }

    const layerDepths = {
      'sky': -10,
      'townBackground': -5,
      'foreground': 5
    };
    sprite.setDepth(layerDepths[position.layer] || config.depth || 5);

    const key = `${name}_${position.x}_${position.y}`;
    this.decorations.set(key, { sprite, config, position, key });

    if (config.hasGlow) {
      this.createLight(worldPos.x, worldPos.y, config);
    }
  }

  /**
   * Create a glow/light effect for a decoration
   */
  createLight(x, y, config) {
    const light = this.scene.add.pointlight(
      x, y,
      config.glowColor || 0xFFFFFF,
      config.glowRadius || 100,
      0.5, 0.1
    );
    light.setDepth(config.depth + 1);
    this.lights.set(`light_${x}_${y}`, light);
  }

  /**
   * Update decorations (called every frame)
   */
  update() {
    for (const light of this.lights.values()) {
      if (Math.random() < 0.02) {
        light.intensity = 0.5 + Math.random() * 0.1;
      }
    }
  }

  /**
   * Clean up decorations
   */
  destroy() {
    for (const deco of this.decorations.values()) {
      if (deco.sprite) deco.sprite.destroy();
    }
    this.decorations.clear();

    for (const light of this.lights.values()) {
      if (light) light.destroy();
    }
    this.lights.clear();
  }

  getDecorationCount() {
    return this.decorations.size;
  }
}