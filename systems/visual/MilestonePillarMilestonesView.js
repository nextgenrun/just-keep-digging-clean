import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { DEPTH_MILESTONES } from "../../values/depthMilestones.js";
import { MILESTONE_PILLAR_UI } from "../../values/milestonePillarUi.js";
import {
  addMilestonePanel,
  addMilestoneProgressBar,
  addMilestoneText,
} from "./milestonePillarUiPrimitives.js";

function getBestDepth(system) {
  return Math.max(
    system.retentionProgressSystem?.getBestDepth?.() || 0,
    ...(system.getReachedDepths?.() || [0]),
  );
}

function renderSummary(system, parent, rect, compact) {
  const scene = system.scene;
  const cfg = MILESTONE_PILLAR_UI.milestones;
  const fonts = cfg.fonts;
  const bestDepth = getBestDepth(system);
  const next = system.getNextMilestone();
  const bonuses = system.getBonuses();
  const reachedCount = system.getReachedDepths().length;
  const inset = cfg.summaryInset;
  addMilestonePanel(scene, parent, rect, true);

  if (compact) {
    addMilestoneText(scene, parent, rect.left + inset, rect.top + inset, "NEXT DEPTH", {
      fontFamily: UI_FONTS.display,
      fontSize: fonts.section,
      fontStyle: "bold",
      color: UI_COLORS.gold,
    });
    addMilestoneText(scene, parent, rect.left + inset, rect.top + 43, next ? `${next.depth}M` : "COMPLETE", {
      fontFamily: UI_FONTS.display,
      fontSize: fonts.depth,
      fontStyle: "bold",
      color: UI_COLORS.title,
    });
    addMilestoneText(
      scene,
      parent,
      rect.left + Math.min(rect.width * 0.36, 230),
      rect.top + 45,
      next ? `${next.name}  •  ${next.reward}` : "Every depth reward is secured.",
      {
        fontSize: fonts.body,
        color: UI_COLORS.body,
        wordWrap: { width: Math.max(150, rect.width * 0.6 - inset), useAdvancedWrap: true },
      },
    );
    addMilestoneText(
      scene,
      parent,
      rect.right - inset,
      rect.top + inset,
      `${reachedCount}/${DEPTH_MILESTONES.length} REACHED`,
      { fontSize: fonts.detail, color: UI_COLORS.success },
      [1, 0],
    );
    addMilestoneText(
      scene,
      parent,
      rect.right - inset,
      rect.bottom - inset,
      `+${bonuses.gpMaxBonus} GP  •  +${bonuses.miningSpeedPct}% SPEED  •  +${bonuses.resourceYieldPct}% YIELD`,
      { fontSize: fonts.detail, color: UI_COLORS.info },
      [1, 1],
    );
    return;
  }

  addMilestoneText(scene, parent, rect.left + inset, rect.top + inset, "NEXT DEPTH", {
    fontFamily: UI_FONTS.display,
    fontSize: fonts.section,
    fontStyle: "bold",
    color: UI_COLORS.gold,
  });
  addMilestoneText(scene, parent, rect.left + inset, rect.top + 50, next ? `${next.depth}M` : "COMPLETE", {
    fontFamily: UI_FONTS.display,
    fontSize: fonts.depth,
    fontStyle: "bold",
    color: UI_COLORS.title,
  });
  addMilestoneText(scene, parent, rect.left + inset, rect.top + 82, next?.name || "Depth master", {
    fontSize: fonts.body,
    fontStyle: "bold",
    color: UI_COLORS.body,
    wordWrap: { width: rect.width - inset * 2, useAdvancedWrap: true },
  });
  addMilestoneText(scene, parent, rect.left + inset, rect.top + 112, next?.reward || "All rewards secured", {
    fontSize: fonts.detail,
    color: UI_COLORS.info,
    wordWrap: { width: rect.width - inset * 2, useAdvancedWrap: true },
  });

  const previousDepth = DEPTH_MILESTONES
    .filter(milestone => milestone.depth <= bestDepth)
    .at(-1)?.depth || 0;
  const span = Math.max(1, (next?.depth || bestDepth) - previousDepth);
  const ratio = next ? (bestDepth - previousDepth) / span : 1;
  addMilestoneProgressBar(scene, parent, {
    left: rect.left + inset,
    top: rect.top + 154,
    width: rect.width - inset * 2,
    height: cfg.progressBarHeight,
  }, ratio);
  addMilestoneText(
    scene,
    parent,
    rect.left + inset,
    rect.top + 171,
    next ? `${Math.max(0, next.depth - bestDepth)}M TO GO` : "JOURNEY COMPLETE",
    { fontSize: fonts.detail, color: UI_COLORS.dim },
  );

  addMilestoneText(scene, parent, rect.left + inset, rect.top + 222, "PERMANENT TOTALS", {
    fontFamily: UI_FONTS.display,
    fontSize: fonts.section,
    fontStyle: "bold",
    color: UI_COLORS.gold,
  });
  const totals = [
    `+${bonuses.gpMaxBonus} GP MAX`,
    `+${bonuses.miningSpeedPct}% MINING SPEED`,
    `+${bonuses.resourceYieldPct}% MATERIAL YIELD`,
  ];
  totals.forEach((text, index) => {
    addMilestoneText(scene, parent, rect.left + inset, rect.top + 258 + index * cfg.summaryLineGap, text, {
      fontSize: fonts.body,
      color: index === 0 ? UI_COLORS.info : UI_COLORS.body,
    });
  });
  addMilestoneText(
    scene,
    parent,
    rect.left + rect.width / 2,
    rect.bottom - inset,
    `${reachedCount} / ${DEPTH_MILESTONES.length} REACHED`,
    { fontSize: fonts.detail, color: UI_COLORS.success },
    [0.5, 1],
  );
}

