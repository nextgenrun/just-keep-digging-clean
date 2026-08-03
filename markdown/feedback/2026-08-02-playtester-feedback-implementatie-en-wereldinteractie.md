# Playtesterfeedback — implementatie en vervolgonderzoek wereldinteractie

**Datum:** 2026-08-02  
**Status:** feedbackmaatregelen geïmplementeerd; nieuwe mininginteracties alleen geanalyseerd  
**Bron:** playtest van `diggame-beta-1` door Borick Yongaerts  
**Normatieve basis:** `2026-08-02-feedbackplan-normatieve-revisie-v2.md`

## Uitkomst

De feedback wijst niet alleen op “te veel content”. Het onderliggende probleem is dat de eerste sessie de speler tegelijk drie verkeerde signalen geeft:

1. het langetermijndoel blijft impliciet;
2. belangrijke systemen onderbreken de kernhandeling voordat hun waarde duidelijk is;
3. veel verschillende systemen worden door de speler ervaren als dezelfde handeling: naar een tegel gaan, `Mine` vasthouden en daarna een menu doorlopen.

Deze wijziging pakt eerst de begrijpelijkheid en onderbrekingen aan. Zij voegt bewust nog geen nieuwe miningmechanic toe. Eerst moet de huidige game zonder stemcoaching aantonen wat het doel is, hoe de terugweg werkt en dat een diepe expeditie geen wandeling van 93 seconden omhoog vereist.

## Wat nu is geïmplementeerd

### 1. Level-ups onderbreken mining niet meer

- De automatisch openende `LevelUpPopup` en haar runtime-, input-, Escape-, resize- en debugroutes zijn verwijderd.
- Een level-up synchroniseert de progressionstate, geeft een korte HUD-pulse en slaat op zonder de spelerinput te blokkeren.
- De oude keuzemomenten geven nu deterministisch beide kleine permanente milestonebonussen: `+3% mining` en `+2% luck`.
- Meerdere levels in één XP-award worden afzonderlijk verwerkt en opgeslagen.
- De bestaande comboduur is niet aangepast.

Dit is geen nieuwe willekeurige starterupgrade. Het is een voorspelbare levelreward en staat los van de tutorial.

### 2. De onboarding is teruggebracht tot één aantoonbare route

De tutorial gebruikt zes stappen:

| Stap | Speleractie die voortgang bewijst | Wat de game hiermee leert |
|---|---|---|
| `MOVE` | werkelijk bewegen | besturing en agency |
| `DIG` | werkelijk een tutorialtegel vernietigen | de basisactie en buit |
| `FLIGHT` | werkelijk Flight gebruiken | lokale terugkeer is een actieve movementtool |
| `PORTAL` | de gegarandeerde retourportal activeren | een lange opstijging is niet de bedoelde normale terugweg |
| `SELL` | de verkoopinteractie openen | buit wordt buiten de mijn omgezet |
| `RESUME` | na de verkoop via de gekoppelde route terugkeren | verkopen beëindigt de expeditie niet; de lus gaat verder |

De route vordert alleen op basis van echte acties. Er is geen stap meer die een specifieke winkelupgrade vereist.

### 3. Alleen Flight wordt tijdelijk verstrekt

- De tutorial geeft geen geld, startercargo of verplichte Agility-/miningupgrade meer.
- Alleen een begrensde Flight-training wordt idempotent verstrekt zodat de speler de terugkeertaal kan leren.
- Een vrijwillige aankoop blijft mogelijk, maar stuurt de tutorialstate niet.
- De verborgen legacy-upgrade `Miner's Grip` blijft alleen bestaan om oude save-effecten correct te blijven lezen; hij is geen tutorialbeloning en staat niet in de winkel.

### 4. De eerste portal is gegarandeerd

- `FirstSessionPortalSystem` author’t een echte `TELEPORT_TILE` op de tutorialroute bij kolom `12`, vijftien terreinrijen onder de luchtlaag.
- De portal wordt na het toepassen van persistente wereldstate opnieuw gegarandeerd, zodat een asynchrone save-restore hem niet stil kan verwijderen.
- De tegel, health en renderer worden samen hersteld; de tutorial toont een wereldmarker en permanente staptekst totdat de actie werkelijk is uitgevoerd.
- Portals blijven interacteerbaar wanneer optionele special-blockcontent nog is afgeschermd.

