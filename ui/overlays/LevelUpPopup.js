/**
 * Level Up Popup UI Component
 * Shows when player levels up and allows choosing rewards
 */

import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { LEVEL_CONFIG } from "../../values/levelConfig.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { createButton } from "../PhaserUiKit.js";

export class LevelUpPopup {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
    this.currentLevel = null;
    this.pendingChoice = null;
    this.clickedChoice = null;
    this._boundPointerDown = pointer => this._handleScenePointerDown(pointer);
    scene.input.on('pointerdown', this._boundPointerDown);

    // Dark overlay (behind container)
    this.bg = scene.add.graphics();
    this.bg.setScrollFactor(0);
    this.bg.setDepth(199);

    // Main container
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(200);

    // Popup panel background
    this.popupBg = scene.add.rectangle(0, 0, 1, 1, UI_COLORS.bg, 0.98);
    this.popupBg.setStrokeStyle(2, UI_COLORS.borderSel);
    this.container.add(this.popupBg);

    // Create title text
    this.titleText = scene.add.text(0, 0, "LEVEL UP!", {
      fontFamily: "Consolas, monospace",
      fontSize: "40px",
      color: UI_COLORS.gold,
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 6
    });
    this.titleText.setOrigin(0.5);
    this.container.add(this.titleText);

    // Create subtitle text
    this.subtitleText = scene.add.text(0, 0, "You reached Level X!", {
      fontFamily: "Consolas, monospace",
      fontSize: "24px",
      color: UI_COLORS.gold,
      stroke: "#000000",
      strokeThickness: 4
    });
    this.subtitleText.setOrigin(0.5);
    this.container.add(this.subtitleText);

    // Create instruction text
    this.instructionText = scene.add.text(0, 0, "Choose your reward:", {
      fontFamily: "Consolas, monospace",
      fontSize: "20px",
      color: UI_COLORS.body,
      stroke: "#000000",
      strokeThickness: 3
    });
    this.instructionText.setOrigin(0.5);
    this.container.add(this.instructionText);

    // Create reward option 1 (Mining Power)
    this.option1Container = scene.add.container(0, 0);
    this.createRewardOption(this.option1Container, "miningPower", 1);
    this.container.add(this.option1Container);

    // Create reward option 2 (Resource Luck)
    this.option2Container = scene.add.container(0, 0);
    this.createRewardOption(this.option2Container, "resourceLuck", 2);
    this.container.add(this.option2Container);

    // Create per-level damage bonus text (automatic bonus every level)
    this.perLevelDamageText = scene.add.text(0, 0, "", {
      fontFamily: "Consolas, monospace",
      fontSize: "18px",
      color: "#ff6666",
      stroke: "#000000",
      strokeThickness: 3,
      align: "left"
    });
    this.perLevelDamageText.setOrigin(0.5);
    this.perLevelDamageText.setWordWrapWidth(500);
    this.perLevelDamageText.setVisible(false);
    this.container.add(this.perLevelDamageText);

    // Create per-level speed bonus text (automatic bonus every level)
    this.perLevelSpeedText = scene.add.text(0, 0, "", {
      fontFamily: "Consolas, monospace",
      fontSize: "18px",
      color: "#66ff66",
      stroke: "#000000",
      strokeThickness: 3,
      align: "right"
    });
    this.perLevelSpeedText.setOrigin(0.5);
    this.perLevelSpeedText.setWordWrapWidth(500);
    this.perLevelSpeedText.setVisible(false);
    this.container.add(this.perLevelSpeedText);

    // Create per-level GP max text (automatic bonus every level)
    this.perLevelGpText = scene.add.text(0, 0, "", {
      fontFamily: "Consolas, monospace",
      fontSize: "18px",
      color: "#aaffff",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center"
    });
    this.perLevelGpText.setOrigin(0.5);
    this.perLevelGpText.setWordWrapWidth(500);
    this.perLevelGpText.setVisible(false);
    this.container.add(this.perLevelGpText);

    // Create milestone text (for levels without choice rewards)
    this.milestoneText = scene.add.text(0, 0, "", {
      fontFamily: "Consolas, monospace",
      fontSize: "22px",
      color: "#ffaa00",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center"
    });
    this.milestoneText.setOrigin(0.5);
    this.milestoneText.setWordWrapWidth(500);
    this.milestoneText.setVisible(false);
    this.container.add(this.milestoneText);

