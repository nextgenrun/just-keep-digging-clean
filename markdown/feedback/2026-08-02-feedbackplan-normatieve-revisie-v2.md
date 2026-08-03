# Feedbackplan — normatieve revisie V2

**Datum:** 2026-08-02  
**Status:** geïmplementeerd op 2026-08-02; dit document bewaart de normatieve besluiten  
**Relatie:** implementatieresultaat en vervolgonderzoek staan in `2026-08-02-playtester-feedback-implementatie-en-wereldinteractie.md`

## Vastgelegde nieuwe besluiten

1. De automatisch openende Level Up-popup wordt verwijderd.
2. Depth Gates op 100 m, 300 m en 1000 m blijven behouden.
3. Oude Star-discovery popupcode, instellingen, tests en documentatie mogen worden verwijderd.
4. Stars worden verbonden met level progression en een eigen unieke Star-identiteit; zij worden niet opnieuw als popup- of geldsysteem opgebouwd.
5. De geforceerde of cadeau gegeven starterupgrade wordt uit de onboarding verwijderd.
6. De eerste portal wordt authored en gegarandeerd.
7. De tutorial mag ingesproken voice-over gebruiken, mits captions en visuele guidance zelfstandig blijven werken.
8. Geodes krijgen geen legacy-gameplaytests. Alleen de afwezigheid van geodes en algemene savegezondheid blijven relevant.
9. Miningvariatie moet uit wereldkeuzes, materiaalreacties en consequenties komen, niet uit losse minigames of QTE's.

## Correctie op de notification-analyse

De eerdere formulering “uitgeschakelde notification calls worden nog gebruikt” was niet precies genoeg.

De huidige code bevat:

- UI_NOTIFICATION_CAROUSEL_CONFIG.enabled = false;
- UINotificationSystem.show controleert deze enabledflag momenteel niet;
- producers roepen de notification API nog actief aan.

Voorbeelden:

- SystemIntroductionSystem stuurt “NOW AVAILABLE”;
- SpecialTileSystem stuurt “NEW RETURN ROUTE UNLOCKED”;
- TownSquareTutorialView stuurt tutorial- en completionkaarten;
- gamble, hazards en verschillende events sturen resultaatkaarten.

Conclusie: de calls zijn niet betrouwbaar no-op. De centrale false-flag is momenteel geen sluitende admission gate.

### Nieuwe aanpak

1. Laat UINotificationSystem geen carouselview maken of messages accepteren wanneer de centrale flag false is.
2. Verwijder producers van retired flows, waaronder tutorial-, level- en Star-popupfeedback.
3. Classificeer de resterende berichten:

| Berichtsoort | Nieuwe drager |
|---|---|
| Portal gevonden/geactiveerd | portalanimatie, hum, activatiesound, voice cue en Next Promise |
| Nieuw systeem beschikbaar | Next Promise wanneer het relevant wordt |
| Tutorialstap | wereldmarker, caption/Next Promise en voice-over |
| Gamble-resultaat | directe objectanimatie, sound en duidelijke resourcewijziging; alleen extra speler-geïnitieerde feedback indien nodig |
| Hazard | wereldtelegraph, audio en bestaande hazard-HUD |
| Debug/reparatie | devlog of healthcanary, niet player-facing |

Een notification-call die alleen cosmetisch is, wordt verwijderd. Een call met essentiële informatie wordt niet stilweg verwijderd; de informatie krijgt eerst een blijvende, passende drager.

## Level Up-popup volledig verwijderen

### Productgedrag

Een level-up onderbreekt nooit mining, Flight of movement.

Een level-up mag:

- XP en level direct bijwerken;
- een korte sound en world/HUD-pulse geven;
- een Star, skillpunt of keuze als ongeclaimde progressie markeren;
- in een bewust geopende progressionview zichtbaar worden.

Een level-up mag niet:

- automatisch LevelUpPopup openen;
- input blokkeren;
- een combo beëindigen doordat het spel een keuze afdwingt;
- willekeurig een upgrade voor de speler kiezen.

### Implementatiepad

1. Bepaal de nieuwe autoriteit voor levelkeuzes:
   - bij behoud van keuzes: pending choices in de speler-geopende level/Star-progressionview;
   - bij verwijdering van keuzes: alleen deterministische levelrewards, zonder tijdelijke popupqueue.
