# Eerste-vijf-minuten-playtestanalyse: Fnab en Kimmo

**Analysedatum:** 30 juli 2026  
**Bronnen:** privéfeedback van Fnab en een WhatsApp-playtestsessie met Kimmo Salespasswie op 29 juli 2026  
**Fnab-build:** publieke Dig Game-beta op de genoemde URL  
**Kimmo-build:** exacte versie onbekend; tutorial-, merchant- en Flightstatus veranderden of waren onduidelijk tijdens de sessie  
**Geteste URL uit het Fnab-gesprek:** <https://www.nextgen.run/diggame-beta-1/>  
**Status:** ontwerp-, transcript- en broncodeanalyse; geen gameplaycode gewijzigd  
**Hoofdvraag:** welk herhaald patroon stoppen Fnab en Kimmo in de eerste vijf minuten, en hoe lossen we dat aantoonbaar op zonder hun uitspraken te overclaimen?
---

## 1. Korte conclusie

Fnabs feedback is geen verzoek om simpelweg “een paar systemen te verwijderen”. Zijn kernkritiek is:

> De game vraagt de speler om veel regels, systemen en keuzes te accepteren voordat de fundamentele mijnlus heeft bewezen dat hij duidelijk, veilig en leuk is.

De zwaarste bevinding is niet dat Fnab geen lange vragenlijst kon invullen. De zwaarste bevinding is juist dat hij **niet verder kwam dan vijf minuten**. Mijn operationele conclusie is dat dit voor een openbare Steam-demo een first-five-minutes releaseblokker is. Om dat signaal oplosbaar en testbaar te maken, stel ik voor dat een onbekende speler zonder uitleg van de ontwikkelaar minstens één complete, bevredigende lus meemaakt:

**graven → waarde meenemen → veilig terugkeren → verkopen → een merkbare upgrade kopen → opnieuw graven en direct het verschil voelen**

Deze lus en de vijf-minutengrens zijn mijn voorgestelde operationalisering van Fnabs stop-signaal, niet zijn letterlijke ontwerpvoorschrift. In de huidige structuur stapelen vijf bronbevestigde risico's zich vóór dat bewijs op:

1. De tutorialopdracht verdwijnt na zeven seconden en de permanente doeltekst wordt tijdens de tutorial verborgen.
2. De speler kan afdalen voordat Flight wordt geleerd of ontgrendeld, terwijl de game bewust geen jump heeft.
3. Bestaande wall-climb is niet uitgelegd en de Flight-hint blijft onzichtbaar.
4. De eerste verplichte upgrade heet “Agility Training” en verandert lopen van 200 naar 205 px/s: slechts 2,5%, terwijl de tutorial belooft dat de volgende graafactie makkelijker wordt.
5. “Return to Safety” combineert ontsnappen uit een onduidelijke situatie met een straf van 50% van alle gedragen resources.

Een plausibele, brononderbouwde reconstructie van de huidige oorzaanketen is:

```text
veel vroege informatie
→ doel en terugweg worden gemist
→ speler valt in een put
→ ontsnappingsregel is onduidelijk
→ noodknop kost de helft van de buit
→ upgrades voelen de geïnvesteerde tijd niet waard
→ de bredere game voelt als “MEER” zonder zichtbaar waarom
→ speler stopt vóór de kernlus bewezen is
```

Kimmo levert een tweede, smallere bevestiging van dezelfde vroege probleemketen. Zijn sessie was geen schone blinde playtest: Mila gaf tijdens het spelen de richting, de graaftoets, de Flight-uitleg en uiteindelijk de Shift-toets. Ook werd de tutorial tijdens of rond de sessie aangepast. Juist daardoor is dit een ernstig **assisted-failure-signaal**: zelfs met de ontwikkelaar als ontbrekende tutorial vroeg Kimmo wat hij moest doen, hoe hij moest graven, of hij nog omhoog kon en meldde hij daarna dat hij beneden vastzat en Shift nog niet kende.

```text
onduidelijk huidig doel
→ ontwikkelaar zegt “graaf naar rechts”
→ speler kent de kerntoets niet
→ ontwikkelaar zegt “F”
→ speler daalt af zonder terugkeermodel
→ speler vraagt of omhoogkomen mogelijk is
→ Flight/Shift wordt pas na de noodzaak uitgelegd
→ speler meldt dat hij beneden vastzat
```

Kimmo bewijst niet afzonderlijk Fnabs klachten over upgrades, resource-economie, traagheid of “VEEL”. Hij corroboreert wel precies het vroegste onboarding- en traversalprobleem dat de speler verhindert om die bredere game zelfstandig te bereiken.

Kimmo toont tegelijk dat de game al een menselijke wow-hook heeft. “Wat is dit? :0” is zonder beeld ambigu, maar “Echt te sick eigenlijk dat je dit gewoon zelf hebt gemaakt” is duidelijke bewondering. Dat bewijst niet dat de kernlus werkt. De ontwerpopdracht is de bestaande verwondering omzetten in zelfstandige intentie, begrip en concrete verwachting.

Mijn advies is daarom: **lanceer de Steam-demo niet voor blinde spelers voordat de P0-gates in hoofdstuk 12 slagen.** De volledige game mag rijk en complex blijven. De demo moet die rijkdom progressief onthullen via één configuratieprofiel bovenop dezelfde productiecode.

---

## 2. Methode en betrouwbaarheid

### 2.1 Dubbele lezing

Beide volledige conversaties zijn minimaal twee keer van begin tot eind gelezen:

- **Leespas 1:** betekenis, toon, chronologie en de concrete spelerservaring.
- **Leespas 2:** elke klacht, nuance, retorische vraag, kwalificatie en sprekerstoeschrijving afzonderlijk gecontroleerd.

Daarna zijn de klachten gekoppeld aan de huidige lokale broncode en, voor de belangrijkste vroege systemen, aan de publiek geserveerde JavaScript-modules van de genoemde beta-URL.

### 2.2 Wat wel en niet is vastgesteld

Er zijn vijf soorten conclusies in dit document:

- **Directe Fnab-feedback:** wat Fnab zelf schrijft.
- **Directe Kimmo-feedback:** wat Kimmo zelf schrijft.
- **Ontwikkelaarsobservatie of coaching:** uitspraken en ingrepen van Mila tijdens een sessie.
- **Bronbevestigd:** gedrag dat in de actuele bronpaden aantoonbaar aanwezig is.
- **Te valideren hypothese:** een ontwerpverklaring die aannemelijk is, maar met nieuwe blinde spelers moet worden getest.
De publieke URL en bronmodules waren via HTTP bereikbaar. De vroege tutorial-, Flight-, afdaling-, pauzemenu- en Return-to-Safety-paden kwamen overeen met de lokale analyse. Een visuele browserplaythrough kon in deze sessie niet betrouwbaar worden uitgevoerd door een lokale browser-sandboxfout. Daarom wordt hier niet beweerd dat de huidige presentatie visueel is goedgekeurd.

### 2.3 Beperkingen van de Kimmo-sessie

De Kimmo-sessie was actief gecoacht en niet versievast. Mila gaf antwoorden voordat de game zelf het begrip kon bewijzen en meldde dat de tutorial was aangepast en merchants mogelijk onzichtbaar waren. Daarom mogen latere successen uit deze sessie niet als zelfstandig spelersbegrip worden geteld.

De sessie blijft waardevol als foutinventaris: iedere vraag waarop de ontwikkelaar live moest antwoorden, markeert informatie die de game op dat moment niet betrouwbaar zelf overdroeg. De ontbrekende reactie na 17:37 bewijst niet dat Kimmo stopte, niet verder kwam of geen anticipatie voelde; zonder vervolg of opname blijft dat onbekend.

---

## 3. Belangrijke sprekerstoeschrijving

Een deel van de conversatie bevat Mila's eigen diagnose of oplossingsideeën. Die mogen niet per ongeluk als goedkeuring door Fnab worden geciteerd.

| Uitspraak of voorstel | Van wie? | Wat Fnab werkelijk bevestigt |
|---|---|---|
| “Systemen moeten gestript worden.” | Mila | Fnab zegt niet dat alles weg moet; hij zegt dat gelijktijdig aan circa vijftig systemen werken het heel lastig maakt te zien wat leuk is. |
| “Het voelt als 50 random systemen.” | Mila | Fnab gebruikt het getal later als argument over testbaarheid en focus, niet als exacte telling of als bewijs dat elk systeem slecht is. |
| “Discoverable merchants, langere tutorials, betere UI, wiki.” | Mila | Fnab keurt deze oplossingen niet goed. Vooral een langere tutorial of wiki kan “traag, onduidelijk, VEEL” juist erger maken. |
| “Darkness + sterren die licht geven werkt.” | Mila | Fnab betwist niet dat het technisch bestaat; hij vraagt of het spelersgedrag, keuzes en betekenis creëert. |
| “Systemen moeten samenwerken.” | Mila | Fnab antwoordt voorzichtig met “misschien wel” en verlegt de nadruk: met zoveel gelijktijdige systemen is het heel lastig te beoordelen wat **voor de speler leuk** is. |
| Hollow Knight als voorbeeld | Fnab | Dit is een voorbeeld van ontwikkelvolgorde en het eerst goed krijgen van movement feel. Het is geen verzoek om jump aan Dig Game toe te voegen. |
| “Meer kan leuk zijn.” | Fnab | Hij noemt Cookie Clicker, Diablo en Path of Exile juist om te laten zien dat veel systemen kunnen werken wanneer de opbouw bewust, progressief en getest is. |

| “Tutorial nog broken en UI spam” | Mila | Een gelijktijdige ontwikkelaarsdiagnose, niet Kimmo's formulering en geen bewijs dat de fix zijn sessie bereikte. |
| “Merchant onzichtbaar” | Mila | Een door de ontwikkelaar waargenomen builddefect, niet Kimmo's klacht. Een verplichte onzichtbare seller blijft wel een P0-smoketestfailure. |
| “Graven naar rechts”, “F”, “vliegen met Shift” | Mila | Externe coaching; deze acties tellen niet als zelfstandig ontdekt. |
| “Begrijp alleen nog niet wat ik moet doen” | Kimmo | Direct bewijs dat het onmiddellijke doel niet leesbaar was. |
| “Hoe graaf je?” | Kimmo | Direct bewijs dat de kernhandeling of haar input niet was geleerd. |
| “Kan je nog terug omhoog?” | Kimmo | Direct bewijs dat het terugkeermodel vóór of tijdens afdalen onbekend was. |
| “Ik zat vast beneden” / “Wist ik net nog niet” | Kimmo | Direct bewijs dat Flight/Shift pas werd geleerd nadat de speler het nodig had. |
| “Wat is dit? :0” | Kimmo | Ambigue verrassing zonder beeld; niet met zekerheid als verwarring of plezier classificeren. |
| “Echt te sick…” | Kimmo | Oprechte waardering voor de prestatie en mogelijke spectacle-hook, niet voor bewezen lusbegrip. |
| “Als je je save wilt bewaren moet je hem exporten” | Mila | Sessie-instructie van de ontwikkelaar, geen Kimmo-klacht. In de huidige broncode autosavet de game; export is een optionele draagbare backup. |

