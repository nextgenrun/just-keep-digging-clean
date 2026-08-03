# Compleet veranderplan op basis van de playtesterfeedback

**Datum:** 2026-08-02  
**Status:** planning-only; nog geen gameplaycode gewijzigd  
**Doel:** alle terugkerende feedback vertalen naar één geordende aanpak, zonder nieuwe scope toe te voegen

## Besluiten die in dit plan vaststaan

Dit plan neemt de volgende productbesluiten als harde grenzen:

1. Geodes worden uitgefaseerd. We ontwerpen geen betere geode-uitleg, Heavy Punch-hint of vervangende geode-minigame. We maken de bestaande verwijdering alleen volledig en controleerbaar.
2. Portals zijn de structurele oplossing voor lange opstijgingen. Flight blijft de basisvaardigheid en noodroute; de speler hoeft niet standaard honderden meters handmatig terug te vliegen.
3. De comboduur blijft ongewijzigd. De oplossing is het verwijderen van automatisch openende, blokkerende UI, niet het pauzeren of verlengen van de combo.
4. Systemen worden geleidelijk geïntroduceerd. Een systeem dat technisch beschikbaar is, geldt pas als geïntroduceerd nadat de speler begrijpt waarom en wanneer hij het gebruikt.
5. Er komen voorlopig geen nieuwe brede systemen bij. Eerst moeten de eerste sessie, terugkeerroute, UI-rust en bestaande kernacties aantoonbaar werken.

Dit document vervangt daarmee drie eerdere aannames:

- De geode-feedback wordt niet opgelost met een toolhint, maar door de geodes volledig te verwijderen.
- De klacht over 93 seconden opstijgen wordt niet opgelost met een algemene Flight-snelheidsbuff, maar door een vroeg, vindbaar en bruikbaar portalnetwerk.
- De combo wordt niet beschermd door zijn timer tijdens modals stil te zetten; verplichte modals verdwijnen uit actieve gameplay.

## Kernconclusie

Borick zegt niet dat er letterlijk geen abilities, speciale blokken, portals of progressiesystemen bestaan. Hij beschrijft de versie van het spel die hij in dertig minuten daadwerkelijk heeft kunnen ervaren.

Voor hem bestond de loop hoofdzakelijk uit:

> mijnen → passief omhooggaan → menu's verwerken → opnieuw mijnen

De bedoelde variatie en versnelling kwamen niet betrouwbaar in zijn mentale model terecht:

- de vijf abilities zitten later in de progressie en kunnen de eerste dertig minuten dus niet met terugwerkende kracht interessanter maken;
- portals bestaan, maar hun plaatsing, vrijgave en uitleg garanderen niet dat een nieuwe speler ze ontdekt en als normale terugkeerroute begrijpt;
- veel systemen bestaan, maar meerdere worden tegelijk beschikbaar, terwijl de speler de basisloop nog niet zelfstandig heeft bewezen;
- automatische UI onderbreekt precies de actieve miningflow die het spel interessant moet maken;
- “ga dieper” is een geldig hoofddoel, maar krijgt nog niet genoeg concrete doelen, omslagpunten en zichtbare beloftes per sessie.

De werkelijke fout is daarom geen tekort aan content. Het is een probleem van volgorde, bereikbaarheid, zichtbaarheid en causale feedback.

## Wat de huidige runtime-audit laat zien

De onderstaande bevindingen komen uit de huidige lokale default-worldsnapshot. Ze zijn een diagnose van deze checkout, geen universele productiestatistiek.

### Geodes zijn logisch losgekoppeld, maar nog niet volledig verdwenen

- De procedurele world-generationroute roept geen geodegenerator meer aan.
- De huidige worldsnapshot bevat desondanks nog 490 GEODE_WALL-tegels, vanaf ongeveer 2 meter diep.
- Er zijn geen GEODE_INTERIOR-tegels in diezelfde snapshot.
- Config, tiletypes, renderer-, asset-, test- en documentatiereferenties bestaan deels nog.
- De resterende muren lijken uit de authored/Tiled-worldoverride te komen. Dat moet bij uitvoering aan de bron worden bevestigd.

Conclusie: de verwijdering is begonnen, maar “geen nieuwe geodes genereren” is nog niet hetzelfde als “de speler kan nergens meer een geode-restant tegenkomen”.

### Portals bestaan vroeg, maar vormen nog geen gegarandeerde vroege route

De huidige snapshot bevat 84 portaltegels. Vroege voorbeelden:

| Diepte | X-positie | Horizontale afstand vanaf start-X 4 |
|---:|---:|---:|
| 30 m | 77 | 73 tegels |
| 45 m | 200 | 196 tegels |
| 47 m | 114 | 110 tegels |
| 49 m | 38 | 34 tegels |
| 72 m | 100 | 96 tegels |
| 86 m | 44 | 40 tegels |
| 87 m | 23 | 19 tegels |
| 145 m | 14 | 10 tegels |

Alleen het bestaan van een portal op 30 meter bewijst dus niet dat een speler die tijdens zijn normale eerste afdaling tegenkomt.

Er is bovendien een belangrijk conflict:

- portals liggen al vóór 80 meter in de wereld;
- de featuregate voor special tiles, waaronder portals, wordt pas rond 80 meter actief;
- vóór die gate kan een zichtbare portal daardoor zonder prompt of geldige interactie bestaan.

