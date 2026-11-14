# Fleet Control · gemeinsame Office-Implementierung

Stand 14.11.2026 · Office-Mission 8 · Implementierung mit M6-/M650-Bausteinen

**Historische M8-Bewertung:** Dreamteam CHANGES_REQUESTED, C1/C2/C3/C5 bestanden, C4 wegen der verzögerten Cache-/Frischekette offen. OFFICE-BUG-0031 ist auf ausdrücklichen Auftrag in Mission 9 gezielt behoben und regulär aktiviert; [Timingänderung und eigener Prüfumfang](FLEET_FRESHNESS.md). Dreamteam bestätigt die Fehlerkorrektur; die historische M9-Entscheidung bleibt CHANGES_REQUESTED 4/5 wegen des damaligen niedrigen Testnachweisbefunds 0034. Dieser ist inzwischen in Mission 10 mit echtem React-Unmount-Test und portabler Browserauflösung behoben: [gezielte Testabnahme APPROVED 4/4](FLEET_CLEANUP_TEST.md). Die niedrigen Befunde 0030/0032/0033 sind inzwischen in Mission 11 gezielt behoben und regulär aktiviert: [Dreamteam APPROVED 5/5, Tests und verbleibender Nebenbefund](mission-11/VALIDATION.md). [Ursprüngliche Paketbindung und Behandlung](FLEET_INTEGRATION_REVIEW.md). Die gezielte Nachbesserung ist keine neue Gesamtfreigabe der M8-Implementierung.

## Ergebnis und Verwendung

Das Office Desk enthält die gemeinsame VPS-/Flottenübersicht. Es verwendet weiterhin den bestehenden DeskShell, Originalmarke, Navigation, Hell-/Dunkelmodus und die Projektmanagementfunktionen aus Mission 6. Der neue serverseitige Adapter liest die vorhandene M650-Python-Schicht. Die Windows-Collector-/Reader-Dienste und deren Speicher bleiben unverändert.

- Übersicht: `/` oder `/controlling/fleet-control`.
- VPS-Detail: `/controlling/vps/{registrierte-id}` mit CPU-/RAM-/Volume-Verläufen, tatsächlicher Messabdeckung, Prozessen und Flottenkarten.
- Flottendetail: `/controlling/fleet-control/{vps-id}.{einsatz-id}` mit nativer Kontokurve, Kennzahlenfeldern, Varianten, Pools, Positionen und Quellenhinweisen.
- `?mode=demo` wählt ausdrücklich fiktive Beispiele. Die Demo übernimmt M6-Flottennamen, Varianten und Pools. Sie ist kein Fallback bei Quellenausfall. Alle Links erhalten den Modus und das gewählte 24-Stunden-/Sieben-Tage-Fenster.

Der jeweilige VPS-Name und die gesamte Flottenkarte sind semantische Links. Der Kartenname für Hilfstechnik enthält auch Status und Kennzahlen. Native Direktlinks ohne Quelle zeigen einen erklärenden Leerzustand. Fiktive Daten werden dabei nicht eingeblendet.

## Tatsächlicher Anschluss

Die vorhandene Macquelle auf `127.0.0.1:8766` wurde für die lokale lesende Anschlussprüfung verbunden. `ops/connect-fleet.mjs` hat einen **eigenen widerrufbaren Office-Serverzugang** in der bestehenden Mac-Geräteliste registriert. Der erfolgreiche authentisierte Healthabruf lieferte 151 Healthfenster und eine passende Hostidentität. Die Quittung enthält keine Schlüssel. Der laufende Python-Prozess liest die Geräteliste je Anfrage; ein Neustart ist dafür nicht erforderlich.

Ein isoliertes Office auf Port 43121 mit eigener leerer Projektmanagement-Datenbank liest dieselbe Quelle. Der Browsercheck bestätigt native Hostdaten, den EA-losen Zustand und funktionierende VPS-Details. Es gibt derzeit weiterhin keine gebundenen aktuellen EA-Exportquellen. Die native Übersicht erfindet deshalb keine Flotten oder Handelssalden.

Nach der ausdrücklichen Freigabe **„Jetzt im Office aktivieren“** wurde der reguläre Office-Prozess auf 43120 am 14.11.2026 mit dem geprüften Build gestartet. Der vorhandene Mac-App-Einstieg `~/Applications/Tradegazing Office Desk.app` öffnet jetzt den gemeinsamen Office Desk auf 43120. Das vorhandene Python-Macbackend auf 8766 und die VPS-Dienste bleiben als Mess-/Transportgrundlage erhalten.

