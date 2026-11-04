# Fleet Control Desk – Konzept für das EA Trading Journal

Stand: 04.11.2026 · Version 0.2 · Produkt- und Designentwurf mit Präzisierungen aus dem Dreamteam-Review

Fleet Control Desk ist die private Kontrollplattform für die entwickelten Flotten-EAs. Der Einstieg beantwortet drei Fragen: **Welche Flotte verdient Geld? Welches Risiko besteht? Wo braucht der Betrieb Aufmerksamkeit?** Die Detailseiten erklären die Beiträge einzelner Strategien, die tatsächliche Ausführung und die Herkunft der Zahlen.

Der erste Ausbau liest Daten. Der grafische Draft verwendet ausschließlich fiktive Beispieldaten. Er ist keine Liveanbindung. Die gemeinsame neue Monitoring-API aus M563/M561 ist laut technischer Grundlage noch nicht vollständig implementiert und abgenommen. Name, Hierarchie und gewünschte Ansichten stammen aus dem Nutzerauftrag; die konkrete Anordnung und Kennzahlenauswahl sind Vorschläge.

## 1. Fachliches Modell

| Begriff | Bedeutung im Desk |
| --- | --- |
| Flotte | Ein fachlich identifizierter Flotten-EA mit seinem Variantenverbund. Primäre Einheit der Übersicht. |
| Variante | Stabile Strategielinie mit Originalsymbol und Timeframe; ihre unveränderlichen Parameter-/Paketstände sind eigene `variant_revision`-Objekte. Beispielsweise eine Breakout-Linie auf EURUSD H1 mit Revision v12. |
| Strategiefamilie | Optionaler gemeinsamer Oberbegriff mehrerer Varianten. Nicht mit ihrer konkreten Revision gleichsetzen. |
| Manifestrevision | Zusammensetzung und Risikostand einer Flotte. Gewünschter und bestätigter Stand bleiben getrennt. |
| Einsatz / Instanz | Tatsächlich laufende Flotte auf einem bestimmten Konto, Terminal und Host. Live und Demo bleiben getrennt; ein historischer Researchlauf besitzt stattdessen einen eigenen `run_id`-Scope. |
| Risikopool | Dauerhafte wirtschaftliche Ressourcenlinie; kann auch Verpflichtungen aus älteren Variantenrevisionen enthalten. |
| Konto | Native Brokerperspektive auf Balance, Equity, Margin und Historie. Eigenständige Achse zur Flotte. |

Navigation: **Alle Flotten → Flotte → Variante → Position / Tradezyklus → Orders, Deals und Ereignisse**. Konten und Einsätze sind eine zusätzliche Perspektive. Eine Flotte auf zwei Konten ist keine neue Strategie; zwei Flotten auf demselben Konto erzeugen keine doppelte Konto-Equity. Summen deduplizieren wirtschaftliche Beiträge und Konten anhand stabiler IDs. Einzelne Deals werden nicht allein anhand einer Magic Number einem Flottennamen zugerechnet.

Historische Ergebnisse verbleiben bei ursprünglicher Variante, Revision und Pool. Eine auslaufende Revision bleibt mit offenen Positionen sichtbar. Aktuelle Variantenlisten dürfen die Verlusthistorie entfernter Varianten nicht verschwinden lassen. Standard ist der gesamte Flottenverlauf mit erkennbaren Revisionsgrenzen; ein Filter „aktuelle Revision“ ändert den ausgewiesenen Umfang ausdrücklich.

Atomare Ergebniseinheit ist der belegte Einsatz mit `fleet_id`, `account_key` und stabiler Instanzbindung; Quellenwechsel erzeugen keinen zweiten Einsatz. Kontoaufnahmen werden nach `account_key`, Brokerbuchungen nach Konto und nativer Buchungs-ID mit Korrekturversion, Positionen nach Konto und stabiler Positions-ID dedupliziert. Pools werden nach ihrer dauerhaften wirtschaftlichen Identität gezählt. Zeitlich aufeinanderfolgende Führungs-/Quellgenerationen derselben Instanz werden nicht als parallele Einsätze summiert. Tatsächlich widersprüchliche gleichzeitige Führungen erzeugen einen Konflikt.

Standard der späteren operativen Ansicht ist **Live**; der Draft ist fest auf **Demo** beschriftet. Es gibt keine Summe über Live, Demo und Research. Bei mehreren Einsätzen zeigt die Flottenkarte deren Zahl und gegebenenfalls „abweichende Revisionen“, statt einen einzigen bestätigten Stand zu erfinden. Beispiel: dieselbe Flotte auf Konto A live mit r07, Konto B demo mit r06 und in Run C erscheint im Livefilter nur mit Einsatz A; B und C sind eigene Perspektiven.

