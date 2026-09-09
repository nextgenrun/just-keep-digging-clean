# Playlists

`playlist.json` is the complete ordered inventory for the 143 checked-in `.ogg`
and `.mp3` music files. Every file must appear exactly once. The files stay in
this flat directory so existing URLs and streamed cache keys remain stable;
`values/musicDirector.js` supplies their logical organization from the authored
filename semantics.

2026-09-09: Active Run Base variant 2 was removed after the user rejected it as
corrupt. Source-mix generation follows the active playlist so old measurements
cannot restore its library entry.

## Runtime pools

| Pool | Relevant moments |
|---|---|
| Menu | Title and restrained legacy ambient tracks |
| Tutorial | Practice, first-departure, and calm legacy tracks |
| Surface | Dawn, day, evening/recovery, and night |
| Depth | Shallow, Blue Cavern, Amber Depths, Crystal Void, Silver Vein, and the Core |
| Danger | Storm, player-aware earthquake, Graveborer Wurm, and Hardcore warning/critical |
| One-shot cues | Discovery, milestone, recovery, revive, final death, and finale |

Continuous priority is menu, committed Wurm encounter, player-aware earthquake,
Hardcore stress, tutorial, surface storm/time, then biome depth. One-shot cues
temporarily take the music lane and return to the current continuous context
when complete. `MusicStreamController` still loads on demand and
`RuntimeAudioAssetManager` retains only the bounded current/next working set.

Run `testing/2026-08-31-contextual-music-director-contract.mjs` after adding or
renaming music. It rejects missing, duplicate, unlisted, or unclassified tracks
and empty contexts/cues.