function renderCard(system, parent, rect, milestone, nextDepth) {
  const scene = system.scene;
  const cfg = MILESTONE_PILLAR_UI.milestones;
  const fonts = cfg.fonts;
  const reached = system.getReachedDepths().includes(milestone.depth);
  const isNext = nextDepth === milestone.depth;
  addMilestonePanel(scene, parent, rect, reached || isNext);

  addMilestoneText(scene, parent, rect.left + cfg.cardInsetX, rect.top + cfg.cardInsetY, `${milestone.depth}M`, {
    fontFamily: UI_FONTS.display,
    fontSize: fonts.cardDepth,
    fontStyle: "bold",
    color: reached || isNext ? UI_COLORS.gold : UI_COLORS.dim,
  });
  addMilestoneText(
    scene,
    parent,
    rect.left + cfg.depthBadgeWidth,
    rect.top + cfg.cardInsetY + 1,
    milestone.name,
    {
      fontFamily: UI_FONTS.display,
      fontSize: fonts.cardTitle,
      fontStyle: "bold",
      color: reached || isNext ? UI_COLORS.title : UI_COLORS.dim,
    },
  );
  addMilestoneText(
    scene,
    parent,
    rect.right - cfg.cardInsetX,
    rect.top + cfg.cardInsetY + 2,
    reached ? "DONE" : isNext ? "NEXT" : "LOCKED",
    {
      fontSize: fonts.status,
      color: reached ? UI_COLORS.success : isNext ? UI_COLORS.gold : UI_COLORS.dim,
    },
    [1, 0],
  );
  addMilestoneText(
    scene,
    parent,
    rect.left + cfg.depthBadgeWidth,
    rect.bottom - cfg.cardInsetY,
    milestone.reward,
    {
      fontSize: fonts.reward,
      color: reached || isNext ? UI_COLORS.body : UI_COLORS.dim,
      wordWrap: {
        width: Math.max(90, rect.width - cfg.depthBadgeWidth - cfg.statusWidth),
        useAdvancedWrap: true,
      },
    },
    [0, 1],
  );
}

