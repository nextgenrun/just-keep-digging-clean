# Piskel MCP Bridge

This bridge exposes the runtime-active Just Keep Digging player animations as editable Piskel projects.

## Commands

- `npm run asset:character:piskel:import` converts current Phaser runtime assets into `.piskel` files.
- `npm run asset:character:piskel:validate` checks editable `.piskel` files before export.
- `npm run asset:character:piskel:export` regenerates runtime sheets/images from `.piskel` files.
- `npm run asset:character:piskel:audit` checks frame counts, dimensions, clipping, corners, bottom alignment, and drift.
- `python tools/piskel-mcp/character_piskel_pipeline.py polish --ids <id>` applies the selected animation's manifest-owned body anchor, baseline, and one uniform scale, then rebuilds its runtime assets and before/after evidence.
- `align` remains a compatibility alias for `polish`; the animation list is no longer hard-coded in Python.
- `npm run workspace:piskel` opens the local review desk for cleaning animations.
- `npm run mcp:piskel` starts the stdio MCP server.

Use `-- --ids idle,walk` after an npm command to target specific animations.

Use per-animation `.piskel` files for editing. The all-animation review pack is only a contact/review convenience because Piskel flattens it into one timeline.

`centeringPolicy` is the normalization SSOT. Legacy purple-core characters can
keep `anchorMode: legacy-core`; photoreal Survival sheets use
`alpha-lower-body`, which ignores an extending arm when deciding whether the
body moved. Scale is computed once per animation from its declared reference
frames. Per-frame scaling is deliberately forbidden because it creates visible
size pulsing. The complete Piskel frame order remains the timing authority.

The production `survival-blender-v2-dig-up` entry imports the protected Blender
render, writes an editable Piskel source, locks the body to `(128, 248)`, and
exports a separate polished sheet. The raw Blender sheet is never overwritten.

On Windows, `open-piskel-workspace.bat` starts the same local review desk without requiring npm on PATH.

## MCP Config

Use an absolute path for your local checkout:

```json
{
  "mcpServers": {
    "jkd-piskel": {
      "command": "node",
      "args": [
        "C:/xampp/_Backups/dig-game-simple/dig-game-dev-env/tools/piskel-mcp/server.js"
      ],
      "cwd": "C:/xampp/_Backups/dig-game-simple/dig-game-dev-env"
    }
  }
}
```

If `node` is not on PATH for the MCP client, replace `command` with `C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`.

The server provides `list_character_animations`, `import_character_to_piskel`, `export_character_from_piskel`, `audit_character_centering`, `build_character_previews`, `validate_character_piskel_sources`, `polish_character_sources`, and the legacy `auto_align_character_sources` alias.