Deze nuance is belangrijk. Anders zou de verkeerde oplossing ontstaan: willekeurig systemen verwijderen, vervolgens een langere uitleg toevoegen en aannemen dat het probleem opgelost is.

---

## 4. Wat Fnab werkelijk zegt

### 4.1 Hij twijfelt of de kernlus zelf is geplaytest

Fnab begint met de vraag of de ontwikkelaar de game zelf heeft geplaytest. In die eerste passage verwijst hij primair naar zijn ervaring met de **vorige iteratie**:

- makkelijk vast komen te zitten;
- veel tijd in resources steken;
- upgrades die daar niet evenredig voor belonen;
- veel andere regels en systemen eromheen.

Zijn concrete bewijs uit de huidige sessie komt later: hij stopt binnen vijf minuten, belandt in een put zonder de terugweg te begrijpen en ziet een Return-to-Safety-optie met 50% resourceverlies. De broncodeanalyse laat zien dat delen van het oude risico nog plausibel aanwezig zijn, maar het exacte huidige pitmoment moet worden gereproduceerd voordat één specifieke oorzaak definitief wordt aangewezen.

Dit is geen persoonlijke aanval. Het is een vertrouwenssignaal: de eerste spelerervaring bevat problemen die een fresh-save end-to-endtest expliciet moet proberen te vangen.

### 4.2 De nieuwe versie voelt als “hetzelfde, maar vooral MEER”

“Meer” heeft volgens hem drie kosten:

- meer opties om te begrijpen;
- meer combinaties en uitzonderingen;
- meer balanceerwerk en vreemde randgevallen.

Hij zegt nadrukkelijk niet dat “meer” per definitie fout is. Hij noemt succesvolle games met enorme systeemrijkdom. De volgende voorwaarden zijn mijn synthese van zijn vergelijking, niet een letterlijke checklist van Fnab: die rijkdom wordt doorgaans:

- progressief wordt geïntroduceerd;
- op duidelijke ontwerpregels rust;
- pas verschijnt wanneer de speler een reden heeft om haar te gebruiken;
- systematisch wordt getest.

### 4.3 Hij kan de identiteit en ontwerpregels niet herkennen

Zijn vragen zijn fundamenteel:

- Wat moet de game zijn?
- Wat maakt hem leuk?
- Wat is de gameplayloop?
- Is er een design document?
- Welke eigenschappen en thema's begrenzen nieuwe ideeën?

De speler hoeft het design document natuurlijk niet te lezen. Maar hij moet de uitkomst ervan wel voelen. Als de ontwikkelaar geen duidelijke selectieregels hanteert, voelt ieder nieuw systeem voor de speler als “nu wil ik X, daarna Y, daarna Z”.

### 4.4 Hij vraagt om een kleine, bewezen basis

Fnab adviseert:

1. kies wat de game wil zijn;
2. begin met iets kleins;
3. maak dat aantoonbaar leuk;
4. bouw daarna verder.

Dit is het belangrijkste productontwikkelingsadvies uit het gesprek. Het gaat niet om minder ambitie, maar om een strengere volgorde. Fnab benoemt ook de sunk-costpijn: teruggaan naar een kleine kern kan extra moeilijk voelen omdat er al veel tijd in het project zit.

### 4.5 Referentiegames moeten op ontwerpbeslissingen worden bestudeerd

Fnab reageert expliciet positief op de Motherload-inspiratie — “fucking nice want fucking cool spel”. Motherload, Dome Keeper en Wall World worden niet genoemd als kopieeropdracht. De les is:

- onderzoek welk probleem iedere regel oplost;
- kijk wanneer een systeem wordt geïntroduceerd;
- kijk welke beslissing het de speler geeft;
- kijk wat bewust niet tegelijk wordt aangeboden.

“Motherload maar dan anders” is sterker dan “Motherload maar dan meer”, tenzij “meer” zelf de gecontroleerde fantasie en structuur van het spel is.

### 4.6 Movement feel komt vóór economiebreedte

Het Hollow Knight-voorbeeld betekent:

- eerst moet de basisbediening prettig en voorspelbaar zijn;
- daarna moeten interacties zoals bewegen, landen, klimmen en raken betrouwbaar voelen;
- pas daarna kan de economie die handelingen betekenis geven.

Voor Dig Game vertaalt dat zich niet naar jump toevoegen. De repo heeft bewust **geen jump**. De juiste vertaling is: lopen, richten, graven, vallen, wall-climben en Flight moeten vóór de brede economie leesbaar en prettig zijn.

### 4.7 “Werkt” betekent hier “is leuk voor de speler”

Fnab verduidelijkt expliciet dat hij niet over technisch werkende code praat. Hij voegt daar “Leuk is subjectief” aan toe en reageert positief op het niet centraal stellen van technische correctheid: “groot gelijk”.

De onderstaande criteria zijn daarom analytische tests, niet door Fnab opgesomde klachten. Een technisch correct systeem kan nog steeds falen voor spelers wanneer het bijvoorbeeld:

- geen interessante keuze creëert;
- een al bestaande functie dupliceert;
- de kernlus vertraagt;
- onduidelijk wordt uitgelegd;
- te vroeg verschijnt;
- geen merkbaar effect heeft.

| Vraag | Onvoldoende antwoord | Nodig bewijs |
|---|---|---|
| Werkt het systeem? | “Er zijn geen console-errors.” | Meerdere blinde spelers begrijpen het, gebruiken het vrijwillig en ervaren de bedoelde keuze of beloning. |
| Werkt de upgrade? | “De waarde wordt opgeslagen.” | Spelers merken zonder stattekst dat de volgende actie sterker of sneller is. |
| Werkt darkness? | “De ondergrond is donker en sterren geven licht.” | Duisternis verandert aantoonbaar routekeuze, resourcegebruik of risico-inschatting. |

Geen percentage maakt fun objectief of universeel. De latere gates verzamelen alleen sterker bewijs over meerdere spelers dan één losse mening.

### 4.8 Zijn concrete eerste-vijf-minutenervaring

De uiteindelijke samenvatting van Fnab is zeer scherp:

> “Traag, onduidelijk, VEEL.”

Daaronder zitten vier concrete klachten:

1. Hij kwam niet verder dan vijf minuten.
2. Hij kon niet uit een gegraven put komen zonder vermoedelijke magie.
3. De oude return-knop kon als merchant-shortcut worden misbruikt.
4. De huidige return-knop kost de helft van de resources, zonder dat hij begrijpt waarom die regel zo is.

Deze klachten wegen zwaarder dan meningen over late-gamecontent, want hij heeft die content nooit op een betekenisvolle manier kunnen bereiken.

### 4.9 De toon is kritisch, bescheiden en steunend

Fnab zegt meerdere keren:

- dat hij het niet verkeerd bedoelt;
- dat een eigen game maken tof is;
- dat hij de Motherload-inspiratie sterk vindt;
- dat hij het project mogelijk verkeerd inschat;
- dat Mila misschien al een duidelijk beeld heeft;
- dat er misschien een goede reden of een vet plan bestaat;
- dat teruggaan naar een kleine kern pijnlijk kan zijn na de reeds geïnvesteerde tijd;
- dat hij hoopt dat de feedback helpt;
- “Succes”.

Hij zegt bovendien tweemaal dat zijn vragen retorisch zijn en dat hij geen antwoord nodig heeft. Ze zijn bedoeld als private ontwerpcontrole, niet als uitnodiging om ieder systeem in de chat te verdedigen.

De juiste reactie is dus niet alle systemen mondeling verantwoorden. De juiste reactie is zijn eerste vijf minuten reproduceerbaar maken, de kern kleiner en duidelijker aanbieden en opnieuw met hem of andere blinde spelers testen.

### 4.10 Kimmo corroboreert dezelfde onboardingketen — zelfs met coaching

| Tijd | Kimmo's signaal | Betekenis |
|---|---|---|
| 16:44 | “Begrijp alleen nog niet wat ik moet doen” | Geen duidelijke huidige intentie. |
| 16:45 | “Hoe graaf je?” | Kerninput niet zelfstandig ontdekt. |
| 16:46 | “Kan je nog terug omhoog?” | Afdaling zonder geleerd terugkeermodel. |
| 16:47–16:52 | Mila legt Flight en Shift uit | De ontwikkelaar vervangt tutorial en UI. |
| 16:53 | “Ik zat vast beneden” | Het traversalprobleem wordt concreet. |
| 16:54 | “Wist ik net nog niet” | Vereiste kennis arriveert na de mislukking. |

Deze tweede sessie corroboreert doelduidelijkheid, dig-discoverability en Flightsequencing. Zij bewijst niet Fnabs bredere analyse van economie, pacing, systeemomvang, darkness of late-gamecontent.

De smileys maken de toon vriendelijker, maar verwijderen het usabilityprobleem niet. Tegelijk toont Kimmo's compliment dat bewondering en agency los van elkaar kunnen bestaan: hij kan onder de indruk zijn van het project en toch niet zelfstandig weten wat hij nu moet doen.

---

## 5. Oorzaakanalyse in de huidige game

### 5.1 De tutorial verdwijnt terwijl hij nog nodig is

#### Bronbevestigd

- `systems/onboarding/TownSquareTutorialView.js` toont een stap via het notificatiesysteem.
- `ui/UINotificationSystem.js` vervangt de opgegeven duur door de globale carrouselduur.
- `values/uiNotificationCarousel.js` zet die duur op **7000 ms**.
- `ui/UINotificationCarouselPresenter.js` laat de kaart na die timer verlopen.
- `systems/visual/NextPromiseHudSystem.js` verbergt de permanente doelweergave juist wanneer `townSquareTutorialSystem.isShowingGuide()` waar is.

Het gevolg is dat een speler na ongeveer zeven seconden zonder blijvende opdracht kan staan. Dat verklaart “onduidelijk” beter dan een gebrek aan lange uitleg.

Kimmo vroeg “Begrijp alleen nog niet wat ik moet doen” nadat Mila dacht dat de tutorial inmiddels was gefixt. Dat bewijst niet welke tutorialversie hij zag, maar wel dat de actieve ervaring het doel nog niet zelfstandig overdroeg.

