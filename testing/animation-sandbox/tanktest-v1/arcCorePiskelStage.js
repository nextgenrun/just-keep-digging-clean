function textureFor(state, role) {
  const texture = state?.roles?.[role];
  if (!texture) throw new Error(`Arc Core stage role is missing: ${role}`);
  return texture;
}

function ensureTilePool(state, count) {
  const stage = state.artwork.meta.stage;
  const fallback = textureFor(
    state.artwork,
    stage.roleByTileType["1"],
  );
  while (state.tiles.length < count) {
    state.tiles.push(
      state.scene.add.image(0, 0, fallback)
        .setOrigin(0.5)
        .setDepth(stage.tileDepth)
        .setVisible(false),
    );
  }
}

export function createArcCorePiskelStage(scene, artwork) {
  const stage = artwork?.meta?.stage;
  if (!stage || stage.presentation !== "clean-canvas") {
    throw new Error("Arc Core Piskel stage config is missing");
  }
  return {
    scene,
    artwork,
    background: scene.add.image(
      0,
      0,
      textureFor(artwork, artwork.meta.stageRoles.background),
    ).setOrigin(0.5).setDepth(stage.backgroundDepth).setVisible(false),
    tiles: [],
  };
}

export function hideArcCorePiskelStage(state) {
  if (!state) return;
  state.background.setVisible(false);
  for (const tile of state.tiles) tile.setVisible(false);
}

export function drawArcCorePiskelStage(state, options) {
  if (!state || !Array.isArray(options.world)) return false;
  const stage = state.artwork.meta.stage;
  const cameraView = options.camera.worldView;
  state.background
    .setPosition(cameraView.centerX, cameraView.centerY)
    .setDisplaySize(cameraView.width, cameraView.height)
    .setVisible(true);

  const rows = options.world.length;
  const columns = rows ? options.world[0].length : 0;
  ensureTilePool(state, rows * columns);
  let poolIndex = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const tile = state.tiles[poolIndex];
      const type = options.world[row][column];
      const role = stage.roleByTileType[String(type)];
      if (!role) {
        tile.setVisible(false);
      } else {
        const size = options.tileSize + stage.tileOverlapPx;
        tile
          .setTexture(textureFor(state.artwork, role))
          .setPosition(
            (column + 0.5) * options.tileSize,
            (row + 0.5) * options.tileSize,
          )
          .setDisplaySize(size, size)
          .setAlpha(stage.tileAlpha)
          .setVisible(true);
      }
      poolIndex += 1;
    }
  }
  for (; poolIndex < state.tiles.length; poolIndex += 1) {
    state.tiles[poolIndex].setVisible(false);
  }
  return true;
}
