import { UI_COLORS } from "../../values/uiColors.js";
import { MILESTONE_PILLAR_UI } from "../../values/milestonePillarUi.js";
import { renderMilestonePillarJournal } from "./MilestonePillarJournalView.js";
import { renderMilestonePillarMilestones } from "./MilestonePillarMilestonesView.js";

export function openMilestonePillarModal(system) {
  const scene = system.scene;
  const cfg = MILESTONE_PILLAR_UI.modal;
  const shell = system.ui.createModalShell(scene, {
    title: cfg.title,
    subtitle: cfg.subtitle,
    icon: "journal",
    maxWidth: cfg.maxWidth,
    maxHeight: cfg.maxHeight,
    depth: cfg.depth,
    onClose: () => system._closeBoardView(),
  });
  const content = shell.content;
  const rect = shell.getContentRect();
  const view = scene.add.container(0, 0);
  content.add(view);
  const viewRect = {
    left: rect.left,
    top: rect.top + cfg.viewTopOffset,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height - cfg.viewTopOffset,
  };
  let activeTab = "milestones";
  let milestonePage = 0;

  const render = tab => {
    activeTab = tab;
    view.removeAll(true);
    if (tab === "journal") {
      renderMilestonePillarJournal(system, view, viewRect);
    } else {
      const result = renderMilestonePillarMilestones(
        system,
        view,
        viewRect,
        milestonePage,
        page => {
          milestonePage = page;
          render("milestones");
        },
      );
      milestonePage = result.page;
    }
    milestoneButton?.setSelected?.(activeTab === "milestones");
    journalButton?.setSelected?.(activeTab === "journal");
  };

  const tabWidth = (rect.width - cfg.tabGap) / 2;
  const tabY = rect.top + cfg.tabTopInset;
  const milestoneButton = system.ui.createButton(scene, {
    x: rect.left + tabWidth / 2,
    y: tabY,
    width: tabWidth,
    height: cfg.tabHeight,
    label: "DEPTH MILESTONES",
    icon: "journal",
    accent: UI_COLORS.borderSel,
    parent: content,
    onClick: () => render("milestones"),
  });
  const journalButton = system.ui.createButton(scene, {
    x: rect.right - tabWidth / 2,
    y: tabY,
    width: tabWidth,
    height: cfg.tabHeight,
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
