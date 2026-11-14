# OFFICE-BUG-0035 · parallele Fleet-Browsertests

Stand 14.11.2026 · Office-Mission 12

## Ursache und kleinste Korrektur

Die installierte Vite-Version 8.0.13 behandelt `port: 0` beim Start als falsy und fällt auf 5173 zurück. Zusammen mit `strictPort: true` brach der zweite eigene Testserver deshalb ab. Gesamtrisiko bleibt NIEDRIG, Kollisionswahrscheinlichkeit beim betroffenen Parallelstart HOCH; keine Produkt-/VPS-Daten betroffen. Die gezielte Reparatur ist ausdrücklich beauftragt.

Der gemeinsame `tests/fleet-browser-harness.mjs` startet nun ausdrücklich ab Port 5173 mit `strictPort: false`. Vites vorhandene Bind-/Retry-Logik weicht bei einem belegten Port aus und behandelt auch eine während des Bindens entstandene Belegung. Der Harness verwendet weiterhin ausschließlich `127.0.0.1` und bildet seine URL aus `httpServer.address().port`. Es gibt keine eigene Portprobe mit anschließendem Freigabe-/Neubindungsrennen, keine festen getrennten Ports je Testsuite und kein Beenden fremder Prozesse.

Produktcode, Office-Port 43120, Macbackend, VPS-Dienste und Readerrechte bleiben unverändert. Für diesen Testfix ist weder ein neuer Produktionsbuild noch ein Deployment oder Neustart nötig.

## Tatsächliche Prüfungen

- **Regression vor Korrektur rot:** Zwei gleichzeitig gestartete Harnesses bei absichtlich belegtem Port 5173 scheiterten im Stand `96818bf` beide mit „Port 5173 is already in use“; erwartet waren null fehlgeschlagene Starts. [Beleg](reproduction.json).
- **Gezielter Node-Test bestanden:** Derselbe belegte Standardport blieb während des Starts reserviert. Zwei Harnesses banden gleichzeitig unterschiedliche Ports, lieferten ihre Fixture erfolgreich und konnten unabhängig beendet werden. Der erste Portbesitzer blieb unverändert erreichbar. [Portbeleg](port-check.json), [Test](../../tests/fleet-harness.test.mjs).
- **Beide tatsächlichen CLI-Browserläufe gleichzeitig bestanden:** Status auf 5174, Cleanup auf 5173; zeitliche Überlappung 5,740 Sekunden. 14 Statusfälle, sechs Cleanup-Abläufe und sechs wirksam erkannte Negativkontrollen, keine JavaScript-Fehler. Die Berichte speichern Start-/Endzeit und tatsächlich gebundenen Origin. [Zusammenführung](parallel-checks.json), [Status](status-checks.json), [Cleanup](cleanup-checks.json).

Der Node-Regressionslauf und die beiden Browserläufe wurden gemeinsam angestoßen. Der kurze Node-Test meldete beim sofortigen Schließen eines Servers einen Hinweis auf den dadurch abgebrochenen Hintergrund-Dependency-Scan; sein Ergebnis war erfolgreich. Beide vollständigen Browserläufe endeten mit Exit 0 und ohne Seitenfehler. Kein Produktfehler oder neuer fachlicher Befund wird daraus abgeleitet.

Echte React-Komponente, synthetische API und angehaltene Playwright-Uhr bleiben erhalten. Tatsächlich geprüft: lokale Projektabhängigkeit Playwright und Browserkanal `chrome`; kein Linux-/Windows-/Default-Chromium-Lauf behauptet. Unveränderte Typecheck-/Buildnachweise aus Mission 11 bleiben erhalten; keine erneute Prüfung dieser unveränderten Produktbereiche.

## Anwendung und Grenzen

Die bestehenden Befehle dürfen gleichzeitig in zwei Terminals laufen:

```sh
FLEET_BROWSER_CHANNEL=chrome npm run test:fleet-status
```

```sh
FLEET_BROWSER_CHANNEL=chrome npm run test:fleet-browser
```

Ohne Kanal oder eigenen Executable verwendet der Test wie bisher das installierte Playwright-Chromium. Der neue Port-Regressionsfall ist über `node --test tests/fleet-harness.test.mjs` ausführbar und Teil der vorhandenen Node-Testauswahl. Ist 5173 bereits fremd belegt, beendet oder verändert der Test dessen Besitzer nicht; er führt dann keinen Zugriff auf diesen fremden Dienst aus. Bei eigener Reservierung wird zusätzlich deren Fortbestehen geprüft.

Browser und Testserver werden durch die jeweiligen `finally`-Blöcke beendet. Keine Testdatenbank, Authentisierung oder echte VPS-Quelle nötig. Standardberichte liegen unter `work/`; `FLEET_HARNESS_REPORT`, `FLEET_STATUS_REPORT` und `FLEET_BROWSER_REPORT` können getrennte Ausgabepfade wählen. Alte Missionsberichte und tatsächliche Reviewentscheidungen bleiben historisch erhalten. Das unabhängige Dreamteam-Review bewertet den gezielten M12-Stand.
