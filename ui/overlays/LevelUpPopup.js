import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { createButton } from "../PhaserUiKit.js";
import { createIconBadge, createModalShell } from "../UiModalShell.js";

const REWARD_OPTIONS = Object.freeze([
  Object.freeze({
    type: "miningPower",
    title: "MINING POWER",
    subtitle: "Permanent digging strength",
    description: "Increase the damage of every mining hit. Best for pushing stronger layers.",
    icon: "upgrade",
  }),
  Object.freeze({
    type: "resourceLuck",
    title: "RESOURCE LUCK",
    subtitle: "Permanent collection chance",
    description: "Improve the chance of extracting bonus materials from every successful break.",
    icon: "luck",
  }),
]);

export class LevelUpPopup {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
    this.currentLevel = null;
    this.pendingChoice = false;
    this.clickedChoice = null;
    this.selectedOption = 0;
    this.rewards = [];

    this.shell = createModalShell(scene, {
      title: "LEVEL UP",
      subtitle: "Permanent progression reward",
      icon: "upgrade",
      maxWidth: 820,
      maxHeight: 620,
      depth: 3200,
      showClose: false,
    });
    this.bg = this.shell.backdrop;
    this.container = this.shell.root;
    this.option1Container = { rewardType: REWARD_OPTIONS[0].type };
    this.option2Container = { rewardType: REWARD_OPTIONS[1].type };

