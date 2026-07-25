// Icon placeholder configuration for upgrades
// This serves as a fallback system while a full icon library is developed

export const ICON_PLACEHOLDERS = {
  // Category-based icons
  gemPower: {
    symbol: '◆', // Diamond shape for gem power
    color: '#a855f7', // Purple
    bg: '#2a1a3e'
  },
  playerStats: {
    symbol: '👤', // Person icon
    color: '#3b82f6', // Blue
    bg: '#1a2a3e'
  },
  pickaxes: {
    symbol: '⛏', // Pickaxe emoji
    color: '#f59e0b', // Orange
    bg: '#3e2a1a'
  },
  special: {
    symbol: '⭐', // Star
    color: '#eab308', // Yellow
    bg: '#3e3a1a'
  },
  moneyMonster: {
    symbol: '💰', // Money bag
    color: '#22c55e', // Green
    bg: '#1a3e2a'
  },
  
  // Default fallback
  default: {
    symbol: '■', // Square
    color: '#888888', // Gray
    bg: '#2a2a2a'
  }
};

export function getIconPlaceholder(upgrade) {
  if (!upgrade) return ICON_PLACEHOLDERS.default;
  
  // Special cases for specific upgrades
  if (upgrade.id === 'sellAllButton') {
    return { symbol: '📦', color: '#ef4444', bg: '#3e1a1a' };
  }
  if (upgrade.id.startsWith('startResourcePrices') || 
      upgrade.id.startsWith('nextResourcePrices') ||
      upgrade.id.startsWith('angelicResourcePrices') ||
      upgrade.id.startsWith('hellResourcePrices') ||
      upgrade.id.startsWith('deepDarkResourcePrices')) {
    return { symbol: '📈', color: '#10b981', bg: '#1a3e2a' };
  }
  if (upgrade.id === 'marketInsight') {
    return { symbol: '👁', color: '#06b6d4', bg: '#1a3e3e' };
  }
  if (upgrade.id === 'luckySales') {
    return { symbol: '🎲', color: '#f59e0b', bg: '#3e2a1a' };
  }
  if (upgrade.id === 'marketReports') {
    return { symbol: '📊', color: '#6366f1', bg: '#2a2a3e' };
  }
  
  // Return category-based icon
  return ICON_PLACEHOLDERS[upgrade.category] || ICON_PLACEHOLDERS.default;
}

export function createIconSprite(scene, upgrade, x, y, size = 32) {
  const iconData = getIconPlaceholder(upgrade);
  
  // Create background container
  const container = scene.add.container(x, y);
  
  // Background square
  const bg = scene.add.rectangle(0, 0, size, size, iconData.bg)
    .setStrokeStyle(2, iconData.color);
  
  // Symbol/text
  const symbol = scene.add.text(0, 0, iconData.symbol, {
    fontSize: `${Math.floor(size * 0.6)}px`,
    color: iconData.color,
    fontStyle: 'bold'
  }).setOrigin(0.5);
  
  container.add([bg, symbol]);
  return container;
}