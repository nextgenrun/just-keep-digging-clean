# Shop UI Uptime Worker

## Incident and fix

The Town Square Milestone Pillar and Bobo interaction ranges overlap. Phaser's
`JustDown` helper consumes the key edge. The pillar previously called
`JustDown(E)` even when nearest-target arbitration had selected Bobo, then
discarded the result because `allowOpen` was false. Bobo therefore never saw
the same press.

`MilestoneBoardSystem` now checks interaction ownership before reading the key.
`2026-07-26-shop-ui-uptime-contract.mjs` reproduces the overlap with a
consumptive key double and proves that Bobo opens `boboMerchant`.

## Runtime protection

The PlayScene canary now requires both `npcManager` and `shopOverlay`.
`NPCManager.getInteractionHealthSnapshot()` also reports whether Bobo's
definition, visual, prompt, interact key, and callable shop entrypoint are all
present after scene setup. A missing part becomes a critical
`shop-ui-interaction-invariant` finding in the admin health report.

## Git worker and rollback

`Shop UI Uptime Guard` runs on every `main` push and manual dispatch:

1. Run the Bobo/shop, Town Square, and release-safety contracts.
2. Build the isolated static production package.
3. Serve it locally and probe its build identity, HTTP behavior, runtime
   canary, Bobo manager, interaction arbitration, and real Shop overlay module.
4. If a pushed tip fails, fetch `main` and refuse rollback if a newer push
   already exists.
5. Revert only the failing tip commit, push the rollback commit, and open or
   update the shop incident.

The rollback push runs the worker again, proving that the restored source is
healthy. Manual runs are read-only and never auto-revert.

## Live-host boundary

This checkout has no production URL, deployment environment, hosting adapter,
or deployment secret. Its verified package is about 2.36 GB, which exceeds
GitHub Pages' 1 GB published-site limit. The worker therefore protects and
rolls back the source that a real deployment must consume; it does not pretend
to publish an invalid Pages site.

To extend protection to live runtime/CDN failures, configure the actual host
and an authenticated rollback operation, then set a production canary URL and
connect runtime critical reports to a same-origin ingestion endpoint.
