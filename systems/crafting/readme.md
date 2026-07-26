# Crafting

Game system — deterministic crafting transactions.

`CraftingSystem` reads recipe values, progression gates, the authoritative
`DigSystem` resource ledger, and `UpgradeSystem` ownership. It owns no separate
inventory or save data. Ancient Relics are permanent threshold requirements,
not consumed ingredients. Successful Arc Core crafts grant the existing
upgrade IDs so current ownership and save compatibility remain authoritative.
