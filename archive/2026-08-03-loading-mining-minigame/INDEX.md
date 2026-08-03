# Archived: 2026-08-03 loading mining minigame

**Archived on:** 2026-08-03  
**Reason:** The loading-board minigame and its authored two-column loader were retired at the user's request.  
**Replaced by:** The pre-minigame loader restored in `ui/components/LoadingScreenView.js` from commit `e09fcba`.  
**Last used in:** Scoped recovery checkpoint `1bbf068`.  
**Safety:** Keep indefinitely for rollback.

## Contents

- Dedicated loading-minigame state, views, FX, values, tests, harnesses, and QA captures.
- The four authored `sprites/UI/loading-screen-v1` presentation assets.
- Historical runtime and ImageGen-redesign documentation.

Shared gameplay assets were not archived. Pickaxe icons, resource tiles, the
Thunderstrike frame, combo frame, mining target, and earthquake FX remain in
their canonical active locations.

## Active replacement

BootScene and WorldLoadScene now use the regular pre-minigame
`createMenuLoadingScreen` implementation. The deferred ESC feature-loading
view remains active and owns its minimal shared art configuration independently
in `values/pauseFeatureLoading.js`.
