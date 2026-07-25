# Open-source video editor MCP setup — 2026-07-20

Installed the MIT-licensed `video-audio-mcp` server from
https://github.com/misbahsy/video-audio-mcp and synced its isolated `uv` environment under
`tools/video-audio-mcp/.venv`. FFmpeg 8.1.2 is installed and available on PATH.

Run the server from this workspace with:

```powershell
Set-Location tools/video-audio-mcp
uv run server.py
```

The server exposes trimming, aspect-ratio conversion, burned subtitles, text/image overlays,
B-roll, and transitions. The dated batch script `tools/2026-07-20-build-video-content.py`
uses FFmpeg with the same rendering toolchain to produce the current post-ready exports.
