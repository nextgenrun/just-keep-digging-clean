import { DIG_IMPACT_CONTACTS } from "./digImpactContacts.generated.js";
import { isDigImpactEnabled } from "./digImpactFx.js";

/** Correct only the measured contact markers of the unified production artwork. */
export function applyUnifiedDigContactPresentation(profile, enabled = isDigImpactEnabled()) {
  const original = profile.actionContactByAnimation;
  if (!enabled) return original;
  const variants = new Map((profile.digAnimationVariants || []).map(v => [v.key, v]));
  return Object.freeze(Object.fromEntries(Object.entries(original || {}).map(([key, spec]) => {
    const variant = variants.get(key);
    const records = DIG_IMPACT_CONTACTS[variant?.sheet]?.contacts;
    if (!records || !variant?.frames) return [key, spec];
    const source = spec.contacts || [spec];
    const contacts = source.map(contact => {
      const actualFrame = variant.frames[contact.sequenceIndex] ?? contact.textureFrame;
      const record = records[actualFrame];
      const index = record ? variant.frames.indexOf(record[0]) : -1;
      return Object.freeze(index < 0 ? { ...contact } : {
        textureFrame: record[0], sequenceIndex: index,
      });
    });
    const changed = contacts.some((contact, index) =>
      contact.sequenceIndex !== source[index].sequenceIndex);
    if (!changed) return [key, spec];
    const finalContact = contacts[contacts.length - 1];
    return [key, Object.freeze({
      ...spec,
      textureFrame: finalContact.textureFrame,
      sequenceIndex: finalContact.sequenceIndex,
      ...(spec.contacts ? { contacts: Object.freeze(contacts) } : {}),
      visualAlignmentEnabled: false,
    })];
  })));
}
