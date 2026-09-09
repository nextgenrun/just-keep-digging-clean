export const DEPTH_GATE_CONFIG = Object.freeze({
  gates: Object.freeze([
    Object.freeze({
      threshold: 100,
      title: "CROSS 100M?",
      confirmationWord: "100M",
      typedInstruction: "TYPE  100M  THEN PRESS ENTER",
      message:
        "The mine gets more dangerous below 100m, and blocks become harder to break.",
    }),
    Object.freeze({
      threshold: 300,
      title: "CROSS 300M?",
      confirmationWord: "300M",
      typedInstruction: "TYPE  300M  THEN PRESS ENTER",
      message:
        "Hazards appear more often below 300m. Make sure you can return safely.",
    }),
    Object.freeze({
      threshold: 1000,
      title: "CROSS 1000M?",
      confirmationWord: "RISK",
      typedInstruction: "TYPE  RISK  THEN PRESS ENTER",
      message:
        "Below 1000m, your torch uses about 15 GP each second and can reach "
        + "about 30 GP each second by 2000m. The darkness also becomes much stronger.",
    }),
  ]),
  legacyThresholdAliases: Object.freeze({
    999: 1000,
  }),
  confirmation: Object.freeze({
    subtitle: "THE MINE GETS MORE DANGEROUS BELOW",
    footer: "ESC  RETURN TO TOWN",
  }),
  feedback: Object.freeze({
    returnedText: "Returned safely to Town",
    returnedColor: "#e4ba78",
    returnedDurationMs: 2200,
  }),
});