Der erste reguläre authentisierte Office-Datenabruf lieferte HTTP 200, Modus NATIVE, einen gebundenen Host mit CURRENT-Health und weiterhin null Flotten bei fehlenden EA-Exporten. Die operative Quittung liegt privat unter `.office-desk-data/dreamteam/mission-8-activation.json`. Erfolgreiche Quittungen und vorhandene Testbelege übernommen; keine zusätzliche Rücklese-/Installations- oder Gesamtqualifikationsserie. Die eigene QA-Instanz auf 43121 wurde beendet und ihre leere temporäre Datenablage entfernt. Reguläre Projektmanagement-Daten und laufende Messdienste bleiben erhalten.

## Daten, Rechte und Grenzen

`GET /api/fleet-control/overview` prüft die vorhandene Office-Autorisierung und Origin-/Loopbackgrenze. Der Aufrufer darf keine Quell-URL oder sonstige Quellparameter übergeben. Ziele kommen nur aus der privaten Registrierung; ausschließlich HTTP auf `127.0.0.1` mit ausdrücklichem Port, ohne URL-Zugänge oder Umleitungen. Jede Antwort ist `no-store`.

Der Adapter liest `/v1/desk` und `/v1/health?days=7` mit einem eigenen serverseitigen Schlüssel. Beide Antworten sind auf 16 MiB und 45 Sekunden begrenzt. Der Transport zu Windows bleibt der bestehende lesende SSH-Weg im Python-Backend. Der Office-Browser erhält weder Schlüssel noch Konfigurationspfade oder rohe Transportdaten.

Pro registriertem Host gibt es einen flüchtigen letzten Stand und höchstens einen laufenden Aktualisierungsversuch. Erfolgreiche Office-Abrufe lesen jeweils den bereits puffernden Mac-Reader, ohne zusätzliche Office-Cachefrist; der Browser liest regulär alle 300 Sekunden. Nach Fehlern wird frühestens nach 30 Sekunden erneut versucht. Bei vorhandenem Stand wartet Office höchstens acht Sekunden auf den Refresh. Ein dann noch laufender Abruf wird über `refreshing` signalisiert und vom Browser begrenzt nachgeholt. Alter Stand und Originalzeiten bleiben erhalten, Fehler markieren ihn als veraltet. Ein mehr als sieben Tage alter Cache wird beim nächsten Zugriff verworfen. Office legt keine zweite persistente Handels-/Healthhistorie an. Ein Hostausfall lässt andere registrierte Quellen sichtbar. [Zeitvertrag und Grenzen](FLEET_FRESHNESS.md).

Healthfenster werden je Slot nach jüngster tatsächlicher Beobachtung gewählt, nicht nach Session-UUID. CPU ist der Fenstermittelwert; RAM und Volume verwenden den Endstand des jeweiligen Fensters mit dessen eigenem Nenner. Unplausible/future/abgelaufene Healthwerte bleiben offen. Ressourcenwarnungen werden aus der tatsächlichen M650-`attention`-Liste übernommen. Health-Frische: 660 Sekunden aus der dokumentierten Transportkette. Konto-Frische: größeres registriertes `fresh_seconds` oder mindestens 960 Sekunden für Export-/Abrufversatz. Status und Datenfrische bleiben getrennt.

Die Handelsoriginale verfallen gemäß der bestehenden M650-Regel ab Annahme; Healthfenster nach Beobachtungs-Slot und zusätzlich bei Größenbudgetüberschreitung. Der Desk zeigt das tatsächlich verfügbare Fenster und verspricht keine vollständigen sieben Tage. Der alte M650-Budgetbefund wird durch diese Oberfläche nicht repariert oder neu qualifiziert.

Geldbeträge werden als Dezimalstrings übernommen und ohne Gleitkommarechnung formatiert. Gleitkomma dient nur der Diagrammgeometrie und Ressourcenanzeige. Native Konto-Balance und -Equity bleiben Kontowerte, auch bei mehreren Flotten auf demselben Konto; die Karte kennzeichnet das geteilte Konto, es gibt keine Summe. Konto-/Umgebungs-/Research-/Einsatzbindung muss zur privaten Registrierung passen.

Der aktuelle M650-Reader qualifiziert weder ein vollständiges Tagesnetto noch eine vollständige Flotten-Offenbewertung oder einen zusammenfassenden EA-Betriebsstatus. Diese drei nativen Kennzahlenfelder bleiben bewusst unbekannt. Prozessanwesenheit und Brokerverbindung erzeugen kein Active. Im Demo-Modus sind Active/Inaktive/Zuletzt Failure sichtbar; auch dort wird Quellenveraltung separat angezeigt. Ein späterer passender EA-/Projektionsvertrag ist für native Handelskennzahlen erforderlich, nicht für die bereits funktionierende Hostanbindung.

