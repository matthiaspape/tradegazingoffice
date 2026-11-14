# Fleet Control · OFFICE-BUG-0030, 0032 und 0033

Stand 14.11.2026 · Office-Mission 11

Nachtrag: Der hier historisch zurückgestellte Portkonflikt OFFICE-BUG-0035 wird im gesonderten Nutzerauftrag [Mission 12](../mission-12/VALIDATION.md) behoben; die Browserläufe sind dort parallel geprüft. Die damaligen M11-Prüfungen und Reviewentscheidung bleiben erhalten.

## Auftrag und Änderung

Die drei zuvor niedrigen und zurückgestellten M8-Befunde werden auf ausdrücklichen Nutzerauftrag behoben. Ihre Einstufung bleibt NIEDRIG; keine künstliche Hochstufung. Der Demofall tritt im alten Stand sicher auf, die native Nutzungshäufigkeit langer Sitzungen und Details bleibt unbekannt.

- **OFFICE-BUG-0030:** Der letzte Punkt jeder ausdrücklich fiktiven Equity-Reihe übernimmt jetzt den erklärten Konto-Equitystring exakt. Die dekorative Bewegung davor bleibt erhalten. Das gilt auch für die veraltete Demo-Flotte; deren Veraltung bleibt sichtbar. Native Geldwerte und Berechnungen ändern sich nicht.
- **OFFICE-BUG-0032:** Eine Overview-Antwort mit HTTP 401 wird als abgelaufene Office-Sitzung angezeigt. Ein Button bietet den bewussten Seitenreload an. Der laufende Client setzt seine Sitzungsbereitschaft zurück und startet weder weitere erfolglose Overview-Abrufe noch eine automatische neue Sitzung. Letzte Werte und Originalmesszeiten bleiben erhalten, aber gelten nicht mehr als aktuell. Die Verbindung wird bei einem lokalen Zugriffsfehler ausdrücklich als nicht geprüft gezeigt. Die zwölfstündige Cookie-Regel bleibt unverändert. Andere Quellen-/HTTP-Fehler bleiben davon getrennt und können sich beim regulären Poll erholen.
- **OFFICE-BUG-0033:** Beide Detailköpfe zeigen die mit den Karten gemeinsam verwendeten Frischechips, die ausgewählte Datenquelle, den expliziten VPS-Verbindungszustand und den letzten Backendabruf. Health-/Kontofrische und Verbindung sind getrennt: Alte Messwerte können bei aktueller Verbindung veraltet sein. CURRENT, STALE und UNAVAILABLE werden als aktuell, veraltet und nicht verfügbar ausgegeben. Demo-Verbindungsangaben sind ausdrücklich fiktiv. Ein lokaler Office-Sitzungsfehler wird nicht als belegter VPS-Ausfall behauptet.

Produktänderung ausschließlich in `FleetControl.tsx` und `unified-demo.ts`; kein Eingriff in Auth-Regeln, native Berechnung, Readerrechte, Macbackend, Windows-Dienste oder Handels-/EA-Betrieb.

## Gezielte Nachweise

Vor der Reparatur scheiterten die zwölf zunächst formulierten Browserfälle am alten Stand `5f9a97a`, ohne JavaScript-Fehler. Beispiele für alle drei Befunde: [Reproduktion](reproduction.json). Anschließend wurden zwei Demo-Detailfälle ergänzt.

- **14 Browserfälle bestanden, 0 Fehler:** identische Endwerte aller drei Demokurven, beide Demo-Details, beide nativen Details mit CURRENT/CURRENT, STALE/CURRENT, STALE/STALE und UNAVAILABLE/UNAVAILABLE; Sitzungsablauf nach vorherigem Datenstand mit unveränderten Originalzeiten, gestoppten Abrufen und bewusstem Reload; erster Overview401 ohne Demofallback; getrennte Behandlung und reguläre Erholung eines 503-Quellenfehlers. [Protokoll](browser-checks.json).
- **Cleanup-Regressionsprüfung bestanden:** sechs Abläufe und sechs exakt erkannte Negativkontrollen aus Mission 10 gegen die geänderte echte Komponente. [Protokoll](cleanup-checks.json).
- **Typecheck und Produktionsbuild bestanden.** Der bekannte Middleware-Hinweis bleibt unverändert. Kein weiterer Adapter-/VPS-/EA-Test für unveränderte Bereiche.

