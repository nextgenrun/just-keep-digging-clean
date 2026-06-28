/**
 * Above-Ground Decoration Configuration
 * Defines all visual elements for the surface area (y < topAirRows)
 * Uses tile-relative positioning for easy placement
 */

export const ABOVE_GROUND_CONFIG = {
  // Surface row where decorations are placed
  surfaceRow: 65,
  
  // NPC zone bounds (x=1 to x=68)
  npcZone: {
    startX: 1,
    endX: 68
  },
  
  // Decoration definitions
  decorations: {
    // Trees - Large, foreground elements
    tree: {
      sprite: 'bg-el-tree',
      positions: [],
      depth: 5  // Render depth (higher = closer to camera)
    },
    
    // Plants - Small foreground details
    plant: {
      sprite: 'bg-el-plant',
      positions: [],
      depth: 7
    },
    
    // Statue - Decorative centerpiece
    statue: {
      sprite: 'bg-el-statue',
      positions: [],
      depth: 5
    },
    
    // Wolf - Character decoration
    wolf: {
      sprite: 'bg-el-wolf2',
      positions: [],
      depth: 6
    },
    
    // Town NPC houses (background-town directory)
    boboHouse: {
      sprite: 'bg-town-house-bobo',
      positions: [],
      depth: 4
    },
    gearMerchantHouse: {
      sprite: 'bg-town-house-gear-merchant',
      positions: [],
      depth: 4
    },
    gemMonsterHouse: {
      sprite: 'bg-town-house-gem-monster',
      positions: [],
      depth: 4
    },
    moneyMonsterHouse: {
      sprite: 'bg-town-house-money-monster',
      positions: [],
      depth: 4
    },
    playerUpgradeHouse: {
      sprite: 'bg-town-house-player-upgrade',
      positions: [],
      depth: 4
    }
  },
  
  // Layer definitions for parallax scrolling
  layers: {
    // Sky layer - furthest, very slow parallax
    sky: {
      name: 'sky',
      parallaxFactor: 0.2,
      depth: -10,
      elements: []
    },
    
    // Town background layer - medium parallax
    townBackground: {
      name: 'town-background',
      parallaxFactor: 0.5,
      depth: -5,
      elements: []
    },
    
    // Foreground layer - attached to world, no parallax
    foreground: {
      name: 'foreground',
      parallaxFactor: 1.0,
      depth: 5,
      elements: ['tree', 'lamp', 'plant', 'statue', 'wolf', 'boboHouse', 'gearMerchantHouse', 'gemMonsterHouse', 'moneyMonsterHouse', 'playerUpgradeHouse']
    }
  },
  
  // Debug visualization settings
  debug: {
    showDecorationZones: false,
    showLayerBoundaries: false,
    colorizeByLayer: false,
    layerColors: {
      sky: 0x0000FF,
      townBackground: 0x00FF00,
      foreground: 0xFF0000
    }
  }
};

/**
 * Convert tile position to world position
 */
export function tileToWorld(tx, ty, tileSize) {
  return {
    x: tx * tileSize + tileSize / 2,
    y: ty * tileSize + tileSize / 2
  };
}

/**
 * Get decoration configuration by name
 */
export function getDecorationConfig(name) {
  return ABOVE_GROUND_CONFIG.decorations[name];
}

/**
 * Get all decorations for a specific layer
 */
export function getDecorationsByLayer(layerName) {
  const layer = ABOVE_GROUND_CONFIG.layers[layerName];
  if (!layer || !layer.elements) {
    return [];
  }
  
  const decorations = [];
  for (const elemName of layer.elements) {
    const config = ABOVE_GROUND_CONFIG.decorations[elemName];
    if (config) {
      decorations.push({
        name: elemName,
        ...config
      });
    }
  }
  return decorations;
}
