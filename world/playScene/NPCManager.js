/**
 * Manages NPC creation and interaction for PlayScene
 * Handles merchant placement and player interaction
 */
import { USER_SETTINGS } from "../../systems/UserSettings.js";
import { NPCActivitySystem } from "../../systems/visual/NPCActivitySystem.js";
import { ARC_CORE_CONFIG } from "../../values/arcCoreConfig.js";
import {
  NPC_ACTIVITY_CONFIG,
  resolveNpcGroundContact,
} from "../../values/npcActivityConfig.js";
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
    this._availableMerchantIds = null;
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
  setMerchantAvailability(merchantIds = null) {
    this._availableMerchantIds = merchantIds
      ? new Set(merchantIds)
      : null;
    for (const [merchantId, sprite] of this.npcSprites.entries()) {
      sprite.setVisible(this._isMerchantAvailable(merchantId));
    }
    for (const prompt of this._interactPrompts) {
      if (!this._isMerchantAvailable(prompt.npc?.merchantId)) {
        prompt.text?.setVisible(false);
      }
    }
  }
  _isMerchantAvailable(merchantId) {
    return !this._availableMerchantIds
      || this._availableMerchantIds.has(merchantId);
  }


  createNPCs() {
    const npcSize = this.scene.config.playerDisplaySizePx;

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
      
      // Keep the measured sole/paw edge planted slightly into the platform lip.
      // The NPC definition occupies the air row; the tile below starts at (ty + 1).
      const ts = this.scene.config.tileSize;
      const spriteSize = npcSize * NPC_ACTIVITY_CONFIG.render.displayScale;
      const groundSurfaceY = (npc.ty + 1) * ts;
      const groundContact = resolveNpcGroundContact(
        npc.merchantId,
        spriteSize,
      );
      const pos = {
        x: npc.tx * ts + ts / 2,                    // tile center X
        y: groundSurfaceY + groundContact.anchorOffsetPx,
      };
      // Generated single merchant sprites share one town scale so monsters feel creepy, not gigantic.
      const sprite = hasIdleVideo
        ? this.scene.add.video(pos.x, pos.y, npc.videoKey)
        : this.scene.add.sprite(pos.x, pos.y, npc.assetKey);
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
        groundSurfaceY,
        groundContact,
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
      const merchantId = prompt.npc.merchantId;
      const rushPrompt = this.scene.randomEventBridge?.getMerchantPrompt?.(merchantId);
      if (!this._isMerchantAvailable(merchantId)) {
        prompt.text.setVisible(false);
        continue;
      }
      const label = rushPrompt
        ? `[${USER_SETTINGS.getKeyLabel("interact")}] ${rushPrompt}`
        : `[${USER_SETTINGS.getKeyLabel("interact")}] ${this._merchantNames[merchantId] || "Shop"}`;
      if (prompt.text.text !== label) prompt.text.setText(label);

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
      if (!this._isMerchantAvailable(npc.merchantId)) continue;
      const distance = Math.abs(playerTile.tx - npc.tx) + Math.abs(playerTile.ty - npc.ty);

      if (distance <= interactionRange && distance < nearestDistance) {
        nearestDistance = distance;
        nearestNPC = npc;
      }
    }

    if (nearestNPC && this.scene.interactKey && Phaser.Input.Keyboard.JustDown(this.scene.interactKey)) {
      const showShop = this.scene.shopOverlay?.show;
      if (typeof showShop !== "function") return false;
      const opened = this.scene.shopOverlay.show(nearestNPC.merchantId);
      if (opened === false) return false;
      this.activitySystem.settleMerchant(nearestNPC.merchantId);
      // Play NPC voice line before showing shop
      if (this.scene.soundSystem) {
        this.scene.soundSystem.playNPCVoiceLine(nearestNPC.merchantId);
      }
      return true;
    }
    return false;
  }

  getNearestInteractionDistance(playerTile) {
    if (!playerTile) return Number.POSITIVE_INFINITY;
    const range = TOWN_SQUARE_CONFIG.merchantInteractionRangeTiles;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const npc of this.npcDefs) {
      if (!this._isMerchantAvailable(npc.merchantId)) continue;
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

  getInteractionHealthSnapshot() {
    const expectedMerchantIds = [...TOWN_SQUARE_CONFIG.surfaceMerchantOrder];
    const definedMerchantIds = new Set(this.npcDefs.map(npc => npc.merchantId));
    const promptMerchantIds = new Set(
      this._interactPrompts
        .filter(prompt => Boolean(prompt.text))
        .map(prompt => prompt.npc?.merchantId),
    );
    const missingDefinitionIds = expectedMerchantIds.filter(
      merchantId => !definedMerchantIds.has(merchantId),
    );
    const missingPromptIds = expectedMerchantIds.filter(
      merchantId => !promptMerchantIds.has(merchantId),
    );
    const missingVisualIds = expectedMerchantIds.filter(
      merchantId => !this.npcSprites.has(merchantId),
    );
    const unavailableMerchantIds = expectedMerchantIds.filter(
      merchantId => !this._isMerchantAvailable(merchantId),
    );
    const boboDefined = definedMerchantIds.has("boboMerchant");
    const promptReady = promptMerchantIds.has("boboMerchant");
    const visualReady = this.npcSprites.has("boboMerchant");
    const shopReady = typeof this.scene.shopOverlay?.show === "function";
    const interactKeyReady = Boolean(this.scene.interactKey);
    return {
      ready: Boolean(
        shopReady
        && interactKeyReady
        && missingDefinitionIds.length === 0
        && missingPromptIds.length === 0
        && missingVisualIds.length === 0
        && unavailableMerchantIds.length === 0
      ),
      boboDefined,
      promptReady,
      visualReady,
      shopReady,
      interactKeyReady,
      merchantCount: expectedMerchantIds.length,
      expectedMerchantIds,
      missingDefinitionIds,
      missingPromptIds,
      missingVisualIds,
      unavailableMerchantIds,
    };
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