2. Verwijder auto-showproducenten uit PlaySceneUpdate en CelestialEngineController.
3. Verwijder _pendingLevelUp en alle inputblokkade die alleen voor de popup bestaat.
4. Verwijder LevelUpPopup uit PlaySceneUI setup, update, resize en destroy.
5. Verwijder popupchecks uit LightSystem, cinematics, Next Promise en Escape-closehelpers.
6. Verwijder de view, bijbehorende assets, settingshooks, debugcase en popupgerichte tests.
7. Voeg tests toe voor levelwinst tijdens mining, meerdere levels in één reward en save/load van eventuele ongeclaimde progressie.

### Acceptatie

- nul automatische Level Up-popups in een sessie van dertig minuten;
- levelprogressie en verdiende rewards blijven correct;
- meerdere level-ups verliezen of dupliceren niets;
- comboDurationMs blijft exact 6000 ms;
- Depth Gates blijven ongewijzigd functioneren.

## Depth Gates blijven

Depth Gates zijn een bewuste uitzondering op de algemene popupminimalisatie:

- zij komen zelden voor;
- zij markeren grote voortgangsgrenzen;
- zij vragen een betekenisvolle risico- of routebeslissing;
- zij gebruiken approved Phaser-presentatie.

Er wordt in deze revisie geen world-space vervanging voor Depth Gates gepland.

Wel blijft gelden:

- geen Level- of Star-popup mag bovenop een Depth Gate openen;
- een gate mag niet dubbel openen na save/load;
- de betekenis en consequentie moeten vóór bevestiging duidelijk zijn.

## Oude Star-popupstack verwijderen

De huidige trace toont popupresten zonder noodzakelijke actieve gameplayconsumer:

- systems/visual/StarDiscoveryPopupView.js;
- systems/visual/starDiscoveryPopupPolicy.js;
- UserSettings.showStarDiscoveryPopups;
- RETENTION_CONFIG.settings.starPopupsDefaultEnabled;
- popupgerichte settings- en Star-contracttests;
- popupbeschrijvingen in systems/readme.md en systems/visual/readme.md;
- oudere Star-documentatie die de popup als huidige architectuur beschrijft.

### Removalcontract

1. Traceer één laatste keer alle imports en runtimeconstructors.
2. Verwijder de view en policy.
3. Verwijder de settingsdefault, sanitizer, updatebranch en settingscontrol.
4. Laat oude opgeslagen showStarDiscoveryPopups-data zonder fout genegeerd worden; hiervoor is geen zichtbare migratie nodig.
5. Verwijder of herschrijf popupgerichte tests.
6. Update readmes en archiveer historische ontwerpdocumenten wanneer hun andere Star-informatie nog waarde heeft.
7. Behoud alleen Star-assets, lichtidentiteiten en collectionstate die de nieuwe unieke Star-progressie gebruikt.

### Nieuwe Star-communicatie

Een Star wordt geen geldpopup.

De minimale flow:

1. de wereld toont de unieke Star-identiteit in het blok;
2. mining veroorzaakt een herkenbare world-space release, lichtreactie en sound;
3. de Star wordt idempotent geregistreerd in level/Star progression;
4. de speler-geopende progressionview toont welke unieke Star nieuw is en wat zij betekent;
5. Next Promise verwijst alleen naar de view wanneer daar werkelijk een keuze of nieuwe mogelijkheid wacht.

Geen auto-open, geen discovery card en geen tweede moneyloop.

De exacte relatie tussen level, unieke Star en mogelijke keuzes wordt als apart progressiedesign vastgelegd. Popupremoval hoeft daar niet op te wachten.

## Ingesproken tutorial met eigen stem

Ja, dit kan de onboarding duidelijk soepeler en persoonlijker maken.

“Zonder stemcoaching” betekende: zonder een moderator of ontwikkelaar die live vertelt wat de tester moet doen. Authored voice-over in het spel is een geldige productfeature.

De nieuwe acceptatieregel wordt:

> De speler voltooit de tutorial met alleen de ingebouwde wereldmarker, caption/Next Promise en voice-over, zonder live hulp van een testerbegeleider.

Er komt ook een muted test:

> Dezelfde stappen blijven zonder geluid begrijpelijk.

### Voice-overprincipes

