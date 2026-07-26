import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { MILESTONE_PILLAR_UI } from "../../values/milestonePillarUi.js";
import { RESOURCE_KEYS, getResourceDisplayName } from "../../values/resourceTypes.js";
import { RETENTION_CONFIG } from "../../values/retentionConfig.js";
import {
  addMilestonePanel,
  addMilestoneText,
} from "./milestonePillarUiPrimitives.js";

function formatJournalEntry(key) {
  if (key === "treasure-chest") return "Authored Treasure Chest";
  if (key === "sky-star") return "Constellation Star";
  if (key === "ancient-relic") return "Ancient Relic Cache";
  if (key === "earthquake") return "Earthquake Aftermath";
  if (key.startsWith("portal:")) return key.slice("portal:".length);
  if (key.startsWith("depth:")) {
    const depth = Number(key.slice("depth:".length));
    const band = RETENTION_CONFIG.depth.journalBands.find(entry => entry.depth === depth);
    return band ? `Depth Band: ${band.label}` : `Depth Band: ${depth}m`;
  }
  if (key.startsWith("geode-")) return "Crystal Geode";
  if (key.startsWith("hiddenTreasure-")) return "Hidden Treasure Room";
  if (key.startsWith("hiddenCave-")) return "Hidden Cave";
  if (key.startsWith("cave-")) return "Integrated Cave";
  return String(key).replace(/[-_:]+/g, " ");
}

function getSnapshot(system) {
  return system.retentionProgressSystem?.getJournalSnapshot?.() || {
    stats: {},
    discoveries: { materials: [], portals: [], journal: [] },
  };
}

function statRows(stats) {
  return [
    ["BEST DEPTH", `${stats.bestDepth || 0}m`],
    ["TILES BROKEN", stats.totalTilesBroken || 0],
    ["RESOURCES MINED", stats.totalResources || 0],
    ["RESOURCES SOLD", stats.resourcesSold || 0],
    ["HIGHEST COMBO", stats.highestCombo || 0],
    ["STARS FOUND", stats.starsCollected || 0],
    ["CHESTS OPENED", stats.chestsOpened || 0],
    ["PORTALS ACTIVATED", stats.portalsActivated || 0],
    ["RELICS FOUND", stats.relicsFound || 0],
    ["EARTHQUAKES", stats.earthquakesSurvived || 0],
  ];
}

function renderStats(scene, parent, rect, stats, compact) {
  const cfg = MILESTONE_PILLAR_UI.journal;
  const fonts = cfg.fonts;
  addMilestonePanel(scene, parent, rect, true);
  addMilestoneText(scene, parent, rect.left + cfg.inset, rect.top + cfg.inset, "MINER STATISTICS", {
    fontFamily: UI_FONTS.display,
    fontSize: fonts.section,
    fontStyle: "bold",
    color: UI_COLORS.title,
  });
  const rows = statRows(stats);
  const columns = compact ? cfg.compactStatsColumns : 1;
  const rowHeight = compact ? cfg.compactRowHeight : cfg.rowHeight;
  const columnWidth = rect.width / columns;
  rows.forEach(([label, value], index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = rect.left + column * columnWidth;
    const y = rect.top + 50 + row * rowHeight;
    if (row % 2 === 0) {
      const band = scene.add.rectangle(
        left + columnWidth / 2,
        y + rowHeight / 2,
        columnWidth - cfg.inset,
        rowHeight - 3,
        UI_COLORS.bg,
        0.62,
      );
      parent.add(band);
    }
    addMilestoneText(scene, parent, left + cfg.inset, y + rowHeight / 2, label, {
      fontSize: fonts.label,
      color: UI_COLORS.dim,
    }, [0, 0.5]);
    addMilestoneText(scene, parent, left + columnWidth - cfg.inset, y + rowHeight / 2, String(value), {
      fontFamily: UI_FONTS.display,
      fontSize: fonts.value,
      fontStyle: "bold",
      color: UI_COLORS.title,
    }, [1, 0.5]);
  });
}

