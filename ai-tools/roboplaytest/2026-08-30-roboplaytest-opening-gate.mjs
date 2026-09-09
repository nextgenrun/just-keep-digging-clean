/**
 * Clears the player-authored opening cinematic gate through its real hold input.
 */
export async function releaseOpeningCinematic(driver) {
  const { page, config } = driver;
  await driver.waitFor(() => {
    const game = globalThis.__phaserGame;
    return ["OpeningCinematicScene", "MainMenuScene", "StartMenuScene"]
      .some(key => game?.scene?.isActive?.(key));
  }, "the opening cinematic or menu", config.loadTimeoutMs);

  const openingActive = await page.evaluate(() => (
    globalThis.__phaserGame?.scene?.isActive?.("OpeningCinematicScene") === true
  ));
  if (!openingActive) return { skipped: false, holdMs: 0 };

  const holdMs = await page.evaluate(async () => {
    const { CINEMATIC_VIDEO_CONFIG } = await import("/values/cinematicVideoConfig.js");
    return CINEMATIC_VIDEO_CONFIG.playback.skipHoldDurationMs;
  });
  await page.keyboard.down("Escape");
  try {
    await page.waitForTimeout(holdMs + 250);
  } finally {
    await page.keyboard.up("Escape").catch(() => undefined);
  }
  return { skipped: true, holdMs };
}