Dat verklaart rechtstreeks waarom een tester de handmatige opstijging beoordeelt, terwijl portals technisch al in het spel zitten. Het bedoelde alternatief was voor hem niet vindbaar, niet bruikbaar of niet begrijpelijk genoeg.

### De eerste terugkeer ontgrendelt nog te veel tegelijk

De huidige introductieconfig maakt na de eerste terugkeer nog zeven zichtbare lagen beschikbaar:

- Gem Power Merchant;
- campfire;
- clock;
- journey;
- map;
- milestones;
- combo-HUD.

Weather draait nu als ambient systeem en staat niet meer in deze bundel. Dat is een verbetering ten opzichte van de eerdere analyse, maar zeven nieuwe begrippen op één betekenisvol moment blijft te veel.

### Popup-removal is begonnen, maar de blokkadeproducenten zijn nog niet allemaal weg

Al verwijderd of uitgeschakeld:

- automatische Star Discovery-productie;
- automatisch openen van de Star Pillar bij de eerste ster;
- normale Escape-pause tijdens actief spel;
- floating text;
- notification carousel.

Nog relevant in de huidige architectuur:

- level-upkeuzes kunnen nog automatisch als blokkerende popup openen;
- depth gates openen nog automatisch een modale bevestiging;
- uitgeschakelde notification calls worden nog gebruikt alsof zij essentiële uitleg afleveren;
- oude Star-popupbestanden, instellingen en documentatie kunnen als regressierisico blijven bestaan.

### Er zijn twee openingsconcepten, maar slechts één is actief

- First Five Minutes is actief en begeleidt move, dig, sell, upgrade, Flight en de upgrade-payoff.
- Opening Flight Artifact is als hoofdfeature uitgeschakeld, ook al staat de onderliggende Golden Five-config nog aan.

Dit betekent dat we First Five Minutes als huidige onboarding-authoriteit moeten verbeteren. De uitgeschakelde artifactroute mag niet per ongeluk als tweede tutorial worden gereactiveerd.

## Waar spelers afhaken

### Drop-off 1: vóór de eerste betekenisvolle actie

Signalen:

- Fnab: “traag, onduidelijk, VEEL”;
- Kimmo had coaching nodig om te weten wat hij moest doen en hoe hij moest graven;
- de speler ziet systemen, meters en beloftes voordat hij een eenvoudige oorzaak en gevolg-relatie voelt.

Onderliggende oorzaak:

- de eerste intentie is niet altijd sterker dan de hoeveelheid zichtbare interface;
- uitleg wordt soms geleverd als informatie, niet als één concrete handeling;
- een marker is pas succesvol als de speler zonder stemcoaching de juiste actie uitvoert.

### Drop-off 2: na de eerste dig, vóór begrip van de loop

Signalen:

- spelers begrijpen niet waarom ze verkopen, upgraden en terugkeren;
- prijs, effect en volgende beloning zijn niet altijd direct vergelijkbaar;
- de tutorial noemt de core loop geleerd voordat een echte afdaling en zelfstandige terugkeer zijn uitgevoerd.

Onderliggende oorzaak:

- het spel bewijst afzonderlijke knoppen, maar nog niet altijd de volledige lus;
- een enkele Flight-input is geen bewijs dat de speler weet hoe hij na een expeditie thuiskomt;
- “upgrade gekocht” is zwakker dan “dezelfde tegel breekt nu zichtbaar sneller”.

### Drop-off 3: bij de eerste echte afdaling

Signalen:

- Fnab en Kimmo dachten dat ze vastzaten of vroegen hoe ze terug moesten;
- Frank vond klimmen en gaten onduidelijk;
- Borick ervoer opstijgen als wachten.

Onderliggende oorzaak:

- Flight is wel een mechaniek, maar een succesvolle handmatige retourvlucht wordt nog niet als gedragsdoel bewezen;
- de eerste portal is niet gegarandeerd op de route;
- vroege portals kunnen bestaan voordat hun interactiesysteem beschikbaar is;
- Return To Safety met verlies kan eruitzien als de normale oplossing, terwijl het alleen een laatste redmiddel hoort te zijn.

### Drop-off 4: na de eerste terugkeer

Signalen:

- “VEEL”;
- invasieve UI;
- combo verloren door een keuze;
- meerdere nieuwe menu's zonder duidelijke noodzaak.

Onderliggende oorzaak:

- beschikbaarheid wordt verward met onboarding;
- de eerste terugkeer is een populaire plaats geworden om achterstallige systemen tegelijk vrij te geven;
- automatisch getoonde keuzes concurreren met actieve miningflow.

### Drop-off 5: tussen ongeveer tien en dertig minuten

Signalen:

- doel blijft “dieper” zonder een duidelijke nabije climax;
- de ervaren mininghandeling varieert onvoldoende;
- de returnfase bevat passieve tijd;
- opnieuw laden van grote menu's voelt onbetrouwbaar of onaf;
- de speler heeft abilities mogelijk nog niet gezien.

Onderliggende oorzaak:

