# Scenic World Bake Pipeline

This directory is the offline bridge between high-detail source art and the 2D Phaser runtime. The runtime remains sprite based: it never loads a GLB, calls Meshy, or depends on Blender.

Use each source where it is strongest:

- Image generation: broad skies, distant mountains, forests, atmospheric plates, and other unique scenery.
- Meshy or authored 3D: reusable buildings, mine entrances, bridges, machinery, large roots, and other hero silhouettes that benefit from consistent camera angles.
- Blender: normalize each model to the game's **94 px per world unit** contract and bake deterministic 2D passes.
- Phaser: compose the baked sprites, generated backgrounds, particles, weather, light, and subtle motion while authoritative collision and digging stay data driven.

This pipeline intentionally does not replace the game renderer. It produces reviewable assets and metadata that a later runtime integration can consume.

## Security and spend controls

`meshy_ingest.py` reads `MESHY_API_KEY` from the process environment. Keep the key in an operating-system secret store or a temporary environment variable outside the repository. The script has no `--api-key` option and never writes authentication headers or the key to disk.

Creating a paid task requires all three:

1. A successful balance check for the request's calculated credit price.
2. A request-aware price calculation that is at or below `--max-credits`.
3. The explicit `--confirm-spend` flag.

Pricing is validated against the supported request combinations in the script
and the current [official API pricing table](https://docs.meshy.ai/en/api/pricing).
Unknown models or ambiguous combinations are rejected before any API call.

If an authenticated balance check finds too few credits, the pipeline writes `community-review-request.json`. A missing credential cannot perform that check; run the explicit `community-review` command instead. The result is a human review queue entry, not an automatic community-asset download. Licensing, quality, provenance, and suitability must be checked before any community model enters the project.

## Meshy workflow

Check the account without creating a task:

```powershell
python pipelines/scenic-world/meshy_ingest.py balance --minimum-required 20 --fallback-dir C:\tmp\dig-game-meshy-pilot\scenic-review --category medieval-mine-building
```

Prepare a request JSON outside source control. For a text-to-3D request it can contain the current Meshy request fields, for example:

```json
{
  "mode": "preview",
  "prompt": "compact medieval timber mine workshop, strong side silhouette, no terrain base"
}
```

Submit only after reviewing the request and expected credit cost:

```powershell
python pipelines/scenic-world/meshy_ingest.py submit --kind text-to-3d --request-file C:\tmp\dig-game-meshy-pilot\workshop-request.json --output-dir C:\tmp\dig-game-meshy-pilot\workshop-task --max-credits 20 --confirm-spend
```

Retrieve and hash a completed task. Set `--license-id` to the license that applies to this specific output; do not infer it from the account tier:

```powershell
python pipelines/scenic-world/meshy_ingest.py retrieve --kind text-to-3d --task-id TASK_ID --output-dir C:\tmp\dig-game-meshy-pilot\workshop-source --wait --license-id LICENSE_ID --license-reviewed
```

To create a manual community-search request directly:

```powershell
python pipelines/scenic-world/meshy_ingest.py community-review --output-dir C:\tmp\dig-game-meshy-pilot\scenic-review --category medieval-mine-building --reason "Meshy credential or balance unavailable"
```

`provenance.json` records task identity, retrieval time, declared license, credit usage, and SHA-256 hashes. Signed download URLs are deliberately omitted because they expire and can expose temporary access tokens.

Use `--license-reviewed` only after a human has verified the exact license and
source. Merely supplying a license string records it as declared, not reviewed.

## Blender bake workflow

Create an asset manifest alongside the downloaded model:

```json
{
  "assetId": "town-workshop-a",
  "heightTiles": 3.25,
  "frontAxis": "-Y",
  "licenseId": "REVIEWED-LICENSE-ID",
  "provenancePath": "provenance.json",
  "sourceTaskId": "TASK_ID"
}
```

Exactly one authored scale target is required: `heightTiles` or `widthTiles`. The model is uniformly scaled, bottom-centered at world Z=0, and rendered with the shared orthographic profile.

Run Blender in the background:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --python pipelines/scenic-world/blender_bake.py -- --source-glb C:\tmp\dig-game-meshy-pilot\workshop-source\source.glb --asset-manifest C:\tmp\dig-game-meshy-pilot\workshop-source\asset-manifest.json --output-dir C:\tmp\dig-game-meshy-pilot\workshop-bake --profile pipelines/scenic-world/bake_profile.json
```

The bake emits stable PNG pass names and `bake-manifest.json`. Keep the source model, provenance record, authored scale manifest, bake profile, and final hashes together through review and promotion.

The bake may still run for visual review when provenance is missing or a neutral
pass was required, but `promotion.ready` is then false and the exact blockers
are listed. A GLB hash match, reviewed license, and source-task identity are
required for a promotion-ready Meshy bake.

## Output passes

- `beauty`: lit transparent sprite for normal runtime use.
- `albedo`: unlit base color for relighting or diagnostics.
- `normal`: encoded normal map for 2D light experiments.
- `depth`: normalized depth plate for fog and layered motion.
- `ao`: ambient-occlusion plate.
- `emissive`: windows, lamps, crystals, and other self-lit detail.

Normal, depth, and AO are written through Blender's `Non-Color` transform;
beauty and color passes retain the profile's authored AgX display transform.

If Eevee omits an entirely empty AO or emissive result, the bake writes a
deterministic neutral PNG and lists that pass in `fallbackPasses`; it never
silently leaves a required runtime file missing.

The profile bakes at 2x the 1280 x 720 reference viewport, then downstream tooling may downsample. At the reference scale, one world unit remains exactly 94 pixels.
