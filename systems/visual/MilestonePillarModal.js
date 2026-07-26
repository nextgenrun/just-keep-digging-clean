import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { DEPTH_MILESTONES } from "../../values/depthMilestones.js";
import { RESOURCE_KEYS, getResourceDisplayName } from "../../values/resourceTypes.js";
import { RETENTION_CONFIG } from "../../values/retentionConfig.js";

function addText(scene, parent, x, y, text, style = {}, origin = [0, 0]) {
  const object = scene.add.text(x, y, text, {
    fontFamily: style.fontFamily || UI_FONTS.mono,
    fontSize: style.fontSize || "11px",
    fontStyle: style.fontStyle,
    color: style.color || UI_COLORS.body,
    align: style.align,
    lineSpacing: style.lineSpacing || 0,
    wordWrap: style.wordWrap,
  }).setOrigin(origin[0], origin[1]);
  parent.add(object);
  return object;
}

function addPanel(scene, parent, x, y, width, height, selected = false) {
  const panel = scene.add.rectangle(
    x + width / 2,
    y + height / 2,
    width,
    height,
    selected ? UI_COLORS.cardSel : UI_COLORS.cardBase,
    0.96
  ).setStrokeStyle(
    selected ? 2 : 1,
    selected ? UI_COLORS.borderSel : UI_COLORS.borderDim
  );
  parent.add(panel);
  return panel;
}

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

function renderMilestones(system, parent, rect) {
  const scene = system.scene;
  const next = system.getNextMilestone();
  const columns = rect.width >= 760 ? 3 : 2;
  const gap = 10;
  const width = (rect.width - gap * (columns - 1)) / columns;
  const rows = Math.ceil(DEPTH_MILESTONES.length / columns);
  const height = Math.max(49, Math.min(63, (rect.height - gap * (rows - 1)) / rows));

  DEPTH_MILESTONES.forEach((milestone, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = rect.left + col * (width + gap);
    const y = rect.top + row * (height + gap);
    const reached = system.getReachedDepths().includes(milestone.depth);
    const isNext = next?.depth === milestone.depth;
    addPanel(scene, parent, x, y, width, height, reached || isNext);
    const title = `${milestone.depth}M  ${milestone.name}`;
    addText(scene, parent, x + 12, y + 12, title, {
      fontFamily: UI_FONTS.display,
      fontSize: "12px",
      fontStyle: "bold",
      color: reached || isNext ? UI_COLORS.title : UI_COLORS.dim,
    });
    const remaining = Math.max(0, milestone.depth - (system.retentionProgressSystem?.getBestDepth?.() || 0));
    addText(
      scene,
      parent,
      x + width - 10,
      y + 12,
      reached ? "DONE" : isNext ? `NEXT • ${remaining}m` : "LOCKED",
      {
        fontSize: "9px",
        color: reached ? UI_COLORS.success : isNext ? UI_COLORS.gold : UI_COLORS.dim,
      },
      [1, 0]
    );
    addText(scene, parent, x + 12, y + height - 18, milestone.reward, {
      fontSize: "9px",
      color: reached || isNext ? UI_COLORS.body : UI_COLORS.dim,
    });
  });
}

