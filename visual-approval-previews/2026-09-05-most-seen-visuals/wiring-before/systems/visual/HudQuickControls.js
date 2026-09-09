import { ASSET_KEYS } from "../../values/assetKeys.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { HUD_QUICK_CONTROLS } from "../../values/hudQuickControls.js";
import { USER_SETTINGS } from "../UserSettings.js";
import { HudWikiShortcut } from "./HudWikiShortcut.js";
import { resolveInventoryFullnessState } from "./inventoryFullnessState.js";

function textureExists(scene, key) {
  return Boolean(key && scene?.textures?.exists?.(key));
}

export class HudQuickControls {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.config = options.config || HUD_QUICK_CONTROLS;
    this.depth = Number(options.depth) || 0;
    this.visible = options.visible !== false;
    this.onInventory = typeof options.onInventory === "function"
      ? options.onInventory
      : () => false;
    this.onPause = typeof options.onPause === "function"
      ? options.onPause
      : () => false;
    this.onMap = typeof options.onMap === "function"
      ? options.onMap
      : () => false;
    this.inventoryContainer = null;
    this.inventoryIcon = null;
    this.inventoryKeyFrame = null;
    this.inventoryKey = null;
    this.inventoryHit = null;
    this.inventoryFullnessState = null;
    this.inventoryFullnessTextureKeys = [];
    this.pauseContainer = null;
    this.pauseFrame = null;
    this.pauseLabel = null;
    this.pauseHit = null;
    this.mapContainer = null;
    this.mapFrame = null;
    this.mapLabel = null;
    this.mapHit = null;
    this.wikiShortcut = null;
    this._destroyed = false;
    this._create();
  }

  _create() {
    if (this.config.enabled !== true) return;
    const fullnessAssetNames = this.config.inventory.fullness?.assetNames || [];
    this.inventoryFullnessTextureKeys = fullnessAssetNames.map(
      (name) => ASSET_KEYS.ui.approvedHud[name] || null,
    );
    const emptyInventoryKey = this.inventoryFullnessTextureKeys[0] || null;
    const inventoryKey = textureExists(this.scene, emptyInventoryKey)
      ? emptyInventoryKey
      : textureExists(
        this.scene,
        ASSET_KEYS.ui.approvedHud.inventory,
      )
        ? ASSET_KEYS.ui.approvedHud.inventory
        : textureExists(this.scene, ASSET_KEYS.ui.lootBag)
          ? ASSET_KEYS.ui.lootBag
          : null;
    if (!inventoryKey) return;

    this.inventoryContainer = this.scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(this.depth)
      .setVisible(this.visible);
    this.inventoryHit = this.scene.add.zone(0, 0, 1, 1)
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.inventoryIcon = this.scene.add.image(0, 0, inventoryKey);
    this.inventoryKeyFrame = textureExists(
      this.scene,
      ASSET_KEYS.ui.approvedHud.inventoryKeycap,
    )
      ? this.scene.add.image(
        this.config.inventory.keyOffsetX,
        this.config.inventory.keyOffsetY,
        ASSET_KEYS.ui.approvedHud.inventoryKeycap,
      ).setAlpha(this.config.inventory.keycapAlpha)
      : null;
    this.inventoryKey = this.scene.add.text(
      this.config.inventory.keyOffsetX,
      this.config.inventory.keyOffsetY,
      USER_SETTINGS.getKeyLabel("inventory"),
      {
        fontFamily: APPROVED_HUD_SKIN.font.family,
        fontSize: `${this.config.inventory.keyFontSize}px`,
        fontStyle: "bold",
        color: this.config.inventory.keyColor,
        stroke: this.config.inventory.keyStroke,
        strokeThickness: this.config.inventory.keyStrokeThickness,
      },
    ).setOrigin(0.5);
    this.inventoryContainer.add([
      this.inventoryHit,
      this.inventoryIcon,
      this.inventoryKeyFrame,
      this.inventoryKey,
    ].filter(Boolean));
    this._wireControl({
      hit: this.inventoryHit,
      visual: this.inventoryIcon,
      container: this.inventoryContainer,
      hoverAlpha: this.config.inventory.hoverAlpha,
      pressScale: this.config.inventory.pressScale,
      activate: this.onInventory,
      pulseAfter: true,
    });
    this.setInventoryResources(
      this.scene.digSystem?.getResourceTotals?.() || {},
    );

    if (textureExists(this.scene, ASSET_KEYS.ui.approvedHud.buffChip)) {
      this.pauseContainer = this.scene.add.container(0, 0)
        .setScrollFactor(0)
        .setDepth(this.depth)
        .setVisible(this.visible);
      this.pauseHit = this.scene.add.zone(0, 0, 1, 1)
        .setScrollFactor(0)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      this.pauseFrame = this.scene.add.image(
        0,
        0,
        ASSET_KEYS.ui.approvedHud.buffChip,
      );
      this.pauseLabel = this.scene.add.text(0, 0, "", {
        fontFamily: APPROVED_HUD_SKIN.font.family,
        fontSize: `${this.config.pause.fontSize}px`,
        fontStyle: "bold",
        color: this.config.pause.color,
        stroke: this.config.pause.stroke,
        strokeThickness: this.config.pause.strokeThickness,
      }).setOrigin(0.5);
      this.pauseContainer.add([
        this.pauseHit,
        this.pauseFrame,
        this.pauseLabel,
      ]);
      this._wireControl({
        hit: this.pauseHit,
        visual: this.pauseFrame,
        container: this.pauseContainer,
        hoverAlpha: this.config.pause.hoverAlpha,
        pressScale: this.config.pause.pressScale,
        activate: this.onPause,
      });

      this.mapContainer = this.scene.add.container(0, 0)
        .setScrollFactor(0)
        .setDepth(this.depth)
        .setVisible(this.visible);
      this.mapHit = this.scene.add.zone(0, 0, 1, 1)
        .setScrollFactor(0)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      this.mapFrame = this.scene.add.image(0, 0, ASSET_KEYS.ui.approvedHud.buffChip);
      this.mapLabel = this.scene.add.text(0, 0, "", {
        fontFamily: APPROVED_HUD_SKIN.font.family,
        fontSize: `${this.config.map.fontSize}px`,
        fontStyle: "bold",
        color: this.config.map.color,
        stroke: this.config.map.stroke,
        strokeThickness: this.config.map.strokeThickness,
      }).setOrigin(0.5);
      this.mapContainer.add([this.mapHit, this.mapFrame, this.mapLabel]);
      this._wireControl({
        hit: this.mapHit,
        visual: this.mapFrame,
        container: this.mapContainer,
        hoverAlpha: this.config.map.hoverAlpha,
        pressScale: this.config.map.pressScale,
        activate: this.onMap,
      });

      this.wikiShortcut = new HudWikiShortcut(this.scene, {
        depth: this.depth,
        visible: this.visible,
        anchorProvider: () => ({
          x: this.mapContainer?.x,
          y: this.mapContainer?.y,
          height: this.mapFrame?.displayHeight,
        }),
      });
    }

    this.resize();
  }

  _wireControl({ hit, visual, container, hoverAlpha, pressScale, activate, pulseAfter = false }) {
    hit.on("pointerdown", (_pointer, _localX, _localY, event) => {
      event?.stopPropagation?.();
      if (this._destroyed || container?.visible === false) return;
      const accepted = activate() === true;
      if (!accepted) return;
      this.scene.soundSystem?.playUiSelect?.();
      this._press(container, pressScale);
      if (pulseAfter) this.pulseInventory();
    });
    hit.on("pointerover", () => {
      if (!this._destroyed) visual?.setAlpha?.(hoverAlpha);
    });
    hit.on("pointerout", () => {
      if (!this._destroyed) visual?.setAlpha?.(1);
    });
  }

  _press(container, scale) {
    if (!container || !this.scene?.tweens) return;
    this.scene.tweens.killTweensOf(container);
    container.setScale(1);
    this.scene.tweens.add({
      targets: container,
      scale,
      duration: this.config.motion.pressMs,
      yoyo: true,
      ease: "Quad.out",
    });
  }

  resize() {
    if (!this.inventoryContainer) return;
    const viewportWidth = this.scene.scale?.width
      || this.config.referenceViewport.width;
    const viewportHeight = this.scene.scale?.height
      || this.config.referenceViewport.height;
    const scale = Math.min(
      viewportWidth / this.config.referenceViewport.width,
      viewportHeight / this.config.referenceViewport.height,
    );
    const inventory = this.config.inventory;
    const inventoryWidth = inventory.width * scale;
    const inventoryHeight = inventory.height * scale;
    const inventoryX = viewportWidth - (inventory.right * scale) - inventoryWidth / 2;
    const inventoryY = viewportHeight - (inventory.bottom * scale) - inventoryHeight / 2;
    this.inventoryContainer.setPosition(inventoryX, inventoryY);
    this.inventoryIcon.setDisplaySize(inventoryWidth, inventoryHeight);
    this.inventoryKeyFrame
      ?.setPosition(inventory.keyOffsetX * scale, inventory.keyOffsetY * scale)
      .setDisplaySize(inventory.keycapWidth * scale, inventory.keycapHeight * scale)
      .setAlpha(inventory.keycapAlpha);
    this.inventoryKey
      .setPosition(inventory.keyOffsetX * scale, inventory.keyOffsetY * scale)
      .setFontSize(Math.max(11, Math.round(inventory.keyFontSize * scale)))
      .setText(USER_SETTINGS.getKeyLabel("inventory"));
    const inventoryHitWidth = (inventory.width + inventory.hitPadding * 2) * scale;
    const inventoryHitHeight = (inventory.height + inventory.hitPadding * 2) * scale;
    this.inventoryHit.setSize(inventoryHitWidth, inventoryHitHeight);
    this.inventoryHit.input?.hitArea?.setTo?.(
      0,
      0,
      inventoryHitWidth,
      inventoryHitHeight,
    );

    if (!this.pauseContainer) return;
    const pause = this.config.pause;
    const pauseWidth = pause.width * scale;
    const pauseHeight = pause.height * scale;
    const pauseX = viewportWidth - pause.right * scale - pauseWidth / 2;
    const pauseY = inventoryY - inventoryHeight / 2
      - pause.gapAboveInventory * scale - pauseHeight / 2;
    this.pauseContainer.setPosition(pauseX, pauseY);
    this.pauseFrame.setDisplaySize(pauseWidth, pauseHeight);
    this.pauseLabel
      .setFontSize(Math.max(10, Math.round(pause.fontSize * scale)))
      .setText(pause.label.replace("{key}", USER_SETTINGS.getKeyLabel("pause")));
    const pauseHitWidth = (pause.width + pause.hitPaddingX * 2) * scale;
    const pauseHitHeight = (pause.height + pause.hitPaddingY * 2) * scale;
    this.pauseHit.setSize(pauseHitWidth, pauseHitHeight);
    this.pauseHit.input?.hitArea?.setTo?.(
      0,
      0,
      pauseHitWidth,
      pauseHitHeight,
    );

    if (!this.mapContainer) return;
    const map = this.config.map;
    const mapWidth = map.width * scale;
    const mapHeight = map.height * scale;
    const mapX = viewportWidth - map.right * scale - mapWidth / 2;
    const mapY = pauseY - pauseHeight / 2 - map.gapAbovePause * scale - mapHeight / 2;
    this.mapContainer.setPosition(mapX, mapY);
    this.mapFrame.setDisplaySize(mapWidth, mapHeight);
    this.mapLabel
      .setFontSize(Math.max(10, Math.round(map.fontSize * scale)))
      .setText(map.label.replace("{key}", USER_SETTINGS.getKeyLabel("map")));
    const mapHitWidth = (map.width + map.hitPaddingX * 2) * scale;
    const mapHitHeight = (map.height + map.hitPaddingY * 2) * scale;
    this.mapHit.setSize(mapHitWidth, mapHitHeight);
    this.mapHit.input?.hitArea?.setTo?.(
      0,
      0,
      mapHitWidth,
      mapHitHeight,
    );
    this.wikiShortcut?.resize({ width: viewportWidth, height: viewportHeight });
  }

  setVisible(value) {
    this.visible = value === true;
    this.inventoryContainer?.setVisible(this.visible);
    this.pauseContainer?.setVisible(this.visible);
    this.mapContainer?.setVisible(this.visible);
    this.wikiShortcut?.setVisible(this.visible);
  }

  setInventoryResources(resources = {}) {
    const fullnessConfig = this.config.inventory.fullness;
    if (!fullnessConfig) return false;

    const nextState = resolveInventoryFullnessState(resources, fullnessConfig);
    const textureKey = this.inventoryFullnessTextureKeys[nextState.stateIndex] || null;
    const changed = this.inventoryFullnessState?.stateIndex !== nextState.stateIndex;
    this.inventoryFullnessState = nextState;

    if (
      textureExists(this.scene, textureKey)
      && this.inventoryIcon?.texture?.key !== textureKey
    ) {
      this.inventoryIcon?.setTexture(textureKey);
    }
    return changed;
  }

  getInventoryTarget() {
    if (!this.inventoryContainer) return null;
    return {
      x: this.inventoryContainer.x,
      y: this.inventoryContainer.y,
    };
  }

  pulseInventory(strong = false) {
    if (!this.inventoryContainer || this._destroyed) return;
    const scale = strong
      ? this.config.inventory.strongPulseScale
      : this.config.inventory.pulseScale;
    this.scene.tweens.killTweensOf(this.inventoryContainer);
    this.inventoryContainer.setScale(1);
    this.scene.tweens.add({
      targets: this.inventoryContainer,
      scale,
      duration: this.config.motion.pulseMs,
      yoyo: true,
      ease: "Back.out",
    });
  }

  getHealthSnapshot() {
    return {
      active: Boolean(this.inventoryContainer),
      visible: this.inventoryContainer?.visible === true,
      depth: this.inventoryContainer?.depth || 0,
      inventory: {
        keyLabel: this.inventoryKey?.text || "",
        textureKey: this.inventoryIcon?.texture?.key || null,
        width: this.inventoryIcon?.displayWidth || 0,
        height: this.inventoryIcon?.displayHeight || 0,
        keycapTextureKey: this.inventoryKeyFrame?.texture?.key || null,
        keycapWidth: this.inventoryKeyFrame?.displayWidth || 0,
        keycapHeight: this.inventoryKeyFrame?.displayHeight || 0,
        hitWidth: this.inventoryHit?.input?.hitArea?.width || 0,
        hitHeight: this.inventoryHit?.input?.hitArea?.height || 0,
        fullness: this.inventoryFullnessState
          ? { ...this.inventoryFullnessState }
          : null,
      },
      pause: {
        active: Boolean(this.pauseContainer),
        label: this.pauseLabel?.text || "",
        width: this.pauseFrame?.displayWidth || 0,
        height: this.pauseFrame?.displayHeight || 0,
        hitWidth: this.pauseHit?.input?.hitArea?.width || 0,
        hitHeight: this.pauseHit?.input?.hitArea?.height || 0,
      },
      map: {
        active: Boolean(this.mapContainer),
        label: this.mapLabel?.text || "",
        hitWidth: this.mapHit?.input?.hitArea?.width || 0,
        hitHeight: this.mapHit?.input?.hitArea?.height || 0,
      },
      wiki: this.wikiShortcut?.getHealthSnapshot() || { active: false },
    };
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.inventoryHit?.removeAllListeners?.();
    this.pauseHit?.removeAllListeners?.();
    this.mapHit?.removeAllListeners?.();
    this.wikiShortcut?.destroy();
    this.scene?.tweens?.killTweensOf?.(this.inventoryContainer);
    this.scene?.tweens?.killTweensOf?.(this.pauseContainer);
    this.scene?.tweens?.killTweensOf?.(this.mapContainer);
    this.inventoryContainer?.destroy(true);
    this.pauseContainer?.destroy(true);
    this.mapContainer?.destroy(true);
    this.inventoryContainer = null;
    this.pauseContainer = null;
    this.inventoryIcon = null;
    this.inventoryKeyFrame = null;
    this.inventoryKey = null;
    this.inventoryHit = null;
    this.inventoryFullnessState = null;
    this.inventoryFullnessTextureKeys = [];
    this.pauseHit = null;
    this.mapContainer = null;
    this.mapFrame = null;
    this.mapLabel = null;
    this.mapHit = null;
    this.wikiShortcut = null;
    this.scene = null;
  }
}
