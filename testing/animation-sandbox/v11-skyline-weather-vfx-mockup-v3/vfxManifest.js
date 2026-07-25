window.SKYLINE_VFX_MANIFEST = Object.freeze({
  defaultMode: 'imagegen',
  sheets: Object.freeze({
    clouds: Object.freeze({ src: 'assets/processed/clouds-screen.webp', layoutRows: [3, 3, 3], blend: 'source-over' }),
    rain: Object.freeze({ src: 'assets/processed/rain-alpha.webp', layoutRows: [4, 4, 6], blend: 'source-over' }),
    snow: Object.freeze({ src: 'assets/processed/snow-alpha.webp', layoutRows: [4, 4, 6], blend: 'source-over' }),
    water: Object.freeze({ src: 'assets/processed/water-alpha.webp', layoutRows: [4, 4, 4], blend: 'source-over' }),
    atmosphere: Object.freeze({ src: 'assets/processed/atmosphere-screen.webp', layoutRows: [4, 4, 4], blend: 'source-over' }),
    lightning: Object.freeze({ src: 'assets/processed/lightning-screen.webp', layoutRows: [4, 4, 4], blend: 'source-over' }),
  }),
  frames: Object.freeze({
    clouds: Object.freeze({ distant: [0, 1, 2], midground: [3, 4, 5], storm: [6, 7, 8] }),
    rain: Object.freeze({ distant: [0, 1, 2, 3], foreground: [4, 5, 6, 7], sheets: [8, 9], droplets: [10, 11], spray: [12, 13] }),
    snow: Object.freeze({ flakes: [0, 1, 2, 3, 4, 5, 6, 7], clumps: [8, 9, 10], powder: [11, 12, 13] }),
    water: Object.freeze({ splash: [0, 1, 2, 3], ripple: [4, 5, 6, 7], spray: [10, 11] }),
    atmosphere: Object.freeze({ fog: [0, 1, 2, 3], smoke: [4, 5, 6, 7], steam: [8, 9], groundMist: [10, 11] }),
    lightning: Object.freeze({ bolts: [0, 1, 2, 3], cracks: [4, 5, 6, 7], flashes: [8, 9, 10, 11] }),
  }),
});
