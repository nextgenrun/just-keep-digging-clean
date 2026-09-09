# Signal encounter — 2026-09-07

Signal is an intermittent underground encounter in the existing ambient scheduler. It unlocks with the random-event introduction and requires at least 18 tiles of depth. Most signals (65%) end at an empty minicamp; 35% contain a survivor or Mia, including a fixed 10% explosive-human chance across all Signals (25% safe occupied camps). Calls recur after 12–24 seconds of silence. Wording or animal sounds change with proximity; stereo bearing, distance filtering and gain indicate direction. A moving chevron and explicit caption appear only during a call, including when sound is off. About 22% of distant calls have a short, filtered second echo. Calls fade out and cues stop beyond 42 tiles, so walking away leaves the Signal behind.

## Camp and cast

Every source occupies a seven-tile-wide, four-tile-high AIR room above a solid floor. Placement refuses protected/special terrain and hazards. Clearing uses the normal dug-tile persistence and renderer update paths. Developer spawns also remain underground. Mining away a dormant source's floor ends the event. Once a trap's fuse starts, removing the floor or reaching the event timeout does not cancel the explosion.

Ivo the Lampkeeper, Bram the Prospector and Oren the Surveyor each have four ImageGen-authored poses, distinct scripts and voices. Mia is a female shepherd with a worn leash and a brass MIA plate. All five artwork masters, including the camp, have verified alpha transparency. Phaser assembles the cinematic strip from the same camp and character art used in the world; portrait frames crop the original pixels through metadata.

The existing voice library was predominantly male. Thirty short human MP3s use Rex (Ivo), Sal (Bram) and Leo (Oren), generated through OpenRouter's Grok voice model. Captions use the exact authored scripts. The temporary credential is absent from runtime and assets. Voice naturalness remains a listening judgment; no comparative listening panel or speech-to-text accuracy audit was performed.

Mia has 14 captioned segments from six recorded barks, whines, a howl and a growl. All six sources were verified as CC0; creator, source page, public HQ preview, bytes and SHA-256 are in sound/voice-lines/signal-dog-v1/sources.json. The runtime decodes each master once and applies short segment-edge fades. Both banks share one voice channel with existing dialogue, bounded peak normalization, music ducking, mute and cancellation. No runtime speech API or network credential is required.

## Choices and authority

- Give supplies: type exact whole amounts of any carried resources. Invalid, empty and unaffordable selections are rejected. A small gift grants 250 Starpower. A substantial gift grants 2,000 and fully restores GP. Its required base ore value is the largest of 100M, depth × 2M, or 25% of the carried pack value; the exact requirement appears in the gift form. Debits and rewards commit once. Merchant bonuses do not change that threshold.
- Feed the survivor to the stars: an explicit confirmation states the 50% risk. Winning grants 1,000 Starpower (previously 25). Losing in Casual empties all carried resources and GP and returns the player to the surface. Existing money and starpower remain. Normal surface GP regeneration resumes afterward.
- A Hardcore loss uses the existing permanent-death authority and ends the only life, including if Hardcore was selected without being armed yet.
- Leave: no payment or penalty.
- Mia's first choice is Bring Mia Home. Rescue grants the existing one-time mia upgrade without a purchase or resource charge. The old 21-trillion shop price becomes a Find Mia requirement, enforced by UpgradeSystem even for direct purchase calls. Rescued Mia appears beside Bobo and is excluded from future camp selections. Existing owned Mia saves remain compatible.

Fate is fixed when the encounter starts and survives serialized event restoration. Failed transactions restore cargo, GP, position, star currency, upgrade ownership and the encounter. A committed Hardcore attack or explosion retains its distinct cause and pending-death state until the death flow takes over. Normal progress, including rescue, follows the existing town-bed checkpoint policy: rest at the bed to retain it across sessions. This event does not introduce expedition checkpoints or change the one-life death authority.

Cinematics use the Phaser scene clock so dialogue and result progression continue while world controls are blocked. Enter skips the introductory lines, 1/2/3 select choices, and Escape backs out or leaves. Exact amount entry is isolated from E2E numeric preview shortcuts.

## Explosive Signal

Bram can be an explosive mimic. His normal calls and camp initially match an ordinary survivor; normal Bram encounters still exist. Mia never receives this variant. Coming within 2.2 tiles with no intervening rock arms a 1.8-second fuse. The pack shows a growing ember, the survivor takes the guarded pose, an existing recorded sizzle plays, and the always-visible caption reads "[His pack hisses. An ember burns inside.]". There is no confirmation or cinematic pause. The fuse starts only once the approved warning art and survivor are available.

At detonation, a player within 2.6 tiles with an unblocked ray is killed immediately. Walking to the room edge, Flight or intervening solid rock can save them. The blast does not remove cover or protected tiles. Casual loses all carried resources and GP and returns to the surface; ordinary surface regeneration then resumes. Hardcore ends the run through the existing permanent-death flow. The death screen names the pack and teaches distance/cover. Escape grants 750 Starpower once. The ember explosion reuses the approved tile-destruction atlas; reduced motion lowers its alpha and there is no fullscreen flash or camera shake.

