# Playscene

World layer module — playScene.

`PlayerInputHandler` resolves mining targets through the actual player body AABB. The shared resolver is used unchanged by main-world and compact-cave gameplay, so directional aim never selects a tile occupied by the taller UAL collider.

UAL main-world and compact-cave actions share contact-synchronised damage: the punch-only Jab/Cross/Jab/Cross side combo, alternating Jab/Cross UP and UP-SIDE variants, same-facing floor DOWN strike, Quickslash, and ground-directed Thunder stay locked through visible recovery and cannot apply repeated invisible hits. The former fifth power cross, authored kick, and `Sword_Regular_C` up strike are rejected. Both runtimes also share walk/start/run/stop/pivot, takeoff, tucked hover, Shield Dash travel-enter/loop, flight-exit, rise/fall, and Jump Land transitions with signed-velocity banking. Camera behaviour remains intentionally independent of this animation pass.

UAL locomotion cadence is measured from resolved body displacement, not requested input velocity. A blocked body therefore stops producing fake walk cycles, upgraded or weather-adjusted speed remains stride-matched, and climb/flight timing stays consistent across both world implementations. The base idle/action presentation is 109px, while walk start/loop/run/stop use 123px to preserve the same approximately 0.8-tile visible height.

Mining cooldown admission uses the action-start timestamp, while damage and
feedback remain deferred to the authored visual-contact frame. Contact first
resolves against the current body and then falls back to the committed input
direction if animation alignment moved the body; out-of-bounds fallback cells
are never selected. This keeps all four visual combo actions at exactly one hit
each despite their different contact offsets.

Blocked `BEDROCK` and `CAVE_WALL` contacts use the shared mining result contract.
Normal, native-contact, Quickslash, Living Drill, and Arc Core attempts in the
main world send one keyed `Cannot dig` warning through the notification UI, so
repeated or area contacts do not stack duplicate messages. Compact caves show
the same copy through their existing status line. Neither path changes damage,
collision, or tile state.

Game Rig v2 projects hand/foot markers and action hitboxes across the intended
tile-face band as diagnostic evidence. A small capped `visualOffset` can bring
near-misses onto the face without moving the 31x75 physics body, but marker
validation never vetoes a body-adjacent committed dig. Main-world and
compact-cave actions create, update, validate, and clear the same
`PlayerRigContactSystem` lifecycle. The native UAL and Unreal-IK-retargeted
Survival alternative share this gameplay contract; each character choice loads
18 active sheets / 867 frames while the UAL review manifest retains 21 actions.

## UI review harness

Add ?ui-review=1 to the game URL to enable the query-gated production UI review controls. The harness is disabled during normal play and opens the real Pause, Inventory, Shop, Campfire, Milestones, Star Pillar, Level Up, Dialog, and Notification surfaces for visual regression checks.

## Authored-world visual benchmark

`PlaySceneSetup` creates the full-depth living backdrop after the master scenic
and ambient-motion systems. `PlaySceneUpdate` advances pooled cool mist/aura and
warm smoke/steam sprites across both active authored regions in world space, so
the background never follows the player. Use `?worldLiving=0` for the narrow
rollback (`?level1Living=0` remains an alias) or `?worldMotion=0` to disable all
optional world motion while keeping the approved static mockup-derived art.

`WorldScenicFacadeSystem` is created after the authoritative tile renderer and
extends the continuous-material treatment from row 75 through the full 5,065-row
model. `DeepWorldLivingBackdropSystem` then adds the separately pooled Level Two
motion pass. Use `?worldFacade=0` for the deep static-material rollback and
`?deepWorldLiving=0` for only the deep motion rollback.
