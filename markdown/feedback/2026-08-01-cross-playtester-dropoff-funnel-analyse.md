# Cross-playtester analyse: waar Dig Game spelers verliest, waarom en hoe

**Analysedatum:** 1 augustus 2026  
**Onderzochte spelers:** Fnab, Kimmo, Frank en Borick Yongaerts  
**Aanvullende bron:** Mila's eigen feedbacknotities van juni en juli 2026  
**Publiek geteste URL:** <https://www.nextgen.run/diggame-beta-1/>  
**Publieke build tijdens verificatie:** `601dc6b195e0`  
**Status:** kwalitatieve funnel-, gamedesign- en broncodeanalyse; geen gameplaycode gewijzigd

---

## 1. Hoofdconclusie

Dig Game verliest niet iedereen op één enkele fout. De uitval schuift mee met hoe lang iemand volhoudt:

```text
ik weet niet wat of hoe
→ ik maak een gat maar beheers de terugweg niet
→ ik voltooi handelingen maar begrijp de waarde nog niet
→ ik krijg veel systemen en administratie
→ ik herhaal vooral dezelfde input en wacht op de terugreis
→ uitzonderingen, popups en laadmomenten ondermijnen mijn vertrouwen
```

De diepste gedeelde oorzaak is daarom niet simpelweg **bloat**, **te weinig polish** of **te weinig mechanics**.

Het probleem is:

> De game vraagt vroeg veel begrip en geduld, maar bewijst pas laat — en soms helemaal niet — welke interessante keuze de speler in ruil daarvoor krijgt.

De testers zien wel ambitie, content en visuele potentie. Wat ze te vaak verliezen is:

1. **duidelijkheid:** wat moet ik nu doen en waarom;
2. **controle:** kan ik een fout zelf herstellen;
3. **agency:** maak ik betekenisvolle keuzes of houd ik alleen een knop vast;
4. **causaliteit:** veranderde mijn upgrade werkelijk iets dat ik merk;
5. **vertrouwen:** zijn blokkades, UI en technische regels voorspelbaar;
6. **motivatie:** waarom is de volgende expeditie anders dan de vorige.

Dat verklaart ook waarom Borick zegt dat het project overscoped voelt. Hij telt niet alleen systemen. Hij voelt dat de breedte van de game groter is dan de diepte van de handelingen die hij het vaakst uitvoert.

---

## 2. Wat de vier spelers werkelijk aantonen

| Speler | Bereikte fase | Positief signaal | Breekpunt | Wat dit bewijst |
|---|---|---|---|---|
| **Fnab** | Minder dan vijf minuten; kon de vragenlijst niet afmaken | Zag genoeg om de hoeveelheid systemen te herkennen | “Traag, onduidelijk, VEEL”; kwam niet autonoom uit de eerste ervaring | De eerste minuten verkopen de fantasie en lus nog niet snel genoeg |
| **Kimmo** | Eerste handelingen, met live coaching | Reageerde met bewondering op wat er gebouwd is | Wist niet wat te doen, hoe te graven, hoe terug omhoog te gaan en zat vast | Spectakel en waardering zijn aanwezig, maar leiden niet vanzelf tot speelcompetentie |
| **Frank** | Bereikte upgrades, cave-ins en ondergrondse uitzonderingen | Vond het upgradesysteem en cave-ins goed | Onduidelijke beklimming, zelfgemaakte gaten en “random unbreakable blocks” | Wereldreactie en progressie werken als hooks; onverklaarde regels en herstelproblemen breken vertrouwen |
| **Borick** | Ongeveer dertig minuten | Zag ambitie en veel systemen | Geen duidelijk doel, passieve terugvlucht, basale dominante input, menu's, popup/comboverlies, herladen en menucrash | Ook na onboarding ontbreekt voldoende variatie, flow en reden om de lus te blijven herhalen |

Dit is een klein kwalitatief sample. Het levert geen geldig retentiepercentage op. Het patroon is wel opvallend consistent: iedere tester botst op een ander symptoom van dezelfde keten **begrijpen → beheersen → beloond worden → opnieuw willen**.

### Interne feedback als ondersteunend bewijs

De eigen feedbacknotities noemen onder meer:

