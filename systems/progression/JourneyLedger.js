import {
  JOURNEY_CONFIG,
  JOURNEY_EVENT_TYPES,
} from "../../values/journeyConfig.js";

const ALLOWED_EVENT_TYPES = new Set(Object.values(JOURNEY_EVENT_TYPES));
const MAX_TEXT_LENGTH = 180;
const MAX_ABS_VALUE = 1_000_000_000_000;

function finiteNumber(value, fallback = null) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(-MAX_ABS_VALUE, Math.min(MAX_ABS_VALUE, value));
}
function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim().slice(0, MAX_TEXT_LENGTH);
}

function cleanSequence(value, fallback = 1) {
  return Number.isFinite(value)
    ? Math.max(1, Math.min(1_000_000_000, Math.floor(value)))
    : fallback;
}

function sanitizeEvent(value, fallbackSequence = 1) {
  if (!value || typeof value !== "object") return null;
  const type = ALLOWED_EVENT_TYPES.has(value.type) ? value.type : null;
  const title = cleanText(value.title);
  if (!type || !title) return null;
  const sequence = cleanSequence(value.sequence, fallbackSequence);
  return {
    id: cleanText(value.id, `journey-${sequence}`) || `journey-${sequence}`,
    sequence,
    type,
    title,
    detail: cleanText(value.detail),
    source: cleanText(value.source),
    before: finiteNumber(value.before),
    after: finiteNumber(value.after),
    unit: cleanText(value.unit).slice(0, 16),
    precision: Math.max(0, Math.min(3, Math.floor(finiteNumber(value.precision, 0)))),
  };
}

export function sanitizeJourneySaveData(value) {
  const rawEvents = Array.isArray(value?.events) ? value.events : [];
  const seen = new Set();
  const events = [];
  rawEvents.forEach((rawEvent, index) => {
    const event = sanitizeEvent(rawEvent, index + 1);
    if (!event || seen.has(event.id)) return;
    seen.add(event.id);
    events.push(event);
  });
  events.sort((a, b) => a.sequence - b.sequence);
  const bounded = events.slice(-JOURNEY_CONFIG.maxStoredEvents);
  const highestSequence = bounded.reduce(
    (highest, event) => Math.max(highest, event.sequence),
    0,
  );
  return {
    version: JOURNEY_CONFIG.saveVersion,
    nextSequence: Math.max(
      highestSequence + 1,
      cleanSequence(value?.nextSequence, 1),
    ),
    events: bounded,
  };
}

export class JourneyLedger {
  constructor(initialData = null) {
    this.data = sanitizeJourneySaveData(initialData);
  }

  loadSaveData(value) {
    this.data = sanitizeJourneySaveData(value);
    return this.getSaveData();
  }

  record(eventData) {
    const sequence = this.data.nextSequence;
    const event = sanitizeEvent({
      ...eventData,
      id: `journey-${sequence}`,
      sequence,
    }, sequence);
    if (!event) return null;
    this.data.events.push(event);
    this.data.events = this.data.events.slice(-JOURNEY_CONFIG.maxStoredEvents);
    this.data.nextSequence = sequence + 1;
    return { ...event };
  }

  getEvents(limit = JOURNEY_CONFIG.maxVisibleHistory) {
    const count = Math.max(0, Math.floor(Number(limit) || 0));
    return this.data.events.slice(-count).reverse().map(event => ({ ...event }));
  }

  getSaveData() {
    return sanitizeJourneySaveData(this.data);
  }
}
