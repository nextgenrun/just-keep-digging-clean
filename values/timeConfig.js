/**
 * Time & Season Configuration
 * Defines day phases, colors, sun arc, and seasonal weather weights.
 */

export const TIME_CONFIG = Object.freeze({
  // Day duration in milliseconds (2 hours = 7200000)
  dayDurationMs: 7200000,

  // Day phases — each segment covers a fraction of the 0-1 day cycle
  // currentTime 0.0 = midnight, 0.5 = noon
  phases: [
    {
      name: "midnight",
      label: "Midnight",
      start: 0.00,
      end: 0.10,
      skyColor: 0x0a0e1a,
      horizonGlow: 0x0e1422,
      sunAlpha: 0,
      moonAlpha: 1,
      starAlpha: 1,
    },
    {
      name: "dawn",
      label: "Dawn",
      start: 0.10,
      end: 0.20,
      skyColor: 0x1e2030,
      horizonGlow: 0xb07a50,
      sunAlpha: 0.3,
      moonAlpha: 0.7,
      starAlpha: 0.6,
    },
    {
      name: "morning",
      label: "Morning",
      start: 0.20,
      end: 0.35,
      skyColor: 0x4a6a8a,
      horizonGlow: 0xc8b080,
      sunAlpha: 0.8,
      moonAlpha: 0.2,
      starAlpha: 0.1,
    },
    {
      name: "afternoon",
      label: "Afternoon",
      start: 0.35,
      end: 0.60,
      skyColor: 0x5a7a9a,
      horizonGlow: 0xb0c0d0,
      sunAlpha: 1,
      moonAlpha: 0,
      starAlpha: 0,
    },
    {
      name: "dusk",
      label: "Dusk",
      start: 0.60,
      end: 0.75,
      skyColor: 0x5a4060,
      horizonGlow: 0xc86848,
      sunAlpha: 0.6,
      moonAlpha: 0.4,
      starAlpha: 0.3,
    },
    {
      name: "sunset",
      label: "Sunset",
      start: 0.75,
      end: 0.88,
      skyColor: 0x2e1830,
      horizonGlow: 0xa03828,
      sunAlpha: 0.2,
      moonAlpha: 0.8,
      starAlpha: 0.7,
    },
    {
      name: "night",
      label: "Night",
      start: 0.88,
      end: 1.0,
      skyColor: 0x0a0e1a,
      horizonGlow: 0x0e1422,
      sunAlpha: 0,
      moonAlpha: 1,
      starAlpha: 1,
    },
  ],

  // Sun position arc (normalized x,y from -1 to 1 across the sky)
  sunArc: {
    riseX: -0.6,
    riseY: 0.4,
    noonX: 0,
    noonY: -0.2,
    setX: 0.6,
    setY: 0.4,
  },

  // Moon position follows similar arc, offset 12 hours
  moonArc: {
    riseX: 0.6,
    riseY: 0.4,
    zenithX: 0,
    zenithY: -0.2,
    setX: -0.6,
    setY: 0.4,
  },

  // Shadow direction (degrees, 0 = north, 90 = east, 180 = south, 270 = west)
  shadowAngles: {
    dawn: 90,
    morning: 135,
    afternoon: 225,
    dusk: 270,
    night: 0,
  },

  // Weather season weights (affects which weather is more likely)
  seasons: {
    spring: {
      clearWeight: 3,
      drizzleWeight: 4,
      rainWeight: 3,
      stormWeight: 1,
      fogChance: 0.3,
      temperature: [15, 25],
    },
    summer: {
      clearWeight: 5,
      drizzleWeight: 2,
      rainWeight: 2,
      stormWeight: 3,
      fogChance: 0.1,
      temperature: [22, 38],
    },
    autumn: {
      clearWeight: 2,
      drizzleWeight: 3,
      rainWeight: 4,
      stormWeight: 2,
      fogChance: 0.4,
      temperature: [8, 20],
    },
    winter: {
      clearWeight: 4,
      drizzleWeight: 2,
      rainWeight: 2,
      stormWeight: 4,
      fogChance: 0.5,
      temperature: [-5, 10],
    },
  },

  // Day counter starts at 1
  initialDay: 1,
});