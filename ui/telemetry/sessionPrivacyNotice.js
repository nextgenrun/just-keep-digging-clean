import { PLAYER_SESSION_LOGGING as C } from '../../values/playerSessionLogging.js';
import { UI_FONTS } from '../../values/uiLayout.js';
import { UI_COLORS } from '../../values/uiColors.js';
export function addSessionPrivacyNotice(scene) {
  const service = globalThis.__understarSession;
  if (!service?.allowed) return;
  const copy = () => service.enabled ? C.notice.enabled : C.notice.disabled;
  const text = scene.add.text(scene.scale.width / 2, scene.scale.height - C.notice.bottom, copy(), {
    fontFamily: UI_FONTS.mono, fontSize: C.notice.fontSize, color: UI_COLORS.dim,
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  text.setData('telemetryAction', 'toggle_logging');
  text.on('pointerdown', () => { void service.setEnabled(!service.enabled); });
  const timer = scene.time.addEvent({ delay: C.sampleIntervalMs, loop: true, callback: () => text.setText(copy()) });
  scene.events.once('shutdown', () => timer.remove());
}
