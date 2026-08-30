# ElevenLabs Prompt Contrast Library V3

## Outcome

The next ElevenLabs SFX test is prepared as a review-only contrast library. It
retains the same eight representative GX families as the earlier layered
mockup, then expands across twenty-six additional gameplay sounds. The pasted
baseline review is preserved: chunky stone break is `GOOD`, six references are
`REJECT`, and the void-gate idle remains `UNRATED`. Nothing is runtime-wired.

Live generation completed with 74 ready files and zero failures. The package is
1,951,749 bytes, all 74 SHA-256 hashes are unique, no partial file remains, and
the API response headers reported 1,178 total cost units. Generated files stay
`UNTESTED` pending human listening.

## Why the earlier batch converged

The first mockup combined broad source prompts with the same reference,
transient, body, detail, and tail instructions for every family. Its relatively
high prompt influence also favored literal, repeatable interpretations. That
was useful for proving the API and review workflow, but it encouraged common
rumble, whoosh, electronic, and generic game-impact vocabulary.

ElevenLabs recommends keeping individual effects simple and combining separate
effects later when precise layering is needed. Its API documentation also notes
that higher prompt influence reduces variation. V3 therefore tests complete
sound identities first and reserves layer construction for the winning sounds.

## V3 prompt method

Every prompt now describes five concrete properties:

1. One physical source or tightly related source pair.
2. The exact action and event order.
3. The material character that distinguishes the family.
4. A short envelope and recording perspective.
5. Family-specific failure sounds to exclude.

Repeated phrases such as “cinematic game SFX” and a global production suffix
are intentionally absent. Dirt, granite, quartz, workshop hardware, void stone,
and tactile UI materials receive separate vocabularies. The ambience prompts
explicitly ask for negative space and ban tonal drones.

## Expanded test scope and spend boundary

The full plan contains 74 candidates and 117.8 seconds:

- 18 original one-shots: three directions for each of six sound families.
- 4 original loops: two directions for each of two ambience families.
- 52 breadth candidates: two directions for each of twenty-six additional
  families across mining, robot movement, Flight, tiles, UI, rewards, danger,
  torch response, void, and Star material.
- 0.36–0.42 prompt influence for one-shots and 0.32 for loops.
- Conservative fixed-duration ceiling: 4,712 ElevenLabs credit units.

The pipeline remains dry-run by default and requires explicit generation and
credit ceilings before any paid request. Partial ID subsets remain available
for retries or targeted follow-up batches.

## Review contract

Open the prepared batch `index.html` and compare OLD versus NEW on headphones.
Rate each row rather than rating a family as a whole. Export the ratings JSON
after listening; this avoids losing which previous sounds were already good.

Promote nothing directly from this test. First select the successful acoustic
direction for each family. Only then generate or edit the minimum needed layers,
normalize them, test repetition in gameplay, and route explicitly approved files
through the existing sound-library review workflow.

## Files

- `pipelines/audio/2026-08-26-elevenlabs-prompt-contrast-v3.json`
- `pipelines/audio/2026-08-26-generate-elevenlabs-prompt-contrast-v3.py`
- `pipelines/audio/elevenLabsPromptContrastReviewPage.py`
- `sound/library-v2/SoundLibrary_Review/00_INBOX_RAW_EXPORTS/elevenlabs-prompt-contrast-v3-2026-08-26/`

Official references:

- [ElevenLabs Sound Effects product guide](https://elevenlabs.io/docs/eleven-creative/playground/sound-effects)
- [ElevenLabs Sound Effects API](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert)
