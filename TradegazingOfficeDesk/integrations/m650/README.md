# Fleet Control mit getrenntem Live- und Historienabruf

Office-Mission 22. Der M650-Leser liegt in einem separaten Arbeitsstand. Die
versionierte [Änderung](current-history.patch) wird dort auf eine isolierte
Kopie der M650-App angewendet. Sie ändert die Python-Dateien des Lesers und
Mac-Backends. Die Aktivierung der produktiven Laufzeiten ist gesondert freigegeben.

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


## Produktiver Betrieb ab 25.11.2026

Auf Nutzerfreigabe wurde Build `6e40574f5585` in der Reihenfolge VPS-Reader,
Mac-Datenbackend und Office Desk aktiviert. Der reguläre authentisierte
Office-Abruf lieferte NOVA und VPS-Health als aktuell und nativ. Die
NOVA-Beobachtung war von 21:37:46 MEZ, die VPS-Messung von 21:38:04 MEZ.
Der erste Sieben-Tage-Abruf lieferte 1.790 Equity-Punkte und 1.988
Health-Fenster in 3,54 Sekunden. Der unmittelbar folgende Cursor-Abruf
enthielt keine geänderten Punkte und lieferte 161 Byte in 2,32 Sekunden.
Dies ist die Betriebsquittung der betroffenen Schnittstellen.
Die Review-Restpunkte und Rückrollpfade stehen in
[Office-Mission 22](http://127.0.0.1:43120/missions/22fca50c-fdbb-4483-b15f-96cf5595bf73).

## MT5-Slots in der VPS-Prozessliste

Office-Mission 23 ergänzt am M650-Collector mit dem
[Slot-Patch](mt5-slot-display.patch) ein numerisches Feld aus dem
gemessenen MT5-Programmpfad. Zum Beispiel wird `MetaTrader 5 Slot1` zu
`Slot 1`. Ist im Pfad kein Slot erkennbar, zeigt die Prozessliste
„Slot unbekannt“. Die strikte EA-/Kontozuordnung bleibt ein eigener
Status. Der Desk erhält nur den Slot und keine Programmpfade.

Der Patch wird nach `current-history.patch` in einer isolierten Kopie
angewendet. Prüfen mit `PYTHONPATH="$PWD" python3 -B
/absoluter/pfad/test_mt5_slot_display.py`. Die produktive Anzeige
benötigt den aktualisierten Office-Build und einen Health-Weg, der
den MT5-Pfad lesen darf. Der VPS-Reader reicht das zusätzliche Feld im
bisherigen Health-Format weiter.

Unter `LOCAL SERVICE` hat der Windows-Collector im produktiven
Dienstkontext keinen Zugriff auf den MT5-Programmpfad (OFFICE-BUG-0046).
Der bestehende SSH-Lesezugang kann ihn ermitteln. Der
[Mac-Patch](mt5-slot-mac-ssh.patch) ergänzt deshalb ausschließlich den
aktuellen Health-Abruf. Windows sendet die Slotnummer, PID und native
Startzeit. Der Mac ergänzt den Slot nur bei identischer Prozessinstanz.
Der Programmpfad bleibt auf Windows. Nach einem Fehler der Zusatzabfrage
bleiben die übrigen Health-Daten verfügbar. Der Mac-Patch setzt auf
`current-history.patch` auf und benötigt eine gesondert freigegebene
Aktivierung des Mac-Datenbackends.

Seit 26.11.2026 nutzt der reguläre Mac-Datenleser diesen SSH-Leseweg
für die Slotanzeige. Nach freigegebenem Neustart des Mac-Datenbackends
lieferte der authentisierte Office-Abruf für die Hostmessung von
09:44:48 MEZ **Slot 1** und VPS-Health als aktuell.
[Betriebsbeleg in Office-Mission 23](http://127.0.0.1:43120/missions/6069e4c6-e882-48c9-ac49-4d1ef17c96d2)
