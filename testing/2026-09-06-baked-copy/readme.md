# Baked UI review

The Echo Lance timer fix is recorded in
`../../markdown/2026-09-07-echo-lance-buff-ui.md`. `Hardcore: calm` uses the normal
Hardcore artwork loader and fills GP before enabling the save-blocked fixture;
`Hardcore: restore` restores the preceding mode. The `buffs` diagnostics expose
chip/text bounds, tooltip bounds, passive/timed identity and Hardcore geometry.

The focused Talents redesign starts with three tree cards and opens only the
selected twelve-node branch. Its stationary dossier uses baked descriptions,
rank plates and complete action buttons. `focused-talents-audit.md` records
the final browser checks, artwork provenance and remaining evidence limits;
`focused-talents-runtime.json` and `focused-talents-tests.txt` retain the data.
Run `node testing/2026-08-03-celestial-talent-tree-ui-contract.mjs` for the shared
focused view and real progression-owner contract, including purchase guards,
keyboard navigation, compact fitting, reduced motion and feedback cleanup.

`Capture next talent burst` arms a fifteen-second native-canvas capture. Make a
successful unlock or upgrade to capture its actual flash and result plaque.
`Live game` returns keyboard focus. `Hide review controls` clears the toolbar
for alignment screenshots; the small `Show review controls` button restores it.
These controls are review-only and do not appear in the production game.

The Stars and Talents pass adds `Star Codex: all rarities` (250 identities and a large repeat count), `Talents: ready`, `Talents: mastered`, and `Talents: restore`. These fixtures require the save-write block. The art and rendering contracts cover original PNG provenance, current ability copy, 36 talent faces, 250 star mappings, proportional fitting, fixed-position star motion and listener cleanup. `celestial-quality-audit.md` records the final browser evidence.

Serve this checkout with the canonical `serve.py`, then open `game.html?jkd_e2e=1&gameplayProfile=full-review&cinematics=0&systemPacing=0`. Enter through the normal game menu. Review controls remain disabled until the existing E2E save-write block is active. Star collection fixtures and progression visibility affect only that blocked session.

Use Star Codex: empty or collected to exercise the real I inventory. The collected fixture records 14 Common identities and a repeat of the first, exercising pagination and repeat counts. Talents opens the real Esc tree. Other buttons open existing pause, Settings, campfire and merchant actions. Inspect native canvas captures the actual full-resolution Phaser output; Live game removes that preview and restores keyboard focus.

Open `aspect-review.html` for a focused preview using the production shared buttons and modal shell, plus the Wiki, Menu and Map plaques. Its diagnostics count unequal image scales and button clicks. The game review diagnostics also expose image scales; startup failures appear above the toolbar.

Run `node testing/2026-09-06-baked-copy/asset-contract.mjs` for source provenance, texture bounds, catalog mappings, dynamic-text fallback, rebind sizing and proportional fitting across wide, compact and tall bounds. `validation.md` records the focused contract and browser results. Baseline copies retain the pre-edit contents of touched files; they are not imported or served by the production game.

The extended quality controls include large currency totals, XP empty/half/full, the level-up reward banner, and World Map. They only affect the save-blocked review session. Normal HUD values restores the original providers and pickaxe view. `quality-review.html` displays all active pack artwork against a contrasting background. `quality-audit.md` records the final scope, measured source limits, runtime evidence, and validation results.
