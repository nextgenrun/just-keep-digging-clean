# Playtestanalyse Borick Yongaerts: core loop, flow en scope

**Analysedatum:** 1 augustus 2026  
**Geteste pagina volgens het gesprek:** <https://www.nextgen.run/diggame-beta-1/>  
**Speelduur:** ongeveer 30 minuten  
**Bron:** het volledige Discord-gesprek tussen Borick en Mila  
**Status:** gamedesign- en broncodeanalyse; geen gameplaycode gewijzigd  
**Belangrijke beperking:** de exacte deploy/build-ID van Boricks sessie en de stacktrace van de `Uncaught TypeError` ontbreken. De huidige checkout kan dus nieuwer zijn dan de gespeelde beta.

---

## 1. Kort antwoord

Borick bedoelt niet: **“er zijn te weinig abilities, special blocks of systemen.”**

Hij bedoelt:

> Tijdens het grootste deel van mijn half uur deed ik gevoelsmatig dezelfde eenvoudige handeling, vloog ik zonder veel beslissingen terug omhoog en werkte ik menu's af. Daarna begon dezelfde cyclus opnieuw, zonder dat ik goed wist waarvoor ik hem herhaalde.

De vijf abilities zijn daarom geen automatisch tegenbewijs. Een systeem telt voor de speler alleen wanneer hij het:

1. op tijd ontdekt;
2. begrijpt;
3. vrijwillig gebruikt;
4. nodig heeft voor een interessante beslissing;
5. als een wezenlijk andere handeling ervaart.

Als een ability niet werd gevonden, pas veel later wordt ontgrendeld of alleen dezelfde tegel sneller breekt, blijft Boricks beschrijving van zijn ervaren kernlus geldig.

De kern van wat misging is niet alleen **bloat** en ook niet alleen **polish**. Het is een combinatie van:

- geen heldere korte of middellange bestemming voor de herhaling;
- weinig variatie in de dominante seconde-tot-secondehandeling;
- te veel passieve tijd tijdens terugkeer;
- menu's en popups die de actieve flow onderbreken;
- systemen die naast de kernlus bestaan in plaats van haar voortdurend te verdiepen;
- technische frictie zoals herladen en de fout bij terugkeer naar het hoofdmenu.

In één formule:

```text
dezelfde hoofdhandeling
+ weinig actuele keuzes
+ lange passieve terugreis
+ onderbrekende UI
+ onduidelijk waarom ik herhaal
= de ervaring van grind, ondanks veel aanwezige content
```

---

## 2. Wat hij per opmerking waarschijnlijk bedoelt

| Feedback | Waarschijnlijke betekenis | Wat hij niet noodzakelijk beweert |
|---|---|---|
| Het einddoel is na een half uur onduidelijk | Hij mist een concrete huidige opdracht, een nabije belofte en een herkenbare runboog. | De game moet niet verplicht een eindbaas of verhaaleinde hebben. |
| Onboarding is niet duidelijk | De game communiceert de noodzakelijke intentie, input, terugweg en beloning niet op het moment dat hij ze nodig heeft. | Meer tutorialtekst is niet automatisch de oplossing. |
| UI is invasief en kost mijn combo | Een systeem neemt controle en aandacht af terwijl de speler juist in actieve flow zit, en straft hem daar mogelijk ook nog voor. | Alle menu's moeten niet verdwijnen. Ze moeten op veilige momenten komen of de gameplaytijd correct pauzeren. |
| Interacties met de wereld voelen basic | De dominante handeling vraagt te weinig observatie, timing, positionering of keuze. Andere rewards/kleuren alleen veranderen de handeling niet. | Hij zegt niet dat iedere tegel een minigame nodig heeft. |
| Omhoog vliegen is vooral wachten | De terugreis bevat te weinig beslissingen en duurt te lang ten opzichte van haar betekenis. | Flight zelf moet niet verwijderd worden. |
| Star Chart en Titans laden iedere keer | Een veelgebruikte spelinterface voelt niet persistent en direct, maar als een externe pagina die opnieuw moet worden opgebouwd. | Phaser is niet ongeschikt; dit is een laad- en residentiebeleid. |
| Het project is overscoped | De hoeveelheid systemen verdeelt ontwikkeltijd over breedte, terwijl samenhang, introductie en kerngevoel achterblijven. | Ieder bestaand systeem is slecht of moet worden weggegooid. |
| Leg het project even weg en maak iets kleiners | Hij adviseert een kleinere oefenomgeving waarin één mechanic eerst bewezen wordt. | Dig Game moet definitief geschrapt worden. |
| Kijk naar Warframe mining | Maak een zeldzaam materiaal mechanisch anders: waarnemen, richten/timen en een betere uitvoering belonen. | Kopieer letterlijk Warframes minigame of voeg overal QTE's toe. |

