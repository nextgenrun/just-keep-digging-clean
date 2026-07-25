/**
 * Manages NPC creation and interaction for PlayScene
 * Handles merchant placement and player interaction
 */
import { USER_SETTINGS } from "../../systems/UserSettings.js";
import { ARC_CORE_CONFIG } from "../../values/arcCoreConfig.js";

export class NPCManager {
  constructor(scene, ASSET_KEYS, decorationSystem = null) {
    this.scene = scene;
    this.ASSET_KEYS = ASSET_KEYS;
    this.npcDefs = this._getNPCDefs();
    this.npcSprites = new Map(); // Store NPC sprite references
    this.decorationSystem = decorationSystem; // Reference to decoration system for debug mode
    this._interactPrompts = []; // Array of "Press E" floating text objects
    
    // Merchant display names for the prompt
    this._merchantNames = {
      'moneyMonster': 'Money Monster',
      'magmaMoneyMonster': ARC_CORE_CONFIG.merchant.displayName,
      'playerUpgrades': 'Upgrades',
      'gearMerchant': 'Gear Merchant',
      'boboMerchant': "Bobo's Shop",
      'gemPowerMerchant': 'Gem Merchant'
    };
  }

  _getNPCDefs() {
    const sx = this.scene.config.spawnTileX;
    const ay = this.scene.config.topAirRows - 1;
    const merchantSprites = this.ASSET_KEYS.npcs.merchantSprites;
    const merchantIdleVideos = this.ASSET_KEYS.npcs.merchantIdleVideos;
    
    return [
      // Swapped: boboMerchant (was sx+35) ↔ moneyMonster (was sx+5)
      // Swapped: gemPowerMerchant (was sx+39) ↔ campfire (was at sx+50, now at sx+39)
      // Campfire is now at gemPowerMerchant's old position (sx+39)
      // gemPowerMerchant is now at campfire's old position (sx+50)
      { assetKey: merchantSprites.moneyMonster, videoKey: merchantIdleVideos.moneyMonster, merchantId: 'moneyMonster', tx: sx + 35, ty: ay },
      { assetKey: merchantSprites.magmaMoneyMonster, videoKey: null, merchantId: 'magmaMoneyMonster', tx: ARC_CORE_CONFIG.merchant.tileX, ty: ARC_CORE_CONFIG.merchant.tileY },
      { assetKey: merchantSprites.playerUpgrades, videoKey: merchantIdleVideos.playerUpgrades, merchantId: 'playerUpgrades', tx: sx + 15, ty: ay },
      { assetKey: merchantSprites.gearMerchant, videoKey: merchantIdleVideos.gearMerchant, merchantId: 'gearMerchant', tx: sx + 25, ty: ay },
      { assetKey: merchantSprites.boboMerchant, videoKey: merchantIdleVideos.boboMerchant, merchantId: 'boboMerchant', tx: sx + 5, ty: ay },
      { assetKey: merchantSprites.gemPowerMerchant, videoKey: merchantIdleVideos.gemPowerMerchant, merchantId: 'gemPowerMerchant', tx: sx + 22, ty: ay },
    ];
  }