- de sessie heeft nog te weinig herkenbare hoofdstukken;
- bestaande variatie is te laat, te verborgen of niet gekoppeld aan een probleem dat de speler net voelde;
- technische wachttijd versterkt het beeld van een onsamenhangende verzameling systemen.

## Ontwerpcontract voor de eerste sessie

De eerste sessie moet niet alle systemen tonen. Zij moet vier dingen bewijzen:

1. Ik kan zelfstandig graven.
2. Mijn buit en upgrades veranderen mijn volgende afdaling merkbaar.
3. Ik weet altijd hoe ik thuiskom.
4. Ik heb een concrete reden om nog één keer af te dalen.

De speler ziet steeds:

- één huidige actie;
- één volgende belofte;
- hoogstens één nieuw primair systeem per expeditie of terugkeer.

Ambient systemen mogen al simuleren wanneer zij geen begrip, beslissing of extra HUD vragen. Zichtbare of interactieve systemen worden pas onthuld wanneer zij een probleem oplossen dat de speler al heeft gevoeld.

## Gefaseerd veranderplan

## Fase 0 — Maak de huidige scope eerlijk en meetbaar

### 0.1 Bevries één playtestbaseline

Acties:

- wijs één build, saveprofiel en worldseed aan voor vergelijking;
- leg huidige tijden vast voor first dig, first sale, first upgrade, first manual return, first portal en second descent;
- registreer welke systemen zichtbaar, beschikbaar en daadwerkelijk gebruikt zijn;
- verander tijdens een testronde niet tegelijk worldgen, onboarding en economie.

Acceptatie:

- iedere voor/na-playtest gebruikt dezelfde startcondities;
- historische bugs, reeds opgeloste bugs en huidige regressies staan apart;
- feedback kan aan een concrete build worden gekoppeld.

### 0.2 Voltooi de al lopende geode-uitfasering

Acties:

- zoek de definitieve bron van alle resterende GEODE_WALL-tegels;
- verwijder geodes uit de authored Tiled-bron en regenereer de worldoverride;
- verwijder pas daarna ongebruikte config, tiletypes, rendererpaden, assets, tests en documentatie;
- archiveer verwijderde visuele assets wanneer herkomst of later herstel nog relevant is;
- voeg een savemigratie toe voor bestaande saves met geode-restanten;
- normaliseer een legacy geodetegel naar het lokale, normale mijnmateriaal van die laag, niet blind naar AIR;
- controleer dat portalroutes, caves en veilige landingzones niet door de migratie worden beschadigd.

Acceptatie:

- een nieuwe wereld bevat exact nul GEODE_WALL en nul GEODE_INTERIOR;
- een oude save laadt zonder fout en bevat na migratie geen geodetegels;
- geen geodeconfig of Heavy Punch-geodespecialcase draait nog in productie;
- er worden geen nieuwe mechanics gemaakt om een verwijderd systeem uit te leggen.

### 0.3 Maak een definitieve interruption inventory

Classificeer ieder UI-pad:

| Klasse | Voorbeeld | Richting |
|---|---|---|
| Automatisch en blokkerend | level-upkeuze, depth-gatemodal | verwijderen uit actieve gameplay |
| Automatisch en niet-blokkerend | wereld-FX, kort geluid, objectanimatie | toegestaan als het geen actie vraagt |
| Door speler geopend | shop, map, talents, campfire | behouden |
| Terminal of veiligheidskritisch | death, destructieve reset, unstuck-bevestiging | behouden, sober uitvoeren |

Acceptatie:

- iedere modale view heeft een bekende producer en reden;
- er opent geen keuzemenu doordat de speler tijdens mining toevallig een drempel bereikt;
- uitgeschakelde notifications zijn niet langer de enige drager van essentiële informatie.

## Fase 1 — Maak van onboarding één bewezen loop

### 1.1 Behoud één onboarding-authoriteit

Acties:

- gebruik First Five Minutes als actieve route;
- houd Opening Flight Artifact uitgeschakeld zolang het niet expliciet de gekozen vervanger is;
- verwijder of archiveer na besluitvorming dubbele, dode openingspresentatie zodat deze niet per ongeluk terugkeert;
- centraliseer onboardingstatus in één savecontract.

Acceptatie:

- een nieuwe speler kan nooit twee openingsflows tegelijk krijgen;
- een rollback activeert een volledige bekende route, geen hybride;
- save/load hervat exact de juiste huidige stap.

### 1.2 Verander “knoppen gezien” naar “lus bewezen”

Voorgestelde gedragsstappen:

1. loop naar één gemarkeerde mijnaanzet;
2. breek één blok;
3. verkoop concrete buit;
4. koop de gefocuste starterupgrade;
5. breek een vergelijkbaar blok en voel het breakpoint;
6. daal zelfstandig minstens 10–15 meter af;
7. vlieg zelf terug naar de town/surface;
8. start vrijwillig een tweede afdaling.

De huidige completioncopy “CORE LOOP LEARNED” mag pas na stap 7 of 8 verschijnen. Na alleen move, dig, sell, upgrade en één Flight-input is “BASICS READY” eerlijker.

Acceptatie:

- Flight geldt pas als geleerd na een echte afdaling en terugkeer;
- de speler voltooit de basis zonder verbale coaching;
- de tutorial gebruikt één marker en één Next Promise, geen serie popups;
- de speler ervaart de upgrade op hetzelfde materiaal vóór en na aankoop.