Die Variantenübersicht verwendet eine Zeile je Strategielinie mit aufklappbaren Originalrevisionen und Poolbezug. Ein Pool kann mehrere aufeinanderfolgende Revisionen derselben Linie tragen; seine Kapazität entsteht dadurch nicht erneut. Ergebnisfilter unterstützen Pool, Revision und Symbol. x/R/w gehören immer zur gewählten Manifestrevision und deren für neue Einstiege ausgewählten Varianten. Eine auslaufende Altrevision erhält keinen aktuellen x-/w-Anteil, behält aber ihr historisches Risiko und ihre Verpflichtung in U. Beispiel: Alt-A bleibt mit offenem Verlust im Pool, Neu-B handelt neue Gelegenheiten; Ergebnis und Position bleiben A zugeordnet, der Rahmen wird einmal gezählt.

## 2. Recherche zu bestehenden Journals

Öffentliche Produkt- und Hilfeseiten, gelesen am 04.11.2026. Die Aussagen beschreiben die dokumentierte Benutzerführung; es wurden keine bezahlten Benutzerkonten getestet.

| Produkt | Dokumentierte Anordnung / Daten | Ableitung für Fleet Control Desk |
| --- | --- | --- |
| TradeZella | Playbook-Berichte verbinden Strategieübersicht, vergleichbare Charts und sortierbare Kennzahlentabelle. Enthalten sind unter anderem Netto-PnL, PF, Expectancy, Drawdown, Tradezahl sowie Quervergleiche nach Symbol und Zeit. | Eine eigene Strategieübersicht je Flotte; erst wenige Kennzahlen, dann vergleichbare Varianten und ihre Beiträge. [Quelle](https://help.tradezella.com/en/articles/11595424-reports-playbook). |
| Edgewonk | Chart Lab, Edge Finder und Psychology Lab unterscheiden visuelle Analyse, Mustererkennung und Verhaltensjournal. Die Produktdarstellung betont Auswertung von Setups, Instrumenten und Bedingungen sowie Reviews und Notizen. | Analyse nach Strategie, Symbol und Ausführungskontext. Für EAs stehen Regelabweichungen, Versionen und technische Ursachen im Vordergrund; menschliche Emotionstags sind optional. [Quelle](https://edgewonk.com/). |
| Myfxbook | Portfolioüberblick, Monatsperformance, Equitykurve sowie Auswertung nach Symbol und Magic sind dokumentiert. Die Drawdown-Hilfe unterscheidet EOD-, Intraday- und Growth-DD; Aktualisierungen bestimmen, welche Equityzustände überhaupt erfasst werden. | Übersicht über viele Flotten, Kalender und getrennte Konto-/Strategieansichten. Messintervall und DD-Methode werden sichtbar angegeben, statt unterschiedliche DD-Werte unter einem Namen zusammenzufassen. [Funktionen](https://www.myfxbook.com/features), [Drawdown](https://www.myfxbook.com/help/knowledge-base/drawdown/). |

Die folgende Informationsarchitektur ist ein eigener Entwurf. Klassische Journalfunktionen werden um EA-Betriebsdaten ergänzt: Kern-/Workerfortschritt, Entryfreigaben, gebundene Ressourcen, UNKNOWN, verworfene Signale und bestätigte Revisionen.

## 3. Startseite und globale Navigation

Die Hauptnavigation besteht aus **Flotten**, **Journal**, **Risiko** und **Betrieb & Daten**. Die Flottenübersicht ist die Startseite. Globale Filter gelten für Einsatzart, Zeitraum und gegebenenfalls Konto/Währung. Standardzeit ist Europe/Berlin; UTC und Brokerdatum bleiben im Detail verfügbar. Tages- und Monatswechsel folgen der ausdrücklich gewählten Kalenderbasis.

Unter **Betrieb & Daten → Konten / Einsätze** liegt die Kontoübersicht: native Balance, Equity, Credit, Margin, freie Margin, Marginlevel, Kontokurve und Broker-Tagesstartsaldo, jeweils mit Beobachtungszeit. Kontodetail zeigt gebundene Einsätze/Flotten, Cashflows, Fremdpositionen, unzugeordnete Kosten und Abgleichsrest. Ein Konto mit zwei Flotten wird dort einmal dargestellt; Einzahlung, Fremdposition und Residual verbleiben auf Kontoebene. Ein relevantes Marginsignal wird zusätzlich im Aufmerksamkeitsfeld verlinkt. Das globale Journal vereint Handelsereignisse mit Filtern über Flotten; globale Risiko- und Betriebsseiten vergleichen deren Pools beziehungsweise Quellen. Der Draft zeigt eine vereinfachte Kontoperspektive je Flotte und native Kontowerte in der Betriebsansicht.

### 3.1 Kopfbereich

Links stehen Produktname und aktuelle Perspektive. Rechts stehen Zeitraum, Zeitzone und Datenstand. Eine kleine Statuszeile nennt die Zahl frischer und veralteter Quellen. Ein Detailpanel erklärt ausgeschlossene Quellen. Im Draft bleibt „Designstudie · Beispieldaten“ ständig sichtbar.

### 3.2 Die wichtigsten Kennzahlen zuerst

Vier kompakte Kacheln reichen für die erste Zeile:

| Kachel | Inhalt | Klickziel |
| --- | --- | --- |
| Trading-Nettoergebnis | Zurechenbare Netto-PnL-Veränderung im Zeitraum einschließlich Veränderung offener Bewertung. Gebuchter und offener Beitrag als Unterzeile. | Ergebnisaufschlüsselung / Flottenvergleich. |
| Max. beobachteter Drawdown | Verlust vom beobachteten Hoch auf synchronisierter, cashflowbereinigter Ergebnisbasis; EUR, Methode und Intervall. Prozent nur mit belastbarer Referenzbasis. | Risikoseite mit DD-Verlauf und Erholung. |
| Gebundenes Stoprisiko | Autoritatives U/C in EUR, einschließlich wirksamer Reservierungen und UNKNOWN; höchstens bei kompatiblen Einheiten/Policies aggregieren. | Pools, Komponenten und Bindungsursachen. |
| Aufmerksamkeit | Zahl betroffener Flotten, gruppiert nach Handelswirkung und Datenqualität. | Priorisierte Ereignisse und Quellenstatus. |

Die Gesamtsicht verwendet nur kompatible, zeitlich ausreichend vergleichbare Daten. Fehlt eine Quelle, heißt die Kennzahl beispielsweise „3 von 4 Flotten · EUR · Teilumfang“. Die fehlende Flotte bleibt mit letztem Stand sichtbar; sie wird weder als null noch als aktuell summiert. Unterschiedliche Währungen werden zunächst getrennt angezeigt. Eine spätere Berichtswährung braucht dokumentierte FX-Quelle und Zeitpunkt. Prozentwerte, PF, Winrate und DD werden nicht über Flotten gemittelt oder addiert.

Darunter steht eine breite **Netto-PnL-Kurve** mit Messqualität und Lücken. Native Konto-Equity gehört in eine ausdrücklich benannte Kontoansicht; eine gemischte Flotten-PnL-Kurve erhält keine Beschriftung „Broker-Equity“. Ein schmales Aufmerksamkeitsfeld daneben zeigt höchstens die wichtigsten Fälle.

### 3.3 Flottenkarten

Eine Karte pro Flotte zeigt Name, Einsatzart, bestätigte Revision, Strategie-/Symbol-/TF-Umfang und:

- Nettoergebnis und geschlossene Tradezyklen im Zeitraum;
- PF und Winrate als zweite Kennzahlenzeile, immer mit Stichprobe;
- maximalen beobachteten DD in EUR; Prozent nur bei definierter Basis;
- Stoprisiko U/C, offene Positionen und Zahl der Varianten;
- getrennte Angaben zu Neueinstiegen, Positionsverwaltung und Datenfrische;
- eine kleine Verlaufskurve; ganze Karte beziehungsweise benannter Button öffnet die Flotte.

Für viele Flotten ergänzt eine kompakte Tabellenansicht dieselben Daten mit Sortierung nach Ergebnis, DD, Risiko oder Aufmerksamkeit. Keine Bewertung nur anhand des höchsten Gewinns. Performance-Rankings müssen Stichprobe, Laufzeit und Abdeckung mitliefern.

U/C-Summen sind ausschließlich informative Belegungssummen, keine zwischen Pools nutzbare freie Kapazität. Karte und Übersicht nennen zusätzlich volle/gesperrte Pools und die bindende Komponente, etwa „1 Pool 100 % · UNKNOWN 1.500 €“. UNKNOWN-Anzahl, auslaufende Verpflichtungen und Soll-/Istabweichungen erhalten Kurzsignale. Neueinstiege heißen bei Mischzuständen „x von y erlaubt“ mit Einzelgründen im Detail. Die Leiste ergänzt UNKNOWN/Reservierungen und Aufnahme-/Belegstatus; Varianten können auch „noch nicht aufgenommen“ sein. Modelliert, nativ belegt und operativ aufgenommen sind verschiedene Zustände.

## 4. Detailseite einer Flotte

Im Kopf bleiben Flottenname, bestätigte Revision, Einsatz-/Kontokontext, Zeitraum und Quellenalter sichtbar. Eine separate Leiste zeigt **Kernfortschritt, Workerbereitschaft, Brokerverbindung, Telemetriefrische, Entryfreigabe und Positionsverwaltung**. Eine grüne Verbindung ersetzt keinen Nachweis laufender Strategiearbeit.

| Bereich | Anzeige und Zweck |
| --- | --- |
| **Überblick** | Netto-PnL, gebucht/offen, PF, Winrate, Expectancy und Tradezahl. Große PnL-Kurve, separater DD-Verlauf, Top-/Flop-Varianten, aktuelle Abweichungen. Native Konto-Equity nur bei eindeutigem Kontoscope. |
| **Varianten** | Strategie, Familie, Originalsymbol, TF, Revision, Zustand aktiv/pausiert/auslaufend, nominelles Entryrisiko x, Anteil w an R, Netto-PnL, PF, Winrate, Expectancy, DD, Stichprobe, offene Verpflichtungen. Klick öffnet die Variante. |
| **Risiko** | Poolweise genehmigtes C und belegtes U, aufgeschlüsselt nach tatsächlicher Wirkung und Reservierungen. Stoprisiko, Stressmargin, Bruttoexposure, Positions-/Orderslots separat. Native Kontomargin hat eine eigene Beschriftung. UNKNOWN mit Ursache und gebundener Wirkung. |
| **Journal** | Geschlossene Tradezyklen, offene Positionen, Orders/Deals und verworfene Gelegenheiten als getrennte Register. Filter nach Variante, Symbol, TF, Richtung, Zeitraum, Exitgrund und Revision. |
| **Analyse** | PnL-Kalender, Symbol-/TF-/Strategiebeiträge, Tageszeit, Haltedauer, R-Verteilung, Kosten, MAE/MFE bei aufgezeichnetem Pfad. Später Korrelation und gemeinsame Verlusttage aus synchronisierten Reihen. |
| **Betrieb & Daten** | Soll-/Istmanifest, Builds, Host-/Terminal-/Kontobindung, tatsächlicher Fortschritt, Beobachtungs-/Empfangszeiten, Watermarks, Lücken, Capabilities, Incidents und Abgleichsrest. Quellen- und Researchbelege. |

Die Detailtiefe wird schrittweise eingeblendet. Ein Standardnutzer muss weder Hashwerte noch rohe Retcodes auf der Übersicht lesen; sie stehen am betreffenden Befund oder in den technischen Details.

### 4.1 Variantendetail

Das Variantendetail zeigt die Strategieidentität samt Revision, Symbol/TF, nominalem Entryrisiko und Pool. Es enthält eigene Netto-PnL-/DD-Reihen, geschlossene Tradezyklen, Kosten, Verlustserien, zulässige und verworfene Gelegenheiten sowie Entry-/Verwaltungszustand. Synthetische Equity ist nur eine zusätzliche Analyse mit ausdrücklich genanntem Referenzkapital. Regimewechsel werden markiert.

### 4.2 Positions- und Tradedetail

Eine Timeline verbindet **Gelegenheit → Entscheidung → Intent → Request → Order → Teilfills → Position → Teilabgänge → Abschluss**. Gezeigt werden ursprüngliches R, nominales und tatsächlich eingegangenes Anfangsrisiko, ursprünglicher und aktueller SL/TP, Exitgrund, Haltedauer, gebuchte Kosten, verbleibendes Volumen sowie MAE/MFE mit Messqualität. Stabile Positions-ID und aktuelles Ticket bleiben getrennt. Notizen können einem Trade, einer Variante, einer Revision oder einem Incident zugeordnet werden.

Der Feldkatalog folgt zusätzlich Abschnitt 4.4 der technischen Grundlage: Anfangsvolumen, einzelne/gewichtete Fillpreise, offener Swap und Bewertungszeit. Besondere Zielregeln wie W1 erhalten eine eigene Angabe samt Wochenquelle und Signal-ATR; sie werden nicht als Fixed-R-Ziel dargestellt. Fehlende Originalbelege bleiben im Draft „—“.

Ein verworfenes Signal wird mit Grund und beobachteter Wirkung angezeigt. Ein hypothetisch entgangener Gewinn wird ohne qualifizierte kontrafaktische Auswertung nicht erfunden.

## 5. Kennzahlenvertrag

Jede Kennzahl führt Scope, Zeitraum, Einheit, Rechenversion, Quelle, letzten Beobachtungszeitpunkt, Stichprobe und Qualitätsstatus. Qualitätswerte sind **nativ gebucht, exakt abgeleitet, beobachtet/gesampelt, modelliert, nicht verfügbar oder unbekannt**. Kosten verwenden zusätzlich „nicht anwendbar“. Eine fehlende Kennzahl erscheint als „—“ mit Grund.

| Kennzahl | Definition / notwendige Abgrenzung |
| --- | --- |
| Gebuchtes Nettoergebnis | Zugeordnete Handelswerte mit Profit, Kommission, Swap, Fee und separaten zurechenbaren Kosten/Korrekturen genau einmal. Cashflows und Kreditänderungen bleiben separat. |
| Trading-Nettoergebnis im Zeitraum | Veränderung gebuchter kumulierter Handelswerte plus Veränderung noch nicht gebuchter offener Bewertung zwischen belegten Grenzen. Bei offenen Startpositionen zählt deren Anfangsbewertung. |
| Profit Factor | Summe positiver Nettoergebnisse abgeschlossener Tradezyklen / Betrag der Summe negativer Ergebnisse derselben Zyklen. Nicht zugeordnete Kontokosten separat ausweisen. Ohne Verlustnenner „nicht endlich bestimmbar“; ohne Trades „keine Stichprobe“. |
| Winrate | Gewinnende / alle abgeschlossenen Tradezyklen einschließlich Break-even; Anzahl Gewinn/Verlust/Break-even daneben. Ein Deal oder Teilabgang ist kein neuer Tradezyklus. |
| Expectancy | Durchschnittliches Nettoergebnis je abgeschlossenem Tradezyklus; EUR und optional R. R nur mit dokumentiertem ursprünglichem tatsächlichem Anfangsrisiko und konsistenter Teilfillbehandlung. |
| Maximaler DD | Maximum des beobachteten Rückgangs von einem vorausgegangenen Hoch im benannten Zeitraum/Pfad. Messintervall und Lücken sind Teil der Aussage. Account-Equity-DD, PnL-DD, EOD-DD und Modellschranke erhalten verschiedene Namen. |
| Rendite | Benannte Kapitalbasis und Cashflowverfahren notwendig; kein Prozentwert aus einer willkürlichen Aufteilung des Kontos. TWR oder MWR sind später getrennte, explizit definierte Kennzahlen. |
| Erholung | Dauer unter dem letzten Hoch und Zeit zur Erholung; aktuell offener DD bleibt als noch nicht erholt erkennbar. |
| Kosten | Gebuchte explizite Kosten separat nach Typ. Spread/Slippage als Attribution mit passenden Referenzquotes; bereits preiswirksame Kosten nicht nochmals vom Netto abziehen. |
| Risiko x / R / w | Nominalrisiko je Gelegenheit, Summe dieser Nominalrisiken und deren Anteile. Keine Gleichsetzung mit Kontokapital, tatsächlichem U oder maximalem DD. |
| Ressourcen U / C | Autoritative Belegung und genehmigter Rahmen je Ressourcentyp/Pool. Fill ersetzt entsprechende Reservierung; keine Dreifachaddition von Rahmen, Reservierung und Fill. |
| MAE/MFE | Maximaler ungünstiger/günstiger Positionsverlauf aus ausreichenden Zwischenbeobachtungen. Aus Endergebnissen allein nicht verfügbar. |
| Signal-Fill-Quote | Nur bei vollständiger Opportunity-/Intentaufzeichnung. Kein Signal, verworfen, nicht gesendet, endgültig abgelehnt und unbekannte Wirkung bleiben eigene Kategorien. |
| Sharpe / Sortino / CVaR / CDaR | Späteres Analysepaket mit synchronen Reihen, Kapital-/Returnbasis, Sampling, Annualisierung, Beobachtungszahl und festem Niveau. Keine Voraussetzung für den ersten Desk. |

Der Kontoabgleich führt zurechenbaren Handels-PnL, Cashflows, sonstige/unzugeordnete Änderungen und verbleibendes Residual getrennt. Ein Residual wird weder gleichmäßig auf Varianten verteilt noch künstlich auf null gesetzt. Grenzen und Zuordnung einer Buchung müssen vor der Berechnung bekannt sein.

### 5.1 Verbindliche Präzisierungen für die spätere Berechnung

**Tradezyklus v1:** Ein Zyklus bindet `account_key`, stabile Positions-ID, Originalrevision und Pool. Er beginnt mit dem Erstfill und endet bei vollständig geschlossenem Volumen. Nachkäufe und Teilabgänge derselben Positions-ID gehören zum selben Zyklus; mehrere Positionen derselben Opportunity sind getrennte Zyklen mit gemeinsamem Opportunitybezug. PF/Winrate/Expectancy filtern nach Abschlusszeit und verwenden den vollständigen Lebenszyklusgewinn. Nachträgliche zurechenbare Korrekturen aktualisieren den Zyklus mit Auswertungsversion und Bekanntwerdungszeit. Ohne vollständige Anfangs-/Kostenhistorie wird er aus vollständigen Zyklusstatistiken ausgeschlossen und die Ausschlusszahl genannt. Break-even heißt genau 0 in der Kontowährungspräzision nach Kosten; eine spätere Toleranz benötigt eine neue Regelversion. Erzwungene Tester-Endschließungen werden separat ausgewiesen und aus den standardmäßigen Strategie-Zyklusstatistiken ausgeschlossen.

Damit erzeugen ein Teilfill und zwei Teilabgänge genau einen Zyklus. Ein im Oktober begonnener und im November abgeschlossener Zyklus zählt mit vollem Lebenszyklusnetto in die November-Zyklusstatistik; der Oktober-/November-PnL-Pfad enthält dagegen die jeweiligen Bewertungsänderungen. Eine spätere Swapkorrektur bleibt sowohl native Buchung zum Buchungszeitpunkt als auch versionierte Korrektur am zugehörigen Zyklus; beide Ansichten werden nicht addiert.

**Bewertungsstand:** `P(t) = kumuliertes gebuchtes Handelsnetto + noch nicht gebuchte offene Bewertung`. Das Periodenergebnis ist ausdrücklich `P(t1) − P(t0)`. Buchungen und offene Bewertung eines Punkts müssen zum selben belegten Historien-Watermark gehören; inkonsistente Punkte werden ausgelassen und als Lücke markiert. Bereits gebuchter Swap wird nicht erneut offen gezählt; Teilabgänge übernehmen nur den belegten geschlossenen Anteil, der verbleibende offene Anteil bleibt in der Bewertung. Beispiel: gebuchtes Netto 0, offene Anfangsbewertung 100; dann gebucht 300/offen 0 nach Schließung: Periodengewinn 200, nicht 300 oder 400. Ein Zwischenpunkt bei 150 zerlegt das Ergebnis additiv in 50 + 150 = 200.

An Kalendergrenzen gilt die letzte konsistente Beobachtung vor/auf der Grenze mit ausgewiesenem Zeitabstand, maximal einem vereinbarten Messintervall. Benachbarte Perioden verwenden dieselbe effektive Grenze. Fehlt diese, ist die vollständige Periodenkennzahl unbekannt; ein vorhandenes Teilfenster erhält seine tatsächlichen Grenzen. Eine zwischen Snapshots geschlossene Position erscheint erst im nächsten konsistenten gebucht/offen-Paar als geschlossen.

**Aggregation / DD:** Der operative Entwurf verwendet ein gemeinsames Fünf-Minuten-Raster; ein Vergleichspunkt benötigt belegte Beobachtungen aller Mitglieder innerhalb desselben Rasterintervalls. Eine veraltete Quelle wird nicht fortgeschrieben. Bei fehlenden Punkten oder wechselndem Mitgliederumfang wird der gemeinsame Pfad unterbrochen und ein neues, ausdrücklich benanntes Segment begonnen. Keine DD-Berechnung über einen Scopewechsel. Das Hoch für „DD im Zeitraum“ beginnt am ersten belegten Punkt des ausgewählten Fensters; Allzeit-DD ist eine eigene Kennzahl. PnL-DD bleibt in EUR. Prozent-DD wird im ersten Ausbau nicht angeboten. Für späteren nativen Account-Equity-DD sind rohe Equity und deren Cashflow-/Creditbereinigung getrennte Reihen; ohne zeitgerechte Cashflowabdeckung gibt es keinen als handelsbedingt ausgewiesenen DD. Einzel-DDs werden nicht summiert.

**Qualitätsabhängigkeiten:** Eine zusammengesetzte Kennzahl kann nie bessere Qualität als ihre notwendigen Eingaben behaupten. Fehlende notwendige Kosten, unvollständige Lebenszyklen oder fehlende Anfangsbewertung ergeben „—“ mit Grund; ein Teilwert wird nur unter einem eigenen Namen wie „bekannter Profit vor unbekanntem Swap“ angezeigt, niemals als vollständiges Netto. Modellierte Bestandteile kennzeichnen das gesamte Ergebnis als modelliert. „Nicht verfügbar“ heißt, dass die Quelle diese Fähigkeit nicht liefert; „unbekannt“ heißt, dass ein erwarteter Wert nicht belegt ist. Nicht zugeordnete Kontokosten erscheinen neben dem Flotten-Netto als eigene Kontozeile und werden nicht verteilt. Beispiel Legacyquelle ohne Swap: Netto/PF/Expectancy bleiben unvollständig, bekannte Profitwerte sind separat sichtbar.

## 6. Kalender, Vergleiche und Aufmerksamkeit

Der Kalender zeigt primär **gebuchtes Handelsnetto pro Buchungstag**. Das ist ausdrücklich eine andere Zeitzuordnung als der vollständige Lebenszyklusgewinn eines am Tag geschlossenen Trades. Offene Bewertung erscheint in einer gesonderten Tagesansicht; aus Tradeabschlüssen rekonstruierte Tages-Equity wird nicht vorgetäuscht. Unvollständige Tage werden schraffiert, belegte handelbare Tage ohne Vorgang neutral dargestellt. Tagesklick öffnet die zugrunde liegenden Buchungen und Ereignisse.

Live-/Demo-/Researchpfade werden nicht zu einer einzigen Performance verschmolzen. Soll/Ist-Vergleiche benötigen passende Variante, Revision, Risiko, Kostenprofil, Broker-/Symbolvertrag und vergleichbaren Zeitraum. Ein historischer Zielkorridor kann die Livekurve ergänzen, bleibt aber als Modell bezeichnet. Unterschiedliche Zusammensetzung und kleine Stichproben werden sichtbar. Ein Forschungsvorschlag aktiviert keinen EA und erhöht kein Risiko.

Aufmerksamkeit wird nach **tatsächlicher Wirkung und Gewissheit** sortiert: mögliche unkontrollierte Wirkung / Verwaltung blockiert, danach Entryblockade / Identitäts- oder Abgleichsfehler, danach Datenrückstand und allgemeine Hinweise. Schwere, erste/letzte Beobachtung und Scope bleiben zugänglich. Ein Datenabriss beweist weder einen Handelsstopp noch fortgesetzten gesunden Handel. Ein späterer Alarmdienst muss unabhängig von der geöffneten Oberfläche laufen; im Draft gibt es keine Benachrichtigungsfunktion.

Unbekannte Verwaltung bei offenem Risiko oder UNKNOWN und der Ausfall des kritischen Ausführungsjournals gehören ebenfalls in die oberste Aufmerksamkeitsstufe. Ein reiner Frischehinweis ohne offene Exposition kann darunter stehen. Eine spätere aggregierte Ausführungsanalyse (FCD-011) ergänzt Retcodes/Ablehnungen, Teilfillquote, Latenzen Signal→Send→Antwort→Fill, Slippageverteilung und beobachtete Gleichzeitigkeit, jeweils mit Zeitpräzision, Referenzquotes, Stichprobe und Capability-Status. Sie ist bewusst kein Bestandteil der ersten funktionsfähigen Ansicht.

## 7. Designrichtung

**Space Glass:** tiefes Navy, zurückhaltende Aurora-Verläufe, helle lesbare Zahlen, cyanfarbene Auswahl, violette Akzente und kleine Orbitmotive. Karten erhalten lichtartige Kanten und eine Glaswirkung durch opake Verlaufsebenen. Tabellen und Text bleiben ruhig; Dekoration liegt nicht hinter wichtigen Zahlen. Gewinn/Verlust und Warnungen werden zusätzlich zu Farben beschriftet.

Die erste Ansicht besteht aus schmaler Navigation, großzügigem Titelbereich, vier Kennzahlen, einer dominanten Kurve und vier Flottenkarten. Das Detail übernimmt dieselbe Struktur und ergänzt lokale Register. Mobile Geräte erhalten gestapelte Kennzahlen und Karten sowie eine kompakte Navigation. Tabellen dürfen im eigenen Bereich horizontal scrollen. Tastaturfokus, mindestens 11px Beschriftungen und ausreichende Kontraste gehören zum Entwurf. Keine permanent animierten Sterne, keine blinkenden Kurven.

Der klickbare Draft zeigt Flottenübersicht, alle vier Flottendetails, Varianten- und Positionseinblick, Risiko, Analyse und Betriebsdaten. Fiktive Situationen demonstrieren eine aktuelle Quelle, eine veraltete Quelle, eine auslaufende Revision und ein UNKNOWN mit gebundener Kapazität. Ein eigener Demozeitraum kann gewechselt werden. Es gibt keine Handels-, Resume-, Reset- oder Risikoveränderungsaktion.

## 8. Anschluss an die technische Grundlage

Die Quelle ist [FLEET_CONTROL_DESK_TECHNISCHE_GRUNDLAGE.md](references/FLEET_CONTROL_DESK_TECHNISCHE_GRUNDLAGE.md), Version 1.0 vom 04.11.2026. Die inhaltlich unveränderte Übergabedatei ist im Repository enthalten; ihre weiterführenden absoluten Quellpfade sind Herkunftsreferenzen des ursprünglichen Rechners. Der Desk übernimmt deren Semantik und entwickelt keinen zweiten Ausführungs-/Kostenkern.

Vorgesehener Weg: **EA-Kern → lokale Originalereignisse/Snapshots → separater Collector → Originalarchiv und Leseprojektion → authentisierte Lese-API → Desk**. Legacydateien erhalten eigene Adapter mit Capabilities. Die in der Grundlage genannten Routen sind Entwürfe, keine bereits erreichbaren APIs. Monitoringausfälle dürfen den Handelspfad nicht an Netzwerkantworten binden; ein Ausfall des kritischen Ausführungsjournals bleibt ein eigener Incident.

Für Identitäten werden mindestens Konto-/Serverbindung, Flotte/Manifest, Pool, Variante/Paketrevision, Quelle/Instanz/Session und Brokerkorrelation benötigt. Native Account-, Fleet-, Variant- und Position-Snapshots sowie Order-, Deal-, Intent- und Incidentereignisse sind die vorgesehenen Datenarten. Originale, Korrekturen, Ereignisreihenfolge und watermarks bleiben nachvollziehbar.

Der vollständige Datenartenkatalog bleibt Abschnitt 6 der Grundlage: insbesondere gehören auch `cashflow_event`, `control_event` und `telemetry_health` dazu. Cashflows speisen Kontoabgleich und Bereinigung; Controlereignisse werden als lesende Historie angefragter, verweigerter und bestätigter Entscheidungen gezeigt; Healthdaten liefern Frische und Lücken. Keiner dieser Leser erteilt Befehlsrechte.

Die Office-Vorgabe von **fünf Minuten** für Erfassung und aktive Abrufe gilt weiter. Feinere Originalaufzeichnungen sind eine spätere, ausdrücklich zu entscheidende Produzentenfähigkeit. Der UI-Draft behauptet deshalb keine sekundengenaue Überwachung. Ein gesampelter Verlauf verpasst mögliche Spitzen zwischen Messungen. Alle angezeigten Frischegrenzen sind im Entwurf beschriftete Beispielwerte, keine produktive Policy.

Ereignisse behalten ihre tatsächlichen Produzentenzeitstempel; der Fünf-Minuten-Takt betrifft Snapshots und Abrufe und ändert keine Dealzeit. Ende-zu-Ende-Alter umfasst Aufzeichnung, Veröffentlichung, Transfer, Verarbeitung und UI-Abruf; fünf Minuten Sampling sind kein Fünf-Minuten-Latenzversprechen. Beobachtungs- und Empfangszeit bleiben je Signal zugänglich. MAE/MFE aus einem Fünf-Minuten-Pfad wären lediglich gesampelte Untergrenzen; der Draft zeigt sie mangels qualifizierter Pfade nicht. Konkrete Latenzgrenzen bleiben bis zur echten Anbindung offen.

Zugang ist ausschließlich für Matthias vorgesehen. Server prüfen widerrufbare Eigentümer-/Geräteberechtigungen über HTTPS beziehungsweise den gewählten geschützten Netzweg. Brokerzugänge bleiben außerhalb des Frontends. Hosting, konkrete API, Authentisierungsverfahren, Retention und Collectorinstallation sind spätere Implementierungsentscheidungen. Das Journal bleibt fachlich von erwarteten Vergütungen, genehmigten Payouts, Bankeingängen und Buchhaltung getrennt.

## 9. Kleiner sinnvoller Umsetzungspfad

1. **Produktentwurf:** Kennzahlen und Navigation anhand des klickbaren Drafts abstimmen. Ergebnis dieses Auftrags.
2. **Eine Quelle durchgängig lesen:** Tatsächliches Beispielsegment und bestätigte Produzentenfähigkeit übernehmen; eine Flotte mit Zuordnung, Historie und sichtbaren Lücken anbinden. Keine vollständige Zukunfts-API voraussetzen.
3. **Mehrflottenbetrieb:** Einsätze/Konten deduplizieren, Revisionen und Pools darstellen, Datenqualität und Incidentverlauf ergänzen.
4. **Analysen nach Bedarf:** Kalender, Kosten, Korrelation und gebundene Researchvergleiche auf nachweislich passenden Reihen ergänzen.

Der erste Datenanschluss muss insbesondere offene Startpositionen, Entrygebühr, Teilfills/Teilabgänge, separate Kosten, Cashflow, Fremdanteile, UNKNOWN und auslaufende Revisionen korrekt darstellen. Vorhandene akzeptierte Produzentenbelege werden wiederverwendet. Dieser Konzeptauftrag startet keinen Collector, Testlauf oder produktiven Dienst.

## 10. Verbleibende Grenzen

| Punkt | Auswirkung und Einordnung | Behandlung |
| --- | --- | --- |
| Vollständiger neuer Export/API noch offen | Für den jetzigen Konzeptauftrag keine Blockade; für tatsächliche Integration wesentlich. Verfügbarkeit noch nicht zugesagt. | Konkreten M563/M561-Lieferstand beim Anschluss binden. |
| Bestehende BUG-0100/0101 aus der Grundlage, MITTEL | Pool-/Handoffdetails benötigen konkrete Versionsbindung; Eintrittswahrscheinlichkeit unbekannt. | Bereits erfasste Befunde; für UI-Konzept zurückgestellt. Keine Änderungen an den betroffenen Missionen. |
| BUG-0069, akzeptierte Kapazitätsgrenze | UNKNOWN kann eigene Kapazität dauerhaft binden. | Im Desk sichtbar machen; kein Reset oder automatisches Freigeben. |
| BUG-0084, HOCH im betroffenen historischen Vergleich | Kandidatenabhängige Startmengen können Challengevergleiche verzerren. | Solche Vergleichswerte nicht als faire Kennzahl übernehmen. Kein alter Solver wird in diesem Auftrag repariert. |
| Mess- und Quellenlücken | DD-Spitzen, MAE/MFE oder Kosten sind gegebenenfalls unbekannt. Wahrscheinlichkeit hängt vom tatsächlichen Produzenten ab. | Qualitätsstatus und fehlende Werte anzeigen; keine Nullwerte erfinden. |

Die historische Fehlerlage stammt aus der übergebenen Grundlage und wurde in diesem Auftrag nicht neu untersucht. Neue unabhängige Prüfung dieses Produktkonzepts und ihr genauer Umfang werden im [Reviewnachweis](FleetControlDeskReview.md) festgehalten.
