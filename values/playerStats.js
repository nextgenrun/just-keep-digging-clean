// ==================== PLAYER STATS CONFIG ====================
export const PLAYER_STATS_CONFIG = Object.freeze({
  // Movement
  walkSpeedPxPerSec: 160, // 20% below the previous 200 px/s baseline
  flightSpeedPxPerSec: 252, // Powered upward flight speed before upgrades
  
  // Player dimensions
  playerDisplaySizePx: 89, // 95% of 94px tile size (larger visual sprite)
  playerBodyWidthPx: 70,    // 74% of 94px tile
  playerBodyHeightPx: 75,   // 80% of 94px tile
  
  // Camera
  cameraLerpX: 1.0, // Instant following - no lag
  cameraLerpY: 1.0, // Instant following - no lag even during fast falls
  cameraDeadzoneWidthPx: 0, // No deadzone - camera always follows
  cameraDeadzoneHeightPx: 0, // No deadzone - camera always follows
  cameraLeadPx: 0, // No camera lead - player always centered
});
