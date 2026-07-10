/**
 * StarPillarSystem
 *
 * Renders a magical stone pillar at the sky island. The pillar displays:
 *   - 10 star slots (one per resource constellation, lights up when unlocked)
 *   - 6 rarity-tier badges on the opposite face
 *
 * Press E near the pillar to open the full zoom-out STAR CHART view, which shows
 * all 10 constellation positions in the sky arc above the island. Locked ones appear
 * as dim "???" outlines; unlocked ones glow in their resource colour with named labels.
 *
 * Press E again (or ESC) to smoothly return to normal play.
 */

import { CONSTELLATION_BUFFS } from "../../values/constellationBuffs.js";
import { USER_SETTINGS } from "../UserSettings.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { STAR_CONSTELLATION_CONFIG } from "../../values/starConstellations.js";
import { UI_COLORS } from "../../values/uiColors.js";

// ─── Module-level constants ───────────────────────────────────────────────────

const RARITY_BADGES = [
  { color: 0x87CEEB, cssColor: '#87CEEB', label: '★',    name: 'Common'    },
  { color: 0xCC44FF, cssColor: '#CC44FF', label: '★★',   name: 'Rare'      },
  { color: 0xFFD700, cssColor: '#FFD700', label: '★★★',  name: 'Legendary' },
  { color: 0xFF4422, cssColor: '#FF4422', label: '✦',    name: 'Ancient'   },
  { color: 0x00FFEE, cssColor: '#00FFEE', label: '✦✦',   name: 'Cosmic'    },
  { color: 0x9900FF, cssColor: '#9900FF', label: '✦✦✦',  name: 'Void'      },
];

// Resource slot order — matches CONSTELLATION_DEFS order in FloatingTextSystem
const PILLAR_SLOT_ORDER = [
  'dirt', 'stone', 'copper', 'darkDirtNormal', 'steel',
  'iron', 'bronze', 'darkDirtStrong', 'silver', 'gold',
];

// Colours matching CONSTELLATION_LINE_COLORS in FloatingTextSystem
const RESOURCE_LINE_COLORS = {
  dirt:           0xA0784A,
  stone:          0x888888,
  copper:         0xFF7700,
  darkDirtNormal: 0x5544AA,
  darkDirtStrong: 0x663322,
  bronze:         0xCC8800,
  steel:          0x778899,
  iron:           0x8899AA,
  silver:         0xCCDDEE,
  gold:           0xFFD700,
};

const RESOURCE_CSS_COLORS = {
  dirt:           '#A0784A',
  stone:          '#888888',
  copper:         '#FF7700',
  darkDirtNormal: '#5544AA',
  darkDirtStrong: '#663322',
  bronze:         '#CC8800',
  steel:          '#778899',
  iron:           '#8899AA',
  silver:         '#CCDDEE',
  gold:           '#FFD700',
};

const RESOURCE_DISPLAY_NAMES = {
  dirt:           'The Shovel',
  stone:          'The Mountain',
  copper:         'The Anvil',
  darkDirtNormal: 'The Cave',
  darkDirtStrong: 'The Fortress',
  steel:          'The Sword',
  iron:           'The Hammer',
  bronze:         'The Shield',
  silver:         'The Crescent',
  gold:           'The Crown',
};

const RESOURCE_TILE_DISPLAY_NAMES = {
  dirt:           'Dirt',
  stone:          'Stone',
  copper:         'Copper',
  darkDirtNormal: 'Dark Dirt',
  darkDirtStrong: 'Hard Dirt',
  steel:          'Steel',
  iron:           'Iron',
  bronze:         'Bronze',
  silver:         'Silver',
  gold:           'Gold',
};

// Target zoom for the star chart view
const CHART_ZOOM = 0.14;
const STAR_CHART_GRID_COLUMNS = 3;

// ─────────────────────────────────────────────────────────────────────────────

