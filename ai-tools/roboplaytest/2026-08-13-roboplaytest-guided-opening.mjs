export async function prepareGuidedTutorialMineTarget(driver) {
  const { page } = driver;
  await driver.closeTransientUi();
  await page.keyboard.down("d");
  try {
    await driver.waitFor(() => {
      const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
      return scene?.retentionProgressSystem?.getTutorialState?.()?.stage === "dig";
    }, "cumulative real movement to advance the guided opening to DIG", 60_000);
  } finally {
    await page.keyboard.up("d").catch(() => undefined);
  }
  await page.keyboard.down("d");
  try {
    await driver.waitFor(() => {
      const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
      const target = scene?.inputHandler?.resolveAimTargetTileForVector?.({ x: 0, y: 1 });
      const site = scene?.townSquareTutorialSystem?.getRequiredDigSite?.();
      return target?.tx === site?.tx && target?.ty === site?.ty;
    }, "real walking to align with the marked tutorial block", 120_000);
  } finally {
    await page.keyboard.up("d").catch(() => undefined);
  }
  await driver.waitFor(() => {
    const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
    return scene?.player?.anims?.currentAnim?.key !== scene?.playerAssetProfile?.walkStartAnim;
  }, "startup handoff to leave the two-frame walk bridge", 3_000);
  return page.evaluate(() => {
    const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
    const target = scene?.inputHandler?.resolveAimTargetTileForVector?.({ x: 0, y: 1 });
    const player = scene?.playerController?.getPlayerTile?.();
    const model = scene?.worldModel;
    if (!target || !player || !model?.isDiggable?.(target.tx, target.ty)) return null;
    return {
      tx: target.tx,
      ty: target.ty,
      playerTx: player.tx,
      playerTy: player.ty,
      key: "s",
      aim: "down",
      type: model.getTileType(target.tx, target.ty),
      hp: model.getTileHp(target.tx, target.ty),
      tutorialStage: scene.retentionProgressSystem.getTutorialState().stage,
      display: { width: scene.player.displayWidth, height: scene.player.displayHeight },
      animation: scene.player.anims.currentAnim?.key || null,
    };
  });
}

export async function destroyGuidedTutorialBlock(driver, target) {
  const attempts = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const result = await driver.minePreparedTarget({
      ...target,
      hp: attempts.at(-1)?.hp ?? target.hp,
    });
    attempts.push(result);
    if (!result.solid) break;
  }
  const result = attempts.at(-1);
  if (result?.solid !== false) {
    throw new Error(`Guided first block did not break: ${JSON.stringify(attempts)}`);
  }
  await driver.waitFor(() => {
    const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
    return scene?.retentionProgressSystem?.getTutorialState?.()?.stage === "flight";
  }, "guided tutorial to advance from DIG to FLIGHT", 10_000);
  return { ...result, attempts: attempts.length };
}
