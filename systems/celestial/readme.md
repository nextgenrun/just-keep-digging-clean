# Celestial Engines

The Star Heart systems own permanent attunement, finite sky-star charge, and
per-activation budgets. Engine effects receive world and reward callbacks; they
never mutate `WorldModel` directly.

All balance, copy, visual sizing, and safety caps live in
`values/celestialEngines.js`. Every activation is bounded by time and impact
counts, only one Engine may exist at once, and protected tiles remain
authoritative in `WorldModel.isDiggable()`.

God Mode is supplied by the authoritative `UpgradeSystem` provider. It exposes
all three Engines for free runtime switching and zero-charge activation without
mutating permanent Star Heart save data. Per-cast time, impact, bounce,
redirect, protected-tile, and single-active-Engine caps still apply.
