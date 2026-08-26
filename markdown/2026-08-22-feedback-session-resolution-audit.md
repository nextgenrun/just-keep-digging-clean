# Feedback Session Resolution Audit — 2026-08-22

This audit reconciles every obligation in the 17 August feedback session plus
the six later regressions. It distinguishes implemented repairs from areas
where the current authored presentation was audited and retained.

## Original 28 obligations

| ID | Resolution | Primary evidence |
|---|---|---|
| A17-01 | Tutorial ghost now demonstrates the next reachable descend/dig-down state; it never copies player frames or controls. | `2026-08-18-feedback-regression-contract.mjs` |
| A17-02 | The portal marker gives one compact contextual `S down • F dig` instruction and retires after proof. | tutorial feedback and containment contracts |
| A17-03 | Inventory retains its authored four-tab layout, named resource art, and a seven-entry Special Blocks guide. | inventory icon/world-guide contracts and live review |
| A17-04 | Full animation mapping audit restored phase-authored Piskel start/stop handoffs instead of generic Mixamo start/stop; no Blender rewrite was needed for this regression. | global polish, repair-v2, accepted-runtime contracts |
| A17-05 | Escape closes the active UI first. Fullscreen changes remain on the explicit fullscreen command. | escape UI routing contract |
| A17-06 | Blocking UI uses scene suspension, preserving the combo timer. | combo reward/suspension and scene stability contracts |
| A17-07 | Weather UI actors/copy are completely absent; weather remains only as world ambience. | weather HUD removal contract and browser screenshot |
| A17-08 | Tutorial Flight reserve ends with the teaching stage, displays a GP-resume message, and remains ended after reload. | feedback regression contract |
| A17-09 | Start UI passed authored art, hierarchy, focus, save-vault, and responsive live review; it was retained rather than replaced with provisional UI. | browser review |
| A17-10 | Stationary and moving side digs use planted/phase-matched assets with zero measured foot-baseline drift in the moving sheet. | moving-complex-dig and global polish contracts |
| A17-11 | Warning and critical stress now pair visible status language with a dedicated non-seismic cue. | approved SFX and notification contracts |
| A17-12 | Frequent 45–90 second debris events use a contextual hold-Q shield, 6 GP/s drain, absorb confirmation, and lethal/cave-in authority. | debris shield and earthquake dodge contracts |
| A17-13 | Floating-feedback preference schema v3 migrates stale enabled saves to FULL while preserving an explicit OFF choice. | feedback and notification contracts |
| A17-14 | Merchant/tutorial prompts use measured visible-pixel tops instead of transparent canvas bounds. | NPC activity contract and live review |
| A17-15 | The mismatched recent reward cue is retired; level-up uses restrained UI confirm plus readable status, while danger has its own cue. | approved SFX contract |
| A17-16 | All 37 upgrades were audited for IDs, merchants, cost, cap, description, effect owner, and one-time semantics. | all-upgrades audit and shop integrity contracts |
| A17-17 | Next Unlock rotates attainable candidates every 18 seconds; Hardcore survival priority now reads the correct runtime property. | feedback contract and live rotation review |
| A17-18 | Only intact Stars within a tight 1.5-tile radius grant light-based stress relief; mining removes relief. | feedback and critical-feedback contracts |
| A17-19 | Dirt and other underground material contacts route to the correct grounded footstep family. | ground footstep FX contract |
| A17-20 | Map is always available, has dedicated Phaser input zones, and bypasses silent asset-pressure deferral. | quick-control contract and live World Map screenshot |
| A17-21 | Sky Pillar crown/socket assets are loaded and visible in the authored pillar/tree views. | pillar contracts and live Star Pillar review |
| A17-22 | Talent tree uses the authored full-screen three-branch hierarchy with readable prerequisites, costs, and availability. | constellation/tree contracts and live review |
| A17-23 | First-talent ability visibility now survives save/reload and remains activatable from the five-slot bar. | actionbar persistence and input contracts |
| A17-24 | Torch efficiency/range/Cave Eyes precede the danger they solve; Hardcore Next Unlock prioritizes them and player levels add capped stress resistance. | all-upgrades, shop, and Hardcore contracts |
| A17-25 | Sleeping Jackpot/chest transactional presentation, alignment, persistence, and authored event assets were revalidated. | random-world-event and notification contracts |
| A17-26 | Every Hardcore teleport route costs zero. | Hardcore containment/permadeath contracts |
| A17-27 | Hardcore death layout moved below the buff lane, and one successful click now retries save and continues/restarts without a second click or stuck state. | Hardcore permadeath contract |
| A17-28 | Hardcore stress and near-death use a dedicated warning asset, not earthquake/seismic audio. | approved SFX contract |

## Six later regressions

| ID | Resolution | Primary evidence |
|---|---|---|
| A22-01 | Removed the remaining top-right weather/world-state UI. | weather removal contract and live screenshot |
| A22-02 | Background texture streaming refuses to remove a texture while any live Phaser Image frame still consumes it, preventing null `glTexture` rendering. | texture lifetime contract and live 0–1461 m traversal |
| A22-03 | Thunder Strike V is no longer consumed before the abilities progression gate; owned/God Mode abilities bypass that mismatched gate. | critical fixes contract and live three-stage strike |
| A22-04 | Removed the recently introduced reward sound family and callers. | approved SFX contract |
| A22-05 | God Mode talent availability ignores level/root/prerequisite locks and spends zero Stars. | constellation and critical fixes contracts |
| A22-06 | Restored stable Piskel start/stop dimensions and phase handoffs, removing the intermittent couple-frame scale pop introduced by generic 16-frame Mixamo transitions. | git audit plus global animation contracts |

## Validation result

- Focused regression set: 30 current contracts passed after updating two stale
  expectations to the deliberate FULL floating-feedback default and visible
  Hardcore stress warning.
- Runtime proof: weather HUD absent; World Map opens; action bar and Star Pillar
  render; Thunder Strike performs its charge/impact sequence; depth traversal
  crossed 50 m through 1461 m without a `glTexture` exception.
- Native browser fullscreen could not be granted by the automated browser's
  permission policy. The Escape ownership route is covered by its direct state
  contract; actual native-fullscreen acceptance remains a manual QA matrix item.