- één korte clip per betekenisvolle state;
- ongeveer drie tot zes seconden per clip;
- voice wordt door een state transition gestart, niet door een vaste timerqueue;
- een nieuwe stap stopt of vervangt de vorige voice;
- muziek en SFX worden tijdens voice geduckt;
- iedere clip heeft gelijktijdige captioncopy;
- captions en voice gebruiken dezelfde inhoudelijke source of truth;
- voice spreekt geen hardcoded toetsnaam uit, omdat keybinds kunnen veranderen;
- de HUD toont de actuele toets dynamisch;
- iedere tutorialclip is replaybaar, maar herhaalt niet automatisch om de paar seconden;
- voicevolume, subtitles en skip blijven toegankelijk.

### Bestaande audioarchitectuur hergebruiken

VoiceLineManager kan al:

- voiceassets on demand laden;
- muziek en SFX ducken;
- de vorige voice veilig stoppen;
- resources na playback beheren.

Hij kiest nu hoofdzakelijk willekeurige clips uit NPC-pools. Tutorialnarratie heeft daarom een deterministische named-cueroute nodig.

Voorgestelde scheiding:

- values/tutorialNarration.js bevat per tutorialstate assetkey, caption, trigger en replayregel;
- TutorialNarrationController in systems/onboarding speelt exact de juiste cue;
- VoiceLineManager of SoundSystem levert één gedeelde exact-key playbackfunctie met bestaande ducking;
- NextPromiseHudSystem toont de caption en dynamische keyhint;
- geen nieuwe popupview.

### Voorbeeldscript

De precieze tone of voice mag persoonlijk en karaktervol zijn. Functionele eerste versie:

| State | Voice | Captiondetail |
|---|---|---|
| Start | “Head to the marked ground. That is your first way down.” | beweeg naar de marker |
| Eerste dig | “Face the block and keep mining.” | dynamische mine-key |
| Korte Flightproof | “Hold Flight to rise. Use it whenever you need to recover locally.” | dynamische Flight-key |
| Portal in bereik | “That gate is your way home. Activate it once and it stays unlocked.” | interact-key |
| Boven aangekomen | “Your route is open. The surface gate sends you straight back down.” | surface gate marker |
| Eerste verkoop | “Sell what you found. What you earn is yours to spend.” | Money Monster marker |

De opname zegt wat en waarom. De caption toont exact hoe.

### Opnamekwaliteit

- neem iedere regel los op;
- stille ruimte en vaste microfoonafstand;
- mono WAV als master;
- consistente loudness en geen clipping;
- exporteer de runtimeversie volgens de bestaande audiopipeline;
- bewaar masters buiten de runtimebundle;
- test verstaanbaarheid boven mining, portalhum en muziek.

## Gereviseerde eerste sessie

De geforceerde starterupgrade en de vergelijkbare payofftegel verdwijnen uit de verplichte tutorial.

### Nieuwe volgorde

1. Loop naar de gemarkeerde startershaft.
2. Mine normale blokken en verzamel echte buit.
3. Gebruik Flight één keer in een korte, veilige recoverybeweging.
4. Daal verder af via de authored starterroute.
5. Ontdek de gegarandeerde eerste portal.
6. Activeer hem en keer daarmee terug naar surface/sky route.
7. Verkoop de werkelijk verzamelde buit.
8. Gebruik de surface portal om dezelfde diepe route opnieuw te openen.
9. Kies vrijwillig of je nu een verdiende upgrade koopt of verder spaart.
10. Start een tweede expeditie met een concreet nieuw dieptedoel.

De mentale rolverdeling wordt:

- Flight = lokale beweging en recovery;
- portal = normale langeafstandsterugkeer;
- Return To Safety = laatste redmiddel.

### Geen cadeauupgrade

De tutorial:

- geeft geen willekeurige player upgrade;
- focust geen verplichte starterupgrade;
- blokkeert completion niet tot een upgrade is gekocht;
- plaatst geen speciale payofftegel om een cadeau te rechtvaardigen.

Upgrades blijven een sterke hook, maar worden verdiend:

- de eerste cargo levert echte money op;
- wanneer de speler werkelijk iets kan betalen, zegt Next Promise “UPGRADE AVAILABLE”;
- de shop toont prijs en concreet effect;
- de speler kiest zelf kopen of sparen;
- het effect wordt tijdens normaal mining in de volgende expeditie gevoeld.

