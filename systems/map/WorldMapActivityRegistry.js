export class WorldMapActivityRegistry {
  constructor() {
    this.providers = new Map();
    this.visibility = new Map();
  }

  register(id, provider) {
    const normalizedId = String(id || "").trim();
    if (!normalizedId || typeof provider?.getMarkers !== "function") {
      throw new Error("World map activity providers require an id and getMarkers(context).");
    }
    this.providers.set(normalizedId, { ...provider, id: normalizedId });
    if (!this.visibility.has(normalizedId)) {
      this.visibility.set(normalizedId, provider.enabledByDefault !== false);
    }
    return () => this.unregister(normalizedId);
  }

  unregister(id) {
    this.providers.delete(id);
    this.visibility.delete(id);
  }

  setVisible(id, visible) {
    if (!this.providers.has(id)) return false;
    this.visibility.set(id, Boolean(visible));
    return true;
  }

  toggle(id) {
    return this.setVisible(id, !this.isVisible(id));
  }

  isVisible(id) {
    return this.visibility.get(id) !== false;
  }

  getProviders() {
    return Array.from(this.providers.values(), provider => ({
      ...provider,
      visible: this.isVisible(provider.id),
    }));
  }

  getMarkers(context, options = {}) {
    const markers = [];
    for (const provider of this.providers.values()) {
      const providerVisible = this.isVisible(provider.id);
      if (!providerVisible && options.includeHidden !== true) continue;
      try {
        const supplied = provider.getMarkers(context);
        if (!Array.isArray(supplied)) continue;
        supplied.forEach((marker, index) => {
          if (!Number.isFinite(marker?.worldX) || !Number.isFinite(marker?.worldY)) return;
          markers.push({
            ...marker,
            id: marker.id || `${provider.id}-${index}`,
            providerId: provider.id,
            providerVisible,
            color: marker.color ?? provider.color,
          });
        });
      } catch (error) {
        console.warn(`[WorldMap] Activity provider "${provider.id}" failed`, error);
      }
    }
    return markers;
  }

  destroy() {
    this.providers.clear();
    this.visibility.clear();
  }
}
