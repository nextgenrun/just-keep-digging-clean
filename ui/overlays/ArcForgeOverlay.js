import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { UI_RESOURCE_PRESENTATION } from "../../values/uiIcons.js";
import { HEAVENBLOCKS_PROGRESSION_CONFIG } from "../../values/heavenblocksProgressionConfig.js";
import { HEAVENBLOCKS_VISUAL_CONFIG } from "../../values/heavenblocksVisualConfig.js";
import { getHeavenblocksRegionById } from "../../values/heavenblocksWorldConfig.js";
import { createModalShell } from "../UiModalShell.js";
import { createButton } from "../PhaserUiKit.js";

function statusFor(state) {
  if (state.alreadyOwned) return "FORGED  •  Vehicle deployed in town";
  if (state.missingRecipe) return `Requires ${state.missingRecipe}`;
  if (state.missingHearts.length) {
    const names = state.missingHearts
      .map((id) => getHeavenblocksRegionById(id)?.displayName || id);
    return `Attune: ${names.join(" + ")}`;
  }
  if (state.missingResources.length) return "Mine the missing materials shown below";
  return "READY TO FORGE";
}

export class ArcForgeOverlay {
  constructor(scene, craftingSystem, options = {}) {
    this.scene = scene;
    this.craftingSystem = craftingSystem;
    this.onCrafted = options.onCrafted || null;
    this.isVisible = false;
    this.shell = createModalShell(scene, {
      title: "ARC FORGE",
      subtitle: "Heavenblock hearts stabilize mined materials into flight cores",
      icon: "power",
      maxWidth: HEAVENBLOCKS_PROGRESSION_CONFIG.forgeUi.maxWidth,
      maxHeight: HEAVENBLOCKS_PROGRESSION_CONFIG.forgeUi.maxHeight,
      depth: 3460,
      onClose: () => this.hide(),
      dismissOnBackdrop: true,
    });
  }

  show() {
    this._rebuild();
    this.isVisible = true;
    this.shell.show();
  }

  hide() {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.shell.hide();
  }

  _rebuild() {
    this.shell.content.removeAll(true);
    const rect = this.shell.layout();
    const recipeIds = Object.keys(HEAVENBLOCKS_PROGRESSION_CONFIG.recipes);
    const cardHeight = HEAVENBLOCKS_PROGRESSION_CONFIG.forgeUi.recipeCardHeight;
    const gap = HEAVENBLOCKS_PROGRESSION_CONFIG.forgeUi.recipeCardGap;
    recipeIds.forEach((recipeId, index) => {
      const top = rect.top + index * (cardHeight + gap);
      this._buildRecipeCard(recipeId, rect.left, top, rect.width, cardHeight);
    });
    const hint = this.scene.add.text(
      rect.left,
      rect.bottom - 18,
      "Cores are permanent. Recipe spending is atomic and saved with this slot.",
      {
        fontFamily: UI_FONTS.mono,
        fontSize: "11px",
        color: UI_COLORS.dim,
      }
    ).setOrigin(0, 0.5);
    this.shell.content.add(hint);
  }