De huidige bron bevat wel een correcte `F`-binding en tutorialcopy met de actuele remapped digtoets. Het probleem is dus niet alleen ontbrekende tekst: de copy is tijdelijk, de permanente objective verdwijnt tijdens de tutorial en de target staat ruim buiten de startpositie.

#### Oplossing

- Toon in **Next Promise** permanent de exacte actieve tutorialstap: `1/4 MOVE`, `2/4 DIG`, `3/4 SELL`, `4/4 UPGRADE`.
- Gebruik de grote notificatiekaart alleen als overgangsanimatie.
- Laat de tekst pas veranderen wanneer de bijbehorende actie echt is voltooid.
- Bewaar de huidige stap zodat pauze, focusverlies en reload hem herstellen.

#### Acceptatietest

Start een nieuwe guided save en doe zestig seconden niets. Pauzeer, hervat en laad opnieuw. De exacte huidige stap en actie moeten steeds zichtbaar blijven, zonder herhaalde notificatiespam.

---

### 5.2 De eerste graafactie is te ver weg en de marker is onvoldoende

#### Bronbevestigd

- Spelerstart: tile x = 4 in `values/gameConfig.js`.
- Tutorialblok: tile x = 24 in `values/retentionConfig.js`.
- Afstand: 20 tiles.
- Tilesize: 94 px.
- Basissnelheid: 200 px/s in `values/playerStats.js`.

Zelfs zonder omwegen is dat ongeveer:

```text
20 × 94 / 200 = 9,4 seconden lopen
```

Dat is alleen de rechtelijntijd. De speler moet eerst begrijpen waar hij heen moet, en de bestaande wereldmarker biedt geen betrouwbare screen-edge richting wanneer het doel buiten beeld staat.

#### Waarom dit “traag” voelt

Negen seconden lopen is niet op zichzelf fataal. Het voelt traag omdat:

- er nog geen leuke kernactie is bewezen;
- de speler niet zeker weet of hij goed loopt;
- er onderweg meerdere visuele systemen en NPC's zijn;
- de beloning aan het einde nog onbekend is.

Kimmo kreeg extern de richting “graven naar rechts” en vroeg daarna alsnog “Hoe graaf je?”. Mila voegde toe dat de town onbreekbaar was. Alleen een richting noemen is dus onvoldoende: de eerste zachte, graafbare target en de beschermde townboundary moeten zonder trial-and-error visueel verschillen.

Dit is ook bronbevestigd: de surface row is town floor, town floor is onbreekbaar en `DigSystem` retourneert alleen `reason: "blocked"`. De presentatie speelt daarbij de gewone hitreactie zonder semantische uitleg. Een nieuwe speler kan daardoor niet onderscheiden of `F` faalde, zijn aim fout was of de town een beschermde regel heeft.

#### Oplossing

- Plaats het oefenblok binnen de eerste cameraweergave.
- Gebruik een screen-edge pijl of path ribbon alleen als ruimtelijke authoring aantoonbaar niet volstaat; extra UI is geen P0-voorkeur.
- Laat de eerste graafbare vorm visueel afwijken van gewone decoratie.

#### Acceptatietest

Op 1280×720 én een compacte viewport ziet een nieuwe speler de eerste bestemming direct en raakt hij binnen 30 seconden zijn eerste blok, zonder mondelinge coaching.

---

### 5.3 De game laat de speler afdalen voordat de terugweg is geleerd

#### Bronbevestigd

- `values/playerCollision.js` heeft surface drop-through standaard aan.
- `player/PlayerSurfaceDropController.js` consumeert de Down-input en vraagt direct om drop-through.
- `player/PlayerController.js` maakt en update deze controller ongeacht tutorial- of Flightstatus.
- Flight wordt pas na tutorialvoltooiing of tutorialskip toegekend.
- De game heeft bewust geen jump.

Een nieuwe speler kan dus het oppervlak verlaten vóór hij het bedoelde verticale ontsnappingsmiddel begrijpt.

Kimmo vroeg vóór of tijdens zijn afdaling “Kan je nog terug omhoog?” en meldde later “Ik zat vast beneden”. Dit herhaalt onafhankelijk Fnabs put- en terugwegprobleem, zonder te bewijzen dat beide spelers exact dezelfde geometrische softlock raakten.

#### Extra nuance: wall-climb bestaat al

`player/PlayerAbilities.js` laat de speler met Up/W langs een aangrenzende solide wand omhoog klimmen. Dat is nuttige basisbeweging, maar de vroege tutorial leert hem niet. Dit bewijst minimaal een discoverability- of traversalprobleem; het bewijst niet dat Fnabs exacte put met wall-climb ontsnapbaar was. Geometrie, collision, input of een echte trap kunnen eveneens de oorzaak zijn. Reproduceer zijn exacte route voordat dit uitsluitend een communicatiefout wordt genoemd.

#### Oplossing

Kies voor de eerste minuten één gezaghebbende verticale veiligheidsregel: **permanente basic Flight**, of een onuitputtelijke veiligheidsreserve die altijd genoeg is om de diepste vroege put te verlaten. Dertig seconden gratis Flight is geen blijvende anti-softlockgarantie.

1. Geef deze veiligheids-Flight vóór een risicovolle afdaling.
2. Bescherm vóór dat moment iedere route waarmee een vloer kan worden weggegraven of een opening kan worden ingevallen; alleen surface drop-through gaten is onvoldoende.
3. Maak de starterschaft geometrisch onvoorwaardelijk ontsnapbaar.
4. Stel wall-climb uit tot een later, concreet probleem, zodat de game niet twee verticale regels in dezelfde minuut onderwijst.
5. Als de speler vóór de veiligheidsontgrendeling probeert af te dalen, toon één korte world-space hint.
6. Verwijder tutorialskip uit de gecureerde demo of valideer hem als een volledig afzonderlijk pad vóór de speler controle krijgt.

#### Geen jump toevoegen

De oplossing is niet om de no-jump-canon te breken. De oplossing is de bestaande verticale grammatica — wall-climb plus Flight — vóór gevaar te leren.

#### Acceptatietest

- Geen enkele pre-Flightroute laat een fresh save door drop-through, weggegraven vloer of levelopening in een onveilige put komen.
- Een eventuele skip-save krijgt permanente veiligheids-Flight vóór de speler controle krijgt.
- Met normale GP bewust leeggetrokken blijft de diepste vroege put ontsnapbaar.
- In de ontwikkelronde ontsnappen vijf van vijf blinde spelers zonder coaching.

---

### 5.4 Flight wordt toegekend zonder betrouwbare bedieningstekst

#### Bronbevestigd

- De tutorialbeloning zegt: `Flight unlocked • 30 seconds free • +40 M`.
- De tekst noemt geen toets.
- `systems/visual/HUDSystem.js` maakt `flyHintText` met `setVisible(false)`.
- `setFlightHeight()` verandert alleen tekst en kleur; het maakt de hint niet zichtbaar.
- De oude opening-Flight-hulp staat elders standaard uit.

De speler kan dus de juiste ontsnappingsvaardigheid bezitten zonder te weten dat Shift haar activeert.

Kimmo bevestigt dit letterlijk: nadat Mila Shift uitlegde, zei hij dat hij beneden vastzat en “Wist ik net nog niet”. Technisch beschikbare Flight bestond voor hem functioneel niet vóór de toets op het juiste moment was geleerd.

#### Oplossing

- Maak permanente basic Flight of een gegarandeerde veiligheidsreserve de basis; behandel de huidige 30 seconden alleen als bonus, niet als anti-softlock.
- Laat de beloningskaart de actuele keybinding gebruiken: `Houd {fly} vast om te vliegen`.
- Laat vlak voor de eerste afdaling een korte input-prompt verschijnen.
- Verberg hem pas nadat de speler Flight aantoonbaar eenmaal heeft gebruikt.
- Toon bij onvoldoende GP een andere boodschap dan bij een niet-ontgrendelde vaardigheid.

#### Acceptatietest

Een tutorialskip, aangepaste keybinding en standaard Shift-pad moeten alle drie de juiste actuele toets tonen. De prompt verdwijnt pas na een succesvolle Flight-input.

---

### 5.5 De tutorial belooft graafkracht maar verkoopt bijna onzichtbare loopsnelheid

#### Bronbevestigd

De vierde stap zegt:

> “MAKE THE NEXT DIG EASIER”  
> “buy Agility Training”

Maar Agility Training:

- kost 3;
- geeft +5 sideways speed;
- verandert de startsnelheid van 200 naar 205 px/s;
- is dus slechts **2,5% sneller**;
- verandert geen schade, hit count of swing cadence.

Dit ondermijnt vertrouwen. De tutorial leert niet alleen iets zwaks; hij leert een oorzaak-gevolgrelatie die niet klopt.

#### Oplossing

Leg vóór implementatie één gezaghebbende eerste aankoop vast: upgrade-ID, prijs, fundingbron, doelmateriaal en volledige voor/na-hitmatrix. Een sterke kandidaat is een **mijnupgrade met zichtbaar breakpoint**:

- representatieve start-dirt gaat bijvoorbeeld van drie treffers naar twee; of
- de contact/swing-cadans wordt zo merkbaar sneller dat de speler het zonder cijfers benoemt.

Toon daarna meteen één vergelijkbaar blok met een korte voor/na-presentatie:

```text
Vóór: 3 treffers
Nu:   2 treffers
```

Gebruik de echte live shoptransactie en echte spelerstats; geen los tutorialtoneel dat de productie-economie maskeert.

#### Acceptatietest

Vijf van vijf spelers in de ontwikkelronde beantwoorden zonder statscherm correct: “Wat veranderde er door je upgrade?” Daarna breken zij een representatief blok aantoonbaar sneller. Een tweede, ongeholpen lus met normale HP, drops, prijzen en zonder tutorialgeld moet vervolgens een organisch gefinancierde verbetering opleveren.

---

### 5.6 De eerste pickaxe kan gewone dirt zelfs slechter maken

#### Bronbevestigd

- Startschade voor zachte tiles: 16.
- Bronze Pickaxe: 12 flat damage.
- Dirt-multiplier: 1,0.
- `PlayerAbilities._getNormalMiningDamageForTile()` vervangt de basisschade door pickaxeschade zodra `pickaxeDamage > 0`.
- Ondiepe dirt begint op 45 HP.

Daarmee ontstaat voor standaard ondiepe dirt:

```text
zonder pickaxe: ceil(45 / 16) = 3 treffers
Bronze Pickaxe: ceil(45 / 12) = 4 treffers
```

Dit is een concrete versie van Fnabs klacht over tijd in resources tegenover upgrades. Een vroeg stuk gereedschap kan de meest voorkomende grondstof objectief langzamer maken.

