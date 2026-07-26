/**
 * Manages NPC creation and interaction for PlayScene
 * Handles merchant placement and player interaction
 */
import { USER_SETTINGS } from "../../systems/UserSettings.js";
import { NPCActivitySystem } from "../../systems/visual/NPCActivitySystem.js";
import { ARC_CORE_CONFIG } from "../../values/arcCoreConfig.js";
import { NPC_ACTIVITY_CONFIG } from "../../values/npcActivityConfig.js";
import { TOWN_SQUARE_CONFIG } from "../../values/townSquareConfig.js";

export class NPCManager {
  constructor(scene, ASSET_KEYS, decorationSystem = null) {
    this.scene = scene;
    this.ASSET_KEYS = ASSET_KEYS;
    this.npcDefs = this._getNPCDefs();
    this.npcSprites = new Map(); // Store NPC sprite references
    this.decorationSystem = decorationSystem; // Reference to decoration system for debug mode
    this._interactPrompts = []; // Array of "Press E" floating text objects
    this.activitySystem = new NPCActivitySystem(scene, ASSET_KEYS);
    
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
    const surfaceTileY = this.scene.config.topAirRows
      + TOWN_SQUARE_CONFIG.merchantSurfaceTileOffset;
    const merchantSprites = this.ASSET_KEYS.npcs.merchantSprites;
    const merchantIdleVideos = this.ASSET_KEYS.npcs.merchantIdleVideos;
    const merchantActivities = this.ASSET_KEYS.npcs.merchantActivities;

    const surfaceMerchants = TOWN_SQUARE_CONFIG.surfaceMerchantOrder.map((merchantId) => {
      const slot = TOWN_SQUARE_CONFIG.merchantSlots[merchantId];
      if (!slot) throw new Error(`[NPCManager] Missing Town Square slot: ${merchantId}`);
      return {
        assetKey: merchantSprites[merchantId],
        videoKey: merchantIdleVideos[merchantId],
        activityKeys: merchantActivities[merchantId],
        merchantId,
        tx: slot.tileX,
        ty: surfaceTileY,
      };
    });

    return [
      ...surfaceMerchants,
      {
        assetKey: merchantSprites.magmaMoneyMonster,
        videoKey: null,
        activityKeys: merchantActivities.magmaMoneyMonster,
        merchantId: 'magmaMoneyMonster',
        tx: ARC_CORE_CONFIG.merchant.tileX,
        ty: ARC_CORE_CONFIG.merchant.tileY,
      },
    ];
  }

  createNPCs() {
    const npcSize = this.scene.config.playerDisplaySizePx;
    
    for (const npc of this.npcDefs) {
      const hasIdleVideo = Boolean(npc.videoKey) && this.scene.cache.video.exists(npc.videoKey);
      const hasFallbackTexture = this.scene.textures.exists(npc.assetKey);
      const quietActivityKey = npc.activityKeys?.quiet;
      const hasActivityQuiet = this.activitySystem.enabled
        && Boolean(quietActivityKey)
        && this.scene.textures.exists(quietActivityKey);
      if (!hasIdleVideo && !hasFallbackTexture && !hasActivityQuiet) {
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
      const merchantPresentation = NPC_ACTIVITY_CONFIG.merchants[npc.merchantId];
      const groundOffset = merchantPresentation?.groundOffsetPx
        ?? NPC_ACTIVITY_CONFIG.render.defaultGroundOffsetPx;
      const pos = {
        x: npc.tx * ts + ts / 2,                    // tile center X
        y: (npc.ty + 1) * ts + groundOffset,       // platform surface + NPC-specific offset
      };
      // Generated single merchant sprites share one town scale so monsters feel creepy, not gigantic.
      const spriteSize = npcSize * NPC_ACTIVITY_CONFIG.render.displayScale;
      const fallbackTextureKey = hasActivityQuiet ? quietActivityKey : npc.assetKey;
      const sprite = hasIdleVideo
        ? this.scene.add.video(pos.x, pos.y, npc.videoKey)
        : this.scene.add.sprite(pos.x, pos.y, fallbackTextureKey);
      sprite.setOrigin(0.5, 1);
      sprite.setDepth(NPC_ACTIVITY_CONFIG.render.depth);
      sprite.setDisplaySize(spriteSize, spriteSize);
      if (hasIdleVideo) {
        sprite.once('created', () => sprite.setDisplaySize(spriteSize, spriteSize));
        sprite.play(true);
      }
      
      // Store NPC sprite reference
      this.npcSprites.set(npc.merchantId, sprite);
      this.activitySystem.registerNPC(npc, sprite, {
        ...pos,
        displaySize: spriteSize,
        depth: NPC_ACTIVITY_CONFIG.render.depth,
      });
      
      // Create "Press E" interact prompt above each NPC (hidden by default)
      const promptText = this.scene.add.text(
        pos.x,
        pos.y - spriteSize - NPC_ACTIVITY_CONFIG.render.promptGapPx,
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
  updateInteractPrompts(playerTile, competingDistance = Number.POSITIVE_INFINITY) {
    if (!playerTile || !this._interactPrompts) return;
    
    for (const prompt of this._interactPrompts) {
      const dist = Math.abs(playerTile.tx - prompt.npc.tx) + Math.abs(playerTile.ty - prompt.npc.ty);
      const inRange = dist <= TOWN_SQUARE_CONFIG.merchantInteractionRangeTiles
        && dist <= competingDistance;
      
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

  updateActivities(time, delta, playerTile) {
    this.activitySystem.update(time, delta, playerTile);
  }

  refreshInteractPromptLabels() {
    for (const prompt of this._interactPrompts) {
      prompt.text?.setText(`[${USER_SETTINGS.getKeyLabel("interact")}] ${this._merchantNames[prompt.npc.merchantId] || 'Shop'}`);
    }
  }

  checkNPCInteraction() {
    const playerTile = this.scene.playerController.state.getPlayerTile();
    const interactionRange = TOWN_SQUARE_CONFIG.merchantInteractionRangeTiles;

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
      this.activitySystem.settleMerchant(nearestNPC.merchantId);
      // Play NPC voice line before showing shop
      if (this.scene.soundSystem) {
        this.scene.soundSystem.playNPCVoiceLine(nearestNPC.merchantId);
      }
      
      // Show shop overlay
      this.scene.shopOverlay.show(nearestNPC.merchantId);
    }
  }

  getNearestInteractionDistance(playerTile) {
    if (!playerTile) return Number.POSITIVE_INFINITY;
    const range = TOWN_SQUARE_CONFIG.merchantInteractionRangeTiles;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const npc of this.npcDefs) {
      const distance = Math.abs(playerTile.tx - npc.tx) + Math.abs(playerTile.ty - npc.ty);
      if (distance <= range && distance < nearestDistance) nearestDistance = distance;
    }
    return nearestDistance;
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

  getActivityHealthSnapshot() {
    return this.activitySystem.getHealthSnapshot();
  }

  destroy() {
    this.activitySystem.destroy();
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