De garantie is productmatig belangrijker dan een tekst als “je kunt later portals vinden”. De speler moet in de eerste route fysiek ervaren dat de game een snelle retourstructuur heeft.

### 5. Tutorialuitleg gebruikt geen geforceerde kaarten meer

- Tutorial-, portal- en levelproducenten openen geen notificationcard meer.
- De centrale `UI_NOTIFICATION_CAROUSEL_CONFIG.enabled = false` is nu een echte admission gate: geen view, presenter, toetsenbinding of queue wanneer de feature uitstaat.
- Tutorialinformatie leeft in een wereldmarker, een persistente current-action/Next-Promise-regel en optionele audio.
- De surface-safety blijft actief tot de speler Flight echt heeft gebruikt; dit voorkomt dat de tutorial een onbedoelde eenrichtingsval wordt.
- Expliciet aangevraagde Titan- en Memory Reliquary-lore blijft leesbaar: na `Interact` opent de bestaande Game Dialog. Zij krijgt geen automatische carouselbypass.

“Uitgeschakelde notification calls” betekende concreet dat de config wel `false` was, maar dat het systeem vóór deze wijziging toch werd opgebouwd en producenten de API bleven aanroepen. De flag was daardoor geen architecturale garantie. Dat is nu gecorrigeerd.

### 6. Voice-over is voorbereid, niet gefingeerd

- `TutorialNarrationController` volgt dezelfde persistente tutorialstate als markers en captions.
- Elke cue kan exact één lokale opname afspelen en heeft altijd een captionfallback.
- Een nabijheidscue kan de eerste portal benoemen vóór de speler denkt vast te zitten.
- `recordingsReady` staat bewust op `false` en de audiopaden staan op `null` tot de echte opnames geleverd zijn.
- Replay- en healthhooks zijn aanwezig.

De eigen stem kan de flow warmer en vloeiender maken, maar is geen vervanging voor begrijpelijke leveldesign. Acceptatie blijft: zonder audio moet de juiste speleractie nog steeds logisch volgen.

### 7. Star-popup legacy is verwijderd

- De Star-discovery popupview, admissionpolicy, setting, preloadroutes en popupgerichte tests zijn verwijderd of herschreven.
- De negentien getrackte bestanden van het uitsluitend daarvoor gebruikte `sprites/UI/star-discovery-v1`-pakket zijn verwijderd en blijven via Git herstelbaar.
- Oude saves met `showStarDiscoveryPopups` mogen die onbekende property houden; de runtime negeert haar veilig.
- Star rarity, unieke identiteit, Sign XP, release-art, Star Atlas en Starlight progression blijven bestaan.
- De progressbar gebruikt nu zijn eigen Starlight-plaque en leunt niet meer op een popupasset.

Stars worden dus niet gereduceerd tot geld en ook niet opnieuw via een automatische kaart uitgelegd. Hun betekenis hoort in de speler-geopende Starprogressie en in hun unieke wereldpresentatie.

### 8. Terugkeren naar het hoofdmenu is idempotent

- Twee snelle activaties van `MAIN MENU` deelden voorheen geen in-flight promise en konden `MainMenuScene` tijdens dezelfde teardown tweemaal starten.
- De route deelt nu één saveflush en voert precies één scene-transition uit.
- Save- of pause-cleanupfouten worden gelogd maar veroorzaken geen ongevangen `TypeError` en blokkeren de terugkeer niet.
- Een gerichte dubbelklikcontracttest bewaakt deze lifecycle-race.

Dit is de lokaal aantoonbare foutklasse achter Boricks melding. Zonder zijn oorspronkelijke screenshot kan niet worden bewezen dat zijn exacte stacktrace identiek was, maar de concrete dubbele scene-start is wel verwijderd.

### 9. Bewust onveranderd

- De Depth Gates op `100 m`, `300 m` en `1000 m` blijven bestaan.
- De combotiming is niet aangepast.
- Geodes zijn geen onderdeel van de nieuwe flow en krijgen geen legacy-gameplaytest.
- Er is in deze implementatieronde geen miningminigame, QTE of nieuwe material-reaction mechanic toegevoegd.

## Hoe doel en progressie nu worden gecommuniceerd

Er zijn drie verschillende informatieniveaus. Zij mogen niet allemaal hetzelfde UI-element worden.