Als de eerste cargo niets betaalbaars oplevert, wordt de startereconomy getuned. Er wordt geen gratis upgrade geïnjecteerd om een verkeerde prijs te maskeren.

## De eerste portal wordt gegarandeerd

Ja. Dit is de sterkste manier om vroeg te bewijzen dat terugreizen niet tedieus blijft.

### Plaatsingscontract

- de eerste portal is authored, niet random;
- hij ligt op of direct naast de starterroute;
- startwaarde voor playtests: ongeveer 35–50 meter diep;
- hij is bereikbaar zonder zeldzame ability;
- hij is direct interacteerbaar en niet gekoppeld aan de 80m-gate voor overige special tiles;
- landing en interactiecel zijn gegarandeerd veilig;
- de portal kan niet door worldgen, geodes of random blockers worden overschreven;
- latere portals mogen het bestaande wereldsysteem blijven gebruiken.

De exacte diepte wordt niet gekozen op esthetiek alleen. De portal moet verschijnen vóórdat handmatig terugvliegen als repetitieve belasting wordt ervaren.

### Communicatie zonder popup

Voor ontdekking:

- unieke authored silhouette en licht;
- rustige ruimtelijke hum binnen een beperkte radius;
- subtiele richtingstoename wanneer de speler dichterbij komt;
- Next Promise noemt “FIND THE RETURN GATE” zodra de eerste afdaling begint.

Bij nadering:

- één korte voice cue;
- interactieprompt pas binnen geldige afstand;
- geen globale pijl door de hele wereld.

Bij activatie:

- duidelijk activatieritueel;
- hum verandert permanent;
- wereldlicht/ring verandert naar active state;
- teleport-sound;
- Next Promise verandert onmiddellijk naar “ROUTE OPEN — USE THE SURFACE GATE TO RESUME”;
- matching surface portal krijgt een marker totdat hij één keer is gebruikt.

### Technische uitvoering

- portalpositie en veilige corridor komen uit één values-config;
- worldgen reserveert deze footprint vóór random special placement;
- een contracttest valideert tiletype, bereikbaarheid en landing;
- SpecialTileSystem krijgt een vroege firstPortal-availability los van overige special tiles;
- activationstate, pairing en surface unlock blijven savevast;
- na eerste surface-resume wordt tutorialguidance permanent afgerond.

### Acceptatie

- iedere nieuwe playtestsave heeft exact één gegarandeerde first-sessionportal;
- de speler activeert hem zonder live uitleg;
- de speler zegt daarna dat portals de normale lange terugreis oplossen;
- de speler gebruikt de matching surface portal minstens één keer;
- niemand beoordeelt de eerste lange return op een handmatige vlucht van 93 seconden.

## Mining interessanter maken zonder minigames

De beste richting is:

> Varieer de beslissing en de consequentie van mining, niet voortdurend de input.

De speler mag grotendeels blijven richten en mijnen. Wat iedere paar seconden verandert is de vraag: waar graaf ik, waarom, wat riskeer ik en wat opent deze keuze?

### Vier bronnen van kernvariatie

| Bron | Wat de speler beslist | Bestaande bouwstenen |
|---|---|---|
| Route | recht naar beneden, waardevolle zijtak of veilige weg | authored shafts, caves, portals, zichtbare veins |
| Materiaal | snel materiaal, harde laag of waardevolle ore | Dirt, Stone, Copper en diepere bands |
| Wereldreactie | doorgraven of een instabiele route benutten | cave-ins en rubble, expliciet positief genoemd door Frank |
| Tijdelijke toestand | nu doorpushen of voordeel benutten | GP-, speed-, crit- en comboblokken die al bestaan |

### Eerste 50–100 meter als compacte miningcompositie

Gebruik geen nieuwe minigame. Composeer bestaande mechanics:

1. een korte zachte laag voor vloeiende basisminefeedback;
2. een zichtbare Copper-seam iets naast de hoofdroute, zodat de speler bewust afwijkt;
3. een kleine leesbare instabiele seam/cave-inreactie die een pocket of shortcut opent;
4. een GP-block nadat Flight is geleerd, zodat het blok een reeds gevoelde behoefte oplost;
5. de gegarandeerde portal als routepayoff;
6. daarna een iets hardere laag die een later verdiende upgrade vanzelf waarde geeft.

