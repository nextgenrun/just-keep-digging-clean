# Ui

ui directory.

## Unified modal shell

UiModalShell.js is the required screen-space foundation for full menus and dialogs. It owns responsive viewport fitting, backdrop and input isolation, title and icon chrome, consistent spacing, and enter and exit presentation. Shop, Level Up, Campfire, Milestones, Star Pillar, and PlayScene overlays use this visual language.

## Admin health panel

`admin/AdminHealthPanel.js` is an opt-in, DOM-only view of the runtime canary.
Open the game with `?adminHealth=1`; developers can also toggle it with
Ctrl+Shift+F12. It observes the health system and never mutates gameplay state.
