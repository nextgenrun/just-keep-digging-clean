import { PLAYER_VOICE_LIBRARY } from "../values/playerVoiceCharacterLeoV1.generated.js";
import { resolvePlayerVoiceFamily } from "./PlayerVoiceRuntimeMode.js";

/** Owns F8 and console controls for the modular player voice runtime. */
export class EventVoiceLineReviewBridge {
  constructor(director, config, search) {
    this.director = director;
    this.config = config;
    this.reviewFamily = resolvePlayerVoiceFamily(config, search);
    this.inspector = null;
    this.keyHandler = null;
    this._install();
  }

  destroy() {
    if (globalThis.__jkdPlayerVoices === this.inspector) {
      delete globalThis.__jkdPlayerVoices;
    }
    globalThis.removeEventListener?.("keydown", this.keyHandler);
    this.inspector = null;
    this.keyHandler = null;
  }

  _install() {
    if (!this.director.enabled || typeof globalThis === "undefined") return;
    this.inspector = {
      trigger: (eventId, context = {}) => this.director.requestEvent(eventId, context),
      snapshot: () => this.director.getSnapshot(),
      families: () => Object.keys(PLAYER_VOICE_LIBRARY),
    };
    globalThis.__jkdPlayerVoices = this.inspector;
    this.keyHandler = event => {
      if (event.code !== this.config.reviewTriggerKey) return;
      this.director.requestEvent(this.reviewFamily, {
        dedupeKey: `review-${this.director.getSnapshot().metrics.eventAttempts}`,
        tags: ["repeat"],
        reviewKey: true,
      });
    };
    globalThis.addEventListener?.("keydown", this.keyHandler);
  }
}
