# Screen recordings

In the development environment, `serve.py` writes F9 game-canvas recordings
here as timestamped `.webm` files. Production does not register the F9 action,
construct the recorder, or expose it in Settings.
When recording is idle, F9 asks for `SHORT` or `BROAD`:

- `SHORT` records a clean 720x1280 portrait crop with screen-space game UI hidden.
- `BROAD` enters game fullscreen first and records the complete wide canvas.

Press F9 again to stop. Short captures restore the exact HUD objects hidden by
the recorder. These are local capture outputs only; they are not runtime assets
or source files.
