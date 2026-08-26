# Agility movement-speed repair

Agility Training was mechanically connected to horizontal movement, but its
legacy first level changed walking speed from 200 to only 205 px/s. The 2.5%
difference was too small to read as a functioning upgrade during play.

The first five levels now add 20 px/s each. Later levels progress linearly from
the +100 px/s soft cap to a bounded +200 px/s bonus at level 99. The upgrade
definition remains the single source of truth for the curve.

`testing/2026-08-25-agility-movement-speed-contract.mjs` verifies the purchase,
resolved effective speed, and one-second horizontal displacement at level 0 and
level 1.