- willekeurige onbreekbare blokken;
- inconsistente caves en lege of onduidelijke chests in oudere builds;
- slechte of zwarte ondergrondse presentatie;
- ability-, economy- en animatieproblemen;
- earthquake-locks en onduidelijke recovery;
- menu- en UI-problemen.

Dit zijn geen onafhankelijke playtestresultaten. Ze laten wel zien waarom de ervaring als verspreid kan aanvoelen: meerdere systemen waren tegelijk aanwezig terwijl hun uitleg, payoff, technische betrouwbaarheid en onderlinge verbinding nog niet allemaal bewezen waren.

---

## 3. De drop-offfunnel

De tijden hieronder zijn indicatieve ervaringsvensters, geen gemeten gemiddelden.

| Gate | Indicatief moment | Vraag in het hoofd van de speler | Waar de game spelers verliest | Waarschijnlijk gevolg |
|---|---:|---|---|---|
| **0. Oriëntatie** | 0–2 min | “Wat is mijn eerstvolgende geldige actie?” | Doel en controls worden niet direct als één begrijpelijke intentie gelezen | Stilstand, willekeurig proberen of coaching nodig |
| **1. Eerste gat** | 2–5 min | “Kan ik veilig doen wat de game mij leert?” | Graven verandert de wereld permanent voordat recovery/Flight werkelijk beheerst is | Vastzitten voelt als eigen fout zonder geleerde oplossing |
| **2. Eerste payoff** | 3–8 min | “Waarom verkoop en upgrade ik?” | De economische handelingen kunnen als menuwerk voelen als het effect niet meteen tastbaar terugkomt | De lus wordt een checklist in plaats van een ontdekking |
| **3. Eerste echte terugkeer** | 8–15 min | “Wat is nu het belangrijkste?” | In de publieke beta ontbrak systeemdosering; lokaal komen na de eerste return nog acht lagen tegelijk vrij | Aandacht versnippert, kernlus verliest prioriteit |
| **4. Tweede en derde expeditie** | 15–30 min | “Welke nieuwe beslissing maakt deze run anders?” | Mininginput blijft grotendeels gelijk; stijgen wordt lineaire reistijd; verkoop en upgrades onderbreken | Herhaling wordt als grind of wachten benoemd |
| **5. Regelvertrouwen** | Doorlopend | “Waarom werkt dit nu niet?” | Onbreekbare geodewanden, popups die combo kosten, zichtbare reloads en een menu-error | Speler stopt met plannen en gaat regels als arbitrair zien |
| **6. Diepe game** | >30 min | “Waar bouwt dit uiteindelijk naartoe?” | Er is geen extern bewijs dat nieuwe spelers deze inhoud autonoom en gemotiveerd bereiken | Late systemen worden ontwikkeld vóór de toegangsfunnel bewezen is |

### Waar we waarschijnlijk de meeste mensen verliezen

De gevaarlijkste zone is niet één seconde, maar de overgang van **eerste gat naar eerste autonome return**.

Waarom:

- de speler heeft de wereld al kunnen beschadigen;
- de terugweg is nog niet als vaardigheid bewezen;
- het verschil tussen mijnen, verkopen en upgraden is nog vooral instructie;
- de speler heeft nog geen volledige expeditie succesvol afgesloten;
- één fout kan tegelijk controle, cargo en begrip kosten.

Fnab en Kimmo laten de vroege versie van dit probleem zien. Frank voorspelt dezelfde fout vanuit de destructieve wereld. Borick laat zien wat er gebeurt wanneer iemand er wel doorheen komt: de volgende lus biedt nog niet genoeg nieuwe beslissingen om het geduld terug te betalen.

---

## 4. Waarom Borick dit denkt ondanks alle aanwezige systemen

### 4.1 Spelers beoordelen tijd, niet de featurelijst

Een speler ervaart de game gewogen naar tijd:

```text
veel minuten dezelfde mine-input
+ veel seconden dezelfde opstijginput
+ herhaald menuwerk
> enkele korte bijzondere systemen
```

Vijf abilities, special blocks, Titans en een Star Chart kunnen allemaal bestaan. Wanneer de speler het grootste deel van zijn sessie nog steeds `mine → stijg → menu → repeat` doet, is dat zijn eerlijke kernlus.

### 4.2 De game heeft eerder breadth dan verb depth

