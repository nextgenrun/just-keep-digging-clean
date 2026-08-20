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

timeline.destroy();
timeline.destroy();
assert.equal(sprite.listenerCount("animationupdate"), 0);
assert.equal(sprite.listenerCount("animationcomplete"), 0);
assert.throws(() => timeline.begin({ animationKey: "after-destroy", contactFrame: 1 }), /destroyed/);

console.log("UAL_ACTION_CONTACT_TIMELINE_CONTRACT_OK");