Die Browserfälle laufen auf der vorhandenen isolierten React-Testseite mit synthetischen API-Antworten und angehaltener Playwright-Uhr. Die Fixture übergibt für Details dieselben Props wie die App-Routen. Keine native zwölfstündige Warte- oder Plattform-Gesamtprüfung behauptet. Playwright-Projektabhängigkeit und Browserkanal `chrome`; kein Test mit Default-Chromium, Windows oder Linux behauptet. Jeder Test schließt eigene Seiten, Browser und Vite-Server; keine Testdatenbank oder produktive Authentisierung nötig.

Seriell im Deskordner ausführen:

```sh
FLEET_BROWSER_CHANNEL=chrome npm run test:fleet-status
FLEET_BROWSER_CHANNEL=chrome npm run test:fleet-browser
```

Standardberichte landen unter `work/`; `FLEET_STATUS_REPORT` und `FLEET_BROWSER_REPORT` können andere Ausgabepfade festlegen. Einrichtung der Browserabhängigkeit: [Testbetrieb](../FLEET_CLEANUP_TEST.md).

## Nebenbefund und Grenze

**OFFICE-BUG-0035, NIEDRIG, Wahrscheinlichkeit HOCH beim parallelen Start:** Zwei eigene Vite-Testserver mit `port: 0` kollidierten tatsächlich auf 5173. Der Statuslauf bestand, der gleichzeitig gestartete Cleanup-Lauf brach vor der Prüfung mit „Port 5173 is already in use“ ab. Der anschließende serielle Cleanup-Lauf bestand vollständig. Der Fehler betrifft den parallelen Teststart, keine Produkt- oder VPS-Daten. Die sichere serielle Fortsetzung ist vorhanden; die Portverwaltung wird in dieser Mission bewusst nicht repariert. Frühere M10-Fachnachweise bleiben erhalten; paralleler Betrieb ist durch sie nicht belegt.

## Unabhängige Abnahme und Aktivierung

Dreamteam-Claude-Review `b22dccdec01d4c6f9a1fc5774e6296ad`, Paket `ed7a566d946953d3ad1280c5cfeb0bc8ed6b75b8de3f06ae2e364625f66b3492`: **APPROVED, C1–C5 bestanden**, keine offenen Reviewbefunde. [Originalfeedback](review-round1.json). Die Abnahme gilt für das eingereichte gezielte M11-Paket; Claude hat keine Tests selbst ausgeführt. Historische M8-/M9-/M10-Entscheidungen und nicht geprüfte Bereiche bleiben erhalten.

Quellstand `75367ea` wurde am 14.11.2026 innerhalb der bereits ausdrücklich erteilten Office-Freigabe regulär auf 43120 gestartet. Erster authentisierter Betriebsabruf um 15:59:08 UTC: **HTTP 200, NATIVE, ein CURRENT-Host, null Flotten, refreshing=false**. EA-Exporte fehlen weiterhin. Private Betriebsquittung `.office-desk-data/dreamteam/mission-11-activation.json`. Vorhandener Mac-App-Einstieg bleibt auf 43120; Office-Daten, Macbackend8766 und VPS-/MT5-Dienste erhalten. Keine neuen Readerrechte, keine weitere Dienst-/MT5-Einrichtung.

OFFICE-BUG-0030/0032/0033 sind gezielt behoben. OFFICE-BUG-0035 blieb im M11-Abschluss niedrig zurückgestellt; die damals verwendete sichere Fortsetzung waren serielle Tests. Der aktuelle Nachtrag aus Mission 12 ist oben verlinkt. Eigene Testressourcen sind beendet; benötigte Prüf-/Reviewbelege erhalten. Abschluss und Kontextpflege verwenden die erfolgreichen Belege ohne zusätzliche Rücklese-/Gesamtprüfserie.
