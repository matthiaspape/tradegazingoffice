# Tradegazing Office Desk · Gemeinsames UI/UX-Konzept

**Stand 05.11.2026 · Zielbild zur Abstimmung**

[Klickbare Designvorschau](../design/tradegazing-office-desk/index.html) · [Fachkonzept Fleet Control](FleetControlDeskKonzept.md)

## Ein Desk für zwei Arbeitsweisen

Beim Öffnen des Desk sieht Matthias zuerst, welche Flotten zum Ergebnis beitragen, wo Risiko gebunden ist und welche Daten fehlen. Unter Projektmanagement bearbeitet er Missionen, hält Entscheidungen fest und verfolgt Befunde. Navigation, Marke, Statusdarstellung und grundlegende Bedienelemente folgen in beiden Bereichen demselben System. Die Startseite ist Fleet Control, das Tradegazing-Logo führt dorthin zurück.

| Ebene | Bereich | Aufgabe |
| --- | --- | --- |
| 1 · Controlling | Fleet Control | Flotten vergleichen und über Auffälligkeiten in die passende Detailansicht springen. |
| 2 · Projektmanagement | Mission Log · Context Core · Bug Board · Legal & Lizenzen | Entwicklungsarbeit, Entscheidungen, technische Befunde und Belege am jeweils zuständigen Ort pflegen. |

Auf dem Desktop hält eine kompakte linke Navigation beide Bereiche sichtbar. Mobil steckt dieselbe Reihenfolge in einem aufklappbaren Menü mit Textlabel und sichtbarer aktueller Seite. Die Navigation des ursprünglichen Fleet-Control-Entwurfs wird zur **lokalen Controlling-Navigation** mit Flotten, Journal, Risiko und Betrieb & Daten. Analysen sind ein Register im Flottendetail. Projektmanagement-Seiten zeigen keine Fleet-Filter. Die bestehenden Office-Einstiege `/`, `/controlling/fleet-control`, `/missions`, `/context`, `/bugs` und `/legal` dienen als Ausgangspunkt für eine spätere Umsetzung.

## Der tägliche Kontrollgang

1. **Fleet Control öffnen.** Der Kopf nennt Einsatzart, Zeitraum, Kalenderbasis, Währung und letzten belegten Datenstand. Das Kontrollfeld zeigt Abdeckung und Quellenalter. Vier Kacheln priorisieren zurechenbares Trading-Netto, maximalen beobachteten PnL-Drawdown, gebundenes Stoprisiko U/C und betroffene Flotten. Eine Verlaufskurve und eine kurze Aufmerksamkeitsspalte zeigen die wichtigsten Abweichungen.
2. **Eine Flotte prüfen.** Die Flottenliste zeigt je Flotte Name, Einsatzumfang, Variantenanzahl und einen Kennzahlenblock mit Netto, geschlossenen Tradezyklen, Drawdown und Datenfrische. PF und Winrate stehen mit Stichprobe in der erweiterten Liste und im Detail. Für viele Flotten ist eine sortierbare Tabelle mit denselben Feldern vorgesehen. Ein eindeutiger Link öffnet die Flotte.
3. **Ursache nachverfolgen.** Im Flottenkopf bleiben Scope, bestätigte Revision und Quellenalter sichtbar. Eine abweichende Revision je Einsatz bleibt erkennbar. Die Statusleiste trennt Kernfortschritt, Worker, Brokerverbindung, Telemetrie, Entryfreigabe und Positionsverwaltung. Ein Broker-Heartbeat belegt nur die Verbindung.
4. **Befund festhalten.** Ein Ereignis verweist auf die konkrete Quelle. Bei einem nachvollziehbaren technischen Defekt kann später bewusst ein Bug-Eintrag als Entwurf geöffnet werden. Flotten-/Einsatz-ID, Revision, Ereignis-ID, beobachtete Zeit, Scope und Belegreferenz können vorbefüllt werden. Speichern und Zuordnung zu einer Mission erfolgen nach Prüfung im Bug Board. Eine Telemetrielücke allein bleibt ein Betriebsbefund. Der Prototyp illustriert eine vorhandene Verknüpfung.