### 1.3 Maak Return To Safety duidelijk een laatste redmiddel

Acties:

- laat Flight de eerste normale retourmethode zijn;
- introduceer portals daarna als de efficiënte normale methode;
- toon Return To Safety alleen na spelerinitiatief of wanneer een echte stuck-detectie dat rechtvaardigt;
- leg het verlies vóór bevestiging compact uit;
- gebruik het niet als antwoord op een slecht vindbare portal.

Acceptatie:

- testers noemen Flight of portal als eerste antwoord op “hoe kom je terug?”;
- niemand denkt dat 50 procent verlies standaard onderdeel van iedere run is;
- unstuck blijft beschikbaar voor echte geometrische of saveproblemen.

## Fase 2 — Maak de eerste portal onvermijdelijk begrijpelijk

### 2.1 Splits portals los van de algemene special-tilegate

Acties:

- geef portals een eigen feature-id en introductiestatus;
- laat chests, gamble tiles en andere speciale objecten later onder hun eigen gate vallen;
- maak iedere zichtbare vroege portal meteen interacteerbaar;
- verwijder de toestand waarin een object eruitziet als een portal maar geen prompt of reactie heeft.

Acceptatie:

- geen portal is zichtbaar vóór zijn interactielogica beschikbaar is;
- de eerste portal kan vóór 80 meter worden geactiveerd;
- het openen van portals ontgrendelt niet automatisch alle andere special tiles.

### 2.2 Garandeer een eerste portal op de geleerde route

Voorgesteld plaatsingscontract:

- de speler doet eerst één handmatige Flight-retour;
- de eerste portal ligt tijdens de volgende normale afdaling rond 40–60 meter;
- hij ligt maximaal ongeveer 8–12 bereikbare horizontale/path-tegels van de aangeleerde starterroute;
- hij heeft een veilige stand-, landings- en interactiepositie;
- er staan geen verwijderde geodes, onbreekbare muren of andere onverklaarde blockers tussen route en portal;
- de worldgenerator valideert bereikbaarheid, niet alleen aantallen per diepteband.

Waarom geen portal direct op 5 meter:

- dan leert de speler Flight nooit als basale veiligheidsvaardigheid;
- de portal voelt als een tutorialknop in plaats van als een gevonden infrastructuur;
- een handmatige eerste retour maakt de latere tijdwinst begrijpelijk en bevredigend.

Acceptatie:

- iedere geldige nieuwe wereld biedt vóór 60 meter een bereikbare en bruikbare eerste portal;
- de speler hoeft niet breed en willekeurig door een 280-tegels brede wereld te zoeken;
- er bestaat een automatische contracttest voor afstand, bereikbaarheid en veilige landing.

### 2.3 Leer de portal zonder modal

Presentatielaag:

- gebruik het bestaande authored portalbeeld, licht, animatie en geluid;
- geef binnen een beperkte nabijheidsradius een herkenbaar wereldsignaal;
- laat Next Promise na de eerste handmatige terugkeer verwijzen naar een “return route”;
- toon de bestaande interactieprompt alleen wanneer de speler werkelijk kan interacteren;
- laat activatie de portal visueel permanent veranderen;
- wijzig direct de Next Promise naar de volgende concrete actie.

Niet doen:

- geen full-screen “portal unlocked”-popup;
- geen globale pijl vanaf de oppervlakte door de hele wereld;
- geen notification carousel opnieuw aanzetten;
- geen lange uitleg vóór de speler het object ziet.

Acceptatie:

- een blinde tester benoemt het object als terugkeerroute zonder externe uitleg;
- de speler ziet, hoort en begrijpt dat activatie permanent effect heeft;
- portalstatus blijft correct na save/load.

### 2.4 Maak de tweerichtingsloop fysiek zichtbaar

Acties:

- eerste ondergrondse activatie brengt de speler veilig naar de bestaande sky/surface-route;
- de ontsloten surface portal is in de wereld zichtbaar en interacteerbaar;
- die surface portal is de primaire manier om weer diep te hervatten;
- Quick Resume mag als gemak blijven, maar niet als verborgen enige uitleg in een pauzemenu;
- de vier-diepste-portalsregel blijft behouden tenzij latere data een probleem toont.

Acceptatie:

- speler gebruikt na activatie minstens één keer de surface portal terug naar beneden;
- speler kan na een dag pauze de route opnieuw vinden;
- geen teleports eindigen in een blok, hazard of onbereikbare cel;
- FIFO/diepste-slotgedrag en saveherstel blijven intact.

### 2.5 Valideer latere portalcadans langs routes

Acties:

- meet de maximale afstand in diepte én padlengte tussen bruikbare portals;
- valideer per betekenisvolle route/band, niet alleen gemiddeld over de hele wereldbreedte;
- zorg dat een speler na het eerste netwerk niet opnieuw 93 seconden passief hoeft te stijgen;
- behoud Flight voor lokale correcties, verkenning en het bereiken van een portal.

Voorlopige testgrens:

- geen normale retour na portalontgrendeling bevat meer dan ongeveer 20 seconden ononderbroken passieve opstijging;
- stel de definitieve cadans bij op basis van reistijdmetingen, niet op gevoel alleen.

