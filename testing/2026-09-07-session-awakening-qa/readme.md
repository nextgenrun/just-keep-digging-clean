# Session awakening gameplay evidence

Open [preview.html](preview.html) to compare the three recorded awakenings with game audio.

The live QA script drives canonical `serve.py` in an isolated Chrome context with save writes disabled. The WebM videos capture the actual game canvas and master audio output; they include loading before the entry moment. The first two recordings force blur off and Finding focus forces it on to make the comparison repeatable. Normal gameplay varies both the rhythm and blur choice.

All ten gameplay cases passed: three variants; real movement and jump; keyboard skip; reduced motion; mute and resize; exit during awakening; rollback; pointer skip. There were no JavaScript errors, console errors, or failed requests. `evidence.json` contains the final frame traces, including the actual camera post-pipeline count before and after focus.

Each profile has opening, reveal, and fully awake screenshots. The adjacent implementation note describes asset provenance, audio attribution, configuration, and the focused contract/traversal checks.
