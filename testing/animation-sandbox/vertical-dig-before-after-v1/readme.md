# Vertical Dig Before / After Review v1

Review-only comparison for stationary UP, stationary DOWN, moving UP-SIDE, and
moving DOWN-SIDE mining with the default Survival character.

The current lanes reproduce the real source sheets and their contact-driven
whole-sprite offsets. The proposed lanes keep the 31x75 physics body and sprite
foot anchor authoritative. UP receives a restrained planted-torso correction;
DOWN uses the protected Blender `MINER_dig_down` source normalized to the same
fixed root and ground line as polished UP. Moving candidates retain the exact
Jog lower body and phase sequence.

The builder reuses the central Piskel compositors but writes only inside this
review folder. It does not edit active Piskel documents, runtime sheets,
profiles, selectors, gameplay, cooldowns, damage, or saves.

## Build

```powershell
python testing\animation-sandbox\vertical-dig-before-after-v1\build_mockups.py
```

## Review

Serve the repository and open:

`http://127.0.0.1:8090/testing/animation-sandbox/vertical-dig-before-after-v1/`

The red rectangle is the authoritative collider, the blue dot is the visible
foot anchor, the cyan outline is the current-frame silhouette, and the amber
mark owns the final contact gap. Browser approval is local review state only.
