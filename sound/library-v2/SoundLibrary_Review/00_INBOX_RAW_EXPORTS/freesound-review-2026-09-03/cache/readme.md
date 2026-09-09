# Freesound response cache - 2026-09-03

Public API search metadata only: 48 cached response pages from the completed
4,250-candidate review pull. No audio masters, account responses, or credentials.
Names are SHA-256 hashes of credential-free search URLs; authentication headers
are never written. JSON pages are ignored by Git, while the normalized review
catalog is retained in the parent directory. Keep these pages to resume searches
without repeating requests. The cache does not grant approval or runtime rights.
