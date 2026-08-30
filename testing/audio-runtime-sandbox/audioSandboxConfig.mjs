const currentSfx = "../../sound/soundEffects/";
const candidateSlices = "../../sound/library-v2/SoundLibrary_Review/00_INBOX_RAW_EXPORTS/sonniss-ingame-sfx-mockup-v1-2026-08-27/slices/";
const clip = (url, bus, gainDb = 0, lane = "candidate") => ({ url, bus, gainDb, lane });
const live = (path, bus, gainDb = 0) => clip(`${currentSfx}${path}`, bus, gainDb, "current");
const candidate = (file, bus, gainDb = 0) => clip(`${candidateSlices}${file}`, bus, gainDb);

export const AUDIO_SANDBOX_CONFIG = Object.freeze({
  version: "runtime-sfx-ab-sandbox-v2",
  reviewOnly: true,
  defaultLane: "candidate",
  voiceLimit: 18,
  buses: {
    master: { label: "Master", gainDb: -2 },
    movement: { label: "Footsteps + Flight", gainDb: -2 },
    mining: { label: "Mining", gainDb: -1 },
    ui: { label: "UI + progression", gainDb: -4 },
    hazard: { label: "Hazards", gainDb: -4 },
    ambience: { label: "Candidate ambience", gainDb: -10 }
  },
  materialProfiles: {
    dirt: { label: "Dirt", digRate: 1.06, breakRate: 1.08, breakVolume: 0.9 },
    stone: { label: "Stone", digRate: 0.95, breakRate: 0.94, breakVolume: 1.0 },
    gold: { label: "Gold", digRate: 1.08, breakRate: 1.16, breakVolume: 1.2 }
  },
  sounds: {
    liveDigA: live("costume-sounds/dig/dig-1.ogg", "mining", -3),
    liveDigB: live("costume-sounds/dig/dig-2.ogg", "mining", -3),
    liveTileHit: live("costume-sounds/hit-reource-tile/dig-1.ogg", "mining", -3),
    liveTileBreak: live("costume-sounds/tile-break/CERMBrk_Broken plate 7 (ID 1649)_BigSoundBank.com.ogg", "mining", -3),
    liveStarDig: live("costume-sounds/dig/dig-star/MUSCChim_Chimes dream 3 (ID 2081)_BigSoundBank.com.ogg", "mining", -5),
    liveFootA: live("costume-sounds/footsteps/footstep-1.ogg", "movement", -16),
    liveFootB: live("costume-sounds/footsteps/footstep-3.ogg", "movement", -16),
    liveFootC: live("costume-sounds/footsteps/footstep-4.ogg", "movement", -16),
    liveUiSelect: live("ui/ui-select.wav", "ui", -8),
    liveUiConfirm: live("ui/ui-confirm.wav", "ui", -6),
    liveSeismicA: live("approved-sfx-findings-v1/seismic-warning-distant-collapse.ogg", "hazard", -4),
    liveSeismicB: live("approved-sfx-findings-v1/seismic-warning-heavy-collapse.ogg", "hazard", -4),
    liveHardcore: live("approved-sfx-findings-v1/hardcore-near-death-warning.wav", "hazard", -3),

    candidateFootA: candidate("mining-material-loop-05-SONNISS19-MINE-23-000000ms.wav", "movement", -5),
    candidateFootB: candidate("mining-material-loop-07-SONNISS19-MINE-24-000000ms.wav", "movement", -5),
    candidateAirStart: candidate("mining-material-loop-02-SONNISS19-SRC-110-000000ms.wav", "movement", -7),
    candidateFlightAir: candidate("deep-cave-danger-02-SONNISS19-SRC-116-008000ms.wav", "movement", -12),
    candidateLandingBody: candidate("mining-material-loop-09-SONNISS19-SRC-080-000000ms.wav", "movement", -2),
    candidateLandingDebris: candidate("mining-material-loop-11-SONNISS19-MINE-18-001200ms.wav", "movement", -7),
    candidateDirtHit: candidate("mining-material-loop-03-SONNISS19-MINE-20-000000ms.wav", "mining", 0),
    candidateDirtBreak: candidate("mining-material-loop-07-SONNISS19-MINE-24-000000ms.wav", "mining", 1),
    candidateStoneHit: candidate("mining-material-loop-09-SONNISS19-SRC-080-000000ms.wav", "mining", 1),
    candidateToolContact: candidate("mining-material-loop-10-SONNISS19-SRC-070-000120ms.wav", "mining", -6),
    candidateStoneBreak: candidate("mining-material-loop-11-SONNISS19-MINE-18-001200ms.wav", "mining", 1),
    candidateGoldHit: candidate("mining-material-loop-13-SONNISS19-MINE-19-000000ms.wav", "mining", -1),
    candidateGoldBreak: candidate("ui-reward-flow-09-SONNISS19-MINE-12-000000ms.wav", "mining", -2),
    candidateResource: candidate("mining-material-loop-12-SONNISS19-MINE-13-000000ms.wav", "ui", -4),
    candidateUiSelect: candidate("ui-reward-flow-03-SONNISS19-SRC-050-000000ms.wav", "ui", -4),
    candidateUiConfirm: candidate("ui-reward-flow-04-SONNISS19-SRC-105-000150ms.wav", "ui", -7),
    candidateRewardItem: candidate("ui-reward-flow-08-SONNISS19-SRC-104-001500ms.wav", "ui", -4),
    candidateRewardCoins: candidate("ui-reward-flow-09-SONNISS19-MINE-12-000000ms.wav", "ui", -2),
    candidateCaveBed: candidate("deep-cave-danger-01-SONNISS19-MINE-02-030000ms.wav", "ambience", -4),
    candidateCaveWind: candidate("deep-cave-danger-02-SONNISS19-SRC-116-008000ms.wav", "ambience", -7),
    candidateChain: candidate("deep-cave-danger-04-SONNISS19-SRC-063-000000ms.wav", "hazard", -2),
    candidateCreak: candidate("deep-cave-danger-05-SONNISS19-SRC-077-000350ms.wav", "hazard", -1),
    candidateCollapse: candidate("deep-cave-danger-06-SONNISS19-MINE-28-003100ms.wav", "hazard", -3),
    candidatePressure: candidate("deep-cave-danger-08-SONNISS19-SRC-101-041000ms.wav", "hazard", -8),
    candidateTorch: candidate("deep-cave-danger-09-SONNISS19-SRC-097-000300ms.wav", "hazard", -5)
  }
});
