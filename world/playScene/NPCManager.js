/**
 * Manages NPC creation and interaction for PlayScene
 * Handles merchant placement and player interaction
 */
import { SurfaceMiaCompanion } from "./SurfaceMiaCompanion.js";
import { MerchantPromptView } from "../../systems/visual/MerchantPromptView.js";
import { NPCActivitySystem } from "../../systems/visual/NPCActivitySystem.js";
import { MerchantShopEntrance } from "../../systems/visual/MerchantShopEntrance.js";
import { MerchantMotionSystem } from "../../systems/visual/MerchantMotionSystem.js";
import { ARC_CORE_CONFIG } from "../../values/arcCoreConfig.js";
import {
  NPC_ACTIVITY_CONFIG,
  resolveNpcGroundContact,
} from "../../values/npcActivityConfig.js";
import { TOWN_SQUARE_CONFIG } from "../../values/townSquareConfig.js";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "../../values/gameplayDevFlags.js";

export class NPCManager {
  constructor(scene, ASSET_KEYS, decorationSystem = null) {
    this.scene = scene;
    this.ASSET_KEYS = ASSET_KEYS;
    this.npcDefs = this._getNPCDefs();
    this.mia = new SurfaceMiaCompanion(scene, this);
    this.npcSprites = new Map(); // Store NPC sprite references
    this.decorationSystem = decorationSystem; // Reference to decoration system for debug mode
    this._interactPrompts = []; // Array of "Press E" floating text objects
    this.activitySystem = new NPCActivitySystem(scene, ASSET_KEYS);
    this.motionSystem = new MerchantMotionSystem(scene);
    this.activityTimeMs = 0;
    this.shopEntrance = new MerchantShopEntrance(this);
    
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

    if (!isGameplayFeatureEnabled(
      GAMEPLAY_FEATURE_IDS.LEVEL_TWO,
      this.scene.gameplayCapabilities,
    )) {
      return surfaceMerchants;
    }

    return [...surfaceMerchants, {
      assetKey: merchantSprites.magmaMoneyMonster,
      videoKey: null,
      activityKeys: merchantActivities.magmaMoneyMonster,
      merchantId: 'magmaMoneyMonster',
      tx: ARC_CORE_CONFIG.merchant.tileX,
      ty: ARC_CORE_CONFIG.merchant.tileY,
    }];
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
        prompt.view.update(false);
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
      const motion = hasFallbackTexture ? this.motionSystem.create(npc) : null;
      const useIdleVideo = hasIdleVideo && !motion;
      const sprite = useIdleVideo
        ? this.scene.add.video(pos.x, pos.y, npc.videoKey)
        : this.scene.add.sprite(pos.x, pos.y, motion?.textureKey || npc.assetKey, motion?.frameName);
      sprite.setOrigin(0.5, 1);
      sprite.setDepth(NPC_ACTIVITY_CONFIG.render.depth);
      sprite.setDisplaySize(spriteSize, spriteSize);
      if (useIdleVideo) {
        sprite.once('created', () => sprite.setDisplaySize(spriteSize, spriteSize));
        sprite.play(true);
      }
      
      // Store NPC sprite reference
      this.npcSprites.set(npc.merchantId, sprite);
      this.motionSystem.attach(npc.merchantId, sprite);
      this.activitySystem.registerNPC(npc, sprite, {
        ...pos,
        displaySize: spriteSize,
        motion: motion?.playback,
        depth: NPC_ACTIVITY_CONFIG.render.depth,
        groundSurfaceY,
        groundContact,
      });

      const baseY = pos.y - spriteSize + groundContact.visibleTopInsetPx
        - NPC_ACTIVITY_CONFIG.render.promptGapPx;
      const view = new MerchantPromptView(this.scene, npc.merchantId,
        this._merchantNames[npc.merchantId], pos.x, baseY);
      this._interactPrompts.push({
        npc, view, text: view.root, worldX: pos.x, spriteHeight: spriteSize, baseY,
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
    if (!this._interactPrompts) return;
    competingDistance = Math.min(competingDistance,
      this.scene.townRestSystem?.getInteractionDistance?.() ?? Infinity);
    // Match the same nearest merchant and tie order used when E opens a shop.
    let nearest = null;
    let nearestDistance = TOWN_SQUARE_CONFIG.merchantInteractionRangeTiles + 1;
    for (const prompt of this._interactPrompts) {
      if (!playerTile || !this._isMerchantAvailable(prompt.npc.merchantId)) continue;
      const distance = Math.abs(playerTile.tx - prompt.npc.tx)
        + Math.abs(playerTile.ty - prompt.npc.ty);
      if (distance < nearestDistance && distance <= competingDistance) {
        nearest = prompt;
        nearestDistance = distance;
      }
    }
    for (const prompt of this._interactPrompts) {
      prompt.view.update(prompt === nearest,
        this.scene.randomEventBridge?.getMerchantPrompt?.(prompt.npc.merchantId));
    }
  }

  updateActivities(_time, delta, playerTile) {
    if (globalThis.document?.hidden) return;
    const step = Math.min(Math.max(delta || 0, 0), NPC_ACTIVITY_CONFIG.performance.maxDeltaMs);
    this.activityTimeMs += step;
    this.activitySystem.update(this.activityTimeMs, step, playerTile);
    this.motionSystem.update(step);
    this.shopEntrance?.update(step);
    this.mia.update(playerTile);
  }

  refreshInteractPromptLabels() {
    for (const prompt of this._interactPrompts) {
      prompt.view.update(prompt.view.inRange,
        this.scene.randomEventBridge?.getMerchantPrompt?.(prompt.npc.merchantId));
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

    const interactPressed = nearestNPC && (
      typeof this.scene.inputHandler?.consumeSpecialTileInteractInput === "function"
        ? this.scene.inputHandler.consumeSpecialTileInteractInput()
        : this.scene.interactKey && Phaser.Input.Keyboard.JustDown(this.scene.interactKey)
    );
    if (interactPressed) {
      const shopOverlay = this.scene.shopOverlay;
      if (typeof shopOverlay?.show !== "function" || shopOverlay.isOperational?.() !== true) return false;
      if (this.shopEntrance) return this.shopEntrance.request(nearestNPC);
      const opened = shopOverlay.show(nearestNPC.merchantId);
      if (opened !== true) return false;
      this.activitySystem.settleMerchant(nearestNPC.merchantId, this.activityTimeMs);
      // The shared voice director applies the 35% roll, cooldown, and busy drop.
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

  getNPCPromptAnchor(merchantId) {
    const prompt = this._interactPrompts.find(
      entry => entry.npc?.merchantId === merchantId,
    );
    if (!prompt) return null;
    return { x: prompt.worldX, y: prompt.baseY };
  }

  getActivityHealthSnapshot() {
    return { ...this.activitySystem.getHealthSnapshot(), motion: this.motionSystem?.getHealthSnapshot(), shopEntrance: this.shopEntrance?.getSnapshot() };
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
    const shopReady = this.scene.shopOverlay?.isOperational?.() === true;
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
    this.mia.destroy();
    this.shopEntrance?.destroy();
    this.activitySystem.destroy();
    this.motionSystem.destroy();
    for (const sprite of this.npcSprites.values()) {
      sprite.stop?.();
      sprite.destroy?.();
    }
    this.npcSprites.clear();
    for (const prompt of this._interactPrompts) {
      prompt.view.destroy();
    }
    this._interactPrompts = [];
  }
}