export function renderMilestonePillarMilestones(system, parent, rect, requestedPage, onPageChange) {
  const scene = system.scene;
  const cfg = MILESTONE_PILLAR_UI.milestones;
  const wide = rect.width >= cfg.wideLayoutMinWidth;
  const summaryRect = wide
    ? {
        left: rect.left,
        top: rect.top,
        right: rect.left + cfg.summaryRailWidth,
        bottom: rect.bottom,
        width: cfg.summaryRailWidth,
        height: rect.height,
      }
    : {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.top + cfg.compactSummaryHeight,
        width: rect.width,
        height: cfg.compactSummaryHeight,
      };
  const cardsRect = wide
    ? {
        left: summaryRect.right + cfg.summaryGap,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.right - summaryRect.right - cfg.summaryGap,
        height: rect.height,
      }
    : {
        left: rect.left,
        top: summaryRect.bottom + cfg.summaryGap,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.bottom - summaryRect.bottom - cfg.summaryGap,
      };
  renderSummary(system, parent, summaryRect, !wide);

  const cardAreaHeight = cardsRect.height - cfg.footerHeight;
  const columns = cardsRect.width >= cfg.twoColumnMinWidth ? 2 : 1;
  const rows = cardAreaHeight >= cfg.tallLayoutMinHeight ? cfg.wideRows : cfg.shortRows;
  const pageSize = columns * rows;
  const pageCount = Math.ceil(DEPTH_MILESTONES.length / pageSize);
  const page = Phaser.Math.Clamp(requestedPage || 0, 0, pageCount - 1);
  const cardWidth = (cardsRect.width - cfg.cardGap * (columns - 1)) / columns;
  const cardHeight = (cardAreaHeight - cfg.cardGap * (rows - 1)) / rows;
  const nextDepth = system.getNextMilestone()?.depth;
  const start = page * pageSize;
  const visible = DEPTH_MILESTONES.slice(start, start + pageSize);

  visible.forEach((milestone, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    renderCard(system, parent, {
      left: cardsRect.left + column * (cardWidth + cfg.cardGap),
      top: cardsRect.top + row * (cardHeight + cfg.cardGap),
      right: cardsRect.left + column * (cardWidth + cfg.cardGap) + cardWidth,
      bottom: cardsRect.top + row * (cardHeight + cfg.cardGap) + cardHeight,
      width: cardWidth,
      height: cardHeight,
    }, milestone, nextDepth);
  });

  const footerY = cardsRect.bottom - cfg.footerHeight / 2;
  const prev = system.ui.createButton(scene, {
    x: cardsRect.left + cfg.pageButtonEdgeInset,
    y: footerY,
    width: cfg.pageButtonWidth,
    height: cfg.pageButtonHeight,
    label: "PREV",
    parent,
    enabled: page > 0,
    onClick: () => onPageChange(page - 1),
  });
  const next = system.ui.createButton(scene, {
    x: cardsRect.right - cfg.pageButtonEdgeInset,
    y: footerY,
    width: cfg.pageButtonWidth,
    height: cfg.pageButtonHeight,
    label: "NEXT",
    parent,
    enabled: page < pageCount - 1,
    onClick: () => onPageChange(page + 1),
  });
  prev.setEnabled(page > 0);
  next.setEnabled(page < pageCount - 1);
  addMilestoneText(
    scene,
    parent,
    cardsRect.left + cardsRect.width / 2,
    footerY,
    `PAGE ${page + 1} / ${pageCount}  •  ${start + 1}-${Math.min(start + pageSize, DEPTH_MILESTONES.length)} OF ${DEPTH_MILESTONES.length}`,
    { fontSize: cfg.fonts.page, color: UI_COLORS.body },
    [0.5, 0.5],
  );
  return { page, pageCount, pageSize };
}
