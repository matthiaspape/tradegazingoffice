# OFFICE-BUG-0034 · React-Cleanup und portable Browserprüfung

Stand 14.11.2026 · Office-Mission 10

## Fehler und gezielte Änderung

Der M9-Browserablauf verwendete `page.goto('/missions')`. Das beendet das ganze Dokument einschließlich seiner Timer und konnte eine fehlende React-Cleanup-Funktion nicht erkennen. Außerdem waren Playwright und Chrome mit absoluten Benutzer-/Macpfaden eingebunden. Risiko NIEDRIG, konkrete Nutzungshäufigkeit außerhalb dieses Macs unbekannt; kein Cleanup-Laufzeitfehler wurde beobachtet. Die gezielte Nachbesserung ist jetzt ausdrücklich beauftragt.

`tests/fleet-freshness-browser.cjs` verwendet nun eine isolierte Vite-Testseite. Sie importiert die **echte unveränderte FleetControl-Komponente** mit deren Abhängigkeiten. Ein übergeordneter React-State entfernt die Komponente aus dem Renderbaum und mountet sie erneut. Das ursprüngliche Browserdokument bleibt erhalten. Keine Testschalter, zusätzlichen Routen oder geänderten Timer im Produktcode.

Der Browser beobachtet vor dem Mount Timer und Sichtbarkeitslistener. Vor dem Unmount muss er genau einen Nachholtimer, Polltimer, Uhrtimer und Listener sehen. Nach dem Unmount müssen alle vier Ressourcen entfernt sein. Über mehr als zwei normale Pollintervalle und nach einem Sichtbarkeitsereignis darf kein weiterer Overview-Abruf erfolgen. Ein erneuter Mount darf genau einen neuen Ressourcensatz anlegen. Eine zusätzliche Prüfung hält eine Overview-Antwort bis nach dem Unmount zurück und wartet auf deren tatsächliche JSON-Verarbeitung. Kumulative Zähler erfassen jede Nachholtimer-Anlage und jeden Overview-Fetch direkt im Browser; sie verlieren einen zwischenzeitlich abgelaufenen Timer oder einen noch nicht im Node-Routehandler angekommenen Abruf nicht. Vor und nach dem Weiterschalten der Zeit dürfen die Zähler nicht steigen.

Vier Negativkontrollen entfernen jeweils genau eine Cleanup-Operation im **Speicher des isolierten Vite-Transforms**: Nachholtimer, Polltimer, Uhrtimer beziehungsweise Sichtbarkeitslistener. Derselbe Cleanup-Test muss dann mit dem exakt erwarteten verbliebenen Ressourcentyp scheitern. Infrastrukturfehler oder andere Assertions zählen nicht als erfolgreicher Negativnachweis. Die Arbeitskopie und der reguläre Office-Prozess werden nicht verändert. Eine veränderte Cleanup-Ankerstelle lässt die Negativkontrolle fehlschlagen. Zwei weitere Negativkontrollen entfernen den alive-Schutz vor der Retry-Anlage einer verspäteten Antwort beziehungsweise behalten den Sichtbarkeitslistener ohne alive-Schutz vor dem Fetch. Sie müssen genau an der kumulativen Timer- beziehungsweise synchronen Abrufassertion scheitern. Insgesamt sechs wirksame Negativkontrollen.

Die [Playwright-Uhr](https://playwright.dev/docs/clock#consistent-time-and-timers) wird nach dem Laden der noch ungemounteten Testseite mit `pauseAt` angehalten. Ab dann läuft sie nur über explizites `runFor` weiter. Auch eine tatsächliche Verzögerung von 2,1 Sekunden zwischen der Ressourcenprüfung und dem Unmount darf den 2-Sekunden-Retry nicht auslösen; dies wird im echten Cleanup-Fall und in dessen vier Negativkontrollen geprüft.

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

- **Sechs Browserabläufe bestanden:** zeitnahes Nachholen, begrenzte Nachholversuche, echter React-Unmount/Remount mit Ressourcenabbau, verspätete Antwort nach Unmount mit kumulativem Timerzähler, synchron gezählte Abrufversuche nach Unmount und sofortiger Sichtbarkeitsabruf nach Pause.
- **Sechs Negativkontrollen erkannt**, je gezielter Änderung genau die erwartete Assertion. Die vier Cleanup-Varianten bestehen die Nachweisführung auch mit 2,1 Sekunden künstlicher Echtzeitverzögerung. Keine JavaScript-Fehler. [Protokoll](mission-10/browser-checks.json).
- Ausgeführt mit der lokalen Projektabhängigkeit Playwright 1.62.1 und `FLEET_BROWSER_CHANNEL=chrome`, ohne festen Browserpfad. Kein separater Linux-/Windowslauf und kein Default-Chromium-Lauf behauptet.
- Typecheck bestanden. Kein neuer Produktionsbuild oder nativer VPS-Test nötig: Produktcode, Messung, Zugriff und Betrieb bleiben unverändert. Die bisherigen M9-Timing-/Adapterbelege bleiben erhalten.

Dreamteam-Runde 1 `a7009fe6c96b455c910a62575378946d`, Paket `af545e0b26928cbb95f1912578f8a8a906a8f531ff994a9fbae9005819830a1c`: CHANGES_REQUESTED, C2/C3/C4 bestanden, C1 teilweise offen. Der echte Unmount und die vier Cleanup-Negativkontrollen sind bestätigt. Die Nachweislücken M10-001 (abgelaufener verspäteter Retry), M10-002 (Echtzeitfortschritt) und M10-003 (asynchroner Node-Abrufzähler) werden im ausdrücklich beauftragten Testumfang mit kumulativen Zählern, eingefrorener Uhr und zwei weiteren wirksamen Negativkontrollen korrigiert. [Originalfeedback](mission-10/review-round1.json). Die verknüpfte Folgeprüfung bewertet diesen korrigierten gezielten Nachweisstand. Historische M8-/M9-Entscheidungen bleiben erhalten; eine neue Testabnahme ist keine Gesamtfreigabe des Fleet Control oder seiner Handelskennzahlen.