#### Oplossing

Voer een monotoniciteitsregel in:

> Een gekochte mining-upgrade mag op geen enkel materiaal waarvoor hij bedoeld is slechter presteren dan de voorafgaande toestand.

Technisch kan dat via:

- `max(baseDamage, pickaxeDamage × materialMultiplier)`, of
- een herontworpen pickaxetabel waarbij iedere volgende tier op zijn doelmaterialen een merkbaar breakpoint behaalt.

De exacte formule moet uit een hits-to-break-matrix komen, niet uit losse schadegetallen.

#### Acceptatietest

Een geautomatiseerde matrix test iedere verkrijgbare pickaxe tegen ieder relevant materiaal en faalt wanneer een upgrade meer treffers nodig heeft dan de vorige toestand.

---

### 5.7 De werkelijke mijncadans is langzaam en de oefentile verbergt dat

#### Bronbevestigd

- `MINING_CONFIG.mineCooldownMs = 750`.
- Startscha­de zachte tiles = 16.
- Ondiepe dirt = minimaal 45 HP.
- Dus dirt vergt drie treffers en minimaal ongeveer 1,5 seconde tussen de eerste en derde contactmogelijkheid.
- Het tutorialblok heeft slechts 1 HP en test daarom niet de representatieve kerncadans.

Er bestaat daarnaast configuratiedrift:

- een oudere `GAME_CONFIG.mineCooldownMs = 200` lijkt snel;
- de scene spreidt later `MINING_CONFIG`, waardoor 750 ms wint;
- `MINING_CONFIG.maxTileHp = 5` is geen betrouwbare bron voor de actuele WorldModel-HP, die uit de veel hogere tile-health-config komt.

Dit is zowel een ontwerp- als onderhoudsrisico: een ontwerper kan de verkeerde waarde tunen en denken dat de game sneller is gemaakt.

#### Oplossing

Niet alles globaal versnellen. Meet afzonderlijk:

- input tot eerste contact;
- tijd tussen geldige treffers;
- treffers per startmateriaal;
- looptijd tot eerste mijnplek;
- aantal blokken voor de eerste aankoop;
- tijd tot merkbare upgrade;
- duur van de terugweg.

Behoud het 1-HP oefenblok om richten te leren, maar laat direct daarna representatieve dirt volgen. Test daarna een tweede ongeholpen lus met normale HP, drops, prijzen en zonder tutorialgrants, zodat een gecureerde opening de echte economie niet kan maskeren. Ruim dubbele/stale configuratie op zodat één bron de runtimecadans bepaalt.

#### Acceptatietest

Log voor de eerste 10–20 tiles de echte contacttijden, HP, schade, hit count en beloning. Tuning wordt alleen geaccepteerd als de eerste lus sneller en duidelijker wordt zonder diepere materialen triviaal te maken.

---

### 5.8 “Return to Safety” combineert twee verschillende functies

#### Bronbevestigd

De pauzeknop:

- is direct zichtbaar als `RETURN TO SAFETY`;
- teleporteert naar veiligheid;
- verliest per gedragen resource 50%;
- heeft een cooldown van tien minuten;
- past deze verhouding zowel in Casual als Hardcore toe.

Fnab gebruikte de oude gratis variant als merchant-shortcut. De huidige straf lijkt bedoeld om dat gedrag te ontmoedigen, maar het gesprek bewijst niet dat dit het exploit daadwerkelijk oplost. Wel creëert hij een nieuw probleem: een speler die door onduidelijke traversal vastloopt, wordt bestraft alsof hij bewust een riskante expeditie afbreekt.

#### Ontwerpfout: twee intenties in één knop

Er zijn feitelijk twee verschillende behoeften:

1. **Position recovery / unstuck**  
   Herstel een ongeldige of onleesbare positie zonder naar de winkels te reizen.

2. **Expeditie opgeven / terug naar stad**  
   Kies bewust voor directe extractie en accepteer een aangekondigde prijs.

Door die samen te voegen is elke prijs fout:

- gratis maakt er een merchant-fast-travel van;
- 50% verlies straft onboarding- en leveldesignfouten.

#### Oplossing

Splits de functies:

##### A. “Maak me los”

- herstel een vastgelegde laatste veilige grondpositie binnen een begrensde afstand;
- blijf in dezelfde mijnzone en steek nooit een locked gate, hazard, depth transition of merchantgrens over;
- geen resourceverlies;
- geen winkelteleport;
- tijdens onboarding altijd gratis;
- log de oorspronkelijke locatie als leveldesignsignaal.

##### B. “Expeditie opgeven”

- verplaats bewust naar de stad;
- toon exacte kosten vóór bevestiging;
- introduceer dit pas nadat de gewone terugweg is geleerd;
- Casual kan later, na aparte validatie, werken met een kleine vaste fee of één gratis vroege redding; voeg in P0 geen nieuw cache-economiesysteem toe;
- 50% verlies hoort pas bij een expliciet begrepen strengere regel of Hardcore.

#### Acceptatietest

- Geen speler gebruikt “Maak me los” om sneller bij een merchant te komen.
- Geen speler verliest in onboarding buit door een onbegrepen put.
- Vijf van vijf spelers in de ontwikkelronde kunnen vóór bevestiging exact zeggen wat “Expeditie opgeven” kost en waarom.

---

### 5.9 Niet-breekbare tiles geven geen semantische feedback

#### Bron- en feedbacksignaal

Dit is een **aanvullend repo- en playtestsignaal**, geen directe klacht van Fnab. Een eerdere tester meldde “random unbreakable blocks”. In de huidige miningflow kan een geblokkeerde hit wel contactanimatie geven, maar zonder uitleg van de betekenis van het materiaal.

Dit voelt als:

- een bug;
- te weinig damage;
- een ontbrekende magic ability;
- of willekeurig leveldesign.

#### Oplossing

Geef één keer per materiaalfamilie korte world-space feedback met een onderscheidende contactklank:

- `Cave wall — zoek een ingang`
- `Town foundation — kan niet worden afgegraven`
- `Sealed geode — nog niet breekbaar` (noem Heavy Punch pas wanneer die ability relevant is)
- `Bedrock — grens van deze route`

Daarna blijven herhaalde treffers stil of geven alleen de herkenbare klank. Gebruik hiervoor geen lange notificatiecarrousel.

#### Acceptatietest

Een blinde speler herkent binnen één seconde of de tile permanent, routegebonden of ability-gebonden is. Na de eerste uitleg ontstaat geen tekstspam.

---

### 5.10 Te veel vroege merchants, schermen en late-gamewoorden

#### Bronbevestigd

Dit is een aanvullende repo-audithypothese die Fnabs brede “VEEL” kan verklaren; hij somt deze labels zelf niet op. De oppervlakconfig bevat direct meerdere merchants, waaronder:

- Bobo;
- Player Upgrades;
- Gem;
- Gear;
- Money Monster.

Daarnaast laat het pauzemenu vroeg termen zien zoals:

- Journey;
- Talents;
- Titans;
- Ancient Relics;
- Campfire.

Niet ieder systeem staat letterlijk tegelijk actief in beeld. Maar voor een nieuwe speler telt elk onbekend label als een open lus: “Moet ik dit nu begrijpen?”

De onzichtbare merchants kwamen uit Mila's eigen observatie, niet uit Kimmo's feedback. Toch is een onzichtbare verplichte seller een harde smoketestfailure: zonder zichtbare seller kan geen enkele eerste lus betrouwbaar worden beoordeeld.

De huidige bron probeert statische sprites en video te laden en kan bij volledig ontbrekende assets een debugplaceholder tonen. Dat bewijst niet dat het juli-probleem vandaag nog bestaat. Een cached maar blanke video en een onvolledige runtimecanary blijven risico's; test daarom zichtbare pixels, interactieprompt en juiste shopopening op het echte package.

#### Oplossing

Gebruik progressieve openbaarmaking op basis van behoefte:

- **De essentiële seller mag niet discoverable zijn.** Die moet in de eerste lus onmogelijk te missen zijn.
- De eerste relevante upgrader staat naast of in dezelfde duidelijke route als de seller.
- Optionele merchants mogen later gevonden worden wanneer de bijbehorende valuta of behoefte bestaat.
- Stuur gameplaytabs, shoprijen, gameplay-keybindhints, HUD-concepten en landmarks vanuit één availability-matrix.
- Verberg nooit key remapping, accessibility, save, quit, audio of display settings achter progressie.
- Toon maximaal één permanente gameplayactie-opdracht tegelijk.

#### Acceptatietest

Een fresh demo-save ziet vóór de eerste sale geen merchant of menuonderdeel waarmee hij nog niets kan doen. Na iedere ontgrendeling kan de speler zeggen welk nieuw probleem de optie oplost.

---

### 5.11 De opstart vraagt keuzes vóórdat de speler de game kent

#### Bronbevestigd

Dit is een aanvullende repo-audithypothese, niet een door Fnab afzonderlijk benoemde klacht. Een nieuwe save kan vóór de kernactie al langs mode- en tutorialkeuzes gaan. Voor een terugkerende speler is dat controle; voor een Steam-demo is het cognitieve belasting zonder context.

#### Oplossing voor de demo

- start direct in Casual;
- gebruik één geïsoleerde demosave;
- start begeleiding automatisch;
- verwijder tutorialskip uit de gecureerde demo, of behandel hem als een apart volledig te valideren pad met Flight, keyprompt, veilige afdaling, seller en begrepen upgrade;
- stel karakter-, mode- en brede savekeuzes uit tot zij betekenis hebben.

De volledige game hoeft deze keuzes niet kwijt te raken. Alleen het demoprofiel maakt een scherpe eerste route.

#### Acceptatietest

Van “Play Demo” tot bestuurbare speler zijn geen ontwerpkeuzes nodig en verstrijken hoogstens enkele seconden plus noodzakelijke laadtijd.

---

### 5.12 Darkness en sterren: inhoudelijk verbonden, nog niet als fun bewezen

#### Wat al sterk is

De huidige systemen hebben wel degelijk een inhoudelijke relatie:

- darkness beperkt zicht;
- de torch kost GP;
- Flight gebruikt eveneens GP;
- Star Blocks blijven als navigatiebeacons zichtbaar;
- het minen van een ster verwijdert dat licht en voedt constellationprogressie;
- diepere of strengere omstandigheden verhogen de druk.

Dit is dus niet zomaar technisch “50 losse systemen”.

#### Waarom Fnabs vraag nog steeds terecht is

De relatie bewijst niet automatisch dat de speler:

- haar opmerkt;
- de keuze begrijpt;
- gedrag verandert;
- plezier beleeft aan de trade-off.