function renderJournal(system, parent, rect) {
  const scene = system.scene;
  const snapshot = system.retentionProgressSystem?.getJournalSnapshot?.() || {
    stats: {},
    discoveries: { materials: [], portals: [], journal: [] },
  };
  const stats = snapshot.stats || {};
  const gap = 14;
  const leftWidth = Math.floor(rect.width * 0.48);
  const rightX = rect.left + leftWidth + gap;
  const rightWidth = rect.width - leftWidth - gap;
  addPanel(scene, parent, rect.left, rect.top, leftWidth, rect.height, true);
  addPanel(scene, parent, rightX, rect.top, rightWidth, rect.height, false);

  addText(scene, parent, rect.left + 18, rect.top + 16, "MINER STATISTICS", {
    fontFamily: UI_FONTS.display,
    fontSize: "16px",
    fontStyle: "bold",
    color: UI_COLORS.title,
  });
  const statRows = [
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
  statRows.forEach(([label, value], index) => {
    const y = rect.top + 54 + index * 35;
    if (index % 2 === 0) {
      const band = scene.add.rectangle(
        rect.left + leftWidth / 2,
        y + 11,
        leftWidth - 24,
        28,
        UI_COLORS.bg,
        0.62
      );
      parent.add(band);
    }
    addText(scene, parent, rect.left + 18, y + 11, label, {
      fontSize: "9px",
      color: UI_COLORS.dim,
    }, [0, 0.5]);
    addText(scene, parent, rect.left + leftWidth - 18, y + 11, String(value), {
      fontFamily: UI_FONTS.display,
      fontSize: "13px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    }, [1, 0.5]);
  });

  const discoveries = snapshot.discoveries || {};
  addText(scene, parent, rightX + 18, rect.top + 16, "DISCOVERY JOURNAL", {
    fontFamily: UI_FONTS.display,
    fontSize: "16px",
    fontStyle: "bold",
    color: UI_COLORS.title,
  });
  addText(
    scene,
    parent,
    rightX + 18,
    rect.top + 48,
    `MATERIALS  ${discoveries.materials?.length || 0}/${RESOURCE_KEYS.length}`
      + `  •  PORTALS  ${discoveries.portals?.length || 0}`
      + `  •  FINDINGS  ${discoveries.journal?.length || 0}`,
    { fontSize: "9px", color: UI_COLORS.gold }
  );
  const materialLines = (discoveries.materials || []).map(getResourceDisplayName);
  addText(scene, parent, rightX + 18, rect.top + 82, "MATERIALS FOUND", {
    fontSize: "10px",
    fontStyle: "bold",
    color: UI_COLORS.info,
  });
  addText(
    scene,
    parent,
    rightX + 18,
    rect.top + 104,
    materialLines.length ? materialLines.join("  •  ") : "No materials logged yet.",
    {
      fontSize: "10px",
      color: UI_COLORS.body,
      wordWrap: { width: rightWidth - 36, useAdvancedWrap: true },
      lineSpacing: 5,
    }
  );
  const recent = (discoveries.journal || []).slice(-9).reverse().map(formatJournalEntry);
  addText(scene, parent, rightX + 18, rect.top + 196, "RECENT FINDINGS", {
    fontSize: "10px",
    fontStyle: "bold",
    color: UI_COLORS.info,
  });
  addText(
    scene,
    parent,
    rightX + 18,
    rect.top + 220,
    recent.length ? recent.map(entry => `• ${entry}`).join("\n") : "No caves or special findings logged yet.",
    {
      fontSize: "10px",
      color: UI_COLORS.body,
      lineSpacing: 7,
      wordWrap: { width: rightWidth - 36, useAdvancedWrap: true },
    }
  );
}

export function openMilestonePillarModal(system) {
  const scene = system.scene;
  const shell = system.ui.createModalShell(scene, {
    title: "MILESTONE PILLAR",
    subtitle: "Permanent depth rewards, miner statistics, and discoveries",
    icon: "journal",
    maxWidth: 960,
    maxHeight: 680,
    depth: 3150,
    onClose: () => system._closeBoardView(),
  });
  const content = shell.content;
  const rect = shell.getContentRect();
  const view = scene.add.container(0, 0);
  content.add(view);
  const viewRect = {
    left: rect.left,
    top: rect.top + 54,
    width: rect.width,
    height: rect.height - 54,
  };
  let activeTab = "milestones";

  const render = tab => {
    activeTab = tab;
    view.removeAll(true);
    if (tab === "journal") renderJournal(system, view, viewRect);
    else renderMilestones(system, view, viewRect);
    milestoneButton?.setSelected?.(activeTab === "milestones");
    journalButton?.setSelected?.(activeTab === "journal");
  };
  const milestoneButton = system.ui.createButton(scene, {
    x: rect.left + 145,
    y: rect.top + 22,
    width: 270,
    height: 40,
    label: "DEPTH MILESTONES",
    icon: "journal",
    accent: UI_COLORS.borderSel,
    parent: content,
    onClick: () => render("milestones"),
  });
  const journalButton = system.ui.createButton(scene, {
    x: rect.left + 435,
    y: rect.top + 22,
    width: 270,
    height: 40,
    label: "MINER JOURNAL",
    icon: "stats",
    accent: UI_COLORS.borderGood,
    parent: content,
    onClick: () => render("journal"),
  });
  render("milestones");
  shell.show();
  return shell;
}