Een nieuw scherm, currency, merchant of progressielaag maakt de game breder. Het verdiept de kernhandeling pas wanneer het een nieuwe actuele vraag creëert, bijvoorbeeld:

- welke ader kies ik en waarom;
- waar positioneer ik mij;
- wanneer gebruik ik de ability;
- welk risico accepteer ik voor meer cargo;
- welke terugroute bouw ik;
- hoe voer ik een zeldzame extractie beter uit.

Veel huidige variatie verandert vooral **wat de speler krijgt** of **hoe snel een blok breekt**. Borick vraagt om variatie in **wat de speler moet waarnemen, beslissen of uitvoeren**.

### 4.3 Een prompt leert een toets, niet noodzakelijk een vaardigheid

“Houd F in” beantwoordt hoe je mijnt. “Houd Shift in” beantwoordt hoe Flight wordt geactiveerd. Dat bewijst nog niet dat de speler:

- een veilige afdaling kan plannen;
- een zelfgegraven schacht kan teruglezen;
- onder druk genoeg Gem Power overhoudt;
- weet wanneer terugkeren verstandig is;
- een complete cargo-return zelf kan uitvoeren.

Kimmo had uitleg gekregen en zat alsnog vast. Dat verschil — **instructie ontvangen versus competentie opbouwen** — is cruciaal.

### 4.4 De kernhandeling creëert de volgende frustratie

Graven is tegelijk voortgang en het maken van een gat. Daardoor produceert de hoofdhandeling zelf toekomstige traversalproblemen.

Dat kan een sterke survivalidentiteit worden wanneer routeplanning en recovery leuk zijn. Vóór de speler die systemen beheerst, voelt het echter alsof de game hem straft voor het volgen van de hoofdopdracht.

### 4.5 “Omhoog vliegen” schaalt als belasting

De huidige configuratie gebruikt tegels van 94 px. De basisklimsnelheid is 252 px/s; na de Gem Power-unlock wordt die vóór verdere upgrades 504 px/s, ongeveer 5,36 tegels per seconde.

In een ideale volledig vrije verticale schacht is de theoretische ondergrens voor alleen de opstijging dan ongeveer:

| Diepte | Ideale minimale opstijgtijd |
|---:|---:|
| 40 m | 7,5 s |
| 100 m | 18,7 s |
| 250 m | 46,6 s |
| 300 m | 56,0 s |
| 500 m | 93,3 s |

Werkelijke routes kunnen door sturen, botsingen, bochten en energiemanagement langer duren. Dit ondersteunt Boricks observatie: zonder nieuwe keuzes groeit Flight lineair van recoverytool naar herhaalde tijdsbelasting.

### 4.6 Onderbreking wordt dubbel bestraft

De combotimer duurt zes seconden. Wanneer de level-upkeuzepopup zichtbaar is, keert de updatefunctie vroeg terug en wordt de combotimer niet bijgewerkt. De kloktijd zelf loopt wel door. Na een popup die langer dan zes seconden open is, kan de eerstvolgende gameplayframe de combo daarom alsnog als verlopen behandelen.

De speler:

1. veroorzaakt vooruitgang;
2. krijgt daardoor verplichte UI;
3. verliest tijdens die UI zijn flow;
4. kan daarna ook zijn opgebouwde combo verliezen.

Dat voelt niet alleen invasief, maar onrechtvaardig.

### 4.7 Technische naden worden onderdeel van het spelgevoel

De Starlight-, Titan-, World Map- en Campfire-assets mogen in de huidige runtime na vijf seconden zonder consumer worden vrijgegeven. Heropenen kan daardoor opnieuw laden zichtbaar maken.

De speler kent het geheugenbeleid niet. Hij ervaart alleen:

- een scherm dat niet direct reageert;
- een game die zijn eigen vaste interface niet lijkt vast te houden;
- minder vertrouwen in polish en stabiliteit.

De gemelde `Uncaught TypeError` bij terugkeer naar het hoofdmenu versterkt hetzelfde oordeel. Zonder screenshot en stacktrace is de oorzaak nog niet verantwoord vast te stellen.

---

## 5. Belangrijk: Borick speelde niet de huidige lokale pacing

