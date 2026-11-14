# Gemeinsames Fleet Control · Prüfung und Review

Stand 14.11.2026 · Office-Mission 7 · Konzept und lokale Designvorschau

## Entwicklerprüfung

- JavaScript-Syntaxprüfung mit der vorhandenen Node-Runtime bestanden.
- `design/fleet-control-unified/check-preview.cjs`: 36 Ansichtsprüfungen in lokalem Headless Chrome bestanden, je Übersicht, beide VPS- und alle drei Flottendetails bei 1440, 390 und 320 px in Hell/Dunkel. Original-Logo geladen, dauerhafter Demohinweis sichtbar, kein äußerer horizontaler Überlauf, keine JavaScript-Fehler und keine HTTP(S)-Anfragen.
- Flottenkarte → Flottendetail → VPS-Name → VPS-Detail sowie Rückweg, Tastatur-Enter, Browserverlauf, Direktlink/Reload, unbekannte Route und EA-loser Zustand bei allen drei Breiten geprüft. Der EA-lose Zustand erhält Hostdaten und enthält keine erfundenen Flotten.
- Desktop- und mobile Übersicht sowie VPS- und Flottendetail visuell anhand der erzeugten Screenshots geprüft. Keine vollständige manuelle Barrierefreiheitsabnahme; keine neue axe-Prüfung behauptet.
- Der erste Interaktionslauf las die Überschrift vor dem asynchronen Hashwechsel. Der Prüfablauf wartet jetzt gezielt auf das Navigationsziel; der anschließende gesamte neue Vorschaulauf bestand. Kein belegter Produktfehler daraus.

[Maschinenlesbare Ergebnisse](../design/fleet-control-unified/checks.json) · [Prüfablauf](../design/fleet-control-unified/check-preview.cjs) · [Desktop](../design/fleet-control-unified/desktop-preview.png) · [Mobil](../design/fleet-control-unified/mobile-preview.png) · [VPS-Detail](../design/fleet-control-unified/vps-detail-preview.png) · [Flottendetail](../design/fleet-control-unified/fleet-detail-preview.png)

Die Prüfung betrifft ausschließlich das neue Konzeptartefakt. Akzeptierte unveränderte M6-/M650-Belege werden übernommen. Keine neue Runtime-/MT5-/Installationsabnahme und keine Änderung laufender Dienste.

## Unabhängiges Dreamteam-Review

