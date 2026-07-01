/**
 * Manages NPC creation and interaction for PlayScene
 * Handles merchant placement and player interaction
 */
import { USER_SETTINGS } from "../../systems/UserSettings.js";

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
    
    return [
      // Swapped: boboMerchant (was sx+35) ↔ moneyMonster (was sx+5)
      // Swapped: gemPowerMerchant (was sx+39) ↔ campfire (was at sx+50, now at sx+39)
      // Campfire is now at gemPowerMerchant's old position (sx+39)
      // gemPowerMerchant is now at campfire's old position (sx+50)
      { assetKey: merchantSprites.moneyMonster,     merchantId: 'moneyMonster',     tx: sx + 35,     ty: ay         }, // was sx+5, now sx+35 (bobo's old spot)
      { assetKey: merchantSprites.playerUpgrades,   merchantId: 'playerUpgrades',   tx: sx + 15,      ty: ay         },
      { assetKey: merchantSprites.gearMerchant,     merchantId: 'gearMerchant',     tx: sx + 25,      ty: ay         },
      { assetKey: merchantSprites.boboMerchant,     merchantId: 'boboMerchant',     tx: sx + 5,       ty: ay         }, // was sx+35, now sx+5 (moneyMonster's old spot)
      { assetKey: merchantSprites.gemPowerMerchant, merchantId: 'gemPowerMerchant', tx: sx + 22,      ty: ay         }, // was sx+39, now at tile 50 (campfire's old spot)
    ];
  }

  createNPCs() {
    const npcSize = this.scene.config.playerDisplaySizePx;
    
    // Per-NPC ground offsets compensate for transparent bottom padding in the generated single sprites.
    const npcGroundOffsets = {
      'moneyMonster': 12,
      'playerUpgrades': 8,
      'gearMerchant': 9,
      'boboMerchant': 9,
      'gemPowerMerchant': 11,
    };
    
    for (const npc of this.npcDefs) {
      if (!this.scene.textures.exists(npc.assetKey)) {
        console.warn(`NPC texture not found: ${npc.assetKey} - skipping`);
        
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
      const sprite = this.scene.add.sprite(pos.x, pos.y, npc.assetKey);
      sprite.setOrigin(0.5, 1);                      // origin at bottom-center
      sprite.setDepth(15);

      // Generated single merchant sprites share one town scale so monsters feel creepy, not gigantic.
      const spriteSize = npcSize * 1.55;
      sprite.setDisplaySize(spriteSize, spriteSize);
      
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
    let nearestDistance = interactionRange;

    for (const npc of this.npcDefs) {
      const distance = Math.abs(playerTile.tx - npc.tx) + Math.abs(playerTile.ty - npc.ty);

      if (distance < nearestDistance) {
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
}
