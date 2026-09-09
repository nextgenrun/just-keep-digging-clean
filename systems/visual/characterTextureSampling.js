/** Padded power-of-two character atlases keep fine detail stable during minification. */
export function applyCharacterTextureSampling(scene, profile) {
  const gl = scene.game?.renderer?.gl;
  if (!gl || gl.isContextLost() || !profile.mipmappedCharacterSheets?.length) return;
  const active = gl.getParameter(gl.ACTIVE_TEXTURE);
  gl.activeTexture(gl.TEXTURE0);
  const previous = gl.getParameter(gl.TEXTURE_BINDING_2D);
  try {
    for (const key of profile.mipmappedCharacterSheets) {
      if (!scene.textures.exists(key)) continue;
      for (const source of scene.textures.get(key).source) {
        const texture = source.glTexture;
        const powerOfTwo = value => value > 0 && (value & (value - 1)) === 0;
        if (!texture?.webGLTexture || !powerOfTwo(source.width) || !powerOfTwo(source.height)) continue;
        // Phaser creates mip levels for these immutable POT image sources.
        // Persist the filter on its wrapper as well, for context restoration.
        gl.bindTexture(gl.TEXTURE_2D, texture.webGLTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        texture.minFilter = gl.LINEAR_MIPMAP_LINEAR;
        texture.magFilter = gl.LINEAR;
      }
    }
  } finally {
    gl.bindTexture(gl.TEXTURE_2D, previous);
    gl.activeTexture(active);
  }
}
