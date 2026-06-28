# Utils

Utility functions and helper classes.

## Responsibility
Generic utility code that does not fit in any specific system. Shared math, random number generation, string formatting, etc.

## Contents
Currently empty — the previous `SeededRandom.js` was a duplicate of `world/model/SeededRandom.js` and has been archived to `/archive/2026-06-26-seeded-random-duplicate/`.

## Rules
- Utilities are stateless and import from `values/` only
- No game-specific logic — those go in `systems/`
- Import from anywhere in the project