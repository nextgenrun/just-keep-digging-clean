# Side dig transition polish review v1

Review-only Piskel candidate for the remaining sideways-dig skating. Nothing in
this folder is imported by gameplay, and the builder does not replace runtime
atlases, manifests, profiles, selectors, collision, or transition code.

The synchronized comparisons cover:

- standing Jab/Cross chains with a fixed lower body and one stable 21 px collision hold;
- collision-blocked running digs with the complete 28-frame authored Jog cycle
  in both lanes; the candidate then decelerates into the hold instead of
  snapping backward and returning forward after every strike;
- genuine run-through digs with exact Jog pixels at both action boundaries.

The metrics scan every opaque candidate pixel in the solid tile's vertical band.
Both right-facing frames and their left-facing mirrors must report zero upper-
or lower-body intrusion and at least 1 px clearance from the collision face.

Build from the repository root with the bundled Python runtime:

```powershell
C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe testing\animation-sandbox\side-dig-transition-polish-review-v1\build_review.py
```

Then inspect the three GIFs and the combined PNG under `generated/`. The
editable `side-dig-transition-polish-after-review.piskel` contains only the
proposed frames. Runtime wiring remains a separate approval step.
