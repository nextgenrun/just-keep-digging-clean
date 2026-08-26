import assert from "node:assert/strict";

import { UalActionContactTimeline } from "../player/UalActionContactTimeline.js";

class FakeSprite {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return this;
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
    return this;
  }

  emit(event, ...args) {
    [...(this.listeners.get(event) || [])].forEach((callback) => callback(...args));
  }

  listenerCount(event) {
    return this.listeners.get(event)?.size || 0;
  }
}

const animation = (key) => ({ key });
const frame = (textureFrame, index = null) => ({ textureFrame, index });
const sprite = new FakeSprite();
const timeline = new UalActionContactTimeline(sprite);

assert.equal(sprite.listenerCount("animationupdate"), 1);
assert.equal(sprite.listenerCount("animationcomplete"), 1);
assert.equal(timeline.contactFired, false);

const contacts = [];
const completions = [];
const firstActionId = timeline.begin({
  animationKey: "ual-punch",
  contactFrame: 4,
  onContact: (event) => contacts.push(event),
  onComplete: (event) => completions.push(event),
});
sprite.emit("animationupdate", animation("other-action"), frame(9), sprite);
sprite.emit("animationupdate", animation("ual-punch"), frame(0), sprite);
sprite.emit("animationupdate", animation("ual-punch"), frame(2), sprite);
assert.equal(contacts.length, 0);

// Low frame rates can skip the exact texture frame; crossing it still contacts once.
sprite.emit("animationupdate", animation("ual-punch"), frame(6), sprite);
sprite.emit("animationupdate", animation("ual-punch"), frame(1), sprite);
sprite.emit("animationupdate", animation("ual-punch"), frame(7), sprite);
assert.equal(contacts.length, 1);
assert.equal(contacts[0].actionId, firstActionId);
assert.equal(contacts[0].textureFrame, 6);
assert.equal(contacts[0].trigger, "animationupdate");
assert.equal(timeline.contactFired, true);

sprite.emit("animationcomplete", animation("ual-punch"), frame(8), sprite);
sprite.emit("animationcomplete", animation("ual-punch"), frame(8), sprite);
assert.equal(completions.length, 1);
assert.equal(timeline.isActive, false);
assert.equal(timeline.contactFired, false);

// Reversed texture arrays use Phaser's 1-based animation sequence index.
let reversedContact = null;
timeline.begin({
  animationKey: "ual-reversed-up",
  contactFrame: 5,
  contactSequenceIndex: 3,
  onContact: (event) => { reversedContact = event; },
});
sprite.emit("animationupdate", animation("ual-reversed-up"), frame(10, 1), sprite);
sprite.emit("animationupdate", animation("ual-reversed-up"), frame(8, 3), sprite);
assert.equal(reversedContact, null, "texture frame alone must not trigger a sequence-index action");
sprite.emit("animationupdate", animation("ual-reversed-up"), frame(6, 5), sprite);
assert.equal(reversedContact.contactSequenceIndex, 3);
assert.equal(reversedContact.sequenceIndex, 4);
assert.equal(reversedContact.textureFrame, 6);

// Authored combo clips expose every contact independently and cannot enter
// cancelable recovery after only their first impact.
const comboContacts = [];
timeline.begin({
  animationKey: "ual-jab-elbow",
  contacts: [
    { textureFrame: 9, sequenceIndex: 8 },
    { textureFrame: 20, sequenceIndex: 19 },
  ],
  onContact: (event) => comboContacts.push(event),
});
assert.equal(timeline.contactCount, 2);
sprite.emit("animationupdate", animation("ual-jab-elbow"), frame(9, 10), sprite);
assert.equal(comboContacts.length, 1);
assert.equal(comboContacts[0].contactIndex, 0);
assert.equal(comboContacts[0].contactCount, 2);
assert.equal(comboContacts[0].isFinalContact, false);
assert.equal(timeline.contactFired, true);
assert.equal(timeline.allContactsFired, false);
sprite.emit("animationupdate", animation("ual-jab-elbow"), frame(21, 22), sprite);
assert.equal(comboContacts.length, 2);
assert.equal(comboContacts[1].contactIndex, 1);
assert.equal(comboContacts[1].isFinalContact, true);
assert.equal(timeline.contactsFired, 2);
assert.equal(timeline.allContactsFired, true);
sprite.emit("animationupdate", animation("ual-jab-elbow"), frame(24, 25), sprite);
assert.equal(comboContacts.length, 2);

// Completion and watchdog fallbacks flush every remaining authored contact.
const fallbackComboContacts = [];
timeline.begin({
  animationKey: "ual-combo-complete-only",
  contacts: [
    { textureFrame: 3, sequenceIndex: 3 },
    { textureFrame: 7, sequenceIndex: 7 },
  ],
  onContact: (event) => fallbackComboContacts.push(event),
});
sprite.emit("animationcomplete", animation("ual-combo-complete-only"), frame(8, 9), sprite);
assert.deepEqual(fallbackComboContacts.map((event) => event.contactIndex), [0, 1]);
assert.ok(fallbackComboContacts.every((event) => event.trigger === "animationcomplete-fallback"));

