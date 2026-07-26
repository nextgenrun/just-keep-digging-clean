import {
  CELESTIAL_ENGINE_CONFIG,
  CELESTIAL_ENGINE_ORDER,
  isCelestialEnginesEnabled,
} from "../../values/celestialEngines.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { createButton } from "../PhaserUiKit.js";
import { createModalShell } from "../UiModalShell.js";
import { createStarHeartEngineCard } from "./StarHeartEngineCard.js";

export class StarHeartOverlay {
  constructor(scene, progression) {
    this.scene = scene;
    this.progression = progression;
    this.enabled = isCelestialEnginesEnabled();
    this.opened = false;
    this.selectedIndex = 0;
    this.openedAtMs = 0;
    this.confirmArmedAtMs = 0;
    this.confirmEngineId = null;
    this.cardViews = [];
    this.ambientNodes = [];
    this.unsubscribe = progression.subscribe(() => {
      if (this.opened) this._buildContent();
    });
  }

  isOpen() {
    return this.opened;
  }

  open() {
    if (!this.enabled || this.opened) return false;
    this._ensureShell();
    const selected = this.progression.getSnapshot().selectedEngine;
    if (selected) this.selectedIndex = Math.max(0, CELESTIAL_ENGINE_ORDER.indexOf(selected));
    this._buildContent();
    this.opened = true;
    this.openedAtMs = this.scene.time?.now || 0;
    this.scene._pillarViewActive = true;
    this.scene.setShopOpen?.(true);
    this.shell.show();
    return true;
  }

  close() {
    if (!this.opened) return false;
    this.opened = false;
    this.confirmArmedAtMs = 0;
    this.confirmEngineId = null;
    this.shell?.hide();
    this.scene._pillarViewActive = false;
    this.scene.setShopOpen?.(false);
    return true;
  }

  handleInput(keys) {
    if (!this.opened || !keys || !Phaser.Input?.Keyboard) return false;
    const now = this.scene.time?.now || 0;
    if (now - this.openedAtMs < CELESTIAL_ENGINE_CONFIG.input.openGraceMs) return false;
    const justDown = key => key && Phaser.Input.Keyboard.JustDown(key);

    if (justDown(keys.moveLeft) || justDown(keys.aimLeft)) {
      this._select(this.selectedIndex - 1, true);
      return true;
    }
    if (justDown(keys.moveRight) || justDown(keys.aimRight)) {
      this._select(this.selectedIndex + 1, true);
      return true;
    }
    if (justDown(keys.enter) || justDown(keys.interact)) {
      this._activateConfirm();
      return true;
    }
    return false;
  }

  update(timeMs) {
    if (!this.opened) return;
    const bob = CELESTIAL_ENGINE_CONFIG.overlay.ambientBobPx;
    const cycle = CELESTIAL_ENGINE_CONFIG.overlay.ambientCycleMs;
    this.cardViews.forEach((view, index) => {
      view.sprite.y = view.spriteBaseY + Math.sin(timeMs / cycle * Math.PI * 2 + index * 1.7) * bob;
      view.sprite.angle = Math.sin(timeMs / (cycle * 1.4) + index) * 2.2;
    });
    this.ambientNodes.forEach((node, index) => {
      node.setAlpha(0.18 + (Math.sin(timeMs / (540 + index * 37) + index) + 1) * 0.22);
    });
  }

  resize() {
    if (!this.shell) return;
    this.shell.layout();
    if (this.opened) this._buildContent();
  }

  _ensureShell() {
    if (this.shell) return;
    this.shell = createModalShell(this.scene, {
      title: CELESTIAL_ENGINE_CONFIG.copy.title,
      subtitle: CELESTIAL_ENGINE_CONFIG.copy.subtitle,
      icon: "constellation",
      maxWidth: CELESTIAL_ENGINE_CONFIG.overlay.maxWidthPx,
      maxHeight: CELESTIAL_ENGINE_CONFIG.overlay.maxHeightPx,
      depth: CELESTIAL_ENGINE_CONFIG.overlay.depth,
      onClose: () => this.close(),
    });
  }

