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

/**
 * Converts Phaser animation events into one deterministic contact per action.
 * Call begin() before playing the matching animation. Reversed frame arrays
 * should provide contactSequenceIndex so contact follows animation order.
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

  begin({
    animationKey,
    contactFrame,
    contactSequenceIndex = null,
    onContact = null,
    onComplete = null,
  } = {}) {
    if (this._destroyed) throw new Error("Cannot begin an action on a destroyed timeline");
    if (typeof animationKey !== "string" || animationKey.length === 0) {
      throw new TypeError("animationKey must be a non-empty string");
    }
    if (!Number.isInteger(contactFrame) || contactFrame < 0) {
      throw new TypeError("contactFrame must be a non-negative integer");
    }
    if (contactSequenceIndex !== null && (!Number.isInteger(contactSequenceIndex) || contactSequenceIndex < 0)) {
      throw new TypeError("contactSequenceIndex must be a non-negative integer when provided");
    }
    assertOptionalCallback(onContact, "onContact");
    assertOptionalCallback(onComplete, "onComplete");

    this.cancel();
    const actionId = this._nextActionId++;
    this._activeAction = {
      actionId,
      animationKey,
      contactFrame,
      contactSequenceIndex,
      onContact,
      onComplete,
      contactFired: false,
      previousContactPosition: null,
    };
    return actionId;
  }

  cancel() {
    const hadActiveAction = this._activeAction !== null;
    this._activeAction = null;
    return hadActiveAction;
  }

  handleAnimationUpdate(animation, animationFrame, gameObject) {
    const action = this._matchingAction(animation);
    if (!action) return;

    const usesSequenceIndex = action.contactSequenceIndex !== null;
    const contactPosition = usesSequenceIndex
      ? sequenceIndexOf(animationFrame)
      : textureFrameOf(animationFrame);
    if (contactPosition === null) return;
    const configuredContact = usesSequenceIndex ? action.contactSequenceIndex : action.contactFrame;
    const previousContactPosition = action.previousContactPosition;
    action.previousContactPosition = contactPosition;
    if (action.contactFired) return;

    const reachedOrSkippedContact = contactPosition >= configuredContact;
    const repeatedPastContact = previousContactPosition !== null
      && contactPosition < previousContactPosition
      && previousContactPosition < configuredContact;
    if (reachedOrSkippedContact || repeatedPastContact) {
      this._fireContact(action, animation, animationFrame, gameObject, "animationupdate");
    }
  }

  handleAnimationComplete(animation, animationFrame, gameObject) {
    const action = this._matchingAction(animation);
    if (!action) return;

    if (!action.contactFired) {
      this._fireContact(action, animation, animationFrame, gameObject, "animationcomplete-fallback");
    }
    if (this._activeAction !== action) return;

    this._activeAction = null;
    action.onComplete?.(this._eventPayload(action, animationFrame, gameObject, "animationcomplete"));
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

  _fireContact(action, animation, animationFrame, gameObject, trigger) {
    if (this._activeAction !== action || action.contactFired) return;
    action.contactFired = true;
    action.onContact?.(this._eventPayload(action, animationFrame, gameObject, trigger));
  }

  _eventPayload(action, animationFrame, gameObject, trigger) {
    return Object.freeze({
      actionId: action.actionId,
      animationKey: action.animationKey,
      contactFrame: action.contactFrame,
      contactSequenceIndex: action.contactSequenceIndex,
      textureFrame: textureFrameOf(animationFrame),
      sequenceIndex: sequenceIndexOf(animationFrame),
      trigger,
      gameObject: gameObject || this.sprite,
    });
  }
}
