/**
 * LOADING_MESSAGES
 * Single source of truth for all label/detail pairs shown during BootScene preload.
 * New pairs cycle every ~segments% progress. Add/remove entries freely.
 *
 * See: /markdown/single-source-of-truth-policy.md
 */
export const LOADING_MESSAGES = Object.freeze([
  // ── Real loading states ──
  { label: "Opening your save...", detail: "Your latest valid progress stays protected" },
  { label: "Restoring your world...", detail: "Returning mined and untouched blocks to their saved state" },

  { label: "Preparing the nearby mine...", detail: "Loading the ground around your return point" },
  { label: "Restoring your miner...", detail: "Applying your saved position, GP, and upgrades" },
  { label: "Restoring your inventory...", detail: "Loading every resource you carried" },

  { label: "Opening discovered routes...", detail: "Activated return gates stay unlocked" },
  { label: "Updating your World Map...", detail: "Showing the routes and landmarks you discovered" },
  { label: "Updating your Codex...", detail: "Restoring every material and Star you found" },

  { label: "Preparing your controls...", detail: "Keeping your chosen key bindings" },
  { label: "Applying your settings...", detail: "Restoring audio, display, and feedback choices" },

  { label: "Preparing the merchants...", detail: "Your purchases and available upgrades are unchanged" },
  { label: "Preparing the Campfire...", detail: "Restoring Ember Charges and your selected blessing" },
  { label: "Lighting known Star refuges...", detail: "Safe light, GP recovery, and panic relief are waiting" },

  { label: "Preparing cave hazards...", detail: "Watch their timing before you cross" },
  { label: "Listening for earthquakes...", detail: "Marked ground warns where rocks will fall" },
  { label: "Restoring your Journey...", detail: "Milestones and recent discoveries stay with this save" },

  { label: "Preparing Celestial powers...", detail: "Restoring equipped abilities and purchased talents" },
  { label: "Checking your torch...", detail: "Your chosen brightness controls light and GP drain" },

  { label: "Checking Hardcore progress...", detail: "Lives, revives, and stress return exactly as saved" },

  // ── Load phases ──
  { label: "Preparing the mine...", detail: "Opening the route where you left off" },
  { label: "Almost ready...", detail: "Entering the mine" },

  // ── Gameplay tips (kept in sync with current control and system authorities) ──
  { label: "Tip: Default F mines the aimed tile", detail: "Aim with W/A/S/D, then hold Dig until the block breaks" },
  { label: "Tip: Hold left-click to keep mining", detail: "The cursor retargets valid adjacent blocks until release" },
  { label: "Tip: SPACE makes one fixed jump", detail: "Every jump is exactly 1.2 tiles high" },
  { label: "Tip: Hold CTRL while moving to run", detail: "Running is over twice walking speed and slowly drains Gem Power" },
  { label: "Tip: SHIFT powers Flight with Gem Power", detail: "A/D steer while W/S build vertical momentum" },
  { label: "Tip: Flight is your local recovery tool", detail: "Use permanent gates for long-distance returns" },
  { label: "Tip: Default E interacts", detail: "Use it near merchants, Campfires, boards, pillars, and special tiles" },
  { label: "Tip: The first return gate waits at 15m", detail: "Activate it once to open a permanent route home" },
  { label: "Tip: Resume through the Town surface gate", detail: "Its paired sky gate returns you to the 15m route" },
  { label: "Tip: Sell resources to the Money Monster", detail: "Spend the money on upgrades or save for a later route" },
  { label: "Tip: Your inventory never fills up", detail: "The bag shows how much you carry, but it never blocks mining" },
  { label: "Tip: Default I opens your inventory", detail: "Review resources and the Star Atlas as discoveries unlock" },
  { label: "Tip: Default M opens the World Map", detail: "Use it to review your discovered routes and landmarks" },
  { label: "Tip: Controls can be rebound", detail: "Open Settings from the ESC pause menu" },
  { label: "Tip: Reach Level 3, then visit the Star Pillar", detail: "Attune your first Celestial ability there" },
  { label: "Tip: Stars purchase Celestial talent nodes", detail: "Starting abilities are free; later nodes spend collected Stars" },
  { label: "Tip: Purple Gem Power blocks refill GP", detail: "Their refill grows from 100 to 1700 GP with depth" },
  { label: "Tip: Gold Speed blocks accelerate mining", detail: "They grant +50% mining speed for 20 seconds" },
  { label: "Tip: Crimson Berserk blocks add mining damage", detail: "They grant +50% damage for 20 seconds and can stack" },
  { label: "Tip: Combo blocks add 50 combo", detail: "Mine them to jump straight toward the next checkpoint" },
  { label: "Tip: XP and Legend blocks advance your level", detail: "Legend blocks grant five times an XP block's progress" },
  { label: "Tip: Special blocks cluster near caves", detail: "Their spawn chance is tripled around cave regions" },
  { label: "Tip: Broken blocks build your combo", detail: "Keeping the chain alive raises damage and slightly speeds mining" },
  { label: "Tip: Combo checkpoints restore Gem Power", detail: "The first checkpoint arrives at 10 combo" },
  { label: "Tip: A 500 combo grants +10% XP", detail: "Keep destroying blocks before the combo timer expires" },
  { label: "Tip: Default T toggles your torch", detail: "The torch starts off and consumes Gem Power while lit" },
  { label: "Tip: Click or wheel the torch percentage", detail: "Set its intensity anywhere from 1% to 200%" },
  { label: "Tip: Torch Overdrive begins above 100%", detail: "Extra light also means faster Gem Power drain" },
  { label: "Tip: Ember Ore fuels Campfire blessings", detail: "Every mined Ember adds one immediate Ember Charge" },
  { label: "Tip: Your first Ember improves Campfire refill", detail: "Town and Campfire refills rise from one charge to two" },
  { label: "Tip: Returning to Town restores Ember Charges", detail: "Interacting with a Campfire restores at least the same amount" },
  { label: "Tip: A Campfire blessing costs one charge", detail: "Its temporary speed or XP effect stays on the HUD" },
  { label: "Tip: Leave marked ground during earthquakes", detail: "Walk or fly clear before the warned Fall Zone collapses" },
  { label: "Tip: Aftershocks remain dangerous", detail: "Stay clear of marked ground until every falling rock settles" },
  { label: "Tip: Cave hazards empty all Gem Power", detail: "They extinguish the torch and return you to a safe checkpoint" },
  { label: "Tip: Read cave hazards before crossing", detail: "Move between pulses or use Flight above spike runs" },
  { label: "Tip: Hardcore mining noise attracts the Wurm", detail: "When a breach line appears, use Flight to clear it" },
  { label: "Tip: Hardcore Stress can recover", detail: "Light, intact Stars, and the surface provide recovery" },
  { label: "Tip: An intact Star can shelter you", detail: "Rest nearly still beside it to draw GP from its local reserve" },
  { label: "Tip: Destroying a Star scars its territory", detail: "Ordinary material tiles there stop yielding resources" },
  { label: "Tip: Seismic Suppression ends earthquakes", detail: "The late Player Upgrade permanently stills the mine" },
  { label: "Tip: Resonant caves reward long chains", detail: "Their stone layout favors sustained combo mining" },
  { label: "Tip: Crystal growths mark charged seams", detail: "Search nearby for unusually concentrated special blocks" },
  { label: "Tip: Gold cave light can mark a vault", detail: "It may reveal a buried one-time treasure cache" },
  { label: "Tip: Volatile seams hold the wildest boosts", detail: "They concentrate Berserk and Legend blocks" },
]);