---

## 3. “Dieper graven” is een richting, nog geen volledig doel

“Ga dieper” kan absoluut de centrale fantasie zijn. Het wordt voor een nieuwe speler pas een bruikbaar doel wanneer drie niveaus zichtbaar zijn:

### Huidige intentie

Wat probeer ik de komende 30–90 seconden te bereiken?

Voorbeelden:

- bereik de gemarkeerde eerste laag;
- verzamel genoeg waarde voor één herkenbare upgrade;
- vind de ingang die op 80 meter wordt geteased;
- beslis nu of je verdergaat of terugkeert met je cargo.

### Nabije belofte

Wat verandert er als ik deze lus nog één keer doe?

Niet alleen `+2%`, maar bijvoorbeeld:

- de volgende dirt breekt aantoonbaar in minder hits;
- een nieuwe route wordt bereikbaar;
- een gegarandeerde geode of cave wordt zichtbaar;
- de speler krijgt een nieuwe oplossing voor een reeds ervaren probleem.

### Herkenbare boog

Wanneer heeft deze speelsessie een voorlopig voldaan gevoel?

Dat kan een depth milestone, eerste geode, eerste veilige expeditie, cave-doorbraak of demo-einde zijn. Daar is geen vijand of definitieve story ending voor nodig.

Boricks vraag “wil ik geld verdienen, ergens geraken of een vijand verslaan?” betekent dus vooral:

> Welke meetbare toestand probeer ik nu te veranderen, en waarom is de volgende herhaling betekenisvol?

De bestaande North Star uit de eerdere feedbackanalyse blijft hier passend:

> **Dig. Upgrade. Survive. Go deeper.**

Maar iedere term moet vroeg in werkelijk spelersgedrag zichtbaar worden, niet alleen in beschikbare systemen.

---

## 4. Wat “basic interacties” concreet betekent

Er zijn vier verschillende soorten variatie die gemakkelijk met elkaar worden verward.

### 4.1 Visuele variatie

Een blok heeft een andere kleur, animatie, VFX of sound.

Dit verhoogt leesbaarheid en plezier, maar de speler doet nog dezelfde handeling.

### 4.2 Beloningsvariatie

Een blok geeft meer geld, een Star, Gem Power of een zeldzame resource.

Dit verandert waarom de speler het wil, maar niet noodzakelijk hoe hij het verkrijgt.

### 4.3 Efficiëntievariatie

Een ability breekt sneller, raakt meer tiles of verhoogt damage.

Dit kan sterk en bevredigend zijn, maar het blijft soms dezelfde beslissing met hogere throughput.

### 4.4 Mechanische variatie

De speler moet anders kijken, richten, bewegen, timen of risico afwegen.

Voorbeelden:

- een ader heeft meerdere zichtbare breukpunten;
- een materiaal moet op het juiste puls-moment worden geraakt;
- een instabiel blok beloont positionering voordat het instort;
- een levende geode verdedigt haar kern en vraagt een korte aanvalvolgorde;
- een Star kan veilig worden losgemaakt of snel worden verbrijzeld met een andere uitkomst.

Borick vraagt primair naar deze vierde categorie.

Dat verklaart ook zijn antwoord op “er zijn toch special blocks?” Een special block dat anders oogt of een andere reward geeft, kan voor hem nog steeds dezelfde interactie zijn als hij het met exact hetzelfde patroon mijnt.

> **Special content is niet automatisch een special interaction.**

---

## 5. Wat zijn Warframe-voorbeeld toevoegt