De publiek bereikbare beta rapporteerde tijdens verificatie build-ID `601dc6b195e0`. In die build:

- bestond `values/systemIntroduction.js` niet op de server;
- bevatte `PlaySceneSetup.js` geen verwijzing naar `SystemIntroductionSystem`;
- bestonden de eerste-vijf-minutenstappen wel;
- was de latere volledige surface-safetyguard nog niet aanwezig;
- waren de zes-secondencombo en vijf-secondenassetrelease wel aanwezig.

Boricks feedback over een overvloed aan systemen, popupflow en opnieuw laden beschrijft dus aantoonbaar een oudere publieke configuratie, niet alleen zijn perceptie van de huidige lokale checkout.

Dit corrigeert één belangrijke eerdere aanname: de lokale abilitygrens van 500 meter kan niet worden gebruikt om te verklaren waarom hij in de publieke beta geen abilities noemde. We weten niet welke abilities hij vond of gebruikte. Zijn stilte daarover blijft wel relevante discoverability- en integratiedata.

---

## 6. Wat de huidige lokale checkout wel en nog niet oplost

### Aantoonbaar verbeterd in code en contracttests

- De tutorial heeft nu één gemarkeerde dirttegel en expliciete MOVE/DIG/SELL/UPGRADE-stappen.
- De eerste upgrade bewijst `Dirt: 3 hits → 2` op een payofftegel.
- De tutorial geeft tijdelijke Flight en vraagt een Flight-actie.
- `TutorialSurfaceSafetySystem` bewaakt ook andere afdaalroutes dan één specifieke surface-dropactie.
- `SystemIntroductionSystem` kan latere systemen verbergen op basis van voortgang.
- Chests hebben in de huidige checkout een interactie en reward; de oudere klacht over lege chests mag niet als actuele conclusie blijven staan.
- De relevante contracttests voor onboarding, systeemintroductie en pauze-featureloading slagen.

Dit is broncode- en contractbewijs, nog geen bewijs uit een nieuwe blinde spelerstest.

### Nog niet opgelost: de tutorial claimt de lus te vroeg

De tutorial toont `CORE LOOP LEARNED` nadat de speler:

1. in town beweegt;
2. één gemarkeerde tegel breekt;
3. verkoopt;
4. één upgrade koopt;
5. één Flight-actie uitvoert;
6. de payofftegel breekt.

Een echte expeditie begint in de retentionlogica pas vanaf 10 meter. Een return telt pas wanneer die expeditie daarna weer in town eindigt.

De tutorial laat de speler dus nog niet noodzakelijk:

- zelf naar minstens 10 meter afdalen;
- een terugroute herkennen;
- met cargo terugvliegen;
- veilig town bereiken;
- opnieuw verkopen;
- bewust aan een tweede run beginnen.

De tekst zegt **core loop geleerd**, maar het systeem heeft vooral de lokale controls- en upgradecheck bewezen.

### Nog niet opgelost: acht lagen op de eerste echte return

De huidige staged-disclosureconfig koppelt na de eerste return tegelijk vrijgave aan:

1. Gem Power Merchant;
2. campfire;
3. clock;
4. weather;
5. journey;
6. map;
7. milestones;
8. combo-HUD.

De configuratie zegt “one system at a time”, maar de daadwerkelijke availability verandert als bundel. `SystemIntroductionSystem` sluit de `firstReturn`-entry bovendien uit van de normale “NOW AVAILABLE”-aankondiging.

Eén `NEXT`-tekst op het HUD is daarom niet hetzelfde als één systeem tegelijk activeren.

### Nog niet opgelost: een blocker verschijnt vóór zijn oplossing

Geodes kunnen vanaf 20 meter genereren met een twee tegels dikke `GEODE_WALL`-schil. Alle geodewanden vereisen Heavy Punch.

In de huidige pacing wordt Heavy Punch pas in de abilityfase vanaf 500 meter vrijgegeven. Zonder Heavy Punch retourneert mining alleen `reason: "blocked"`; de algemene feedbackhandler speelt een tile-hitgeluid. De Heavy Punch-preview verschijnt pas wanneer de ability al beschikbaar is.

Daarmee ontstaat precies Franks ervaring:

```text
zichtbaar speciaal object
→ normale kernactie werkt niet
→ benodigde oplossing is nog honderden meters weg
→ nauwelijks verklarende feedback
→ speler noemt het random unbreakable block
```

Dit is geen cosmetische polishfout. Het is een volgorde- en regelvertrouwensfout.

### Nog niet opgelost: abilities komen ná het gemelde vervelingspunt

De huidige algemene abilityfase ligt op 500 meter. Als Borick tussen 15 en 30 minuten al concludeert dat de dominante input te weinig varieert, kunnen abilities op 500 meter de vroege retentiefout niet herstellen.

De juiste vraag is niet “bestaan er vijf abilities?”, maar:

> Ontdekt de speler vóór verveling minstens één ability als antwoord op een probleem dat hij zelf al wilde oplossen, en verandert die ability een echte beslissing?

### Nog niet opgelost: geen duidelijke sessieclimax

De progression graph bevat vele verre doelen en werelden, maar er is geen duidelijk gevonden eindpunt voor een eerste sessie of beta-vertical-slice. “Ga dieper” blijft daardoor een richting zonder zichtbaar moment waarop de eerste 20–30 minuten als afgeronde overwinning voelen.

---

## 7. Vier manieren waarop de game mensen verliest

### 7.1 Cognitieve uitval

De speler ziet meerdere doelen, resources, schermen of uitzonderingen voordat één prioriteit automatisch voelt.

**Signaal:** “onduidelijk”, “veel”, “wat moet ik doen?”  
**Gevolg:** lezen, menu's openen, gokken of stoppen.  
**Oplossing:** één huidige actie, één volgende belofte, systemen pas tonen wanneer de speler hun probleem al kent.

### 7.2 Agency-uitval

De speler weet wat moet gebeuren, maar de uitvoering bevat weinig actuele keuze of hij kan een fout niet zelf herstellen.

**Signaal:** vastzitten, Shift vasthouden, menu's afwerken.  
**Gevolg:** spelen voelt als wachten of instructies uitvoeren.  
**Oplossing:** recovery oefenen, terugreis verkorten of activeren, special mining in world-space laten vragen om observatie/positionering/timing.

### 7.3 Beloningsuitval

De speler voert de lus uit maar voelt niet waarom de volgende herhaling beter wordt.

**Signaal:** onduidelijk doel, resourceprijs niet te merken, ability niet spontaan genoemd.  
**Gevolg:** upgrade- en economiesystemen worden administratie.  
**Oplossing:** iedere vroege run één zichtbaar probleem laten oplossen en dat effect meteen opnieuw laten toepassen.

### 7.4 Vertrouwensuitval

De regels reageren niet zoals de speler verwacht, of technische implementatie wordt zichtbaar.

**Signaal:** onbreekbare blokken, comboverlies door popup, herladen, TypeError.  
**Gevolg:** de speler schrijft frictie toe aan onafheid in plaats van uitdaging.  
**Oplossing:** oorzaak en oplossing bij blokkades tonen, gameplaytijd correct pauzeren, kernassets resident houden en foutpaden repareren.

---

## 8. Waar Dig Game mensen juist niet verliest

De feedback bevat ook een duidelijk positief patroon:

- Kimmo ziet de ambitie en reageert met een oprechte wow;
- Frank vindt het upgradesysteem goed;
- Frank vindt cave-ins goed;
- Borick ziet een ambitieus project met veel systemen;
- niemand zegt dat het thema of het basisidee principieel waardeloos is.

De sterkste vroege hooks zijn dus:

1. een wereld die zichtbaar reageert;
2. progressie die direct voelbaar gedrag verandert;
3. het indrukwekkende gevoel van een grote ondergrondse game;
4. gevaar of verrassing die in de wereld plaatsvindt.

Spelers vertrekken niet omdat er te weinig te zien is. Ze vertrekken in de verbindingsstukken tussen deze goede momenten, wanneer begrijpen, reizen of administratie de controle overneemt.

---

## 9. Wat nu als eerste moet veranderen

### P0 — Maak de eerste autonome expeditie het echte tutorial-einde

Markeer de core loop pas als geleerd nadat de speler zonder coaching:

1. minstens 10 meter bereikt;
2. met echte cargo terugkeert;
3. town opnieuw bereikt;
4. die cargo verkoopt;
5. het effect van de eerdere upgrade opnieuw voelt;
6. zelf een tweede expeditie start.