  _buildContent() {
    if (!this.shell) return;
    this.shell.content.removeAll(true);
    this.cardViews = [];
    this.ambientNodes = [];
    const rect = this.shell.getContentRect();
    const snapshot = this.progression.getSnapshot();
    this._buildConstellationBackdrop(rect);

    const status = snapshot.selectedEngine
      ? `${CELESTIAL_ENGINE_CONFIG.copy.selected}  •  ${snapshot.charge}/${snapshot.chargeCapacity} CHARGE`
      : snapshot.unlocked
        ? CELESTIAL_ENGINE_CONFIG.copy.ready
        : `${CELESTIAL_ENGINE_CONFIG.copy.locked}  (${snapshot.constellationCount}/${snapshot.requiredConstellations})`;
    const statusText = this.scene.add.text(0, rect.top + 3, status, {
      fontFamily: UI_FONTS.mono,
      fontSize: "13px",
      color: snapshot.unlocked ? "#CFF8FF" : UI_COLORS.body,
      align: "center",
    }).setOrigin(0.5, 0);
    this.shell.content.add(statusText);

    const gap = CELESTIAL_ENGINE_CONFIG.overlay.cardGapPx;
    const cardTop = rect.top + 39;
    const cardWidth = (rect.width - gap * 2) / 3;
    const cardHeight = Math.min(
      CELESTIAL_ENGINE_CONFIG.overlay.cardHeightPx,
      rect.bottom - cardTop - 74,
    );
    CELESTIAL_ENGINE_ORDER.forEach((engineId, index) => {
      const x = rect.left + cardWidth / 2 + index * (cardWidth + gap);
      const view = createStarHeartEngineCard({
        scene: this.scene,
        parent: this.shell.content,
        engineId,
        index,
        x,
        y: cardTop + cardHeight / 2,
        width: cardWidth,
        height: cardHeight,
        onFocus: cardIndex => this._select(cardIndex, true),
        onPress: cardIndex => {
          this._select(cardIndex, false);
          this._pulseCard(cardIndex);
        },
      });
      this.cardViews.push(view);
    });

    const protectionText = this.scene.add.text(
      rect.left,
      rect.bottom - 49,
      `${CELESTIAL_ENGINE_CONFIG.copy.recharge}  ${CELESTIAL_ENGINE_CONFIG.copy.protected}`,
      {
        fontFamily: UI_FONTS.mono,
        fontSize: "11px",
        color: "#7896A8",
      },
    ).setOrigin(0, 0.5);
    this.shell.content.add(protectionText);

    this.confirmButton = createButton(this.scene, {
      x: rect.right - 151,
      y: rect.bottom - 49,
      width: 302,
      height: 42,
      label: CELESTIAL_ENGINE_CONFIG.copy.confirm,
      hint: "PERMANENT",
      accent: 0xf2c86e,
      parent: this.shell.content,
      onClick: () => this._activateConfirm(),
      autoIcon: false,
    });
    this._refreshSelection(snapshot);
  }

  _buildConstellationBackdrop(rect) {
    const gfx = this.scene.add.graphics();
    gfx.lineStyle(1, 0x275775, 0.22);
    gfx.lineBetween(rect.left + 22, rect.top + 18, rect.right - 28, rect.bottom - 86);
    gfx.lineBetween(rect.left + 90, rect.bottom - 82, rect.right - 80, rect.top + 24);
    this.shell.content.add(gfx);
    for (let index = 0; index < 16; index += 1) {
      const x = rect.left + 24 + ((index * 137) % Math.max(1, rect.width - 48));
      const y = rect.top + 18 + ((index * 79) % Math.max(1, rect.height - 96));
      const node = this.scene.add.circle(x, y, index % 4 === 0 ? 2.2 : 1.2, 0x7eeaff, 0.3);
      this.shell.content.add(node);
      this.ambientNodes.push(node);
    }
  }