| Detailregister | Was dort zusammensteht |
| --- | --- |
| Überblick | Netto mit gebuchtem und offenem Beitrag, Pfad und DD, PF, Winrate, Expectancy, Stichprobe, aktuelle Auffälligkeiten. |
| Varianten | Strategielinie, Originalsymbol, Timeframe, Revision, Pool, Zustand und Ergebnis. Aufklappen zeigt Originalrevisionen und offene Altverpflichtungen; x/R/w gehört zur ausgewählten Manifestrevision. |
| Risiko | Autoritatives U/C pro Pool, bindende Komponenten, Reservierungen, UNKNOWN und auslaufende Verpflichtungen. Kontomargin separat. |
| Journal | Tradezyklen, offene Positionen, Orders, Deals und verworfene Signale. Vom Trade führt eine Ereignislinie zu Ursprung, Entscheidung und Ausführung. |
| Analyse | Kalendertage nach Buchungszeit, Symbol-/TF-/Strategiebeiträge und Stichprobe. MAE/MFE bei aufgezeichnetem Pfad. |
| Betrieb & Daten | Soll-/Istmanifest, Builds, Hosts, Terminal- und Kontobindung, Beobachtungs-/Empfangszeit, Erfassungslücken, Quellen und Abgleich. Native Konto-Equity steht im eindeutig benannten Kontoscope. |

Direktlinks sollen später Flotte, Register und anwendbaren Scope enthalten. Der Rückweg zur Liste erhält die gültigen Filter. Beim Wechsel von Live, Demo oder Research werden die betroffenen Konten-, Flotten- und Zeitfilter neu abgeglichen. Ein Deep Link ohne verfügbaren Scope zeigt einen erklärenden Zustand mit Rückweg. Die Designvorschau zeigt einen festen Demo-Scope und einen ausgewählten Flottendetailpfad.

## Ein gemeinsames Designsystem

| Element | Vorschlag |
| --- | --- |
| Logo | Originale Tradegazing-SVGs für hell und dunkel aus `TradegazingOfficeDesk/public/brand/`. Originalproportionen und Farben bleiben erhalten. „Office Desk“ erscheint als separates Produktlabel. |
| Farbrollen | Tiefes Navy `#0D1725` und Panel `#142335` für Dunkel, kühles Hell `#F2F7FA` und Weiß für Hell. Teal `#62D6C5` in Dunkel und `#007C72` in Hell für aktive Navigation, Links und Fokus. Auf getönten hellen Flächen verwendet kleiner Text `#00685F`. Das Logo trägt sein Originalteal `#00A693`. Amber und Rot ergänzen eindeutige Statuswörter. |
| Space Glass | Ein zurückhaltender Lichtverlauf im Fleet-Kopf und leicht transparente Übersichtskarten. Dichte Tabellen, Formulare, Belege und Dialoge verwenden deckende Flächen. |
| Typografie | System-Sans für Navigation, Text und Daten. Tabellarische Ziffern, rechtsbündige Beträge in Tabellen, Einheiten direkt an Werten. Überschriften bleiben in beiden Bereichen gleich aufgebaut. |
| Komponenten | Gemeinsame Navigation, Seitenkopf, Karten, Kennzahlen, Filter, Tabellen, Statuschips, Beleglinks und Leerzustände. Statusfarbe wird immer durch Text ergänzt. |
| Bedienung | Sichtbarer Tastaturfokus, eindeutige Linkziele und beschriftete Bedienelemente. 4,5:1 als Ziel für normalen Text und 3:1 für wesentliche Steuerelementgrenzen. Diagrammwerte stehen zusätzlich als Text zur Verfügung. Dunkel-/Hellmodus gilt für das gesamte Desk. |
| Responsive | Desktop mit Navigationsleiste und Vergleichsflächen. Auf schmalen Ansichten stehen Scope, kritische Hinweise und Kennzahlen oben; Karten und Listen laufen einspaltig. Dichte Tabellen erhalten einen beschrifteten Scrollbereich oder eine explizite kompakte Ansicht. |