Flight één frame activeren is een inputcheck. Een echte return uitvoeren is vaardigheidsbewijs.

### P0 — Ontbundel de eerste return

Activeer niet acht lagen tegelijk. Introduceer één systeem wanneer één ervaren behoefte dat systeem verklaart.

Een mogelijke volgorde:

```text
eerste return → Gem Power Merchant / Flightonderhoud
tweede run → combo alleen wanneer continue mining relevant is
eerste routekeuze → map
eerste weersinvloed → weather/clock
eerste echte runvergelijking → journey/milestones
eerste kampbehoefte → campfire
```

De exacte volgorde moet door gedrag worden bepaald, maar ieder moment moet één primaire nieuwigheid hebben.

### P0 — Herstel regelvertrouwen

- Genereer geen geodebarrière voordat Heavy Punch beschikbaar en uitgelegd is; of geef vroeg een duidelijk zichtbare alternatieve ingang.
- Toon bij iedere onbreekbare tile direct **wat** haar blokkeert en **waar/wanneer** de oplossing komt.
- Laat verplichte UI nooit normale combodecay consumeren.
- Reproduceer de main-menu-TypeError op Boricks frozen build met screenshot en volledige stacktrace.

### P1 — Verminder de lineaire returnbelasting

Meet de tijdverdeling per run. Kies daarna minstens één bewezen ingreep:

- sterk versnellen in reeds lege, veilige verticale ruimte;
- verdiende liften/checkpoints na een eerste handmatige return;
- actieve boosts of routekeuzes tijdens stijgen;
- kortere vroege dieptedoelen;
- verkoop en upgrade dichter bij het natuurlijke returnpunt.

Een andere knop voor dezelfde wachttijd is geen oplossing.

### P1 — Bouw één mechanisch ander special block

Maak één zeldzame resource die in world-space een andere korte handeling vraagt. Bijvoorbeeld breukpunten lezen, positioneren of een timingvenster raken.

Randvoorwaarden:

- basisreward blijft haalbaar;
- betere uitvoering geeft bonus, niet totale mislukking;
- geen groot modal minigame tijdens een combo;
- bestaande abilities bieden alternatieve aanpak;
- eerst één prototype en één blindtest, niet meteen een nieuw subsysteem voor ieder blok.

### P1 — Geef het eerste half uur een climax

Voor de beta kan dit één expliciet doel zijn, bijvoorbeeld:

- voltooi twee veilige expedities en bereik de eerste gegarandeerde geode;
- open één bijzondere ondergrondse route;
- haal één herkenbaar artifact terug naar town;
- bereik een vaste depth gate met een korte payoffscène.

Daarna mag de game “ga nog dieper” aanbieden. Eerst moet de speler één keer kunnen winnen.

### P2 — Freeze breedte, niet het hele project

Boricks advies hoeft niet te betekenen dat Dig Game wordt weggegooid of naar Unreal verhuist.

De bruikbare vertaling is:

> Zet nieuwe systemen tijdelijk aan de kant en behandel de eerste 20–30 minuten van Dig Game als het kleine prototype dat eerst bewezen moet worden.

Verberg, combineer of verschuif een systeem wanneer het geen vroege beslissing verdiept. Verwijder het niet alleen omdat de totale lijst lang is.

---

## 10. Wat we nog niet meten

De checkout bewaart voortgangsstatistieken zoals beste diepte en voltooide expedities en bevat performance-telemetry. Er is geen gevonden gedragsfunnel waarmee betrouwbaar kan worden vastgesteld hoeveel publieke spelers op iedere gate stoppen.

Daarom mogen uitspraken zoals “50% stopt vóór vijf minuten” nu niet worden gedaan.

Minimale events voor een volgende beta:

```text
session_start(build_id, fresh_save)
first_move
first_valid_dig
first_descent(depth)
first_flight
first_expedition_start(depth >= 10)
first_return_to_town
first_sale
first_upgrade
second_expedition_start
ability_discovered(id)
ability_used(id, context)
mine_blocked(tile_type, depth, required_tool)
modal_open(type, combo_count, combo_time_remaining)
modal_close(type, duration_ms, combo_count)
feature_open(type, ready_ms, loaded_again)
main_menu_attempt(success, error_name)
session_end(last_gate, current_goal, depth, active_ms, menu_ms, ascent_ms)
```

