import { JOURNEY_CONFIG } from "../../values/journeyConfig.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";

function formatNumber(value, precision = 0) {
  if (!Number.isFinite(value)) return "";
  return precision > 0
    ? value.toFixed(precision)
    : Math.round(value).toLocaleString();
}
function formatChange(event) {
  if (!Number.isFinite(event?.before) || !Number.isFinite(event?.after)) return "";
  const before = formatNumber(event.before, event.precision);
  const after = formatNumber(event.after, event.precision);
  const unit = event.unit ? ` ${event.unit}` : "";
  return `${before} → ${after}${unit}`;
}

export function createJourneyPanelContent(scene, options = {}) {
  const {
    x,
    y,
    width,
    height,
    parent,
    journeySystem,
  } = options;
  const root = scene.add.container(0, 0);
  parent?.add(root);
  const model = journeySystem?.getViewModel?.() || {
    build: [],
    goals: [],
    history: [],
  };
  const layout = JOURNEY_CONFIG.layout;

  const addText = (tx, ty, text, style = {}, originX = 0, originY = 0) => {
    const object = scene.add.text(tx, ty, text, {
      fontFamily: style.fontFamily || UI_FONTS.body,
      fontSize: style.fontSize || "12px",
      fontStyle: style.fontStyle,
      color: style.color || UI_COLORS.body,
      align: style.align,
      wordWrap: style.wordWrap,
      lineSpacing: style.lineSpacing,
    }).setOrigin(originX, originY);
    root.add(object);
    return object;
  };

  const addCard = (cx, cy, cardWidth, cardHeight, selected = false) => {
    const card = scene.add.rectangle(
      cx + cardWidth / 2,
      cy + cardHeight / 2,
      cardWidth,
      cardHeight,
      UI_COLORS.bg,
      0.88,
    ).setStrokeStyle(
      selected ? 2 : 1,
      selected ? UI_COLORS.borderSel : UI_COLORS.borderDim,
      0.96,
    );
    root.add(card);
    return card;
  };

  const sectionLabel = (sx, sy, title, subtitle = "") => {
    addText(sx, sy, title, {
      fontFamily: UI_FONTS.display,
      fontSize: "14px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    });
    if (subtitle) {
      addText(sx + 132, sy + 1, subtitle, {
        fontFamily: UI_FONTS.mono,
        fontSize: "9px",
        color: UI_COLORS.dim,
      });
    }
  };

  sectionLabel(
    x,
    y,
    JOURNEY_CONFIG.copy.buildTitle,
    JOURNEY_CONFIG.copy.buildSubtitle,
  );
  const buildY = y + layout.sectionLabelHeight;
  const buildGap = layout.buildCardGap;
  const buildCount = Math.max(1, model.build.length);
  const buildWidth = (width - buildGap * (buildCount - 1)) / buildCount;
  model.build.forEach((card, index) => {
    const cardX = x + index * (buildWidth + buildGap);
    addCard(cardX, buildY, buildWidth, layout.buildCardHeight, index === 0);
    addText(cardX + 12, buildY + 12, card.label, {
      fontFamily: UI_FONTS.mono,
      fontSize: "9px",
      fontStyle: "bold",
      color: UI_COLORS.gold,
    });
    addText(cardX + 12, buildY + 34, card.value, {
      fontFamily: UI_FONTS.display,
      fontSize: "18px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    });
    addText(cardX + 12, buildY + 62, card.detail, {
      fontFamily: UI_FONTS.mono,
      fontSize: "9px",
      color: UI_COLORS.dim,
      wordWrap: { width: buildWidth - 24 },
    });
  });

  const columnsY = buildY + layout.buildCardHeight + layout.buildBottomGap;
  const columnsHeight = Math.max(120, height - (columnsY - y));
  const goalsWidth = Math.round(
    (width - layout.columnGap) * layout.goalsWidthRatio,
  );
  const historyX = x + goalsWidth + layout.columnGap;
  const historyWidth = width - goalsWidth - layout.columnGap;
  sectionLabel(x, columnsY, JOURNEY_CONFIG.copy.goalsTitle);
  sectionLabel(historyX, columnsY, JOURNEY_CONFIG.copy.historyTitle);
  const listY = columnsY + layout.sectionLabelHeight;

  if (!model.goals.length) {
    addCard(x, listY, goalsWidth, 70);
    addText(x + layout.cardInset, listY + 35, JOURNEY_CONFIG.copy.emptyGoals, {
      fontSize: "12px",
      color: UI_COLORS.dim,
      wordWrap: { width: goalsWidth - layout.cardInset * 2 },
    }, 0, 0.5);
  } else {
    const goalHeight = Math.max(
      72,
      Math.floor(
        (columnsHeight - layout.sectionLabelHeight
          - layout.goalCardGap * (model.goals.length - 1))
        / model.goals.length,
      ),
    );
    model.goals.forEach((item, index) => {
      const cardY = listY + index * (goalHeight + layout.goalCardGap);
      addCard(x, cardY, goalsWidth, goalHeight, index === 0);
      addText(x + layout.cardInset, cardY + 11, item.title, {
        fontFamily: UI_FONTS.display,
        fontSize: "14px",
        fontStyle: "bold",
        color: UI_COLORS.title,
        wordWrap: { width: goalsWidth - 104 },
      });
      addText(
        x + goalsWidth - layout.cardInset,
        cardY + 12,
        `${formatNumber(item.current)}${JOURNEY_CONFIG.copy.progressSeparator}${formatNumber(item.target)}`,
        {
          fontFamily: UI_FONTS.mono,
          fontSize: "10px",
          fontStyle: "bold",
          color: UI_COLORS.gold,
        },
        1,
        0,
      );
      addText(x + layout.cardInset, cardY + 35, item.detail, {
        fontSize: "10px",
        color: UI_COLORS.body,
        wordWrap: { width: goalsWidth - layout.cardInset * 2 },
      });
      addText(x + layout.cardInset, cardY + goalHeight - 17, item.connection, {
        fontFamily: UI_FONTS.mono,
        fontSize: "8px",
        color: UI_COLORS.dim,
        wordWrap: { width: goalsWidth - layout.cardInset * 2 },
      });
    });
  }

  if (!model.history.length) {
    addCard(historyX, listY, historyWidth, 70);
    addText(
      historyX + layout.cardInset,
      listY + 35,
      JOURNEY_CONFIG.copy.emptyHistory,
      {
        fontSize: "11px",
        color: UI_COLORS.dim,
        wordWrap: { width: historyWidth - layout.cardInset * 2 },
      },
      0,
      0.5,
    );
  } else {
    const historyHeight = Math.max(
      58,
      Math.floor(
        (columnsHeight - layout.sectionLabelHeight
          - layout.historyCardGap * (model.history.length - 1))
        / model.history.length,
      ),
    );
    model.history.forEach((event, index) => {
      const cardY = listY + index * (historyHeight + layout.historyCardGap);
      addCard(historyX, cardY, historyWidth, historyHeight);
      addText(historyX + layout.cardInset, cardY + 10, event.title, {
        fontFamily: UI_FONTS.display,
        fontSize: "12px",
        fontStyle: "bold",
        color: UI_COLORS.title,
        wordWrap: { width: historyWidth - layout.cardInset * 2 },
      });
      const change = formatChange(event);
      if (change) {
        addText(historyX + layout.cardInset, cardY + 31, change, {
          fontFamily: UI_FONTS.mono,
          fontSize: "10px",
          fontStyle: "bold",
          color: UI_COLORS.gold,
        });
      }
      addText(
        historyX + layout.cardInset,
        cardY + historyHeight - 15,
        event.detail,
        {
          fontSize: "8px",
          color: UI_COLORS.dim,
          wordWrap: { width: historyWidth - layout.cardInset * 2 },
        },
      );
    });
  }

  return {
    root,
    destroy: () => root.destroy(true),
  };
}