Im Mission Log erhält die Liste dieselben Karten, Chips und typografischen Rollen wie Fleet Control. Context Core setzt den Schwerpunkt auf Aussage, Quelle und Bestätigungsstatus. Das Bug Board zeigt Risiko und tatsächliche Laufwirkung separat. Legal & Lizenzen zeigt Herkunft, Beleg und Prüfstatus. Projektformulare verwenden dieselben Eingabe- und Feedbackmuster. Bei Versionskonflikten bleibt die Eingabe erhalten und der neuere Stand wird zur Prüfung angeboten.

## Daten und Zustände im Design

| Zustand | Darstellung |
| --- | --- |
| Laden | Platzhalter in Karten und Tabellen. Der ausgewählte Scope bleibt sichtbar. |
| Belegter Leerstand | „Keine geschlossenen Trades im Zeitraum“ oder „Keine passenden Missionen“. Die Ansicht nennt die aktiven Filter. |
| Teilumfang | Explizite Abdeckung wie „2 von 3 Flotten · EUR“. Eine betroffene Flotte bleibt sichtbar. Fehlende Beobachtungen unterbrechen Linien, ein Scopewechsel beginnt ein neues Segment. |
| Veraltet | „Veraltet“ mit letzter Beobachtung und Quelle. Der alte Messwert trägt sein Alter; aktuelle Summen verwenden nur vergleichbare, belegte Daten. |
| Nicht verfügbar / unbekannt | „—“ mit Grund. Erwarteter, unbelegter Wert und fehlende Quellenfähigkeit sind unterscheidbar. UNKNOWN bei Poolrisiko kann weiterhin Kapazität binden. |
| Fehler / Zugriff fehlt | Klarer Hinweis am betroffenen Bereich mit erneutem Abruf, sofern passend. Fehler bei einer Projektaktion erscheinen bei der Aktion, mit erhaltenen Eingaben. |

Produktionsansichten trennen Live, Demo und Research. Summen verwenden kompatible Scopes, Währungen und Beobachtungen. Der Fünf-Minuten-Takt ist der fachliche Ausgangspunkt; sichtbare Beobachtungszeit und Abdeckung beschreiben den tatsächlich belegten Stand. Maximaler Drawdown bleibt als beobachteter PnL-Drawdown mit Methode, Intervall und Einheit gekennzeichnet. U/C ist eine Belegungssumme aus kompatiblen Pools; volle Pools und UNKNOWN behalten ein eigenes Signal. Trading-PnL, erwartete Vergütung, genehmigter Payout, Geldeingang und Buchung sind getrennte Größen. Definitionen und Revisionsregeln stehen im [Fleet-Control-Fachkonzept](FleetControlDeskKonzept.md).

## Vorgeschlagene Umsetzung in drei Etappen

1. **Gemeinsame Oberfläche.** Farbrollen und Komponenten aus der Vorschau in das bestehende Desk übertragen. Startseite, Direktlinks, Tastaturbedienung, helle und dunkle Ansichten sowie schmale Breiten prüfen. Bestehende Projektaktionen bleiben an ihren vorhandenen Schnittstellen.
2. **Lesendes Fleet Control.** Übersicht, Flottendetail, Varianten und Betrieb mit qualifiziertem Datenausschnitt umsetzen. Je Kennzahl Herkunft, Scope, Qualität und belegte Identitäten prüfen. Abnahmefälle sind unter anderem veraltete Quellen, fehlende Kosten, mehrere Einsätze und auslaufende Revisionen.
3. **Journal und Querverweise.** Risiko- und Journaltiefe, Variantenanalysen und belegte Links zum Bug Board ergänzen. Projekt-Writes bleiben bewusste, serverseitig autorisierte Projektaktionen. Die Fleet-Oberfläche dient der Beobachtung.

Die lokale Anwendung zeigt bis zur beauftragten Umsetzung den bisherigen Platzhalter. Die Vorschau ist eine eigenständige HTML-Datei mit lokalen Styles, Script und Original-Logos. Alle Kennzahlen, Zeitpunkte und Projekte darin sind fiktiv. Betriebsdaten, private Zugänge und Freigaben liegen außerhalb der Vorschau. Die fachlichen Voraussetzungen stehen in der [technischen Grundlage](references/FLEET_CONTROL_DESK_TECHNISCHE_GRUNDLAGE.md) und im [Dashboard-Plan](DashboardPlan.md).
