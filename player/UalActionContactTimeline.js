const ANIMATION_UPDATE_EVENT = "animationupdate";
const ANIMATION_COMPLETE_EVENT = "animationcomplete";

function animationKeyOf(animation) {
  return typeof animation === "string" ? animation : animation?.key;
}

function textureFrameOf(animationFrame) {
  const frame = Number(animationFrame?.textureFrame);
  return Number.isInteger(frame) && frame >= 0 ? frame : null;
}

function sequenceIndexOf(animationFrame) {
  const index = Number(animationFrame?.index) - 1;
  return Number.isInteger(index) && index >= 0 ? index : null;
}

function assertOptionalCallback(callback, name) {
  if (callback != null && typeof callback !== "function") {
    throw new TypeError(`${name} must be a function when provided`);
  }
}

function normalizeContact(contact, index) {
  const contactFrame = Number(contact?.contactFrame ?? contact?.textureFrame);
  const contactSequenceIndex = contact?.contactSequenceIndex ?? contact?.sequenceIndex ?? null;
  if (!Number.isInteger(contactFrame) || contactFrame < 0) {
    throw new TypeError(`contacts[${index}].contactFrame must be a non-negative integer`);
  }
  if (
    contactSequenceIndex !== null
    && (!Number.isInteger(contactSequenceIndex) || contactSequenceIndex < 0)
  ) {
    throw new TypeError(`contacts[${index}].contactSequenceIndex must be a non-negative integer when provided`);
  }
  return {
    contactFrame,
    contactSequenceIndex,
    fired: false,
  };
}

function normalizeContacts(contacts, contactFrame, contactSequenceIndex) {
  const source = contacts == null
    ? [{ contactFrame, contactSequenceIndex }]
    : contacts;
  if (!Array.isArray(source) || source.length === 0) {
    throw new TypeError("contacts must be a non-empty array when provided");
  }
  const normalized = source.map(normalizeContact);
  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1];
    const current = normalized[index];
    const previousPosition = previous.contactSequenceIndex ?? previous.contactFrame;
    const currentPosition = current.contactSequenceIndex ?? current.contactFrame;
    if (currentPosition <= previousPosition) {
      throw new TypeError("contacts must be ordered by strictly increasing animation position");
    }
  }
  return normalized;
}

/**
 * Converts Phaser animation events into one or more deterministic contacts per action.
 * Call begin() before playing the matching animation. Reversed frame arrays
 * should provide sequence indexes so contacts follow animation order.
 */
export class UalActionContactTimeline {
  constructor(sprite) {
    if (!sprite?.on || !sprite?.off) {
      throw new TypeError("UalActionContactTimeline requires an event-emitting sprite");
    }

    this.sprite = sprite;
    this._activeAction = null;
    this._destroyed = false;
    this._nextActionId = 1;
    this._boundAnimationUpdate = this.handleAnimationUpdate.bind(this);
    this._boundAnimationComplete = this.handleAnimationComplete.bind(this);
    sprite.on(ANIMATION_UPDATE_EVENT, this._boundAnimationUpdate);
    sprite.on(ANIMATION_COMPLETE_EVENT, this._boundAnimationComplete);
  }

  get isActive() {
    return this._activeAction !== null;
  }

  get activeAnimationKey() {
    return this._activeAction?.animationKey ?? null;
  }

  get contactFired() {
    return (this._activeAction?.contactsFired || 0) > 0;
  }

  get allContactsFired() {
    const action = this._activeAction;
    return Boolean(action && action.contactsFired === action.contacts.length);
  }

  get contactsFired() {
    return this._activeAction?.contactsFired || 0;
  }

  get contactCount() {
    return this._activeAction?.contacts.length || 0;
  }

  begin({
    animationKey,
    contactFrame,
    contactSequenceIndex = null,
    contacts = null,
    onContact = null,
    onComplete = null,
  } = {}) {
    if (this._destroyed) throw new Error("Cannot begin an action on a destroyed timeline");
    if (typeof animationKey !== "string" || animationKey.length === 0) {
      throw new TypeError("animationKey must be a non-empty string");
    }
    const normalizedContacts = normalizeContacts(contacts, contactFrame, contactSequenceIndex);
    assertOptionalCallback(onContact, "onContact");
    assertOptionalCallback(onComplete, "onComplete");

    this.cancel();
    const actionId = this._nextActionId++;
    this._activeAction = {
      actionId,
      animationKey,
      contacts: normalizedContacts,
      onContact,
      onComplete,
      contactsFired: 0,
      previousTextureFrame: null,
      previousSequenceIndex: null,
    };
    return actionId;
  }

