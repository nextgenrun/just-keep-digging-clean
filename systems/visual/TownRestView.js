import { TOWN_REST as C } from '../../values/townRest.js';
import { CAMPFIRE_TIERS } from '../../values/campfireConfig.js';
import { ASSET_KEYS } from '../../values/assetKeys.js';
import { UI_FONTS } from '../../values/uiLayout.js';

// Baked bed, a sleeping portrait, Ember flight and the illustrated waking panel.
export class TownRestView {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.effects = [];
    this.reducedMotion = globalThis.matchMedia?.(C.ui.reducedMotionQuery)?.matches === true;
  }
  create() {
    if (!C.assets.every(a => this.scene.textures.exists(a.key))) return false;
    const ts = this.scene.config.tileSize;
    this.x = C.bed.tileX * ts;
    this.y = this.scene.config.topAirRows * ts;
    const texture = this.scene.textures.get(C.assets[2].key);
    const source = texture.getSourceImage();
    for (let i = 0; i < C.ui.captionRows; i++) {
      if (!texture.has(String(i))) texture.add(String(i), 0, 0,
        i * source.height / C.ui.captionRows, source.width, source.height / C.ui.captionRows);
    }
    this.bed = this.scene.add.image(this.x, this.y + C.bed.groundOverlapPx, C.assets[0].key)
      .setOrigin(0.5, 1).setDepth(C.bed.depth);
    this.bed.setScale(ts * C.bed.widthTiles / this.bed.width);
    this.prompt = this.scene.add.image(this.x, this.y - this.bed.displayHeight - C.bed.promptGap,
      C.assets[2].key, '0').setDepth(C.bed.depth + 1);
    this.prompt.setScale(C.bed.promptWidth / this.prompt.width).setVisible(false);
    this.keyLabel = this.makeText(this.x, this.prompt.y + C.bed.promptGap, '', 14)
      .setDepth(C.bed.depth + 1).setVisible(false);
    this.objects.push(this.bed, this.prompt, this.keyLabel);
    return true;
  }
  makeText(x, y, value, size = C.ui.fontSize) {
    return this.scene.add.text(x, y, value, { fontFamily: UI_FONTS.body,
      fontSize: `${size}px`, color: C.ui.textColor, stroke: C.ui.shadowColor,
      strokeThickness: C.ui.shadowWidth }).setOrigin(0.5);
  }
  setPrompt(visible, key) {
    this.prompt?.setVisible(visible);
    this.keyLabel?.setText(key).setVisible(visible);
  }
  showCaption(frame) {
    this.caption?.destroy();
    const cam = this.scene.cameras.main;
    this.caption = this.scene.add.image(cam.width / 2, C.ui.captionTop,
      C.assets[2].key, String(frame)).setScrollFactor(0).setDepth(C.ui.depth + 1);
    this.caption.setScale(Math.min(C.ui.captionWidth, cam.width * 0.8) / this.caption.width);
  }
  beginSleep() {
    this.reducedMotion = globalThis.matchMedia?.(C.ui.reducedMotionQuery)?.matches === true;
    this.setPrompt(false, '');
    this.hudBefore = this.scene.children.list.filter(object => object.visible
      && object.scrollFactorX === 0 && object.scrollFactorY === 0 && object.depth >= C.ui.hudDepth);
    const xpFrame = this.scene.xpProgressBar?.frame;
    if (xpFrame?.visible && !this.hudBefore.includes(xpFrame)) this.hudBefore.push(xpFrame);
    for (const object of this.hudBefore) object.setVisible(false);
    this.caption?.destroy(); this.caption = null;
    const player = this.scene.player;
    this.playerVisible = player.visible;
    player.setVisible(false);
    this.sleeper = this.scene.add.image(this.x + this.bed.displayWidth * C.ember.sleeperXRatio,
      this.y + this.bed.displayHeight * C.ember.sleeperYRatio, player.texture.key, player.frame.name)
      .setDisplaySize(player.displayWidth, player.displayHeight)
      .setRotation(-Math.PI / 2).setDepth(C.bed.depth + 0.01);
    this.sleeper.setFlipX(false);
    // Reuse the exact bed pixels as the foreground quilt over the sleeper.
    this.quilt = this.scene.add.image(this.bed.x, this.bed.y, this.bed.texture.key)
      .setOrigin(0.5, 1).setScale(this.bed.scaleX).setDepth(C.bed.depth + 0.02);
    this.quilt.setCrop(this.bed.width * 0.34, this.bed.height * 0.28,
      this.bed.width * 0.66, this.bed.height * 0.72);
    const cam = this.scene.cameras.main;
    this.cameraState = { x: cam.scrollX, y: cam.scrollY, zoom: cam.zoom, target: cam._follow,
      offsetX: cam.followOffset.x, offsetY: cam.followOffset.y };
    cam.stopFollow();
  }
  beginTimelapse() {
    this.timelapse = true;
    this.scene.cameras.main.setZoom(C.camera.zoom);
    this.updateCamera();
  }
  updateCamera() {
    if (!this.cameraState || !this.timelapse) return;
    const cam = this.scene.cameras.main;
    // Frame the actual mountains, sky and Worldroot at native camera scale.
    cam.setScroll(Math.round(C.camera.focusTileX * this.scene.config.tileSize - cam.width / 2),
      Math.round(this.y - cam.height * C.camera.groundScreenRatio));
  }
  prepareWake() {
    this.restoreActor();
    this.restoreCamera();
    this.caption?.destroy(); this.caption = null;
  }
  wake() {
    this.prepareWake();
    const icon = ASSET_KEYS.ui.lootPickups.emberOre;
    if (!this.scene.textures.exists(icon)) return;
    const fire = this.scene.campfireSystem;
    const end = this.scene.playerController.getPlayerPosition();
    for (let i = 0; i < C.ember.count; i++) {
      const ember = this.scene.add.image(fire._campX, fire._campY, icon)
        .setDisplaySize(C.ember.size, C.ember.size).setDepth(C.bed.depth + 2);
      this.effects.push(ember);
      const startX = ember.x, startY = ember.y;
      this.scene.tweens.addCounter({ from: 0, to: 1, duration: C.ember.travelMs,
        delay: i * C.ember.startDelayMs, onUpdate: tween => {
          const t = tween.getValue();
          ember.setPosition(startX + (end.x - startX) * t,
            startY + (end.y - startY) * t - Math.sin(t * Math.PI) * C.ember.arcHeight);
          ember.setAlpha(1 - t * t);
        }, onComplete: () => ember.destroy() });
    }
  }
  showMenu(rest) {
    this.hideMenu();
    const scene = this.scene;
    const cam = scene.cameras.main;
    this.blocker = scene.add.zone(cam.width / 2, cam.height / 2, cam.width, cam.height)
      .setScrollFactor(0).setDepth(C.ui.depth - 1).setInteractive();
    this.menu = scene.add.container(0, 0).setScrollFactor(0).setDepth(C.ui.depth);
    this.menu.add(scene.add.image(0, 0, C.assets[1].key).setOrigin(0));
    const camp = scene.campfireSystem;
    const tier = CAMPFIRE_TIERS[camp.getCampfireLevel() - 1];
    this.focus = scene.add.image(0, 0, C.assets[1].key).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);
    this.focus.setAlpha(0.14);
    this.menu.add(this.focus);
    camp._buffs.forEach((buff, index) => {
      const value = C.copy.stats.replace('{bonus}', Math.round(tier[buff.stat] * 100))
        .replace('{seconds}', Math.round(tier.durationMs / 1000));
      this.menu.add(this.makeText(C.ui.cardCenters[index], C.ui.statsY, value));
      const zone = scene.add.zone(C.ui.cardCenters[index], C.ui.cardY,
        C.ui.cardWidth, C.ui.cardHeight).setScrollFactor(0).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => rest.select(index));
      zone.on('pointerdown', () => { rest.select(index); void rest.confirm(); });
      this.menu.add(zone);
    });
    const next = CAMPFIRE_TIERS[camp.getCampfireLevel()];
    const price = next ? C.copy.upgrade.replace('{tier}', next.level)
      .replace('{gold}', next.cost.toLocaleString()) : C.copy.maximum;
    this.menu.add(this.makeText(C.ui.upgradeX, C.ui.priceY, price));
    const upgrade = scene.add.zone(C.ui.upgradeX, C.ui.upgradeY,
      C.ui.upgradeWidth, C.ui.upgradeHeight).setScrollFactor(0).setInteractive({ useHandCursor: true });
    upgrade.on('pointerdown', () => { void rest.upgrade(); });
    this.menu.add(upgrade);
    this.refreshSelection(rest.selected);
    this.resize();
  }
  refreshSelection(index) {
    if (!this.focus) return;
    this.focus.setCrop(C.ui.cardCenters[index] - C.ui.cardWidth / 2,
      C.ui.cardY - C.ui.cardHeight / 2, C.ui.cardWidth, C.ui.cardHeight);
  }
  resize() {
    const cam = this.scene.cameras.main;
    if (this.menu) {
      const scale = Math.min(C.ui.width / C.ui.sourceWidth, cam.width / C.ui.sourceWidth,
        cam.height * C.ui.maxHeightRatio / C.ui.sourceHeight);
      this.menu.setScale(scale).setPosition((cam.width - C.ui.sourceWidth * scale) / 2,
        (cam.height - C.ui.sourceHeight * scale) / 2);
      this.blocker?.setPosition(cam.width / 2, cam.height / 2).setSize(cam.width, cam.height);
    }
    this.caption?.setPosition(cam.width / 2, C.ui.captionTop);
    this.updateCamera();
  }
  hideMenu() {
    this.menu?.destroy(); this.menu = null; this.focus = null;
    this.blocker?.destroy(); this.blocker = null;
  }
  restoreActor() {
    if (this.playerVisible !== undefined) this.scene.player?.setVisible(this.playerVisible);
    this.playerVisible = undefined;
    this.sleeper?.destroy(); this.sleeper = null;
    this.quilt?.destroy(); this.quilt = null;
  }
  restoreHud() {
    for (const object of this.hudBefore || []) if (object.active) object.setVisible(true);
    this.hudBefore = [];
  }
  restoreCamera() {
    this.timelapse = false;
    const state = this.cameraState;
    if (!state) return;
    const cam = this.scene.cameras.main;
    if (!cam?.scene) { this.cameraState = null; return; }
    cam.setZoom(state.zoom);
    if (state.target?.active) cam.startFollow(state.target, false, cam.lerp.x, cam.lerp.y,
      state.offsetX, state.offsetY);
    cam.setScroll(state.x, state.y);
    this.cameraState = null;
  }
  destroy() {
    this.restoreActor(); this.restoreCamera(); this.restoreHud(); this.hideMenu();
    this.caption?.destroy();
    for (const object of [...this.objects, ...this.effects]) object.destroy?.();
    this.objects = []; this.effects = [];
  }
}