const watchdogComboContacts = [];
const watchdogComboActionId = timeline.begin({
  animationKey: "ual-combo-stalled-after-first",
  contacts: [
    { textureFrame: 2, sequenceIndex: 2 },
    { textureFrame: 6, sequenceIndex: 6 },
  ],
  onContact: (event) => watchdogComboContacts.push(event),
});
sprite.emit("animationupdate", animation("ual-combo-stalled-after-first"), frame(2, 3), sprite);
assert.equal(watchdogComboContacts.length, 1);
assert.equal(timeline.fireContactFallback(watchdogComboActionId), true);
assert.deepEqual(watchdogComboContacts.map((event) => event.contactIndex), [0, 1]);
assert.equal(timeline.fireContactFallback(watchdogComboActionId), false);

// A repeat wrap that skips the tail of the loop must not lose its contact.
let wrappedContacts = 0;
timeline.begin({
  animationKey: "ual-looping-action",
  contactFrame: 5,
  onContact: () => { wrappedContacts += 1; },
});
sprite.emit("animationupdate", animation("ual-looping-action"), frame(2), sprite);
sprite.emit("animationupdate", animation("ual-looping-action"), frame(0), sprite);
sprite.emit("animationupdate", animation("ual-looping-action"), frame(6), sprite);
assert.equal(wrappedContacts, 1);

// Completion is a final safety net if Phaser emitted no usable update frame.
let fallbackContact = null;
let fallbackCompleted = 0;
timeline.begin({
  animationKey: "ual-complete-only",
  contactFrame: 3,
  onContact: (event) => { fallbackContact = event; },
  onComplete: () => { fallbackCompleted += 1; },
});
sprite.emit("animationcomplete", animation("ual-complete-only"), frame(7), sprite);
assert.equal(fallbackContact.trigger, "animationcomplete-fallback");
assert.equal(fallbackCompleted, 1);

// A wall-clock watchdog can recover an animation that never advances or completes.
let watchdogContact = null;
const watchdogActionId = timeline.begin({
  animationKey: "ual-stalled-action",
  contactFrame: 7,
  onContact: (event) => { watchdogContact = event; },
});
assert.equal(timeline.fireContactFallback(watchdogActionId + 1), false);
assert.equal(timeline.fireContactFallback(watchdogActionId, "wall-clock-contact-watchdog"), true);
assert.equal(timeline.fireContactFallback(watchdogActionId, "duplicate-watchdog"), false);
assert.equal(watchdogContact.trigger, "wall-clock-contact-watchdog");

// Cancel and replacement suppress every stale callback.
let staleCallbacks = 0;
timeline.begin({
  animationKey: "stale-action",
  contactFrame: 1,
  onContact: () => { staleCallbacks += 1; },
  onComplete: () => { staleCallbacks += 1; },
});
assert.equal(timeline.cancel(), true);
assert.equal(timeline.cancel(), false);
sprite.emit("animationupdate", animation("stale-action"), frame(2), sprite);
sprite.emit("animationcomplete", animation("stale-action"), frame(2), sprite);
assert.equal(staleCallbacks, 0);

timeline.begin({ animationKey: "replaced", contactFrame: 1, onContact: () => { staleCallbacks += 1; } });
timeline.begin({ animationKey: "current", contactFrame: 1 });
sprite.emit("animationupdate", animation("replaced"), frame(2), sprite);
assert.equal(staleCallbacks, 0);

assert.throws(() => timeline.begin({ animationKey: "", contactFrame: 1 }), /animationKey/);
assert.throws(() => timeline.begin({ animationKey: "bad-frame", contactFrame: 1.5 }), /contactFrame/);
assert.throws(
  () => timeline.begin({ animationKey: "bad-sequence", contactFrame: 1, contactSequenceIndex: -1 }),
  /contactSequenceIndex/,
);
assert.throws(
  () => timeline.begin({ animationKey: "empty-contacts", contacts: [] }),
  /non-empty array/,
);
assert.throws(
  () => timeline.begin({
    animationKey: "unordered-contacts",
    contacts: [{ textureFrame: 8 }, { textureFrame: 4 }],
  }),
  /strictly increasing/,
);

timeline.destroy();
timeline.destroy();
assert.equal(sprite.listenerCount("animationupdate"), 0);
assert.equal(sprite.listenerCount("animationcomplete"), 0);
assert.throws(() => timeline.begin({ animationKey: "after-destroy", contactFrame: 1 }), /destroyed/);

console.log("UAL_ACTION_CONTACT_TIMELINE_CONTRACT_OK");
