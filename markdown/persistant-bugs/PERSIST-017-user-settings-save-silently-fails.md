# PERSIST-017: User-settings save reports success after storage failure

- Status: confirmed
- Severity: P1 for persistence reliability
- Category: silent persistence failure / misleading state
- Evidence: `systems/UserSettings.js:134-147` catches both localStorage read/write failures and returns no error or success result. `systems/UserSettings.js:311-313` calls `writeLocalStorage(...)` and then emits the settings update regardless of whether storage succeeded.
- Failure: in private, embedded, quota-exceeded, or blocked-storage contexts, a changed setting appears saved for the current in-memory session but disappears after reload, with no signal that persistence failed.
- Relationship: this is a concrete user-settings instance of the broader persistence-adapter sprawl recorded in PERSIST-006, but it has a distinct misleading-success contract.
- Permanent solution: centralize storage behind one adapter that returns `{ ok, reason }` or throws a typed persistence error; emit a saved state only after confirmation, otherwise mark the setting session-only and expose a non-blocking warning/diagnostic. Add reload persistence tests with storage get/set failures.
- Verification contract: every settings save reports persistence status, and a failed write cannot be presented as a durable save.
