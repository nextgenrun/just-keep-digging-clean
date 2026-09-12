# Screen recordings

In the development environment, `serve.py` writes F9 game-canvas recordings
here as timestamped `.webm` files. Production also supports F9 and downloads WebM recordings to the player's browser; it does not upload recordings to this directory.
When recording is idle, F9 asks for `SHORT` or `BROAD`:

- `SHORT` records a clean 720x1280 portrait crop with screen-space game UI hidden.
- `BROAD` enters game fullscreen first and records the clean wide canvas without game UI.

Press F9 again to stop. Both formats restore the exact HUD objects hidden by
the recorder. These are local capture outputs only; they are not runtime assets
or source files.

2026-09-10: Capture uses reusable WebGL framebuffer readback; both formats exclude game UI. Unsupported embedded-browser prompts fall back to SHORT. Reload the local game after code updates.
