# Event-driven Grok voice demo V1 - rejected

This folder preserves the rejected one-line pilot for provenance only. It is
too simple and short and must not be promoted into the active V2 catalog.

The original folder was a small review/demo library for sparse gameplay-event speech.
The initial sample is generated with `x-ai/grok-voice-tts-1.0` and the `rex`
voice through OpenRouter.

The runtime feature is query-gated with `?eventVoices=1`. It never contains an
API key and does not call OpenRouter from the browser. Use
`ai-tools/2026-08-30-launch-event-voice-sample.ps1` to regenerate the one-sample
batch through a masked, process-local credential prompt.
