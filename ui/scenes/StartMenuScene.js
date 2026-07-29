import { ASSET_KEYS } from "../../values/assetKeys.js";

import {
  DEFAULT_PLAYER_CHARACTER_ID,
  resolvePersistedPlayerCharacterId,
  resolvePlayerCharacterIdFromSearch,
} from "../../values/playerCharacters.js?rev=20260718";
import { UI_COLORS } from "../../values/uiColors.js";
import { SAVE_TRANSFER_UI, UI_FONTS } from "../../values/uiLayout.js?rev=20260727-save-transfer-v1";
import { createButton } from "../PhaserUiKit.js";
import { createManualSaveFilePicker } from "../components/manualSaveFilePicker.js";
import { DugTilesSaveStore } from "../../world/model/DugTilesSaveStore.js?rev=20260727-save-transfer-v1";
import { addMenuBackground, getSelectedMenuBackgroundKey } from "../components/LoadingScreenView.js";
import {
  isHardcoreMode,
  isHardcoreModeArmed,
  sanitizeHardcoreModeData,
} from "../../values/hardcoreMode.js";
import { StartModeSelectionOverlay } from "./StartModeSelectionOverlay.js";
import { StartTutorialChoiceOverlay } from "./StartTutorialChoiceOverlay.js";

const CARD_W = 290;
const CARD_H = 200;
const CARD_GAP = 24;
const CARDS_TOTAL_W = 3 * CARD_W + 2 * CARD_GAP;
const CARD_START_X = (1280 - CARDS_TOTAL_W) / 2; // 163
const CARD_CENTER_Y = 390;

const COL = {
  bg:         UI_COLORS.bg,
  overlay:    UI_COLORS.overlay,
  cardBase:   UI_COLORS.cardBase,
  cardHover:  UI_COLORS.cardHover,
  cardSel:    UI_COLORS.cardSel,
  borderDim:  UI_COLORS.borderDim,
  borderHov:  UI_COLORS.borderHov,
  borderSel:  UI_COLORS.borderSel,
  titleMain:  UI_COLORS.title,
  titleShadow:'#000000',
  gold:       UI_COLORS.gold,
  dim:        UI_COLORS.dim,
  blue:       UI_COLORS.info,
  green:      UI_COLORS.success,
  white:      UI_COLORS.white,
  hint:       UI_COLORS.hint,
  version:    UI_COLORS.dim,
  statGreen:  '#6ecf87',
  statBlue:   UI_COLORS.info,
  warning:    UI_COLORS.danger,
};

export class StartMenuScene extends Phaser.Scene {
  constructor() {
    super("StartMenuScene");
    this.selectedSlot = null;
    this._confirmPanel = null;
    this._confirmListening = false;
    this._confirmKeyAttachTimer = null;
    this._backupPanel = null;
    this._importPanel = null;
    this._saveTransferControls = [];
    this._pulseTween = null;
    this._isStartingGame = false;
    this._modeSelector = null;
    this._tutorialSelector = null;
  }

