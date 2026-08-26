# Shop Click Selection Pin

## Problem

Shop list hover immediately replaced the selected resource, schematic, or
gear/upgrade row. Moving the pointer toward the detail actions could therefore
switch the intended item before the player acted.

## Behavior

- Hover previews rows while no mouse selection is pinned.
- Clicking a row selects and pins it.
- Hovering another row cannot replace a pinned selection.
- Clicking another row moves the pin there.
- Clicking the pinned row again releases it and restores hover preview.
- Keyboard, page, and merchant-tab navigation release the mouse pin and keep
  their existing selection authority.

The list header shows `HOVER PREVIEW` or `PINNED`, and the existing bottom hint
explains the click toggle without adding replacement UI art.

## Validation

Run `testing/2026-07-26-shop-ui-uptime-contract.mjs`, then verify a resource
seller and Gear Forge with real pointer movement at desktop and compact game
viewports.

## Rollback

Revert the shop selection state and handlers in `ui/overlays/ShopOverlay.js`,
the labels in `values/uiLayout.js`, and the focused contract additions.
