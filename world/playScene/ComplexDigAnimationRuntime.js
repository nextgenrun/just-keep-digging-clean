import {
  COMPLEX_DIG_ANIMATIONS,
  resolveComplexDigAnimationsEnabled,
} from "../../values/complexDigAnimations.js";

function ownerScene(scene) {
  return scene?.originScene || scene;
}

export function isComplexDigAnimationEnabled(scene) {
  const owner = ownerScene(scene);
  if (typeof owner?.complexDigAnimationsEnabled === "boolean") {
    return owner.complexDigAnimationsEnabled;
  }
  return resolveComplexDigAnimationsEnabled();
}

export function isComplexDigAnimationKey(profile, animationKey) {
  return profile?.complexDigAnimationKeys?.includes?.(animationKey) === true;
}

export function resolveComplexDigSourceFacesRight(profile, animationKey, fallback) {
  return isComplexDigAnimationKey(profile, animationKey)
    ? profile.complexDigSourceFacesRight !== false
    : fallback;
}

export function resolveComplexDigSelection(
  scene,
  profile,
  family,
  animationKeys,
  fallback,
) {
  const property = family === "up"
    ? "complexDigUpAnimationKeys"
    : family === "side" ? "complexDigSideAnimationKeys" : null;
  const complexKeys = property ? profile?.[property] : null;
  if (
    profile?.isUalNative === true
    && isComplexDigAnimationEnabled(scene)
    && Array.isArray(complexKeys)
    && complexKeys.length > 0
  ) {
    const complexFallback = family === "side"
      ? profile?.complexDigSideFallbackAnimationKey || complexKeys[0] || fallback
      : fallback;
    return {
      family: `complex-${family}`,
      animationKeys: complexKeys,
      fallback: complexFallback,
      prewarmAnimationKey: family === "side"
        ? profile?.complexDigSidePrewarmAnimationKey || null
        : null,
      prewarmAnimationKeys: family === "side"
        ? profile?.complexDigSidePrewarmAnimationKeys || []
        : [],
      complex: true,
    };
  }
  return { family, animationKeys, fallback, complex: false };
}

export function prewarmComplexDigSelection(scene, selection) {
  if (!selection?.complex) return false;
  const animationKeys = new Set([
    selection.prewarmAnimationKey,
    ...(selection.prewarmAnimationKeys || []),
  ].filter(Boolean));
  for (const key of animationKeys) {
    void ownerScene(scene)?.playerDeferredAnimationAssetController?.ensureForAnimation?.(key);
  }
  return animationKeys.size > 0;
}

export function installComplexDigAnimationRuntime(scene) {
  if (!scene || scene.complexDigAnimationRuntime) {
    return scene?.complexDigAnimationRuntime || null;
  }
  const globalName = COMPLEX_DIG_ANIMATIONS.runtimeGlobal;
  const runtime = {
    enabled: resolveComplexDigAnimationsEnabled(),
    setEnabled(enabled, { announce = true } = {}) {
      const next = enabled === true;
      runtime.enabled = next;
      scene.complexDigAnimationsEnabled = next;
      scene.ualMiningComboSelector?.reset?.();
      if (announce) {
        scene.hudSystem?.flashStatus?.(
          next ? "Complex dig animations: ON" : "Complex dig animations: OFF (legacy)",
          next ? "#9fe7ff" : "#f4bd69",
          1400,
        );
      }
      return next;
    },
    toggle() { return runtime.setEnabled(!runtime.enabled); },
    getSnapshot() {
      return Object.freeze({
        enabled: runtime.enabled,
        rollbackQuery: `?${COMPLEX_DIG_ANIMATIONS.rollbackQuery}=0`,
        sideAnimationCount: scene.playerAssetProfile?.complexDigSideAnimationKeys?.length || 0,
        upAnimationCount: scene.playerAssetProfile?.complexDigUpAnimationKeys?.length || 0,
      });
    },
    destroy() {
      globalThis.removeEventListener?.("keydown", runtime.keyHandler);
      if (globalThis[globalName] === runtime) delete globalThis[globalName];
      scene.complexDigAnimationsEnabled = null;
      scene.complexDigAnimationRuntime = null;
    },
    keyHandler: null,
  };
  runtime.keyHandler = (event) => {
    const toggle = COMPLEX_DIG_ANIMATIONS.toggle;
    if (event.code !== toggle.code || event.ctrlKey !== toggle.ctrlKey || event.altKey !== toggle.altKey) return;
    event.preventDefault?.();
    runtime.toggle();
  };
  scene.complexDigAnimationRuntime = runtime;
  runtime.setEnabled(runtime.enabled, { announce: false });
  globalThis[globalName] = runtime;
  globalThis.addEventListener?.("keydown", runtime.keyHandler);
  return runtime;
}