  _buildRecipeCard(recipeId, left, top, width, height) {
    const ui = HEAVENBLOCKS_PROGRESSION_CONFIG.forgeUi;
    const state = this.craftingSystem.getRecipeState(recipeId);
    const recipe = state.recipe;
    const accent = state.alreadyOwned
      ? UI_COLORS.borderGood
      : state.canCraft
        ? UI_COLORS.borderSel
        : UI_COLORS.borderDim;
    const card = this.scene.add.graphics();
    card.fillStyle(UI_COLORS.cardBase, 0.96);
    card.fillRoundedRect(left, top, width, height, 8);
    card.fillStyle(accent, 0.18);
    card.fillRoundedRect(left + 5, top + 5, width - 10, height - 10, 6);
    card.lineStyle(state.canCraft ? 2 : 1, accent, 0.95);
    card.strokeRoundedRect(left, top, width, height, 8);
    this.shell.content.add(card);

    const componentRegionId = recipe.componentRegionIds.at(-1);
    const componentKey = HEAVENBLOCKS_VISUAL_CONFIG.biomes[componentRegionId].keys.component;
    const component = this.scene.add.image(
      left + ui.componentSize * 0.62,
      top + height * 0.5,
      componentKey
    )
      .setDisplaySize(ui.componentSize, ui.componentSize)
      .setAlpha(state.alreadyOwned || state.canCraft ? 1 : 0.55);
    this.shell.content.add(component);

    const textLeft = left + ui.componentSize + 32;
    const title = this.scene.add.text(textLeft, top + 20, recipe.displayName.toUpperCase(), {
      fontFamily: UI_FONTS.display,
      fontSize: "20px",
      fontStyle: "bold",
      color: state.canCraft ? UI_COLORS.title : UI_COLORS.white,
      letterSpacing: 1,
    });
    const status = this.scene.add.text(textLeft, top + 50, statusFor(state), {
      fontFamily: UI_FONTS.mono,
      fontSize: `${ui.statusFontSize}px`,
      fontStyle: "bold",
      color: state.canCraft ? UI_COLORS.body : UI_COLORS.dim,
    });
    this.shell.content.add([title, status]);

    const resourceEntries = Object.entries(recipe.resources);
    const resourceWidth = Math.max(140, (width - ui.componentSize - ui.actionWidth - 80) * 0.5);
    resourceEntries.forEach(([resourceKey, required], index) => {
      const presentation = UI_RESOURCE_PRESENTATION[resourceKey];
      const have = state.resources[resourceKey] || 0;
      const met = have >= required;
      const column = index % 2;
      const row = Math.floor(index / 2);
      const label = this.scene.add.text(
        textLeft + column * resourceWidth,
        top + 82 + row * 28,
        `${presentation?.name || resourceKey}  ${have}/${required}`,
        {
          fontFamily: UI_FONTS.mono,
          fontSize: `${ui.bodyFontSize}px`,
          fontStyle: met ? "normal" : "bold",
          color: met ? (presentation?.color || UI_COLORS.body) : UI_COLORS.danger,
        }
      );
      this.shell.content.add(label);
    });

    const heartNames = recipe.requiredHearts
      .map((id) => {
        const name = getHeavenblocksRegionById(id)?.displayName || id;
        return `${state.missingHearts.includes(id) ? "○" : "◆"} ${name}`;
      })
      .join("   ");
    const hearts = this.scene.add.text(textLeft, top + height - 27, heartNames, {
      fontFamily: UI_FONTS.mono,
      fontSize: "11px",
      color: state.missingHearts.length ? UI_COLORS.dim : UI_COLORS.success,
    });
    this.shell.content.add(hearts);

    createButton(this.scene, {
      x: left + width - ui.actionWidth * 0.5 - 18,
      y: top + height * 0.5,
      width: ui.actionWidth,
      height: ui.actionHeight,
      label: state.alreadyOwned ? "FORGED" : "FORGE CORE",
      hint: state.canCraft ? "READY" : "LOCKED",
      icon: "power",
      enabled: state.canCraft,
      disabledReason: statusFor(state),
      accent,
      parent: this.shell.content,
      onClick: () => this._craft(recipeId),
    });
  }

  _craft(recipeId) {
    const result = this.craftingSystem.craft(recipeId);
    if (!result.success) {
      this.scene.soundSystem?.playUiSelect?.();
      this.scene.uiNotifications?.warning?.("Arc Forge requirements are not complete.");
      this._rebuild();
      return result;
    }
    this.scene.soundSystem?.playSfx?.("reward");
    this.scene.uiResourceBar?.setResources?.(result.remainingResources);
    this.scene.uiInventoryPopup?.setResources?.(result.remainingResources);
    this.scene.uiNotifications?.success?.(`${result.recipe.displayName} forged permanently.`);
    this.onCrafted?.(result);
    this._rebuild();
    return result;
  }

  resize() {
    this.shell.layout();
    if (this.isVisible) this._rebuild();
  }

  getHealthSnapshot() {
    return {
      isVisible: this.isVisible,
      hasCraftingSystem: Boolean(this.craftingSystem),
      recipeCount: Object.keys(HEAVENBLOCKS_PROGRESSION_CONFIG.recipes).length,
    };
  }

  destroy() {
    this.isVisible = false;
    this.shell?.destroy();
    this.shell = null;
  }
}
