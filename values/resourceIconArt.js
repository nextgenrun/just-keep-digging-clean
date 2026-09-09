const ROOT = "sprites/UI/resource-icons-imagegen-2026-09-09";

/** Approved resource portraits shared by shop and inventory presentation. */
export const RESOURCE_ICON_ART = Object.freeze(Object.fromEntries(
  ["dirt", "stone", "copper"].map(id => [id, Object.freeze({
    key: `ui-resource-${id}-imagegen-v2`,
    path: `${ROOT}/${id}-runtime-v2.png`,
    legacyKey: `ui-resource-${id}`,
  })]),
));
