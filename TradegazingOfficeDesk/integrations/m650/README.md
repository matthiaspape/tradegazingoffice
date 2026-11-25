# Fleet Control mit getrenntem Live- und Historienabruf

Office-Mission 22. Der M650-Leser liegt in einem separaten Arbeitsstand. Die
versionierte [Änderung](current-history.patch) wird dort auf eine isolierte
Kopie der M650-App angewendet. Sie ändert die Python-Dateien des Lesers und
Mac-Backends. Die produktiven Laufzeiten sind ein eigener Aktivierungsschritt.

- `GET /v1/current?part=desk` liefert den Konto- und Flottenstand am neuesten
  nativen Kontozeitpunkt. Offene Positionen stammen aus genau dieser Aufnahme.
  Varianten, Pools und Heartbeat sind an dieselbe aktive Sitzung gebunden.
- `GET /v1/current?part=health` liefert die jüngsten VPS-Messfenster und die
  bestehenden Statushinweise. Das Mac-Backend puffert beide aktuellen Teile
  unabhängig voneinander.
- `GET /v1/history?hours=24|168` liefert die vollständigen verfügbaren
  Chartpunkte des Fensters. `&after=<cursor>` liefert geänderte Punkte und
  Löschungen (`null`). Ein unbekannter, fensterfremder oder verdrängter
  Cursor liefert einen neuen vollständigen Stand mit `reset=true`.
  Das jüngste native Equity-Original pro Fünf-Minuten-Fenster bleibt als
  Dezimalstring erhalten. Der Leser berücksichtigt verspätet angenommene
  Originalsätze, Korrekturen und das Aufbewahrungsfenster. Hostfenster können
  sich nachträglich ändern und werden bei gleicher Zeitfenster-ID ersetzt.
  Die Cursor und die letzten zwölf Chartstände je Zeitfenster liegen im
  Leserspeicher. Nach einem Reader-Neustart erfolgt ein neuer Vollabruf.
- Office lädt die Historie separat, sobald eine Ansicht ihren Chart braucht.
  Positionshistorie und Issues nutzen weiterhin den vorhandenen Ereignis-Cursor
  und werden nur im Flottendetail angefordert. Office bindet den Chart-Cursor
  zusätzlich an die aktuelle Einsatzzuordnung. Ändert sie sich, wird das
  angeforderte Fenster vollständig für die neue Zuordnung geladen. Die vorhandenen M650-Routen
  `/v1/desk`, `/v1/health`, `/v1/source-status` und `/v1/events` bleiben für
  bestehende Verbraucher verfügbar.

## Isoliert vorbereiten und prüfen

In einer lokalen Kopie der M650-App mit `fleet_desk/` und ihren eingebundenen
Vendor-Modulen zuerst `git apply --check /absoluter/pfad/current-history.patch`
und dann `git apply /absoluter/pfad/current-history.patch` ausführen. Den Test
aus demselben Arbeitsverzeichnis direkt aufrufen, damit `fleet_desk` aus der
gepatchten Kopie importiert wird:

```sh
PYTHONPATH="$PWD" python3 -B /absoluter/pfad/test_fleet_sync.py
```

Die Office-Prüfungen laufen mit `./desk typecheck`, `./desk test` und
`./desk build`. Der Browserfall `tests/fleet-history-browser.cjs` benutzt
eine isolierte Vorschau und synthetische Antworten.

Bei einer freigegebenen Aktivierung passt der neue VPS-Reader zuerst, danach
das Mac-Datenbackend und danach der Office-Build. Die bestehenden
Collector-Datenbanken, Aufbewahrungsregeln und MT5-Prozesse werden für diese
Änderung weiterverwendet. Die Patch-Anwendbarkeit gegen die konkreten
staging-Kopien gehört zur Vorbereitung dieser Aktivierung.
