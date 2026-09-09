// The public talent UI contract now exercises the focused tree implementation.
import "./2026-09-06-baked-copy/focused-talents-contract.mjs";
import assert from "node:assert/strict";
import { describeCelestialTalentAvailability } from "../values/celestialTalentTreeUi.js";

assert.match(describeCelestialTalentAvailability({ reason:"level-locked", requiredLevel:4 }), /4/);
assert.match(describeCelestialTalentAvailability({ reason:"insufficient-stars", starsCost:75, starsBalance:12 }), /75 Star Points/);
assert.match(describeCelestialTalentAvailability({ reason:"root-choice-locked" }), /top node/);
