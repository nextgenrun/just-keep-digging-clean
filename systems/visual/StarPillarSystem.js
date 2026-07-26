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
import { getConstellationRelicRequirement } from "../../values/ancientRelics.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";

// ─── Module-level constants ───────────────────────────────────────────────────

const RARITY_BADGES = STAR_CONSTELLATION_CONFIG.rarityFallbacks.map((rarity) => ({
  color: rarity.glowColor,
  cssColor: `#${rarity.glowColor.toString(16).padStart(6, "0").toUpperCase()}`,
  label: rarity.label,
  name: rarity.name.charAt(0).toUpperCase() + rarity.name.slice(1),
}));

// Resource slot order — matches CONSTELLATION_DEFS order in FloatingTextSystem
const PILLAR_SLOT_ORDER = [
  'dirt', 'stone', 'copper', 'darkDirtNormal', 'steel',
  'iron', 'bronze', 'darkDirtStrong', 'silver', 'gold',
];

const RESOURCE_LINE_COLORS = STAR_CONSTELLATION_CONFIG.lineColors;
const RESOURCE_CSS_COLORS = Object.fromEntries(
  Object.entries(RESOURCE_LINE_COLORS).map(([resourceType, color]) => [
    resourceType,
    `#${color.toString(16).padStart(6, "0").toUpperCase()}`,
  ])
);