  _select(index, playSound) {
    const next = Phaser.Math.Wrap(index, 0, CELESTIAL_ENGINE_ORDER.length);
    if (next === this.selectedIndex) return;
    this.selectedIndex = next;
    this.confirmArmedAtMs = 0;
    this.confirmEngineId = null;
    if (playSound) this.scene.soundSystem?.playUiSelect?.();
    this._refreshSelection(this.progression.getSnapshot());
  }

  _refreshSelection(snapshot) {
    this.cardViews.forEach((view, index) => {
      const selected = index === this.selectedIndex;
      const attuned = snapshot.selectedEngine === view.engineId;
      const sealed = Boolean(snapshot.selectedEngine && !attuned);
      view.bg.clear();
      view.bg.fillStyle(selected ? 0x0b2230 : 0x07131d, sealed ? 0.52 : 0.9);
      view.bg.fillRoundedRect(-view.width / 2, -view.height / 2, view.width, view.height, 12);
      view.bg.lineStyle(selected || attuned ? 2 : 1, attuned ? 0xf2c86e : CELESTIAL_ENGINE_CONFIG.engines[view.engineId].accent, selected ? 0.96 : 0.38);
      view.bg.strokeRoundedRect(-view.width / 2, -view.height / 2, view.width, view.height, 12);
      view.root.setAlpha(sealed ? 0.33 : selected ? 1 : 0.72);
    });

    const canChoose = snapshot.availableHearts > 0 && !snapshot.selectedEngine;
    this.confirmButton?.setEnabled(canChoose, snapshot.selectedEngine ? "ATTUNED" : "LOCKED");
    this.confirmButton?.setLabel(
      snapshot.selectedEngine
        ? CELESTIAL_ENGINE_CONFIG.copy.selected
        : CELESTIAL_ENGINE_CONFIG.copy.confirm,
    );
    this.confirmButton?.setHint(canChoose ? "PERMANENT" : "");
  }

  _activateConfirm() {
    const snapshot = this.progression.getSnapshot();
    if (snapshot.selectedEngine) return false;
    if (snapshot.availableHearts <= 0) {
      this.scene.hudSystem?.flashStatus?.(
        CELESTIAL_ENGINE_CONFIG.copy.unavailable,
        "#7896A8",
        1600,
      );
      this.scene.soundSystem?.playUiSelect?.();
      return false;
    }

    const engineId = CELESTIAL_ENGINE_ORDER[this.selectedIndex];
    const now = this.scene.time?.now || 0;
    const armed = this.confirmEngineId === engineId
      && now - this.confirmArmedAtMs <= CELESTIAL_ENGINE_CONFIG.input.confirmWindowMs;
    if (!armed) {
      this.confirmEngineId = engineId;
      this.confirmArmedAtMs = now;
      this.confirmButton?.setLabel(CELESTIAL_ENGINE_CONFIG.copy.permanentConfirm);
      this.confirmButton?.setHint(CELESTIAL_ENGINE_CONFIG.engines[engineId].shortName);
      this._pulseCard(this.selectedIndex);
      return true;
    }

    const result = this.progression.chooseEngine(engineId);
    if (!result.ok) return false;
    this.scene.soundSystem?.playUiConfirm?.();
    this.scene.screenFlashSystem?.flashLucky?.();
    this.scene.shakeSystem?.shake(CELESTIAL_ENGINE_CONFIG.fx.hitShakeSignature);
    this.scene.hudSystem?.flashStatus?.(
      `${CELESTIAL_ENGINE_CONFIG.engines[engineId].shortName} ATTUNED`,
      CELESTIAL_ENGINE_CONFIG.engines[engineId].cssAccent,
      2800,
    );
    return true;
  }

  _pulseCard(index) {
    const view = this.cardViews[index];
    if (!view) return;
    this.scene.tweens.killTweensOf(view.sprite);
    this.scene.tweens.add({
      targets: view.sprite,
      scaleX: view.spriteScaleX * 1.1,
      scaleY: view.spriteScaleY * 1.1,
      duration: 150,
      yoyo: true,
      ease: "Back.out",
    });
  }

  destroy() {
    this.unsubscribe?.();
    this.shell?.destroy();
    this.shell = null;
    this.opened = false;
  }
}
