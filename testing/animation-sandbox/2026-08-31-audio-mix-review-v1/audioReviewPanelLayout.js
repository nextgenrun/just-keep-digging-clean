export function buildAudioReviewPanelLayout(view, colors) {
  const x = view.config.layout.worldPaneWidth;
  view.container = view.scene.add.container(0, 0).setDepth(5000);
  const panel = view.scene.add.rectangle(x, 10, 352, 700, colors.panel, 0.97)
    .setOrigin(0, 0).setStrokeStyle(2, colors.border, 1);
  view.container.add(panel);
  view._text(x + 18, 22, view.flow.copy.title, 20, colors.text, "bold");
  view._text(x + 18, 49, view.flow.copy.boundary, 10, colors.pass, "bold");

  view._section(x + 18, 72, "1 · CHOOSE A CATEGORY");
  view.flow.categories.forEach((category, index) => {
    const column = index % view.flow.categoryColumns;
    const row = Math.floor(index / view.flow.categoryColumns);
    view._button(
      `category:${category.id}`,
      x + 18 + column * 81,
      92 + row * 31,
      73,
      27,
      category.label,
      () => view.callbacks.onCategory(category.id),
      "category",
    );
  });

  view._section(x + 18, 157, "2 · NOW PLAYING");
  const nowCard = view.scene.add.rectangle(x + 18, 175, 316, 58, colors.card, 0.98)
    .setOrigin(0, 0).setStrokeStyle(1, colors.border, 0.8);
  view.container.add(nowCard);
  view.currentTitleText = view._text(x + 28, 180, "", 15, colors.text, "bold", 296);
  view.currentMetaText = view._text(x + 28, 202, "", 9, colors.muted, "bold", 296);
  view.playStateText = view._text(x + 28, 218, "", 10, colors.pass, "bold", 296);

  view._button("previous", x + 18, 240, 78, 29, "← PREV", view.callbacks.onPrevious, "nav");
  view._button("replay", x + 104, 240, 144, 29, "▶ PLAY AGAIN", view.callbacks.onReplay, "nav");
  view._button("next", x + 256, 240, 78, 29, "NEXT →", view.callbacks.onNext, "nav");

  view._section(x + 18, 279, "3 · CHOOSE A NAMED ITEM");
  for (const category of view.flow.categories) {
    category.itemIds.forEach((id, index) => {
      const scenario = view.config.scenarios[id];
      const slot = index % view.flow.itemPageSize;
      view._button(
        id,
        x + 18 + (slot % 2) * 162,
        299 + Math.floor(slot / 2) * 36,
        154,
        30,
        `○ ${scenario.shortLabel || scenario.label}`,
        () => view.callbacks.onScenario(id),
        "scenario",
      );
    });
  }
  view._button("page:previous", x + 18, 407, 62, 25, "← PAGE", () => (
    view._stepItemPage(-1)
  ), "page");
  view.itemPageText = view._text(x + 88, 414, "", 10, colors.muted, "bold", 176);
  view.itemPageText.setAlign("center");
  view._button("page:next", x + 272, 407, 62, 25, "PAGE →", () => (
    view._stepItemPage(1)
  ), "page");

  view._section(x + 18, 440, "4 · DECIDE ON THE CURRENT ITEM");
  view._button("decision:approved", x + 18, 459, 122, 33, "✓ APPROVE", () => (
    view.callbacks.onDecision(view.flow.decisions.approved)
  ), "decision");
  view._button("decision:rejected", x + 148, 459, 122, 33, "× REJECT", () => (
    view.callbacks.onDecision(view.flow.decisions.rejected)
  ), "decision");
  view._button(
    "decision:clear", x + 278, 459, 56, 33, "CLEAR",
    view.callbacks.onClear, "decision",
  );
  view.decisionStatusText = view._text(x + 18, 497, "", 11, colors.muted, "bold");
  view._text(x + 18, 510, view.flow.copy.decisionBoundary, 9, colors.muted);

  view._section(x + 18, 527, "AUDIBLE NOW / LAST HIT");
  view.activeText = view._text(x + 18, 546, "", 10, colors.text, "normal", 316, 2);

  view._section(x + 18, 598, "REVIEW SESSION");
  view.sessionText = view._text(x + 18, 617, "", 9, colors.pass, "bold", 316, 2);
  view._button(
    "export", x + 18, 661, 316, 25, "EXPORT DECISIONS JSON",
    view.callbacks.onExport, "export",
  );
  view._text(x + 18, 690, view.flow.copy.controls, 9, colors.muted, "normal", 316, 1);
}