export class StarPillarSystem {
  constructor(scene, config, floatingTextSystem) {
    this.scene  = scene;
    this.config = config;
    this.fts    = floatingTextSystem;

    // Pillar world coords (computed in create())
    this._pillarCenterX = 0;
    this._pillarBaseY   = 0;

    // Visual objects
    this._pillarGfx    = null;   // main stone pillar graphics
    this._runeTexts    = [];     // 3 rune text objects
    this._slots        = [];     // 10 slot circle GameObjects
    this._badges       = [];     // 6 rarity badge circle GameObjects
    this._badgeLabels  = [];     // 6 badge label texts
    this._pillarLabel  = null;   // "✦ Star Pillar ✦" text
    this._ePrompt      = null;   // "Press E" world-space prompt

    // Star chart view state
    this._isViewOpen   = false;
    this._viewObjects  = [];     // all GOs created for the chart (destroyed on close)
    this._overlay      = null;   // dark bg overlay
    this._chartTitle   = null;   // fixed-screen "STAR CHART" text
    this._chartHint    = null;   // fixed-screen "Press E to close" text
    this._zoomTween    = null;
    this._chartViewport = null;
    this._chartUiObjects = [];
    this._selectedConstellationIndex = -1;
    this._isChartUiReady = false;

    // Camera saved state
    this._origZoom     = 1;
    this._origScrollX  = 0;
    this._origScrollY  = 0;

    // Proximity & dirty-flag
    this._playerInRange     = false;
    this._lastUnlockedCount = -1;
    this._lastRaritySig     = '';
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Called once from PlaySceneSetup after the world is created. */
  create() {
    const ts = this.config.tileSize;
    this._pillarCenterX = this.config.starPillarTileX * ts + ts / 2;
    this._pillarBaseY   = (this.config.starPillarTileY + 1) * ts; // bottom of tile row 34

    this._buildPillarVisual();
    this._buildEPrompt();

    // Restore already-unlocked constellations/stars from localStorage, then sync
    // pillar slots and rarity badges.
    this.fts.ensureConstellationsLoaded?.();
    const initialUnlocked = this.fts.getUnlockedConstellations();
    this._refreshPillarSlots(true, initialUnlocked);
    this._lastUnlockedCount = initialUnlocked.length;
    this._refreshRarityBadges(true);
  }

  /**
   * Called every frame from PlaySceneUpdate._updateSystems().
   * Handles proximity, rune animation, slot refresh, and E-key detection.
   */
  update(time, delta, playerTile, keys) {
    if (!playerTile) return;

    if (this._isViewOpen) {
      this._handleChartInput(keys);
    }

    // ── Proximity check ──
    const dx = Math.abs(playerTile.tx - this.config.starPillarTileX);
    const dy = Math.abs(playerTile.ty - this.config.starPillarTileY);
    this._playerInRange = dx <= this.config.starPillarProximityTiles &&
                          dy <= (this.config.starPillarProximityTiles + 2);

    // ── E prompt visibility ──
    if (this._ePrompt) {
      this._ePrompt.setVisible(this._playerInRange && !this._isViewOpen);
    }

    // ── Rune twinkle ──
    const runeAlpha = Math.sin(time / 800) * 0.2 + 0.8;
    for (const r of this._runeTexts) {
      if (r && r.active) r.setAlpha(runeAlpha);
    }

    // ── Pillar slot dirty-check ──
    const unlocked = this.fts.getUnlockedConstellations();
    if (unlocked.length !== this._lastUnlockedCount) {
      this._refreshPillarSlots(false, unlocked);
      this._lastUnlockedCount = unlocked.length;
    }

    const rarityCounts = this.fts.getStarRarityCounts?.() || [];
    const raritySig = rarityCounts.join(',');
    if (raritySig !== this._lastRaritySig) {
      this._refreshRarityBadges(false, rarityCounts);
      this._lastRaritySig = raritySig;
    }

    // NOTE: E key is handled by GameInputHandler + PlaySceneUpdate
    // (see handlePlayingStateInput and _updatePlayingState).
    // This method only updates proximity, rune animation, and slot dirty-check.
  }

  _handleChartInput(keys) {
    if (!this._isChartUiReady || !keys || !Phaser.Input?.Keyboard) return;
    const justDown = (key) => key && Phaser.Input.Keyboard.JustDown(key);

    if (justDown(keys.interact) || justDown(keys.enter)) {
      this.closeConstellationView();
      return;
    }

    let delta = 0;
    if (justDown(keys.moveLeft) || justDown(keys.aimLeft)) delta = -1;
    else if (justDown(keys.moveRight) || justDown(keys.aimRight)) delta = 1;
    else if (justDown(keys.moveUp) || justDown(keys.aimUp)) delta = -STAR_CHART_GRID_COLUMNS;
    else if (justDown(keys.moveDown) || justDown(keys.aimDown)) delta = STAR_CHART_GRID_COLUMNS;

    if (delta === 0) return;
    this._selectConstellationIndex(this._selectedConstellationIndex + delta, true);
  }

  _selectConstellationIndex(index, playSound = false) {
    const maxIndex = PILLAR_SLOT_ORDER.length - 1;
    const nextIndex = Phaser.Math.Clamp(index, 0, maxIndex);
    if (nextIndex === this._selectedConstellationIndex) return false;

    this._selectedConstellationIndex = nextIndex;
    if (playSound) this.scene.soundSystem?.playUiSelect?.();
    this._rebuildStarChartUi(true);
    return true;
  }

  /**
   * Called from PlaySceneUpdate before the special-tile E handler.
   * Returns true if the E key was consumed.
   */
  handleInteract() {
    if (this._isViewOpen) {
      this.closeConstellationView();
      return true;
    }
    if (this._playerInRange) {
      this.openConstellationView();
      return true;
    }
    return false;
  }

  /** Called by FloatingTextSystem callback when a new constellation unlocks. */
  onConstellationUnlocked(resourceType) {
    const idx = PILLAR_SLOT_ORDER.indexOf(resourceType);
    if (idx === -1) return;

    const slot = this._slots[idx];
    if (!slot || !slot.active) return;

    const color    = RESOURCE_LINE_COLORS[resourceType] || 0x87CEEB;
    const cssColor = RESOURCE_CSS_COLORS[resourceType]  || '#87CEEB';

    // Destroy old slot and recreate in resource colour
    const x = slot.x;
    const y = slot.y;
    slot.destroy();
    const newSlot = this.scene.add.circle(x, y, 9, color, 1);
    newSlot.setDepth(13);
    this._slots[idx] = newSlot;

    // Bounce-scale pop on the slot
    this.scene.tweens.add({
      targets: newSlot,
      scaleX: { from: 1, to: 2.2 },
      scaleY: { from: 1, to: 2.2 },
      duration: 350,
      ease: 'Back.out',
      yoyo: true,
    });

    // ── Light beam shooting up from pillar cap ──────────────────────────────
    const cx = this._pillarCenterX;
    const by = this._pillarBaseY;
    const shaftH = 360;
    const capH   = 28;
    const baseH  = 18;
    const capTopY = by - baseH - shaftH - capH;

    // Tall narrow beam rising from pillar
    const beamH = 900;
    const beam  = this.scene.add.rectangle(cx, capTopY - beamH / 2, 8, beamH, color, 0.75);
    beam.setDepth(11);
    beam.setAlpha(0);
    this.scene.tweens.add({
      targets: beam,
      alpha: { from: 0, to: 0.75 },
      duration: 200,
      onComplete: () => {
        this.scene.tweens.add({
          targets: beam,
          scaleX: 14,
          alpha: 0,
          duration: 1400,
          ease: 'Power2.out',
          onComplete: () => beam.destroy(),
        });
      },
    });

    // Glow halo around pillar cap
    const halo = this.scene.add.ellipse(cx, capTopY, 200, 50, color, 0.22);
    halo.setDepth(11);
    this.scene.tweens.add({
      targets: halo, scaleX: 4, scaleY: 3, alpha: 0,
      duration: 1200, ease: 'Power3.out',
      onComplete: () => halo.destroy(),
    });

    // Pillar label flash
    if (this._pillarLabel) {
      this.scene.tweens.add({
        targets: this._pillarLabel,
        alpha: { from: 1, to: 0.2 },
        duration: 180, yoyo: true, repeat: 3,
      });
    }

    this._refreshRarityBadges(false);

    if (this.scene.soundSystem?.playUiConfirm) {
      this.scene.soundSystem.playUiConfirm();
    }
  }

  /** Clean up all created objects (called on scene shutdown). */
  destroy() {
    this._pillarGfx?.destroy();
    this._runeTexts.forEach(r => r?.destroy());
    this._slots.forEach(s => s?.destroy());
    this._badges.forEach(b => b?.destroy());
    this._badgeLabels.forEach(l => l?.destroy());
    this._pillarLabel?.destroy();
    this._ePrompt?.destroy();
    this._viewObjects.forEach(o => o?.destroy());
    this._chartUiObjects = [];
    this._overlay?.destroy();
    this._chartTitle?.destroy();
    this._chartHint?.destroy();
    this._zoomTween?.stop();
  }

  // ── Pillar visual ──────────────────────────────────────────────────────────

  _buildPillarVisual() {
    const cx = this._pillarCenterX;
    const by = this._pillarBaseY;
    const gfx = this.scene.add.graphics();
    gfx.setDepth(12);
    this._pillarGfx = gfx;

    const shaftW  = 160;
    const shaftH  = 360;
    const capW    = 180;
    const capH    = 28;
    const baseW   = 190;
    const baseH   = 18;

    // Base slab
    gfx.fillStyle(0x1A1A2E, 1);
    gfx.fillRect(cx - baseW / 2, by - baseH, baseW, baseH);
    gfx.lineStyle(2, 0x3344AA, 0.6);
    gfx.strokeRect(cx - baseW / 2, by - baseH, baseW, baseH);

    // Stone shaft — dark stone with subtle highlight on right edge
    gfx.fillStyle(0x222233, 1);
    gfx.fillRect(cx - shaftW / 2, by - baseH - shaftH, shaftW, shaftH);

    // Shaft bevel (lighter left edge, darker right)
    gfx.fillStyle(0x334455, 0.4);
    gfx.fillRect(cx - shaftW / 2, by - baseH - shaftH, 10, shaftH);
    gfx.fillStyle(0x000011, 0.35);
    gfx.fillRect(cx + shaftW / 2 - 10, by - baseH - shaftH, 10, shaftH);

    // Horizontal detail bands
    gfx.lineStyle(1, 0x445566, 0.5);
    for (let i = 1; i <= 4; i++) {
      const bandY = by - baseH - (shaftH * i / 5);
      gfx.lineBetween(cx - shaftW / 2 + 4, bandY, cx + shaftW / 2 - 4, bandY);
    }

    // Cap
    gfx.fillStyle(0x2A2A44, 1);
    gfx.fillRect(cx - capW / 2, by - baseH - shaftH - capH, capW, capH);
    gfx.lineStyle(2, 0x6677BB, 0.7);
    gfx.strokeRect(cx - capW / 2, by - baseH - shaftH - capH, capW, capH);

    // Central glowing line running up the shaft
    gfx.lineStyle(2, 0x4466CC, 0.35);
    gfx.lineBetween(cx, by - baseH - 10, cx, by - baseH - shaftH + 10);

    // Pillar label
    this._pillarLabel = this.scene.add.text(cx, by - baseH - shaftH - capH - 18, '✦  Star Pillar  ✦', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '18px',
      color: '#AABBEE',
      stroke: '#000022',
      strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 0, color: '#4466FF', blur: 10, fill: true },
    }).setOrigin(0.5, 1).setDepth(14);

