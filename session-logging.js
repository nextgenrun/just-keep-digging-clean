// Independent early entry: recording begins before Phaser boot and menu creation.
import { PlayerSessionService } from './ui/telemetry/PlayerSessionService.js';
let service = null;
try {
  if (typeof window !== 'undefined') {
    service = new PlayerSessionService(window);
    window.__understarSession = service;
  }
} catch { /* Logging must never prevent the game from loading. */ }
export const sessionLogging = service;