    // Create continue text and a larger clickable button
    this.continueText = scene.add.text(0, 0, "", {
      fontFamily: "Consolas, monospace",
      fontSize: "18px",
      color: UI_COLORS.gold,
      stroke: "#000000",
      strokeThickness: 3
    });
    this.continueText.setOrigin(0.5);
    this.continueText.setVisible(false);
    this.container.add(this.continueText);

    this.continueButton = createButton(scene, {
      x: 0,
      y: 0,
      width: 320,
      height: 42,
      label: 'CONTINUE',
      hint: 'Enter/Space',
      accent: UI_COLORS.borderSel,
      parent: this.container,
      onClick: () => {
        if (this.visible && !this.pendingChoice) this.clickedChoice = 'continue';
      },
    });
    this.continueButton.setVisible(false);

    // Store keyboard input
    this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enterKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.key1 = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.key2 = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);

    this._layout();

    // Hide until show() is called — container is Phaser-visible by default
    this.container.setVisible(false);
    this.bg.setVisible(false);
  }

  createRewardOption(container, rewardType, optionNumber) {
    const scene = this.scene;
    const reward = LEVEL_CONFIG.CHOICE_REWARDS[rewardType];

    // Background
    const bg = scene.add.rectangle(0, 0, 1, 1, UI_COLORS.cardBase, 0.96);
    bg.setStrokeStyle(2, UI_COLORS.borderDim);
    bg.setInteractive({ useHandCursor: true });
    const handleOver = () => {
      if (!this.visible || !this.pendingChoice) return;
      bg.setFillStyle(UI_COLORS.cardHover, 1);
      bg.setStrokeStyle(2, UI_COLORS.borderSel);
      this.scene.soundSystem?.playUiSelect?.();
    };
    const handleOut = () => {
      bg.setFillStyle(UI_COLORS.cardBase, 0.96);
      bg.setStrokeStyle(2, UI_COLORS.borderDim);
    };
    const handleDown = () => {
      this._selectChoice(rewardType, container);
    };
    bg.on('pointerover', handleOver);
    bg.on('pointerout', handleOut);
    bg.on('pointerdown', handleDown);
    container.on('pointerover', handleOver);
    container.on('pointerout', handleOut);
    container.on('pointerdown', handleDown);
    container.add(bg);

    const hitRect = scene.add.rectangle(0, 0, 1, 1, 0x000000, 0);
    hitRect.setInteractive({ useHandCursor: true });
    hitRect.on('pointerover', handleOver);
    hitRect.on('pointerout', handleOut);
    hitRect.on('pointerdown', handleDown);
    this.container.add(hitRect);

    // Icon
    const iconText = scene.add.text(0, 0, reward.icon, {
      fontFamily: "Arial",
      fontSize: "48px"
    });
    iconText.setOrigin(0.5);
    container.add(iconText);

    // Name
    const nameText = scene.add.text(0, 0, reward.name, {
      fontFamily: "Consolas, monospace",
      fontSize: "24px",
      color: UI_COLORS.white,
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 4
    });
    nameText.setOrigin(0.5);
    container.add(nameText);

    // Description
    const descText = scene.add.text(0, 0, reward.description, {
      fontFamily: "Consolas, monospace",
      fontSize: "16px",
      color: UI_COLORS.body,
      stroke: "#000000",
      strokeThickness: 3,
      align: "center"
    });
    descText.setOrigin(0.5);
    descText.setWordWrapWidth(250);
    container.add(descText);

    // Key hint
    const hintText = scene.add.text(0, 0, `[${optionNumber}]`, {
      fontFamily: "Consolas, monospace",
      fontSize: "32px",
      color: UI_COLORS.gold,
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 5
    });
    hintText.setOrigin(0.5);
    container.add(hintText);

    // Store references
    container.bg = bg;
    container.iconText = iconText;
    container.nameText = nameText;
    container.descText = descText;
    container.hintText = hintText;
    container.rewardType = rewardType;
    container.hitRect = hitRect;
  }

  _selectChoice(rewardType, container) {
    if (!this.visible || !this.pendingChoice) return false;
    if (this.clickedChoice) return false;
    this.clickedChoice = rewardType;
    this.scene.tweens.add({
      targets: container,
      scaleX: 0.97,
      scaleY: 0.97,
      duration: 55,
      yoyo: true,
      ease: 'Power2.out',
    });
    return true;
  }

  _handleScenePointerDown(pointer) {
    if (!this.visible || !this.pendingChoice) return;
    const x = pointer?.x ?? 0;
    const y = pointer?.y ?? 0;
    const hit = bounds => bounds
      && x >= bounds.x
      && x <= bounds.x + bounds.width
      && y >= bounds.y
      && y <= bounds.y + bounds.height;

    if (hit(this.option1Container.choiceBounds)) {
      this._selectChoice(this.option1Container.rewardType, this.option1Container);
    } else if (hit(this.option2Container.choiceBounds)) {
      this._selectChoice(this.option2Container.rewardType, this.option2Container);
    }
  }

  _layout() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // Center the popup
    const centerX = width / 2;
    const centerY = height / 2;

    // Background fills entire screen
    this.bg.clear();
    this.bg.fillStyle(UI_COLORS.overlay, 0.85);
    this.bg.fillRect(0, 0, width, height);

    // Square popup — tall enough to hold per-level bonuses above choice cards
    const popupWidth = Math.min(600, width - 40);
    const popupHeight = popupWidth; // square
    const popupX = (width - popupWidth) / 2;
    const popupY = (height - popupHeight) / 2;

    this.popupBg
      .setPosition(popupX + popupWidth / 2, popupY + popupHeight / 2)
      .setSize(popupWidth, popupHeight);

    // Title
    this.titleText.setPosition(centerX, popupY + 52);

    // Subtitle
    this.subtitleText.setPosition(centerX, popupY + 102);

    // Per-level bonuses — placed ABOVE choice cards so they never overlap
    this.perLevelDamageText.setPosition(centerX, popupY + 150);
    this.perLevelSpeedText.setPosition(centerX, popupY + 176);
    this.perLevelGpText.setPosition(centerX, popupY + 202);

    // Instruction text (hasChoice only)
    this.instructionText.setPosition(centerX, popupY + 244);

    // Reward options — sit below all per-level text
    const optionWidth = 255;
    const slotH = Math.round(optionWidth * (2 / 3)); // 170px
    const optionGap = 30;
    const optionX1 = centerX - optionWidth - optionGap / 2;
    const optionX2 = centerX + optionGap / 2;
    const optionY = popupY + 278;

    this._layoutRewardOption(this.option1Container, optionX1, optionY, optionWidth, slotH);
    this._layoutRewardOption(this.option2Container, optionX2, optionY, optionWidth, slotH);

    // Milestone text (noChoice only — below per-level bonuses)
    this.milestoneText.setPosition(centerX, popupY + 252);

    // Continue text (below option cards or milestone)
    this.continueText.setPosition(centerX, popupY + 520);
    this.continueButton.root.setPosition(centerX, popupY + 542);
  }

  _layoutRewardOption(container, x, y, width, height) {
    // height is passed in (already computed from width * 2/3)
    const slotH = height;
    container.bg
      .setPosition(x + width / 2, y + slotH / 2)
      .setSize(width, slotH);
    container.bg.disableInteractive();
    container.bg.setInteractive({ useHandCursor: true });
    container.setSize(width, slotH);
    container.disableInteractive();
    container.setInteractive(
      new Phaser.Geom.Rectangle(x, y, width, slotH),
      Phaser.Geom.Rectangle.Contains
    );
    container.hitRect
      ?.setPosition(x + width / 2, y + slotH / 2)
      .setSize(width, slotH);
    container.hitRect?.disableInteractive();
    container.hitRect?.setInteractive({ useHandCursor: true });
    if (container.hitRect) this.container.bringToTop?.(container.hitRect);
    container.choiceBounds = { x, y, width, height: slotH };

    // Icon (top)
    container.iconText.setPosition(x + width / 2, y + 40);

    // Name (below icon)
    container.nameText.setPosition(x + width / 2, y + 80);

    // Description (below name)
    container.descText.setPosition(x + width / 2, y + 130);

    // Key hint (bottom right corner)
    container.hintText.setPosition(x + width - 30, y + height - 25);
  }

  /**
   * Show level up popup
   * @param {number} level - The new level
   * @param {number} hasChoice - Whether player needs to choose a reward
   * @param {Array} rewards - Array of milestone rewards (if any)
   */
  show(level, hasChoice, rewards = []) {
    this.currentLevel = level;
    this.pendingChoice = hasChoice;
    this.clickedChoice = null;

    // Update text
    this.titleText.setText("LEVEL UP!");
    this.subtitleText.setText(`You reached Level ${level}!`);

    // Calculate and show per-level bonuses
    const perLevelPct = (level * 0.5).toFixed(1);  // e.g. "2.0" at level 4
    const perLevelFlat = (level * 0.2).toFixed(1); // e.g. "0.8" at level 4

    // Damage bonus (single line to avoid overlap)
    this.perLevelDamageText.setText(`⚔️ +0.5% +0.2 flat dig dmg | Total: +${perLevelPct}% +${perLevelFlat} flat`);
    this.perLevelDamageText.setVisible(true);

    // Speed bonus (single line)
    this.perLevelSpeedText.setText(`🏃 +0.5% movement speed | Total: +${perLevelPct}%`);
    this.perLevelSpeedText.setVisible(true);

    // GP max bonus (10 per level up to 99, then 2 per level)
    const gpGain = level <= 99 ? 10 : 2;
    const gpTotal = level <= 99 ? level * 10 : 99 * 10 + (level - 99) * 2;
    this.perLevelGpText.setText(`💎 +${gpGain} max GP | Total: +${gpTotal} max GP`);
    this.perLevelGpText.setVisible(true);

    if (hasChoice) {
      // Show choice options
      this.instructionText.setVisible(true);
      this.instructionText.setText("Choose one reward to unlock:");
      this.option1Container.setVisible(true);
      this.option2Container.setVisible(true);
      this.option1Container.hitRect?.setVisible(true);
      this.option2Container.hitRect?.setVisible(true);
      this.milestoneText.setVisible(false);
      this.continueText.setVisible(false);
      this.continueButton.setVisible(false);
    } else {
      // Show milestone rewards only
      this.instructionText.setVisible(true);
      this.instructionText.setText("Milestone reward granted. Press ENTER or SPACE to continue.");
      this.option1Container.setVisible(false);
      this.option2Container.setVisible(false);
      this.option1Container.hitRect?.setVisible(false);
      this.option2Container.hitRect?.setVisible(false);
      this.continueText.setVisible(true);
      this.continueButton.setVisible(true);

      // Build milestone text
      let milestoneText = "";
      rewards.forEach(reward => {
        if (reward.type === 'milestone') {
          milestoneText += `✓ ${reward.reward.description}\n\n`;
        }
      });

      if (milestoneText) {
        this.milestoneText.setVisible(true);
        this.milestoneText.setText(milestoneText);
      } else {
        this.milestoneText.setVisible(false);
      }
    }

    this.scene.tweens.killTweensOf(this.bg);
    this.scene.tweens.killTweensOf(this.container);
    this.bg.setVisible(true).setAlpha(0);
    this.container.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.bg, alpha: 1, duration: 250, ease: 'Power2.out' });
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 250, ease: 'Power2.out', delay: 50 });
    this.visible = true;
  }

  /**
   * Hide the popup
   */
  hide() {
    this.visible = false; // stop input immediately
    this.clickedChoice = null;
    this.scene.tweens.killTweensOf(this.bg);
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.add({
      targets: [this.bg, this.container],
      alpha: 0,
      duration: 200,
      ease: 'Power1.in',
      onComplete: () => {
        this.bg.setVisible(false);
        this.container.setVisible(false);
        this.currentLevel = null;
        this.pendingChoice = false;
      }
    });
  }

  /**
   * Check for keyboard input (1 or 2 for choice rewards, Enter/Space for continue)
   * @returns {string|null} The chosen reward type, or null if no choice made
   */
  handleInput() {
    if (!this.visible) return null;

    if (this.pendingChoice) {
      if (this.clickedChoice) {
        const choice = this.clickedChoice;
        this.clickedChoice = null;
        this.hide();
        return choice;
      }
      // Choice rewards - check for 1 or 2
      if (Phaser.Input.Keyboard.JustDown(this.key1)) {
        this.hide();
        return this.option1Container.rewardType;
      }
      if (Phaser.Input.Keyboard.JustDown(this.key2)) {
        this.hide();
        return this.option2Container.rewardType;
      }
    } else {
      if (this.clickedChoice === 'continue') {
        this.clickedChoice = null;
        this.hide();
        return "continue";
      }
      // Milestone rewards - check for Enter/Space
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.hide();
        return "continue";
      }
    }

    return null;
  }

  /**
   * Handle resize events
   */
  resize() {
    this._layout();
  }

  /**
   * Clean up
   */
  destroy() {
    if (this._boundPointerDown) {
      this.scene?.input?.off?.('pointerdown', this._boundPointerDown);
      this._boundPointerDown = null;
    }
    this.container.destroy();
    this.spaceKey.destroy();
    this.enterKey.destroy();
    this.key1.destroy();
    this.key2.destroy();
  }
}