### North Star

De permanente fantasie is: **graaf dieper dan ooit**. Dit is geen checklist en geen belofte dat geld het einddoel is. Het geeft richting aan alle sessies.

In de vroege post-tutorialfase gebruikt de HUD daarom `DIG DEEPER THAN EVER` en een concrete eerstvolgende diepte/payoff, in plaats van een nieuw systeem als losse popup te lanceren.

### Sessiedoel

Een sessiedoel is de huidige uitvoerbare stap, bijvoorbeeld:

- bereik de gemarkeerde eerste portal;
- verkoop de concrete buit die je nu draagt;
- gebruik de gekoppelde route om de expeditie te hervatten;
- bereik de volgende betekenisvolle diepteband.

Tijdens de tutorial is dit exact één stap. Er wordt niet tegelijk om een verkoop, upgrade, abilitytest en nieuw menu gevraagd.

### Next Promise

De Next Promise benoemt de eerstvolgende tastbare payoff, niet een algemene featurelijst. Voorbeelden:

- `PORTAL AHEAD — THIS IS YOUR FAST WAY BACK`;
- `SELL YOUR CARGO — THEN TAKE THE MARKED ROUTE BACK`;
- `DIG DEEPER THAN EVER — REACH 100M`;
- alleen wanneer werkelijk betaalbaar: `UPGRADE AVAILABLE — <naam>`.

Een upgrade is dus een verdiende mogelijkheid nadat de speler zelf genoeg waarde heeft verzameld. Zij is geen scripted tutorialcadeau.

## Hoe de open begripvragen worden gesteld

De vragen op 5, 15 en 30 minuten horen **niet** als nieuwe in-game popups in deze build. Dat zou precies het probleem terugbrengen dat wordt onderzocht.

Gebruik bij een gemodereerde test een observator die de timer bijhoudt en op een natuurlijk rustmoment vraagt:

1. “Wat probeer je nu te bereiken?”
2. “Als je nu terug wilt, hoe zou je dat doen?”
3. “Wat verwacht je bij de volgende diepte of upgrade?”
4. “Welk systeem heb je net geleerd, en waarvoor zou je het zelf gebruiken?”

Regels voor de observator:

- vraag open, noem het juiste antwoord niet;
- laat de speler eerst aanwijzen of handelen;
- noteer het letterlijke antwoord plus de eerstvolgende actie;
- geef pas hulp wanneer de speler anders echt stopt;
- markeer afzonderlijk wat de speler begreep en wat hij toevallig correct uitvoerde.

Voor een ongemodereerde test kan na afloop één korte formulierlink worden gebruikt met dezelfde vragen en tijdcodes uit telemetrie. Voeg geen vragenoverlay midden in de sessie toe. Telemetrie bewijst gedrag; het interview controleert het mentale model.

## Waarom de playtester “basic interacties” ervaart

Borick zegt niet noodzakelijk dat er letterlijk maar één systeem bestaat. Hij beschrijft de **ervaren werkwoorden**.

Vanuit de speler gezien worden veel systemen momenteel samengedrukt tot:

1. beweeg naar een bereikbare cel;
2. houd de miningknop vast;
3. wacht tot health nul is;
4. herhaal;
5. verlaat de mijn voor een menu- of retourhandeling.

Vijf abilities lossen dit niet automatisch op. Als een ability vooral meer damage, meer bereik of een grotere cirkel geeft, verandert de efficiency maar niet de vraag die de speler zichzelf stelt. De handeling blijft: “welke knop breekt deze groep tegels het snelst?”

Er is pas voelbare variatie wanneer een input een ander soort relatie met de wereld veroorzaakt:

- positie verandert wat mogelijk is;
- richting verandert het resultaat;
- materiaal reageert herkenbaar anders;
- de actie creëert een kans of risico dat enkele seconden blijft bestaan;
- de speler kan de ontstane situatie benutten met movement of een andere bestaande ability.

## Ontwerpgrenzen voor nieuwe wereldinteractie

Elke kandidaat moet aan deze grenzen voldoen:

- geen apart minigamescherm;
- geen ritme-QTE of willekeurige knopreeks;
- geen extra popup om de mechanic speelbaar te maken;
- bestaande move/mine/Flight/ability-inputs blijven de taal;
- `Mine` blijft een universele fallback;
- abilities mogen een materiaalreactie openen, maar standaardblokken niet permanent onbereikbaar maken;
- rewards worden door één autoritatieve wereldmutatie toegekend, nooit dubbel door effect en tegelbreuk;
- wereldreactie moet zichtbaar, hoorbaar en ruimtelijk leesbaar zijn vóór de payoff;
- prototypes worden in één kleine diepteband getest voordat zij wereldbreed gaan.

## Kandidaten die geen minigame zijn

### A. Directionele breukvoortplanting

Een harde slag maakt niet alleen damage, maar plant zichtbare spanning voort in verbonden tegels. De richting van de slag en de vorm van de ader bepalen waar de volgende breuk voordelig wordt.

Spelerervaring:

- een neerwaartse slag drukt een korte verticale scheur door;
- een zijwaartse slag splijt een horizontale naad;
- een tweede slag op een duidelijk gekraakt knooppunt laat de gekoppelde zwakke cellen bezwijken;
- verplaatsen naar de juiste zijde is sneller dan op dezelfde tegel blijven staan.

Waarom dit helpt: de speler leest geometrie en wisselt positie, terwijl mining zelf direct blijft. Er is geen prompt of timingmeter nodig.

Risico: als alle scheuren automatisch de hele ader leegmaken, wordt dit alleen “grotere AoE”. Beperk bereik en laat het breukpad afhangen van materiaalverbinding en inslagrichting.

### B. Flight-impact als terreinwerkwoord

Flight wordt naast terugkeer ook een manier om massa en hoogte in de mijn te gebruiken. Een korte val of bewuste neerwaartse mine-input kan een landing-impact opbouwen.

Spelerervaring:

- stijg een paar tegels;
- kies waar je landt;
- een leesbare impact kraakt vloer en aangrenzende broze blokken;
- gebruik het ontstane breukpatroon om verder te mijnen of een zijroute te openen.

Dit maakt verticale ruimte relevant en verbindt de vroeg geleerde Flight direct met mining. De vaardigheid is ruimtelijke planning, niet een QTE.

Risico: een grote gratis schokgolf kan gewoon de optimale spamactie worden. Gebruik een minimale hoogte, een kleine harde kern, begrensde crack propagation en een korte landingcommitment. Geen nieuwe energiebalk zolang Gem Power dit al kan dragen.

### C. Materiaalreacties op bestaande abilities

Abilities moeten niet alleen andere damagegetallen hebben. Zij kunnen bestaande material states anders transformeren:

- een snelle snij-ability opent een smalle lijn door zachte of vezelige obstructies zonder een kamer leeg te vegen;
- een elektrische/harde slag laadt een zichtbare geleidende ader en laat een beperkte verbonden keten reageren;
- Flight-impact maakt broos materiaal los, maar is minder effectief op compacte ertslagen;
- een Celestial Engine mag later dezelfde regels versterken, niet omzeilen.

De universele miningactie blijft werken. De ability geeft een alternatieve route of een efficiëntere vorm wanneer de speler de wereld goed leest.

Risico: vijf kleurcodes met vijf verborgen uitzonderingen voelen als een kennistoets. Begin met maximaal twee duidelijke reacties en hergebruik bestaande materiaalvormen, particles en sounds.

### D. Losse massa en instortende pockets

Bepaalde clusters worden na het weghalen van hun steun een los wereldobject of een deterministische vallende tegelgroep. Zij kunnen:

- zwakkere blokken eronder kraken;
- tijdelijk een doorgang blokkeren;
- een richel of brug vormen;
- een ingesloten resource pocket openleggen.

De interactie is: steun lezen, de juiste tegel verwijderen en op de consequentie reageren. Dit verandert `waar` je graaft zonder een nieuw bedieningsschema.

Voor Phaser hoeft dit geen vrije rigid-body simulatie te zijn. Een gridresolver kan per stap steun, valpad en eindcel bepalen. Dat is voorspelbaarder, save-vriendelijker en goedkoper.

Risico: onverwachte schade of permanent verloren buit voelt onrechtvaardig. Gebruik sterke voorafgaande scheuren/stof, een begrensd valpad en herstelbare rewards.

### E. Ader blootleggen en uitrekken

Een resourceader kan enkele kerncellen hebben die na blootlegging een zichtbaar pad door omliggend gesteente tonen. De speler kiest of hij:

