# Phase handoff review v1

Review-only comparison of current frame-zero animation switching against a
phase-aware moving-dig handoff and a two-frame planted reversal. It uses the
real Survival Jog, promoted moving-side-dig sheet, Game Rig v2 foot markers,
and central moving-dig compositor.

Production selectors, animation routing, input, collision, mining timing, and
runtime assets are deliberately unchanged. The proposed moving-dig frames keep
the existing 14-frame action and contact index; the first two frames only blend
the upper body while the lower body continues the measured Jog phase.

Run `build_mockups.py`, then serve the repository and open `index.html`.
