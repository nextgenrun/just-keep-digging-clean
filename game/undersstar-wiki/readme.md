# UNDERSTAR Wiki

Player-facing, searchable documentation for the current public beta and clearly labelled development systems.

The page leads with the verified Steam App 4982520 wishlist route, keeps the playable browser beta second, and treats one-time donations as optional tertiary support. Steam links use source/content-specific UTM parameters so Steamworks can attribute wiki visits and wishlist conversions.

## Local preview

Serve the repository root over HTTP, then open `/game/undersstar-wiki/`. Do not open `index.html` directly because browser security and URL behavior differ from production.

## Deployment boundary

Deploy this directory as one unit to `/game/undersstar-wiki/`. The route spelling is intentional and matches the requested public URL. The donation form creates a one-time Stripe Checkout session through the existing same-origin Nextgen endpoint; it does not collect card data on this page.

The deployment includes `/game/undersstar-wiki/sitemap.xml`; add that sitemap to the site's root sitemap index. Keep the page's sitemap `<link>`, canonical URL, explicit image dimensions, crawler directives and JSON-LD aligned with that live route.