const RESOURCE_DISPLAY_NAMES = Object.fromEntries(
  Object.entries(STAR_CONSTELLATION_CONFIG.defs).map(([resourceType, definition]) => [
    resourceType,
    definition.name,
  ])
);

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
  constructor(scene, config, floatingTextSystem, ui) {
    this.scene  = scene;
    this.config = config;
    this.fts    = floatingTextSystem;
    this.ui     = ui;

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

    // Load saved UI progression, then sync pillar slots and rarity badges.
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

    this._isViewOpen = true;
    this._isChartUiReady = false;
    this._chartUiObjects = [];
    this._selectedConstellationIndex = -1;
    this.scene._pillarViewActive = true;
    this.scene.setShopOpen?.(true);

    const data = this.fts.getConstellationData();
    const unlocked = this.fts.getUnlockedConstellations() || [];
    const counts = this.fts.getConstellationCounts() || {};
    const focused = this._getFocusedConstellation(unlocked, counts, data);
    this._selectedConstellationIndex = Math.max(0, PILLAR_SLOT_ORDER.indexOf(focused));

    this._starShell = this.ui.createModalShell(this.scene, {
      title: "STAR PILLAR",
      subtitle: this._getChartHintText(),
      icon: "constellation",
      maxWidth: 1120,
      maxHeight: 660,
      depth: 3180,
      onClose: () => this.closeConstellationView(),
    });
    this._starShell.show();
    this._buildStarChartUi();
    this._isChartUiReady = true;
  }

  closeConstellationView() {
    if (!this._isViewOpen) return;

    this._isChartUiReady = false;
    this._clearStarChartUiObjects();
    const shell = this._starShell;
    this._starShell = null;
    if (shell) shell.hide(() => shell.destroy());
    this._viewObjects.forEach(obj => obj?.destroy?.());
    this._viewObjects = [];
    this._overlay?.destroy?.();
    this._overlay = null;
    this._chartTitle = null;
    this._chartHint = null;
    this._chartViewport = null;
    this._zoomTween = null;
    this._selectedConstellationIndex = -1;
    this._isViewOpen = false;
    this.scene._pillarViewActive = false;
    this.scene.setShopOpen?.(false);
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
    if (!this._isViewOpen || !this._starShell) return;
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
    const shell = this._starShell;
    if (!shell) return { header: [], rows: [] };

    shell.layout();
    const content = shell.content;
    const rect = shell.getContentRect();
    const header = [];
    const rows = [];
    const track = (obj, bucket = header) => {
      if (!obj) return obj;
      content.add(obj);
      this._chartUiObjects.push(obj);
      bucket.push(obj);
      return obj;
    };
    const addText = (x, y, text, style = {}, originX = 0, originY = 0, bucket = header) => {
      const obj = this.scene.add.text(x, y, text, {
        fontFamily: style.fontFamily || UI_FONTS.body,
        fontSize: style.fontSize || "13px",
        fontStyle: style.fontStyle,
        color: style.color || UI_COLORS.body,
        align: style.align,
        lineSpacing: style.lineSpacing,
        wordWrap: style.wordWrap,
      }).setOrigin(originX, originY);
      return track(obj, bucket);
    };

    const data = this.fts.getConstellationData();
    const unlocked = this.fts.getUnlockedConstellations() || [];
    const counts = this.fts.getConstellationCounts() || {};
    const relicCount = this.scene.ancientRelicSystem?.getCount?.() || 0;
    if (this._selectedConstellationIndex < 0 || this._selectedConstellationIndex >= PILLAR_SLOT_ORDER.length) {
      const focused = this._getFocusedConstellation(unlocked, counts, data);
      this._selectedConstellationIndex = Math.max(0, PILLAR_SLOT_ORDER.indexOf(focused));
    }

    const selectedResource = PILLAR_SLOT_ORDER[this._selectedConstellationIndex] || PILLAR_SLOT_ORDER[0];
    const selectedStatus = this._getConstellationStatus(selectedResource, unlocked, counts, data, relicCount);
    const selectedColor = RESOURCE_LINE_COLORS[selectedResource] || 0x87CEEB;
    const selectedCss = RESOURCE_CSS_COLORS[selectedResource] || "#87CEEB";
    const selectedName = RESOURCE_DISPLAY_NAMES[selectedResource] || selectedResource;
    const selectedTile = RESOURCE_TILE_DISPLAY_NAMES[selectedResource] || selectedResource;
    const selectedBuff = CONSTELLATION_BUFFS[selectedResource];

    const gap = 18;
    const focusWidth = Math.min(390, Math.max(300, rect.width * 0.4));
    const gridX = rect.left + focusWidth + gap;
    const gridWidth = rect.width - focusWidth - gap;
    const focusX = rect.left;
    const focusY = rect.top;
    const focusHeight = rect.height;

    const focusPanel = this.scene.add.graphics();
    focusPanel.fillStyle(UI_COLORS.cardBase, 0.99);
    focusPanel.fillRoundedRect(focusX, focusY, focusWidth, focusHeight, 8);
    focusPanel.fillStyle(selectedColor, selectedStatus.isUnlocked ? 0.12 : 0.055);
    focusPanel.fillRoundedRect(focusX + 8, focusY + 8, focusWidth - 16, focusHeight - 16, 6);
    focusPanel.lineStyle(2, UI_COLORS.borderSel, 1);
    focusPanel.strokeRoundedRect(focusX, focusY, focusWidth, focusHeight, 8);
    focusPanel.lineStyle(1, selectedColor, 0.55);
    focusPanel.strokeRoundedRect(focusX + 8, focusY + 8, focusWidth - 16, focusHeight - 16, 6);
    track(focusPanel);

    addText(focusX + 22, focusY + 18, "CONSTELLATION FOCUS", {
      fontFamily: UI_FONTS.display,
      fontSize: "16px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    });
    addText(focusX + focusWidth - 22, focusY + 20, selectedStatus.label, {
      fontFamily: UI_FONTS.mono,
      fontSize: "11px",
      color: selectedStatus.color,
    }, 1, 0);
    const relicIconKey = ASSET_KEYS.ui.heavenblocks?.ancientRelicIcon;
    if (relicIconKey && this.scene.textures?.exists?.(relicIconKey)) {
      track(this.scene.add.image(focusX + 31, focusY + 49, relicIconKey).setDisplaySize(24, 24));
    }
    addText(focusX + 48, focusY + 43, `ANCIENT RELICS: ${relicCount}`, {
      fontFamily: UI_FONTS.mono,
      fontSize: "10px",
      color: UI_COLORS.gold,
    });

    const signY = focusY + Math.min(145, focusHeight * 0.29);
    const focusSign = this._addChartUiConstellationSign(
      selectedResource,
      focusX + focusWidth / 2,
      signY,
      Math.min(210, focusWidth - 90),
      Math.min(165, focusHeight * 0.3),
      selectedStatus.hasAny || selectedStatus.isUnlocked ? 0.98 : 0.52,
      2,
      selectedStatus.hasAny || selectedStatus.isUnlocked ? null : 0x64718B
    );
    if (focusSign) {
      track(focusSign);
    } else {
      const glyph = this.scene.add.graphics();
      this._drawChartConstellationGlyph(
        glyph,
        selectedResource,
        focusX + focusWidth / 2,
        signY,
        28,
        selectedColor,
        selectedStatus.hasAny || selectedStatus.isUnlocked ? 1 : 0.5
      );
      track(glyph);
    }

    const nameY = focusY + Math.min(245, focusHeight * 0.48);
    addText(focusX + focusWidth / 2, nameY, selectedName, {
      fontFamily: UI_FONTS.display,
      fontSize: "25px",
      fontStyle: "bold",
      color: selectedCss,
      align: "center",
    }, 0.5, 0.5);
    addText(focusX + focusWidth / 2, nameY + 29, selectedTile.toUpperCase() + " STAR SIGN", {
      fontFamily: UI_FONTS.mono,
      fontSize: "11px",
      color: UI_COLORS.body,
      align: "center",
    }, 0.5, 0.5);

    const progressTop = focusY + Math.min(300, focusHeight * 0.59);
    const progressPanel = this.scene.add.graphics();
    progressPanel.fillStyle(UI_COLORS.bg, 0.95);
    progressPanel.fillRoundedRect(focusX + 18, progressTop, focusWidth - 36, 72, 6);
    progressPanel.lineStyle(1, UI_COLORS.borderDim, 0.95);
    progressPanel.strokeRoundedRect(focusX + 18, progressTop, focusWidth - 36, 72, 6);
    track(progressPanel);
    addText(focusX + 34, progressTop + 14, "PROGRESS", {
      fontFamily: UI_FONTS.mono,
      fontSize: "10px",
      color: UI_COLORS.dim,
    });
    const progressValue = selectedStatus.progressLabel;
    addText(focusX + 34, progressTop + 42, progressValue, {
      fontFamily: UI_FONTS.display,
      fontSize: selectedStatus.relicRequirement > 0 && !selectedStatus.isUnlocked ? "14px" : "18px",
      fontStyle: "bold",
      color: selectedStatus.isUnlocked ? selectedCss : UI_COLORS.title,
    });

    const barX = focusX + 34;
    const barY = progressTop + 61;
    const barWidth = focusWidth - 68;
    const ratio = selectedStatus.isUnlocked
      ? 1
      : Phaser.Math.Clamp(selectedStatus.collected / Math.max(1, selectedStatus.threshold), 0, 1);
    const progressBar = this.scene.add.graphics();
    progressBar.fillStyle(UI_COLORS.cardBase, 1);
    progressBar.fillRoundedRect(barX, barY, barWidth, 5, 3);
    progressBar.fillStyle(selectedColor, 0.95);
    progressBar.fillRoundedRect(barX, barY, barWidth * ratio, 5, 3);
    track(progressBar);

    const rewardTop = progressTop + 88;
    addText(focusX + 22, rewardTop, selectedStatus.isUnlocked ? "ACTIVE REWARD" : "UNLOCK REWARD", {
      fontFamily: UI_FONTS.display,
      fontSize: "14px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    });
    addText(focusX + 22, rewardTop + 27,
      selectedBuff?.name || "Constellation upgrade", {
        fontFamily: UI_FONTS.body,
        fontSize: "14px",
        fontStyle: "bold",
        color: selectedStatus.isUnlocked ? selectedCss : UI_COLORS.gold,
      }
    );
    addText(focusX + 22, rewardTop + 52, this._getUpgradeText(selectedResource), {
      fontFamily: UI_FONTS.mono,
      fontSize: "11px",
      color: UI_COLORS.body,
      wordWrap: { width: focusWidth - 44, useAdvancedWrap: true },
      lineSpacing: 3,
    });

    addText(gridX, rect.top + 4, "STAR SIGNS", {
      fontFamily: UI_FONTS.display,
      fontSize: "16px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    });
    addText(gridX + gridWidth, rect.top + 7,
      unlocked.length + " / " + PILLAR_SLOT_ORDER.length + " UNLOCKED", {
        fontFamily: UI_FONTS.mono,
        fontSize: "11px",
        color: UI_COLORS.body,
      }, 1, 0
    );

    const columns = STAR_CHART_GRID_COLUMNS;
    const gridTop = rect.top + 34;
    const cardGap = 10;
    const cardWidth = (gridWidth - cardGap * (columns - 1)) / columns;
    const rowCount = Math.ceil(PILLAR_SLOT_ORDER.length / columns);
    const cardHeight = (rect.height - 34 - cardGap * (rowCount - 1)) / rowCount;

    PILLAR_SLOT_ORDER.forEach((resourceType, index) => {
      const rowObjects = [];
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = gridX + col * (cardWidth + cardGap);
      const y = gridTop + row * (cardHeight + cardGap);
      const status = this._getConstellationStatus(resourceType, unlocked, counts, data, relicCount);
      const lineColor = RESOURCE_LINE_COLORS[resourceType] || 0x87CEEB;
      const cssColor = RESOURCE_CSS_COLORS[resourceType] || "#87CEEB";
      const name = RESOURCE_DISPLAY_NAMES[resourceType] || resourceType;
      const selected = index === this._selectedConstellationIndex;

      const card = this.scene.add.graphics();
      card.fillStyle(selected ? UI_COLORS.cardSel : UI_COLORS.cardBase, 0.98);
      card.fillRoundedRect(x, y, cardWidth, cardHeight, 7);
      card.fillStyle(lineColor, status.isUnlocked ? 0.1 : status.hasAny ? 0.055 : 0.02);
      card.fillRoundedRect(x + 5, y + 5, cardWidth - 10, cardHeight - 10, 5);
      card.lineStyle(selected ? 2 : 1, selected ? UI_COLORS.borderSel : UI_COLORS.borderDim, selected ? 1 : 0.82);
      card.strokeRoundedRect(x, y, cardWidth, cardHeight, 7);
      track(card, rowObjects);

      const sign = this._addChartUiConstellationSign(
        resourceType,
        x + cardWidth / 2,
        y + Math.min(43, cardHeight * 0.39),
        Math.min(72, cardWidth - 32),
        Math.min(55, cardHeight * 0.48),
        status.isUnlocked ? 0.98 : status.hasAny ? 0.72 : 0.28,
        3,
        status.hasAny || status.isUnlocked ? null : 0x64718B
      );
      if (sign) track(sign, rowObjects);

      addText(x + cardWidth / 2, y + cardHeight - 39, name.replace("The ", ""), {
        fontFamily: UI_FONTS.display,
        fontSize: cardWidth < 105 ? "10px" : "12px",
        fontStyle: "bold",
        color: status.hasAny || status.isUnlocked ? cssColor : UI_COLORS.dim,
        align: "center",
      }, 0.5, 0.5, rowObjects);
      addText(x + cardWidth / 2, y + cardHeight - 17, status.shortLabel, {
        fontFamily: UI_FONTS.mono,
        fontSize: "9px",
        color: status.color,
        align: "center",
      }, 0.5, 0.5, rowObjects);

      const hit = this.scene.add.rectangle(
        x + cardWidth / 2,
        y + cardHeight / 2,
        cardWidth,
        cardHeight,
        0x000000,
        0
      ).setInteractive({ useHandCursor: true });
      hit.on("pointerover", () => this._selectConstellationIndex(index, false));
      hit.on("pointerdown", () => this._selectConstellationIndex(index, true));
      track(hit, rowObjects);
      rows.push(rowObjects);
    });

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

  _getConstellationStatus(resourceType, unlocked, counts, data, relicCount = 0) {
    const threshold = data.thresholds[resourceType] ?? 5;
    const collected = Math.min(counts[resourceType] || 0, threshold);
    const isUnlocked = unlocked.includes(resourceType);
    const relicRequirement = getConstellationRelicRequirement(resourceType);
    const relics = Math.max(0, Math.floor(relicCount));
    const hasAny = collected > 0;
    const relicProgress = relicRequirement > 0 ? ` • ${relics} / ${relicRequirement} RELICS` : "";
    const shortRelicProgress = relicRequirement > 0 ? ` ${relics}/${relicRequirement}R` : "";

    if (isUnlocked) {
      return { threshold, collected: threshold, isUnlocked, hasAny: true, relicRequirement, relics, label: 'UNLOCKED', shortLabel: 'DONE', progressLabel: 'UNLOCKED', color: UI_COLORS.success };
    }

    if (collected >= threshold && relics < relicRequirement) {
      return {
        threshold, collected, isUnlocked, hasAny, relicRequirement, relics,
        label: `NEED ${relicRequirement - relics} RELIC${relicRequirement - relics === 1 ? '' : 'S'}`,
        shortLabel: `${collected}/${threshold}S ${relics}/${relicRequirement}R`,
        progressLabel: `${collected} / ${threshold} STARS${relicProgress}`,
        color: UI_COLORS.gold,
      };
    }

    if (hasAny) {
      return {
        threshold, collected, isUnlocked, hasAny, relicRequirement, relics,
        label: `${collected} / ${threshold}`,
        shortLabel: `${collected}/${threshold}S${shortRelicProgress}`,
        progressLabel: `${collected} / ${threshold} STARS${relicProgress}`,
        color: '#DDE7FF',
      };
    }

    return {
      threshold, collected, isUnlocked, hasAny, relicRequirement, relics,
      label: `NEED ${threshold}`,
      shortLabel: `need ${threshold}S${shortRelicProgress}`,
      progressLabel: `${collected} / ${threshold} STARS${relicProgress}`,
      color: UI_COLORS.body,
    };
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
