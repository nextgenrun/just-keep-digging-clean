# Arc Core Review v2 ImageGen Prompt Manifest

Date: 2026-07-26

Generator: built-in OpenAI ImageGen

Status: `REVIEW ONLY`

Runtime policy: the generated bodies and effects are normalized into fixed 512 x
512 transparent canvases. Animation moves independent layers around one fixed
master body; it never crossfades differently drawn body frames.

## Small Arc master

Source: `source/2026-07-26-small-arc-master-v3-chroma.png`

Prompt:

> Create one premium 2D game sprite of a Small Arc mining core, strict side
> view facing right. The complete silhouette must be unmistakably round and
> compact, built around a circular dark gunmetal reactor shell with restrained
> aged-gold mechanisms and a brilliant cyan central lens. Keep the circular
> body mechanically coherent and world-aligned; do not add triangular wings,
> long fins, a pointed fuselage, or multiple animation poses. Include only a
> short centered drilling emitter on the right. High-end hand-painted
> diesel-gothic fantasy machinery, crisp readable materials, controlled cyan
> bloom, clean black outline, no cast shadow, no text, no border. Center the
> entire isolated sprite on a pure chroma-green background with generous empty
> margin.

## Omega Arc master

Source: `source/2026-07-26-omega-arc-master-v2-chroma.png`

Prompt:

> Create one premium 2D game sprite of an Omega Arc excavation core, strict
> side view facing right. Design a colossal symmetric four-bastion
> cathedral-reactor: a perfectly centered circular cyan energy heart inside a
> massive dark gunmetal and antique-gold ring, with four broad gothic armored
> pylons arranged evenly around it. It must read as an ancient mobile fortress,
> not as a scaled-up Small Arc and not as a spaceship with a long nose. Add a
> compact central right-facing excavation aperture suitable for an eight-lane
> energy array. High-end hand-painted dark-fantasy industrial game art, crisp
> bevels, subtle wear, restrained violet and cyan energy, clean silhouette, no
> motion, no cast shadow, no text, no border. Center one complete isolated
> sprite on a pure chroma-green background with generous empty margin.

## Layered VFX atlas

Source: `source/2026-07-26-arc-vfx-atlas-v2-chroma.png`

Prompt:

> Create a clean 2 x 2 atlas of four isolated premium 2D game effects on a
> pure chroma-green background. Top-left: compact turbulent cyan ion cloud with
> a bright white-cyan center and soft vapor edge. Top-right: thin circular
> cyan-and-antique-gold gyro energy ring, empty transparent center. Bottom-left:
> large turbulent violet wormhole cloud with restrained magenta highlights and
> a bright core. Bottom-right: ornate circular violet-and-gold cathedral
> lattice sigil, empty transparent center. Keep every effect fully inside its
> quadrant with wide separation, consistent top-down/side-game readability,
> no machinery, no text, no border, and no cast shadows.

## Processing

- Chroma removal: the repository's approved chroma-key helper.
- Package build: `tools/build_arc_core_sprite_package.py`.
- Runtime outputs: `runtime/*.png`.
- Provenance and integrity were formerly stored in the superseded v2
  manifest. The approved successor is `values/arcCoreVisuals.sprite.json`.
