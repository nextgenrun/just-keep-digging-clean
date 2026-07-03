/**
 * PlayScene UI Module
 * Handles overlays, status bars, safe return line, and save/load functionality
 */

import { WelcomeMessageGenerator } from "../model/WelcomeMessageGenerator.js";
import { UI_CONFIG } from "../../values/uiConfig.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { UI_COLORS } from "../../values/uiColors.js";
import {
  createButton,
  createFocusController,
  createHintLegend,
  createPanel,
  createTabBar,
  createTogglePair,
} from "../../ui/PhaserUiKit.js";
import { createSettingsPanelContent } from "../../ui/overlays/SettingsPanelContent.js";
import { USER_SETTINGS } from "../../systems/UserSettings.js";

/**
 * Mix in UI methods to PlayScene prototype
 */
export function setupUIMethods(prototype) {
  prototype.createOverlay = function() {
    this.overlayManager.createOverlay();
  };

  prototype.showOverlay = function(title, body) {
    this.overlayManager.showOverlay(title, body);
  };

  prototype.hideOverlay = function() {
    this.overlayManager.hideOverlay();
  };

  prototype.showGameDialog = function(title, body) {
    this.gameState = "dialog";
    this.shopOverlay?.hide();
    this.overlayManager.showGameDialog(title, body);
  };

  prototype.drawStatusBars = function(gemPowerPct, gpRaw, gpMax) {
    const gpNorm = gemPowerPct / 100;
    const gpColor = gpNorm > HUD_LAYOUT.gpThresholdHigh ? HUD_LAYOUT.gpColorHigh
      : gpNorm > HUD_LAYOUT.gpThresholdMid ? HUD_LAYOUT.gpColorMid
      : HUD_LAYOUT.gpColorLow;

    this._gemPowerBarBg.clear();
    this._gemPowerBarBg.fillStyle(HUD_LAYOUT.barBgColor, HUD_LAYOUT.barBgAlpha);
    this._gemPowerBarBg.fillRoundedRect(HUD_LAYOUT.barX, HUD_LAYOUT.gpBarY, HUD_LAYOUT.barW, HUD_LAYOUT.barH, 3);

    this._gemPowerBarFill.clear();
    this._gemPowerBarFill.fillStyle(gpColor, 1);
    this._gemPowerBarFill.fillRoundedRect(HUD_LAYOUT.barX, HUD_LAYOUT.gpBarY, Math.max(HUD_LAYOUT.barW * gpNorm, 0.1), HUD_LAYOUT.barH, 3);

    if (this._gpLabelText) {
      this._gpLabelText.setText(`GP: ${gpRaw}/${gpMax}`);
    }
  };

  prototype._calcSafeReturnDepth = function() {
    const maxFlyTiles = this.playerController?.abilities?.getMaxFlightHeightTiles?.();
    const fallbackTiles = this.config.safeReturnDepthTiles ?? 3;
    const depthTiles = Number.isFinite(maxFlyTiles) ? Math.floor(maxFlyTiles) : fallbackTiles;
    return Math.max(2, Math.min(depthTiles, this.config.climbWarningDepthTiles - 1));
  };

  prototype._refreshSafeReturnLine = function() {
    const depth = this._calcSafeReturnDepth();
    if (depth === this._lastSafeReturnDepth) return;
    this._lastSafeReturnDepth = depth;

    const lineY = (this.config.topAirRows + depth) * this.config.tileSize;
    this._safeReturnGfx.clear();
    this._safeReturnGfx.lineStyle(HUD_LAYOUT.warnLineWidth, HUD_LAYOUT.safeLineColor, HUD_LAYOUT.safeLineAlpha);
    this._safeReturnGfx.lineBetween(0, lineY, this.config.worldWidthPx, lineY);

    this._safeReturnText.setPosition(HUD_LAYOUT.warnTextX, lineY + HUD_LAYOUT.warnTextOffsetY);
    this._safeReturnText.setText(
      `✓  Current flight return range: ~${depth} tiles`
    );
  };

  prototype._generateWelcomeMessage = function() {
    const saveData = this._cachedSaveData;
    return WelcomeMessageGenerator.generateMessage(saveData);
  };

  prototype._legacyShowPauseMenu_DISABLED = function() {
    this.gameState = "paused";
    this.playerController.setControlsEnabled(false);

    const W = this.config.viewportWidth;
    const H = this.config.viewportHeight;
    const cx = W / 2;
    const cy = H / 2;

    // ── Layout constants ─────────────────────────────────────────────────────
    const PANEL_W     = 800;
    const PANEL_H     = 500;
    const PANEL_Y     = cy + 10;
    const DEPTH       = 2502;

    // ── Tab definitions ──────────────────────────────────────────────────────
    const TABS = ['GENERAL', 'STATS', 'SETTINGS'];
    let activeTab = 0; // 0=GENERAL, 1=STATS, 2=SETTINGS
    this._currentPauseTab = activeTab;

    // Backdrop
    const backdrop = this.add.rectangle(cx, cy, W, H, 0x000000, 0)
      .setScrollFactor(0).setDepth(2500);

    // Panel
    const panelG = this.add.graphics().setScrollFactor(0).setDepth(2501).setAlpha(0);
    panelG.fillStyle(0x0d1117, 1);
    panelG.fillRoundedRect(cx - PANEL_W / 2, PANEL_Y - PANEL_H / 2, PANEL_W, PANEL_H, 8);
    panelG.lineStyle(2, 0x2a3a4a, 1);
    panelG.strokeRoundedRect(cx - PANEL_W / 2, PANEL_Y - PANEL_H / 2, PANEL_W, PANEL_H, 8);

    // Title + separator
    const TITLE_Y = PANEL_Y - PANEL_H / 2 + 28;
    const SEP_Y   = PANEL_Y - PANEL_H / 2 + 56;
    const titleText = this.add.text(cx, TITLE_Y, 'PAUSED', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '22px', fontStyle: 'bold',
      color: '#c9a227', letterSpacing: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH).setAlpha(0);

    const sepG = this.add.graphics().setScrollFactor(0).setDepth(DEPTH).setAlpha(0);
    sepG.lineStyle(1, 0x2a3a4a, 0.8);
    sepG.lineBetween(cx - PANEL_W / 2 + 20, SEP_Y, cx + PANEL_W / 2 - 20, SEP_Y);
    
    // ── Tab bar (clickable ◀ GENERAL ▶ ◀ STATS ▶ ◀ SETTINGS ▶) ────────
    const TAB_Y = SEP_Y + 6;
    const tabSpacing = 110;
    const tabStartX = cx - ((TABS.length - 1) * tabSpacing) / 2;
    const tabObjs = [];
    const tabTexts = [];
    
    // Tab left/right indicator arrows
    const tabArrowL = this.add.text(tabStartX - 30, TAB_Y, '◀', {
      fontFamily: 'Consolas, monospace', fontSize: '14px', color: '#5a7a8a',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0).setInteractive({ useHandCursor: true });
    const tabArrowR = this.add.text(tabStartX + (TABS.length - 1) * tabSpacing + 30, TAB_Y, '▶', {
      fontFamily: 'Consolas, monospace', fontSize: '14px', color: '#5a7a8a',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0).setInteractive({ useHandCursor: true });
    
    for (let t = 0; t < TABS.length; t++) {
      const tx = tabStartX + t * tabSpacing;
      const tt = this.add.text(tx, TAB_Y, TABS[t], {
        fontFamily: 'Consolas, monospace', fontSize: '12px', fontStyle: 'bold',
        color: t === activeTab ? '#c9a227' : '#4a5a6a',
      }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0).setInteractive({ useHandCursor: true });
      tt.on('pointerdown', () => switchPauseTab(t));
      tabTexts.push(tt);
      tabObjs.push(tt);
    }
    
    // Tab content separators (below tabs)
    const tabSepG = this.add.graphics().setScrollFactor(0).setDepth(DEPTH).setAlpha(0);
    tabSepG.lineStyle(1, 0x2a3a4a, 0.5);
    tabSepG.lineBetween(cx - PANEL_W / 2 + 20, TAB_Y + 10, cx + PANEL_W / 2 - 20, TAB_Y + 10);
    
    tabObjs.push(tabArrowL, tabArrowR, tabSepG);
    
    // ── Tab content containers (all created, visibility toggled) ────────────
    let tabContentGroups = [[], [], []];
    let btns = [];
    
    // Helper to clear active tab content
    function clearTabContent(idx) {
      tabContentGroups[idx].forEach(o => { try { o.destroy(); } catch(_) {} });
      tabContentGroups[idx] = [];
    }
    
    // ── Switch tab function ─────────────────────────────────────────────
    const switchPauseTab = (newTab) => {
      activeTab = newTab;
      this._currentPauseTab = activeTab;
      
      // Update tab text colors
      tabTexts.forEach((t, i) => {
        t.setColor(i === activeTab ? '#c9a227' : '#4a5a6a');
      });
      
      // Clear all tab content
      clearTabContent(0);
      clearTabContent(1);
      clearTabContent(2);
      
      // Build the active tab's content
      buildTabContent(activeTab);
    };
    
    tabArrowL.on('pointerdown', () => {
      switchPauseTab((activeTab - 1 + TABS.length) % TABS.length);
    });
    tabArrowR.on('pointerdown', () => {
      switchPauseTab((activeTab + 1) % TABS.length);
    });
    
    // ── Build tab content function ──────────────────────────────────────
    const buildTabContent = (tabIdx) => {
      const CONTENT_Y = TAB_Y + 18;
      let sy = CONTENT_Y;
      const sAdd = (obj) => { tabContentGroups[tabIdx].push(obj); return obj; };
      
      // Helper: section header
      const secHeader = (label) => {
        sAdd(this.add.text(cx - 380, sy, label, {
          fontFamily: 'Consolas, monospace', fontSize: '10px',
          fontStyle: 'bold', color: '#3d5a6a', letterSpacing: 1,
        }).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 2));
        sy += 14;
      };
      
      // Helper: stat row
      const statRow = (label, value, valColor = '#c0d8e8') => {
        sAdd(this.add.text(cx - 380, sy, label, {
          fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#6a8a9a',
        }).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 2));
        sAdd(this.add.text(cx + 380, sy, String(value), {
          fontFamily: 'Consolas, monospace', fontSize: '12px', color: valColor,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH + 2));
        sy += 16;
      };
      
      // Helper: thin divider
      const divider = () => {
        const g = this.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2);
        g.lineStyle(1, 0x1a2a3a, 1);
        g.lineBetween(cx - 380, sy, cx + 380, sy);
        sAdd(g);
        sy += 7;
      };
      
      if (tabIdx === 0) {
        // ── TAB: GENERAL (buttons) ──────────────────────────────────────
        const btnDefs = [
          { label: '▸ RESUME',    hint: '(ESC)',  accent: 0x5eff90, action: 'resume',   primary: true },
          { label: 'SAVE GAME', hint: '',       accent: 0x2ecc71, action: 'save' },
          { label: 'UNSTUCK',   hint: '(E)',    accent: 0x7ab8f5, action: 'unstuck' },
          { label: 'MAIN MENU', hint: '(HOME)', accent: 0xe07030, action: 'mainMenu' },
        ];
        
        const BTN_X = cx;
        const BTN_W2 = 500;
        const BTN_H2 = 46;
        const BTN_H_PRIMARY2 = 55;
        const BTN_START2 = CONTENT_Y + 10;
        const BTN_STRIDE2 = 54;
        
        btns = btnDefs.map((def, i) => {
          const btnH = def.primary ? BTN_H_PRIMARY2 : BTN_H2;
          const by = BTN_START2 + i * BTN_STRIDE2 + btnH / 2;
          
          const bg = this.add.rectangle(BTN_X, by, BTN_W2, btnH, 0x131c26)
            .setScrollFactor(0).setDepth(2503);
          const hoverLayer = this.add.rectangle(BTN_X, by, BTN_W2, btnH, 0x1a2840, 0)
            .setScrollFactor(0).setDepth(2503);
          
          let glowG = null;
          if (def.primary) {
            glowG = this.add.graphics().setScrollFactor(0).setDepth(2502);
            glowG.lineStyle(2, def.accent, 0.22);
            glowG.strokeRoundedRect(BTN_X - BTN_W2 / 2 - 2, by - btnH / 2 - 2, BTN_W2 + 4, btnH + 4, 4);
          }
          
          const accentG = this.add.graphics().setScrollFactor(0).setDepth(2504);
          accentG.fillStyle(def.accent, 1);
          accentG.fillRect(BTN_X - BTN_W2 / 2, by - btnH / 2, 4, btnH);
          
          const label = this.add.text(BTN_X - BTN_W2 / 2 + 18, by, def.label, {
            fontFamily: 'Consolas, monospace',
            fontSize: def.primary ? '16px' : '14px',
            fontStyle: 'bold', color: '#ffffff',
          }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2504);
          
          const hint = this.add.text(BTN_X + BTN_W2 / 2 - 10, by, def.hint, {
            fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#4a5a6a',
          }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(2504);
          
          const hit = this.add.rectangle(BTN_X, by, BTN_W2, btnH, 0x000000, 0)
            .setScrollFactor(0).setDepth(2505).setInteractive({ useHandCursor: true });
          
          hit.on('pointerover', () => {
            this.tweens.killTweensOf(hoverLayer);
            this.tweens.add({ targets: hoverLayer, alpha: 0.5, duration: 90, ease: 'Linear' });
          });
          hit.on('pointerout', () => {
            this.tweens.killTweensOf(hoverLayer);
            this.tweens.add({ targets: hoverLayer, alpha: 0, duration: 90, ease: 'Linear' });
          });
          hit.on('pointerdown', () => {
            if (def.action === 'resume') this.resumeGame();
            else if (def.action === 'save') this.saveGame(label);
            else if (def.action === 'unstuck') this.unstuckPlayer();
            else if (def.action === 'mainMenu') this.returnToMainMenu();
          });
          
          const result = { bg, hoverLayer, glowG, accentG, label, hint, hit };
          sAdd(bg); sAdd(hoverLayer); sAdd(glowG); sAdd(accentG); sAdd(label); sAdd(hint); sAdd(hit);
          if (glowG) sAdd(glowG);
          return result;
        });
        
      } else if (tabIdx === 1) {
        // ── TAB: STATS ──────────────────────────────────────────────────
        if (this.playerLevelSystem) {
          const bonuses   = this.playerLevelSystem.getBonusesSummary();
          const currentXP = this.playerLevelSystem.currentXP || 0;
          const xpNeeded  = this.playerLevelSystem.getXPRequiredForNextLevel?.() || 1;
          const xpPct     = Math.min(currentXP / xpNeeded, 1);
          const gpRaw     = this.playerController?.getGemPowerRaw?.() ?? 0;
          const gpMax     = this.playerController?.getGemPowerMax?.() ?? 0;
          const ue        = this.upgradeSystem?.getUpgradeEffects?.() ?? {};
          
          // Dig damage
          const cfgBaseDmg   = this.config?.baseDamage ?? 5;
          const pickaxeBase  = ue.pickaxeDamage || 0;
          const digBase      = pickaxeBase > 0 ? pickaxeBase : cfgBaseDmg;
          const levelMult    = this.playerLevelSystem.getMiningDamageMultiplier?.() ?? 1;
          const strengthAdd  = ue.digDamageAdditive || 0;
          const levelFlatAdd = this.playerLevelSystem.getMiningFlatDamageBonus?.() ?? 0;
          const totalDmg     = Math.max(1, Math.floor(digBase * levelMult + strengthAdd + levelFlatAdd));
          const totalAdditive = strengthAdd + levelFlatAdd;
          const cooldownMs   = this.upgradeSystem?.getEffectiveMineCooldown?.(this.config?.mineCooldownMs ?? 750)
                             ?? Math.max((this.config?.mineCooldownMs ?? 750) * (1 - (ue.mineCooldownReduction || 0)), 50);
          const dps          = totalDmg / (cooldownMs / 1000);
          
          // Level + XP bar
          sAdd(this.add.text(cx - 380, sy, `Lv ${bonuses.level}`, {
            fontFamily: 'Consolas, monospace', fontSize: '16px',
            fontStyle: 'bold', color: '#c9a227',
          }).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 2));
          
          const XP_BAR_W = 700;
          const XP_BAR_X = cx - 380 + 50;
          const xpBarG = this.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2);
          xpBarG.fillStyle(0x1a2a3a, 1);
          xpBarG.fillRoundedRect(XP_BAR_X, sy + 4, XP_BAR_W, 7, 2);
          xpBarG.fillStyle(0xc9a227, 1);
          xpBarG.fillRoundedRect(XP_BAR_X, sy + 4, Math.max(XP_BAR_W * xpPct, 3), 7, 2);
          sAdd(xpBarG);
          sAdd(this.add.text(cx + 380, sy + 1, `${currentXP}/${xpNeeded}`, {
            fontFamily: 'Consolas, monospace', fontSize: '10px', color: '#4a6070',
          }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH + 2));
          sy += 20;
          divider();
          
          statRow('DIG DAMAGE', String(totalDmg), '#ffcc44');
          statRow('DPS', dps.toFixed(1), '#ff9944');
          statRow('COOLDOWN', `${cooldownMs.toFixed(0)}ms`);
          if (totalAdditive > 0) statRow('  +FLAT DMG', `+${totalAdditive.toFixed(1)}`);
          if (levelMult > 1) statRow('  ×LEVEL MULT', `×${levelMult.toFixed(2)}`);
          divider();
          
          statRow('CRIT CHANCE', `${bonuses.criticalHitChance || 0}%`, bonuses.criticalHitChance > 0 ? '#ff8844' : '#6a8a9a');
          const critMult = (1.5 + (bonuses.criticalHitDamage ?? 0) / 100).toFixed(2);
          statRow('CRIT DAMAGE', bonuses.criticalHitChance > 0 ? `×${critMult}` : '—');
          divider();
          
          const totalSpdPct = (bonuses.globalMiningSpeed ?? 0)
                            + (bonuses.perLevelSpeed ?? 0)
                            + (bonuses.hardcapMiningSpeed ?? 0)
                            + Math.round((ue.mineCooldownReduction ?? 0) * 100);
          statRow('MINE SPEED', `+${totalSpdPct}%`, '#7ab8f5');
          if ((ue.walkSpeed ?? 0) > 0) statRow('WALK SPEED', `+${ue.walkSpeed}px/s`);
          if ((ue.levitationSpeed ?? 0) > 0) statRow('FLY SPEED', `+${ue.levitationSpeed}px/s`);
          divider();
          
          statRow('GEM POWER', `${gpRaw} / ${gpMax}`, gpRaw / Math.max(gpMax, 1) > 0.7 ? '#4ecb71' : '#7ab8f5');
          statRow('XP GAIN', `+${bonuses.xpMultiplier ?? 0}%`, '#c9a227');
          statRow('RESOURCE LUCK', `+${bonuses.resourceLuck ?? 0}%`);
          divider();
          
          // Next reward milestones
          const MILESTONE_LEVELS = [10,20,30,40,50,60,70,75,80,90,99];
          const MILESTONE_DESC = {
            10:'+5 GP Max', 20:'+10% XP', 30:'+5% Crit', 40:'+15% Crit Dmg',
            50:'+25 GP',    60:'+20% XP', 70:'+10% Speed', 75:'+50 GP',
            80:'+25% Dmg',  90:'+15% Speed', 99:'LEGENDARY',
          };
          const nextMil = MILESTONE_LEVELS.find(lv => lv > bonuses.level);
          if (nextMil) statRow(`Next: Lv ${nextMil}`, MILESTONE_DESC[nextMil] || '?', '#4ecb71');
          
          const nextChoiceLv = Math.ceil((bonuses.level + 1) / 5) * 5;
          if (nextChoiceLv > bonuses.level)
            statRow(`Next: Lv ${nextChoiceLv}`, '+Mining / +Luck choice', '#7ab8f5');
        }
      } else if (tabIdx === 2) {
        // ── TAB: SETTINGS ────────────────────────────────────────────────
        const rows = [
          { label: 'Music', key: 'musicEnabled' },
          { label: 'SFX', key: 'sfxEnabled' },
        ];
        
        rows.forEach((row, i) => {
          const ry = CONTENT_Y + 30 + i * 50;
          const isOn = USER_SETTINGS.getAudio()[row.key] !== false;
          
          sAdd(this.add.text(cx - 300, ry, row.label, {
            fontFamily: 'Consolas, monospace', fontSize: '16px', color: '#ffffff',
          }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH + 2));
          
          // ON button
          const onBg = this.add.rectangle(cx - 80, ry, 90, 36, isOn ? 0x1a3a1a : 0x131c26)
            .setScrollFactor(0).setDepth(DEPTH + 2);
          const onTxt = this.add.text(cx - 80, ry, 'ON', {
            fontFamily: 'Consolas, monospace', fontSize: '14px', fontStyle: 'bold',
            color: isOn ? '#4ecb71' : '#4a5a6a',
          }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
          const onHit = this.add.rectangle(cx - 80, ry, 90, 36, 0, 0)
            .setScrollFactor(0).setDepth(DEPTH + 3).setInteractive({ useHandCursor: true });
          
          // OFF button
          const offBg = this.add.rectangle(cx + 30, ry, 90, 36, !isOn ? 0x3a1a1a : 0x131c26)
            .setScrollFactor(0).setDepth(DEPTH + 2);
          const offTxt = this.add.text(cx + 30, ry, 'OFF', {
            fontFamily: 'Consolas, monospace', fontSize: '14px', fontStyle: 'bold',
            color: !isOn ? '#e07030' : '#4a5a6a',
          }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
          const offHit = this.add.rectangle(cx + 30, ry, 90, 36, 0, 0)
            .setScrollFactor(0).setDepth(DEPTH + 3).setInteractive({ useHandCursor: true });
          
          const refresh = (nowOn) => {
            USER_SETTINGS.updateAudio({ [row.key]: nowOn });
            USER_SETTINGS.applyAudioTo(this.soundSystem);
            this.uiMuteToggle?.syncMusicState(USER_SETTINGS.getAudio().musicEnabled);
            this.uiMuteToggle?.syncSfxState(USER_SETTINGS.getAudio().sfxEnabled);
            onBg.setFillStyle(nowOn ? 0x1a3a1a : 0x131c26);
            offBg.setFillStyle(!nowOn ? 0x3a1a1a : 0x131c26);
            onTxt.setColor(nowOn ? '#4ecb71' : '#4a5a6a');
            offTxt.setColor(!nowOn ? '#e07030' : '#4a5a6a');
          };
          
          onHit.on('pointerdown', () => refresh(true));
          offHit.on('pointerdown', () => refresh(false));
          
          sAdd(onBg); sAdd(onTxt); sAdd(onHit);
          sAdd(offBg); sAdd(offTxt); sAdd(offHit);
        });
      }
    };
    
    // Build initial tab (GENERAL)
    buildTabContent(0);
    
    this._pausePanel = { backdrop, panelG, titleText, sepG, tabObjs, tabTexts, switchPauseTab, tabContentGroups, btns, activeTab };

    // Fade-in
    this.tweens.add({ targets: backdrop, alpha: 0.72, duration: 180, ease: 'Power1.out' });
    const panelObjs = [panelG, titleText, sepG, ...tabObjs];
    this.tweens.add({
      targets: panelObjs,
      alpha: 1, duration: 220, ease: 'Power2.out', delay: 30,
    });
    
    // Keyboard shortcuts for tab switching
    this.input.keyboard.on('keydown-LEFT', () => {
      if (this._pausePanel) {
        this._pausePanel.switchPauseTab((this._currentPauseTab - 1 + TABS.length) % TABS.length);
      }
    });
    this.input.keyboard.on('keydown-RIGHT', () => {
      if (this._pausePanel) {
        this._pausePanel.switchPauseTab((this._currentPauseTab + 1) % TABS.length);
      }
    });
  };
  
  prototype._legacyHidePauseMenu_DISABLED = function() {
    this._legacyHidePauseSettings_DISABLED();
    if (!this._pausePanel) return;
    const p = this._pausePanel;
    this._pausePanel = null;

    // Remove keyboard listeners
    this.input.keyboard.removeAllListeners('keydown-LEFT');
    this.input.keyboard.removeAllListeners('keydown-RIGHT');

    const collectObjs = () => {
      const objs = [
        p.backdrop, p.panelG, p.titleText, p.sepG, ...p.tabObjs,
        ...p.btns.flatMap(b => [b.bg, b.accentG, b.label, b.hint, b.glowG, b.hoverLayer].filter(Boolean)),
      ];
      for (let i = 0; i < 3; i++) {
        objs.push(...p.tabContentGroups[i]);
      }
      return objs.filter(Boolean);
    };
    
    const allObjs = collectObjs();
    this.tweens.add({
      targets: allObjs,
      alpha: 0,
      duration: 150,
      ease: 'Power1.in',
      onComplete: () => {
        allObjs.forEach(o => { try { o?.destroy(); } catch (_) {} });
        p.btns.forEach(b => { try { b.hit?.destroy(); } catch (_) {} });
      },
    });
  };

  prototype._legacyHidePauseSettings_DISABLED = function() {
    if (!this._pauseSettingsPanel) return;
    const objs = this._pauseSettingsPanel;
    this._pauseSettingsPanel = null;
    this.tweens.add({
      targets: objs,
      alpha: 0,
      duration: 130,
      ease: 'Power1.in',
      onComplete: () => objs.forEach(o => { try { o?.destroy(); } catch (_) {} }),
    });
  };

  prototype._legacyTogglePauseSettings_DISABLED = function() {
    if (this._pauseSettingsPanel) { this._legacyHidePauseSettings_DISABLED(); return; }

    const W = this.config.viewportWidth;
    const H = this.config.viewportHeight;
    const cx = W / 2;
    const pw = 460, ph = 150;
    const py = H / 2 + 230; // below the pause panel

    const panelG = this.add.graphics().setScrollFactor(0).setDepth(2600).setAlpha(0);
    panelG.fillStyle(0x0d1117, 1);
    panelG.fillRoundedRect(cx - pw / 2, py - ph / 2, pw, ph, 6);
    panelG.lineStyle(2, 0xc9a227, 1);
    panelG.strokeRoundedRect(cx - pw / 2, py - ph / 2, pw, ph, 6);

    const titleT = this.add.text(cx, py - ph / 2 + 16, 'SETTINGS', {
      fontFamily: 'Consolas, monospace', fontSize: '13px', fontStyle: 'bold', color: '#c9a227',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(2601).setAlpha(0);

    const objs = [panelG, titleT];

    const rows = [
      { label: 'Music', key: 'musicEnabled' },
      { label: 'SFX', key: 'sfxEnabled' },
    ];

    rows.forEach((row, i) => {
      const ry = py - ph / 2 + 52 + i * 46;
      const isOn = USER_SETTINGS.getAudio()[row.key] !== false;

      const lbl = this.add.text(cx - 140, ry, row.label, {
        fontFamily: 'Consolas, monospace', fontSize: '14px', color: '#ffffff',
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2601).setAlpha(0);

      // ON button
      const onBg = this.add.rectangle(cx + 30, ry, 70, 32, isOn ? 0x1a3a1a : 0x131c26)
        .setScrollFactor(0).setDepth(2601).setAlpha(0);
      const onG = this.add.graphics().setScrollFactor(0).setDepth(2602).setAlpha(0);
      const onTxt = this.add.text(cx + 30, ry, 'ON', {
        fontFamily: 'Consolas, monospace', fontSize: '12px', fontStyle: 'bold',
        color: isOn ? '#4ecb71' : '#4a5a6a',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2602).setAlpha(0);
      const onHit = this.add.rectangle(cx + 30, ry, 70, 32, 0, 0)
        .setScrollFactor(0).setDepth(2603).setInteractive({ useHandCursor: true });

      // OFF button
      const offBg = this.add.rectangle(cx + 115, ry, 70, 32, !isOn ? 0x3a1a1a : 0x131c26)
        .setScrollFactor(0).setDepth(2601).setAlpha(0);
      const offG = this.add.graphics().setScrollFactor(0).setDepth(2602).setAlpha(0);
      const offTxt = this.add.text(cx + 115, ry, 'OFF', {
        fontFamily: 'Consolas, monospace', fontSize: '12px', fontStyle: 'bold',
        color: !isOn ? '#e07030' : '#4a5a6a',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2602).setAlpha(0);
      const offHit = this.add.rectangle(cx + 115, ry, 70, 32, 0, 0)
        .setScrollFactor(0).setDepth(2603).setInteractive({ useHandCursor: true });

      const drawBorders = (nowOn) => {
        onG.clear();
        onG.lineStyle(1, nowOn ? 0x4ecb71 : 0x2a3a4a, 1);
        onG.strokeRect(cx + 30 - 35, ry - 16, 70, 32);
        offG.clear();
        offG.lineStyle(1, !nowOn ? 0xe07030 : 0x2a3a4a, 1);
        offG.strokeRect(cx + 115 - 35, ry - 16, 70, 32);
      };
      drawBorders(isOn);

      const refresh = (nowOn) => {
        USER_SETTINGS.updateAudio({ [row.key]: nowOn });
        USER_SETTINGS.applyAudioTo(this.soundSystem);
        this.uiMuteToggle?.syncMusicState(USER_SETTINGS.getAudio().musicEnabled);
        this.uiMuteToggle?.syncSfxState(USER_SETTINGS.getAudio().sfxEnabled);
        onBg.setFillStyle(nowOn ? 0x1a3a1a : 0x131c26);
        offBg.setFillStyle(!nowOn ? 0x3a1a1a : 0x131c26);
        onTxt.setColor(nowOn ? '#4ecb71' : '#4a5a6a');
        offTxt.setColor(!nowOn ? '#e07030' : '#4a5a6a');
        drawBorders(nowOn);
      };

      onHit.on('pointerdown',  () => refresh(true));
      offHit.on('pointerdown', () => refresh(false));

      objs.push(lbl, onBg, onG, onTxt, onHit, offBg, offG, offTxt, offHit);
    });

    this._pauseSettingsPanel = objs;

    // Slide-in animation: alpha + slight y slide for non-Graphics
    this.tweens.add({ targets: objs, alpha: 1, duration: 180, ease: 'Power2.out' });
    const slidables = objs.filter(o => !(o instanceof Phaser.GameObjects.Graphics));
    slidables.forEach(o => { o.y += 8; });
    this.tweens.add({ targets: slidables, y: '-=8', duration: 180, ease: 'Power2.out' });
  };

  // Unified pause menu implementation.
  prototype.showPauseMenu = function() {
    if (this._pausePanel) return;
    this.gameState = "paused";
    this.playerController.setControlsEnabled(false);

    const W = this.config.viewportWidth;
    const H = this.config.viewportHeight;
    const cx = W / 2;
    const cy = H / 2;
    const PANEL_W = Math.min(W - 80, 860);
    const PANEL_H = Math.min(H - 120, 540);
    const SETTINGS_WIDTH = Math.min(PANEL_W - 120, 760);
    const SETTINGS_HEIGHT = Math.min(PANEL_H - 140, 420);
    const SETTINGS_COMPACT = SETTINGS_WIDTH < 680;
    const PANEL_Y = cy + 10;
    const DEPTH = 2500;
    const tabsDef = ['GENERAL', 'STATS', 'SETTINGS'];

    const backdrop = this.add.rectangle(cx, cy, W, H, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setInteractive();

    const panel = createPanel(this, {
      x: cx,
      y: PANEL_Y,
      width: PANEL_W,
      height: PANEL_H,
      title: 'PAUSED',
      depth: DEPTH + 1,
      accent: UI_COLORS.borderSel,
    });
    panel.root.setAlpha(0);

    const state = {
      activeTab: 0,
      contentObjects: [],
      contentControls: [],
      focus: null,
      tabs: null,
      hint: null,
    };
    this._currentPauseTab = 0;

    const clearContent = () => {
      state.contentControls.forEach(control => control?.destroy?.());
      state.contentObjects.forEach(obj => { try { obj?.destroy?.(); } catch (_) {} });
      state.contentControls = [];
      state.contentObjects = [];
    };

    const addText = (x, y, text, style = {}, origin = [0, 0]) => {
      const obj = this.add.text(x, y, text, {
        fontFamily: style.fontFamily || 'Consolas, monospace',
        fontSize: style.fontSize || '12px',
        fontStyle: style.fontStyle || 'normal',
        color: style.color || UI_COLORS.body,
        align: style.align || 'left',
        lineSpacing: style.lineSpacing || 0,
      }).setOrigin(origin[0], origin[1]);
      panel.root.add(obj);
      state.contentObjects.push(obj);
      return obj;
    };

    const addDivider = (y) => {
      const g = this.add.graphics();
      g.lineStyle(1, UI_COLORS.borderDim, 0.75);
      g.lineBetween(-PANEL_W / 2 + 34, y, PANEL_W / 2 - 34, y);
      panel.root.add(g);
      state.contentObjects.push(g);
      return g;
    };

    const statRow = (y, label, value, color = UI_COLORS.body) => {
      addText(-PANEL_W / 2 + 48, y, label, { fontSize: '12px', color: UI_COLORS.hint });
      addText(PANEL_W / 2 - 48, y, String(value), { fontSize: '12px', color }, [1, 0]);
    };

    const buildStats = () => {
      if (!this.playerLevelSystem) {
        addText(0, -120, 'Stats unavailable', { fontSize: '15px', color: UI_COLORS.dim }, [0.5, 0]);
        return;
      }

      const bonuses = this.playerLevelSystem.getBonusesSummary();
      const currentXP = this.playerLevelSystem.currentXP || 0;
      const xpNeeded = this.playerLevelSystem.getXPRequiredForNextLevel?.() || 1;
      const xpPct = Math.min(currentXP / xpNeeded, 1);
      const gpRaw = this.playerController?.getGemPowerRaw?.() ?? 0;
      const gpMax = this.playerController?.getGemPowerMax?.() ?? 0;
      const ue = this.upgradeSystem?.getUpgradeEffects?.() ?? {};
      const cfgBaseDmg = this.config?.baseDamage ?? 5;
      const pickaxeBase = ue.pickaxeDamage || 0;
      const digBase = pickaxeBase > 0 ? pickaxeBase : cfgBaseDmg;
      const levelMult = this.playerLevelSystem.getMiningDamageMultiplier?.() ?? 1;
      const strengthAdd = ue.digDamageAdditive || 0;
      const levelFlatAdd = this.playerLevelSystem.getMiningFlatDamageBonus?.() ?? 0;
      const totalDmg = Math.max(1, Math.floor(digBase * levelMult + strengthAdd + levelFlatAdd));
      const cooldownMs = this.upgradeSystem?.getEffectiveMineCooldown?.(this.config?.mineCooldownMs ?? 750)
        ?? Math.max((this.config?.mineCooldownMs ?? 750) * (1 - (ue.mineCooldownReduction || 0)), 50);
      const dps = totalDmg / (cooldownMs / 1000);
      const totalSpdPct = (bonuses.globalMiningSpeed ?? 0)
        + (bonuses.perLevelSpeed ?? 0)
        + (bonuses.hardcapMiningSpeed ?? 0)
        + Math.round((ue.mineCooldownReduction ?? 0) * 100);

      addText(-PANEL_W / 2 + 48, -132, `LV ${bonuses.level}`, {
        fontSize: '16px',
        fontStyle: 'bold',
        color: UI_COLORS.gold,
      });
      const xpG = this.add.graphics();
      xpG.fillStyle(0x1a2a3a, 1);
      xpG.fillRoundedRect(-270, -127, 530, 8, 3);
      xpG.fillStyle(UI_COLORS.borderSel, 1);
      xpG.fillRoundedRect(-270, -127, Math.max(530 * xpPct, 4), 8, 3);
      panel.root.add(xpG);
      state.contentObjects.push(xpG);
      addText(PANEL_W / 2 - 48, -134, `${currentXP}/${xpNeeded} XP`, { fontSize: '11px', color: UI_COLORS.dim }, [1, 0]);
      addDivider(-102);

      const rows = [
        ['DIG DAMAGE', totalDmg, '#ffcc44'],
        ['DPS', dps.toFixed(1), '#ff9944'],
        ['COOLDOWN', `${cooldownMs.toFixed(0)}ms`, UI_COLORS.body],
        ['CRIT CHANCE', `${bonuses.criticalHitChance || 0}%`, bonuses.criticalHitChance > 0 ? '#ff8844' : UI_COLORS.hint],
        ['CRIT DAMAGE', bonuses.criticalHitChance > 0 ? `x${(1.5 + (bonuses.criticalHitDamage ?? 0) / 100).toFixed(2)}` : '-', UI_COLORS.body],
        ['MINE SPEED', `+${totalSpdPct}%`, UI_COLORS.info],
        ['GEM POWER', `${gpRaw} / ${gpMax}`, gpRaw / Math.max(gpMax, 1) > 0.7 ? UI_COLORS.success : UI_COLORS.info],
        ['XP GAIN', `+${bonuses.xpMultiplier ?? 0}%`, UI_COLORS.gold],
        ['RESOURCE LUCK', `+${bonuses.resourceLuck ?? 0}%`, UI_COLORS.body],
      ];
      rows.forEach((row, i) => statRow(-80 + i * 25, row[0], row[1], row[2]));

      const milestoneLevels = [10,20,30,40,50,60,70,75,80,90,99];
      const milestoneDesc = {
        10:'+5 GP Max', 20:'+10% XP', 30:'+5% Crit', 40:'+15% Crit Dmg',
        50:'+25 GP', 60:'+20% XP', 70:'+10% Speed', 75:'+50 GP',
        80:'+25% Dmg', 90:'+15% Speed', 99:'LEGENDARY',
      };
      const nextMil = milestoneLevels.find(lv => lv > bonuses.level);
      if (nextMil) statRow(158, `NEXT MILESTONE LV ${nextMil}`, milestoneDesc[nextMil] || '?', UI_COLORS.success);
    };

    const buildContent = (tabIdx) => {
      clearContent();
      state.activeTab = tabIdx;
      this._currentPauseTab = tabIdx;
      state.tabs?.setActive(tabIdx, true);

      if (tabIdx === 0) {
        const defs = [
          { label: 'RESUME', hint: `${USER_SETTINGS.getKeyLabel("pause")} / ESC`, accent: UI_COLORS.borderGood, action: () => this.resumeGame(), primary: true },
          { label: 'SAVE GAME', hint: '', accent: UI_COLORS.borderGood, action: null },
          { label: 'UNSTUCK', hint: USER_SETTINGS.getKeyLabel("interact"), accent: 0x7ab8f5, action: () => this.unstuckPlayer() },
          { label: 'MAIN MENU', hint: USER_SETTINGS.getKeyLabel("mainMenu"), accent: UI_COLORS.borderBad, action: () => this.returnToMainMenu() },
        ];
        defs.forEach((def, i) => {
          let button;
          button = createButton(this, {
            x: 0,
            y: -102 + i * 58,
            width: def.primary ? 540 : 500,
            height: def.primary ? 52 : 46,
            label: def.label,
            hint: def.hint,
            accent: def.accent,
            fontSize: def.primary ? '16px' : '14px',
            align: 'left',
            parent: panel.root,
            onFocus: () => state.focus?.setIndex?.(i),
            onClick: () => {
              if (def.label === 'SAVE GAME') {
                this.saveGame({ setText: value => button.setLabel(value) });
              } else {
                def.action?.();
              }
            },
          });
          state.contentControls.push(button);
        });
      } else if (tabIdx === 1) {
        buildStats();
      } else {
          const settingsContent = createSettingsPanelContent(this, {
            x: 0,
            y: 42,
            width: SETTINGS_WIDTH,
            height: SETTINGS_HEIGHT,
            parent: panel.root,
            depth: DEPTH + 3,
            soundSystem: this.soundSystem,
            inputHandler: this.inputHandler,
            uiMuteToggle: this.uiMuteToggle,
            manageFocus: true,
            compact: SETTINGS_COMPACT,
            onCancel: () => this.resumeGame(),
          });
        state.contentObjects.push(settingsContent);
      }

      state.focus?.setItems(state.contentControls, 0);
    };

    state.tabs = createTabBar(this, {
      x: 0,
      y: -PANEL_H / 2 + 82,
      tabs: tabsDef,
      activeIndex: 0,
      parent: panel.root,
      onChange: buildContent,
    });

    state.hint = createHintLegend(this, {
      x: 0,
      y: PANEL_H / 2 - 26,
      text: 'WASD / ARROWS — navigate     ENTER / SPACE — select     ESC — resume',
      parent: panel.root,
    });

    state.focus = createFocusController(this, {
      items: [],
      enabled: () => Boolean(this._pausePanel) && !this._settingsKeyCaptureActive,
      onCancel: () => this.resumeGame(),
      onHorizontal: (dir) => {
        if (state.activeTab === 2) return;
        const next = (state.activeTab + dir + tabsDef.length) % tabsDef.length;
        state.tabs.setActive(next);
      },
    });

    this._pausePanel = { backdrop, panel, state };
    buildContent(0);

    this.tweens.add({ targets: backdrop, alpha: 0.72, duration: 180, ease: 'Power1.out' });
    this.tweens.add({ targets: panel.root, alpha: 1, duration: 220, ease: 'Power2.out', delay: 30 });
  };

  prototype.hidePauseMenu = function() {
    if (!this._pausePanel) return;
    const p = this._pausePanel;
    this._pausePanel = null;

    p.state?.focus?.destroy?.();
    p.state?.contentControls?.forEach(control => {
      try { control?.destroy?.(); } catch (_) {}
    });
    p.state?.contentObjects?.forEach(obj => {
      try { obj?.destroy?.(); } catch (_) {}
    });
    if (p.state) {
      p.state.contentControls = [];
      p.state.contentObjects = [];
    }

    this.tweens.killTweensOf([p.backdrop, p.panel.root]);
    this.tweens.add({
      targets: [p.backdrop, p.panel.root],
      alpha: 0,
      duration: 150,
      ease: 'Power1.in',
      onComplete: () => {
        p.backdrop?.destroy();
        p.panel?.destroy();
      },
    });
  };

  prototype.closeTopOverlay = function(reason = "escape") {
    if (this._settingsKeyCaptureActive) return false;

    if (this.depthGateSystem?.isOpen?.()) {
      this.depthGateSystem._decline?.();
      return true;
    }

    if (this.levelUpPopup?.visible) {
      if (this.levelUpPopup.pendingChoice) {
        this.hudSystem?.flashStatus?.("Choose a reward to continue", "#e4ba78", 1400);
        this.soundSystem?.playUiSelect?.();
      } else {
        this.levelUpPopup.clickedChoice = "continue";
        this.soundSystem?.playUiConfirm?.();
      }
      return true;
    }

    if (this.shopOverlay?.isVisible) {
      this.soundSystem?.playUiConfirm?.();
      this.shopOverlay.hide?.();
      return true;
    }

    if (this.campfireSystem?.isSelecting?.()) {
      this.campfireSystem._closeBuffSelection?.();
      return true;
    }

    if (this.milestoneBoardSystem?._isBoardOpen) {
      this.milestoneBoardSystem._closeBoardView?.();
      return true;
    }

    if (this._pillarViewActive && this.starPillarSystem) {
      this.starPillarSystem.closeConstellationView?.();
      return true;
    }

    if (this.uiInventoryPopup?.isOpen) {
      this.uiInventoryPopup.close?.();
      return true;
    }

    if (this._pausePanel || this.gameState === "paused") {
      this.resumeGame?.();
      return true;
    }

    return false;
  };

  prototype.saveGame = async function(labelObj) {
    if (labelObj) labelObj.setText('SAVING...');
    this.queueDugTilesSave();
    try {
      await this.flushDugTilesSave();
      this.hudSystem?.flashStatus('Game saved!', '#2ecc71', 2000);
    } catch (_) {
      this.hudSystem?.flashStatus('Save failed!', '#ff6b6b', 2000);
    } finally {
      if (labelObj) labelObj.setText('SAVE GAME');
    }
  };

  prototype.resumeGame = function() {
    this.gameState = "playing";
    this.hidePauseMenu();
    this.playerController.setControlsEnabled(true);
  };

  prototype._resetPlayerToSpawn = function() {
    const ts = this.config.tileSize;
    const spawnTx = Number.isFinite(this.config.playerSpawnTileX) ? this.config.playerSpawnTileX : this.config.spawnTileX;
    const spawnTy = Number.isFinite(this.config.playerSpawnTileY) ? this.config.playerSpawnTileY : this.config.spawnTileY;
    const spawnWx = spawnTx * ts + ts / 2;
    const spawnWy = (spawnTy + 1) * ts;
    if (this.playerController) {
      this.playerController.teleportToTile(spawnTx, spawnTy);
    }
    if (this.player) {
      this.player.setPosition(spawnWx, spawnWy);
    }
  };

  prototype.returnToMainMenu = async function() {
    this.hidePauseMenu();
    this.gameState = "transitioning";
    this.queueDugTilesSave();
    try { await this.flushDugTilesSave(); } catch (_) {}
    this.scene.start("MainMenuScene");
  };

  prototype.unstuckPlayer = function() {
    this._resetPlayerToSpawn();
    this.resumeGame();
    this.hudSystem.flashStatus("Unstuck — returned to spawn", "#9de3a1", UI_CONFIG.flashUnstuck);
  };

  prototype.enterTitleState = function() {
    this.gameState = "title";
    this.playerController.setControlsEnabled(false);
    this.isDigAnimating = false;
    this.aimBox.setVisible(false);
    this.hideOverlay();

    // Show XP progress bar
    this.xpProgressBar?.show();

    const welcome = this._generateWelcomeMessage();
    this.showOverlay(welcome.title, welcome.body);
    this.hudSystem.flashStatus(welcome.status, welcome.statusColor, UI_CONFIG.flashWelcome);
  };

  prototype.startRun = function() {
    this.gameState = "playing";
    this.hideOverlay();
    this.playerController.setControlsEnabled(true);
    this.activeImpactFx = 0;
    this.lastAimTileKey = "";
    this._lowGemPowerWarned = false;
    this._resetPlayerToSpawn();
    this.hudSystem.flashStatus("Run started", "#9de3a1", UI_CONFIG.flashRunStarted);

    // Show XP progress bar
    this.xpProgressBar?.show();

    if (this.soundSystem) {
      this.soundSystem.startAudioAfterUserGesture();
    }
  };

  prototype.enterDeathState = function(depth) {
    this.hidePauseMenu?.();
    if (this.gameState !== "playing") return;

    this.lightSystem?.forceTorchOff();
    this.gameState = "dead";
    this.playerController.setControlsEnabled(false);
    this.isDigAnimating = false;
    this.player.anims.stop();
    this.aimBox.setVisible(false);

    const resources = this.digSystem.getResourceTotals();
    const body = [
      `You reached crush depth at ${depth} tiles.`,
      `Broken: ${this.digSystem.getTilesBroken()}  Au:${resources.gold} Ag:${resources.silver} Fe:${resources.iron} Bn:${resources.bronze} St:${resources.steel} Cu:${resources.copper} Stn:${resources.stone} Dt:${resources.dirt}`,
      `Press ${USER_SETTINGS.getKeyLabel("restart")} to restart instantly.`,
    ].join("\n");

    this.showOverlay("Run Over", body);
    this.hudSystem.flashStatus("Run over", "#ff8a8a", UI_CONFIG.flashRunOver);
  };

  prototype.restartRun = function() {
    this.queueDugTilesSave();
    this.scene.restart({ autoStart: true });
  };

  prototype.applyPersistentState = function(savedData, showStatus) {
    if (!savedData) return;

    if (savedData.updatedAt && savedData.updatedAt === this.lastAppliedSaveUpdatedAt) {
      return;
    }

    const appliedTiles = this.worldModel.applyDugTileKeys(savedData.dugTiles ?? []);
    for (const tile of appliedTiles) {
      this.worldRenderer.applyTileUpdate(tile.tx, tile.ty);
    }

    const appliedRubbleTiles = this.worldModel.applyRubbleTiles(savedData.rubbleTiles ?? []);
    for (const tile of appliedRubbleTiles) {
      this.worldRenderer.applyTileUpdate(tile.tx, tile.ty);
    }

    this.digSystem.setResourceTotals(savedData.resources);
    this.uiResourceBar?.setResources(this.digSystem.getResourceTotals());

    // Restore paired teleporter data (sky island teleporter tiles)
    if (savedData.specialTileData && this.specialTileSystem) {
      this.specialTileSystem.loadSaveData(savedData.specialTileData);
    }

    if (this.depthGateSystem) {
      this.depthGateSystem.loadSaveData(savedData.depthGateData);
    }

    if (savedData.upgrades) {
      this.upgradeSystem.fromJSON(savedData.upgrades);
    }
    this.surfaceTunnelDoorSystem?.syncFromUpgrade();

    // Restore day/night cycle state
    if (savedData.dayNightData && this.dayNightCycle) {
      this.dayNightCycle.fromJSON(savedData.dayNightData);
    }

    const resources = this.digSystem.getResourceTotals();
    if (showStatus && (appliedTiles.length > 0 || appliedRubbleTiles.length > 0 || resources.dirt > 0 || resources.stone > 0 || resources.copper > 0)) {
      this.hudSystem.flashStatus(
        `Loaded save: ${appliedTiles.length} dug, ${appliedRubbleTiles.length} rubble, Au:${resources.gold} Ag:${resources.silver} Fe:${resources.iron}`,
        "#9bc9ff",
        UI_CONFIG.flashLoadSave
      );
    }

    if (savedData.updatedAt) {
      this.lastAppliedSaveUpdatedAt = savedData.updatedAt;
    }
  };

  prototype.restorePersistentState = async function() {
    try {
      const worldIdentity = this.worldModel.getWorldIdentity();
      const savedData = await this.dugTileSaveStore.load(worldIdentity);
      this.applyPersistentState(savedData, true);
    } catch {
      // Silently continue if save restore fails.
    }
  };

  prototype.queueDugTilesSave = function() {
    this.pendingDugTileSave = true;

    if (this.savingDugTiles) {
      return;
    }

    this.flushDugTilesSave();
  };

  prototype.flushDugTilesSave = async function() {
    if (!this.pendingDugTileSave || this.savingDugTiles) {
      return;
    }

    this.pendingDugTileSave = false;
    this.savingDugTiles = true;

    try {
      const worldIdentity = this.worldModel.getWorldIdentity();
      const dugTileKeys = this.worldModel.getDugTileKeys();
      const rubbleTiles = this.worldModel.getRubbleTiles();
      const resources = this.digSystem.getResourceTotals();
      const upgrades = this.upgradeSystem.toJSON();
      const levelData = this.playerLevelSystem ? this.playerLevelSystem.toJSON() : null;
      const specialTileData = this.specialTileSystem ? this.specialTileSystem.getSaveData() : null;
      const depthGateData = this.depthGateSystem ? this.depthGateSystem.getSaveData() : null;
      const dayNightData = this.dayNightCycle?.toJSON?.() ?? null;
      await this.dugTileSaveStore.save(worldIdentity, dugTileKeys, resources, upgrades, levelData, specialTileData, depthGateData, dayNightData, rubbleTiles, this.playerCharacterId);
    } catch {
      // Keep game flow uninterrupted if save I/O fails.
    } finally {
      this.savingDugTiles = false;
    }

    if (this.pendingDugTileSave) {
      await this.flushDugTilesSave();
    }
  };
}