Als vroege sterren hoofdzakelijk willekeurig verschijnen, kan de game de bedoelde relatie niet betrouwbaar onderwijzen of testen.

#### Oplossing

Auteur één gegarandeerde, veilige vroege darkness-pocket:

1. een ster is buiten de normale lichtradius als baken zichtbaar;
2. de route is leesbaar en heeft een veilige terugweg;
3. de speler kan het baken behouden;
4. de speler kan het baken minen voor beloning/progressie;
5. torch-GP biedt een derde oplossing;
6. het weghalen van de ster verandert zichtbaar de ruimte.

Niet uitleggen met een wiki. Laat de ruimte de keuze demonstreren.

#### Acceptatietest

Minstens vier van vijf spelers kunnen na de pocket zeggen:

- wat de ster voor navigatie deed;
- wat er veranderde toen hij werd gemined;
- welke alternatieve lichtbron beschikbaar was.

Als spelers hun route of resourcegebruik niet veranderen, moet het systeem later worden onthuld of eenvoudiger worden gemaakt.

---

### 5.13 Developercoaching en wijzigingen tijdens de sessie verbergen onboardingfalen

De Kimmo-sessie werd na de eerste vragen actief gestuurd: Mila gaf richting, `F`, Flight en Shift, terwijl de tutorial mogelijk tussendoor wijzigde. Dat hielp Kimmo verder, maar maakte zelfstandige begrijpelijkheid vanaf dat moment onmeetbaar.

#### Oplossing

- Freeze één build-ID vóór de run.
- Gebruik een fresh save en schone cache.
- Geef geen chat- of voicehints vóór de gemeten lus is voltooid.
- Log iedere spontane vraag en stilstand; geef de game eerst kans zichzelf te corrigeren.
- Als de ontwikkelaar moet antwoorden, faalt die begripsmeting.
- Als code of configuratie wijzigt, is de volledige run ongeldig en begint een nieuwe fresh-save-run.
- Neem het scherm op zodat een uitspraak als “Wat is dit?” aan het echte object of event kan worden gekoppeld.
- Meng geen save-exportinstructie door de eerste kernlus; de demo gebruikt een geïsoleerde, automatisch beheerde save en biedt export later als vrijwillige beheerfunctie.

In de huidige bron autosavet de game periodiek en bij verbergen of afsluiten. “Save” en “Save and Export” zijn aparte acties. Het juli-advies om te exporteren is daarom geen huidige normale persistencevereiste; hernoem export desnoods naar `Download backup / transfer copy (optional)`.

---

## 6. De diepere lessen

### 6.1 “Meer” kan de fantasie zijn, maar dan moet de game die rijkdom doseren

Cookie Clicker, Diablo en Path of Exile bewijzen dat systeemrijkdom aantrekkelijk kan zijn. Hun hoeveelheid werkt omdat de speler:

- begint met een kleine set handelingen;
- steeds een concreet probleem krijgt;
- daarna een tool voor dat probleem ontvangt;
- bestaande kennis hergebruikt;
- niet iedere toekomstige laag vanaf minuut één hoeft te begrijpen.

De fout is dus niet “veel content”. De fout is **veel gelijktijdige verplichtingen vóór de eerste beloning**.

### 6.2 Samenwerking tussen systemen is noodzakelijk, maar niet voldoende

Twee slechte of onduidelijke systemen kunnen technisch perfect samenwerken en samen nog steeds onleuk zijn. Ieder systeem moet vijf bewijzen leveren:

1. welke kernhandeling het versterkt;
2. welke keuze het creëert;
3. wanneer de speler die keuze nodig heeft;
4. hoe oorzaak en gevolg zichtbaar zijn;
5. welk gedrag in een playtest laat zien dat het werkt.

### 6.3 Frictie is alleen leuk wanneer zij begrijpelijk en beheersbaar is

Langzaam graven, verdwalen, darkness en verlies kunnen allemaal goede spanning creëren. Ze worden frustratie wanneer de speler:

- de regel niet kent;
- geen eigen fout kan aanwijzen;
- de oplossing niet heeft geleerd;
- geen herstelpad ziet;
- of de beloning niet evenredig voelt.

### 6.4 Een tutorial is geen hoeveelheid tekst

Een langere tutorial of wiki lost deze feedback waarschijnlijk niet op. Een goede vroege les is:

```text
behoefte voelen
→ één actie tonen
→ speler laat uitvoeren
→ direct gevolg tonen
→ actie opnieuw in echte context gebruiken
```

Voor verplichte kernregels moet de wereld duidelijk zijn. Een wiki is alleen geschikt als later naslagwerk voor vrijwillige diepgang.

### 6.5 De eerste mislukte aanname is waardevoller dan een likes/dislikes-enquête

Fnab kon de vragenlijst niet beantwoorden omdat de game hem niet tot het punt bracht waarop zulke vragen betekenis hebben. Tijdens de volgende test moet daarom eerst worden geobserveerd:

- eerste verkeerde aanname;
- eerste stilstand langer dan 15 seconden;
- eerste onbegrepen UI-label;
- eerste recoverygebruik;
- eerste moment waarop de speler zegt “waarom?”;
- exact quitmoment.

Pas na een voltooide kernlus zijn vragen over favoriete systemen betrouwbaar.

---

### 6.6 De ontwikkelaar mag niet de ontbrekende tutorial zijn

Een live antwoord als “F” of “Shift” maakt de sessie speelbaar, maar bewijst niet dat de game duidelijk is. Iedere noodzakelijke ontwikkelaarshint wordt als onboardingdefect gelogd. Een spontane vraag is niet automatisch een harde failure als de game haar snel zelf beantwoordt; ingrijpen of blijvende blokkade is dat wel.

### 6.7 Verwondering is nog geen anticipatie

Kimmo's positieve reactie toont dat de game aandacht kan grijpen. Anticipatie is pas bewezen wanneer de speler zelfstandig weet wat hij nu doet, welke nabije beloning volgt en vrijwillig de volgende stap begint.

> Toon altijd één huidige handeling en één verdiende volgende belofte.

Dat betekent niet alle mysteries uitleggen. Eén intrigerend object, geluid of silhouet mag de diepte teasen, zolang het nog geen extra verplichte regel of menu wordt.

---

## 7. Een heldere North Star voor Dig Game

Deze ene pagina moet nieuwe systemen begrenzen.

### Spelersfantasie

> Ik hak mijn eigen blijvende route door een gevaarlijke ondergrond, breng waarde veilig thuis en keer zichtbaar sterker terug om dieper te komen.

### Kernbelofte

> **Dig. Upgrade. Survive. Go deeper.**

### 30-secondenlus

1. Kies een richting.
2. Lees materiaal of gevaar.
3. Raak een tile met direct, bevredigend contact.
4. Ontvang duidelijke waarde of nieuwe informatie.
5. Beslis: verder, omweg of terug.

### Vijf-minutenlus

1. Daal doelgericht af.
2. Verzamel begrijpelijke buit.
3. Keer zonder onduidelijke traversalstraf terug.
4. Verkoop bij één duidelijke kernmerchant.
5. Koop één upgrade die voelbaar gedrag verandert.
6. Herhaal en voel onmiddellijk het verschil.

### Vier pijlers

- **Tactiel graven:** richten, raken, breken en verzamelen voelen direct goed.
- **Leesbaar risico versus terugkeer:** de speler begrijpt gevaar, terugweg en verlies vóór hij kiest.
- **Zichtbare progressie:** een aankoop verandert een handeling, niet alleen een verborgen getal.
- **Diepere nieuwsgierigheid:** de volgende laag wordt geteased zonder de huidige laag te overschrijven.

### Afwijzingsregels

Een idee komt niet in de eerste demo als het:

- een ongeïntroduceerde ability verplicht;
- een speler straft voor onduidelijke traversal;
- geen merkbare eerste beloning heeft;
- alleen via een wiki begrijpelijk is;
- een toekomstige valuta of systeem toont voordat er een behoefte is;
- geen meetbaar spelersgedrag verandert;
- dezelfde beslissing als een bestaand systeem nogmaals aanbiedt.

---

## 8. Voorgestelde eerste vijf minuten

| Tijd | Ervaring | Wat zichtbaar mag zijn | Bewijs |
|---|---|---|---|
| 0:00–0:20 | Directe Casual-start, controle over speler | Bewegen + één persistent doel | Speler wijst zonder chat of richtinghint de onmiddellijke target aan en begint ernaartoe te bewegen. |
| 0:20–1:00 | Eerste zichtbare oefentile en representatieve dirt | Contextuele actuele dig-toets, richten, graven, cargo | Speler ontdekt de huidige keybinding in-game en voert één geldige diginput zelfstandig uit. |
| 1:00–1:40 | Veilige verticale oefening | Permanente basic Flight met actuele toets; wall-climb pas later | Speler gebruikt Flight succesvol vóór de eerste echte afdaling en ontsnapt daarna ook met lege normale GP. |
| 1:40–2:50 | Korte echte mijnroute en buit | Alleen relevante HUD-waarden | Speler weet welke kant “terug” is. |
| 2:50–3:30 | Eén onmisbare seller | Sell-interactie | Speler verkoopt zonder winkels te vergelijken. |
| 3:30–4:15 | Eén betekenisvolle mining-upgrade | Echte voor/na-preview | Representatieve dirt gaat bijvoorbeeld van 3 naar 2 treffers. |
| 4:15–5:00 | Tweede dig plus diepere tease | Eén volgende beloning en één niet-actionable mysterie/silhouet | Speler begint vrijwillig aan een volgende actie richting dieper graven of een nieuwe verbetering. |

De demo hoeft in deze vijf minuten niet uit te leggen hoeveel content er uiteindelijk bestaat. Hij moet bewijzen dat de basislus leuk is.

De anticipation-regel is: **één huidige handeling plus één verdiende volgende belofte**. Voor de eerste sale mag de speler bijvoorbeeld al zien dat zijn buit één concrete miningverbetering financiert; diepere systemen blijven alleen als sfeer of silhouette aanwezig.

---

## 9. Demo-scope: tonen, later onthullen en alleen teasen

### Direct speelbaar

- lopen;
- richten en normaal graven;
- permanente basic Flight of een onuitputtelijke veiligheidsreserve als kerntraversal/recovery;
- wall-climb pas later wanneer een concrete ruimte het nodig maakt;
- cargo en waarde;
- één seller;
- één betekenisvolle mining-upgrade;
- depth als eenvoudige belofte;
- veilige position recovery.

### Later in dezelfde demo onthullen

- één gegarandeerde cave of geode;
- één gecureerde darkness/star-keuze;
- één compact moment van omgevingsgevaar;
- eventueel campfire pas wanneer de speler een reden voor planning heeft.

### Alleen aan het einde teasen

