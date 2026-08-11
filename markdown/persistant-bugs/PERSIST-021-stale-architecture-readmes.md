# PERSIST-021: Architecture READMEs describe missing directories and obsolete entry paths

- Status: confirmed
- Severity: P2
- Category: documentation drift / non-existing references
- Evidence: `markdown/readme.md:22-23` documents `index.php`, `js/main.js`, and `package.json`, but the current root has `index.html`, root `main.js`, `serve.py`, and no `index.php`, `js/`, or `package.json`. The same README documents `audio/`, `animations/`, and `shaders/` at `:109`, `:160`, `:165`, and `:170`, but those root directories do not exist; audio is in `sound/`. The root `readme.md:69` additionally names `/systems/audio/`, which is not the current audio owner.
- Failure: a maintainer following the mandated reading order is sent toward nonexistent entry files and directories, while the actual runtime layout and the documented architecture disagree about the audio boundary.
- Permanent solution: regenerate the architecture maps from the current tree, document root `main.js` and `sound/`, remove obsolete `index.php`, `js/`, `package.json`, `audio/`, `animations/`, and `shaders/` claims unless those paths are intentionally restored, and add a documentation path-existence check.
- Verification contract: every path in the canonical architecture READMEs resolves, and each documented subsystem has one current owner and entry path.