  async create() {
    this.ensureMenuAudioScene();
    this._isStartingGame = false;
    const W = this.scale.width;
    const H = this.scale.height;

    // --- Background ---
    this.add.rectangle(W / 2, H / 2, W, H, COL.bg);

    addMenuBackground(this, {
      width: W,
      height: H,
      key: getSelectedMenuBackgroundKey(),
      alpha: 0.26,
    });

    // Dark gradient overlay (top dark, bottom darker)
    const grad = this.add.graphics();
    grad.fillStyle(0x000000, 0.32);
    grad.fillRect(0, 0, W, H);

    // Subtle horizontal separator line
    const sepLine = this.add.graphics();
    sepLine.lineStyle(1, 0x2a3a4a, 0.6);
    sepLine.lineBetween(80, 200, W - 80, 200);

    // --- Title ---
    // Brand logo instead of text title
    const logo = this.add.image(W / 2, 85, ASSET_KEYS.branding.logo);
    const scale = Math.min(520 / logo.width, 160 / logo.height);
    logo.setScale(scale);

 
    // --- Load save data then build cards ---
    this.saveSlots = await this.loadSaveSlots();
    this._buildCards();
    this._animateCardEntry();
    this._buildSaveTransferControls(W);
    this._modeSelector = new StartModeSelectionOverlay(this);
    this._tutorialSelector = new StartTutorialChoiceOverlay(this);

    // --- Start prompt (shown below cards once a slot is selected) ---
    this._startPrompt = this.add.text(W / 2, SAVE_TRANSFER_UI.startMenu.startPromptY, 'SELECT  A  SLOT,  THEN  PRESS  SPACE  TO  START', {
      fontFamily: UI_FONTS.mono,
      fontSize: '16px',
      color: COL.dim,
    }).setOrigin(0.5);

    // Separator above controls
    const sepLine2 = this.add.graphics();
    sepLine2.lineStyle(1, 0x1e2a36, 1);
    sepLine2.lineBetween(80, SAVE_TRANSFER_UI.startMenu.dividerY, W - 80, SAVE_TRANSFER_UI.startMenu.dividerY);

    // --- Hint bar ---
    this.add.text(W / 2, SAVE_TRANSFER_UI.startMenu.hintY, '1 / 2 / 3: choose     SPACE: start     DEL: clear     B: backups     E: export     I: import     ESC: menu', {
      fontFamily: UI_FONTS.mono,
      fontSize: '12px',
      color: COL.hint,
    }).setOrigin(0.5);

    // --- Version ---
    this.add.text(W - 14, H - 10, 'v0.1-alpha', {
      fontFamily: UI_FONTS.mono,
      fontSize: '11px',
      color: COL.version,
    }).setOrigin(1, 1);

    this._setupInput();

    // Remove specific keyboard listeners on scene shutdown to prevent accumulation
    this.events.once('shutdown', () => {
      this.input.keyboard.off('keydown-ONE');
      this.input.keyboard.off('keydown-TWO');
      this.input.keyboard.off('keydown-THREE');
      this.input.keyboard.off('keydown-SPACE');
      this.input.keyboard.off('keydown-DELETE');
      this.input.keyboard.off('keydown-B');
      this.input.keyboard.off('keydown-E');
      this.input.keyboard.off('keydown-I');
      this.input.keyboard.off('keydown-ESC');
      this._modeSelector?.destroy();
      this._modeSelector = null;
      this._tutorialSelector?.destroy();
      this._tutorialSelector = null;
      this._closeConfirm();
      this._closeImportPanel();
    });
  }

  ensureMenuAudioScene() {
    if (!this.scene.isActive("MenuAudioScene")) {
      this.scene.launch("MenuAudioScene");
    }
    this.scene.get("MenuAudioScene")?.attachTo?.(this);
  }

  // ─── Save slot loading ───────────────────────────────────────────────────

  async loadSaveSlots() {
    const slots = [];
    for (let i = 1; i <= 3; i++) {
      try {
        const store = new DugTilesSaveStore({ slotId: i });
        const saveData = store.loadForDisplay();
        if (saveData && (saveData.dugTiles?.length > 0 || saveData.resources)) {
          slots.push({
            id: i,
            hasData: true,
            dugTiles: saveData.dugTiles?.length || 0,
            resources: saveData.resources || { dirt: 0, stone: 0, copper: 0 },
            updatedAt: saveData.updatedAt,
            playerCharacterId: saveData.playerCharacterId,
            level: saveData.levelData?.level || 1,
            currentDepth: saveData.retentionData?.stats?.currentDepth || 0,
            bestDepth: saveData.retentionData?.stats?.bestDepth || 0,
            wallet: saveData.upgrades?.money || 0,
            stars: saveData.retentionData?.stats?.starsCollected || 0,
            hardcoreModeData: sanitizeHardcoreModeData(saveData.hardcoreModeData),
          });
        } else {
          slots.push({
            id: i,
            hasData: false,
            dugTiles: 0,
            resources: { dirt: 0, stone: 0, copper: 0 },
            updatedAt: null,
            playerCharacterId: null,
            hardcoreModeData: sanitizeHardcoreModeData(null),
          });
        }
      } catch (_) {
        slots.push({
          id: i,
          hasData: false,
          dugTiles: 0,
          resources: { dirt: 0, stone: 0, copper: 0 },
          updatedAt: null,
          playerCharacterId: null,
          hardcoreModeData: sanitizeHardcoreModeData(null),
        });
      }
    }
    return slots;
  }

  // ─── Card building ───────────────────────────────────────────────────────