    const code = Phaser.Input.Keyboard.KeyCodes;
    this.spaceKey = scene.input.keyboard.addKey(code.SPACE);
    this.enterKey = scene.input.keyboard.addKey(code.ENTER);
    this.key1 = scene.input.keyboard.addKey(code.ONE);
    this.key2 = scene.input.keyboard.addKey(code.TWO);
    this.leftKey = scene.input.keyboard.addKey(code.LEFT);
    this.rightKey = scene.input.keyboard.addKey(code.RIGHT);
    this.aKey = scene.input.keyboard.addKey(code.A);
    this.dKey = scene.input.keyboard.addKey(code.D);
  }

  _text(x, y, value, style = {}, originX = 0, originY = 0) {
    const text = this.scene.add.text(x, y, value, {
      fontFamily: style.fontFamily || UI_FONTS.body,
      fontSize: style.fontSize || "14px",
      fontStyle: style.fontStyle,
      color: style.color || UI_COLORS.body,
      align: style.align,
      wordWrap: style.wordWrap,
      lineSpacing: style.lineSpacing,
    }).setOrigin(originX, originY);
    this.shell.content.add(text);
    return text;
  }

  _drawCard(x, y, width, height, selected = false) {
    const card = this.scene.add.rectangle(
      x + width / 2,
      y + height / 2,
      width,
      height,
      selected ? UI_COLORS.cardSel : UI_COLORS.cardBase,
      0.98
    ).setStrokeStyle(selected ? 2 : 1, selected ? UI_COLORS.borderSel : UI_COLORS.borderDim);
    this.shell.content.add(card);
    return card;
  }

  _render() {
    this.shell.layout();
    this.shell.content.removeAll(true);
    const rect = this.shell.getContentRect();
    const level = this.currentLevel || 1;
    this.shell.setHeader("LEVEL " + level + " REACHED", this.pendingChoice ? "Choose one permanent reward" : "Milestone reward granted");

    const summaryHeight = 96;
    this._drawCard(rect.left, rect.top, rect.width, summaryHeight, true);
    createIconBadge(this.scene, "upgrade", {
      x: rect.left + 48,
      y: rect.top + 48,
      size: 64,
      iconSize: 54,
      selected: true,
      parent: this.shell.content,
    });
    this._text(rect.left + 88, rect.top + 18, "AUTOMATIC LEVEL BONUSES", {
      fontFamily: UI_FONTS.display,
      fontSize: "16px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    });
    const percent = (level * 0.5).toFixed(1);
    const flat = (level * 0.2).toFixed(1);
    const gpGain = level <= 99 ? 10 : 2;
    const gpTotal = level <= 99 ? level * 10 : 990 + (level - 99) * 2;
    this._text(rect.left + 88, rect.top + 46,
      "Dig damage: +" + percent + "% and +" + flat + " flat    Movement: +" + percent + "%",
      { fontFamily: UI_FONTS.mono, fontSize: "12px", color: UI_COLORS.body }
    );
    this._text(rect.left + 88, rect.top + 69,
      "Gem Power: +" + gpGain + " this level, +" + gpTotal + " total",
      { fontFamily: UI_FONTS.mono, fontSize: "12px", color: UI_COLORS.info }
    );

    if (this.pendingChoice) this._renderChoices(rect, summaryHeight);
    else this._renderMilestone(rect, summaryHeight);
  }

  _renderChoices(rect, summaryHeight) {
    const gap = 16;
    const top = rect.top + summaryHeight + 18;
    const cardWidth = (rect.width - gap) / 2;
    const cardHeight = Math.max(190, rect.bottom - top - 8);

    REWARD_OPTIONS.forEach((option, index) => {
      const x = rect.left + index * (cardWidth + gap);
      const selected = index === this.selectedOption;
      const card = this._drawCard(x, top, cardWidth, cardHeight, selected)
        .setInteractive({ useHandCursor: true });
      card.on("pointerover", () => {
        if (this.selectedOption !== index) {
          this.selectedOption = index;
          this.soundSystem?.playUiSelect?.();
          this._render();
        }
      });
      card.on("pointerdown", () => {
        this.selectedOption = index;
        this._render();
      });

      createIconBadge(this.scene, option.icon, {
        x: x + cardWidth / 2,
        y: top + 55,
        size: 76,
        iconSize: 64,
        selected,
        parent: this.shell.content,
      });
      this._text(x + cardWidth / 2, top + 108, option.title, {
        fontFamily: UI_FONTS.display,
        fontSize: "19px",
        fontStyle: "bold",
        color: selected ? UI_COLORS.gold : UI_COLORS.title,
      }, 0.5, 0.5);
      this._text(x + cardWidth / 2, top + 133, option.subtitle, {
        fontFamily: UI_FONTS.mono,
        fontSize: "11px",
        color: UI_COLORS.info,
      }, 0.5, 0.5);
      this._text(x + 20, top + 158, option.description, {
        fontSize: "13px",
        color: UI_COLORS.body,
        align: "center",
        wordWrap: { width: cardWidth - 40, useAdvancedWrap: true },
        lineSpacing: 3,
      }, 0, 0);
      createButton(this.scene, {
        x: x + cardWidth / 2,
        y: top + cardHeight - 32,
        width: cardWidth - 34,
        height: 44,
        label: "CHOOSE " + option.title,
        hint: String(index + 1),
        icon: option.icon,
        accent: selected ? UI_COLORS.borderSel : UI_COLORS.borderDim,
        parent: this.shell.content,
        fontSize: "11px",
        onClick: () => {
          this.selectedOption = index;
          this.clickedChoice = option.type;
        },
      });
    });
  }

  _renderMilestone(rect, summaryHeight) {
    const top = rect.top + summaryHeight + 18;
    const height = rect.bottom - top;
    this._drawCard(rect.left, top, rect.width, height, false);
    createIconBadge(this.scene, "journal", {
      x: rect.left + 58,
      y: top + 58,
      size: 70,
      iconSize: 58,
      parent: this.shell.content,
    });
    this._text(rect.left + 104, top + 22, "MILESTONE REWARD", {
      fontFamily: UI_FONTS.display,
      fontSize: "20px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    });
    const descriptions = this.rewards
      .filter(reward => reward?.type === "milestone")
      .map(reward => reward?.reward?.description)
      .filter(Boolean);
    this._text(rect.left + 104, top + 58,
      descriptions.length ? descriptions.join("\n") : "Your milestone bonuses have been applied.",
      {
        fontSize: "14px",
        color: UI_COLORS.body,
        wordWrap: { width: rect.width - 140, useAdvancedWrap: true },
        lineSpacing: 7,
      }
    );
    createButton(this.scene, {
      x: rect.left + rect.width / 2,
      y: top + height - 35,
      width: Math.min(430, rect.width - 40),
      height: 48,
      label: "CONTINUE",
      hint: "ENTER",
      icon: "play",
      accent: UI_COLORS.borderSel,
      parent: this.shell.content,
      fontSize: "13px",
      onClick: () => {
        this.clickedChoice = "continue";
      },
    });
  }

  show(level, hasChoice, rewards = []) {
    this.currentLevel = level;
    this.pendingChoice = Boolean(hasChoice);
    this.clickedChoice = null;
    this.selectedOption = 0;
    this.rewards = rewards;
    this.visible = true;
    this._render();
    this.shell.show();
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    this.clickedChoice = null;
    this.shell.hide(() => {
      this.currentLevel = null;
      this.pendingChoice = false;
    });
  }

  handleInput() {
    if (!this.visible) return null;
    const just = Phaser.Input.Keyboard.JustDown;
    if (this.pendingChoice) {
      if (just(this.leftKey) || just(this.aKey)) {
        this.selectedOption = 0;
        this._render();
      } else if (just(this.rightKey) || just(this.dKey)) {
        this.selectedOption = 1;
        this._render();
      }
      if (just(this.key1)) this.clickedChoice = REWARD_OPTIONS[0].type;
      if (just(this.key2)) this.clickedChoice = REWARD_OPTIONS[1].type;
      if (just(this.enterKey) || just(this.spaceKey)) {
        this.clickedChoice = REWARD_OPTIONS[this.selectedOption].type;
      }
      if (this.clickedChoice) {
        const choice = this.clickedChoice;
        this.clickedChoice = null;
        this.hide();
        return choice;
      }
      return null;
    }
    if (this.clickedChoice === "continue" || just(this.enterKey) || just(this.spaceKey)) {
      this.clickedChoice = null;
      this.hide();
      return "continue";
    }
    return null;
  }

  resize() {
    if (this.visible) this._render();
    else this.shell.layout();
  }

  destroy() {
    [
      this.spaceKey,
      this.enterKey,
      this.key1,
      this.key2,
      this.leftKey,
      this.rightKey,
      this.aKey,
      this.dKey,
    ].forEach(key => key?.destroy?.());
    this.shell?.destroy?.();
  }
}
