# OFFICE-BUG-0034 · React-Cleanup und portable Browserprüfung

Stand 14.11.2026 · Office-Mission 10

## Fehler und gezielte Änderung

Der M9-Browserablauf verwendete `page.goto('/missions')`. Das beendet das ganze Dokument einschließlich seiner Timer und konnte eine fehlende React-Cleanup-Funktion nicht erkennen. Außerdem waren Playwright und Chrome mit absoluten Benutzer-/Macpfaden eingebunden. Risiko NIEDRIG, konkrete Nutzungshäufigkeit außerhalb dieses Macs unbekannt; kein Cleanup-Laufzeitfehler wurde beobachtet. Die gezielte Nachbesserung ist jetzt ausdrücklich beauftragt.

`tests/fleet-freshness-browser.cjs` verwendet nun eine isolierte Vite-Testseite. Sie importiert die **echte unveränderte FleetControl-Komponente** mit deren Abhängigkeiten. Ein übergeordneter React-State entfernt die Komponente aus dem Renderbaum und mountet sie erneut. Das ursprüngliche Browserdokument bleibt erhalten. Keine Testschalter, zusätzlichen Routen oder geänderten Timer im Produktcode.

Der Browser beobachtet vor dem Mount Timer und Sichtbarkeitslistener. Vor dem Unmount muss er genau einen Nachholtimer, Polltimer, Uhrtimer und Listener sehen. Nach dem Unmount müssen alle vier Ressourcen entfernt sein. Über mehr als zwei normale Pollintervalle und nach einem Sichtbarkeitsereignis darf kein weiterer Overview-Abruf erfolgen. Ein erneuter Mount darf genau einen neuen Ressourcensatz anlegen. Eine zusätzliche Prüfung hält eine Overview-Antwort bis nach dem Unmount zurück, wartet auf deren tatsächliche JSON-Verarbeitung und prüft, dass kein neuer Nachholtimer entsteht.

Vier Negativkontrollen entfernen jeweils genau eine Cleanup-Operation im **Speicher des isolierten Vite-Transforms**: Nachholtimer, Polltimer, Uhrtimer beziehungsweise Sichtbarkeitslistener. Derselbe Cleanup-Test muss dann mit dem exakt erwarteten verbliebenen Ressourcentyp scheitern. Infrastrukturfehler oder andere Assertions zählen nicht als erfolgreicher Negativnachweis. Die Arbeitskopie und der reguläre Office-Prozess werden nicht verändert. Eine veränderte Cleanup-Ankerstelle lässt die Negativkontrolle fehlschlagen.

## Portabler Start

Node.js 24+ und die per Lockdatei gebundenen Entwicklungsabhängigkeiten:

```sh
npm ci --ignore-scripts
node node_modules/playwright/cli.js install chromium
npm run test:fleet-browser
```

`require('playwright')` verwendet die normale Projektauflösung. Standardmäßig startet Playwright sein installiertes Chromium. Alternativ wählt `FLEET_BROWSER_CHANNEL=chrome` einen von Playwright aufgelösten vorhandenen Browser. `FLEET_BROWSER_EXECUTABLE` kann einen ausdrücklich gewählten Browserpfad liefern; Kanal und Pfad dürfen nicht gleichzeitig gesetzt sein. Im Testcode gibt es keinen festen Benutzer-, Cache- oder macOS-Browserpfad. Der Browser muss auf der ausführenden Maschine installiert sein; Betriebssystemabhängigkeiten für Headless-Betrieb sind deren Voraussetzung.

Der Test startet und beendet seinen eigenen HTTP-Server auf einem freien Loopback-Port. Er benötigt weder laufenden Office Desk noch Datenbank, Readergrant, echte VPS-Quelle oder Zugangsdaten. Sitzung und Overview werden ausschließlich mit synthetischen Antworten bedient. Der normale Bericht liegt unter `work/fleet-freshness-browser.json`; `FLEET_BROWSER_REPORT` kann einen anderen Ausgabepfad wählen. Es gibt keine zusätzliche produktive Einrichtung oder Deploymentaktion.

## Tatsächliche Belege und Grenzen

- **Fünf Browserabläufe bestanden:** zeitnahes Nachholen, begrenzte Nachholversuche, echter React-Unmount/Remount mit Ressourcenabbau, verspätete Antwort nach Unmount und sofortiger Sichtbarkeitsabruf nach Pause.
- **Vier Negativkontrollen erkannt**, je fehlender Cleanup-Operation genau die erwartete Assertion. Keine JavaScript-Fehler. [Protokoll](mission-10/browser-checks.json).
- Ausgeführt mit der lokalen Projektabhängigkeit Playwright 1.62.1 und `FLEET_BROWSER_CHANNEL=chrome`, ohne festen Browserpfad. Kein separater Linux-/Windowslauf und kein Default-Chromium-Lauf behauptet.
- Typecheck bestanden. Kein neuer Produktionsbuild oder nativer VPS-Test nötig: Produktcode, Messung, Zugriff und Betrieb bleiben unverändert. Die bisherigen M9-Timing-/Adapterbelege bleiben erhalten.

Das unabhängige Dreamteam-Review bewertet diesen gezielten Nachweisstand. Historische M8-/M9-Entscheidungen bleiben erhalten; eine neue Testabnahme ist keine Gesamtfreigabe des Fleet Control oder seiner Handelskennzahlen.
