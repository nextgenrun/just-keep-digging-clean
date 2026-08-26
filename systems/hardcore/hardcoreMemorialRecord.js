import { HARDCORE_MEMORIAL_CONFIG } from "../../values/hardcoreMemorials.js";
import { LEVEL_CONFIG } from "../../values/levelConfig.js";

const config = HARDCORE_MEMORIAL_CONFIG;

function finiteInt(value, maximum = Number.MAX_SAFE_INTEGER) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(maximum, Math.floor(numeric)));
}

function finiteCoordinate(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(
    0,
    Math.min(config.persistence.maximumCoordinatePx, numeric),
  );
}

function cleanText(value, fallback = "") {
  return String(value ?? fallback)
    .trim()
    .slice(0, config.persistence.maximumStringLength);
}

function sanitizeStats(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(
    config.statRows.map(row => [
      row.key,
      finiteInt(
        source[row.key],
        row.key === "moneyEarned" ? 1000000000000 : 1000000000,
      ),
    ]),
  );
}

function sanitizeJourneyEvents(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((event, index) => {
      const title = cleanText(event?.title);
      if (!title) return null;
      return {
        id: cleanText(event?.id, `journey-${index + 1}`),
        sequence: finiteInt(event?.sequence, 1000000000),
        type: cleanText(event?.type),
        title,
        detail: cleanText(event?.detail),
        source: cleanText(event?.source),
      };
    })
    .filter(Boolean)
    .slice(-config.persistence.maximumJourneyEvents);
}

function sanitizePlayerLevel(value) {
  const rawLevel = Math.max(
    1,
    finiteInt(value?.player?.level, LEVEL_CONFIG.LEGACY_HARDCAP) || 1,
  );
  const progressionVersion = Number(value?.player?.progressionVersion);
  const recordVersion = Number(value?.version);
  const isLegacy = Number.isFinite(progressionVersion)
    ? progressionVersion < LEVEL_CONFIG.PROGRESSION_VERSION
    : Number.isFinite(recordVersion) && recordVersion < config.version;
  return isLegacy
    ? LEVEL_CONFIG.getCompressedLevelForLegacyLevel(rawLevel)
    : Math.min(LEVEL_CONFIG.HARDCAP, rawLevel);
}

export function sanitizeHardcoreMemorialRecord(value) {
  const diedAt = finiteInt(
    value?.diedAt,
    config.persistence.maximumTimestamp,
  );
  const slotId = Math.max(1, finiteInt(value?.slotId, 999) || 1);
  return {
    version: config.version,
    id: cleanText(value?.id, `hardcore-${slotId}-${diedAt}`),
    slotId,
    worldIdentity: cleanText(value?.worldIdentity, `save-slot-${slotId}`),
    diedAt,
    source: cleanText(value?.source, config.copy.unknownDeathSource),
    reason: cleanText(value?.reason, config.copy.unknownDeathReason),
    depth: finiteInt(value?.depth, 100000),
    position: {
      worldX: finiteCoordinate(value?.position?.worldX),
      worldY: finiteCoordinate(value?.position?.worldY),
      tileX: finiteInt(value?.position?.tileX, 100000),
      tileY: finiteInt(value?.position?.tileY, 100000),
    },
    player: {
      characterId: cleanText(
        value?.player?.characterId,
        config.copy.defaultCharacterId,
      ),
      progressionVersion: LEVEL_CONFIG.PROGRESSION_VERSION,
      level: sanitizePlayerLevel(value),
      gemPowerMax: finiteInt(value?.player?.gemPowerMax, 1000000),
      wallet: finiteInt(value?.player?.wallet, 1000000000000),
      carriedResourceUnits: finiteInt(
        value?.player?.carriedResourceUnits,
        1000000000,
      ),
    },
    hardcore: {
      activePlayMs: finiteInt(
        value?.hardcore?.activePlayMs,
        config.persistence.maximumTimestamp,
      ),
      peakStress: Math.min(100, finiteInt(value?.hardcore?.peakStress, 100)),
      unstuckUses: finiteInt(value?.hardcore?.unstuckUses, 1000000),
      paidTeleports: finiteInt(value?.hardcore?.paidTeleports, 1000000),
      teleportMoneySpent: finiteInt(
        value?.hardcore?.teleportMoneySpent,
        1000000000000,
      ),
      wurmEncounters: finiteInt(value?.hardcore?.wurmEncounters, 1000000),
    },
    stats: sanitizeStats(value?.stats),
    achievements: sanitizeJourneyEvents(value?.achievements),
  };
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(finiteInt(milliseconds) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map(value => String(value).padStart(2, "0"))
    .join(":");
}

function formatStat(row, stats) {
  const value = finiteInt(stats?.[row.key]);
  return `${value.toLocaleString()}${row.suffix || ""}`;
}

function getOverviewValues(record) {
  return {
    depth: record.depth,
    activePlayMs: record.hardcore.activePlayMs,
    level: record.player.level,
    gemPowerMax: record.player.gemPowerMax,
    peakStress: record.hardcore.peakStress,
    wurmEncounters: record.hardcore.wurmEncounters,
    unstuckUses: record.hardcore.unstuckUses,
    paidTeleports: record.hardcore.paidTeleports,
    teleportMoneySpent: record.hardcore.teleportMoneySpent,
    carriedResourceUnits: record.player.carriedResourceUnits,
  };
}

function formatOverviewValue(row, value) {
  if (row.format === "duration") return formatDuration(value);
  const numeric = finiteInt(value);
  if (row.format === "depth") return `${numeric.toLocaleString()}m`;
  return `${numeric.toLocaleString()}${row.suffix || ""}`;
}

function chunk(items, size) {
  const pages = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

export function buildHardcoreDeathRecapPages(rawRecord) {
  const record = sanitizeHardcoreMemorialRecord(rawRecord);
  const overviewValues = getOverviewValues(record);
  const pages = [{
    type: "overview",
    title: config.copy.overviewTitle,
    body: config.overviewRows.map(row => (
      `${row.label.padEnd(24, " ")}${formatOverviewValue(
        row,
        overviewValues[row.key],
      )}`
    )).join("\n"),
  }];

  chunk(config.statRows, config.recap.statsPerPage).forEach((rows, index, all) => {
    pages.push({
      type: "stats",
      title: `${config.copy.statsTitle} ${index + 1}/${all.length}`,
      body: rows.map(row => (
        `${row.label.padEnd(24, " ")}${formatStat(row, record.stats)}`
      )).join("\n"),
    });
  });

  const achievementPages = chunk(
    record.achievements,
    config.recap.achievementsPerPage,
  );
  if (achievementPages.length === 0) {
    pages.push({
      type: "achievements",
      title: config.copy.achievementsTitle,
      body: config.copy.noAchievements,
    });
  } else {
    achievementPages.forEach((events, index, all) => {
      pages.push({
        type: "achievements",
        title: `${config.copy.achievementsTitle} ${index + 1}/${all.length}`,
        body: events.map(event => (
          `• ${event.title}${event.detail ? `\n  ${event.detail}` : ""}`
        )).join("\n"),
      });
    });
  }
  return pages;
}
