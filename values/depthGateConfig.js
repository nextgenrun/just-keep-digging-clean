export const DEPTH_GATE_CONFIG = Object.freeze({
  gates: Object.freeze([
    Object.freeze({
      threshold: 100,
      title: "DEPTH WARNING: 100M",
      confirmationWord: "100M",
      typedInstruction: "TYPE  100M  THEN PRESS ENTER",
      message:
        "You are entering the first deep layer. "
        + "Dangers and tile strength increase from here.",
    }),
    Object.freeze({
      threshold: 300,
      title: "DEPTH WARNING: 300M",
      confirmationWord: "300M",
      typedInstruction: "TYPE  300M  THEN PRESS ENTER",
      message:
        "You are pushing into a harsher depth band. "
        + "Hazards become more frequent below 300m.",
    }),
    Object.freeze({
      threshold: 1000,
      title: "DEPTH WARNING: 1000M",
      confirmationWord: "RISK",
      typedInstruction: "TYPE  RISK  THEN PRESS ENTER",
      message:
        "You are entering the 1000M tier. Torches now burn near 15 GP/s "
        + "and scale to ~30 GP/s by 2000M; deep darkness also ramps up 2-3x.",
    }),
  ]),
  legacyThresholdAliases: Object.freeze({
    999: 1000,
  }),
  confirmation: Object.freeze({
    subtitle: "PROGRESSION CONFIRMATION",
    footer: "ESC  RETURN TO SPAWN",
  }),
  feedback: Object.freeze({
    returnedText: "Returned safely to spawn",
    returnedColor: "#e4ba78",
    returnedDurationMs: 2200,
  }),
});
