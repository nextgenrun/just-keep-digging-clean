export function buildHardcoreDeathPresentation(result) {
  if (result.outcome === "free-revive") {
    return Object.freeze({
      title: "THE OATH GRANTS ONE MERCY",
      subtitlePrefix: "FREE FIRST REVIVE",
      readyStatus: "FREE REVIVE SAVED • 2 LIVES REMAIN",
      readyDetail: "RETURNING TO TOWN WITH FULL GEM POWER",
      primaryLabel: "REVIVE IN TOWN",
      secondaryLabel: "BACK TO SAVE VAULT",
    });
  }
  if (result.outcome === "life-lost") {
    return Object.freeze({
      title: "ONE LIFE IS SPENT",
      subtitlePrefix: "HARDCORE LIFE LOST",
      readyStatus: `${result.livesRemaining} LIFE REMAINS • SAVE INTACT`,
      readyDetail: "RETURNING TO TOWN WITH FULL GEM POWER",
      primaryLabel: "REVIVE IN TOWN",
      secondaryLabel: "BACK TO SAVE VAULT",
    });
  }
  return Object.freeze({
    title: "THE EXPEDITION IS ENDED",
    subtitlePrefix: "HARDCORE EXHAUSTED",
    readyStatus: "0 LIVES REMAIN • SAVE AND RECORD INTACT",
    readyDetail: "EXPORT OR CLEAR THE ENDED EXPEDITION FROM THE SAVE VAULT",
    primaryLabel: "BACK TO SAVE VAULT",
    secondaryLabel: "SAVE VAULT",
  });
}
