# Complementary terrain edges V1

Five built-in ImageGen sources and packed transparent overlays: stone/soil rims, stone/soil corner caps and a crevice shadow. Exact prompts are in prompts.json; source bounds, sizes, alpha and runtime hashes are in manifest.json. Reproduce with ai-tools/2026-09-10-pack-complementary-edges.py.

These assets decorate exposed boundaries only. Core tiles, material fills, ore sprites and cave backgrounds are unchanged. The separate generated strata/rear-wall concepts are excluded and not shipped. Rims provide four frame variants; corners sit inside their supporting solid tile and shadows extend only a shallow distance into adjacent air.
