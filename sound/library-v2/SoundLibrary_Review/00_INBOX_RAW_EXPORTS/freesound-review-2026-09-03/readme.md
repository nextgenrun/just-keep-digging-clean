# Freesound review discovery queue - 2026-09-03

Target: 4,250 distinct review candidates (85-source baseline multiplied by 50).
Current catalog: complete, with 4,250 distinct sound IDs and source hashes,
1,271 creators, all 22 families, and 48 cached search pages. Declared licenses:
2,521 CC0, 1,497 CC BY 4.0, and 232 CC BY 3.0. No original masters downloaded.
Nine of the 24 older source-page leads now have imported previews; the other
15 remain separately labelled leads and do not count toward the 4,250 target.

The API-only importer is `pipelines/audio/crawlFreesoundReview.py` and its
107 queries across 22 audio-gap families are in
`pipelines/audio/2026-09-03-freesound-review-searches.json`.
Dry-run is the default and makes no network requests. For a permitted live run,
provide `FREESOUND_API_KEY` through the process environment, then use:

```powershell
python -B pipelines/audio/crawlFreesoundReview.py --execute --api-use-authorized --max-requests 200
```

The flag confirms the credential permits this intended use; it does not grant
rights. Check the [official API terms](https://freesound.org/help/tos_api/).
No secret is written to the catalog or printed. Requests are paced, cached and
resumable, with stop-on-error behavior. Do not scrape disallowed search pages
or work around authentication/rate limits.

Alternatively use `--key-stdin` with an inherited private pipe. It refuses an
echoing terminal. The initial credential, registered as `Understar Private SFX
Review`, was transferred in memory using a one-time encrypted envelope; no key
file or persistent environment setting was created. Registration does not
itself grant commercial API permission. A complete catalog needs no credential
for local review, and re-running the importer makes zero further API requests.

The global target was reached before all family ceilings. The thinnest pools
are landing/movement (15) and earth digging (52); prioritize these in a future
targeted search after this review. Counts and safety checks are recorded in
`testing/audio-review-2026-09-03/freesound-catalog-audit.json`.

Filters retain explicit CC0/CC BY declarations, 44.1 kHz or higher sources,
one/two channels, duration suitability and a valid HTTPS HQ preview. IDs and
source hashes are deduplicated; creator/pack caps preserve variety. Metadata
screening is not human quality approval or license clearance for distribution.
Original master files are not downloaded. Every candidate remains review-only.

Open `testing/audio-review-2026-09-03/freesound.html` through canonical `serve.py`.
Only the selected preview is fetched after Play. Export decisions for a later,
explicitly authorized wiring pass.