Unabhängiger Reviewer Claude über [Dreamteam](plugin://dreamteam), Entwickler Codex. Review-/Schleifen-ID `044f53a69d2c4f23a5abf64babdb08a8`, Modell laut Runtime `claude-opus-5-5`, Effort high. Paket-SHA256 `d88688ca8884a069688f8412a7688cdd125499f1464a33e87267aad9284da24d`, Konzept-/Vorschaucommit `5d890be`. Anfrage privat unter `.office-desk-data/dreamteam/mission-7-round1.json` erhalten. [Vollständiges fachliches Feedback](../design/fleet-control-unified/dreamteam-feedback.json).

Entscheidung **CHANGES_REQUESTED · 3 von 5 Kriterien bestanden**, kein P0/P1- beziehungsweise hoher Befund. Der Reviewer erhielt Textquellen, nicht die PNG-Bildinhalte, und führte keine Projektbefehle oder Tests aus. Das Review ist eine Bewertung des eingereichten Konzept-/Vorschaupakets, keine Betriebsprüfung der bestehenden M6-/M650-Implementierungen.

| Kriterium | Unabhängige Bewertung |
| --- | --- |
| C1 · gemeinsames Zielbild, Office-Verantwortung, kleinster Integrationsweg | Bestanden. |
| C2 · VPS-/Flottenkarten, Pflichtfelder und Bedienwege Desktop/Mobil | Bestanden; Screenreader-Befund bleibt gesondert offen. |
| C3 · VPS-/Flottendetails und fachliche Anschlussstellen | Bestanden. |
| C4 · Quellenmapping, Kennzahlen und Zustandsvertrag | Offen wegen der unten genannten Health-/Frische-/Verlaufdetails. Konto-/Flottentrennung, Tagesnetto, Unrealized und Statusgrundsatz bestätigt. |
| C5 · tatsächliche Aufbewahrung, EA-loser Zustand, Autorisierung und Grenzen | Offen wegen zusätzlicher Health-Budgetgrenze und Flottendirektlinks im EA-losen Vorschauzustand. |

## Offene Befunde und Entscheidung

Vor Anlage wurde nach verwandten Office-Bugs gesucht. Der vorhandene OFFICE-BUG-0015 betrifft die andere Navigations-/Gruppierungsfrage aus Mission 5; er wurde nicht als derselbe Kartenlinkfehler behandelt. Neue Befunde sind im Office-Bug-Board erfasst:

| Office-Bug / Dreamteam | Auswirkung | Wahrscheinlichkeit / Gesamtrisiko |
| --- | --- | --- |
| **OFFICE-BUG-0022 / M7-001** | Das `aria-label` des Kartenlinks kann die Ausgabe von Status und Kennzahlen für Screenreader verdecken. | Konkrete Hilfstechnikhäufigkeit ungeprüft/unbekannt; **MITTEL**. |
| **OFFICE-BUG-0023 / M7-002** | Health-Aufbewahrung weicht von Handelsoriginalen ab: Health wird nach Beobachtungs-Slot und zusätzlich über `health.max_bytes` gekürzt. Sieben Tage Abdeckung sind nicht garantiert. Wiederholtes Kürzen nach Budgetüberschreitung ist ein Quelltextverdacht ohne neue native Reproduktion. | Native Häufigkeit unbekannt; **MITTEL**. Das Konzept ist noch kein vollständiger Health-Aufbewahrungsvertrag. |
| **OFFICE-BUG-0024 / M7-003** | Mapping für RAM-/Storage-Verläufe legt Endstand gegenüber Fensterspitze nicht eindeutig fest. | Wirkung hängt von späterer Umsetzung ab, Häufigkeit unbekannt; **NIEDRIG**. |
| **OFFICE-BUG-0025 / M7-004** | Mehrere Collector-Sessions im selben Slot können doppelte Kurvenpunkte oder die Auswahl eines älteren Samples verursachen. Adapterregel zur jüngsten Beobachtung fehlt. | Native Häufigkeit unbekannt; **NIEDRIG** im Konzeptauftrag. |
| **OFFICE-BUG-0026 / M7-005** | EA-Frische muss an `fresh_seconds`, Export- und Abrufintervall gebunden werden; pauschal 600 Sekunden können falsche Veraltungsanzeigen erzeugen. | Native Häufigkeit unbekannt; **NIEDRIG**. |
| **OFFICE-BUG-0027 / M7-006** | Die fiktive RAM-Warnung ist nicht an die konkrete M650-`attention`-Regel gebunden. | Beispiel-/Umsetzungswirkung, native Häufigkeit unbekannt; **NIEDRIG**. |
| **OFFICE-BUG-0028 / M7-007** | Im EA-losen Vorschauzustand zeigen direkte Flottenrouten weiterhin Demo-Daten; der Zustand überlebt keinen Reload. Übersicht und VPS-Leerzustand funktionieren. | Enger Vorschaupfad deterministisch, deshalb dort hoch; Gesamtrisiko **NIEDRIG**, keine native Datenquelle betroffen. |
| **OFFICE-BUG-0029 / M7-008** | Office-Timeout/letzter Speicherstand muss gegen die bis zu 30 Sekunden dauernde Python-Abrufsperre konkretisiert werden. Sonst ist trotz vorhandenem Altstand eine leere Fehleransicht möglich. | Native Häufigkeit unbekannt; **NIEDRIG** im Konzeptauftrag. |

**Behandlung:** Sämtliche Befunde bleiben `ZURUECKGESTELLT`. Sie blockieren die Lieferung des gemeinsamen Konzeptentwurfs nicht. Nach der ausdrücklichen Nutzerpriorisierung werden nicht hohe, nicht blockierende Punkte dokumentiert; es gibt keine weitere Reparatur-/Reviewserie für ein APPROVED-Etikett. Die Empfehlungen stehen vollständig im Feedback und sind bei einer gesondert autorisierten Umsetzung gezielt zu berücksichtigen. Die tatsächliche Entscheidung bleibt CHANGES_REQUESTED; keine vollständige fachliche Abnahme behauptet.

Der Konzeptauftrag wird mit diesen Grenzen administrativ abgeschlossen. Die Bugkontexte erhalten `KONTEXT_BEENDET`, ihre Befunde bleiben offen. Abschluss-/Metadatenänderungen, Context-Core-Verweise und Push eröffnen keine neue Prüfserie. Es wurden keine Dienste, Produktions-APIs, MT5-Instanzen oder historischen Originale verändert.