- volledige talentstructuur;
- Titans;
- Ancient Relics;
- World Two;
- Arc Core;
- Quickslash en Thunder Strike;
- uitgebreide constellationkeuzes;
- Hardcore;
- hoge merchant- en pickaxetiers.

### Niet als aparte fork

Gebruik één productieprofiel, bijvoorbeeld via:

- `values/demoConfig.js` voor availability en pacing;
- `systems/demo/DemoDirector.js` voor demovoortgang;
- `ui/overlays/DemoEndOverlay.js` voor het einde en de wishlist-call-to-action;
- een geïsoleerde demosave.

Alle gameplayzichtbaarheid moet uit dezelfde availability-laag en expliciete matrix komen: NPC-prompts, shoprijen, gameplaytabs, keybindhints, HUD-termen en worldevents. Key remapping, accessibility, save, quit, audio en display blijven altijd bereikbaar. Zo blijft het gedrag testbaar en ontstaat geen tweede game die later uiteenloopt.

---

## 10. Oplossingsmatrix voor alle klachten

| Klacht of kritiek | Werkelijke behoefte | Voorgestelde oplossing | Prioriteit |
|---|---|---|---|
| “Heb je het zelf wel geplaytest?” | Reproduceerbare end-to-endcontrole | Maak de eerste vijf minuten een deterministisch testcontract en voer iedere release met fresh save uit. | P0 |
| Makkelijk vastzitten | Veilige, geleerde terugweg | Permanente safety-Flight vóór risico, alle pre-Flightroutes beschermen, wall-climb later leren en begrensde last-safe recovery bieden. | P0 |
| Resources kosten veel tijd tegenover upgrades | Voelbare beloningsverhouding | Meet tijd-tot-aankoop en hit breakpoints; eerste upgrade verandert echte miningcadans. | P0 |
| “Hetzelfde maar vooral MEER” | Progressieve onthulling | Demoprofiel met harde feature-allowlist en één nieuwe actiebehoefte tegelijk. | P0 |
| Meer opties geven balanceerproblemen | Beheersbare combinatoriek | System admission checklist, hits-to-break-matrix en regressietests per tier/materiaal. | P1 |
| Speler wordt overweldigd | Eén huidige intentie | Eén persistent doel; irrelevante merchants, tabs, valuta en prompts verborgen. | P0 |
| Onduidelijke game-identiteit | Herkenbare kernbelofte | North Star, vier pijlers en afwijzingsregels uit hoofdstuk 7 vastleggen. | P0 |
| X/Y/Z lijken willekeurig toegevoegd | Iedere feature heeft reden en timing | Vereis probleem, beslissing, timing, gevolg, metriek en verwijdering/overlap vóór opname. | P1 |
| Ontwerprationale en vergelijkende analyse zijn voor Fnab niet zichtbaar | Ontwerppatronen begrijpelijk toepassen | Vergelijk Motherload, Dome Keeper en Wall World op eerste lus, risk/return, reveal timing en fail recovery; maak het resultaat voelbaar in de game. | P1 |
| Eerst klein en leuk maken | Vertical slice | Eerste vijf minuten als kleinste bewezen product; pas uitbreiden na gates. | P0 |
| Movement moet eerst prettig zijn | Sterke basisbediening | Tune lopen, richten, contact, wall-climb, vallen en Flight vóór economiebreedte. | P0 |
| Darkness/sterren mogelijk willekeurig | Betekenisvolle keuze | Eén gecureerde pocket; behoud baken versus mijn beloning versus torch-GP. | P1 |
| “Werkt” moet hier als spelersfun worden beoordeeld | Spelerfun als criterium | Iedere feature krijgt een observeerbare gedrags- en begripsmeting. | P0 |
| Vragenlijst niet invulbaar na vijf minuten | Eerst de lus laten ervaren | Gebruik observatievragen; likes/dislikes pas na eerste volledige lus. | P0 |
| “Traag” | Sneller bewijs, niet blind globale snelheid | Kortere reis, representatieve dig, snellere eerste payoff, gemeten cadans. | P0 |
| “Onduidelijk” / “Begrijp niet wat ik moet doen” | Blijvende context en zichtbare gevolgen | Persistente tutorial, één onmiddellijke target, correcte inputprompt, blokfeedback en duidelijke returnregels. | P0 |
| “Hoe graaf je?” | Discoverability van de kernhandeling | Contextuele actuele-keyprompt, zichtbare graafbare target en bevestiging na een geldige diginput. | P0 |
| Ontwikkelaar gaf F/Shift en wijzigde de tutorial | Geldig playtestbewijs | Frozen build, fresh save, nul coaching; interventie maakt begripsmetrics ongeldig. | P0 |
| “VEEL” | Beperkt actueel keuzebudget | Maximaal één persistent doel en één nieuw actionable systeem tegelijk. | P0 |
| “Kan je nog terug omhoog?” / “Ik zat vast beneden” | Traversal vóór gevaar leren | Leer en laat Shift/Flight succesvol gebruiken vóór afdaling; bescherm alle pre-Flightroutes en bied begrensde recovery. | P0 |
| Gratis return werd merchant-abuse | Recovery zonder fast-travel | Lokale unstuck blijft in de mijn; stadextractie is aparte actie. | P0 |
| Nieuwe return verliest helft resources | Begrijpelijke, proportionele consequentie | Onboarding no-loss; Casual mild; 50% alleen expliciet/streng; exacte preview. | P0 |
| “Waarom zijn al deze dingen zo?” | Ontwerpintentie voelbaar maken | Iedere regel moet één kernbeslissing ondersteunen en door playtestgedrag bewezen worden. | P0 |

---

## 11. Aanbevolen uitvoeringsvolgorde

### Fase 0 — Freeze en observeer

1. Freeze build-ID en package.
2. Smoke-test tutorial, digprompt en Flightprompt; verifieer voor iedere verplichte merchant zichtbare pixels, interactieprompt en de juiste shop.
3. Start met fresh save en schone cache.
4. Neem scherm en timestamps op.
5. Geef geen ontwikkelaarscoaching.
6. Restart de volledige run wanneer code of configuratie verandert.

**Exitcriterium:** één aantoonbaar vaste, reproduceerbare testconditie voordat spelersfeedback wordt geïnterpreteerd.

### Fase 1 — Niemand mag door onduidelijkheid vastlopen

1. Maak tutorialdoel persistent.
2. Verplaats de eerste dig in de openingscamera; voeg screen-edge guidance alleen toe als ruimtelijke authoring aantoonbaar niet volstaat.
3. Bescherm alle neerwaartse pre-Flightopeningen, niet alleen surface drop.
4. Maak permanente veiligheids-Flight de enige vroege verticale regel; leer wall-climb later.
5. Maak Flight-keyprompt zichtbaar en input-aware.
6. Splits een begrensde same-zone last-safe recovery van expedition abandon.

**Exitcriterium:** vijf blinde fresh-save-runs, nul onbegrepen of onherstelbare pits.

### Fase 2 — De eerste lus moet zijn belofte waarmaken

1. Vervang Agility als verplichte eerste aankoop door een merkbare mining-upgrade.
2. Repareer Bronze Pickaxe-monotoniciteit.
3. Toon echte voor/na-breakpoints via de live shopflow.
4. Meet first-contact, hits-to-break, eerste sale en eerste upgrade.
5. Ruim tegenstrijdige miningconfig op.
6. Valideer daarna een tweede ongeholpen lus met normale HP, drops, prijzen en zonder tutorialgrants.

**Exitcriterium:** mediane volledige lus ≤ 5 minuten en 5/5 spelers in de ontwikkelronde merken de upgrade zonder cijfers; daarna volgt de grotere release-candidatecohort.

### Fase 3 — Verminder het actuele keuzebudget

1. Voeg één centraal demoprofiel en een expliciete availability-matrix toe.
2. Verberg irrelevante merchants, shoprijen, gameplaytabs, HUD-termen en geavanceerde gameplay-keybindhints; houd accessibility en basisinstellingen bereikbaar.
3. Laat de seller en eerste upgrader onmogelijk missen.
4. Isoleer de demosave.
5. Voeg een gecontroleerd einde met volgende belofte toe.

**Exitcriterium:** geen zichtbaar systeem zonder huidige spelersactie of direct begrip.

### Fase 4 — Bewijs één diepere onderscheidende keuze

1. Maak één veilige gecureerde darkness/star-pocket.
2. Observeer route-, licht- en resourcekeuzes.
3. Houd het alleen vroeg zichtbaar als spelers de betekenis begrijpen.

**Exitcriterium:** vier van vijf spelers leggen de keuze correct uit en minstens drie handelen er bewust naar.

Pas daarna is verbreding met meer systemen verantwoord.

---

## 12. Eerste-vijf-minuten entrygates

Fnab definieerde deze percentages en tijden niet. Dit zijn analyst-defined operationele gates om zijn vijf-minutenstop reproduceerbaar op te lossen. “Leuk” blijft subjectief; de gates leveren sterker groepsbewijs, geen universele waarheid.

### Fase A — ontwikkelgate

Gebruik eerst vijf volledig blinde fresh-save-runs:

- 5/5 bereikt de eerste dig binnen 30 seconden.
- 5/5 voltooit zonder coaching `mine → return → sell → upgrade → stronger second dig`.
- 5/5 ontsnapt uit iedere vroege put, ook wanneer normale GP bewust leeg is.
- Nul kritieke softlocks, schijnsoftlocks of punitive recovery-acties.
- 5/5 merkt zonder stattekst wat de vastgelegde eerste upgrade veranderde.
- De eerste upgrade heeft één vast ID, prijs, fundingbron, doelmateriaal en voor/na-hitmatrix.
- Een tweede ongeholpen lus gebruikt normale HP, drops en prijzen zonder tutorialgrants.
- Geen gameplayverb, NPC, valuta, HUD-term, prompt, tab of event verschijnt vóór zijn prerequisite in de availability-matrix.
- Key remapping, accessibility, save, quit, audio en display blijven altijd bereikbaar.

- 5/5 begint de bedoelde eerste actie zonder dat iemand een richting noemt.
- 5/5 ontdekt en gebruikt de actuele digcontrol in de game.
- 5/5 gebruikt Flight succesvol vóór de eerste onveilige afdaling.
- 5/5 kent het terugkeermodel vóór de eerste echte schacht.
- Nul onzichtbare verplichte merchants.
- Nul externe hints vóór de gemeten lus.
- Een ontwikkelaarsantwoord maakt het begripsresultaat van die run ongeldig.
- Een wijziging aan build, code of configuratie maakt de volledige run ongeldig.

