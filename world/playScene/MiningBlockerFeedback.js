import { getMiningBlockerCopy } from "../../values/firstSessionSafety.js";

export function showMiningBlockerFeedback(scene, result, targetTile) {
  if (result?.success || result?.reason !== "blocked" || !targetTile) return false;
  const reason = scene.townSquareTutorialSystem?.getMiningBlockerReason?.(
    targetTile,
    result.blockerReason,
  ) || result.blockerReason;
  const copy = getMiningBlockerCopy(reason);
  scene.uiNotifications?.warning?.(`${copy.label}  •  ${copy.detail}`, {
    key: `mining-blocker-${reason}`,
    durationMs: 3200,
  });
  return true;
}
