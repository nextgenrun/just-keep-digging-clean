import { TITAN_DISCOVERY_CONFIG } from "../../values/titanDiscoveries.js";
import {
  createTitanGuidanceIndicatorLayout,
  titanGuidanceWorldToScreen,
} from "./titanGuidanceIndicatorGeometry.js";

const round = value => Math.round(Number(value) * 10) / 10;

export class TitanGuidanceIndicator {
  constructor(scene, experienceConfig) {
    this.scene = scene;
    this.experienceConfig = experienceConfig;
    this.config = experienceConfig.guidance.indicator;
    this.root = null;
    this.pointer = null;
    this.created = false;
    this.destroyed = false;
    this.snapshot = this._emptySnapshot();
    this._create();
  }

  _emptySnapshot() {
    return {
      created: false,
      visible: false,
      edgeClamped: false,
      targetOnScreen: false,
      pointerX: 0,
      pointerY: 0,
      angleRadians: 0,
      source: "",
    };
  }

  _hasTexture(key) {
    return typeof this.scene?.textures?.exists !== "function"
      || this.scene.textures.exists(key);
  }

  _create() {
    const add = this.scene?.add;
    const pointerKey = TITAN_DISCOVERY_CONFIG.assets.guidancePointer.key;
    if (
      !add?.container
      || !add?.image
      || !this._hasTexture(pointerKey)
    ) {
      return;
    }

    this.pointer = add.image(0, 0, pointerKey)
      .setOrigin(0.5)
      .setDisplaySize(this.config.pointerSizePx, this.config.pointerSizePx)
      .setAlpha(this.config.pointerAlpha);
    this.root = add.container(0, 0, [this.pointer])
      .setScrollFactor(0)
      .setDepth(this.config.depth)
      .setVisible(false);
    this.created = true;
  }

  show({
    time,
    playerWorld,
    targetWorld,
    source,
  }) {
    if (this.destroyed || !targetWorld) return this.hide();
    if (this.scene?.uiNotifications?.getSnapshot?.()?.entry) return this.hide();
    const viewport = {
      width: this.scene?.scale?.width
        || this.scene?.config?.viewportWidth
        || this.config.referenceViewportWidthPx,
      height: this.scene?.scale?.height
        || this.scene?.config?.viewportHeight
        || this.config.referenceViewportHeightPx,
    };
    const camera = this.scene?.cameras?.main || {};
    const playerScreen = playerWorld
      ? titanGuidanceWorldToScreen(playerWorld, camera)
      : { x: viewport.width / 2, y: viewport.height / 2 };
    const targetScreen = titanGuidanceWorldToScreen(targetWorld, camera);
    const layout = createTitanGuidanceIndicatorLayout(
      viewport,
      playerScreen,
      targetScreen,
      this.config,
    );
    this.snapshot = {
      created: this.created,
      visible: true,
      edgeClamped: layout.edgeClamped,
      targetOnScreen: layout.targetOnScreen,
      pointerX: round(layout.pointer.x),
      pointerY: round(layout.pointer.y),
      angleRadians: round(layout.angleRadians),
      source,
    };
    if (!this.created) return this.snapshot;

    const clue = source === this.experienceConfig.guidance.clueSourceId;
    const alpha = clue
      ? this.config.clueAlpha
      : this.config.resonanceAlpha;
    const pulse = 1 + Math.sin(
      (Number(time) || 0) / this.config.pointerPulsePeriodMs * Math.PI * 2,
    ) * this.config.pointerPulseScale;
    this.root.setVisible(true).setAlpha(alpha);
    this.pointer
      .setPosition(layout.pointer.x, layout.pointer.y)
      .setRotation(layout.angleRadians)
      .setDisplaySize(
        this.config.pointerSizePx * pulse,
        this.config.pointerSizePx * pulse,
      );
    return this.snapshot;
  }

  hide() {
    this.root?.setVisible(false);
    this.snapshot = {
      ...this._emptySnapshot(),
      created: this.created,
    };
    return null;
  }

  getSnapshot() {
    return { ...this.snapshot };
  }

  destroy() {
    this.destroyed = true;
    this.root?.destroy(true);
    this.root = null;
    this.pointer = null;
    this.created = false;
    this.snapshot = this._emptySnapshot();
    this.scene = null;
  }
}
