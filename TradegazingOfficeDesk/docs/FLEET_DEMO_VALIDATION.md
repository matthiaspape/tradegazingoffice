# Fleet Control im Tradegazing Office Desk

Stand 05.11.2026 · Office-Mission 6 · Implementierung `cf6a6af`

## Umfang

- Fleet Control ist Startseite unter `/` und über `/controlling/fleet-control` erreichbar. Nova, Vega und Orion haben eigene Detailseiten mit Strategien, Symbolen, Timeframes, Revisionen, Pools und Quellen.
- Der gemeinsame Rahmen mit Original-Logo, Teal/Navy, responsiver Navigation und Hell-/Dunkelmodus gilt für Controlling und die vier bestehenden Projektbereiche.
- Die Daten sind feste, lesende Beispiele. Trading-Netto, beobachteter Drawdown und Stoprisiko zeigen jeweils 2 von 3 Flotten. Die Aufmerksamkeitsprüfung berücksichtigt den Quellenstatus aller drei Flotten. Orions Kennzahlen zeigen 0 von 1 aktuellem Einsatz und den historischen Messwert separat. Demo-Zeitpunkte sind eingefroren.
- Fleet-Seiten lesen die Beispiele aus dem Code. Projektformulare verwenden ihre vorhandenen Schnittstellen. Für echte Telemetrie, Journal und belegte Übergänge aus Fleet Control ins Bug Board gelten die späteren Ausbaustufen des [UI/UX-Konzepts](../../docs/TradegazingOfficeDeskUX.md).

## Prüfung

| Prüfung | Ergebnis |
| --- | --- |
| `./desk typecheck`, `./desk build` | Bestanden. Build mit dem bekannten Middleware-Hinweis `OFFICE-BUG-0002`. |
| `./desk test` | 34 von 34 bestanden. |
| Lokaler Playwright-/Chrome-Lauf | 1440, 1024, 820, 640, 390 und 320 px. Menüfolge, Logo-Rückweg, mobile Tastaturbedienung, Moduswechsel, direkte Datenabdeckung, alle Flottendetails, unbekannte Route mit 404 und vorhandene Projektseiten geprüft. Kein horizontaler Seitenüberlauf und keine JavaScript-Fehler. Fleet-Seiten erzeugten keine Fach-API-Anfragen. |
| Projektformulare | Mission, Wissen, Bug und Lizenz im lokalen Browser geöffnet. Auf der laufenden Instanz erfolgte diese Prüfung lesend. |
| Isolierter schreibender Browser-Smoke | `tests/browser-smoke.py` bestanden bei 1280, 390 und 320 px. Mission angelegt, geändert und nach Reload gelesen. Bug angelegt, Bewertung und Vorkommen ergänzt. REST/MCP-Abgleich und Zugriffsschutz bestanden. Ausgeführt auf einer Kopie von `cf6a6af` mit dem separaten Loopback-Port 43121 und neuem Datenverzeichnis. Keine QA-Mission und kein QA-Bug in der laufenden Datenbank. Separater Lauf zusätzlich zu `./desk test`. |
| axe-core | 36 Kombinationen aus Fleet-Startseite, Nova und Orion, sechs Breiten und zwei Farbmodi ohne automatisch erkannte Verstöße. |

Die frühere statische Vorschau bleibt ein eigener Prüfgegenstand. Im laufenden Desk sind Teilabdeckung, Orion-Historie und Nova-Drawdown sichtbar, das Chart benennt seine Segmente und der Demo-Hinweis bleibt beim Scrollen sichtbar. Die damalige Reviewentscheidung und die Tickets `OFFICE-BUG-0013` bis `OFFICE-BUG-0018` sind in ihrem historischen Kontext dokumentiert. [Befunde zur statischen Vorschau](../../docs/TradegazingOfficeDeskUX.md#dreamteam-review-und-offene-punkte)

[Screenshot des laufenden Desk](screenshots/fleet-control-demo.png)

## Dreamteam-Review

Claude prüfte den Diff von `cf6a6af`. Review `6e1f2a29217b454a98c91bbb7f53f3da`, Paket-SHA256 `8a0a695fcace8c5d7c2f6c9e9423ea54a5a14329acf9d0f1aefb884b998df62f`. Entscheidung **CHANGES_REQUESTED**. C1 gemeinsamer Rahmen, C2 fiktive Fleet-Demo und C3 Datenabdeckung bestanden. Für C4 fehlte im eingereichten Paket der schreibende Browser-Smoke. Der oben dokumentierte isolierte Lauf erbrachte den Beleg nachträglich. Das Review bewertet das ursprüngliche Paket. Claude hat die Entwicklertests nicht selbst ausgeführt.

| Bug Board | Befund und Auswirkung | Wahrscheinlichkeit | Gesamtrisiko |
| --- | --- | --- | --- |
| OFFICE-BUG-0019 | Falsche Pluralform in „2 von 2 Einsätze“. Der Zahlenwert ist korrekt. | Hoch bei Nova | Niedrig |
| OFFICE-BUG-0020 | Der Detailhinweis zur Poolgrenze hängt an UNKNOWN. Bei geänderten Beispieldaten könnte er einen falschen Zustand anzeigen. In den aktuellen Beispielen ist die Anzeige konsistent. | Niedrig | Niedrig |
| OFFICE-BUG-0021 | Bei mittleren Fensterbreiten können Missionstitel wegen der schmalen Spalte häufiger umbrechen. Der Editor bleibt bedienbar. | Mittel | Niedrig |

Die Befunde bleiben wegen ihrer geringen Auswirkungen zurückgestellt. Die Fleet-Demo und die bestehenden Projektabläufe sind im geprüften Umfang nutzbar.