function renderDiscoveries(scene, parent, rect, discoveries, compact) {
  const cfg = MILESTONE_PILLAR_UI.journal;
  const fonts = cfg.fonts;
  addMilestonePanel(scene, parent, rect, false);
  addMilestoneText(scene, parent, rect.left + cfg.inset, rect.top + cfg.inset, "DISCOVERY JOURNAL", {
    fontFamily: UI_FONTS.display,
    fontSize: fonts.section,
    fontStyle: "bold",
    color: UI_COLORS.title,
  });
  addMilestoneText(
    scene,
    parent,
    rect.left + cfg.inset,
    rect.top + 48,
    `MATERIALS ${discoveries.materials?.length || 0}/${RESOURCE_KEYS.length}`
      + `  •  PORTALS ${discoveries.portals?.length || 0}`
      + `  •  FINDINGS ${discoveries.journal?.length || 0}`,
    { fontSize: fonts.detail, color: UI_COLORS.gold },
  );

  const materialNames = (discoveries.materials || []).map(getResourceDisplayName);
  addMilestoneText(scene, parent, rect.left + cfg.inset, rect.top + 78, "MATERIALS FOUND", {
    fontSize: fonts.label,
    fontStyle: "bold",
    color: UI_COLORS.info,
  });
  addMilestoneText(
    scene,
    parent,
    rect.left + cfg.inset,
    rect.top + 99,
    materialNames.length ? materialNames.join("  •  ") : "No materials logged yet.",
    {
      fontSize: fonts.body,
      color: UI_COLORS.body,
      wordWrap: { width: rect.width - cfg.inset * 2, useAdvancedWrap: true },
      lineSpacing: 4,
    },
  );

  const limit = compact ? cfg.recentCompactLimit : cfg.recentWideLimit;
  const recent = (discoveries.journal || []).slice(-limit).reverse().map(formatJournalEntry);
  const recentY = compact ? rect.top + 162 : rect.top + 196;
  addMilestoneText(scene, parent, rect.left + cfg.inset, recentY, "RECENT FINDINGS", {
    fontSize: fonts.label,
    fontStyle: "bold",
    color: UI_COLORS.info,
  });
  addMilestoneText(
    scene,
    parent,
    rect.left + cfg.inset,
    recentY + 24,
    recent.length ? recent.map(entry => `• ${entry}`).join("\n") : "No caves or special findings logged yet.",
    {
      fontSize: fonts.body,
      color: UI_COLORS.body,
      lineSpacing: 5,
      wordWrap: { width: rect.width - cfg.inset * 2, useAdvancedWrap: true },
    },
  );
}

export function renderMilestonePillarJournal(system, parent, rect) {
  const snapshot = getSnapshot(system);
  const cfg = MILESTONE_PILLAR_UI.journal;
  const wide = rect.width >= cfg.wideLayoutMinWidth;
  if (wide) {
    const statsWidth = Math.floor(rect.width * cfg.wideLeftRatio);
    const statsRect = {
      left: rect.left,
      top: rect.top,
      right: rect.left + statsWidth,
      bottom: rect.bottom,
      width: statsWidth,
      height: rect.height,
    };
    const discoveryRect = {
      left: statsRect.right + cfg.panelGap,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.right - statsRect.right - cfg.panelGap,
      height: rect.height,
    };
    renderStats(system.scene, parent, statsRect, snapshot.stats || {}, false);
    renderDiscoveries(system.scene, parent, discoveryRect, snapshot.discoveries || {}, false);
    return;
  }

  const statsHeight = Math.min(rect.height * 0.55, 205);
  const statsRect = {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.top + statsHeight,
    width: rect.width,
    height: statsHeight,
  };
  const discoveryRect = {
    left: rect.left,
    top: statsRect.bottom + cfg.panelGap,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.bottom - statsRect.bottom - cfg.panelGap,
  };
  renderStats(system.scene, parent, statsRect, snapshot.stats || {}, true);
  renderDiscoveries(system.scene, parent, discoveryRect, snapshot.discoveries || {}, true);
}