Gebruik dit alleen met passende privacy/consent en zonder onnodige persoonsgegevens.

De belangrijkste funnelmaten zijn:

- tijd tot eerste geldige dig;
- percentage dat zonder coaching een expeditie start én afrondt;
- tijd tussen eerste upgrade en zichtbaar hergebruik van het effect;
- aandeel actieve mining/keuzetijd versus ascent- en menutijd;
- eerste vrijwillige ability-use;
- blocked attempts zonder begrepen oplossing;
- tweede-expeditie-start;
- foutvrije terugkeer naar het hoofdmenu.

---

## 11. Volgende blinde test

Gebruik één frozen build, fresh saves, opname en geen ontwikkelaarscoaching. Test eerst de huidige productieroute; maak geen aparte makkelijke demo die de echte problemen omzeilt.

### Observeer zonder hints

- Kan de speler binnen twee minuten de eerste geldige actie uitvoeren?
- Kan hij uitleggen waarom hij verkoopt en upgradet?
- Kan hij zelf naar 10 meter en terug?
- Start hij vrijwillig een tweede expeditie?
- Welke nieuwe beslissing verwacht hij in die run?
- Welk moment noemt hij wachten?
- Welke ability ontdekt en gebruikt hij uit zichzelf?
- Begrijpt hij een geblokkeerde tile vóór hij opnieuw probeert?

### Vraag op 5, 15 en 30 minuten

1. Wat probeer je nu te bereiken?
2. Wat verwacht je dat daarna verandert?
3. Wanneer had je het meeste controle?
4. Wanneer was je vooral aan het wachten of menu's aan het afwerken?
5. Welke situatie vroeg een andere aanpak dan normaal mijnen?
6. Zou je uit jezelf nog één run starten, en waarom?

### Slagingspoort vóór nieuwe breadth

- de eerste complete expeditie lukt zonder coaching;
- “CORE LOOP LEARNED” komt pas na die complete expeditie;
- de speler start bewust een tweede run;
- maximaal één primair systeem vraagt tegelijk aandacht;
- geen vroege onbreekbare tile heeft een verborgen of onbereikbare oplossing;
- geen verplichte UI vernietigt een actieve combo;
- terugreistijd wordt niet hoofdzakelijk als wachten benoemd;
- één special interaction verandert daadwerkelijk de uitvoering;
- het hoofdmenu werkt zonder console-error.

---

## 12. Definitieve diagnose

Waar verliezen we mensen?

> Eerst bij begrip en recovery, daarna bij de payoff van de eerste lus, vervolgens bij systeemoverdracht, en rond 15–30 minuten bij herhaling, passieve reistijd en technisch vertrouwen.

Waarom?

> De game introduceert vaker nieuwe inhoud dan nieuwe betekenisvolle beslissingen, en vraagt beheersing van destructieve traversal voordat zij die beheersing echt heeft aangeleerd.

Hoe gebeurt dat?

> De speler volgt prompts, maakt een gat, krijgt een upgrade of nieuw scherm, maar moet daarna grotendeels dezelfde input herhalen. Wanneer daar wachttijd, onverklaarde blokkades, flowstraffende UI en reloads bijkomen, voelt de brede game minder samenhangend dan de featurelijst suggereert.

De productbeslissing hoort daarom niet te zijn “meer content” of “Dig Game schrappen”. De verstandigste stap is:

```text
freeze nieuwe breadth
→ bewijs één autonome complete expeditie
→ bewijs een tweede vrijwillige run
→ maak return kort of actief
→ voeg één mechanisch andere mininginteractie toe
→ introduceer ieder volgend systeem als oplossing voor een reeds gevoeld probleem
```

Dit verdiept Boricks analyse in `2026-08-01-borick-yongaerts-playtestfeedback-analyse.md` en bevestigt het vroege patroon uit `2026-07-30-fnab-first-five-minuten-playtestanalyse.md`. Franks feedback vult het ontbrekende middenstuk in: zodra de speler begrijpt dat hij moet graven, kunnen recovery en onverklaarde wereldregels alsnog de lus breken.
