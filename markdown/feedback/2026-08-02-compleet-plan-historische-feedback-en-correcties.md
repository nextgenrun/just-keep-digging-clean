# Normatieve bijlage — historische feedback en correcties

**Datum:** 2026-08-02  
**Hoofddocument:** 2026-08-02-compleet-playtester-feedback-veranderplan.md  
**Status:** planning-only

Deze bijlage hoort bij het complete veranderplan. Bij een inhoudelijk conflict is deze bijlage leidend voor geodesavecompatibiliteit en de classificatie van oudere solo-devfeedback.

## Correctie: geodes en oude saves

De geode-uitfasering vereist niet automatisch een nieuwe savemigratie.

Uitvoeringsregel:

1. Verwijder de resterende authored geodetegels aan de world/Tiled-bron.
2. Vervang ze door het normale lokale mijnmateriaal van hun diepteband, niet blind door AIR.
3. Audit daarna welke tile-, damage- of special-state daadwerkelijk in saves wordt bewaard.
4. Voeg alleen een versiegebonden migratie toe wanneer bestaande saves geodespecifieke persisted state bevatten.
5. Wanneer saves alleen generieke dug-state bewaren, volstaan bronvervanging, veilige defaults en een legacy-loadregressietest.

Acceptatie:

- een nieuwe wereld bevat nul GEODE_WALL en nul GEODE_INTERIOR;
- een oude save laadt zonder fout in de geodevrije wereld;
- eventuele geodespecifieke persisted state is veilig geneutraliseerd;
- caves, portals, townvloer en veilige landingzones blijven intact;
- er wordt geen fictieve migratielaag gebouwd voor data die niet wordt opgeslagen.

## Hoe historische self-feedback wordt behandeld

De bestanden in solo-dev-self-feedback beschrijven meerdere oudere builds. Ze zijn bruikbaar als regressie- en balancebacklog, maar zijn geen bewijs dat ieder punt nog actueel is.

De werkwijze is:

- reproduceer op de bevroren huidige build;
- noteer build, save, tile-id, diepte en exacte handeling;
- sluit een punt als resolved alleen met runtime- of contractbewijs;
- heropen een opgelost systeem niet omdat oude feedback nog in een tekstbestand staat;
- wijzig economy, portalpacing en onboarding niet gelijktijdig.

## Volledige historische disposition

