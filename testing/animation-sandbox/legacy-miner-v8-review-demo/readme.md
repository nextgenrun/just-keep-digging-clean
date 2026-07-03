# Legacy Miner V8 Review Demo

Phaser-based runtime preview for the legacy miner v8 animation cleanup pass.

The demo can compare current runtime sheets with review-only candidate sheets from:

```text
markdown/audit/animation-audit/2026-07-03-legacy-miner-demo-review
```

Run from the repo root with:

```bash
python serve.py 8080
```

Open:

```text
http://127.0.0.1:8080/testing/animation-sandbox/legacy-miner-v8-review-demo/index.html
```

The demo defaults to a black background. Use the checker toggle only when auditing alpha holes.

No files from the audit folder are wired into gameplay until the candidate visuals are approved.
