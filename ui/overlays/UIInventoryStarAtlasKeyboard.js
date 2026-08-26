import { STAR_IDENTITY_LIBRARY_CONFIG } from
  "../../values/starIdentityLibrary.js?rev=20260826-inventory-codex-v2";
import { getStarIdentitiesForRarity } from "../../values/starIdentityLibraryMath.js";

function wrapIndex(value, count) {
  return ((value % count) + count) % count;
}

export function resolveStarAtlasIdentityMove(
  rarityIndex,
  selectedIdentity,
  delta,
) {
  const identities = getStarIdentitiesForRarity(rarityIndex);
  const current = Math.max(
    0,
    identities.findIndex(identity => identity.index === selectedIdentity),
  );
  const target = Math.max(0, Math.min(identities.length - 1, current + delta));
  return identities[target]?.index ?? selectedIdentity;
}

export function resolveStarAtlasPageMove(
  rarityIndex,
  selectedIdentity,
  direction,
) {
  const config = STAR_IDENTITY_LIBRARY_CONFIG;
  const identities = getStarIdentitiesForRarity(rarityIndex);
  const pageSize = config.inventory.layout.selectorsPerPage;
  const pageCount = Math.max(1, Math.ceil(identities.length / pageSize));
  const current = Math.max(
    0,
    identities.findIndex(identity => identity.index === selectedIdentity),
  );
  const page = Math.floor(current / pageSize);
  const offset = current % pageSize;
  const targetPage = wrapIndex(page + direction, pageCount);
  const target = Math.min(targetPage * pageSize + offset, identities.length - 1);
  return identities[target]?.index ?? selectedIdentity;
}

export class UIInventoryStarAtlasKeyboard {
  constructor(scene, callbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.handleKeyDown = event => this._handleKeyDown(event);
    this.scene.input.keyboard.on("keydown", this.handleKeyDown);
  }

  _consume(event) {
    event.preventDefault?.();
    event.stopPropagation?.();
  }

  _selectIdentity(identityIndex, selectedIdentity) {
    if (identityIndex === selectedIdentity) return;
    this.callbacks.onSelectIdentity(identityIndex);
  }

  _handleKeyDown(event) {
    const state = this.callbacks.getState();
    if (!(state.isOpen ?? state.open)) return false;
    const config = STAR_IDENTITY_LIBRARY_CONFIG;
    const navigation = config.inventory.navigation;
    const code = event.code || event.key;
    if (code === navigation.tabCode) {
      this._consume(event);
      this.callbacks.onCycleTab(event.shiftKey ? -1 : 1);
      return true;
    }
    if (state.activeTab !== navigation.starAtlasTabIndex) return false;

    const columns = config.inventory.layout.selectorCentersXPx.length;
    let identityIndex = state.selectedStarIdentity;
    if (navigation.leftCodes.includes(code)) {
      identityIndex = resolveStarAtlasIdentityMove(
        state.selectedStarRarity,
        state.selectedStarIdentity,
        -1,
      );
    } else if (navigation.rightCodes.includes(code)) {
      identityIndex = resolveStarAtlasIdentityMove(
        state.selectedStarRarity,
        state.selectedStarIdentity,
        1,
      );
    } else if (navigation.upCodes.includes(code)) {
      identityIndex = resolveStarAtlasIdentityMove(
        state.selectedStarRarity,
        state.selectedStarIdentity,
        -columns,
      );
    } else if (navigation.downCodes.includes(code)) {
      identityIndex = resolveStarAtlasIdentityMove(
        state.selectedStarRarity,
        state.selectedStarIdentity,
        columns,
      );
    } else if (navigation.previousPageCodes.includes(code)) {
      identityIndex = resolveStarAtlasPageMove(
        state.selectedStarRarity,
        state.selectedStarIdentity,
        -1,
      );
    } else if (navigation.nextPageCodes.includes(code)) {
      identityIndex = resolveStarAtlasPageMove(
        state.selectedStarRarity,
        state.selectedStarIdentity,
        1,
      );
    } else if (
      navigation.previousRarityCodes.includes(code)
      || navigation.nextRarityCodes.includes(code)
    ) {
      const direction = navigation.previousRarityCodes.includes(code) ? -1 : 1;
      const rarityIndex = wrapIndex(
        state.selectedStarRarity + direction,
        config.rarityIdentityCounts.length,
      );
      this._consume(event);
      this.callbacks.onSelectRarity(rarityIndex);
      return true;
    } else {
      return false;
    }

    this._consume(event);
    this._selectIdentity(identityIndex, state.selectedStarIdentity);
    return true;
  }

  destroy() {
    this.scene?.input?.keyboard?.off("keydown", this.handleKeyDown);
    this.callbacks = null;
    this.scene = null;
  }
}
