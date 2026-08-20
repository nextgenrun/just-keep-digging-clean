# Ability-role decision packet — 2026-08-21

This packet implements the measurement boundary in Phase 4.3 without deleting
an ability from one anecdotal report. The current recommendation is to keep the
five live roles while collecting runtime use, cost, direction, hit, target, and
damage evidence. A later owner decision can merge or remove a role only if the
frozen comparison shows material overlap.

| Ability | Current decision | Distinct verb | Tactical problem | Primary metric |
|---|---|---|---|---|
| Flight | Keep | Recover route | Escape a local shaft and preserve a return line | Recovery distance per GP |
| Quickslash | Keep behind Bobo unlock | Horizontal burst | Break/cross a side obstruction without stopping momentum | Horizontal value and hits per GP |
| Thunder Strike | Keep as chain commitment | Vertical chain | Open a deep vertical lane through multiple targets | Vertical damage and tiles per paid first slam |
| Heavy Punch | Keep as passive specialist | Pierce behind target | Reach a second protected tile through the selected target | Useful second-tile contacts per trigger |
| Debris Shield | Keep as hazard defense | Hold to protect | Trade GP for safety during a truthful debris telegraph | Prevented damage per GP |

Implementation authority is `values/abilityRoles.js`. `PlayerAbilities` now
keeps a bounded local event stream for Flight, Quickslash, and Thunder Strike;
existing mining and hazard result authorities retain hit/damage ownership.
This is a decision-ready packet, not approval to delete or merge an ability.