## Private Einrichtung

Einmaliger Anschluss an die vorhandene Macinstallation, im Deskordner:

```sh
./desk connect-fleet
```

Alternativ kann dem Skript ein ausdrücklich gewählter, geschützter Mac-Konfigurationspfad übergeben werden. Es liest den bestehenden lokalen Mac-Reader, erzeugt einen getrennten Office-Schlüssel und erhält fremde beziehungsweise widerrufene Einträge. Registrierung und Schlüssel werden privat unter `.office-desk-data/` verwahrt. Ein fehlgeschlagener Anschluss kann einen bereits angelegten eigenen Leserzugang hinterlassen; erneuter Aufruf verwendet denselben Zugang, keine automatische Rotation.

`fleet-sources.json` muss Dateirechte 0600 haben. Schemaauszug mit ausschließlich fiktiven Werten:

```json
{
  "version": 1,
  "hosts": [{
    "id": "primary", "name": "Mein VPS", "native_host_id": "original-host-id",
    "ip": "192.0.2.10", "endpoint": "http://127.0.0.1:8766/",
    "token_file": "/private/office-reader-key.txt", "fresh_seconds": 900,
    "bindings": [{
      "id": "nova", "name": "Nova", "broker": "Beispielbroker",
      "account_key": "broker/server/account", "environment": "DEMO",
      "deployment_id": "belegter-einsatz"
    }]
  }]
}
```

Jede Flottenbindung braucht tatsächliche Quellbelege. Ohne Bindung erscheint ein bekanntes Konto als noch unzugeordnet; ohne EA gibt es keine erfundene Karte. RESEARCH benötigt zusätzlich `run_id`. Hostidentitäten und Registry-IDs sind eindeutig. Weitere Hosts können über eigene schon vorhandene lokale Reader registriert werden; diese Mission startet keine zusätzlichen VPS-Dienste.

Widerruf: Den eigenen Eintrag `tradegazing-office-server` in der privaten Mac-Geräteliste deaktivieren. Der Connector aktiviert einen ausdrücklich widerrufenen Eintrag nicht erneut. Schlüsselwerte gehören weder in Befehlsargumente noch ins Repository. Die bekannte lokale Office-Sitzungsgrenze OFFICE-BUG-0007 bleibt erhalten.

## Prüfung und Übergabe

45 Tests, Typecheck und Produktionsbuild bestanden. Die elf neuen Adaptertests decken Identitäten, Sessions, Ressourcen, exakte Geldwerte, getrennte Umgebungen, unbekannte Kennzahlen, Autorisierung, Größenbegrenzung, blockierten Refresh, Cacheablauf, Hostausfall sowie idempotente/revokationsbewusste Verbindung ab.

Der isolierte Browserlauf prüfte native Quelle, Demo, beide Detailseiten, Karten-Zugänglichkeit, Tastatur, Verlauf, Reload, Filter, native Nicht-gefunden-Fälle, API-Zugriff und lesendes Projektmanagement bei 1440/390/320 px; keine JavaScript-Fehler. Die QA-Projektmanagement-Datenbank bleibt leer. Der native Screenshot bleibt privat; nur Demo-Screenshots sind versioniert. [Browserbelege](mission-8/browser-checks.json).

Bestehende unveränderte M6-/M650-Abnahmen werden übernommen. Das [unabhängige Dreamteam-Ergebnis](FLEET_INTEGRATION_REVIEW.md) beschreibt den tatsächlichen Paketumfang und offene Befunde. Keine native EA-, Windows-Last-, Retention- oder vollständige ACL-Neuabnahme aus diesen Office-Prüfungen ableiten.

Bekannter neuer Nebenbefund **OFFICE-BUG-0030, NIEDRIG**: Die dekorative Demo-Zeitreihe endet leicht versetzt zur fiktiven Equitykachel. Eintritt im Demopfad sicher, keine native Messung betroffen. Gemäß Nutzerpriorisierung zurückgestellt; kein Blocker für die echte Anbindung. Historische M7-Befunde bleiben an ihren statischen Konzept-/Vorschaukontext gebunden; die neue Laufzeit übernimmt unter anderem zugängliche Kartenlinks, tatsächliche Health-Verlaufsmapping/Sessions und getrennte Native-/Demo-Routen.
