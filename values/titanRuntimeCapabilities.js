import { GAMEPLAY_FEATURE_IDS } from "./gameplayCapabilities.js";
import {
  TITAN_DISCOVERY_CONFIG,
  getTitanGameplayPreloadAssets,
} from "./titanDiscoveries.js?rev=20260729-native-density-v14";

export function resolveTitanRuntimeDefinitions(config, capabilities = null) {
  if (!capabilities
    || capabilities.isEnabled?.(GAMEPLAY_FEATURE_IDS.DEEP_TITAN_CATALOG) === true) {
    return config.definitions;
  }
  return config.definitions
    .filter(definition => definition.preferredDepthTiles <= 155);
}

export function resolveTitanRuntimeConfig(config, capabilities = null) {
  const definitions = resolveTitanRuntimeDefinitions(config, capabilities);
  return definitions === config.definitions
    ? config
    : Object.freeze({ ...config, definitions: Object.freeze(definitions) });
}

export function getCapabilityTitanGameplayPreloadAssets(
  config = TITAN_DISCOVERY_CONFIG,
  search,
  capabilities = null,
) {
  return getTitanGameplayPreloadAssets(
    resolveTitanRuntimeConfig(config, capabilities),
    search,
  );
}