## Fase 3 — Verwijder verplichte onderbrekingen zonder rewards te verliezen

### 3.1 Bank level-upkeuzes

Acties:

- zet iedere verdiende keuze als pending reward in PlayerLevelSystem;
- sla aantal, bronlevel en geldige opties deterministisch op;
- open nooit automatisch een keuzeview tijdens movement, mining, Flight of combat;
- laat de speler pending keuzes claimen via een bewust geopende upgrade/town-interface;
- toon alleen een subtiele, niet-blokkerende state change dat er een keuze klaarstaat;
- ondersteun meerdere verdiende keuzes en save/load;
- verwijder de oude auto-openproducent pas nadat het nieuwe claimpad volledig werkt.

Acceptatie:

- dertig minuten normaal spelen veroorzaakt nul automatische level-upmodals;
- geen reward gaat verloren als de speler meerdere levels tegelijk krijgt;
- pending keuzes blijven na reload bestaan;
- de comboduur blijft exact op de huidige waarde van 6000 ms;
- vrijwillig een menu openen mag de flow beëindigen; het spel dwingt dat moment niet af.

### 3.2 Verplaats depth gates naar de wereld

Acties:

- vervang automatische drempelmodals door een herkenbaar wereldobject, grenssignaal of expliciete interactie;
- gebruik Next Promise om het risico of de vereiste kort te noemen;
- vraag alleen bevestiging nadat de speler zelf de gate activeert;
- maak doorgaan en terugkeren beide fysiek duidelijk.

Acceptatie:

- een dieptedrempel opent nooit uit zichzelf een modal;
- de speler begrijpt vóór het passeren wat verandert;
- save/load midden bij een gate veroorzaakt geen herhaalde blokkade.

### 3.3 Ruim popuprestanten aan de producerzijde op

Acties:

- verifieer dat StarDiscoveryPopupView en policy geen levende consumer meer hebben;
- verwijder of archiveer daarna view, policy, settings en verouderde documentatie samen;
- verwijder essentiële boodschappen uit uitgeschakelde notification calls;
- routeer blijvende informatie naar Next Promise, het object zelf of een speler-geopend journal.

Acceptatie:

- geen dode setting kan een oude popup opnieuw activeren;
- progressie, rewards en handmatige Star Pillar-interactie blijven behouden;
- UI-removal verandert geen gameplaywaarden.

## Fase 4 — Introduceer systemen op behoefte, niet in bundels

### 4.1 Splits de eerste-returnbundel

Voorgestelde volgorde:

| Moment | Primair nieuw begrip | Wat nog verborgen blijft |
|---|---|---|
| Eerste townproof | verkopen, starterupgrade, Flight | map, journey, milestones, campfire |
| Eerste handmatige retour | GP/Flight-economie indien nodig | portalcontrols tot de volgende afdaling |
| Eerste portal gevonden | portal activeren en surface route | chests en andere special tiles |
| Tweede zelfstandige expeditie | combo-HUD, pas wanneer combo ontstaat | map/journey niet tegelijk openen |
| Eerste routekeuze | map | milestones/journey alleen als volgende behoefte |
| Eerste echt risico of buffbehoefte | campfire of gear | niet beide tegelijk introduceren |
| Latere dieptebanden | constellation, cave, hazard, relic, titan, abilities | volgens één-primaire-laagregel |

Weather mag ambient blijven zolang het geen extra uitleg of UI eist.

Acceptatie:

- maximaal één primair nieuw systeem per expeditie of terugkeer;
- een systeem kan technisch draaien zonder zichtbaar geïntroduceerd te zijn;
- iedere introductie heeft een aanleiding die de speler net heeft ervaren;
- fallback-dieptes voorkomen softlocks, maar zijn niet de normale leermethode.

### 4.2 Meet drie staten per systeem

Voor ieder systeem worden afzonderlijk bijgehouden:

1. beschikbaar;
2. voor het eerst gezien of gebruikt;
3. aantoonbaar begrepen.

“Begrepen” wordt tijdens playtests vastgesteld met een korte open vraag, niet afgeleid uit alleen een klik.

Acceptatie:

- het team kan zien waar een systeem beschikbaar was maar nooit ontdekt werd;
- introductiediepte wordt bijgesteld op werkelijk gebruik;
- een onzichtbaar later systeem wordt niet gebruikt om vroege feedback weg te redeneren.

### 4.3 Laat de eerste dertig minuten zonder abilities werken

De vijf abilities zijn geen antwoord op Boricks vroege ervaring als hij ze nog niet kon bereiken. Daarom:

- de basisminehandeling, upgrade-payoff en portalroute moeten zonder abilities voldoende duidelijk en prettig zijn;
- abilities blijven later gelaagd zolang zij extra cognitieve belasting vormen;
- alleen als een geïsoleerde test aantoont dat één active tool de kernhandeling fundamenteel verbetert, kan die ene tool eerder als onderdeel van de kernkit worden overwogen;
- de overige abilities blijven dan later.

Acceptatie:

- testers vinden een tweede afdaling aantrekkelijk zonder dat zij vijf abilitymenu's hoeven te leren;
- abilities lossen later herkenbare problemen op in plaats van als losse content te verschijnen.

