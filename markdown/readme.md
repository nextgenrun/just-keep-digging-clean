# Dig Game knowledge center

Last organized: 2026-08-10

This directory contains product design, architecture policy, implementation
records, validation notes, feedback, and operational guidance. It is not one
flat roadmap.

## Start here

1. `../.clinerules` — mandatory repository and visual-production rules.
2. `design-documents/readme.md` — canonical product source of truth.
3. `design-documents/2026-08-10-game-vision.md` — final-game promise.
4. `design-documents/2026-08-10-runtime-alignment-register.md` — what is
   actually shipped, partial, gated, or still a target.
5. `../readme.md` — runtime architecture, scene flow, and how to run.

## Document classes

| Class | Location | Authority |
|---|---|---|
| Canonical product design | `design-documents/` | Intended final player experience and current alignment |
| Architecture/policy | policy files in this directory | Mandatory code/document organization rules |
| Subsystem ownership | nearest directory `readme.md` outside `/markdown/` | Technical boundaries and active implementation ownership |
| Dated implementation record | `YYYY-MM-DD-*.md` in this directory | Historical evidence; not product direction unless linked from canonical design |
| Feedback and diagnosis | `feedback/` | Evidence and recommendations; not approved implementation by itself |
| Debugging/validation | `debugging/`, `testing/`, related dated notes | Reproduction and proof |
| Archived material | `../archive/` | Non-authoritative provenance |

## Canonical design set

- `design-documents/2026-08-10-game-vision.md`
- `design-documents/2026-08-10-player-journey.md`
- `design-documents/2026-08-10-gameplay-systems.md`
- `design-documents/2026-08-10-world-and-content.md`
- `design-documents/2026-08-10-controls-and-interface.md`
- `design-documents/2026-08-10-progression-economy-and-saves.md`
- `design-documents/2026-08-10-runtime-alignment-register.md`

Read the design index before using any older roadmap or feature note. The June
foundation roadmaps and original raw design drafts were superseded and moved to
`../archive/2026-08-10-superseded-design-document-drafts/`.

## Mandatory policies

| Document | Purpose |
|---|---|
| `naming-policy.md` | Directory, file, symbol, and dated-document naming |
| `organisation-policy.md` | Layer responsibilities and import direction |
| `seperation-policy.md` | One responsibility per file and split rules |
| `single-source-of-truth-policy.md` | Runtime values/config ownership |
| `duplication-prevention-policy.md` | Avoid duplicate code and configuration |
| `archive-policy.md` | Archive location, INDEX requirements, safe deletion rules |
| `version-control/version-control.md` | Local, backup, and Git workflow |
| `pathing/readme.md` | Import/path resolution |
| `tools/readme.md` | Development-tool inventory |

## Status language

Product claims use the status vocabulary defined in
`design-documents/readme.md`: SHIPPED, PARTIAL, GATED, TARGET, DECISION, and
RETIRED. A dated document saying “done” does not override a PARTIAL/GATED row in
the runtime alignment register.

## Adding or changing documentation

- Update an existing canonical owner instead of creating a competing roadmap.
- Date new standalone Markdown files `YYYY-MM-DD-topic.md`.
- Keep exact numbers in `/values/`; documents explain why they exist and link
  the owner.
- If player behavior changes, update the owning design doc and alignment row in
  the same change.
- Put superseded material under the root `/archive/YYYY-MM-DD-description/` and
  update both that directory’s `INDEX.md` and `archive/INDEX.md`.
- Do not move active code or required assets merely to make documentation look
  tidy.

## Current release note

The active runtime uses `demoMode: true`, so Level Two, Arc Core, developer
cheats, and screen capture are gated. Older full-world implementation notes may
describe those modules, but the alignment register is the current reachability
truth.