Een spontane vraag wordt gelogd maar is niet automatisch een harde failure wanneer de game haar binnen korte tijd zelf beantwoordt. Een noodzakelijke ontwikkelaarsinterventie, blijvende blokkade of traversal-/recoveryblokker faalt de fase, ook als de andere spelers slagen.

### Fase B — release-candidategate op het echte artefact

Test daarna met minimaal 15–20 nieuwe blinde spelers op de exacte geserveerde releasebuild of Steam-package:

- minimaal 90% voltooit de eerste volledige lus zonder coaching;
- nul kritieke softlocks of dataverlies;
- rapporteer p50, p80 en p90 voor first dig en eerste volledige lus; verberg trage uitbijters niet achter alleen een mediaan;
- streef naar p80 ≤ 5 minuten voor de volledige eerste lus;
- tel quits en incomplete runs als failures;
- meet vrijwillige voortzetting als werkelijk gedrag, niet alleen als antwoord op “wat wil je nu doen?”;
- log zichtbaar build-ID/commit, package-identiteit, clean profiel/cache en fresh save;
- valideer tutorialskip als eigen volledig pad, of verwijder hem uit de demo.

### Fase C — volledige Steam-demo releasegates

De eerste-vijf-minutengate is noodzakelijk maar niet voldoende voor publicatie. De volledige packaged demo moet daarnaast slagen op:

- completion rate en quitcurve over de beoogde volledige sessielengte;
- begrip van iedere latere reveal en van het demo-einde/wishlist-CTA;
- werkende Continue en Restart Demo;
- geïsoleerde demosaves en aantoonbaar ongewijzigd full-gamegedrag;
- nul late softlocks, permanente traps, crashes of save-corruptie;
- stabiele performance op de onderste doelspecificatie;
- een release-availability-matrix die exact overeenkomt met wat het package toont.

## 13. Vragen voor de volgende blinde playtest

Stel tijdens het spelen geen leidende vragen. Vraag pas na de eerste volledige lus:

1. Wat probeerde je in de eerste minuut te bereiken?
2. Wanneer wist je hoe je uit een put moest komen?
3. Hoe wist je waar je je resources moest verkopen?
4. Wat veranderde er door je eerste upgrade?
5. Wat wilde je daarna uit jezelf doen?
6. Welke NPC, knop of HUD-term heb je gezien maar niet begrepen?
7. Wat veranderde darkness aan je gedrag?
8. Op welk exact moment voelde het traag?
9. Op welk exact moment dacht je eraan te stoppen?
10. Welke regel voelde willekeurig, en wat dacht je dat de regel was?

Belangrijk: vraag niet eerst “wat vond je leuk?” De eerste vraag moet blootleggen welk doel de game daadwerkelijk communiceerde.

---

## 14. Kandidaatmechanismen om te behouden en opnieuw te bewijzen

De feedback betekent niet dat alles opnieuw moet worden gebouwd. De volgende bestaande mechanismen zijn sterke hergebruikskandidaten, maar “aanwezig” of “onderling verbonden” betekent nog niet dat hun spelersfun bewezen is:

- de event-driven tutorialflow `MOVE → DIG → SELL → UPGRADE`;
- het 1-HP oefenblok als korte richtles, direct gevolgd door normale materiaalwaarden;
- de bestaande Flight-code als basis voor permanente veiligheids-Flight;
- wall-climb als latere no-jump traversaloptie zodra een ruimte er concreet om vraagt;
- bestaande save- en persistencecontracten;
- portal-safe-landing en quick-resumegedrag;
- Star Blocks als kandidaat voor licht plus progression, pas behouden in de vroege demo wanneer de gecureerde pocket spelersgedrag aantoonbaar verandert;
- de goedgekeurde HUD-artworkroute;
- de blijvende, zelfgegraven mijn als voorgestelde kernidentiteit, te toetsen met spelers;
- de door Kimmo getoonde menselijke wow-hook: verwondering over wat er gebouwd is, om te zetten in zelfstandige spelersmotivatie.

De correctie zit vooral in **volgorde, zichtbaarheid, echte payoff, recovery en meetbaarheid**.

---

## 15. Eindbeoordeling per Fnab-zin

### “Heb je het zelf überhaupt wel geplaytest?”

Gerechtvaardigd vertrouwenssignaal. De brede klacht over vastzitten en resourceverhouding verwijst eerst naar de vorige iteratie; zijn huidige vijf-minutensessie levert een nieuwe put-, recovery- en duidelijkheidswaarschuwing. Antwoord niet met “ja”; antwoord met een reproduceerbare fresh-savegate op de exacte releasebuild.

### “Makkelijk vast kwam te zitten”

De huidige broncode bevestigt meerdere plausibele risicopaden: pre-Flightafdaling en onvoldoende geleerde verticale grammatica. Zij bevestigt niet zonder reproductie welke exacte geometrie of input Fnabs put onontsnapt maakte.

### “Tijd in resources tegenover upgrades”

Direct ondersteund door een bijna onmerkbare eerste Agility-upgrade en een Bronze Pickaxe die gewone dirt zelfs van drie naar vier treffers kan brengen.

### “Hetzelfde spel, maar vooral gewoon MEER”

De volledige game hoeft niet klein te worden. De eerste speelbare laag moet wel een harde allowlist krijgen zodat rijkdom een belofte voor later wordt in plaats van een verplichting nu.

### “Progressief introduceren”

Volledig overnemen. Niet op basis van kloktijd, maar op basis van bewezen behoefte en voltooide kernhandeling.

### “Wat moet het zijn, wat maakt het leuk, wat is de gameplay loop?”

Beantwoord met de North Star uit hoofdstuk 7 en gebruik haar als afwijzingsmechanisme voor nieuwe systemen.

### “Zonder onderdelen echt te testen: wat werkt, wat niet en waarom”

Voer per systeem een gedragsbewijs in. Technische aanwezigheid of integratie telt niet als funvalidatie.

### “Motherload maar dan anders, niet Motherload maar dan meer”

Behandel blijvende mijn, no-jump traversal, darkness en sterren als een voorgestelde onderscheidende combinatie, niet als al door Fnab gevalideerde identiteit. Bewijs ieder onderdeel één voor één.

### “Eerst iets kleins; als dat leuk is erop bouwen”

Maak de eerste vijf minuten de kleinste vertical slice en blokkeer uitbreiding totdat de meetbare gates slagen.

### Hollow Knight/movementvoorbeeld

Vertaal dit naar Dig Games eigen grammatica: lopen, aim, dig contact, vallen, wall-climb en Flight. Voeg geen jump toe.

### “Darkness + sterren: wat houdt dit in voor de speler?”

Beantwoord niet met lore of een systeemuitleg. Bouw één ruimte waarin behoud versus consumptie van een lichtbaken zichtbaar gedrag verandert.

### “Werkt als in: is leuk voor de speler”

Maak dit de definitie in ontwerp- en code reviews. Iedere feature heeft zowel technische tests als spelersgedragscriteria nodig.

### “Ik kom niet verder dan vijf minuten”

Dit is het primaire release-signaal. Geen enkele late-gamekwaliteit compenseert dit in een Steam-demo.

### “Traag, onduidelijk, VEEL”

Los in die volgorde samen op:

- sneller eerste contact en eerste payoff;
- permanent één duidelijke bedoeling en terugweg;
- alleen de nu bruikbare laag tonen.

### “Waarom zijn al deze dingen zo?”

De speler hoeft de ontwerpdocumentatie niet te kennen. De regel moet door situatie, gevolg en proportionele beloning zelf logisch voelen.

---

## 16. Volledige originele transcripties

Onderstaande transcripties zijn ongewijzigd overgenomen, inclusief spelling, hoofdletters, emoji en typfouten, zodat analyse en bron bij elkaar blijven.

<details>
<summary>Open het volledige Fnab-feedbackgesprek</summary>