- de veilige buitenkant laag voor laag volgt;
- een kern breekt voor een korte cascade met meer lawaai/instabiliteit;
- eerst een terugweg of landingruimte maakt.

Het belangrijke verschil met “special block = meer loot” is dat de ader een lokale routepuzzel in dezelfde wereld vormt. Geen modal, geen cursorbalk en geen willekeurige knop.

Risico: als de ader altijd één overduidelijk pad heeft, is het slechts een langere lootanimatie. Maak twee ruimtelijk verschillende, allebei geldige benaderingen.

### F. Contactketens tussen beweging en mining

Kleine contextreacties kunnen de handeling lichamelijker maken zonder een compleet systeem:

- mine tijdens een zijwaartse beweging en draag momentum één cel door een zwakke naad;
- raak een gekraakt plafond van onderen en laat alleen loshangende fragmenten vallen;
- land naast een wand en duw een los cluster één gridcel;
- breek een steunpunt en gebruik Flight om vóór de gecontroleerde val naar de nieuwe opening te bewegen.

Dit werkt alleen wanneer de inputbuffer, hitframe en feedback exact zijn. Anders voelt het als onbetrouwbare bonusdamage.

## Vergelijking van de kandidaten

| Kandidaat | Nieuwe ervaren handeling | Hergebruik bestaande systemen | Uitleglast | Technisch risico | Eerste-prototypewaarde |
|---|---|---:|---:|---:|---:|
| Directionele breuk | positioneer, sla, volg scheur | hoog | laag | middel | zeer hoog |
| Flight-impact | bouw hoogte op, kies landingspunt | zeer hoog | laag | middel | zeer hoog |
| Ability-materialreacties | kies passend werkwoord | hoog | middel | middel/hoog | hoog |
| Losse massa | verwijder steun, reageer op val | middel | laag | hoog | middel |
| Ader blootleggen | lees en volg lokale structuur | hoog | middel | middel | hoog |
| Movement-contactketens | combineer verplaatsing en hit | hoog | laag | hoog qua feel | middel |

## Aanbevolen eerste prototype

Prototypeer **Flight-impact plus directionele breuk** samen in één kleine, geïsoleerde testpocket.

Waarom deze combinatie:

1. Flight wordt al vroeg geleerd en krijgt direct een tweede betekenis naast terugkeren.
2. De speler gebruikt hoogte, richting en landing; dat is aantoonbaar een ander ervaren werkwoord dan stilstaan en `Mine` vasthouden.
3. Breukvoortplanting kan ook met normale directionele mining blijven werken, waardoor Flight geen harde contentlock wordt.
4. Dezelfde gridmutatie kan later door Quick Slash, Thunder Strike of Engines op andere wijze worden gevoed.
5. De uitleg kan volledig in de wereld: broze vloer, vooraf geschilderde crackrichting, stof bij landing en duidelijk verschillend geluid.

### Minimale prototypeflow

1. Plaats een broze vloer boven een korte zichtbare resourcepocket.
2. Normale mining breekt de vloer nog steeds in het normale aantal hits.
3. Een landing vanaf de minimale hoogte zet drie begrensde cellen in `cracked` state.
4. De volgende directionele mine op het gekraakte knooppunt breekt alleen de verbonden zwakke cellen.
5. Alle tegelverwijdering en rewardtoekenning lopen via `WorldModel`/de bestaande miningautoriteit.
6. De speler krijgt particles, sound en tile-art, geen tekstkaart.

### Technische grens

Maak geen los “minigamesystem”. Gebruik een kleine wereldinteractielaag:

- action context: positie, richting, velocity/Flightstate en bestaande ability-id;
- material context: tegeltype, health, lokale verbinding en tijdelijke reactionstate;
- resolver output: cracks, verplaatste/vernietigde cellen, één rewardbron en presentatiesignalen;
- persistentie alleen voor reactionstate die langer dan de actieve wereldchunk moet overleven;
- renderer leest de uitkomst maar kent geen rewards toe.

Een mogelijke latere modulegrens is `WorldInteractionResolver` plus een data-gedreven `MaterialReactionRegistry`. Het bestaande `WorldModel` blijft de enige tegelautoriteit.

## Wat eerst moet worden gemeten

Voor en na het prototype:

- langste en mediane ononderbroken `Mine`-hold;
- aantal position changes per tien gebroken tegels;
- aantal verschillende bestaande abilities dat binnen tien seconden rond een tegelbreuk wordt gebruikt;
- tijd van eerste diepe afdaling tot eerste gevonden/geactiveerde portal;
- tijd die een speler probeert omhoog te vliegen vóór hij de retourroute begrijpt;
- waar een speler stopt, het menu opent of zichtbaar om hulp zoekt.

Deze metrics zeggen of gedrag verandert, niet waarom. Combineer ze met de open 5/15/30-minutenvragen en observatienotities.

## Acceptatiecriteria voor een later interactieprototype

Het prototype is alleen beter wanneer:

- een nieuwe speler de reactie na één wereldvoorbeeld opnieuw kan gebruiken zonder uitleg;
- spelers spontaan positie of hoogte veranderen vóór een breuk, in plaats van alleen langer `Mine` vast te houden;
- normale mining een geldige fallback blijft;
- de ability de route of vorm van de excavatie verandert, niet alleen damage per seconde;
- er geen extra modal, QTE of tutorialkaart nodig is;
- dezelfde tegel nooit dubbel reward geeft;
- de mechanic correct werkt na save/load en chunk redraw;
- performance binnen het bestaande grid-/rendererbudget blijft;
- de eerste portal en zesstaps onboarding nog steeds de enige vroege leerlijn vormen.

## Beslissing

De feedback rechtvaardigt niet dat het hele project wordt weggelegd. Zij rechtvaardigt wel dat er tijdelijk geen nieuwe brede systemen bijkomen. De huidige build moest eerst stoppen met de speler onderbreken en de retourlus expliciet bewijzen; dat is deze implementatieronde.

De volgende ontwerpvraag is nu veel smaller en toetsbaar:

> Kan één bestaande movement/ability-input de vorm of toestand van terrein zó veranderen dat de speler anders positioneert dan bij normaal mining?

De beste eerste test daarvoor is een begrensde Flight-impact met directionele breukvoortplanting. Pas wanneer spelers die interactie zonder stemcoaching begrijpen en vrijwillig herhalen, verdient zij uitbreiding naar andere materialen en abilities.

## Validatiebewijs van de implementatie

De implementatie is niet alleen als tekstcontract gecontroleerd:

- achttien gerichte Node-contracttests dekken de tutorialroute, levelbeloningen, popup-admission, combo, save-migratie, dieptepoorten, shopintegriteit, hoofdmenu-teardown en bestaande gameplaycontracten;
- alle 41 geraakte runtime-JavaScriptmodules slagen voor `node --check`;
- een echte Edge/Phaser-smoke startte een nieuwe geïsoleerde casual save met tutorial `yes`, zonder de normale saves te lezen of schrijven;
- de live beginsnapshot stond op `MOVE`, toonde een persistente Next Promise, hield de stille Town-uitgangsbarrière actief en bevestigde dat de deterministische `TELEPORT_TILE` werkelijk wordt geplaatst; de definitieve geïntegreerde tuning op diepte 15 wordt daarnaast door twee gerichte regressiecontracten bewaakt;
- de live overgang via dezelfde retention- en tutorialsystemen naar `FLIGHT` verleende `gemPowerUnlock` en exact 30 seconden gratis Flight zonder `LevelUpPopup`, console-error of page-error;
- een afzonderlijke hoofdmenuprobe reproduceerde eerst twee scene-starts op één dubbelactie en bewijst na de fix één gedeelde promise, één saveflush en één `MainMenuScene`-start;
- de smoke legde ook een resterende verwijzing naar een verwijderde Flight-popup-hook en een afstandsmismatch tussen config en copy bloot; de hook is verwijderd en config, captions en regressietests zijn daarna op 15 m geconsolideerd;
- het vastgelegde Phaser-frame was niet zwart: gemiddelde luminantie 32,97, slechts 1,32% bijna-zwarte pixels en 301 kleurclusters in een 160×90 analyse.

De ingebouwde browserkoppeling kon in deze Windows-checkout niet starten door een ACL-infrastructuurfout. Daarom gebruikte de live controle de bestaande projectspecifieke Edge/Playwright-fallback; het resultaat hierboven komt nog steeds uit de echte lokale Phaserpagina, niet uit een stub.