  createNPCs() {
    const npcSize = this.scene.config.playerDisplaySizePx;
    
    // Per-NPC ground offsets compensate for transparent bottom padding in the generated single sprites.
    const npcGroundOffsets = {
      'moneyMonster': 12,
      'magmaMoneyMonster': 8,
      'playerUpgrades': 8,
      'gearMerchant': 9,
      'boboMerchant': 9,
      'gemPowerMerchant': 11,
    };
    
    for (const npc of this.npcDefs) {
      const hasIdleVideo = Boolean(npc.videoKey) && this.scene.cache.video.exists(npc.videoKey);
      const hasFallbackTexture = this.scene.textures.exists(npc.assetKey);
      if (!hasIdleVideo && !hasFallbackTexture) {
        console.warn(`NPC visual not found: ${npc.videoKey} / ${npc.assetKey} - skipping`);
        
        // Create placeholder sprite as fallback
        const pos = this.scene.worldModel.tileToWorld(npc.tx, npc.ty);
        const placeholder = this.scene.add.rectangle(pos.x, pos.y, npcSize, npcSize, 0x4a4a6a, 0.8);
        placeholder.setStrokeStyle(2, 0xff0000);
        placeholder.setDepth(15);
        
        // Add merchant ID text
        const label = this.scene.add.text(pos.x, pos.y, npc.merchantId, {
          fontFamily: 'Consolas, monospace',
          fontSize: '12px',
          color: '#ff0000',
          align: 'center'
        }).setOrigin(0.5).setDepth(16);
        
        continue;
      }
      
      // Place visual bottom at the top surface of the tile below (the ground/platform the NPC stands on).
      // NPCs are placed at ty = surfaceTileY - 1, so (ty+1)*tileSize is the platform surface.
      const ts = this.scene.config.tileSize;
      const groundOffset = npcGroundOffsets[npc.merchantId] ?? 10; // Default to +10px if not specified
      const pos = {
        x: npc.tx * ts + ts / 2,                    // tile center X
        y: (npc.ty + 1) * ts + groundOffset,       // platform surface + NPC-specific offset
      };
      // Generated single merchant sprites share one town scale so monsters feel creepy, not gigantic.
      const spriteSize = npcSize * 1.55;
      const sprite = hasIdleVideo
        ? this.scene.add.video(pos.x, pos.y, npc.videoKey)
        : this.scene.add.sprite(pos.x, pos.y, npc.assetKey);
      sprite.setOrigin(0.5, 1);
      sprite.setDepth(15);
      sprite.setDisplaySize(spriteSize, spriteSize);
      if (hasIdleVideo) {
        sprite.once('created', () => sprite.setDisplaySize(spriteSize, spriteSize));
        sprite.play(true);
      }
      
      // Store NPC sprite reference
      this.npcSprites.set(npc.merchantId, sprite);
      
      // Create "Press E" interact prompt above each NPC (hidden by default)
      const promptText = this.scene.add.text(pos.x, pos.y - spriteSize - 20,
        `[${USER_SETTINGS.getKeyLabel("interact")}] ${this._merchantNames[npc.merchantId] || 'Shop'}`, {
          fontFamily: 'Consolas, monospace',
          fontSize: '14px',
          color: '#AACCFF',
          stroke: '#000022',
          strokeThickness: 4,
          shadow: { offsetX: 0, offsetY: 0, color: '#4488FF', blur: 8, fill: true },
        }
      ).setOrigin(0.5, 1).setDepth(20).setVisible(false);
      this._interactPrompts.push({
        npc: npc,
        text: promptText,
        spriteHeight: spriteSize
      });
      
      // Register NPC with decoration system for debug mode
      if (this.decorationSystem) {
        this.decorationSystem.registerNPC(npc, sprite);
      }
    }
  }

  /**
   * Update interact prompt visibility based on player proximity to each NPC
   * Called from PlaySceneUpdate each frame
   */
  updateInteractPrompts(playerTile) {
    if (!playerTile || !this._interactPrompts) return;
    
    for (const prompt of this._interactPrompts) {
      const dist = Math.abs(playerTile.tx - prompt.npc.tx) + Math.abs(playerTile.ty - prompt.npc.ty);
      const inRange = dist <= 3;
      
      if (inRange && !prompt.text.visible) {
        prompt.text.setVisible(true);
        // Fade in with a subtle bounce
        prompt.text.setAlpha(0);
        this.scene.tweens.add({
          targets: prompt.text,
          alpha: 1,
          y: prompt.text.y + 8,
          duration: 200,
          ease: 'Power2.out',
          yoyo: true,
          hold: 100,
          onComplete: () => {
            prompt.text.y -= 8; // Reset position after animation
            prompt.text.setAlpha(1);
          }
        });
      } else if (!inRange && prompt.text.visible) {
        prompt.text.setVisible(false);
      }
    }
  }

  refreshInteractPromptLabels() {
    for (const prompt of this._interactPrompts) {
      prompt.text?.setText(`[${USER_SETTINGS.getKeyLabel("interact")}] ${this._merchantNames[prompt.npc.merchantId] || 'Shop'}`);
    }
  }

  checkNPCInteraction() {
    const playerTile = this.scene.playerController.state.getPlayerTile();
    const interactionRange = 3;

    let nearestNPC = null;
    let nearestDistance = interactionRange + 1;

    for (const npc of this.npcDefs) {
      const distance = Math.abs(playerTile.tx - npc.tx) + Math.abs(playerTile.ty - npc.ty);

      if (distance <= interactionRange && distance < nearestDistance) {
        nearestDistance = distance;
        nearestNPC = npc;
      }
    }

    if (nearestNPC && this.scene.interactKey && Phaser.Input.Keyboard.JustDown(this.scene.interactKey)) {
      // Play NPC voice line before showing shop
      if (this.scene.soundSystem) {
        this.scene.soundSystem.playNPCVoiceLine(nearestNPC.merchantId);
      }
      
      // Show shop overlay
      this.scene.shopOverlay.show(nearestNPC.merchantId);
    }
  }

  getNPCDefs() {
    return this.npcDefs;
  }
  
  /**
   * Get NPC sprite by merchant ID
   */
  getNPCSprite(merchantId) {
    return this.npcSprites.get(merchantId);
  }

  destroy() {
    for (const sprite of this.npcSprites.values()) {
      sprite.stop?.();
      sprite.destroy?.();
    }
    this.npcSprites.clear();
    for (const prompt of this._interactPrompts) {
      prompt.text?.destroy?.();
    }
    this._interactPrompts = [];
  }
}
