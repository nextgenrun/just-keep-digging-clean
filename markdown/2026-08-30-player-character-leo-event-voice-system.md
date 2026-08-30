# Player character LEO event voice system

## Character promise

The Miner speaks in first person with LEO's grounded low voice. He is
observant, protective, quietly stubborn, dryly funny, and respectful of the
mountain and buried Stars. Lines react to something that just happened and use
sensory memory instead of UI terms, percentages, keybinds, objectives, or
generic hero claims. Courage is shown by noticing danger and continuing.

## Event library

The catalog contains six context-tagged variants for each of sixteen families:
first descent, mining momentum, rare material discovery, Star release, Titan
discovery, first biome entry, depth milestone, personal depth record,
earthquake warning, earthquake aftermath, Hardcore danger, Hardcore recovery,
inventory pressure, deep return, meaningful purchase, and campfire rest.

The selected Titan anchor is player speech and remains exact:

> That is no statue. The stone is breathing around it, as though the entire chamber is trying not to wake it.

## Runtime contract

The event's existing gameplay authority emits a request only after a real state
transition. `EventVoiceLineDirector` applies chance, family cooldown, global
cooldown, session/context deduplication, context-tag selection, bounded
priority queuing, expiry, and a quiet tail. A request never stops an active
line. Candidate cursors and dedupe memory advance only when audio actually
starts, so unavailable or expired assets do not consume a variant.

Legacy random player speech is disabled. Merchant shop-open speech remains a
separate 35% roll with a 45-second per-merchant cooldown and busy-drop policy.
Narration, merchant, and player events share one playback channel.

The standard mode is deliberately sparse. `?playerVoiceMode=stress10x` raises
chance by 10x and divides cooldowns, global cooldown, and quiet tails by 10 for
testing; it does not increase queue size or permit overlap. `?playerVoices=0`
disables the new player events without changing merchant or narration audio.

## Generation and budget

The canonical catalog has 96 clips and 9,346 authored characters. One approved
Titan clip is reused, leaving 9,239 provider characters. At the catalog's
recorded USD 15 per million characters, the planned provider estimate is USD
0.138585. The generator refuses a plan above USD 1, beneath the user's EUR 5
maximum, validates before requesting a key, redacts provider errors, writes a
hash manifest incrementally, and resumes valid completed clips.
