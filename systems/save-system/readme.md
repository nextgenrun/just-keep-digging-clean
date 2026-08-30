# Save System

`GameSaveCoordinator.js` is the single runtime write queue for a PlayScene. It
captures immutable snapshots, assigns monotonically increasing revisions, and
serializes `requestSnapshot`, `flush`, and `transaction` work so a late async
completion cannot overtake a newer revision. Visibility, page-hide, shutdown,
and destroy hooks all use the same queue.

`DugTilesSaveStore` owns the primary payload and storage transport. Payload v15
adds revision metadata plus authoritative Campfire, Milestone, and Star
collection state. Versions 1–14 remain readable. A v14 payload may read the old
progress sidecars once when its primary fields are absent, writes the merged
v15 payload, then treats the primary payload as authoritative. Legacy sidecar
keys are retained for rollback and are no longer written.

`BrowserStorageRepository.js` is the boundary for small settings/diagnostic
records. Gameplay systems must not write `localStorage` directly. Save-slot and
settings repositories remain the only approved storage writers.

`StarConsumptionAcknowledgementStore.js` uses that boundary for the per-slot,
one-time `DESTROY` tutorial acknowledgement. It records understanding only;
Star damage, rewards, and Starless Scars remain authoritative gameplay/save
state elsewhere.

`DugTilesSaveCodec.js` keeps payload normalization separate from transport, and
`SaveBackupManager.js` preserves the last committed primary snapshots for
recovery.