  _buildCards() {
    this._cardGraphics = [];
    this._cardObjects  = [];  // refs to all display objects per card (for cleanup)

    this.saveSlots.forEach((slot, i) => {
      const cx = CARD_START_X + i * (CARD_W + CARD_GAP) + CARD_W / 2;
      const cy = CARD_CENTER_Y;
      const objs = [];

      // Card background — drawn programmatically (no image dependency)
      const g = this.add.graphics();
      objs.push(g);
      this._updateCard(g, cx, cy, COL.cardBase, COL.borderDim);

      // Hit zone (invisible, interactive)
      const hit = this.add.rectangle(cx, cy, CARD_W, CARD_H, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      objs.push(hit);

      // Slot number label
      const slotLabel = this.add.text(cx - CARD_W / 2 + 20, cy - CARD_H / 2 + 18, `SLOT  ${slot.id}`, {
        fontFamily: UI_FONTS.mono,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#6a8a9a',
      });
      objs.push(slotLabel);

      // Divider
      const divG = this.add.graphics();
      divG.lineStyle(1, 0x2a3a4a, 0.7);
      divG.lineBetween(cx - CARD_W / 2 + 16, cy - CARD_H / 2 + 44, cx + CARD_W / 2 - 16, cy - CARD_H / 2 + 44);
      objs.push(divG);

      if (slot.hasData) {
        // Status — date
        const date = slot.updatedAt ? new Date(slot.updatedAt).toLocaleDateString() : 'Unknown date';
        const statusTxt = this.add.text(cx, cy - CARD_H / 2 + 18, `Last played: ${date}`, {
          fontFamily: UI_FONTS.mono,
          fontSize: '13px',
          color: UI_COLORS.gold,
        }).setOrigin(0.5, 0);
        objs.push(statusTxt);

        const modeIsHardcore = isHardcoreMode(slot.hardcoreModeData);
        const modeIsArmed = isHardcoreModeArmed(slot.hardcoreModeData);
        const modeTxt = this.add.text(
          cx,
          cy - 52,
          modeIsHardcore
            ? (modeIsArmed ? 'HARDCORE  •  OATH ARMED' : 'HARDCORE  •  ARMS AT FLIGHT')
            : 'CASUAL',
          {
            fontFamily: UI_FONTS.mono,
            fontSize: '12px',
            fontStyle: 'bold',
            color: modeIsHardcore ? '#ff7566' : '#72b9e8',
          },
        ).setOrigin(0.5);
        objs.push(modeTxt);

        // Tiles dug
        const tilesTxt = this.add.text(
          cx,
          cy + 7,
          `LV ${slot.level}  •  DEPTH ${slot.currentDepth}m / BEST ${slot.bestDepth}m`
            + `\n${Number(slot.wallet).toLocaleString()} M  •  ${slot.stars} stars`
            + `\n${slot.dugTiles.toLocaleString()} tiles dug`,
          {
          fontFamily: UI_FONTS.mono,
          fontSize: '13px',
          fontStyle: 'bold',
          color: COL.white,
          align: 'center',
          lineSpacing: 7,
        }).setOrigin(0.5, 0.5);
        objs.push(tilesTxt);


        // Continue indicator
        const contTxt = this.add.text(cx, cy + CARD_H / 2 - 30, '▶  CONTINUE', {
          fontFamily: UI_FONTS.mono,
          fontSize: '14px',
          color: '#4ecb71',
        }).setOrigin(0.5, 1);
        objs.push(contTxt);

      } else {
        // Empty slot
        const emptyLabel = this.add.text(cx, cy - 15, '＋', {
          fontFamily: UI_FONTS.display,
          fontSize: '30px',
          fontStyle: 'bold',
          color: '#2a4a5a',
        }).setOrigin(0.5);
        objs.push(emptyLabel);

        const newTxt = this.add.text(cx, cy + CARD_H / 2 - 30, '+  NEW SAVE', {
          fontFamily: UI_FONTS.mono,
          fontSize: '14px',
          color: '#7ab8f5',
        }).setOrigin(0.5, 1);
        objs.push(newTxt);
      }

      // Hover / click with scale animation
      hit.on('pointerover', () => {
        if (this.selectedSlot !== slot.id) {
          this.soundSystem?.playUiSelect?.();
          this._updateCard(g, cx, cy, COL.cardHover, COL.borderHov);
        }
      });
      hit.on('pointerout', () => {
        if (this.selectedSlot !== slot.id) {
          this._updateCard(g, cx, cy, COL.cardBase, COL.borderDim);
        }
      });
      hit.on('pointerdown', () => this._selectSlot(slot.id));

      this._cardGraphics.push({ g, cx, cy, slotId: slot.id });
      this._cardObjects.push(objs);
    });
  }

  _updateCard(g, cx, cy, fillHex, borderHex) {
    g.clear();

    const r = 10; // corner radius
    const x = cx - CARD_W / 2;
    const y = cy - CARD_H / 2;

    // Base fill
    g.fillStyle(fillHex, 1.0);
    g.fillRoundedRect(x, y, CARD_W, CARD_H, r);

    // Subtle inner highlight (top half lighter)
    g.fillStyle(0xFFFFFF, 0.04);
    g.fillRoundedRect(x + 2, y + 2, CARD_W - 4, CARD_H / 2, r);

    // Border
    g.lineStyle(2, borderHex, 0.9);
    g.strokeRoundedRect(x, y, CARD_W, CARD_H, r);

    // Extra inner glow border for selected state
    if (fillHex === COL.cardSel) {
      g.lineStyle(1, borderHex, 0.4);
      g.strokeRoundedRect(x + 3, y + 3, CARD_W - 6, CARD_H - 6, r - 2);
    }
  }

  _destroyCards() {
    this._cardObjects.forEach(objs => objs.forEach(o => o.destroy()));
    this._cardGraphics = [];
    this._cardObjects = [];
  }

  // ─── Selection ───────────────────────────────────────────────────────────

  _selectSlot(slotId) {
    this.soundSystem?.playUiSelect?.();

    // Stop existing pulse
    if (this._pulseTween) {
      this._pulseTween.stop();
      this._pulseTween = null;
    }

    this.selectedSlot = slotId;
    this._cardGraphics.forEach(({ g, cx, cy, slotId: id }) => {
      this.tweens.killTweensOf(g);
      if (id === slotId) {
        this._updateCard(g, cx, cy, COL.cardSel, COL.borderSel);
        g.setScale(1.0).setAlpha(1.0);
        // Gentle pulse on selected card
        this._pulseTween = this.tweens.add({
          targets: g,
          alpha: 0.82,
          yoyo: true,
          repeat: -1,
          duration: 680,
          ease: 'Sine.easeInOut',
        });
      } else {
        this._updateCard(g, cx, cy, COL.cardBase, COL.borderDim);
        g.setScale(1.0).setAlpha(1.0);
      }
    });

    // Animate the prompt text
    const selectedSave = this.saveSlots?.find((slot) => slot.id === slotId);
    this._startPrompt.setText(
      selectedSave?.hasData
        ? 'PRESS  SPACE  TO  CONTINUE'
        : 'PRESS  SPACE  TO  CHOOSE  SAVE  RULES',
    );
    this._startPrompt.setColor(COL.green);
    this.tweens.killTweensOf(this._startPrompt);
    this.tweens.add({ targets: this._startPrompt, alpha: { from: 0.3, to: 1.0 }, duration: 260, ease: 'Power2.out' });
    this._syncSaveTransferControls();
  }

  _animateCardEntry() {
    this._cardObjects.forEach((objs, i) => {
      objs.forEach(o => o.setAlpha(0));
      this.tweens.add({
        targets: objs,
        alpha: 1,
        duration: 240,
        delay: 80 + i * 100,
        ease: 'Power2.out',
      });
    });
  }

  _buildSaveTransferControls(width) {
    const layout = SAVE_TRANSFER_UI.startMenu;
    const offsetX = layout.buttonWidth / 2 + layout.buttonGap / 2;
    const exportButton = createButton(this, {
      x: width / 2 - offsetX,
      y: layout.buttonRowY,
      width: layout.buttonWidth,
      height: layout.buttonHeight,
      label: SAVE_TRANSFER_UI.copy.startExport,
      hint: "E",
      icon: "journal",
      accent: UI_COLORS.borderGood,
      onClick: () => {
        if (this.selectedSlot !== null) this._exportSave(this.selectedSlot);
      },
    });
    const importButton = createButton(this, {
      x: width / 2 + offsetX,
      y: layout.buttonRowY,
      width: layout.buttonWidth,
      height: layout.buttonHeight,
      label: SAVE_TRANSFER_UI.copy.startImport,
      hint: "I",
      icon: "next",
      accent: UI_COLORS.borderSel,
      onClick: () => this._showImportPanel(),
    });
    this._saveTransferControls = [exportButton, importButton];
    this._syncSaveTransferControls();
  }

  _syncSaveTransferControls() {
    const [exportButton, importButton] = this._saveTransferControls;
    if (!exportButton || !importButton) return;
    const selectedSave = this.saveSlots?.find(slot => slot.id === this.selectedSlot);
    const hardcoreExportLocked = isHardcoreMode(selectedSave?.hardcoreModeData);
    exportButton.setEnabled(
      Boolean(selectedSave?.hasData) && !hardcoreExportLocked,
      hardcoreExportLocked ? "OATH LOCKED" : "",
    );
    importButton.setEnabled(Boolean(this.selectedSlot));
  }

  // ─── Input ───────────────────────────────────────────────────────────────

  _setupInput() {
    this.input.keyboard.on('keydown-ONE',   () => this._selectSlot(1));
    this.input.keyboard.on('keydown-TWO',   () => this._selectSlot(2));
    this.input.keyboard.on('keydown-THREE', () => this._selectSlot(3));

    this.input.keyboard.on('keydown-SPACE', () => {
      if (this._confirmPanel || this._modeSelector?.isVisible || this._tutorialSelector?.isVisible) return;
      if (this.selectedSlot !== null) this._startGame();
    });

    this.input.keyboard.on('keydown-DELETE', () => {
      if (this._confirmPanel || this._modeSelector?.isVisible || this._tutorialSelector?.isVisible) return;
      if (this.selectedSlot !== null) this._showConfirm(this.selectedSlot);
    });

    this.input.keyboard.on('keydown-B', () => {
      if (this._confirmPanel || this._backupPanel || this._importPanel || this._modeSelector?.isVisible || this._tutorialSelector?.isVisible) return;
      if (this.selectedSlot !== null) this._showBackupPanel(this.selectedSlot);
    });

    this.input.keyboard.on('keydown-E', () => {
      if (this._confirmPanel || this._backupPanel || this._importPanel || this._modeSelector?.isVisible || this._tutorialSelector?.isVisible) return;
      const selectedSave = this.saveSlots?.find(slot => slot.id === this.selectedSlot);
      if (selectedSave?.hasData && !isHardcoreMode(selectedSave.hardcoreModeData)) {
        this._exportSave(this.selectedSlot);
      }
    });

    this.input.keyboard.on('keydown-I', () => {
      if (this._confirmPanel || this._backupPanel || this._importPanel || this._modeSelector?.isVisible || this._tutorialSelector?.isVisible) return;
      if (this.selectedSlot !== null) this._showImportPanel();
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (this._modeSelector?.isVisible || this._tutorialSelector?.isVisible) return;
      if (this._confirmPanel) { this._closeConfirm(); return; }
      if (this._backupPanel) { this._closeBackupPanel(); return; }
      if (this._importPanel) { this._closeImportPanel(); return; }
      this.soundSystem?.playUiConfirm?.();
      this.scene.start("MainMenuScene");
    });
  }

  // ─── Start game ──────────────────────────────────────────────────────────

  _startGame() {
    if (this._isStartingGame || this.selectedSlot === null) return;
    const selectedSave = this.saveSlots.find((slot) => slot.id === this.selectedSlot);
    if (!selectedSave?.hasData) {
      this._modeSelector?.show({
        onChoose: hardcoreModeData => this._showNewSaveTutorialChoice(
          hardcoreModeData,
        ),
      });
      return;
    }

    this._launchGame(
      sanitizeHardcoreModeData(selectedSave.hardcoreModeData),
      false,
      null,
    );
  }

  _showNewSaveTutorialChoice(hardcoreModeData) {
    this._tutorialSelector?.show({
      onChoose: tutorialChoice => this._launchGame(
        hardcoreModeData,
        true,
        tutorialChoice,
      ),
      onCancel: () => this._modeSelector?.show({
        onChoose: nextMode => this._showNewSaveTutorialChoice(nextMode),
      }),
    });
  }

  _launchGame(hardcoreModeData, isNewSave, tutorialChoice) {
    if (this._isStartingGame || this.selectedSlot === null) return;
    this._isStartingGame = true;
    this.soundSystem?.playUiConfirm?.();

    if (this._pulseTween) {
      this._pulseTween.stop();
      this._pulseTween = null;
    }

    const worldIdentity = `save-slot-${this.selectedSlot}`;
    const savedCharacterId = resolvePersistedPlayerCharacterId(
      this.saveSlots.find((slot) => slot.id === this.selectedSlot)?.playerCharacterId,
    );
    const queryCharacterId = resolvePlayerCharacterIdFromSearch(globalThis.window?.location?.search || "");
    this.scene.start("WorldLoadScene", {
      saveSlot: this.selectedSlot,
      worldIdentity,
      playerCharacterId: queryCharacterId ?? savedCharacterId ?? DEFAULT_PLAYER_CHARACTER_ID,
      hardcoreModeData: sanitizeHardcoreModeData(hardcoreModeData),
      isNewSave: isNewSave === true,
      tutorialChoice,
    });
  }

  // ─── In-canvas confirmation panel ────────────────────────────────────────

  _showConfirm(slotId) {
    if (this._confirmPanel) return;
    const W = this.scale.width;
    const H = this.scale.height;
    const pw = 480, ph = 140;
    const px = W / 2, py = H / 2;

    const shade = this.add.rectangle(px, py, W, H, 0x000000, 0.55).setInteractive();
    const panelG = this.add.graphics();
    panelG.lineStyle(2, 0xe07030, 1);
    panelG.fillStyle(UI_COLORS.bg, 1);
    panelG.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 8);
    panelG.strokeRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 8);