De eerste sessie bevat zo meerdere soorten beslissing zonder een nieuwe toets, meter, currency of menu.

### Gamefeel per materiaal

Versterk het verschil met bestaande feedbackkanalen:

- duidelijke crackprogressie;
- materiaal-specifiek impactsound;
- andere debris en impactkleur;
- klein verschil in hitstop/shake binnen veilige grenzen;
- waardevolle seam zichtbaar vóór zij volledig is uitgegraven;
- chain/cave-inreacties met duidelijke oorzaak en gevolg;
- geen floating reward cards.

### Abilities

Abilities worden later modifiers van dezelfde miningwereld:

- route openen;
- meerdere blokken beïnvloeden;
- tijdelijk risico/reward veranderen;
- recovery verbeteren.

Zij hoeven niet als vijf losse vroege tutorials te verschijnen. De eerste miningloop moet zonder hen werken.

### Wat niet wordt gebouwd

- geen Warframe-QTE;
- geen timingbalk boven iedere ore;
- geen match-, rhythm- of cursor-minigame;
- geen geodevervanger;
- geen random cadeauupgrade;
- geen aparte special-blockcurrency;
- geen extra popup voor ieder materiaal.

## North Star, sessiedoel en Next Promise

Dit zijn geen drie nieuwe UI-systemen. Het zijn drie tijdschalen die door bestaande surfaces worden gecommuniceerd.

### 1. North Star

Functie:

- vaste identiteit van het spel;
- verandert niet iedere minuut;
- legt uit waarom diepte en portals ertoe doen.

Voorgestelde boodschap:

> DIG DEEPER. OPEN THE WAY BACK.

Plaatsing:

- start/loadscreen;
- compacte regel bij best-depthrecord of Journey;
- eventueel een authored townsign;
- niet als permanente grote popup.

### 2. Sessiedoel

Functie:

- één concrete mijlpaal voor deze expeditie of sessie;
- afgeleid van echte progressionstate;
- geen willekeurige checklist tijdens onboarding.

Eerste sessie:

- Reach the return gate at 40m;
- Activate the gate;
- Use the surface gate to resume;
- Reach the next named depth band.

Latere sessies:

- bereik de volgende vaste depth milestone;
- activeer een dieper portal;
- vind een concrete nieuwe area;
- voltooi een speler-gekozen target.

Het huidige save-slot-gebaseerde objective zoals “Break 35 tiles” of “Land 4 critical hits” wordt pas na onboarding als optionele side objective gebruikt of vervangen. Het draagt niet de kernrichting van de eerste sessie.

### 3. Next Promise

Functie:

- de eerstvolgende handeling plus de directe payoff;
- verandert state-driven;
- gebruikt het bestaande NextPromiseHudSystem.

Voorbeelden:

| State | Promise | Detail/payoff |
|---|---|---|
| Eerste afdaling | FIRST DESCENT • FIND THE RETURN GATE | Unlock a permanent route home |
| Portal dichtbij | RETURN GATE NEARBY | Follow the hum and light |
| Portal actief | ROUTE OPEN | The surface gate now returns here |
| Boven | RESUME AT 40M | Use the marked surface gate |
| Na verkoop | UPGRADE AVAILABLE | Spend earned money or keep saving |
| Vrije run | NEXT DEPTH • 100M | New layer and progression gate ahead |

### Implementatie zonder nieuwe HUD

- RetentionProgressSystem bewaart de current progression phase;
- first-session goals zijn deterministisch en eventgestuurd;
- NextPromiseHudSystem rendert promise en detail;
- tutorialvoice leest alleen grote overgangsmomenten;
- bestaande Session Objective-randomisatie wordt onderdrukt zolang onboarding actief is;
- copy en doeldefinities leven in values;
- save/load hervat exact dezelfde phase.

### Acceptatie

Op ieder moment kan een speler antwoorden:

- wat doe ik nu;
- waarom doe ik dat;
- hoe kom ik terug;
- wat verandert er daarna.

Niet omdat vier teksten tegelijk zichtbaar zijn, maar omdat één current promise voortkomt uit een stabiele North Star en een concrete sessiemijlpaal.

## Geodes: wat nog wel en niet wordt getest

