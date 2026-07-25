export class SkylineWeatherVfxAtlas {
  constructor(scene, textureKeys, config) {
    this.scene = scene;
    this.textureKeys = textureKeys;
    this.config = config;
  }

  register() {
    return Object.entries(this.config.sheets).every(([sheetName, sheet]) =>
      this._registerSheet(sheetName, sheet)
    );
  }

  frame(sheetName, frameIndex) {
    return `${sheetName}-${frameIndex}`;
  }

  textureKey(sheetName) {
    return this.textureKeys[sheetName];
  }

  _registerSheet(sheetName, sheet) {
    const textureKey = this.textureKey(sheetName);
    const texture = this.scene.textures.get(textureKey);
    const source = texture?.getSourceImage?.();
    if (!source?.width || !source?.height) {
      console.warn(`[SkylineWeatherVfxAtlas] Missing texture: ${textureKey}`);
      return false;
    }

    const rowCount = sheet.layoutRows.length;
    let frameIndex = 0;
    sheet.layoutRows.forEach((columns, row) => {
      const top = Math.round(row * source.height / rowCount);
      const bottom = Math.round((row + 1) * source.height / rowCount);
      for (let column = 0; column < columns; column += 1) {
        const left = Math.round(column * source.width / columns);
        const right = Math.round((column + 1) * source.width / columns);
        const frameName = this.frame(sheetName, frameIndex);
        if (!texture.has(frameName)) {
          texture.add(frameName, 0, left, top, right - left, bottom - top);
        }
        frameIndex += 1;
      }
    });
    return true;
  }
}