    const qText = this.add.text(px, py - 28, `Clear save slot  ${slotId}?`, {
      fontFamily: UI_FONTS.display,
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#f7f0df',
    }).setOrigin(0.5);

    const hintText = this.add.text(px, py + 16, 'Y — yes        N / ESC — cancel', {
      fontFamily: UI_FONTS.mono,
      fontSize: '15px',
      color: COL.dim,
    }).setOrigin(0.5);

    const clearBtn = createButton(this, {
      x: px - 92,
      y: py + 52,
      width: 150,
      height: 38,
      label: 'CLEAR',
      accent: UI_COLORS.borderBad,
      labelColor: UI_COLORS.danger,
      depth: 10,
      onClick: () => {
        this._closeConfirm();
        this._clearSlot(slotId);
      },
    });
    const cancelBtn = createButton(this, {
      x: px + 92,
      y: py + 52,
      width: 150,
      height: 38,
      label: 'CANCEL',
      accent: UI_COLORS.borderHov,
      depth: 10,
      onClick: () => this._closeConfirm(),
    });

    this._confirmPanel = {
      objects: [shade, panelG, qText, hintText],
      controls: [clearBtn, cancelBtn],
    };

    const onKey = (evt) => {
      const k = evt.key.toLowerCase();
      if (k === 'y') {
        this._closeConfirm();
        this._clearSlot(slotId);
      } else if (k === 'n' || k === 'escape') {
        this._closeConfirm();
      }
    };
    // Defer one scene tick so the Delete key that opened the panel does not
    // consume this one-shot Y / N confirmation listener.
    this._confirmKeyAttachTimer?.remove?.(false);
    this._confirmKeyAttachTimer = this.time.delayedCall(0, () => {
      this._confirmKeyAttachTimer = null;
      if (!this._confirmPanel) return;
      this.input.keyboard.once('keydown', onKey);
      this._confirmKeyHandler = onKey;
    });
  }

  _closeConfirm() {
    if (!this._confirmPanel) return;
    this._confirmKeyAttachTimer?.remove?.(false);
    this._confirmKeyAttachTimer = null;
    if (this._confirmKeyHandler) {
      this.input.keyboard.off('keydown', this._confirmKeyHandler);
      this._confirmKeyHandler = null;
    }
    this._confirmPanel.objects.forEach(o => o.destroy());
    this._confirmPanel.controls?.forEach(control => control.destroy());
    this._confirmPanel = null;
  }

  async _clearSlot(slotId) {
    try {
      const store = new DugTilesSaveStore({ slotId });
      await store.clearSave();
      this.saveSlots = await this.loadSaveSlots();
      this._destroyCards();
      this._buildCards();
      this._animateCardEntry();
      if (this.selectedSlot === slotId) {
        this.selectedSlot = null;
        this._startPrompt.setText('SELECT A SLOT TO BEGIN');
        this._startPrompt.setColor(COL.dim);
        this._syncSaveTransferControls();
      } else if (this.selectedSlot !== null) {
        this._selectSlot(this.selectedSlot);
      }
    } catch (err) {
      console.error('Failed to clear save slot:', err);
    }
  }

  // ─── Backup Panel ────────────────────────────────────────────────────────

  _showBackupPanel(slotId) {
    if (this._backupPanel) return;
    
    const store = new DugTilesSaveStore({ slotId });
    const backups = store.getBackups();
    const stats = store.getSaveStats();
    const currentHardcore = isHardcoreMode(
      store.loadForDisplay()?.hardcoreModeData,
    );
    
    const W = this.scale.width;
    const H = this.scale.height;
    const pw = 600, ph = 400;
    const px = W / 2, py = H / 2;

    const shade = this.add.rectangle(px, py, W, H, 0x000000, 0.55).setInteractive();
    const panelG = this.add.graphics();
    panelG.lineStyle(2, UI_COLORS.borderHov, 1);
    panelG.fillStyle(UI_COLORS.bg, 1);
    panelG.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 8);
    panelG.strokeRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 8);

    const title = this.add.text(px, py - ph / 2 + 30, `Backups for Slot ${slotId}`, {
      fontFamily: UI_FONTS.display,
      fontSize: '20px',
      fontStyle: 'bold',
      color: UI_COLORS.gold,
    }).setOrigin(0.5);

    const statsText = this.add.text(px, py - ph / 2 + 60, 
      `${backups.length} ${currentHardcore ? "purge-only backups" : "backups available"}`
        + ` • ${stats.backupStats?.totalSizeBytes ? (stats.backupStats.totalSizeBytes / 1024).toFixed(1) + ' KB' : '0 KB'}`, {
      fontFamily: UI_FONTS.mono,
      fontSize: '13px',
      color: COL.dim,
    }).setOrigin(0.5);

    const objects = [shade, panelG, title, statsText];
    const controls = [];

    if (backups.length === 0) {
      const noBackups = this.add.text(px, py, 'No backups available', {
        fontFamily: UI_FONTS.mono,
        fontSize: '16px',
        color: COL.dim,
      }).setOrigin(0.5);
      objects.push(noBackups);
    } else {
      // Show backup list
      const startY = py - ph / 2 + 100;
      backups.slice(0, 5).forEach((backup, i) => {
        const date = new Date(backup.timestamp).toLocaleString();
        const backupText = this.add.text(px - pw / 2 + 30, startY + i * 50, 
          `Backup ${i + 1}: ${date}`, {
          fontFamily: UI_FONTS.mono,
          fontSize: '13px',
          color: COL.white,
        }).setOrigin(0, 0.5);
        objects.push(backupText);

        const restoreBtn = createButton(this, {
          x: px + pw / 2 - 78,
          y: startY + i * 50,
          width: 112,
          height: 30,
          label: 'RESTORE',
          accent: UI_COLORS.borderGood,
          labelColor: UI_COLORS.success,
          depth: 10,
          fontSize: '12px',
          onClick: () => {
            this._restoreBackup(slotId, backup.index);
          },
        });
        const backupHardcore = isHardcoreMode(
          store.normalizePayload(backup.data)?.hardcoreModeData,
        );
        restoreBtn.setEnabled(
          !currentHardcore && !backupHardcore,
          currentHardcore || backupHardcore ? "OATH LOCKED" : "",
        );
        controls.push(restoreBtn);
      });
    }

    const closeBtn = createButton(this, {
      x: px,
      y: py + ph / 2 - 32,
      width: 140,
      height: 34,
      label: 'CLOSE',
      hint: 'ESC',
      accent: UI_COLORS.borderHov,
      depth: 10,
      fontSize: '12px',
      onClick: () => this._closeBackupPanel(),
    });
    controls.push(closeBtn);

    const hintText = this.add.text(
      px,
      py + ph / 2 - 68,
      currentHardcore
        ? "Hardcore backups are erased on death and cannot rewind the run"
        : "Click restore on any Casual backup",
      {
      fontFamily: UI_FONTS.mono,
      fontSize: '12px',
      color: COL.dim,
      },
    ).setOrigin(0.5);
    objects.push(hintText);

    this._backupPanel = { objects, controls, slotId };
  }

  _closeBackupPanel() {
    if (!this._backupPanel) return;
    this._backupPanel.objects.forEach(o => o.destroy());
    this._backupPanel.controls?.forEach(control => control.destroy());
    this._backupPanel = null;
  }

  async _restoreBackup(slotId, backupIndex) {
    try {
      const store = new DugTilesSaveStore({ slotId });
      const result = store.restoreFromBackup(backupIndex);
      
      if (result.success) {
        const restored = store.saveToLocalStorage(result.saveData);
        if (!restored) {
          console.error('[StartMenuScene] Failed to persist restored backup');
          return;
        }
        this._closeBackupPanel();
        this.saveSlots = await this.loadSaveSlots();
        this._destroyCards();
        this._buildCards();
        if (this.selectedSlot === slotId) {
          this._selectSlot(slotId);
        }
        console.log(`[StartMenuScene] Restored backup ${backupIndex} for slot ${slotId}`);
      } else {
        console.error('[StartMenuScene] Failed to restore backup:', result.error);
      }
    } catch (err) {
      console.error('[StartMenuScene] Failed to restore backup:', err);
    }
  }

  // ─── Export/Import ───────────────────────────────────────────────────────

  _exportSave(slotId) {
    try {
      const store = new DugTilesSaveStore({ slotId });
      const success = store.exportSave();
      
      if (success) {
        console.log(`[StartMenuScene] Exported save for slot ${slotId}`);
      } else {
        console.error('[StartMenuScene] Failed to export save');
      }
    } catch (err) {
      console.error('[StartMenuScene] Failed to export save:', err);
    }
  }

  _showImportPanel() {
    if (this._importPanel || this.selectedSlot === null) return;
    
    const W = this.scale.width;
    const H = this.scale.height;
    const layout = SAVE_TRANSFER_UI.startMenu;
    const pw = layout.importPanelWidth;
    const ph = layout.importPanelHeight;
    const px = W / 2, py = H / 2;

    const shade = this.add.rectangle(px, py, W, H, 0x000000, 0.55).setInteractive();
    const panelG = this.add.graphics();
    panelG.lineStyle(2, UI_COLORS.borderHov, 1);
    panelG.fillStyle(UI_COLORS.bg, 1);
    panelG.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 8);
    panelG.strokeRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 8);

    const title = this.add.text(px, py - ph / 2 + layout.importPanelTitleInsetY, 'Import Save File', {
      fontFamily: UI_FONTS.display,
      fontSize: '20px',
      fontStyle: 'bold',
      color: UI_COLORS.gold,
    }).setOrigin(0.5);

    const hintText = this.add.text(px, py + layout.importPanelDescriptionOffsetY,
      'Click the button below to select a save file to import.\n' +
      'The current slot is backed up before the imported save replaces it.', {
      fontFamily: UI_FONTS.mono,
      fontSize: '13px',
      color: COL.dim,
      align: 'center',
      wordWrap: { width: pw - layout.importPanelTextInsetX * 2 },
    }).setOrigin(0.5);

    const filePicker = createManualSaveFilePicker({
      onSelect: async file => {
        await this._importSave(file);
        this._closeImportPanel();
      },
    });

    const importBtn = createButton(this, {
      x: px - 88,
      y: py + layout.importPanelButtonOffsetY,
      width: 160,
      height: 38,
      label: 'SELECT FILE',
      accent: UI_COLORS.borderGood,
      labelColor: UI_COLORS.success,
      depth: 10,
      onClick: () => filePicker.open(),
    });
    const cancelBtn = createButton(this, {
      x: px + 98,
      y: py + layout.importPanelButtonOffsetY,
      width: 140,
      height: 38,
      label: 'CANCEL',
      hint: 'ESC',
      accent: UI_COLORS.borderHov,
      depth: 10,
      onClick: () => this._closeImportPanel(),
    });

    const closeHint = this.add.text(px, py + ph / 2 - layout.importPanelFooterInsetY, 'JSON save files only', {
      fontFamily: UI_FONTS.mono,
      fontSize: '12px',
      color: COL.dim,
    }).setOrigin(0.5);

    this._importPanel = { 
      objects: [shade, panelG, title, hintText, closeHint],
      controls: [importBtn, cancelBtn],
      filePicker,
    };
  }

  _closeImportPanel() {
    if (!this._importPanel) return;
    this._importPanel.objects.forEach(o => o.destroy());
    this._importPanel.controls?.forEach(control => control.destroy());
    this._importPanel.filePicker?.destroy();
    this._importPanel = null;
  }

  async _importSave(file) {
    if (!this.selectedSlot) {
      console.error('[StartMenuScene] No slot selected for import');
      return;
    }

    try {
      const store = new DugTilesSaveStore({ slotId: this.selectedSlot });
      const result = await store.importSave(file);
      
      if (result.success) {
        this.saveSlots = await this.loadSaveSlots();
        this._destroyCards();
        this._buildCards();
        this._selectSlot(this.selectedSlot);
        console.log(`[StartMenuScene] Imported save to slot ${this.selectedSlot}`);
      } else {
        console.error('[StartMenuScene] Failed to import save:', result.error);
      }
    } catch (err) {
      console.error('[StartMenuScene] Failed to import save:', err);
    }
  }
}