The trap roll uses only world seed and event serial. It is 10% per natural Signal at every eligible depth, including the first. Overall occupied/empty odds stay 35%/65%. A serialised fuse resumes with its remaining time, and the sampled lethal result survives transaction retry. Menus pause the fuse and hide its cue; asset-loading time is never deducted before the first warning.

With independent rolls, the chance of at least one trap among 10, 20 and 30 generated Signals is 65.1%, 87.8% and 95.8%. The mean first trap is Signal 10. The ambient scheduler waits 165–300 seconds after an encounter, plus that encounter's duration, and can choose Choir when eligible. Ten followed Signals may therefore take roughly 30–70+ minutes of eligible exploration. **There is no measured mapping from encounter count to 1,000–1,500 metres, and no guarantee before the bottom.** Skipping calls further reduces actual exposure. These are count-based estimates; tune the fixed chance against natural progression telemetry rather than adding a depth-specific spike.

The top gift is an astral star's worth of currency, enough for several existing Starpower rank purchases, plus a full GP refill. Talent Point unlock requirements remain in force. "A LIGHT LEFT ON" is the generous-gift result text, not an achievement unlock.

## Try it

Run the active checkout's serve.py. F2 has SIGNAL, a cycling Signal profile selector (Random, Ivo, Bram, Oren, Mia, Explosive), and a Signal practice link. Triggering a developer Signal creates a real encounter in a valid nearby underground camp. Follow the calls and use the interaction key.

The dedicated review page is testing/signal-event-sandbox/index.html. Start practice, fill a dummy pack, choose a profile/case, then Go to minicamp. Click the game to focus it and press E. Approach / talk also enters through the real interaction bridge. The page includes guaranteed wins/losses, Explosive survivor, Walk out of blast (normal walking input after a 200ms reaction), empty sources, sound-off, Hardcore, cancellation, Go to Bobo and restored Mia ownership. An explosive developer spawn can arm immediately if the player is already next to the chosen camp.

The developer API is exposed only through the existing developer capability:
```js
window.__jkdDynamicEvents.trigger("signal", { kind: "explosive" });
window.__jkdDynamicEvents.trigger("signal", { survivorId: "mia", kind: "survivor" });
window.__jkdDynamicEvents.trigger("signal", { survivorId: "ivo", kind: "survivor", outcome: "loss" });
window.__jkdDynamicEvents.trigger("signal", { survivorId: "oren", kind: "echo" });
```
Cancel an active encounter before triggering another. A rescued Mia is not duplicated; use a fresh practice run to repeat rescue.

Practice keeps _saveWritesBlocked enabled and supplies memory-only transaction, flush and memorial ports. It does not write saved progress or audio settings. Reload rescued Mia serializes/restores the actual upgrade map and reconstructs the surface view; it is not a disk-checkpoint test.

## Verification

19 focused base Signal cases plus 14 risk cases pass. The risk cases cover 100,000 seeds at four depths, cumulative encounter odds, collision and cover, one-time rewards, generous/small gifts, capped currency authority, pause/expiry, serialized fuses, Hardcore cause and damage/reward rollback. The base cases cover distribution, serialized fate, human/dog caption coverage, six dog recordings, protected AIR rooms, exact donations, once-only rewards, Casual loss, pending Hardcore death, rollback, voice ownership, underground dev placement, Mia purchase rejection and rescue restoration. Existing ambient admission, event outcomes, random-event, voice rotation/arbitration, Hardcore permanence and all 33 traversal regressions also pass.

Original browser evidence (before the reward rebalance) is in testing/signal-event-sandbox/browser-proof.json and adjacent screenshots. It covers actual in-engine interaction and choices, automatic cinematic progression, exact 13-dirt/7-stone donation, +25 starpower, Casual surface return, captions while muted, empty Signals, Mia rescue/surface restoration and the actual Hardcore run-ended screen with zero lives and no revive. These are focused local checks, not a full-game regression suite or a natural-progression playthrough.

Explosion browser evidence is in testing/signal-event-sandbox/explosion-browser-proof.json and explosive/signal reward screenshots. It verifies a muted fuse caption, actual ember blast, normal walking escape, Casual surface loss, an exact 11-Magma-Crystal generous gift with +2,000 Starpower, and a real Hardcore run-ended screen with the explosion cause and zero lives. All use disposable memory; no user saves are written.

## Optional permanent reward proposal — not implemented

A later permanent achievement could extend the **A LIGHT LEFT ON** generous-gift result. A small lantern glint and one quiet caption could reveal a previously hidden Keepsakes entry in Esc and the main menu. Any amount can be given; qualifying generosity should use a modest share of encounter-time cargo value plus a depth-scaled floor, avoiding a one-dirt farming incentive.

A restrained permanent Hardcore reward could be **Steady Wick**: one-time 5% less torch GP drain across future Hardcore runs. Keep it capped once so exploration benefits without undoing death stakes. A later survivor could acknowledge the kindness. The current build records recent choices; it does not yet award a hidden achievement or permanent donation upgrade.