## Fase 5 — Versterk de kernloop zonder nieuwe bloat

### 5.1 Maak “ga dieper” een leesbaar doel

“Dieper graven” hoeft niet vervangen te worden door een eindbaas. Het moet op drie niveaus zichtbaar zijn:

- **North Star:** graaf dieper dan ooit;
- **sessiedoel:** bereik een concrete diepte, activeer een portal of bereik een nieuw gebied;
- **Next Promise:** benoem de eerstvolgende tastbare payoff.

Eerste-sessieboog:

1. leer de basis;
2. voltooi een handmatige retour;
3. vind en activeer de eerste portal;
4. gebruik de surface portal terug;
5. bereik één onderscheidende wereldontdekking of upgrade-breakpoint;
6. eindig met een duidelijke belofte voor de volgende diepteband.

Acceptatie:

- na 5, 15 en 30 minuten kan een tester in eigen woorden zeggen wat hij nu doet en waarom;
- “dieper” heeft altijd een nabije concrete mijlpaal;
- er wordt geen extra verhaal- of menusysteem toegevoegd om dit uit te leggen.

### 5.2 Behoud bewezen positieve hooks

Playtesters noemden expliciet:

- upgrades;
- cave-ins en wereldreacties;
- de ambitie en het “sick dat je dit hebt gebouwd”-gevoel.

Daarom:

- bescherm het directe upgrade-breakpoint;
- houd cave-ins als betekenisvolle wereldreactie;
- zorg dat polish en verwijderingen deze sterke momenten niet stil maken;
- verwijder alleen systemen nadat runtimeconsumers, rewards en progressie zijn getraceerd.

### 5.3 Maak upgrades economisch en fysiek vergelijkbaar

Acties:

- toon in het bestaande shopvlak prijs, huidige middelen, betaalbaarheid en concreet effect samen;
- gebruik begrijpelijke voorspellingen zoals “Dirt: 3 hits → 2”;
- laat verkoopwaarde zichtbaar zijn op het moment dat de speler verkoopt;
- voorkom een nieuwe tutorialpopup of extra encyclopediemenu.

Acceptatie:

- tester kan vóór aankoop uitleggen wat hij betaalt en wat verandert;
- tester merkt het effect binnen de eerstvolgende handeling;
- prijzen en effecten komen uit de bestaande single source of truth.

### 5.4 Prototypeer pas daarna één nieuwe interactievariant

Boricks Warframe-QTE is een richting, geen kant-en-klare oplossing. Na het slagen van de eerdere gates:

- kies één bestaand, behouden speciaal blok;
- maak één world-space interactievariant met een duidelijk andere timing of keuze;
- test deze geïsoleerd zonder nieuw menu, currency of progression tree;
- vergelijk plezier, begrijpelijkheid en onderbreking met normaal mining;
- behoud hem alleen als hij de kernhandeling aantoonbaar verrijkt.

Niet doen:

- geodes opnieuw uitvinden;
- meteen meerdere QTE's bouwen;
- een minigame toevoegen die iedere miningactie vertraagt;
- een nieuw systeem gebruiken om slechte basisfeedback te maskeren.

## Fase 6 — Herstel technisch vertrouwen

### 6.1 Reproduceer de Main Menu TypeError

Acties:

- vraag Boricks screenshot en volledige console-stack op;
- reproduceer exact vanuit de genoemde betabuild en dezelfde route;
- test save-in-flight, scene cleanup, dubbele input en ontbrekende systemen;
- voeg een regressietest toe voor gameplay → main menu → continue/new game;
- maak geen root-causeclaim zonder stack of reproduceerbaar pad.

Acceptatie:

- teruggaan naar Main Menu geeft nul uncaught errors;
- de save is intact;
- opnieuw starten creëert geen dubbele listeners, views of systemen.

### 6.2 Stop herladen van zware views binnen dezelfde sessie

Acties:

- meet first-open en reopen van Star Chart en Titans;
- bepaal welke textures/assets na vijf seconden worden vrijgegeven;
- houd kerninterface-assets na eerste gebruik sessieresident of gebruik een ruimere graceperiode;
- behoud expliciete memory-budget- en destroyregels bij scene exit;
- toon geen generieke loadingstate bij iedere heropening als de data al aanwezig is.

Acceptatie:

- een heropening binnen dezelfde sessie voelt onmiddellijk;
- geen herhaalde netwerk- of decodecyclus voor ongewijzigde assets;
- memorygebruik blijft binnen een vooraf gemeten budget;
- scene cleanup blijft correct.

### 6.3 Bewaak saves en migraties

Minimaal te testen:

- legacy geodes;
- pending level-upkeuzes;
- eerste portal geactiveerd/niet geactiveerd;
- surface portal ontgrendeld;
- vier diepste portals;
- tutorial midden in iedere gedragsstap;
- feature-introductiestatus;
- terugkeer naar main menu.

Acceptatie:

- iedere wijziging heeft een expliciete saveversie of backwards-compatible default;
- geen reward wordt dubbel toegekend;
- geen tutorial of popup herhaalt zich eindeloos na load.

## Volledige feedback-dekkingsmatrix

