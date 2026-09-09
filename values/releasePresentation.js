// Player-visible release phase shared by boot and menu screens.
export const RELEASE_PRESENTATION = Object.freeze({
  label: "OPEN BETA DEMO",
  footer: Object.freeze({
    name: "release-phase-label",
    insetX: 18,
    insetY: 14,
    fontSize: "15px",
    fontStyle: "bold",
    color: "#fff0cd",
    stroke: "#100d09",
    strokeThickness: 4,
    shadow: Object.freeze({ offsetX: 0, offsetY: 1, color: "#000000", blur: 4, fill: true, stroke: true }),
  }),
});