    // ── 3 Rune glyphs centered on shaft ──
    const runeSymbols = ['⬡', '✦', '⊕'];
    const runeYOffsets = [-shaftH * 0.75, -shaftH * 0.5, -shaftH * 0.28];
    for (let i = 0; i < 3; i++) {
      const r = this.scene.add.text(cx, by - baseH + runeYOffsets[i], runeSymbols[i], {
        fontFamily: 'Segoe UI Symbol, sans-serif',
        fontSize: '22px',
        color: '#8899BB',
        stroke: '#000022',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(14);
      this._runeTexts.push(r);
    }

    // ── 10 Constellation star slots (right face of pillar) ──
    const slotX    = cx + shaftW / 2 + 22;
    const slotTopY = by - baseH - shaftH + 20;
    const slotStep = (shaftH - 40) / 9;

    for (let i = 0; i < 10; i++) {
      const sy = slotTopY + i * slotStep;
      // Slot background circle (dim, locked state)
      const slot = this.scene.add.circle(slotX, sy, 9, 0x222244, 1);
      slot.setDepth(13);
      // Dim outline ring using graphics
      gfx.lineStyle(1, 0x334466, 0.7);
      gfx.strokeCircle(slotX, sy, 11);
      this._slots.push(slot);
    }

    // ── 6 Rarity badge circles (left face of pillar) ──
    const badgeX    = cx - shaftW / 2 - 24;
    const badgeTopY = by - baseH - shaftH + 30;
    const badgeStep = (shaftH - 40) / 5;

    for (let i = 0; i < 6; i++) {
      const badgeY = badgeTopY + i * badgeStep;
      const badgeDef = RARITY_BADGES[i];

      // Badge circle (dim until earned)
      const badge = this.scene.add.circle(badgeX, badgeY, 14, badgeDef.color, 0.2);
      badge.setDepth(13);
      this._badges.push(badge);

      // Badge outline
      gfx.lineStyle(1, badgeDef.color, 0.5);
      gfx.strokeCircle(badgeX, badgeY, 15);

      // Badge label
      const bl = this.scene.add.text(badgeX, badgeY, badgeDef.label, {
        fontFamily: 'Segoe UI Symbol, sans-serif',
        fontSize: '11px',
        color: badgeDef.cssColor,
        alpha: 0.4,
      }).setOrigin(0.5).setDepth(14);
      this._badgeLabels.push(bl);
    }
  }

  _buildEPrompt() {
    const cx = this._pillarCenterX;
    const by = this._pillarBaseY;
    this._ePrompt = this.scene.add.text(cx, by - 420, `[${USER_SETTINGS.getKeyLabel("interact")}] View Star Chart`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '16px',
      color: '#AACCFF',
      stroke: '#000022',
      strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 0, color: '#4488FF', blur: 8, fill: true },
    }).setOrigin(0.5, 1).setDepth(20).setVisible(false);
  }

  refreshInteractPromptLabels() {
    this._ePrompt?.setText(`[${USER_SETTINGS.getKeyLabel("interact")}] View Star Chart`);
    this._chartHint?.setText(this._getChartHintText());
  }

  _getChartHintText() {
    const left = USER_SETTINGS.getKeyLabel("moveLeft");
    const right = USER_SETTINGS.getKeyLabel("moveRight");
    const up = USER_SETTINGS.getKeyLabel("aimUp");
    const down = USER_SETTINGS.getKeyLabel("aimDown");
    const interact = USER_SETTINGS.getKeyLabel("interact");
    return `${left}/${right}/${up}/${down} or arrows: select sign   ${interact}/Enter: close`;
  }

  _refreshPillarSlots(init = false, unlocked = null) {
    if (!unlocked) unlocked = this.fts.getUnlockedConstellations();

    for (let i = 0; i < PILLAR_SLOT_ORDER.length; i++) {
      const resourceType = PILLAR_SLOT_ORDER[i];
      const isUnlocked = unlocked.includes(resourceType);
      const slot = this._slots[i];
      if (!slot || !slot.active) continue;

      if (isUnlocked) {
        const color = RESOURCE_LINE_COLORS[resourceType] || 0x87CEEB;
        // Rebuild slot in resource colour
        const x = slot.x;
        const y = slot.y;
        slot.destroy();
        const newSlot = this.scene.add.circle(x, y, 9, color, 1);
        newSlot.setDepth(13);
        this._slots[i] = newSlot;

        if (!init) {
          this.scene.tweens.add({
            targets: newSlot,
            scaleX: { from: 1, to: 1.6 },
            scaleY: { from: 1, to: 1.6 },
            duration: 250, ease: 'Back.out', yoyo: true,
          });
        }
      }
    }
  }

  _refreshRarityBadges(init = false, counts = null) {
    const rarityCounts = counts || this.fts.getStarRarityCounts?.() || [];
    this._lastRaritySig = rarityCounts.join(',');

    for (let i = 0; i < RARITY_BADGES.length; i++) {
      const badge = this._badges[i];
      const label = this._badgeLabels[i];
      const def = RARITY_BADGES[i];
      if (!badge || !badge.active) continue;

      const collected = rarityCounts[i] || 0;
      const earned = collected > 0;
      const wasEarned = !!badge._earned;
      badge._earned = earned;
      badge.setFillStyle(def.color, earned ? 0.88 : 0.2);
      badge.setAlpha(earned ? 1 : 0.75);

      if (label && label.active) {
        label.setAlpha(earned ? 1 : 0.4);
        label.setText(earned && collected > 1 ? `${def.label}` : def.label);
      }

      if (!init && earned && !wasEarned) {
        this.scene.tweens.add({
          targets: [badge, label].filter(Boolean),
          scaleX: { from: 1, to: 1.65 },
          scaleY: { from: 1, to: 1.65 },
          duration: 260,
          ease: 'Back.out',
          yoyo: true,
        });
      }
    }
  }

  _getChartCenterWorld() {
    const anchor = this.fts.getConstellationSkyAnchor?.();
    if (anchor) {
      return {
        x: anchor.x,
        y: anchor.y - 560,
      };
    }

    const ts = this.config.tileSize;
    return {
      x: this.config.starPillarTileX * ts + ts / 2,
      y: (this.config.starPillarTileY + 1) * ts - 560,
    };
  }

  _setChartViewport(scrollX, scrollY, width, height) {
    this._chartViewport = {
      scrollX,
      scrollY,
      width,
      height,
      scale: 1 / CHART_ZOOM,
    };
  }

  _chartUiSize(value) {
    const scale = this._chartViewport?.scale || (1 / CHART_ZOOM);
    return value * scale;
  }

  _chartUiPoint(screenX, screenY) {
    const viewport = this._chartViewport;
    if (!viewport) {
      const cam = this.scene.cameras.main;
      return { x: cam.scrollX + screenX / cam.zoom, y: cam.scrollY + screenY / cam.zoom };
    }

    return {
      x: viewport.scrollX + this._chartUiSize(screenX),
      y: viewport.scrollY + this._chartUiSize(screenY),
    };
  }

  _chartFontSize(px) {
    return `${this._chartUiSize(px)}px`;
  }

  _chartTextStyle(style) {
    return {
      ...style,
      fontSize: typeof style.fontSize === 'number'
        ? this._chartFontSize(style.fontSize)
        : style.fontSize,
      strokeThickness: typeof style.strokeThickness === 'number'
        ? this._chartUiSize(style.strokeThickness)
        : style.strokeThickness,
      shadow: style.shadow
        ? {
            ...style.shadow,
            offsetX: this._chartUiSize(style.shadow.offsetX || 0),
            offsetY: this._chartUiSize(style.shadow.offsetY || 0),
            blur: this._chartUiSize(style.shadow.blur || 0),
          }
        : undefined,
    };
  }

  // ── Star Chart zoom view ───────────────────────────────────────────────────

  openConstellationView() {
    if (this._isViewOpen) return;
    if (this._zoomTween && this._zoomTween.isPlaying()) return;

    this._isViewOpen = true;
    this._isChartUiReady = false;
    this._chartUiObjects = [];
    this._selectedConstellationIndex = -1;
    this.scene._pillarViewActive = true;

    const cam = this.scene.cameras.main;
    this._origZoom    = cam.zoom;
    this._origScrollX = cam.scrollX;
    this._origScrollY = cam.scrollY;

    cam.stopFollow();

    // Compute chart center in world space from the Star Pillar anchor.
    const chartCenter = this._getChartCenterWorld();
    const chartCenterX = chartCenter.x;
    const chartCenterY = chartCenter.y;

    const vw = this.config.viewportWidth;
    const vh = this.config.viewportHeight;
    const targetScrollX = Phaser.Math.Clamp(
      chartCenterX - vw / (2 * CHART_ZOOM),
      0,
      this.config.worldWidthPx - vw / CHART_ZOOM
    );
    const targetScrollY = Phaser.Math.Clamp(
      chartCenterY - vh / (2 * CHART_ZOOM),
      0,
      this.config.worldDepthPx - vh / CHART_ZOOM
    );
    this._setChartViewport(targetScrollX, targetScrollY, vw, vh);

    // Dark overlay in chart/world space so it scales with the zoomed view.
    const overlayCenter = this._chartUiPoint(vw / 2, vh / 2);
    this._overlay = this.scene.add.rectangle(
      overlayCenter.x,
      overlayCenter.y,
      this._chartUiSize(vw),
      this._chartUiSize(vh),
      0x000011,
      0
    ).setDepth(80);
    this.scene.tweens.add({
      targets: this._overlay, alpha: 0.86, duration: 600,
    });

    // Deep-space starfield scattered across the overlay
    const sfGfx = this.scene.add.graphics();
    sfGfx.setDepth(81).setAlpha(0);
    for (let i = 0; i < 280; i++) {
      const sx   = Math.random() * vw;
      const sy   = Math.random() * vh;
      const sr   = Math.random() * 1.4 + 0.3;
      const sa   = Math.random() * 0.35 + 0.05;
      const pt   = this._chartUiPoint(sx, sy);
      sfGfx.fillStyle(0xFFFFFF, sa);
      sfGfx.fillCircle(pt.x, pt.y, this._chartUiSize(sr));
    }
    // A handful of soft nebula-colour blobs
    const nebulaColors = [0x1A0033, 0x001133, 0x002211, 0x110022];
    for (let i = 0; i < 6; i++) {
      const nx = Math.random() * vw;
      const ny = Math.random() * vh;
      const nr = 60 + Math.random() * 120;
      const pt = this._chartUiPoint(nx, ny);
      sfGfx.fillStyle(nebulaColors[i % nebulaColors.length], 0.12);
      sfGfx.fillCircle(pt.x, pt.y, this._chartUiSize(nr));
    }
    this.scene.tweens.add({ targets: sfGfx, alpha: 1, duration: 800 });
    this._viewObjects.push(sfGfx);

    // Chart title + hint in world space, sized to read correctly at CHART_ZOOM.
    const titlePos = this._chartUiPoint(vw / 2, 32);
    this._chartTitle = this.scene.add.text(titlePos.x, titlePos.y, 'STAR PILLAR', this._chartTextStyle({
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: 36,
      color: '#F2F7FF',
      stroke: '#000022',
      strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 0, color: '#66A3FF', blur: 20, fill: true },
    })).setOrigin(0.5).setDepth(200).setAlpha(0);

    const hintPos = this._chartUiPoint(vw / 2, vh - 24);
    this._chartHint = this.scene.add.text(hintPos.x, hintPos.y, this._getChartHintText(), this._chartTextStyle({
      fontFamily: 'Consolas, monospace',
      fontSize: 18,
      color: '#DDE7FF',
      stroke: '#000011',
      strokeThickness: 5,
    })).setOrigin(0.5).setDepth(200).setAlpha(0);

    // Zoom tween
    this._zoomTween = this.scene.tweens.add({
      targets: cam,
      zoom: CHART_ZOOM,
      scrollX: targetScrollX,
      scrollY: targetScrollY,
      duration: 1200,
      ease: 'Cubic.out',
      onComplete: () => {
        const data = this.fts.getConstellationData();
        const unlocked = this.fts.getUnlockedConstellations() || [];
        const counts = this.fts.getConstellationCounts() || {};
        const focused = this._getFocusedConstellation(unlocked, counts, data);
        this._selectedConstellationIndex = Math.max(0, PILLAR_SLOT_ORDER.indexOf(focused));
        const { header, rows } = this._buildStarChartUi();
        this._isChartUiReady = true;

        // Fade in title and hint first
        this._tweenChartUiAlpha([this._chartTitle, this._chartHint, ...header], 400);

        // Cascade rows in one by one with 45ms stagger
        rows.forEach((rowObjs, i) => {
          this._tweenChartUiAlpha(rowObjs, 280, 80 + i * 48, 'Power2.out');
        });
      },
    });
  }

  closeConstellationView() {
    if (!this._isViewOpen) return;
    if (this._zoomTween && this._zoomTween.isPlaying()) return;

    this._isChartUiReady = false;

    // Destroy chart objects
    this._viewObjects.forEach(o => { if (o && o.active) o.destroy(); });
    this._viewObjects = [];
    this._chartUiObjects = [];

    // Fade and destroy overlay
    if (this._overlay) {
      this.scene.tweens.add({
        targets: this._overlay, alpha: 0, duration: 400,
        onComplete: () => { this._overlay?.destroy(); this._overlay = null; },
      });
    }

    // Fade out title/hint
    if (this._chartTitle) {
      this.scene.tweens.add({
        targets: [this._chartTitle, this._chartHint], alpha: 0, duration: 300,
        onComplete: () => {
          this._chartTitle?.destroy(); this._chartTitle = null;
          this._chartHint?.destroy();  this._chartHint  = null;
        },
      });
    }

    const cam = this.scene.cameras.main;
    this._zoomTween = this.scene.tweens.add({
      targets: cam,
      zoom:    this._origZoom,
      scrollX: this._origScrollX,
      scrollY: this._origScrollY,
      duration: 900,
      ease: 'Cubic.in',
      onComplete: () => {
        cam.startFollow(
          this.scene.player, true,
          this.config.cameraLerpX, this.config.cameraLerpY
        );
        this._chartViewport = null;
        this._isViewOpen = false;
        this.scene._pillarViewActive = false;
        this._selectedConstellationIndex = -1;
      },
    });
  }

  _drawConstellationView() {
    const data      = this.fts.getConstellationData();
    const unlocked  = this.fts.getUnlockedConstellations();
    const counts    = this.fts.getConstellationCounts();
    const sp        = data.spacing; // 80px

    // One shared graphics object for all lines and shapes
    const gfx = this.scene.add.graphics();
    gfx.setDepth(90);
    this._viewObjects.push(gfx);

    // Subtle arc guide line connecting all constellation centers
    gfx.lineStyle(1, 0x223355, 0.3);
    const centerPoints = PILLAR_SLOT_ORDER.map(rt => {
      return data.worldCenters?.[rt] || this.fts.getConstellationWorldCenter?.(rt);
    }).filter(Boolean);
    gfx.beginPath();
    centerPoints.forEach((pt, i) => {
      if (i === 0) gfx.moveTo(pt.x, pt.y);
      else gfx.lineTo(pt.x, pt.y);
    });
    gfx.strokePath();

    for (const resourceType of PILLAR_SLOT_ORDER) {
      const worldCenter = data.worldCenters?.[resourceType] || this.fts.getConstellationWorldCenter?.(resourceType);
      if (!worldCenter) continue;

      const centerX = worldCenter.x;
      const centerY = worldCenter.y;
      const def = data.defs[resourceType];
      if (!def) continue;

      const isUnlocked  = unlocked.includes(resourceType);
      const threshold   = data.thresholds[resourceType] ?? 5;
      const collected   = Math.min(counts[resourceType] || 0, threshold);
      const isPartial   = !isUnlocked && collected > 0;

      const lineColor   = data.lineColors[resourceType] || 0x334455;
      const cssColor    = isUnlocked ? (RESOURCE_CSS_COLORS[resourceType] || '#AABBEE')
                        : isPartial  ? (RESOURCE_CSS_COLORS[resourceType] || '#556677')
                        : '#334455';

      const signAlpha = isUnlocked ? 0.36 : isPartial ? 0.20 : 0.08;
      this._addChartConstellationSign(
        resourceType,
        centerX,
        centerY,
        signAlpha,
        !isUnlocked && !isPartial ? 0x526078 : null
      );

      // ── Connecting lines ──────────────────────────────────────────────────
      if (isUnlocked) {
        gfx.lineStyle(3, lineColor, 0.8);
        for (const [i, j] of def.lines) {
          const [dx1, dy1] = def.points[i];
          const [dx2, dy2] = def.points[j];
          gfx.lineBetween(
            centerX + dx1 * sp, centerY + dy1 * sp,
            centerX + dx2 * sp, centerY + dy2 * sp
          );
        }
      } else if (isPartial) {
        // Dashed lines in resource color at low alpha
        gfx.lineStyle(1, lineColor, 0.28);
        for (const [i, j] of def.lines) {
          const [dx1, dy1] = def.points[i];
          const [dx2, dy2] = def.points[j];
          this._drawDashedLine(
            gfx,
            centerX + dx1 * sp, centerY + dy1 * sp,
            centerX + dx2 * sp, centerY + dy2 * sp
          );
        }
      } else {
        gfx.lineStyle(1, 0x334455, 0.15);
        for (const [i, j] of def.lines) {
          const [dx1, dy1] = def.points[i];
          const [dx2, dy2] = def.points[j];
          this._drawDashedLine(
            gfx,
            centerX + dx1 * sp, centerY + dy1 * sp,
            centerX + dx2 * sp, centerY + dy2 * sp
          );
        }
      }

      // ── Star points ───────────────────────────────────────────────────────
      for (let pi = 0; pi < def.points.length; pi++) {
        const [dx, dy] = def.points[pi];
        const sx = centerX + dx * sp;
        const sy = centerY + dy * sp;

        if (isUnlocked) {
          this._drawFilledStar(gfx, sx, sy, STAR_CONSTELLATION_CONFIG.chartStarSizePx, lineColor, 1.0);
        } else if (isPartial && pi < collected) {
          // Collected but not yet unlocked — dim filled star in resource color
          this._drawFilledStar(gfx, sx, sy, STAR_CONSTELLATION_CONFIG.chartPartialStarSizePx, lineColor, 0.48);
        } else {
          // Not yet collected
          gfx.lineStyle(1, isPartial ? lineColor : 0x334455, isPartial ? 0.22 : 0.15);
          gfx.strokeCircle(sx, sy, STAR_CONSTELLATION_CONFIG.chartEmptyStarRadiusPx);
        }
      }

      // ── Name label ────────────────────────────────────────────────────────
      const labelText = isUnlocked ? (RESOURCE_DISPLAY_NAMES[resourceType] || resourceType)
                      : isPartial  ? (RESOURCE_DISPLAY_NAMES[resourceType] || resourceType)
                      : '???';
      const label = this.scene.add.text(centerX, centerY + sp * 2.6, labelText, {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: isUnlocked ? '22px' : isPartial ? '18px' : '16px',
        color: cssColor,
        stroke: '#000011',
        strokeThickness: isUnlocked ? 5 : 3,
        shadow: isUnlocked
          ? { offsetX: 0, offsetY: 0, color: cssColor, blur: 12, fill: true }
          : isPartial
          ? { offsetX: 0, offsetY: 0, color: cssColor, blur: 5, fill: true }
          : undefined,
        alpha: isUnlocked ? 1 : isPartial ? 0.7 : 0.28,
      }).setOrigin(0.5).setDepth(92);
      this._viewObjects.push(label);

      // Progress counter below label for partial constellations
      if (isPartial) {
        const progressLabel = this.scene.add.text(
          centerX, centerY + sp * 2.6 + 26,
          `${collected} / ${threshold}`,
          {
            fontFamily: 'Consolas, monospace',
            fontSize: '15px',
            color: cssColor,
            stroke: '#000011',
            strokeThickness: 2,
            alpha: 0.6,
          }
        ).setOrigin(0.5).setDepth(92);
        this._viewObjects.push(progressLabel);
      }

      // ── Backdrop glow circle ──────────────────────────────────────────────
      if (isUnlocked) {
        const glow = this.scene.add.circle(centerX, centerY, sp * 1.8, lineColor, 0.07);
        glow.setDepth(89);
        this._viewObjects.push(glow);
      } else if (isPartial) {
        // Pulsing glow to draw attention to in-progress constellations
        const partialGlow = this.scene.add.circle(centerX, centerY, sp * 1.4, lineColor, 0.04);
        partialGlow.setDepth(89);
        this._viewObjects.push(partialGlow);
        this.scene.tweens.add({
          targets: partialGlow,
          alpha: { from: 0.02, to: 0.10 },
          duration: 1400 + Math.random() * 600,
          yoyo: true, repeat: -1, ease: 'Sine.inOut',
        });
      }
    }
  }

  // ── Star chart UI ──────────────────────────────────────────────────────────

  /**
   * Build the opened Star Pillar UI in chart/world space.
   * Returns { header: [...], rows: [[...], [...], ...] } so cards can stagger in.
   */
  _clearStarChartUiObjects() {
    if (!this._chartUiObjects.length) return;

    const stale = new Set(this._chartUiObjects);
    for (const obj of this._chartUiObjects) {
      if (obj && obj.active) obj.destroy();
    }
    this._viewObjects = this._viewObjects.filter(obj => !stale.has(obj));
    this._chartUiObjects = [];
  }

  _rebuildStarChartUi(instant = false) {
    if (!this._isViewOpen || !this._chartViewport) return;
    const { header, rows } = this._buildStarChartUi();
    if (!instant) return { header, rows };

    for (const obj of header) obj?.setAlpha?.(this._getChartUiFinalAlpha(obj));
    for (const row of rows) {
      for (const obj of row) obj?.setAlpha?.(this._getChartUiFinalAlpha(obj));
    }
    return { header, rows };
  }

  _getChartUiFinalAlpha(obj) {
    return Number.isFinite(obj?._chartTargetAlpha) ? obj._chartTargetAlpha : 1;
  }

  _tweenChartUiAlpha(targets, duration, delay = 0, ease = undefined) {
    for (const target of targets) {
      if (!target) continue;
      this.scene.tweens.add({
        targets: target,
        alpha: this._getChartUiFinalAlpha(target),
        duration,
        delay,
        ...(ease ? { ease } : {}),
      });
    }
  }

  _buildStarChartUi() {
    this._clearStarChartUiObjects();

    const u = (value) => this._chartUiSize(value);
    const p = (x, y) => this._chartUiPoint(x, y);
    const track = (obj) => {
      if (obj) {
        this._chartUiObjects.push(obj);
        this._viewObjects.push(obj);
      }
      return obj;
    };

    const data = this.fts.getConstellationData();
    const unlocked = this.fts.getUnlockedConstellations() || [];
    const counts = this.fts.getConstellationCounts() || {};
    if (this._selectedConstellationIndex < 0 || this._selectedConstellationIndex >= PILLAR_SLOT_ORDER.length) {
      const focused = this._getFocusedConstellation(unlocked, counts, data);
      this._selectedConstellationIndex = Math.max(0, PILLAR_SLOT_ORDER.indexOf(focused));
    }

    const selectedResource = PILLAR_SLOT_ORDER[this._selectedConstellationIndex] || PILLAR_SLOT_ORDER[0];
    const selectedStatus = this._getConstellationStatus(selectedResource, unlocked, counts, data);
    const selectedColor = RESOURCE_LINE_COLORS[selectedResource] || 0x87CEEB;
    const selectedCss = RESOURCE_CSS_COLORS[selectedResource] || '#87CEEB';
    const selectedName = RESOURCE_DISPLAY_NAMES[selectedResource] || selectedResource;
    const selectedTile = RESOURCE_TILE_DISPLAY_NAMES[selectedResource] || selectedResource;
    const selectedBuff = CONSTELLATION_BUFFS[selectedResource];

    const depth = 150;
    const header = [];
    const rows = [];
    const panelFill = UI_COLORS.bg;
    const cardFill = UI_COLORS.cardBase;
    const cardFocusFill = UI_COLORS.cardSel;
    const borderDim = UI_COLORS.borderDim;
    const borderFocus = UI_COLORS.borderSel;
    const accentGold = UI_COLORS.gold;

    const addText = (screenX, screenY, text, style, originX = 0, originY = 0, depthOffset = 4) => {
      const pt = p(screenX, screenY);
      const obj = this.scene.add.text(pt.x, pt.y, text, this._chartTextStyle(style))
        .setOrigin(originX, originY)
        .setDepth(depth + depthOffset)
        .setAlpha(0);
      return track(obj);
    };

    const leftX = 8;
    const leftY = 86;
    const leftSize = 392;
    const cardSize = 112;
    const cardGapX = 10;
    const cardGapY = 12;
    const gridX = 410;
    const gridY = 104;

    // Left focused UI square.
    const leftPt = p(leftX, leftY);
    const leftW = u(leftSize);
    const leftPanel = this.scene.add.graphics();
    leftPanel
      .setDepth(depth)
      .setAlpha(0);
    leftPanel.fillStyle(panelFill, 0.98);
    leftPanel.fillRoundedRect(leftPt.x, leftPt.y, leftW, leftW, u(8));
    leftPanel.fillStyle(cardFill, 0.92);
    leftPanel.fillRoundedRect(leftPt.x + u(10), leftPt.y + u(10), leftW - u(20), u(58), u(6));
    leftPanel.lineStyle(u(2), borderFocus, 0.96);
    leftPanel.strokeRoundedRect(leftPt.x, leftPt.y, leftW, leftW, u(8));
    leftPanel.lineStyle(u(1), borderDim, 0.78);
    leftPanel.strokeRoundedRect(leftPt.x + u(8), leftPt.y + u(8), leftW - u(16), leftW - u(16), u(6));
    leftPanel.fillStyle(accentGold, 0.9);
    leftPanel.fillRoundedRect(leftPt.x + u(18), leftPt.y + u(18), u(5), u(42), u(3));
    track(leftPanel);
    header.push(leftPanel);

    const leftGlow = this.scene.add.graphics();
    leftGlow.setDepth(depth + 1).setAlpha(0);
    leftGlow.fillStyle(selectedColor, selectedStatus.isUnlocked ? 0.14 : 0.08);
    leftGlow.fillCircle(leftPt.x + leftW / 2, leftPt.y + u(168), u(104));
    leftGlow.lineStyle(u(1), selectedColor, selectedStatus.hasAny ? 0.5 : 0.25);
    leftGlow.strokeCircle(leftPt.x + leftW / 2, leftPt.y + u(168), u(112));
    track(leftGlow);
    header.push(leftGlow);

    header.push(addText(leftX + 24, leftY + 24, 'CONSTELLATION FOCUS', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: 18,
      color: UI_COLORS.title,
      stroke: '#000011',
      strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 0, color: '#66A3FF', blur: 10, fill: true },
    }));

    header.push(addText(leftX + leftSize - 24, leftY + 26, selectedStatus.label, {
      fontFamily: 'Consolas, monospace',
      fontSize: 13,
      color: selectedStatus.color,
      stroke: '#000011',
      strokeThickness: 3,
      shadow: selectedStatus.isUnlocked
        ? { offsetX: 0, offsetY: 0, color: selectedCss, blur: 8, fill: true }
        : undefined,
    }, 1, 0));

    const focusCenter = p(leftX + leftSize / 2, leftY + 168);
    const focusSign = this._addChartUiConstellationSign(
      selectedResource,
      focusCenter.x,
      focusCenter.y,
      u(206),
      u(186),
      selectedStatus.hasAny || selectedStatus.isUnlocked ? 0.96 : 0.62,
      depth + 3,
      selectedStatus.hasAny || selectedStatus.isUnlocked ? null : 0x64718B
    );
    if (focusSign) {
      track(focusSign);
      header.push(focusSign);
    } else {
      const focusGlyph = this.scene.add.graphics();
      focusGlyph.setDepth(depth + 3).setAlpha(0);
      this._drawChartConstellationGlyph(
        focusGlyph,
        selectedResource,
        focusCenter.x,
        focusCenter.y,
        u(30),
        selectedColor,
        selectedStatus.hasAny || selectedStatus.isUnlocked ? 1 : 0.55
      );
      track(focusGlyph);
      header.push(focusGlyph);
    }

    header.push(addText(leftX + leftSize / 2, leftY + 282, selectedName, {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: 27,
      color: selectedCss,
      align: 'center',
      stroke: '#000011',
      strokeThickness: 5,
      shadow: { offsetX: 0, offsetY: 0, color: selectedCss, blur: 10, fill: true },
    }, 0.5, 0.5));

    header.push(addText(leftX + leftSize / 2, leftY + 312, `${selectedTile.toUpperCase()} STAR SIGN`, {
      fontFamily: 'Consolas, monospace',
      fontSize: 13,
      color: UI_COLORS.body,
      align: 'center',
      stroke: '#000011',
      strokeThickness: 3,
    }, 0.5, 0.5));

    const focusDots = this.scene.add.graphics();
    focusDots.setDepth(depth + 3).setAlpha(0);
    const dotsStart = p(leftX + leftSize / 2 - 36, leftY + 340);
    this._drawChartProgressDots(
      focusDots,
      dotsStart.x,
      dotsStart.y,
      selectedStatus.threshold,
      selectedStatus.collected,
      selectedColor,
      selectedStatus.isUnlocked,
      u(6),
      u(18)
    );
    track(focusDots);
    header.push(focusDots);

    const rewardText = selectedStatus.isUnlocked
      ? `${selectedBuff?.name || 'Unlocked Buff'} active`
      : `${selectedStatus.collected} / ${selectedStatus.threshold} stars`;
    header.push(addText(leftX + leftSize / 2, leftY + 360, 'PROGRESS', {
      fontFamily: 'Consolas, monospace',
      fontSize: 10,
      color: UI_COLORS.body,
      align: 'center',
      stroke: '#000011',
      strokeThickness: 3,
    }, 0.5, 1));
    header.push(addText(leftX + leftSize / 2, leftY + 362, rewardText, {
      fontFamily: 'Consolas, monospace',
      fontSize: 14,
      color: selectedStatus.isUnlocked ? selectedCss : '#DDE7FF',
      align: 'center',
      stroke: '#000011',
      strokeThickness: 3,
    }, 0.5, 0));

    header.push(addText(leftX + 32, leftY + 390, this._getUpgradeText(selectedResource), {
      fontFamily: 'Consolas, monospace',
      fontSize: 13,
      color: '#DDE7FF',
      align: 'center',
      wordWrap: { width: u(leftSize - 64), useAdvancedWrap: true },
      stroke: '#000011',
      strokeThickness: 3,
    }, 0, 0));

    header.push(addText(gridX, gridY - 30, 'STAR SIGNS', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: 18,
      color: UI_COLORS.title,
      stroke: '#000011',
      strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 0, color: '#66A3FF', blur: 10, fill: true },
    }));

    header.push(addText(gridX + (cardSize + cardGapX) * STAR_CHART_GRID_COLUMNS - cardGapX, gridY - 27, `${unlocked.length} / ${PILLAR_SLOT_ORDER.length} unlocked`, {
      fontFamily: 'Consolas, monospace',
      fontSize: 13,
      color: UI_COLORS.body,
      stroke: '#000011',
      strokeThickness: 3,
    }, 1, 0));

    for (let i = 0; i < PILLAR_SLOT_ORDER.length; i++) {
      const resourceType = PILLAR_SLOT_ORDER[i];
      const rowObjs = [];
      const col = i % STAR_CHART_GRID_COLUMNS;
      const row = Math.floor(i / STAR_CHART_GRID_COLUMNS);
      const cardX = gridX + col * (cardSize + cardGapX);
      const cardY = gridY + row * (cardSize + cardGapY);
      const cardPt = p(cardX, cardY);
      const status = this._getConstellationStatus(resourceType, unlocked, counts, data);
      const lineColor = RESOURCE_LINE_COLORS[resourceType] || 0x87CEEB;
      const cssColor = RESOURCE_CSS_COLORS[resourceType] || '#87CEEB';
      const name = RESOURCE_DISPLAY_NAMES[resourceType] || resourceType;
      const isFocused = resourceType === selectedResource;
      const activeAlpha = status.isUnlocked ? 1 : (status.hasAny ? 0.74 : 0.34);
      const displayColor = status.hasAny || status.isUnlocked ? lineColor : 0x64718B;

      const cardGfx = this.scene.add.graphics();
      cardGfx.setDepth(depth + 1).setAlpha(0);
      cardGfx.fillStyle(isFocused ? cardFocusFill : cardFill, 0.96);
      cardGfx.fillRoundedRect(cardPt.x, cardPt.y, u(cardSize), u(cardSize), u(8));
      cardGfx.fillStyle(lineColor, status.isUnlocked ? 0.12 : (status.hasAny ? 0.08 : 0.03));
      cardGfx.fillRoundedRect(cardPt.x + u(6), cardPt.y + u(6), u(cardSize - 12), u(cardSize - 12), u(6));
      cardGfx.lineStyle(u(isFocused ? 3 : 1.5), isFocused ? borderFocus : borderDim, isFocused ? 1 : 0.78);
      cardGfx.strokeRoundedRect(cardPt.x, cardPt.y, u(cardSize), u(cardSize), u(8));
      if (isFocused) {
        cardGfx.lineStyle(u(1), accentGold, 0.9);
        cardGfx.strokeRoundedRect(cardPt.x + u(5), cardPt.y + u(5), u(cardSize - 10), u(cardSize - 10), u(6));
      }
      cardGfx.fillStyle(lineColor, status.isUnlocked ? 0.95 : (status.hasAny ? 0.72 : 0.38));
      cardGfx.fillCircle(cardPt.x + u(18), cardPt.y + u(18), u(7));
      cardGfx.fillStyle(status.isUnlocked ? 0x14301E : (status.hasAny ? 0x1A2840 : 0x111923), 0.92);
      cardGfx.fillRoundedRect(cardPt.x + u(cardSize - 56), cardPt.y + u(cardSize - 27), u(46), u(18), u(5));
      cardGfx.lineStyle(u(1), status.isUnlocked ? UI_COLORS.borderGood : borderDim, status.hasAny || status.isUnlocked ? 0.85 : 0.55);
      cardGfx.strokeRoundedRect(cardPt.x + u(cardSize - 56), cardPt.y + u(cardSize - 27), u(46), u(18), u(5));
      track(cardGfx);
      rowObjs.push(cardGfx);

      const nameText = addText(cardX + 32, cardY + 12, name.replace('The ', ''), {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: 12,
        color: status.hasAny || status.isUnlocked ? cssColor : '#8290AA',
        stroke: '#000011',
        strokeThickness: 3,
        shadow: status.isUnlocked
          ? { offsetX: 0, offsetY: 0, color: cssColor, blur: 6, fill: true }
          : undefined,
      });
      rowObjs.push(nameText);

      const glyphCenter = p(cardX + cardSize / 2, cardY + 59);
      const sign = this._addChartUiConstellationSign(
        resourceType,
        glyphCenter.x,
        glyphCenter.y,
        u(70),
        u(58),
        activeAlpha,
        depth + 3,
        status.hasAny || status.isUnlocked ? null : 0x64718B
      );
      if (sign) {
        track(sign);
        rowObjs.push(sign);
      } else {
        const glyph = this.scene.add.graphics();
        glyph.setDepth(depth + 3).setAlpha(0);
        this._drawChartConstellationGlyph(glyph, resourceType, glyphCenter.x, glyphCenter.y, u(12), displayColor, activeAlpha);
        track(glyph);
        rowObjs.push(glyph);
      }

      const dots = this.scene.add.graphics();
      dots.setDepth(depth + 3).setAlpha(0);
      const cardDots = p(cardX + 18, cardY + cardSize - 21);
      this._drawChartProgressDots(
        dots,
        cardDots.x,
        cardDots.y,
        status.threshold,
        status.collected,
        lineColor,
        status.isUnlocked,
        u(3.4),
        u(8.5)
      );
      track(dots);
      rowObjs.push(dots);

      const statusText = addText(cardX + cardSize - 12, cardY + cardSize - 18, status.shortLabel, {
        fontFamily: 'Consolas, monospace',
        fontSize: 11,
        color: status.color,
        stroke: '#000011',
        strokeThickness: 3,
      }, 1, 0.5);
      rowObjs.push(statusText);

      const hit = this.scene.add.rectangle(
        cardPt.x + u(cardSize / 2),
        cardPt.y + u(cardSize / 2),
        u(cardSize),
        u(cardSize),
        0x000000,
        0
      )
        .setDepth(depth + 10)
        .setAlpha(0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => this._selectConstellationIndex(i, false));
      hit.on('pointerdown', () => this._selectConstellationIndex(i, true));
      track(hit);

      rows.push(rowObjs);
    }

    return { header, rows };
  }

  _getFocusedConstellation(unlocked, counts, data) {
    let bestResource = null;
    let bestProgress = -1;

    for (const resourceType of PILLAR_SLOT_ORDER) {
      if (unlocked.includes(resourceType)) continue;
      const threshold = data.thresholds[resourceType] ?? 5;
      const collected = Math.min(counts[resourceType] || 0, threshold);
      if (collected <= 0) continue;
      const progress = collected / threshold;
      if (progress > bestProgress) {
        bestResource = resourceType;
        bestProgress = progress;
      }
    }

    if (bestResource) return bestResource;

    for (let i = PILLAR_SLOT_ORDER.length - 1; i >= 0; i--) {
      const resourceType = PILLAR_SLOT_ORDER[i];
      if (unlocked.includes(resourceType)) return resourceType;
    }

    return PILLAR_SLOT_ORDER[0];
  }

  _getConstellationStatus(resourceType, unlocked, counts, data) {
    const threshold = data.thresholds[resourceType] ?? 5;
    const collected = Math.min(counts[resourceType] || 0, threshold);
    const isUnlocked = unlocked.includes(resourceType);
    const hasAny = collected > 0;
    const cssColor = RESOURCE_CSS_COLORS[resourceType] || '#87CEEB';

    if (isUnlocked) {
      return { threshold, collected: threshold, isUnlocked, hasAny: true, label: 'UNLOCKED', shortLabel: 'DONE', color: UI_COLORS.success };
    }

    if (hasAny) {
      return { threshold, collected, isUnlocked, hasAny, label: `${collected} / ${threshold}`, shortLabel: `${collected}/${threshold}`, color: '#DDE7FF' };
    }

    return { threshold, collected, isUnlocked, hasAny, label: `NEED ${threshold}`, shortLabel: `need ${threshold}`, color: UI_COLORS.body };
  }

  _drawChartConstellationGlyph(gfx, resourceType, centerX, centerY, spacing, color, alpha = 1) {
    const def = STAR_CONSTELLATION_CONFIG.defs[resourceType];
    if (!def) {
      gfx.fillStyle(color, alpha);
      gfx.fillCircle(centerX, centerY, spacing);
      return;
    }

    const points = def.points.map(([gx, gy]) => ({
      x: centerX + gx * spacing,
      y: centerY + gy * spacing,
    }));

    gfx.lineStyle(Math.max(1, spacing * 0.08), color, alpha * 0.78);
    for (const [from, to] of def.lines) {
      const a = points[from];
      const b = points[to];
      if (!a || !b) continue;
      gfx.lineBetween(a.x, a.y, b.x, b.y);
    }

    const starSize = Math.max(3, spacing * 0.18);
    for (const point of points) {
      gfx.fillStyle(color, alpha);
      this._drawFilledStar(gfx, point.x, point.y, starSize, color, alpha);
      gfx.lineStyle(Math.max(1, spacing * 0.045), 0xFFFFFF, alpha * 0.35);
      gfx.strokeCircle(point.x, point.y, starSize * 0.78);
    }
  }

  _drawChartProgressDots(gfx, startX, y, threshold, collected, color, isUnlocked, radius, spacing) {
    for (let i = 0; i < threshold; i++) {
      const x = startX + i * spacing;
      if (i < collected) {
        gfx.fillStyle(color, isUnlocked ? 1 : 0.78);
        gfx.fillCircle(x, y, radius);
        gfx.fillStyle(0xFFFFFF, 0.28);
        gfx.fillCircle(x - radius * 0.22, y - radius * 0.22, radius * 0.42);
      } else {
        gfx.lineStyle(Math.max(1, radius * 0.22), color, 0.4);
        gfx.strokeCircle(x, y, radius);
      }
    }
  }

  _getUpgradeText(resourceType) {
    const resourceName = RESOURCE_TILE_DISPLAY_NAMES[resourceType] || resourceType;
    const abilityDesc = CONSTELLATION_BUFFS[resourceType]?.description || 'Ability buff';
    return `${resourceName} sky tiles +1x, ${abilityDesc}`;
  }

  _getConstellationSignKey(resourceType) {
    return ASSET_KEYS.constellations?.signs?.[resourceType] || null;
  }

  _addChartUiConstellationSign(resourceType, centerX, centerY, maxWidth, maxHeight, alpha, depth, tint = null) {
    const key = this._getConstellationSignKey(resourceType);
    if (!key || !this.scene.textures.exists(key)) return null;

    const image = this.scene.add.image(centerX, centerY, key);
    const sourceW = image.width || image.displayWidth || 1;
    const sourceH = image.height || image.displayHeight || 1;
    const scale = Math.max(0.01, Math.min(maxWidth / sourceW, maxHeight / sourceH));

    image
      .setOrigin(0.5)
      .setScale(scale)
      .setDepth(depth)
      .setAlpha(0);
    image._chartTargetAlpha = alpha;

    if (tint !== null) image.setTint(tint);
    return image;
  }

  _addChartConstellationSign(resourceType, centerX, centerY, alpha, tint = null) {
    const key = this._getConstellationSignKey(resourceType);
    if (!key || !this.scene.textures.exists(key)) return null;

    const image = this.scene.add.image(centerX, centerY, key);
    const maxSourceDim = Math.max(image.width || 1, image.height || 1);
    const targetSize = this.config.constellationSignWorldSizePx || 360;
    const scale = targetSize / maxSourceDim;

    image
      .setOrigin(0.5)
      .setScale(scale)
      .setDepth(88)
      .setAlpha(alpha);

    if (tint !== null) image.setTint(tint);
    if (typeof Phaser !== 'undefined' && Phaser.BlendModes?.SCREEN !== undefined) {
      image.setBlendMode(Phaser.BlendModes.SCREEN);
    }

    this._viewObjects.push(image);
    return image;
  }

  // ── Drawing helpers ────────────────────────────────────────────────────────

  /** Draw a filled 5-pointed star on a graphics object. */
  _drawFilledStar(gfx, x, y, size, color, alpha = 1) {
    const inner = size * 0.42;
    const outer = size;
    const pts   = 5;
    const startAngle = -Math.PI / 2;

    gfx.fillStyle(color, alpha);
    gfx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = startAngle + (i * Math.PI / pts);
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.closePath();
    gfx.fillPath();

    // Soft inner glow
    gfx.fillStyle(0xFFFFFF, alpha * 0.25);
    gfx.fillCircle(x, y, size * 0.28);
  }

  /** Draw a dashed line using manual segment/gap iteration (Phaser has no dash API). */
  _drawDashedLine(gfx, x1, y1, x2, y2, dashLen = 10, gapLen = 8) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const totalLen = Math.sqrt(dx * dx + dy * dy);
    if (totalLen === 0) return;
    const nx = dx / totalLen;
    const ny = dy / totalLen;

    let pos = 0;
    let drawing = true;
    gfx.beginPath();
    while (pos < totalLen) {
      const seg    = drawing ? dashLen : gapLen;
      const endPos = Math.min(pos + seg, totalLen);
      if (drawing) {
        gfx.moveTo(x1 + nx * pos,    y1 + ny * pos);
        gfx.lineTo(x1 + nx * endPos, y1 + ny * endPos);
      }
      pos = endPos;
      drawing = !drawing;
    }
    gfx.strokePath();
  }
}
