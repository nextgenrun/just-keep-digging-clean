import { PLAYER_SESSION_LOGGING as C } from '../../values/playerSessionLogging.js';
export class BrowserSessionInputs {
  constructor(service, documentRef = document, windowRef = window) {
    this.service = service; this.document = documentRef; this.window = windowRef;
    this.listeners = []; this.keys = new Map(); this.lastPointer = 0; this.pads = new Map();
    this.resolveAction = () => null;
    const on = (target, name, fn) => {
      const safe = event => { try { fn(event); } catch {} };
      target.addEventListener(name, safe, { passive: true, capture: true });
      this.listeners.push(() => target.removeEventListener(name, safe, true));
    };
    on(documentRef, 'keydown', event => this.keyboard(event, true));
    on(documentRef, 'keyup', event => this.keyboard(event, false));
    for (const name of ['pointerdown', 'pointerup', 'pointercancel']) on(documentRef, name, event => this.pointer(event, name));
    on(documentRef, 'pointermove', event => this.pointerMove(event));
    on(documentRef, 'visibilitychange', () => {
      if (!service.enabled) return;
      service.recorder.setState({ visible: documentRef.visibilityState !== 'hidden' });
      if (documentRef.visibilityState === 'hidden') { this.keys.clear(); void service.flush(true); }
    });
    on(windowRef, 'blur', () => { this.keys.clear(); if (service.enabled) service.recorder.setState({ focused: false }); });
    on(windowRef, 'focus', () => { if (service.enabled) service.recorder.setState({ focused: true }); });
    on(windowRef, 'pagehide', () => { service.record('page_hide'); void service.flush(true); });
    on(windowRef, 'pageshow', event => { if (event.persisted) service.record('page_resume'); });
    on(windowRef, 'error', event => service.record('runtime_error', {
      code: event.error?.name || 'resource_error', file: String(event.filename || event.target?.src || '').split('?')[0].split('/').pop(),
      line: event.lineno, column: event.colno,
    }));
    on(windowRef, 'unhandledrejection', event => service.record('promise_error', { code: event.reason?.name || 'unhandled' }));
  }
  keyboard(event, down) {
    const editable = event.target?.isContentEditable || event.target?.closest?.('input,textarea,select,[contenteditable=true]');
    if (down && event.code === C.toggleKey && !event.repeat && !editable) { void this.service.setEnabled(!this.service.enabled); return; }
    if (!this.service.enabled) return;
    if (!down) {
      const action = this.keys.get(event.code); this.keys.delete(event.code);
      if (action) this.service.recorder.input(action, false, { action: action.split(':')[0], code: event.code });
      return;
    }
    if (editable || event.repeat || event.metaKey || event.altKey) return;
    const action = this.service.recorder.phase === 'gameplay' ? (this.resolveAction(event) || (/^(Key[A-Z]|Digit[0-9]|F[0-9]{1,2}|Arrow[A-Za-z]+|Space|Escape|Tab|Enter|Home|End|ShiftLeft|ShiftRight|ControlLeft|ControlRight)$/.test(event.code) ? 'game_control' : null))
      : C.menuKeys.includes(event.code) ? event.code : null;
    if (!action) { this.service.recorder.activity(); return; }
    this.keys.set(event.code, action + ':' + event.code); this.service.recorder.input(action + ':' + event.code, true, { action, code: event.code });
  }
  point(event) {
    const rect = this.document.getElementById('game-root')?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return {};
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height, pointer: event.pointerType };
  }
  pointer(event, name) {
    if (!this.service.enabled) return;
    const down = name === 'pointerdown';
    if (down && !event.target?.closest?.('#game-root')) return;
    this.service.recorder.input('pointer_' + event.pointerId + '_' + event.button, down, { button: event.button, index: event.pointerId, ...this.point(event) });
    if (name === 'pointercancel') this.service.recorder.releaseAll('pointer_cancelled');
  }
  pointerMove(event) {
    if (!this.service.enabled || !event.target?.closest?.('#game-root')) return;
    const now = performance.now();
    if (now - this.lastPointer < C.pointerIntervalMs) return;
    this.lastPointer = now; this.service.recorder.activity();
    this.service.record('pointer_move', this.point(event));
  }
  sampleGamepads() {
    if (!this.service.enabled || this.document.visibilityState === 'hidden') return;
    const seen = new Set();
    for (const pad of Array.from(this.window.navigator.getGamepads?.() || []).filter(Boolean).slice(0, 4)) {
      for (const [index, button] of pad.buttons.slice(0, 32).entries()) {
        const action = 'gamepad_' + pad.index + '_button_' + index; seen.add(action);
        if (this.pads.get(action) !== button.pressed) {
          this.service.recorder.input(action, button.pressed, { value: button.value }); this.pads.set(action, button.pressed);
        }
      }
      for (const [index, raw] of pad.axes.slice(0, 8).entries()) {
        const value = Math.abs(raw) < C.gamepadDeadzone ? 0 : Math.round(raw * 10) / 10;
        const action = 'gamepad_' + pad.index + '_axis_' + index; seen.add(action);
        if (this.pads.get(action) !== value) {
          this.service.record('gamepad_axis', { index: pad.index, axis: index, value });
          this.service.recorder.input(action, value !== 0, { value });
          this.pads.set(action, value);
        }
      }
    }
    for (const key of this.pads.keys()) if (!seen.has(key)) { this.service.recorder.input(key, false, { synthetic: true }); this.pads.delete(key); }
  }
  destroy() { this.listeners.forEach(dispose => dispose()); this.listeners = []; this.keys.clear(); }
}