| Feedback | Interpretatie | Planbesluit | Prioriteit |
|---|---|---|---|
| Fnab: traag, onduidelijk, veel | te veel zichtbare concepten vóór bewezen loop | één actie, één belofte, één primair systeem per run | P0 |
| Fnab/Kimmo: wat moet ik doen? | eerste intentie niet zelfstandig leesbaar | één onboarding-authoriteit en gedragsgates | P0 |
| Kimmo: hoe graaf ik? | marker/input nog niet autonoom genoeg | first-digtest zonder coaching | P0 |
| Fnab/Kimmo: hoe kom ik terug? | Flight niet als echte retour bewezen; portal niet betrouwbaar gevonden | handmatige retour gevolgd door gegarandeerde eerste portal | P0 |
| Frank: klimmen onduidelijk | recoverymentalmodel ontbreekt | Flightproof, portalroute en last-resortonderscheid | P0 |
| Frank: random onbreekbare blokken | geoderestanten of andere blocker zonder uitleg | geodes volledig verwijderen; overige blockers langs route auditen | P0 |
| Frank: gaten bij shop/town | angst voor permanente val of slechte herstelroute | townveiligheidscontract en leesbare afdaling | P1 |
| Frank: prijzen onduidelijk | aankoop en payoff niet naast elkaar | prijs, betaalbaarheid en breakpoint in bestaande shop | P1 |
| Frank: upgrades goed | bewezen hook | beschermen en sneller voelbaar maken | behouden |
| Frank: cave-ins goed | wereld reageert bevredigend | behouden en als kernvariatie gebruiken | behouden |
| Borick: einddoel onduidelijk | “dieper” mist nabije hoofdstukken | North Star, sessiedoel en Next Promise | P1 |
| Borick: UI invasief/combo kwijt | verplichte beslissingen onderbreken flow | auto-popupproducenten weg; choices banken; timer ongewijzigd | P0 |
| Borick: wereldinteractie basic | ervaren kernverb heeft te weinig vroege variatie | eerst basis en portal fixen; daarna één world-space prototype | P2 |
| Borick: omhoogvliegen is wachten | portalnetwerk bestaat niet in zijn mentale model | vroege vindbare portal, fysieke surface route, cadansmeting | P0 |
| Borick: menus herladen | technische wachttijd schaadt polish | sessiecache en reopenmeting | P1 |
| Borick: Main Menu TypeError | vertrouwenbrekende fout | stack opvragen, reproduceren, regressietest | P0 |
| Borick: overscoped | breedte verdringt samenhang en polish | breadth freeze tot gates slagen | P0 |
| Borick: maak kleinere game | diagnose is focusgebrek, voorschrift is niet verplicht | huidige game niet schrappen; eerste sessie als kleine verticale slice behandelen | besluit |
| Borick: Unreal Blueprinting | enginewissel lost sequencing niet op | Phaser behouden; prototypes klein en geïsoleerd houden | geen actie |
| Borick: Warframe mining-QTE | vraag om variatie, niet letterlijk om dit systeem | later één gecontroleerd prototype, geen geode-revival | P2 |
| Mila: er zijn vijf abilities | waar, maar vermoedelijk buiten zijn bereik | eerste 30 minuten moeten zonder die kennis werken | P1 |
| Mila: geodes gaan weg | productbesluit | removal afronden en testen, geen geodefix ontwerpen | P0 |
| Mila: portals lossen ascent op | juiste systeembedoeling | discovery, gating, bereikbaarheid en tweerichtingsgebruik fixen | P0 |
| Mila: forced popups gaan weg | juiste productrichting | removal compleet maken zonder combo-aanpassing | P0 |
| Mila: systemen beter lagen | huidige richting, bundel nog te groot | availability, seen en understood scheiden | P0 |

## Uitvoeringsvolgorde

De aanbevolen volgorde is afhankelijkheidsgedreven:

1. baseline vastleggen en geoderemoval afronden;
2. alle auto-popup- en notificationproducenten inventariseren;
3. één onboarding-savecontract kiezen;
4. echte manual-returngedragsgate toevoegen;
5. portal loskoppelen van special tiles;
6. eerste portalplaatsing en bereikbaarheid garanderen;
7. surface-portalroute en saveherstel valideren;
8. level-upchoices banken en depth gates speler-geïnitieerd maken;
9. first-returnbundel opsplitsen;
10. shops/effectfeedback verduidelijken;
11. Main Menu-fout en assetreopens oplossen;
12. pas daarna één miningvariatie prototypen.

Waarom deze volgorde:

- geoderestanten kunnen portalroutes en blockerfeedback vervuilen;
- onboarding moet Flight eerst bewijzen voordat portals de efficiënte upgrade worden;
- portalontdekking moet werken voordat we reistijd of Flighttempo beoordelen;
- interruption removal moet vóór nieuwe interactievariatie gebeuren;
- technische en pacingresultaten zijn alleen betrouwbaar op een stabiele slice.

## Playtest- en meetplan

### Instrumentatie

Registreer lokaal en privacyvriendelijk:

- tutorial_stage_entered;
- first_valid_dig;
- first_sale;
- first_upgrade;
- upgrade_payoff_tile_broken;
- manual_descent_depth;
- manual_flight_return;
- portal_within_reveal_range;
- portal_prompt_seen;
- portal_activated;
- surface_portal_used;
- quick_resume_used;
- return_to_safety_used;
- pending_choice_earned;
- pending_choice_claimed;
- auto_modal_opened;
- system_available;
- system_first_seen;
- system_first_used;
- active_mining_time;
- ascent_time;
- menu_time;
- main_menu_exit_result.

