# PERSIST-013: Revision query suffixes split active ES-module identities

- Status: confirmed
- Severity: P2
- Category: duplicate module evaluation / inconsistent imports
- Evidence: `player/PlayerController.js` is imported as `../../player/PlayerController.js?rev=20260718-mesh-grounded` by `world/playScene/PlaySceneSetup.js:40` and as `../../player/PlayerController.js` by `world/playScene/CaveGameplayController.js:8`. `values/playerAssetProfiles.js` is imported with and without the same revision suffix by active consumers, and `values/playerCharacters.js` is imported with `?rev=20260718` by `StartMenuScene`, `WorldLoadScene`, and `PlaySceneSetup` while the profile modules import it without a suffix.
- Failure: browser module identity includes the URL, so query-suffixed and unsuffixed paths evaluate as separate modules. This duplicates frozen catalogs, functions, and the `PlayerController` class; class/reference identity checks and singleton state can diverge even though the source filename is the same.
- Why it persists: cache busting was applied selectively to internal imports instead of at the entry/build boundary. The active graph currently uses multiple revision dates and both canonical and query-suffixed forms.
- Permanent solution: use one canonical specifier per source module. Remove revision suffixes from internal imports and version the entry asset/build output, or apply one build-generated URL policy consistently to every edge. Add an import-normalization check that groups paths after removing `?` and rejects mixed URL forms.
- Verification contract: every active source file must resolve to one browser module URL; no normalized module target may have both query-busted and unbusted import forms.
