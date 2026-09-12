# Live F9 screen recording hotpatch — 2026-09-10

Deployed over saved cline-local SSH to /home/customer/www/nextgen.run/public_html/diggame-beta-1 on base build 6793e7c5ce64. Eight runtime files plus gzip copies; exact precondition hashes checked, index promoted last, resulting hashes recorded in testing/2026-09-10-live-f9/deployed.json. The inline import map assigns fresh F9 module URLs without republishing unrelated modules.

Production admits screenCapture and registers F9 without enabling debug mode, God Mode, Level Two, Arc Core, or Heavenblocks. The key-down listener survives short taps and uses the current configurable binding. The existing SHORT/BROAD chooser and capture formats remain. Production output is a browser WebM download, while development retains /screenrecord upload.

Validation: production F9 contract, screen-record contract, capture modes, gameplay capability contract and 33 traversal regressions pass. The local production-mode real-Phaser browser fixture started/stopped with real F9 and generated a 1,902,454-byte WebM for browser download. The embedded browser does not support prompt(), so the fixture supplied SHORT; Firefox's native chooser and download were not tested directly. Public browser startup reached the main menu; Controls visibly showed SCREEN RECORDING / F9. Public HTML contains all fresh import-map entries. SSH hashes passed; separate scripted public HTTP requests received host HTTP 403, so no scripted HTTP hash claim is made.

Previous local Firefox fullscreen/Ctrl changes were not included in this F9 release. The production candidate was patched from current live sources, preserving its existing bootstrap and unrelated changes.
