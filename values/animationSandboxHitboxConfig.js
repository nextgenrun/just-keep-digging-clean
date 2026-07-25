import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "./ualNativePlayerAssetProfile.js";

const SANDBOX_HARNESS_SIZE = 94;

/**
 * Physics hulls for the tanktest-v1 character comparison sandbox.
 *
 * Rect coordinates are relative to the 94px harness anchor. Sprite-backed
 * hulls were measured from their stable body silhouettes; carried tools,
 * drill beams, exhaust, and attack trails are intentionally excluded.
 */
export const ANIMATION_SANDBOX_HITBOX_CONFIG = Object.freeze({
  tank: Object.freeze({
    label: "tank chassis",
    kind: "rect",
    x: 0,
    y: 8,
    width: 93,
    height: 83,
  }),
  drillHead: Object.freeze({
    label: "living drill body",
    kind: "orientedRect",
    centerX: 47,
    centerY: 47,
    width: 84,
    height: 63,
  }),
  pickaxeMiner: Object.freeze({
    label: "pickaxe miner body",
    kind: "rect",
    x: 21,
    y: 12,
    width: 53,
    height: 71,
  }),
  survivalMiner: Object.freeze({
    label: "UAL native mannequin body",
    kind: "rect",
    x: (SANDBOX_HARNESS_SIZE - UAL_NATIVE_PLAYER_ASSET_PROFILE.playerBodyWidthPx) / 2,
    y: SANDBOX_HARNESS_SIZE - UAL_NATIVE_PLAYER_ASSET_PROFILE.playerBodyHeightPx,
    width: UAL_NATIVE_PLAYER_ASSET_PROFILE.playerBodyWidthPx,
    height: UAL_NATIVE_PLAYER_ASSET_PROFILE.playerBodyHeightPx,
  }),
  robotSphere: Object.freeze({
    label: "robot sphere body",
    kind: "rect",
    x: 8,
    y: 8,
    width: 78,
    height: 78,
    renderSize: 172,
  }),
  arcCore: Object.freeze({
    label: "arc core body",
    kind: "rect",
    x: 25,
    y: 25,
    width: 44,
    height: 44,
  }),
  wormholeMaw: Object.freeze({
    label: "wormhole body",
    kind: "rect",
    x: 21,
    y: 21,
    width: 52,
    height: 52,
  }),
});
