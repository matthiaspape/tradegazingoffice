# Fleet Control · gemeinsame Office-Implementierung

Stand 14.11.2026 · Office-Mission 8 · Implementierung mit M6-/M650-Bausteinen

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

Der reguläre Office-Prozess auf 43120 wurde in dieser Implementierungsphase nicht neu gestartet. Die Übernahme des neuen Builds in den laufenden Office-Betrieb ist eine eigene operative Aktion. Die separate Python-Oberfläche und der vorhandene App-Einstieg auf 8766 wurden nicht entfernt oder umgestellt.

## Daten, Rechte und Grenzen

`GET /api/fleet-control/overview` prüft die vorhandene Office-Autorisierung und Origin-/Loopbackgrenze. Der Aufrufer darf keine Quell-URL oder sonstige Quellparameter übergeben. Ziele kommen nur aus der privaten Registrierung; ausschließlich HTTP auf `127.0.0.1` mit ausdrücklichem Port, ohne URL-Zugänge oder Umleitungen. Jede Antwort ist `no-store`.

Der Adapter liest `/v1/desk` und `/v1/health?days=7` mit einem eigenen serverseitigen Schlüssel. Beide Antworten sind auf 16 MiB und 45 Sekunden begrenzt. Der Transport zu Windows bleibt der bestehende lesende SSH-Weg im Python-Backend. Der Office-Browser erhält weder Schlüssel noch Konfigurationspfade oder rohe Transportdaten.

Pro registriertem Host gibt es einen flüchtigen Speicherstand, zusammengefasste gleichzeitige Erstabrufe und höchstens einen laufenden Aktualisierungsversuch. Normales Aktualisierungsintervall 300 Sekunden; nach Fehlern frühestens 30 Sekunden. Ein vorhandener Speicherstand wird während einer langsamen Python-Aktualisierung sofort mit seinen Originalzeiten ausgeliefert. Fehler markieren ihn als veraltet. Ein mehr als sieben Tage alter Cache wird beim nächsten Zugriff verworfen. Office legt keine zweite persistente Handels-/Healthhistorie an. Ein Hostausfall lässt andere registrierte Quellen sichtbar.

Healthfenster werden je Slot nach jüngster tatsächlicher Beobachtung gewählt, nicht nach Session-UUID. CPU ist der Fenstermittelwert; RAM und Volume verwenden den Endstand des jeweiligen Fensters mit dessen eigenem Nenner. Unplausible/future/abgelaufene Healthwerte bleiben offen. Ressourcenwarnungen werden aus der tatsächlichen M650-`attention`-Liste übernommen. Health-Frische: 600 Sekunden. Konto-Frische: registriertes `fresh_seconds`, standardmäßig 900 Sekunden für Export-/Abrufversatz. Status und Datenfrische bleiben getrennt.

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