In Warframes huidige mijnproces zoekt de speler specifieke boorpunten, houdt de mijnlaser vast en laat los binnen een gemarkeerd timingvenster. Nauwkeurigheid beïnvloedt kwaliteit en hoeveelheid van de reward. Dat is een korte behendigheidslus binnen het verzamelen, niet alleen een blok met meer HP. Zie de [Warframe mining-uitleg](https://wiki.warframe.com/w/Mining) en [Boricks videoreferentie](https://youtu.be/VhMHvDa1Mlo?si=lUIRsqOihklvwMay&t=178).

De belangrijke abstractie is:

```text
bijzonder materiaal herkennen
→ een andere korte actie uitvoeren
→ eigen uitvoering kunnen beoordelen
→ rewardkwaliteit zichtbaar laten reageren
```

Dit hoeft niet letterlijk een Warframe-meter te worden. Die oplossing heeft ook een risico: een los fullscreen minigame zou precies weer de menu-onderbreking creëren waar Borick al over klaagt.

Een Dig Game-passende prototypevorm zou daarom zijn:

1. De eerste hit onthult één tot drie gloeiende breukpunten in het blok zelf.
2. De speler richt of houdt de mijnactie vast.
3. Hij slaat of laat los tijdens een korte zichtbare puls.
4. Missen geeft nog steeds de basisreward; goed uitvoeren geeft extra kwaliteit, snelheid of bonusloot.
5. Alles blijft in world space en duurt maar enkele seconden.
6. Alleen zeldzame aders, Stars of geodes gebruiken dit; gewone dirt blijft snel en tactiel.

De bestaande abilities kunnen dit systeem verdiepen in plaats van er los naast te staan:

- **Heavy Punch:** opent een harde shell of slaat één breukpunt volledig door;
- **Quick Slash:** raakt meerdere dichtbije punten in één richting;
- **Thunder Strike:** gebruikt zijn timingidentiteit voor een groter risico en grotere opbrengst;
- **Flight:** maakt moeilijke posities bereikbaar, maar is geen wachttijd tijdens de microchallenge.

De huidige checkout heeft al een timingbar voor Thunder Strike. Dat maakt een kleine, vroege wereldprototype technisch logischer dan nog een volledig nieuw los menusysteem.

---

## 6. Waarom “heb je de vijf abilities getest?” de kernvraag niet oplost

Het is een nuttige onderzoeksvraag, maar geen weerlegging van de feedback.

Er zijn drie mogelijke antwoorden en alle drie leveren ontwerpdata:

### Hij testte ze niet

Dan zijn discoverability, gating of pacing het probleem. In de huidige checkout staat de algemene advanced-abilityfase op **500 meter** in `values/systemIntroduction.js`, terwijl Borick maar ongeveer een half uur speelde. Zonder bevestigde deploy/build-ID mag niet worden aangenomen dat zijn beta exact hetzelfde gedrag had, maar de huidige structuur maakt het in elk geval plausibel dat belangrijke abilities buiten zijn geteste lus vielen.

### Hij testte enkele abilities, maar noemt ze niet spontaan

Dan veranderden ze mogelijk niet genoeg aan zijn dominante ervaring om als kernvariatie te blijven hangen.

### Hij testte ze en vond ze wel leuk

Zelfs dan kan de route tussen die momenten nog steeds bestaan uit lang herhaald mijnen, passief terugvliegen en menuwerk. Een leuke uitzondering repareert niet automatisch de gemiddelde minuut.

De betere follow-upvraag is daarom:

> Welke abilities heb je zelf ontdekt en gebruikt, en veranderde één daarvan daadwerkelijk wat je tijdens het mijnen moest waarnemen of beslissen? Op welke momenten viel je terug in hetzelfde patroon?

---

## 7. De combo-opmerking is in de huidige code een concrete flowfout

Deze klacht is niet alleen subjectief.

In de huidige checkout:

- `systems/combo/ComboSystem.js` gebruikt een combovenster van zes seconden;
- `world/playScene/PlaySceneUpdate.js` keert direct terug zolang de level-up-popup zichtbaar is;
- de combo-update gebeurt pas later in dezelfde frameflow;
- de Phaser-tijd loopt intussen door;
- na het sluiten ziet de combo-update de verstreken tijd en kan de combo onmiddellijk resetten.

Ook andere blokkerende UI-paden kunnen om dezelfde reden de timer niet bijwerken terwijl de echte tijd wel verstrijkt.

Dat maakt Boricks ervaring zeer aannemelijk:

```text
speler bouwt vrijwillig flow op
→ game opent een verplichte keuze
→ speler leest zoals gevraagd
→ timer loopt onzichtbaar door
→ game straft de speler voor het lezen
```

Dit is een contractfout tussen UI en gameplay, geen smaakverschil.

De juiste ontwerpregel is:

> Normale combodecay blijft actief tijdens echte gameplay, maar gedwongen of blokkerende UI bevriest de comboklok of wordt uitgesteld tot een veilig moment.

Minimaal acceptatiebewijs:

- start een actieve combo;
- open iedere verplichte popup en relevant menu langer dan zes seconden;
- sluit de UI;
- comboaantal en resterende combotijd zijn niet door de UI-consumptietijd verminderd;
- tijdens gewoon spelen blijft de bestaande decay exact werken.

---

## 8. Star Chart/Titan-herladen is eveneens verklaarbaar vanuit de huidige code

De tester merkte een echte zichtbare implementatiekeuze op.

In de huidige checkout:

- de Starlight- en Titan-tabs vragen hun art on demand aan;
- bij het verlaten van de tab of het pauzemenu wordt de actieve consumer vrijgegeven;
- beide groepen hebben `releaseWhenUnused: true`;
- `values/runtimeAssetLoading.js` gebruikt een releasevertraging van vijf seconden;
- daarna mogen de beheerde textures worden verwijderd en moet een latere opening ze opnieuw aanvragen.

Technisch is dit bedoeld om decoded texture memory te beperken. UX-matig is Boricks reactie logisch: een kernmenu hoort binnen dezelfde speelsessie als stabiele spelstaat te voelen, niet als een pagina die opnieuw downloadt of decodeert.

De engine is hier niet het probleem. Phaser kan deze schermen onmiddellijk tonen wanneer hun textures resident blijven. Het probleem is dat het geheugenbeleid zichtbaar wordt als interactiefrictie.

Een betere richting:

- houd recent gebruikte Star/Titan-interfaceassets gedurende de PlayScene of een ruimere sessiegrace resident;
- verwijder ze primair onder echte geheugendruk via de bestaande budget/LRU-logica;
- prefetch de eerstvolgende relevante tab op een idle moment;
- heropenen binnen dezelfde sessie moet onmiddellijk zijn;
- behoud een rollback voor zwakke apparaten als dat nodig blijkt.

Een vijfsecondenrelease is geschikt tegen tab-thrashing, maar te kort om een interface persistent te laten aanvoelen.

---

## 9. Flight is functioneel, maar terugvliegen kan nog steeds wachttijd zijn

“Hold Shift is saai” betekent niet dat Flight als mechanic ontbreekt. Het betekent dat de terugreis vaak een reeds genomen beslissing blijft uitvoeren.

Er is een belangrijk verschil:

- **Traversal als spel:** route lezen, obstakels ontwijken, resources beheren, shortcuts kiezen en actief sturen.
- **Traversal als wachttijd:** dezelfde toets vasthouden door een bekende lege tunnel totdat de surface terugkomt.

De eerste afdaling kan spanning en ontdekking dragen. De tiende terugvlucht door een reeds uitgeholde schacht heeft die waarde vaak niet meer.

Mogelijke oplossingsrichtingen die eerst als klein prototype moeten worden getest:

- versneld stijgen door reeds veilige, lege schachten;
- skill-based boosts of routekeuzes tijdens de opstijging;
- verdiende lift/checkpoints na het aantoonbaar beheersen van de terugweg;
- returnbeslissingen op diepte die cargo, risico en tijd afwegen;
- kortere vroege expedities zodat de volledige lus sneller bewijst waarom zij leuk is.

De toets alleen vervangen door een andere toets lost het niet op. De terugreis moet korter worden of meer agency bevatten.

---

## 10. Wat “overscoped” hier werkelijk betekent

Borick ziet veel afzonderlijke systemen en leidt daaruit af dat ontwikkeltijd verspreid is. Zijn redenering is:

```text
veel systemen moeten elk worden gebouwd
→ ieder systeem vraagt UI, uitleg, balans, bugs en polish
→ de verbindingen tussen systemen krijgen minder aandacht
→ de speler ziet veel breedte maar voelt geen sterke dominante lus
```

Dat is een redelijke hypothese, maar geen wiskundig bewijs dat het project te groot moet blijven of verdwijnen.

De sterkste reactie is ook niet per se een nieuw Unreal-project starten. Een engineswitch zou nieuwe leerkosten en nieuwe scope toevoegen zonder automatisch mining, doelen of pacing te verbeteren.

De bruikbare vertaling van zijn advies is:

> Behandel de eerste 20–30 minuten van Dig Game tijdelijk als een klein zelfstandig spel. Freeze nieuwe breedte. Bewijs één kernlus en één onderscheidende special interaction. Bouw pas daarna verder.

Dat bereikt zijn leerdoel zonder bestaand werk weg te gooien.

---

## 11. Niet alle feedback heeft dezelfde bewijskracht

### Hoog vertrouwen

- het huidige doel was voor deze speler onduidelijk;
- onboarding liet hem na 30 minuten zonder heldere richting;
- UI onderbrak zijn combo en flow;
- de terugvlucht voelde passief;
- Star/Titan-schermen voelden als herladen;
- terugkeer naar het hoofdmenu produceerde een fout in zijn build.

Dit zijn directe observaties uit zijn sessie. De combo- en reloadklachten zijn bovendien verklaarbaar vanuit de huidige broncode.

### Middelmatig vertrouwen

- de dominante kernlus zal voor veel spelers snel repetitief worden;
- abilities en special blocks leveren onvoldoende variatie.

Dit zijn waardevolle signalen, maar één speler zegt er zelf “denk ik” en “persoonlijk” bij. Ze moeten met meerdere frozen-buildtests worden bevestigd.

### Lage bewijskracht als productbesluit

- zet Dig Game aan de kant;
- maak een nieuw spel;
- gebruik Unreal Blueprints;
- voeg specifiek een Warframe-QTE toe.

Dat zijn voorgestelde oplossingen van de tester, niet de vastgestelde oorzaken. Mila hoeft ze niet letterlijk te volgen om de kernfeedback serieus te nemen.

---

## 12. Wat er misging in de communicatie

Niemand deed hier iets onredelijks, maar Mila en Borick spraken even op verschillende niveaus.

Borick sprak over zijn **dominante ervaring**:

> Wat deed ik het vaakst, hoeveel beslissingen nam ik en waarom wilde ik de lus herhalen?

Mila antwoordde vanuit de **feature-inventaris**:

> Heb je de abilities en special blocks wel gezien die variatie moeten leveren?

Beide vragen zijn nuttig, maar aanwezigheid in de code is niet hetzelfde als aanwezigheid in de spelerervaring.

De verkeerde conclusie zou zijn:

```text
de tester zag de abilities niet
→ zijn feedback over variatie is ongeldig
```

De betere conclusie is:

```text
de tester zag of gebruikte de abilities niet betekenisvol
→ onderzoek waarom ze zijn eerste half uur niet veranderden
```

Als Borick de abilities niet testte, is dat geen verloren feedback. Het is precies informatie over pacing, onboarding en discoverability.

---

## 13. Aanbevolen prioriteiten

### P0 — Technisch vertrouwen en onterechte flowstraf

1. Vraag de screenshot met volledige stacktrace, URL, build-ID en exacte klikroute op.
2. Reproduceer en repareer `returnToMainMenu` in de exact gedeployde beta.
3. Maak comboverloop gameplay-actief: blokkerende UI mag de timer niet opeten.
4. Queue verplichte keuzes tot een veilig moment wanneer dat beter is dan pauzeren.

### P0 — Doel en eerste herhaalreden

1. Toon altijd één huidige intentie.
2. Toon één nabije, verdiende belofte.
3. Laat binnen de eerste lus een upgrade werkelijk voelbaar gedrag veranderen.
4. Geef het eerste half uur een herkenbaar voorlopig eindpunt of climax.

### P1 — Verminder passieve lusdelen

1. Meet hoeveel tijd werkelijk mijnen, beslissen, vliegen en menugebruik inneemt.
2. Verkort of activeer terugvluchten door reeds bekende ruimte.
3. Maak verkoop/upgradeflow sneller en voorkom herhaald administratief menuwerk.
4. Laat Star/Titan-interfaceassets binnen dezelfde sessie direct heropenen.

### P1 — Bewijs één andere kerninteractie

1. Kies één zeldzame ader, Star of geode.
2. Geef die een korte world-space precisie- of positioneringshandeling.
3. Laat performance de bonus beïnvloeden, niet het recht op de basisreward.
4. Laat bestaande abilities alternatieve oplossingen of mastery bieden.
5. Test dit geïsoleerd voordat meerdere bloktypes dezelfde complexiteit krijgen.

### P2 — Scope pas na bewijs verder reduceren

Verwijder of verberg systemen niet alleen omdat de lijst lang is. Stel eerst per systeem vast:

- welke kernhandeling het verbetert;
- welke nieuwe beslissing het creëert;
- wanneer de speler die beslissing nodig heeft;
- of de speler het gevolg zonder uitleg kan herkennen;
- wat er verloren gaat als het systeem tijdelijk verborgen blijft.

Systemen zonder overtuigend antwoord mogen later komen, worden samengevoegd of uit de demo verdwijnen.

---

## 14. Acceptatiecriteria voor de volgende blinde test

Gebruik een frozen build, fresh save, opname en geen ontwikkelaarscoaching.

### Na 5, 15 en 30 minuten

Vraag zonder hints:

1. Wat probeer je nu te bereiken?
2. Wat verwacht je dat daarna verandert?
3. Welke handeling vond je het leukst?
4. Waar was je alleen aan het wachten?
5. Welke abilities heb je zelf ontdekt en wanneer koos je ze bewust?
6. Welk speciaal blok vroeg daadwerkelijk ander gedrag?

### Observeer

- tijd tot eerste geldige dig;
- tijd tot eerste volledige dig/return/sell/upgrade-lus;
- aandeel actieve speeltijd versus menu en passieve terugreis;
- aantal verplichte popups tijdens actieve combo;
- combo vóór en na iedere blokkerende UI;
- eerste moment waarop het doel onduidelijk wordt;
- eerste vrijwillige ability-use;
- eerste speciaal blok dat de tester spontaan als mechanisch anders beschrijft;
- heropeningstijd van Star Chart en Titans;
- succesvolle terugkeer naar hoofdmenu zonder console-error.

### Slagingsvoorwaarden

- de speler kan het huidige doel en de volgende beloning in eigen woorden uitleggen;
- geen gedwongen UI vernietigt een actieve combo;
- de terugreis wordt niet hoofdzakelijk als wachten beschreven;
- minstens één speciale interactie verandert wat de speler doet, niet alleen wat hij krijgt;
- abilities worden vrijwillig gebruikt omdat ze een herkenbaar probleem oplossen;
- veelgebruikte menu's heropenen direct;
- het hoofdmenupad crasht niet.

---

## 15. Voorstel voor antwoord aan Borick

> Ja, dit verduidelijkt het. Je bedoelt dus niet dat er letterlijk geen abilities of special blocks zijn, maar dat de loop die jij tijdens die 30 minuten werkelijk ervoer meestal dezelfde input en weinig actuele keuzes had: mijnen, passief terug omhoog, menu's en opnieuw beginnen. Een speciaal blok telt voor jou pas als het ook een andere korte handeling vraagt, zoals timing, richten of positionering, niet alleen een andere reward. Klopt dat?
>
> Welke abilities heb je zelf ontdekt en getest, en veranderde één daarvan echt wat je tijdens het mijnen moest beslissen? Als je ze niet vond is dat ook nuttige feedback over de introductie ervan.
>
> Het advies om het project even weg te leggen begrijp ik nu als: eerst één kleine mechanic op zichzelf bewijzen. Ik wil dat waarschijnlijk binnen Dig Game doen als een heel kleine vertical slice, niet noodzakelijk door het hele project te schrappen of van engine te wisselen.
>
> Stuur zeker ook de screenshot van de `Uncaught TypeError`, liefst met de volledige console-stack en wat je vlak daarvoor aanklikte.

Deze reactie bevestigt zijn ervaring zonder meteen akkoord te gaan met iedere voorgestelde oplossing.

---

## 16. Definitieve diagnose

Borick zegt uiteindelijk dit:

> Dig Game heeft al veel inhoud, maar de inhoud verandert mijn meest voorkomende handelingen en beslissingen nog niet vaak genoeg. Tegelijk onderbreken UI, terugreistijd en onduidelijke doelen de flow. Daardoor voelt de game breder dan hij diep voelt.

De oplossing is niet blind meer content toevoegen, maar ook niet automatisch alles verwijderen.

De juiste volgorde is:

```text
helder huidig doel
→ tactiele basishandeling
→ snelle betekenisvolle beloning
→ actieve terugkeerbeslissing
→ één mechanisch andere ontdekking
→ bestaande abilities als oplossingen verweven
→ pas daarna meer systemen tonen
```

Mijn oordeel: **Dig Game hoeft niet aan de kant en Phaser hoeft niet vervangen te worden.** Boricks sterkste punt is dat de eerste 20–30 minuten als een kleiner, zelfstandig spel bewezen moeten worden. Zijn Warframe-voorbeeld is een richting voor hogere decision density, niet een bestelling voor nog een los systeem.

Deze feedback sluit daarmee aan op `markdown/feedback/2026-07-30-fnab-first-five-minuten-playtestanalyse.md`: de game moet eerst één duidelijke, bevredigende kernlus bewijzen voordat de bredere systeemrijkdom om aandacht vraagt.
