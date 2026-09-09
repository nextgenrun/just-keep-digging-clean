import { TOWN_REST } from '../../values/townRest.js';
import { hasUiInputPriority } from '../UiInputPriorityRegistry.js';

// Keeps optional bed directions alive when the player starts following them.
export class TownRestGuidanceSystem {
  constructor(scene, view, ports) {
    this.scene = scene; this.view = view; this.ports = ports;
    this.config = TOWN_REST.guidance;
    this.phase = 'idle'; this.elapsed = 0; this.alpha = 0; this.visible = false;
    this.ready = view.create();
    this.onUpdate = (_time, delta) => this.update(delta);
    scene.events.on('postupdate', this.onUpdate);
  }
  distance() {
    const body = this.scene.playerController?.physicsBody;
    const target = this.ports.target();
    if (!body || !target) return Infinity;
    return Math.hypot(body.x + body.w / 2 - target.x, body.y + body.h - target.feetY);
  }
  request() {
    if (!this.ready || this.phase === 'destroyed' || this.ports.resting()) return false;
    this.phase = this.ports.arrived() ? 'arrived'
      : this.phase === 'following' ? 'following' : 'invited';
    this.elapsed = 0; this.alpha = 1; this.furthestDistance = this.distance();
    this.update(0);
    return true;
  }
  update(delta) {
    if (this.phase === 'idle' || this.phase === 'destroyed') return;
    if (this.ports.resting() || this.scene._hardcoreDeathInProgress) { this.clear(); return; }
    this.visible = this.scene.gameState === 'playing'
      && this.scene.sceneModeController?.isGameplayActive !== false
      && !hasUiInputPriority(this.scene) && !this.scene._teleportInAnimating;
    if (!this.visible) { this.view.hide(); return; }
    this.elapsed += Math.min(TOWN_REST.timing.maxFrameMs, Math.max(0, Number(delta) || 0));
    if (this.ports.arrived()) this.phase = 'arrived';
    if (this.phase === 'invited' || this.phase === 'fading') {
      const distance = this.distance();
      this.furthestDistance = Math.max(this.furthestDistance, distance);
      if (this.furthestDistance - distance >= this.config.progressTiles * this.scene.config.tileSize) {
        this.phase = 'following';
      } else if (this.elapsed >= this.config.ignoreMs) this.phase = 'fading';
    }
    this.alpha = this.phase === 'fading'
      ? Math.max(0, 1 - (this.elapsed - this.config.ignoreMs) / this.config.fadeMs) : 1;
    const hintAlpha = Math.max(0, Math.min(1,
      (this.config.hintMs + this.config.fadeMs - this.elapsed) / this.config.fadeMs));
    if (!this.alpha || (this.phase === 'arrived' && !hintAlpha)) { this.clear(); return; }
    this.view.present({ target: this.ports.target(), alpha: this.alpha,
      showArrow: this.phase !== 'arrived', hintAlpha });
  }
  clear() {
    this.phase = 'idle'; this.alpha = 0; this.visible = false;
    this.view.hide();
  }
  getSnapshot() {
    return { phase: this.phase, elapsed: this.elapsed, alpha: this.alpha,
      visible: this.visible, ready: this.ready, distance: this.distance(),
      arrowVisible: Boolean(this.view.arrow?.visible), edge: Boolean(this.view.edge) };
  }
  destroy() {
    this.scene.events.off('postupdate', this.onUpdate);
    this.clear(); this.phase = 'destroyed'; this.view.destroy();
  }
}
