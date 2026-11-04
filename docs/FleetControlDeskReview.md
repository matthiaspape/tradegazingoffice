# Fleet Control Desk – Review und Prüfbelege

Stand: 04.11.2026. Gegenstand ist der Produktentwurf, keine produktive Integration.

## Unabhängiges Dreamteam-Review

- Plugin: [Dreamteam](plugin://dreamteam). Entwickler Codex, Reviewer Claude, Modell laut Runtime `claude-opus-5-5`, Effort `high`.
- Review / Mission: `01ce3d1889314561b359628dafff6326`.
- Request-Key: `office-fleet-control-desk-konzept-20261104-r1`.
- Paket-SHA256: `eb094192043163877c940bd5dcb5b8b3c79fa2fe9966f0870e2201be779e6d7c`.
- Übergeben: Konzept Version 0.1 und vollständiger Text der technischen Grundlage. Der UI-Draft und die externen Webseiten waren nicht Bestandteil der unabhängigen Prüfung.
- Entscheidung: **CHANGES_REQUESTED**. C5 bestanden; C1–C4 wegen fachlicher Präzisierungsbedarfe nicht bestanden. Keine unabhängigen Laufzeit-, API- oder MT5-Tests.

Der unabhängige Befund betrifft Lücken eines noch nicht implementierten Konzepts. Eintrittswahrscheinlichkeit in einer späteren Umsetzung ist unbekannt; es gibt keinen belegten Fehler eines laufenden Systems. Kein Befund begründet einen Eingriff in M561/M563, Researchquellen oder produktive Flotten. Die folgende Einschätzung erfolgt vor den Konzeptänderungen. Der aktuelle Auftrag erlaubt die Ausarbeitung des Konzepts; dafür werden keine Software-Reparaturmissionen eröffnet.

## Befunde und Behandlung

| ID | Wirkung / betroffene Komponente | Risiko im aktuellen Konzeptauftrag / Wahrscheinlichkeit | Entscheidung |
| --- | --- | --- | --- |
| FCD-001 | Mehrere Kontoeinsätze können falsche Summen/Revisionsanzeigen erzeugen; Identitäten und Aggregation. | MITTEL; späterer Interpretationsfehler plausibel, noch keine Datenberechnung. | Einsatz-/Run-Scope und Deduplikationsregel im Konzept präzisieren. |
| FCD-002 | Variantenlinie, Revision und Pool könnten Historie vermischen; Datenmodell. | MITTEL; Umsetzung noch offen. | Stabile Linie, Originalrevision, Pool und manifestgebundene x/R/w unterscheiden. |
| FCD-003 | Undefinierte Tradezyklen verändern PF/Winrate; Statistikvertrag. | MITTEL; konkrete spätere Gruppierung noch unbekannt. | Versionierte Gruppierung, Abschlusszeit, Teilabgänge und Tester-Endschließung definieren. |
| FCD-004 | Zeitlich inkonsistente Buchung/offene Bewertung kann PnL doppelt zählen; Zeitreihen. | MITTEL; keine produktive Berechnung vorhanden. | Konsistenz-Watermark, P(t1)−P(t0), Grenzregel und Swapabgrenzung ergänzen. |
| FCD-005 | Asynchrone Summen, Cashflows oder Scopewechsel verfälschen DD; Analyse. | MITTEL; spätere Eintrittswahrscheinlichkeit unbekannt. | Raster/Segmentierung und DD-Basis im Konzept präzisieren; keine Berechnungsengine entwickeln. |
| FCD-006 | Gemeinsame Kontomargin und Fremdanteile brauchen eine explizite Ansicht. | MITTEL; tatsächliche Mehrflottenkonten noch nicht angebunden. | Konto-/Einsatzansicht spezifizieren; im Draft lesende Kontoperspektive ergänzen. |
| FCD-007 | Niedrige Summenauslastung kann einen vollen Pool verdecken. | MITTEL; im Nova-Beispiel unmittelbar anschaulich. | Engpass und nicht verleihbare Kapazität in Konzept/Karte ausdrücklich nennen. |
| FCD-008 | UNKNOWN, Aufnahme und Altverpflichtungen fehlen teilweise in Kurzstatus. | MITTEL; keine aktive Überwachung vorhanden. | Zustände und Mischstatus präzisieren; wichtigste Kurzsignale im Draft zeigen. |
| FCD-009 | Unbekannte Kosten könnten vollständiges Netto vortäuschen. | MITTEL; spätere Datenfähigkeiten unbekannt. | Abhängigkeits-/Qualitätsregel und unzugeordnete Kosten ergänzen. |
| FCD-010 | Datenartenliste lässt Cashflow-/Control-/Healthdaten aus. | NIEDRIG; keine Adapter auf Basis dieser Liste vorhanden. | Liste vervollständigen, lesende Kontrollhistorie benennen. |
| FCD-011 | Aggregierte Ausführungsqualität fehlt als eigener Bereich. | MITTEL; schleichende Ausführungsprobleme könnten später schwerer auffallen, Wahrscheinlichkeit unbekannt. | **Zurückgestellt:** Analysepaket mit Ablehnungen, Latenz und Slippage erst bei gelieferten Originaldaten. Einzelereignisse bleiben im Journal. Kein Hindernis für den Designentwurf. |
| FCD-012 | Datenabriss mit offenem Risiko kann zu niedrig priorisiert werden. | MITTEL; reine Anzeigeentscheidung. | Unbekannte Verwaltung bei offenem Risiko und Journalausfall nach oben priorisieren. |
| FCD-013 | Ende-zu-Ende-Latenz und gesampelte MAE/MFE bleiben erklärungsbedürftig. | NIEDRIG im Draft; tatsächliche Latenz unbekannt. | Beobachtungsalter und Publikations-/Transferanteile im Konzept nennen; SLA bleibt für Datenanschluss offen. |
| FCD-014 | Besondere Zielregeln und Positionsfelder fehlen im Detailkatalog. | NIEDRIG im Konzept; tatsächliche W1-Einsätze unbekannt. | Feldkatalog und eigene Zielregel ergänzen; Draft zeigt ohne Originalbeleg „—“. |

Alle IDs bleiben als Konzeptreviewbefunde erhalten. Ein Software-Bug-Board für Office ist im vorhandenen Projektstand nicht eingerichtet. Soweit diese Punkte beim späteren Anschluss tatsächliche Softwarefehler belegen, gilt **Boardübernahme ausstehend**; diese Akte erhält die vollständige Zuordnung. Historische BUG-IDs aus der technischen Grundlage bleiben in deren bestehendem Board und werden nicht neu angelegt.

Die Präzisierungen sind als Entwicklerantwort in Konzeptversion 0.2 eingearbeitet; FCD-011 bleibt als späteres Analysepaket offen. Es wurde keine neue Gesamtprüfung allein zur Vergabe eines APPROVED-Etiketts eröffnet. Der geänderte Endstand hat **keine neue unabhängige Abnahme**; die oben genannte historische Entscheidung bleibt unverändert.

## Prüfung des grafischen Drafts

Eigene Entwicklerprüfung mit Playwright in headless Google Chrome; keine vom Dreamteam ausgeführten Tests:

- 39 Ansichtsprüfungen bestanden: Übersicht, Demozeitraumwechsel, alle sechs Register jeder der vier Flotten, globale Seiten und mobile Ansichten mit 736, 390 und 320 Pixel Fensterbreite. Desktopfenster: 1056 Pixel; Produktoberfläche: 1024 Pixel.
- Varianten- und Positionsdetails per echtem Buttonklick geöffnet; Nova-UNKNOWN und Vega-Veraltung sichtbar; Demo-Gesamtergebnis 12.860 € und Siebentages-Veränderung 4.260 € anhand der Beispielreihe geprüft.
- Keine JavaScript-Laufzeitfehler. Keine äußere horizontale Überbreite in den geprüften Ansichten; Chartpfade vorhanden; Produktschrift mindestens 11px. Tabellen verwenden bei Bedarf einen eigenen horizontalen Scrollbereich.
- Desktopübersicht, Orion-Detail und mobile Nova-Risikoansicht als Screenshots gerendert und visuell geprüft. Eine schnelle Änderung der Fensterbreite während gescrollter Preview führte zunächst zu nicht zugestellten Testklicks; getrennte frische Browserseiten je Breite funktionieren. Daraus ist kein Fehler der Produktnavigation belegt.
- Lokale Dokumentlinks geprüft, `git diff --check` ohne Befund. Keine Integrations-/MT5-Tests und kein Test produktiver Daten.

## Zugehörige Entwurfsdateien

Die Designstudie und ihre Belege sind im Repository enthalten:

- [HTML-Vorschau](../design/fleet-control-desk/index.html) und [editierbare Entwurfsquelle](../design/fleet-control-desk/fleet-control-desk.html).
- [Desktopübersicht](../design/fleet-control-desk/desktop-preview.png), [Flottendetail](../design/fleet-control-desk/fleet-detail-preview.png), [mobile Risikoansicht](../design/fleet-control-desk/mobile-preview.png).
- [Browser-Prüfergebnisse](../design/fleet-control-desk/browser-checks.json) und [unabhängige Reviewentscheidung mit vollständigen Befunden](../design/fleet-control-desk/dreamteam-review.json). Operative Worker-/Prozessmetadaten sind aus dem exportierten Feedback entfernt.

Die HTML-Quelldatei ist ein Inline-Entwurf; `index.html` enthält dessen für den Browser verpackte Vorschau. Das neue Repository `matthiaspape/tradegazingoffice` speichert auf Nutzerauftrag den ersten Konzeptstand auf `main`. Die bislang extern gespeicherten Designartefakte und bereinigten Belege werden dabei mit aufgenommen. Vorhandene fachliche Prüfungen werden wiederverwendet; die Übertragung eröffnet keine neue Reviewserie. Keine Produktionsprozesse gestartet oder Researchquellen verändert.

## Nachtrag zur Projektverwaltung

Mit dem Folgeauftrag vom 04.11.2026 ist ein eigenes Office-Projektmanagement samt Bug Board eingerichtet. Der weiterhin zurückgestellte Konzeptbefund **FCD-011** ist dort unter **OFFICE-BUG-0003** erfasst (MITTEL, Wahrscheinlichkeit unbekannt; spätere aggregierte Ausführungsanalyse benötigt passende Originaldaten). Seine frühere Beschreibung und die historische Reviewentscheidung bleiben erhalten. Die neue Boardablage ist keine Reparatur und keine neue Abnahme des Trading-Journal-Konzepts.
