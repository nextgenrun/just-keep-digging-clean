/** Selects context-fitting LEO variants and tracks session memory on playback start. */

const FIRST_TAG = "first";
const REPEAT_TAG = "repeat";

function contextKey(context = {}) {
  const value = context.dedupeKey ?? context.identity ?? context.id ?? null;
  return value === null || value === undefined ? null : String(value);
}

function normalizedTags(context = {}, occurrence = 0) {
  const tags = new Set(Array.isArray(context.tags) ? context.tags.map(String) : []);
  tags.add(occurrence > 0 ? REPEAT_TAG : FIRST_TAG);
  return tags;
}

function matchScore(asset, tags) {
  return asset.tags.reduce((score, tag) => score + (tags.has(tag) ? 1 : 0), 0);
}

export class PlayerVoiceSession {
  constructor(config) {
    this.config = config;
    this.familyCounts = new Map();
    this.eventCursors = new Map();
    this.lastEventAt = new Map();
    this.seenAdmissionKeys = new Set();
    this.reservedAdmissionKeys = new Set();
    this.recentAssetIds = [];
  }

  prepare(eventId, definition, library, context = {}) {
    const admissionKey = this._admissionKey(eventId, definition, context);
    if (
      definition.dedupe !== "none"
      && (
        this.seenAdmissionKeys.has(admissionKey)
        || this.reservedAdmissionKeys.has(admissionKey)
      )
    ) {
      return null;
    }
    const occurrence = this.familyCounts.get(eventId) || 0;
    const tags = normalizedTags(context, occurrence);
    const cursor = this.eventCursors.get(eventId) || 0;
    const scored = library.map(asset => ({ asset, score: matchScore(asset, tags) }));
    const bestScore = Math.max(...scored.map(candidate => candidate.score));
    let candidates = scored
      .filter(candidate => candidate.score === bestScore)
      .map(candidate => candidate.asset);
    const unseen = candidates.filter(asset => !this.recentAssetIds.includes(asset.id));
    if (unseen.length > 0) candidates = unseen;
    const asset = candidates[cursor % candidates.length];
    return Object.freeze({
      eventId,
      asset,
      admissionKey,
      dedupe: definition.dedupe,
      cursor,
    });
  }

  reserve(selection) {
    if (selection && selection.dedupe !== "none") {
      this.reservedAdmissionKeys.add(selection.admissionKey);
    }
  }

  release(selection) {
    if (selection && selection.dedupe !== "none") {
      this.reservedAdmissionKeys.delete(selection.admissionKey);
    }
  }

  markAccepted(eventId, now) {
    this.lastEventAt.set(eventId, now);
  }

  markStarted(selection) {
    if (!selection) return;
    this.eventCursors.set(selection.eventId, selection.cursor + 1);
    this.familyCounts.set(
      selection.eventId,
      (this.familyCounts.get(selection.eventId) || 0) + 1,
    );
    this.recentAssetIds.push(selection.asset.id);
    const limit = Math.max(1, this.config.recentAssetHistory);
    if (this.recentAssetIds.length > limit) {
      this.recentAssetIds.splice(0, this.recentAssetIds.length - limit);
    }
    if (selection.dedupe !== "none") {
      this.reservedAdmissionKeys.delete(selection.admissionKey);
      this.seenAdmissionKeys.add(selection.admissionKey);
    }
  }

  lastAcceptedAt(eventId) {
    return this.lastEventAt.get(eventId) ?? Number.NEGATIVE_INFINITY;
  }

  getSnapshot() {
    return {
      familyCounts: Object.fromEntries(this.familyCounts),
      eventCursors: Object.fromEntries(this.eventCursors),
      seenAdmissionKeys: [...this.seenAdmissionKeys],
      reservedAdmissionKeys: [...this.reservedAdmissionKeys],
      recentAssetIds: [...this.recentAssetIds],
    };
  }

  clear() {
    this.familyCounts.clear();
    this.eventCursors.clear();
    this.lastEventAt.clear();
    this.seenAdmissionKeys.clear();
    this.reservedAdmissionKeys.clear();
    this.recentAssetIds.length = 0;
  }

  _admissionKey(eventId, definition, context) {
    if (definition.dedupe === "none") return eventId;
    if (definition.dedupe === "session") return `${eventId}:session`;
    return `${eventId}:${contextKey(context) || "session"}`;
  }
}