Telemetrie bewijst gedrag, niet begrip. Na 5, 15 en 30 minuten worden daarom open vragen gesteld:

- Wat probeer je nu te bereiken?
- Hoe ga je straks terug?
- Wat levert de volgende upgrade of diepteband op?
- Welk systeem heb je net geleerd en waarom zou je het gebruiken?

### Testrondes

Gebruik per ronde minimaal vijf nieuwe spelers:

- geen voice coaching;
- dezelfde bevroren build en startconditie;
- maximaal dertig minuten;
- noteer het eerste moment van twijfel, niet alleen het moment van stoppen;
- laat de speler hardop denken;
- geef pas na een duidelijke block hulp en label die run als assisted.

### Voorlopige releasegates

Een build gaat pas door naar nieuwe content wanneer:

- 5 van 5 spelers zonder hulp een geldige eerste dig uitvoeren;
- minstens 4 van 5 verkopen, upgraden en de payoff voelen;
- minstens 4 van 5 een handmatige eerste retour uitvoeren;
- minstens 4 van 5 de eerste portal vóór of rond 60 meter vinden en activeren;
- minstens 4 van 5 de surface portal terug naar beneden gebruiken;
- minstens 4 van 5 vrijwillig een tweede expeditie starten;
- geen speler zegt dat hij vastzit zonder te weten hoe hij terugkomt;
- er nul automatische modals tijdens actieve gameplay openen;
- de comboduur nog 6000 ms is;
- een nieuwe en gemigreerde wereld nul geodetegels bevat;
- Main Menu nul uncaught errors geeft.

De exacte minuutdoelen worden na de baseline bevestigd. Een bruikbare eerste richtlijn:

- eerste dig binnen 45 seconden;
- eerste verkoop en upgrade binnen 4 minuten;
- echte handmatige retour binnen 7 minuten;
- eerste portal gezien en geactiveerd binnen ongeveer 12–18 minuten of uiterlijk rond 60 meter;
- tweede vrijwillige afdaling vóór 20 minuten.

## Risico's en beheersing

### Portal te vroeg

Risico: Flight voelt overbodig.

Beheersing: vereis één handmatige retour vóór de portalbelofte en plaats de eerste portal in de tweede normale afdaling.

### Portal nog steeds toevallig

Risico: een diepteband bevat een portal, maar niet op de route van de speler.

Beheersing: valideer bereikbare path distance vanaf de startercorridor en niet alleen worldcount.

### Verwijderde popups verbergen rewards

Risico: de onderbreking verdwijnt, maar de speler merkt de beloning niet.

Beheersing: bank rewards, verander blijvende state zichtbaar en laat de speler bewust claimen.

### Te agressieve systeemgating

Risico: de wereld voelt leeg of bestaande spelers verliezen functies.

Beheersing: scheid simulatie, zichtbaarheid en onboarding; migreer bestaande saves als reeds geïntroduceerd waar passend.

### Geodemigratie beschadigt authored terrein

Risico: blind vervangen maakt gaten of breekt routes.

Beheersing: resolve per lokale materiaalband en test caves, portals, townvloer en oude saves.

### Metrics optimaliseren ten koste van sfeer

Risico: de opening wordt een steriele checklist.

Beheersing: behoud authored wereldbeelden, cave-ins, geluid en verrassingen; meet autonomie en intentie, niet alleen snelheid.

## Expliciete non-goals

- Geen enginewissel naar Unreal.
- Geen apart kleiner spel bouwen als voorwaarde om dit spel af te maken.
- Geen geodes repareren of vervangen.
- Geen algemene Flight-snelheidsbuff voordat portalgebruik is hersteld.
- Geen wijziging aan comboDurationMs.
- Geen notification carousel opnieuw inschakelen.
- Geen vijf abilities tegelijk naar de eerste minuten halen.
- Geen brede Warframe-miningkopie.
- Geen nieuwe currency, tree, merchant of menu.
- Geen gameplayimplementatie binnen dit planningdocument.

## Aanbevolen eerste implementation slice

De kleinste slice die de kernhypothese eerlijk test:

1. zorg dat de playtestwereld geen geoderestanten meer bevat;
2. laat de actieve tutorial eindigen na een echte 10–15 meter manual Flight-retour;
3. maak portals onafhankelijk van de 80-meter special-tilegate;
4. plaats één gegarandeerde, bereikbare portal rond 40–60 meter bij de aangeleerde route;
5. maak activatie en de surface-returnroute volledig world-space en savevast;
6. bank level-upkeuzes in plaats van ze automatisch te openen;
7. laat verder alle nieuwe systemen verborgen;
8. test deze slice met vijf ongecoachte spelers.

Als deze spelers de tweede afdaling vrijwillig starten en de portal zelf als hun terugkeeroplossing benoemen, is Boricks zwaarste bezwaar niet theoretisch maar aantoonbaar aangepakt. Pas daarna is het zinvol om extra miningvariatie, abilities of verdere midgamepolish te beoordelen.

