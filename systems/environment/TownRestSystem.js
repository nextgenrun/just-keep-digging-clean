import { TOWN_REST as C, getSleepDayFraction, getSleepTimelapseProgress } from '../../values/townRest.js';
import { USER_SETTINGS } from '../UserSettings.js';
import { acquireUiInputPriority, hasUiInputPriority } from '../UiInputPriorityRegistry.js';

// Owns the bed interaction and the sleep -> refill -> blessing -> checkpoint flow.
export class TownRestSystem {
  constructor(scene, view, ports) {
    this.scene = scene; this.view = view; this.ports = ports;
    this.phase = 'idle'; this.selected = 0; this.elapsed = 0; this.completed = 0;
    this.ready = view.create();
    this.onKey = event => {
      if (this.phase !== 'choosing' || event.repeat) return;
      const key = event.key.toUpperCase();
      if ([USER_SETTINGS.getKey('moveLeft'), USER_SETTINGS.getKey('aimUp'), 'ARROWLEFT', 'ARROWUP']
        .map(x => String(x).toUpperCase()).includes(key)) this.select(0);
      if ([USER_SETTINGS.getKey('moveRight'), USER_SETTINGS.getKey('aimDown'), 'ARROWRIGHT', 'ARROWDOWN']
        .map(x => String(x).toUpperCase()).includes(key)) this.select(1);
      if (key === 'ENTER' || key === String(USER_SETTINGS.getKey('interact')).toUpperCase()) void this.confirm();
    };
    scene.input.keyboard.on('keydown', this.onKey);
    this.onResize = () => this.view.resize();
    scene.scale.on('resize', this.onResize);
    this.onPresentationUpdate = () => {
      if (this.isActive()) return;
      const available = this.canInteract();
      if (!available) this.view.setPrompt(false, '');
      this.view.caption?.setVisible?.(available);
    };
    scene.events.on('postupdate', this.onPresentationUpdate);
  }
  isActive() { return this.phase !== 'idle' && this.phase !== 'destroyed'; }
  isInRange() {
    if (!this.ready || !this.ports.inTown()) return false;
    const body = this.scene.playerController.physicsBody;
    return body.onGround && Math.abs(body.x + body.w / 2 - this.view.x)
      <= C.bed.rangeTiles * this.scene.config.tileSize;
  }
  canInteract() {
    return this.scene.gameState === 'playing'
      && this.scene.sceneModeController?.isGameplayActive !== false && !this.scene._pillarViewActive
      && !hasUiInputPriority(this.scene) && !this.scene._worldMapFeatureLoading
      && !this.scene._teleportInAnimating
      && !this.scene.emberDiscoveryEventSystem?.isActive?.();
  }
  getInteractionDistance() {
    if (!this.canInteract() || !this.isInRange()) return Infinity;
    const tile = this.scene.playerController.getPlayerTile();
    return Math.abs(tile.tx - Math.floor(C.bed.tileX))
      + Math.abs(tile.ty - (this.scene.config.topAirRows - 1));
  }
  updateInteraction() {
    const tile = this.scene.playerController.getPlayerTile();
    const distance = this.getInteractionDistance();
    const competition = Math.min(
      this.scene.npcManager?.getNearestInteractionDistance?.(tile) ?? Infinity,
      this.scene.starPillarSystem?.getWorldrootInteractionDistance?.(tile) ?? Infinity);
    const near = distance < competition;
    this.view.setPrompt(near, USER_SETTINGS.getKeyLabel('interact'));
    if (near && this.scene.inputHandler.consumeSpecialTileInteractInput()) return this.requestSleep();
    return false;
  }
  requestSleep() {
    if (this.isActive() || !this.isInRange() || this.scene._hardcoreDeathInProgress
      || !this.canInteract()) return false;
    this.guidance?.clear();
    this.phase = 'dozing'; this.elapsed = 0; this.simulatedMs = 0;
    this.releaseUiPriority = acquireUiInputPriority(this.scene);
    this.sleepDuration = getSleepDayFraction()
      * this.scene.dayNightCycle.dayDuration;
    this.scene.setShopOpen(true);
    this.scene.comboSystem?.pause?.(this.scene.time.now);
    this.scene.playerController.physicsBody.vx = 0;
    this.scene.playerController.physicsBody.vy = 0;
    this.scene.uiNotifications?.setPaused?.(true);
    this.view.beginSleep();
    if (this.ports.beginDozing?.(C.timing.dozeMs) !== true) this.beginTimelapse();
    this.scene.soundSystem?.playUiConfirm?.();
    return true;
  }
  beginTimelapse() {
    this.phase = 'sleeping'; this.elapsed = 0;
    this.ports.beginTimelapse?.(C.timing.sleepMs, C.timing.timelapseFadeMs);
    this.view.beginTimelapse?.();
  }
  update(time, delta) {
    this.ports.consumeBlockedMenuInput?.();
    const dt = Math.min(C.timing.maxFrameMs, Math.max(0, Number(delta) || 0));
    if (this.phase === 'dozing') {
      this.elapsed = Math.min(C.timing.dozeMs, this.elapsed + dt);
      this.ports.updateDozing?.(this.elapsed);
      if (this.elapsed >= C.timing.dozeMs) this.beginTimelapse();
    } else if (this.phase === 'sleeping') {
      this.elapsed = Math.min(C.timing.sleepMs, this.elapsed + dt);
      const target = this.sleepDuration * getSleepTimelapseProgress(this.elapsed);
      this.scene.weatherSystem.advanceForSleep(target - this.simulatedMs, this.scene.dayNightCycle);
      this.simulatedMs = target;
      this.scene.dayNightCycle.update(0);
      this.view.updateCamera(this.elapsed);
      this.ports.updateDozing?.(this.elapsed);
      if (this.elapsed >= C.timing.sleepMs) {
        this.phase = 'waking'; this.elapsed = 0;
        this.scene.campfireSystem.restoreEmberCharges(C.copy.refillSource, { silent: true });
        this.view.prepareWake?.();
        this.wakePresentation = this.ports.awaken?.() === true;
        if (!this.wakePresentation) this.view.wake();
      }
    } else if (this.phase === 'waking') {
      if (this.wakePresentation) {
        if (!this.ports.isAwakening?.()) {
          this.wakePresentation = false;
          this.view.wake();
          this.elapsed = 0;
        }
      } else this.elapsed += dt;
      if (!this.wakePresentation && this.elapsed >= C.timing.wakeMs) {
        this.view.restoreCamera();
        this.phase = 'choosing';
        this.selected = this.scene.campfireSystem._selectedIndex;
        this.view.showMenu(this);
      }
    }
    // Environment still renders while every player action and hazard is suspended.
    this.scene.weatherSystem.update(time, dt, { simulated: true });
    this.scene.atmosphereSystem?.update(time, dt);
    this.scene.worldRenderer?.update?.(time, dt, { playerTile: this.scene.playerController.getPlayerTile() });
    this.scene.backgroundRenderer?.updateUniverseSky?.();
    this.scene.startZoneScenicBackgroundSystem?.update?.();
    this.scene.worldBackgroundAmbientMotionSystem?.update?.(time, dt);
    this.scene.levelOneLivingBackdropSystem?.update?.(time, dt);
    this.scene.lightSystem?.update?.(time, dt, 0, false);
    this.scene.shaderSystem?.update?.(time, dt);
  }
  select(index) {
    if (this.phase !== 'choosing') return;
    this.selected = Math.max(0, Math.min(this.scene.campfireSystem._buffs.length - 1, index));
    this.view.refreshSelection(this.selected);
  }
  async confirm() {
    if (this.phase !== 'choosing' || this.upgrading) return false;
    this.phase = 'saving';
    const camp = this.scene.campfireSystem;
    const previous = { buff: camp.getActiveBuff(), selected: camp._selectedIndex, rested: camp._hasRested };
    camp._hasRested = true;
    camp._selectedIndex = this.selected;
    camp._applyBuff(camp._buffs[this.selected]);
    this.scene.celestialActionBarSystem?.sync?.();
    let saved = false;
    try { saved = await this.ports.save(); } catch { saved = false; }
    if (this.phase === 'destroyed') return false;
    if (!saved) {
      camp._activeBuff = previous.buff; camp._selectedIndex = previous.selected; camp._hasRested = previous.rested;
      this.phase = 'choosing'; this.view.showCaption(3);
      return false;
    }
    this.completed += 1;
    this.ports.consumeBlockedMenuInput?.();
    this.phase = 'idle'; this.view.hideMenu(); this.view.restoreHud?.(); this.view.showCaption(2);
    this.scene.time.delayedCall(C.timing.feedbackMs, () => {
      if (!this.isActive()) { this.view.caption?.destroy(); this.view.caption = null; }
    });
    this.scene.setShopOpen(false);
    this.releaseUiPriority?.(); this.releaseUiPriority = null;
    this.scene.uiNotifications?.setPaused?.(false);
    this.scene.soundSystem?.playManualSave?.();
    this.scene.events.emit('town-rest-completed', { day: this.scene.dayNightCycle.day,
      buff: camp.getSelectedBuff().type, charges: camp.getEmberCharges() });
    return true;
  }
  async upgrade() {
    if (this.phase !== 'choosing' || this.upgrading) return false;
    this.upgrading = true;
    try {
      const result = await this.scene.campfireSystem.upgradeCampfire();
      if (this.phase === 'choosing') this.view.showMenu(this);
      return result.success;
    } finally { this.upgrading = false; }
  }
  showSaveHint() {
    if (!this.ready || this.isActive()) return false;
    this.view.caption?.destroy(); this.view.caption = null;
    return this.guidance?.request() || false;
  }
  getSnapshot() {
    return { phase: this.phase, ready: this.ready, elapsed: this.elapsed,
      simulatedMs: this.simulatedMs || 0, completed: this.completed,
      inTown: this.ports.inTown(), inRange: this.isInRange(), selected: this.selected };
  }
  destroy() {
    const active = this.isActive(); this.phase = 'destroyed';
    this.scene.input.keyboard.off('keydown', this.onKey);
    this.scene.scale.off('resize', this.onResize);
    this.scene.events.off('postupdate', this.onPresentationUpdate);
    this.guidance?.destroy();
    this.ports.endPresentation?.();
    this.view.destroy();
    if (active) this.scene.setShopOpen(false);
    this.releaseUiPriority?.(); this.releaseUiPriority = null;
  }
}