  cancel() {
    const hadActiveAction = this._activeAction !== null;
    this._activeAction = null;
    return hadActiveAction;
  }

  fireContactFallback(actionId, trigger = "contact-watchdog-fallback") {
    const action = this._activeAction;
    if (!action || action.actionId !== actionId || this.allContactsFired) return false;
    const contactsBefore = action.contactsFired;
    this._fireRemainingContacts(
      action,
      this.sprite?.anims?.currentAnim,
      this.sprite?.anims?.currentFrame,
      this.sprite,
      trigger,
    );
    return action.contactsFired > contactsBefore;
  }

  handleAnimationUpdate(animation, animationFrame, gameObject) {
    const action = this._matchingAction(animation);
    if (!action) return;

    const textureFrame = textureFrameOf(animationFrame);
    const sequenceIndex = sequenceIndexOf(animationFrame);
    const previousTextureFrame = action.previousTextureFrame;
    const previousSequenceIndex = action.previousSequenceIndex;
    action.previousTextureFrame = textureFrame;
    action.previousSequenceIndex = sequenceIndex;

    for (let index = 0; index < action.contacts.length; index += 1) {
      const contact = action.contacts[index];
      if (contact.fired) continue;
      const usesSequenceIndex = contact.contactSequenceIndex !== null;
      const contactPosition = usesSequenceIndex ? sequenceIndex : textureFrame;
      const previousContactPosition = usesSequenceIndex
        ? previousSequenceIndex
        : previousTextureFrame;
      if (contactPosition === null) continue;
      const configuredContact = usesSequenceIndex
        ? contact.contactSequenceIndex
        : contact.contactFrame;
      const reachedOrSkippedContact = contactPosition >= configuredContact;
      const repeatedPastContact = previousContactPosition !== null
        && contactPosition < previousContactPosition
        && previousContactPosition < configuredContact;
      if (reachedOrSkippedContact || repeatedPastContact) {
        this._fireContact(action, index, animationFrame, gameObject, "animationupdate");
        if (this._activeAction !== action) return;
      }
    }
  }

  handleAnimationComplete(animation, animationFrame, gameObject) {
    const action = this._matchingAction(animation);
    if (!action) return;

    this._fireRemainingContacts(
      action,
      animation,
      animationFrame,
      gameObject,
      "animationcomplete-fallback",
    );
    if (this._activeAction !== action) return;

    this._activeAction = null;
    const finalContactIndex = action.contacts.length - 1;
    action.onComplete?.(this._eventPayload(
      action,
      action.contacts[finalContactIndex],
      finalContactIndex,
      animationFrame,
      gameObject,
      "animationcomplete",
    ));
  }

  destroy() {
    if (this._destroyed) return;
    this.cancel();
    this.sprite.off(ANIMATION_UPDATE_EVENT, this._boundAnimationUpdate);
    this.sprite.off(ANIMATION_COMPLETE_EVENT, this._boundAnimationComplete);
    this.sprite = null;
    this._destroyed = true;
  }

  _matchingAction(animation) {
    const action = this._activeAction;
    return action && animationKeyOf(animation) === action.animationKey ? action : null;
  }

  _fireContact(action, contactIndex, animationFrame, gameObject, trigger) {
    const contact = action.contacts[contactIndex];
    if (this._activeAction !== action || !contact || contact.fired) return;
    contact.fired = true;
    action.contactsFired += 1;
    action.onContact?.(this._eventPayload(
      action,
      contact,
      contactIndex,
      animationFrame,
      gameObject,
      trigger,
    ));
  }

  _fireRemainingContacts(action, animation, animationFrame, gameObject, trigger) {
    for (let index = 0; index < action.contacts.length; index += 1) {
      if (action.contacts[index].fired) continue;
      this._fireContact(action, index, animationFrame, gameObject, trigger);
      if (this._activeAction !== action) return;
    }
  }

  _eventPayload(action, contact, contactIndex, animationFrame, gameObject, trigger) {
    return Object.freeze({
      actionId: action.actionId,
      animationKey: action.animationKey,
      contactFrame: contact.contactFrame,
      contactSequenceIndex: contact.contactSequenceIndex,
      contactIndex,
      contactCount: action.contacts.length,
      isFinalContact: contactIndex === action.contacts.length - 1,
      textureFrame: textureFrameOf(animationFrame),
      sequenceIndex: sequenceIndexOf(animationFrame),
      trigger,
      gameObject: gameObject || this.sprite,
    });
  }
}
