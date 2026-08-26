import { INVENTORY_CODEX_CONFIG } from
  "../../values/inventoryCodex.js?rev=20260826-inventory-codex-v2";
import { INVENTORY_RESOURCE_GUIDE } from
  "../../values/inventoryResourceGuide.js";
import {
  fitInventoryCodexFoundation,
  installResourceCodexFrames,
} from "./UIInventoryCodexArt.js?rev=20260826-inventory-codex-v2";
import { renderInventoryResourceCollection } from
  "./UIInventoryResourceCollection.js?rev=20260826-inventory-codex-v3";
import { renderInventoryResourceDossier } from
  "./UIInventoryResourceDossier.js?rev=20260826-inventory-codex-v2";

export function renderInventoryResourceGuide(
  scene,
  shell,
  rect,
  selectedKey,
  items,
  onSelect,
) {
  const config = INVENTORY_CODEX_CONFIG;
  const guide = INVENTORY_RESOURCE_GUIDE;
  installResourceCodexFrames(scene, config);
  const selected = guide.resourceKeys.includes(selectedKey)
    ? selectedKey
    : guide.resourceKeys[0];
  const bounds = fitInventoryCodexFoundation(rect, config.layout);
  const foundation = scene.add.image(
    bounds.left,
    bounds.top,
    config.assets.foundation.key,
  ).setOrigin(0).setDisplaySize(bounds.width, bounds.height);
  shell.content.add(foundation);
  renderInventoryResourceCollection(
    scene,
    shell.content,
    bounds,
    selected,
    items,
    onSelect,
  );
  renderInventoryResourceDossier(
    scene,
    shell.content,
    bounds,
    selected,
    items,
  );
  return selected;
}