De permanente suite bevat geen geodegameplaytests meer:

- geen geodegeneratie;
- geen geode-HPreactie;
- geen Heavy Punch-geodegedrag;
- geen geodediscovery;
- geen geodelicht.

Wel behouden:

- new-worldcontract: nul GEODE_WALL en nul GEODE_INTERIOR;
- import/referencecontract: geen productieconsumer van retired geodecode;
- algemene supported-save-loadsmoke;
- algemene worldgen- en portalroutecontracten.

Alleen wanneer oude publieke betasaves expliciet ondersteund moeten blijven én werkelijk geodespecifieke state bewaren, wordt één tijdelijke compatibilitytest behouden. Als betasaves disposable zijn, vervalt ook die test.

## Hoe de begripvragen worden gesteld

Deze vragen horen niet als popup in de productiegame.

### Aanbevolen moderated protocol

- tester deelt scherm en audio of neemt de sessie op;
- moderator geeft geen uitleg;
- op het dichtstbijzijnde veilige moment rond 5, 15 en 30 minuten stelt de moderator één of twee exacte open vragen;
- niet tijdens een combo, portalactivatie of andere actieve handeling;
- antwoord wordt letterlijk genoteerd;
- moderator corrigeert niet en zegt alleen “thanks, continue”;
- hulp wordt pas gegeven na een duidelijke block en de run wordt dan als assisted gemarkeerd.

Vragen:

**Rond 5 minuten**

- “What are you trying to do right now?”
- “What do you think will happen next?”

**Rond 15 minuten**

- “If you wanted to return now, what would you do?”
- “What did activating that portal change?”

**Rond 30 minuten of aan het einde**

- “What would make you start one more run?”
- “What do you expect to find or unlock by going deeper?”

Niet iedere vier vragen worden op ieder checkpoint herhaald. Dat zou de test zelf te veel sturen.

### Unmoderated alternatief

- tester neemt gameplay en hardop denken op;
- onmiddellijk na de sessie krijgt hij een korte externe form of Discord-template;
- dezelfde vragen worden gesteld, plus timestamp van het twijfel-/stopmoment;
- geen survey-UI in de productiegame;
- als schaal later nodig is, kan een research-only build worden gemaakt, maar nooit als standaard popupflow.

### Voice-over versus onderzoeksvragen

Tutorialvoice mag de speler leren wat het product werkelijk communiceert.

De moderator mag niet:

- een vergeten instructie herhalen;
- vertellen waar de portal staat;
- uitleggen wat een systeem betekent;
- de speler naar het “goede” antwoord leiden.

Zo meten we of de ingebouwde voice, marker, wereld en Next Promise samen werken.

## Gereviseerde uitvoeringsvolgorde

1. Verwijder LevelUpPopup producers, state en view zonder rewards te verliezen.
2. Laat DepthGateSystem buiten deze removal.
3. Verwijder de oude Star-popupstack en settings.
4. Maak de notification-enabledflag werkelijk bindend.
5. Verplaats essentiële portal/tutorialfeedback naar world, voice en Next Promise.
6. Verwijder de geforceerde starterupgrade en payofftegel uit onboarding.
7. Voeg deterministische tutorialvoice met captions toe.
8. Reserveer en valideer de authored eerste portal rond 35–50 m.
9. Maak first-session Session Goal en Next Promise deterministisch.
10. Composeer de eerste 100 m met bestaande route-, ore-, cave-in- en GP-reacties.
11. Playtest muted en met voice.
12. Pas daarna economy, latere abilities en bredere miningvariatie aan.

## Releasegate voor deze revisie

- geen automatische Level Up- of Star-popup;
- Depth Gates werken nog;
- tutorial bevat geen gratis/geforceerde upgrade;
- notification false betekent werkelijk geen carouselcard;
- essentiële informatie blijft begrijpelijk via andere kanalen;
- eerste portal bestaat altijd, is direct bruikbaar en opent een surface-resumeroute;
- speler gebruikt Flight voor lokale recovery en portal voor lange return;
- eerste 100 m bevat minstens drie verschillende wereldbeslissingen met dezelfde mininginput;
- tutorial werkt met voice én muted;
- speler beantwoordt de begripvragen zonder moderatoruitleg;
- comboDurationMs blijft 6000 ms;
- nieuwe wereld bevat nul geodetegels.
