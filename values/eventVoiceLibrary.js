const EVENT_VOICE_BASE_PATH = "sound/voice-lines/event-driven-grok-v2/audio/";

function candidate(family, id, voice, speaker, file) {
  return Object.freeze({
    id,
    family,
    voice,
    speaker,
    key: `event-voice-v2-${id}`,
    file,
    path: `${EVENT_VOICE_BASE_PATH}${file}`,
  });
}

function family(...candidates) {
  return Object.freeze(candidates);
}

export const EVENT_VOICE_LIBRARY = Object.freeze({
  earthquakeWarning: family(
    candidate("earthquakeWarning", "earthquake-rex-01", "rex", "player", "earthquake-warning-rex-v01.mp3"),
    candidate("earthquakeWarning", "earthquake-eve-02", "eve", "player", "earthquake-warning-eve-v02.mp3"),
    candidate("earthquakeWarning", "earthquake-leo-03", "leo", "player", "earthquake-warning-leo-v03.mp3"),
    candidate("earthquakeWarning", "earthquake-sal-04", "sal", "player", "earthquake-warning-sal-v04.mp3"),
  ),
  rareMaterialDiscovery: family(
    candidate("rareMaterialDiscovery", "rare-eve-01", "eve", "player", "rare-material-eve-v01.mp3"),
    candidate("rareMaterialDiscovery", "rare-ara-02", "ara", "player", "rare-material-ara-v02.mp3"),
    candidate("rareMaterialDiscovery", "rare-rex-03", "rex", "player", "rare-material-rex-v03.mp3"),
    candidate("rareMaterialDiscovery", "rare-leo-04", "leo", "player", "rare-material-leo-v04.mp3"),
  ),
  deepReturn: family(
    candidate("deepReturn", "return-leo-01", "leo", "player", "deep-return-leo-v01.mp3"),
    candidate("deepReturn", "return-eve-02", "eve", "player", "deep-return-eve-v02.mp3"),
    candidate("deepReturn", "return-sal-03", "sal", "player", "deep-return-sal-v03.mp3"),
    candidate("deepReturn", "return-ara-04", "ara", "player", "deep-return-ara-v04.mp3"),
  ),
  hardcoreDanger: family(
    candidate("hardcoreDanger", "hardcore-rex-01", "rex", "player", "hardcore-danger-rex-v01.mp3"),
    candidate("hardcoreDanger", "hardcore-sal-02", "sal", "player", "hardcore-danger-sal-v02.mp3"),
    candidate("hardcoreDanger", "hardcore-eve-03", "eve", "player", "hardcore-danger-eve-v03.mp3"),
    candidate("hardcoreDanger", "hardcore-leo-04", "leo", "player", "hardcore-danger-leo-v04.mp3"),
  ),
  meaningfulPurchase: family(
    candidate("meaningfulPurchase", "purchase-ara-01", "ara", "bobo-merchant", "meaningful-purchase-ara-v01.mp3"),
    candidate("meaningfulPurchase", "purchase-sal-02", "sal", "gear-merchant", "meaningful-purchase-sal-v02.mp3"),
    candidate("meaningfulPurchase", "purchase-leo-03", "leo", "gem-merchant", "meaningful-purchase-leo-v03.mp3"),
    candidate("meaningfulPurchase", "purchase-eve-04", "eve", "upgrade-merchant", "meaningful-purchase-eve-v04.mp3"),
  ),
  biomeFirstEntry: family(
    candidate("biomeFirstEntry", "biome-eve-01", "eve", "player", "biome-entry-eve-v01.mp3"),
    candidate("biomeFirstEntry", "biome-leo-02", "leo", "player", "biome-entry-leo-v02.mp3"),
    candidate("biomeFirstEntry", "biome-ara-03", "ara", "player", "biome-entry-ara-v03.mp3"),
    candidate("biomeFirstEntry", "biome-rex-04", "rex", "player", "biome-entry-rex-v04.mp3"),
  ),
  titanDiscovery: family(
    candidate("titanDiscovery", "titan-leo-01", "leo", "narrator", "titan-discovery-leo-v01.mp3"),
    candidate("titanDiscovery", "titan-eve-02", "eve", "player", "titan-discovery-eve-v02.mp3"),
    candidate("titanDiscovery", "titan-sal-03", "sal", "narrator", "titan-discovery-sal-v03.mp3"),
    candidate("titanDiscovery", "titan-rex-04", "rex", "player", "titan-discovery-rex-v04.mp3"),
  ),
  comboRecord: family(
    candidate("comboRecord", "combo-rex-01", "rex", "player", "combo-record-rex-v01.mp3"),
    candidate("comboRecord", "combo-ara-02", "ara", "player", "combo-record-ara-v02.mp3"),
    candidate("comboRecord", "combo-sal-03", "sal", "player", "combo-record-sal-v03.mp3"),
    candidate("comboRecord", "combo-eve-04", "eve", "player", "combo-record-eve-v04.mp3"),
  ),
  inventoryCritical: family(
    candidate("inventoryCritical", "inventory-sal-01", "sal", "player", "inventory-critical-sal-v01.mp3"),
    candidate("inventoryCritical", "inventory-eve-02", "eve", "player", "inventory-critical-eve-v02.mp3"),
    candidate("inventoryCritical", "inventory-rex-03", "rex", "player", "inventory-critical-rex-v03.mp3"),
    candidate("inventoryCritical", "inventory-ara-04", "ara", "player", "inventory-critical-ara-v04.mp3"),
  ),
  starRelease: family(
    candidate("starRelease", "star-eve-01", "eve", "player", "star-release-eve-v01.mp3"),
    candidate("starRelease", "star-leo-02", "leo", "narrator", "star-release-leo-v02.mp3"),
    candidate("starRelease", "star-rex-03", "rex", "player", "star-release-rex-v03.mp3"),
    candidate("starRelease", "star-ara-04", "ara", "player", "star-release-ara-v04.mp3"),
  ),
});

export const EVENT_VOICE_FAMILY_IDS = Object.freeze(Object.keys(EVENT_VOICE_LIBRARY));