```text
Hey Kas,Ik wil binnenkort een demo op steam lanceren voor mijn eigen game en vroeg me af of het je leuk lijkt om te helpen met het playtesten van het spel, zeker in deze fase bepaal je dan mee hoe het spel zicht otnwikkeldJe kunt het spel hier spelen: https://www.nextgen.run/diggame-beta-1/

[2:07 AM]
Fnab:
	Poee, ik heb je game vorige keer toen je het noemde gechecked, en ik vroeg mij een beetje af of je het zelf uberhoubt wel had geplaytest. Met hoe de gameplay loop eruit zag, waar je makkelijk vast kwam te zitten, de tijd die je moest steken in resources tegenover ubgrades fucking een hoop andere shit. Nu lijkt het hetzelfde spel, maar vooral gewoon MEER, wat juist meer problemen geeft, meer opties zijn is meer balancing is meer gekke quircks, Zou het doel MEER zijn, kan genoeg games die dat doen, maar insane om dat ALLEMAAL op je player te droppen. Genoeg andere soort games in het tema MEER, maar meestal is dat progressief. Je wordt langzaam geintroduceerd, mischien een glims maar je wil je speler niet overweldigen. Maar goed dit zijn al vrij specefieke dingen. Niet verkeerd bedoelt, heel tof om een eigen game te maken. Maar heb je een idee van wat het moet gaan zijn, wat het leuk maakt wat de gameplay loop is. Heb je iets van een design doc, eigenschappen van je spell en thema waar het zich aan moet houden?Want het lijk nu dus dat het iets is van ik wil kunnen lopen, top dat kan ik, nu will ik ubgrades, top dat heb ik, nu wil ik X, Y, Z. Zonder al die onderdelen echt te testen, kijken wat werkt wat niet werkt en waarom.Duidelijk inspiratie van motherload, fucking nice want fucking cool spel. Maar als je naar motherload kijkt hoe gaan die hier mee om, of andere spellen die inspiratie van motherload op doen: Domekeeper,Wall World. Motherload maar dan anders, niet zozeer motherload maar dan MEER.
	Kan zijn dat ik het fout inschat en opnieuw Games in het thema meer kunnen heel nice zijn. Cookie clicker, diablo, path of exile. Maar die doen dingen op een specifieke manier, de vraag is waarom. Wat werkt, wat werkt niet

[2:10 AM]
milajeweetzelfg:
	Hele goede punten, ik ben het grotendeels met je eens

[2:10 AM]
Fnab:
	Over het algemeen wil je eerst een idee heben van wat je wil, iets kleins en als dat leuk is kan je erop bouwen. Wat misschien kut voelt omdat hier al best wat tijd in zit

[2:11 AM]
milajeweetzelfg:
	ja ik denk dat ook systemen gestript moeten worden het voelt meer als 50 random systemen i.p.v een geheel
	Ik denk dat het ook een groot deel slechte planning en maar random wat doen is hahahaha
	maar je zou merchant bijvoorbeeld discoverable kunnen maken in de wereld langere toturials beter UI wiki er valt altijd wat te doen om het beter te maken
	dit somt het denk ik goed op: Want het lijk nu dus dat het iets is van ik wil kunnen lopen, top dat kan ik, nu will ik ubgrades, top dat heb ik, nu wil ik X, Y, Z. Zonder al die onderdelen echt te testen, kijken wat werkt wat niet werkt en waarom.

[2:13 AM]
Fnab:
	En misschien heb je al een duidelijk beeld, maar zo niet zou ik je aanraden om met een stuk papier, of als je modern bent een text document te gaan zitten en te gaan kijken naar wat je wil, inspiratie op doen in andere games. Kijken hoe zij het doen, nadenken over waarom en die shit. Eeen Design doc als je dat niet hebt. En begin klein, zorg dat dat al leuk is en ga dan verder

[2:15 AM]
milajeweetzelfg:
	wat bijvoorbeeld wel werkt in systemen die elkaar aanvullen is het darkness system + sterren die ligt geven

[2:15 AM]
Fnab:
	Een game als holo knight, om een voorbeeld te nemen, sluit niet super aan aan zoon game, maar voor het idee.eerst is gezorgt dat de movement heel nice aanvoelt, dat het al nice is om rond te lopen, dan hoe je springt en hoe floaty dat voelt, en hoe je op dingen bounced. Voor dat ze uberhoubt zijn begonnen aan de economy.Al die andere dingen zijn al wel uitgedacht, hee wat willen we : een economie, bosses, iets van een rune systeem. Maar je kan niet alles tegelijketijd maken, dan heb je 20 systemen die allemaal inividueel niet werken, laat staan samen werken
	"darkness system + sterren die ligt geven" Maar is dat gewoon random toegevoegd, of was dit al het plan. En werkt dit? Als in, blijkbaar heb je een darknes maar wat houdt dit in voor de speler? Dat altijd donker is onder de grond. Wat voor gevolgen heeft dit, hoe gaat een speler daar mee om, wat voor gedrag stimuleerd dat. Wat heb ik nodig om dit te laten werken (fakkels, sterren).
	Ik hoef daar geen antwoord op trouwens, rhetorisch
	Bedoel meer dat het goed is om te denken waarom dingen in je spel zitten, wat voegen ze toe of wat halen ze weg

[2:19 AM]
milajeweetzelfg:
	Ja het is ook wat je verwijderd klopt! systemen moeten samenwerken 50 losse ''leuk'' system zijn niet leuk, snap ik het dan goed?
	Wat zouden je antwoorden zijn op deze vragen: 1.What dit u like2.what dit u hatewhat do you want too see more ofwhat should be removed or drasticly changed?fill all issues/bugs u encounter that bothered u----------------------------------------------------

[2:20 AM]
Fnab:
	Misschien wel, misschien heb denk ik daar anders over. "Leuk" is subjectief. Ik bedoel vooral dat het heel lastig is om te zien wat werkt en wat niet werkt als je met 50 systemen tegelijk bezig bent

[2:21 AM]
milajeweetzelfg:
	Bedoel je code technisch werkt of player motivation game bevorderend werkt?

[2:21 AM]
Fnab:
	2, code technish ben je denk ik niet mee bezig schat ik in? groot gelijk
	Werkt als in is leuk
	voor de speler
	En ik kan geen antwoord geven op je vragen want ik kom niet verder dan 5 minuten

[2:23 AM]
milajeweetzelfg:
	De eerste 5 minuten zijn inderdaad denk ik ook super belangrijk

[2:23 AM]
Fnab:
	Traag, onduidelijk, VEEL. ik kan niet uit een gegraven put komen zonder ik neem aan magic op basis van de vorige iteratie
	in je vorige iteratie was er een return to surfce knop die ik abusde om je merchants te checken, maar die zit er nu ook in maar dan verlies je de helft van je recource
	Mijn vraag is waarom zijn al deze dingen zo
	Misschien met een goeie reden
	Misschien met een vet plan
	Maar ik ben benieuwd of die er zijn
	En opnieuw, niet echt dat ik daar antwoord op hoef te hebben
	Maar hee, het is fucking laat, ik moet nog wat andere shit fixen. Ik hoop dat je iets aan mijn geziek hebt.
	Succes

[2:26 AM]
milajeweetzelfg:
	thanks!
	Zeker
```

</details>

### Kimmo — WhatsApp-playtestsessie

**Context:** WhatsApp, 29 juli 2026. De exacte build is niet vastgelegd. De sessie bevat actieve coaching en een tutorialwijziging of onduidelijke versiewissel. Het ontbreken van een antwoord na 17:37 wordt niet als quitbewijs geïnterpreteerd.

<details>
<summary>Open het volledige Kimmo-feedbackgesprek</summary>

```text
[16:42, 7/29/2026] Kimmo Salespasswie: 😏😏
[16:42, 7/29/2026] mila henkelman: Aah ja volgens mij is de toturial nog broken en UI spam ect
[16:42, 7/29/2026] mila henkelman: Ondertussen gefixt
[16:43, 7/29/2026] mila henkelman: Ow lol zie dat de merchant onzichtbaR zijn? 🤣
[16:43, 7/29/2026] mila henkelman: Zal vast nog wat fout zijn heb tussendoor ok nog veel aangepast
[16:43, 7/29/2026] mila henkelman: Als je je save wilt bewaren moet je hem exporten via esc menu
😂
[16:44, 7/29/2026] Kimmo Salespasswie: Begrijp alleen nog niet wat ik moet doen
[16:44, 7/29/2026] mila henkelman: Graven naar rechts
[16:44, 7/29/2026] mila henkelman: Ofja graven
[16:44, 7/29/2026] mila henkelman: Je komt we vanzelf achter ;p
[16:45, 7/29/2026] Kimmo Salespasswie: Hoe graaf je?
[16:45, 7/29/2026] mila henkelman: F
[16:45, 7/29/2026] mila henkelman: Maar de town is onbreekvaar
[16:46, 7/29/2026] Kimmo Salespasswie: Kan je nog terug omhoog? 😄
[16:47, 7/29/2026] mila henkelman: Ja je kan zo vliegen als het goedgaat
[16:47, 7/29/2026] mila henkelman: Anders moet ik vnv ff patchen toturial is gefixt nu
[16:47, 7/29/2026] Kimmo Salespasswie: Wat is dit? :0
[16:49, 7/29/2026] Kimmo Salespasswie: Echt te sick eigenlijk dat je dit gewoon zelf hebt gemaakt
[16:52, 7/29/2026] mila henkelman: Nu kun je vliegen met shift
[16:53, 7/29/2026] mila henkelman: Dat was de toturial maar nog te verwarrend dus heb het aangepast
[16:53, 7/29/2026] Kimmo Salespasswie: Hahaha beter
[16:53, 7/29/2026] Kimmo Salespasswie: Ik zat vast beneden
[16:53, 7/29/2026] mila henkelman: Je kan toch vliegen met shift? 🤔
[16:54, 7/29/2026] Kimmo Salespasswie: Wist ik net nog niet 😂
[17:37, 7/29/2026] mila henkelman: Noig ergens gekomen?
```

</details>

---

## 17. Bronnen en geraadpleegde projectpaden

De belangrijkste gesprek- en bronkoppelingen in deze analyse:

- `values/retentionConfig.js`
- `values/keybindActions.js`
- `values/tileTypes.js`
- `values/saveScheduling.js`
- `systems/onboarding/TownSquareTutorialView.js`
- `systems/onboarding/TownSquareTutorialSystem.js`
- `ui/UINotificationSystem.js`
- `ui/UINotificationCarouselPresenter.js`
- `values/uiNotificationCarousel.js`
- `systems/visual/NextPromiseHudSystem.js`
- `values/playerCollision.js`
- `player/PlayerSurfaceDropController.js`
- `player/PlayerController.js`
- `player/PlayerAbilities.js`
- `world/model/DugTilesSaveStore.js`
- `world/playScene/OverlayManager.js`
- `world/playScene/NPCManager.js`
- `world/playScene/PlaySceneSaveScheduler.js`
- `systems/mining/DigSystem.js`
- `systems/visual/HUDSystem.js`
- `values/gameConfig.js`
- `values/playerStats.js`
- `values/miningConfig.js`
- `values/tileHealth.js`
- `values/upgradeDefinitions.js`
- `values/hardcoreMode.js`
- `world/PlayScene.js`
- `world/PlaySceneUI.js`
- `values/townSquareConfig.js`
- `values/lightConfig.js`
- `markdown/feedback/playtesters/frank/feebback26-07-2026.md`
- door de gebruiker aangeleverde Kimmo-WhatsAppconversatie van 29 juli 2026

---

## 18. Geactualiseerd definitief advies

Fnab en Kimmo zijn geen twee losse meningen over smaak. Zij leveren twee onafhankelijke sessies met dezelfde vroege failure signature:

```text
geen helder huidig doel
→ kerninput niet zelfstandig ontdekt
→ afdalen zonder geleerd terugkeermodel
→ vast of schijnbaar vast beneden
→ Flight/Shift pas na de noodzaak begrepen
```

Fnab diagnosticeert het brede ontwerpprobleem: de game presenteert breedte voordat de kern vertrouwen heeft verdiend. Kimmo toont de moment-tot-momentuitwerking: geen duidelijk doel, geen ontdekte diginput, geen geleerd terugkeermodel, vast beneden en Shift pas achteraf uitgelegd.

Kimmo bewijst niet zelfstandig Fnabs klachten over economie, upgrades, pacing of “MEER”. Hij maakt wel aannemelijk dat de speler die systemen niet autonoom kan beoordelen zolang de eerste intentie, handeling en veiligheid ontbreken.

Tegelijk toont Kimmo's bewondering dat de game al een hook heeft. De oplossing is niet alle verrassing verwijderen. De oplossing is die hook omzetten in:

1. **zelfstandige intentie:** de speler weet wat hij nu probeert;
2. **begrepen handeling:** de actuele graafinput wordt in context ontdekt en uitgevoerd;
3. **vooraf geleerde veiligheid:** Flight wordt vóór afdaling succesvol gebruikt;
4. **nabije anticipation:** de speler ziet welke concrete beloning de huidige actie mogelijk maakt;
5. **een bevredigende eerste lus:** graven, veilig terugkeren, verkopen, merkbaar upgraden en vrijwillig opnieuw beginnen.

De leidende first-five-minutesregel wordt:

> **Toon één huidige handeling, laat haar zelfstandig slagen en verdien daarna één volgende belofte.**

Pas wanneer dit in frozen, fresh-save, ongecoach­te packaged-buildtests slaagt, mag de brede systeemrijkdom de speler om aandacht vragen.