| Oud feedbackpunt | Huidige interpretatie | Geplande actie | Gate |
|---|---|---|---|
| Te weinig gold/silver | worldgen/economybalans | meet vondsten per diepteband; tune pas na first-session- en portalbaseline | P2 |
| Gold/silver soms te vroeg | zeldzaamheid en dieptecurve zijn niet leesbaar | definieer expected rate per band en voeg distributiecontract toe | P2 |
| Te weinig sell tiles | aantal is niet hetzelfde als vindbaarheid of nut | meet spawn, bereikbare route en daadwerkelijk gebruik vóór een countwijziging | P2 |
| Te weinig gamble tiles | later special-tileprobleem, niet portalprobleem | houd achter eigen gate; meet gebruik en payoff na portalsplit | P2 |
| Gem Power-specialtile herstelt altijd alles | payoff schaalt mogelijk te grof | ontwerp vaste, leesbare hersteltiers per diepte en simuleer economy-impact | P2 |
| Vijf varianten voor special gem | contentverzoek met extra asset-/balancewerk | alleen uitvoeren als tieringtest aantoont dat één restorewaarde onvoldoende is | P3 |
| Quickslash vanaf level 1 | oude availabilitykeuze | valideer huidige gate en saveflow; geen vroege auto-unlock | P1 |
| Quickslash via Bobo | ability heeft een begrijpelijke bron nodig | koppel eerste introductie aan Bobo of een bewezen behoefte, niet alleen een levelnummer | P1 |
| Sprites draaien willekeurig verkeerd | facingstate lekt mogelijk tussen animaties | test transitions en herstel facing vanuit één autoriteit | P2 |
| Quickslash kijkt verkeerd | directionmappingbug | neem op in één animation-directionmatrix | P2 |
| Side/up/down dig verkeerd gespiegeld | directionmappingbug | test links, rechts, omhoog, omlaag en diagonaal per actie | P2 |
| Dig-downanimatie mist links/rechtsvariant | presentatievariatie | herstel alleen na frame- en inputstatebewijs | P2 |
| Wall-lean heeft ruimte tot muur | collider/sprite-uitlijning | frame- en collider-QA op beide richtingen | P2 |
| Wall-lean toont zwarte lijn | asset/frame-artifact | screenshotcontract en bronassetcorrectie | P2 |
| Earthquake kan speler opsluiten | recovery- en hazardsequencingprobleem | activeer pas na portalbegrip; test Flight, portal en unstuck na cave-in | P1 |
| Voorgestelde earthquake-tooltip/voiceline | probeert recovery te repareren met uitleg | geen forced hint; los route, portalvindbaarheid en world-space signalen op | besluit |
| Nieuwe digsounds moeten weg/rework | audiokwaliteit onduidelijk | A/B-audit per materiaal en impact; verwijder alleen zwakke variants | P2 |
| Underground particles gebruiken verkeerde variant | contextselectie ontbreekt | definieer surface/undergroundvariantcontract | P2 |
| Particles zichtbaar in gebouwen | culling/contextmask ontbreekt | interior visibilitymask en camera-overgangstest | P2 |
| Portal mist teleportsound | essentieel begripssignaal | toevoegen aan portal-activatieslice | P0 |
| Portal mist idle hum | nabijheids- en vindbaarheidssignaal | authored ruimtelijke hum met begrensde radius | P0 |
| Portal mist animatie | active/inactive state onvoldoende leesbaar | authored idle, activation en blijvende active state | P0 |
| Money Monster accepteert verkeerde resources | vendorautoriteit is onduidelijk | per resource één geldige verkoper en regressiontest | P1 |
| Nieuwe red-area resources horen bij eigen vendor | progressiongrens | startervendor filteren; red-area vendor pas bij relevante introductie | P1 |
| Flight shift-spam | mogelijk balansmisbruik | meet na portalherstel; Flightkosten niet tegelijk met onboarding wijzigen | P2 |
| Flight startup cost als oplossing | mogelijke inputfrictie | alleen prototype na meting van spam, korte correcties en GP-uptime | P2 |
| GP regenupgrade te goedkoop | economybalans | simuleer time-to-upgrade en flight uptime; prijs vanuit targettempo | P2 |
| GP tiles moeten vaste hoeveelheden geven | economy leesbaarder maken | combineer met hersteltiertest; geen instant full restore tenzij bewust zeldzaam | P2 |
| Star Pillar-upgrades te generiek | latere progressiekwaliteit | audit unieke sky-/route-effecten; geen popup herintroduceren | P3 |
| Willekeurige XP-tegel geeft circa 20× | mogelijke multiplier- of authored-tilebug | trace tile-id, diepte, modifiers en reward; voeg boundscontract toe | P1 |
| Willekeurige copper tile is onbreekbaar | blocker-, HP- of typecorruptie | hertest na geoderemoval; trace HP, modifier en toolstate indien aanwezig | P0/P1 |
| Sky Pillar UI/visuals onvoldoende | oudere presentatiefeedback | herbeoordeel huidige build visueel; alleen actuele verschillen opnemen | P3 |
| Hidden caves missen outer shell | authored/worldgenconsistentie | contracttest voor shell, ingang en darknessovergang | P2 |
| Hidden caves hebben geen betere loot | rewardtier mogelijk onduidelijk | meet actuele caverewards en tune alleen als verschil niet bestaat | P2 |
| Cavevisuals moeten meer als lichtgebrek voelen | visual direction | review darkness, torch response en silhouette op huidige build | P2 |
| Chests hadden geen interactie/loot | huidige checkout heeft reeds interactie/reward | behoud prompt-, reward- en saveregressietest; niet opnieuw ontwerpen | regressie |
| Underground background was zwart | oudere wereldvisualbug | screenshotcanary per biome/diepte; alleen heropenen bij huidige fout | regressie |
| Combo stopt zichtbaar bij 100 | displaycap los van combotimer | audit teller, damagecap en displaycap afzonderlijk; 6000 ms blijft vast | P2 |
| Geodes zichtbaar als lichtbron | systeem wordt verwijderd | geodelicht samen met geodeconsumer verwijderen | P0 |
| Sky tiles zichtbaar als lichtbron | kan behouden wereldtaal zijn | beoordeel via LightSystemcontract en darknessleesbaarheid | P2 |
| Thunder Strike doet minder damage dan normale hit | mogelijke scalingbug | deterministische damagevergelijking met dezelfde targetstate | P1 |
| Visuals na 1000 m onvoldoende | late-gamepolish | authored review per diepe biome nadat first-session gates slagen | P3 |
| Diepe dirt/gold/silver/bronzeverhouding onduidelijk | combinatie van visuals en resourcecurve | definieer biome-identiteit en distributie samen, niet als losse tiletune | P3 |
| Darkness wijst naar voeten | lichtfocus/camera-uitlijning | test idle, Flight en digging; richt op leesbare torso/headfocus | P2 |

## Geclusterde uitvoeringsslices

### Slice A — P0/P1 regressies

- resterende geodes en onbreekbare copper reproduceren;
- portal audio, hum en animatie samen met vroege portalroute;
- Money Monster-resourcefilter;
- XP-outlier;
- Thunder Strike-scaling;
- earthquake recovery nadat portals begrijpelijk zijn;
- Quickslash/Bobo-gate en savecompatibiliteit.

### Slice B — animation en visual correctness

- één facingmatrix voor alle dig- en abilityrichtingen;
- transitions en random flips;
- wall-leanalignering en assetartifact;
- darknessfocus;
- particlecontext en interiors.

Deze problemen worden samen aangepakt omdat losse flipfixes vaak door een andere animatiestate opnieuw worden overschreven.

### Slice C — economy en world distribution

- gold/silver rates per band;
- sell/gamble-tilegebruik;
- GP tile tiers;
- GP regenprijs;
- Flight startup-costhypothese;
- cave rewardtiers.

Deze slice start pas nadat portalcadans en de eerste sessie stabiel zijn. Anders verandert reistijd, resourcegebruik en kooptempo tegelijk.

### Slice D — late progression en authored polish

- Star Pillar-choicekwaliteit;
- diepe biomes na 1000 meter;
- sky-tile lichttaal;
- cavepresentation;
- eventuele extra GP-tilevarianten.

## Extra acceptatiecriteria

- iedere P0/P1 historische bug heeft een reproduceerbaar bewijs of een expliciete resolved-regressietest;
- geen oude feedbackregel blijft eeuwig “open” zonder buildstatus;
- animation QA dekt elke richting en relevante state transition;
- economywijzigingen rapporteren effect op time-to-upgrade, GP-uptime en runlengte;
- diepe visual polish begint niet vóór de eerste-sessiereleasegates uit het hoofddocument slagen;
- geen historische wens herintroduceert geodes, forced popups of meerdere vroege systemen.

