# Office Desk und Fleet-Monitoring nach Neustart

Stand 15.11.2026 · Office-Mission 13

## Bestand und gezielte Korrektur

Der gemeinsame Office Desk auf 43120 hatte keinen eigenen Autostart. `./desk launch` startete ihn lediglich losgelöst von der Terminalsession. Nach dem Mac-Neustart war deshalb ein manueller Start nötig (OFFICE-BUG-0036, MITTEL). Der bereits vorhandene LaunchAgent `de.tradegazing.office-desk` betreibt das separate Python-Datenbackend auf 8766, nicht den gemeinsamen Office Desk.

Für 43120 gibt es nun den getrennten Benutzer-LaunchAgent **`de.tradegazing.office-main-desk`**. Seine Konfiguration liegt unter `~/Library/LaunchAgents/de.tradegazing.office-main-desk.plist`. Er startet Node/vinext direkt im Vordergrund, bindet ausschließlich `127.0.0.1:43120` und erhält den vorhandenen privaten Office-Datenpfad ausdrücklich als Umgebung. Keine Schlüssel oder Zugangsdaten im plist. Zusätzlich zu den beiden Office-Pfaden ist nur ein fester System-PATH gesetzt; Shellumgebung und Secrets werden nicht übernommen. Der Prozess verwendet die normale launchd-Priorität, kein Background-Profil. `RunAtLoad` startet bei Benutzeranmeldung; `KeepAlive` startet nach Prozessende erneut, mit 30 Sekunden Drosselung gegen schnelle Fehlerschleifen. Logs bleiben im privaten `server.log`.

**Mac-Grenze:** Der Benutzer muss angemeldet und sein Homeverzeichnis verfügbar sein. Es ist ein Benutzer-LaunchAgent, kein systemweiter Start vor Anmeldung oder FileVault-Entsperrung. Bei ausgeschaltetem oder schlafendem Mac gibt es keine Office-Abrufe. Der VPS sammelt unabhängig weiter. Die installierte Node-Laufzeit, das Checkout und der vorhandene Build müssen erhalten bleiben.

## Einrichtung und Start/Stop

Im Deskordner:

```sh
./desk autostart
```

Der ausdrückliche Installationsbefehl prüft zuerst Besitz und Konfiguration, beendet nur den eigenen laufenden Office-Prozess, schreibt den eigenen plist und lädt/startet den Agent. Bestehende Office-Daten, Readerrechte, Mac-App-Einstieg und der Python-Agent auf 8766 bleiben erhalten. Fremde Labels, andere Arbeits-/Datenpfade, verknüpfte plists oder fremde Besitzer werden nicht übernommen. Ein bereits belegter Port ohne eigenen geladenen Job führt zum klaren Abbruch. Nach Health-Erfolg muss der listenerhaltende PID tatsächlich zum eigenen LaunchAgent gehören; eine fremde Office-Antwort ist keine Startquittung.

```sh
./desk stop
./desk launch
```

Bei eingerichtetem Autostart entlädt `stop` den eigenen Job aus der aktuellen Benutzersitzung. Er startet deshalb nicht sofort wieder; der plist für die nächste Anmeldung bleibt vorhanden. `launch` lädt/startet denselben Job wieder und erzeugt keinen parallelen losgelösten Prozess. Ohne installierten Agent bleibt der vorhandene manuelle Startweg erhalten. Alte PID-Dateien werden weiterhin gegen den tatsächlich eigenen vinext-Prozess geprüft; ein fremder Prozess wird nicht beendet. Der verwaltete Betrieb benötigt keine PID-Datei als Steuerweg.

Vor einem neuen Build für den laufenden Desk bewusst `./desk stop`, anschließend nach erfolgreichem Build `./desk launch` verwenden. Keine direkten SIGTERM-/PID-Datei-Skripte für einen normalen gewollten Stop: `KeepAlive` behandelt einen Prozessabbruch als Wiederanlauffall.

## Unveränderte weitere Komponenten

| Komponente | Startmechanismus | Tatsächlicher Befund am 15.11.2026 |
| --- | --- | --- |
| Gemeinsamer Office Desk 43120 | neuer Benutzer-LaunchAgent `de.tradegazing.office-main-desk` | manuell wiederhergestellt; neuer Startweg isoliert nativ geprüft, reguläre Einrichtung nach Review |
| Mac-Datenbackend 8766 | vorhandener Benutzer-LaunchAgent `de.tradegazing.office-desk`, RunAtLoad/KeepAlive | geladen; native Office-Abfrage liefert CURRENT |
| VPS-Collector | Aufgabe `Tradegazing-FleetDesk-Collector`, Boottrigger, LOCAL SERVICE | Running, Start zwei Sekunden nach tatsächlichem Systemboot |
| VPS-Reader 8765 | Aufgabe `Tradegazing-FleetDesk-Reader`, Boottrigger, NETWORK SERVICE | Running, Start zwei Sekunden nach tatsächlichem Systemboot, API-only/Loopback |

Der VPS bootete tatsächlich am 14.11.2026 um 16:03:01,500 UTC; beide Aufgaben liefen ab 16:03:03 UTC. Boottrigger sind aktiviert, StartWhenAvailable aktiv, Laufzeit unbegrenzt und Mehrfachinstanzen unterdrückt. Die passenden Python-Prozesse laufen. [Bereinigter lesender Befund](../mission-13/vps-startup.json). Dafür wurden keine gesunden Aufgaben, Rechte oder Windows-/MT5-Prozesse verändert.

## Gezielte Prüfung und Grenzen

- Sieben Node-Tests bestanden: eigene Agentidentität und Vordergrundstart; plist-Rundlauf mit Leer-/Sonderzeichen; Abweisung fremder Konfiguration; Abweisung von Symlinks/falschem Besitzer; Prüfung der geladenen plist-Herkunft; Schutz eines fremden PIDs und bereits gestoppter Legacy-Instanz sowie ausschließlich gezieltes Aktivieren eines ausdrücklich deaktivierten Labels.
- Isolierter nativer macOS-Test mit eigenem QA-Label, temporärer Ablage und Port 43122 bestanden: fremden Portbesitzer trotz passender Health-Antwort ablehnen, Laden/Health und tatsächliche Portzuordnung, idempotenter Start, automatischer Neustart nach SIGTERM, absichtlicher Stop und erneutes Bootstrap. Die authentisierte Übersicht lieferte vor und nach dem Respawn NATIVE/CURRENT unter der echten reduzierten launchd-Umgebung. Dafür wurde die vorhandene autorisierte Fleetquelle lesend verwendet; QA-Authschlüssel und Konfigurationskopie lagen nur in geschützter temporärer Ablage, keine neue Readerregistrierung. Job/plist/Testdaten entfernt, kein neuer Override. [Aktueller Beleg](../mission-13/native-launch-agent-round2.json); [historische erste QA](../mission-13/native-launch-agent.json).
- Kein vollständiger Mac-/VPS-Neustart durch diese Mission: Der bestehende VPS-Neustart ist nativ belegt, auf dem Mac wurde der neue launchd-Lebenszyklus getestet. Keine neue EA-, ACL-, Retentions- oder Gesamtqualifikation. Typecheck/Produktionsbuild bleiben für den unveränderten Produktcode gültig.

Grundlage der launchd-Semantik sind die auf dem Mac installierten Handbuchseiten `launchd.plist(5)` und `launchctl(1)`, insbesondere RunAtLoad/KeepAlive und Bootstrap/Bootout. Ein vorhandener Datenabruf und gesunde Dienstzustände werden übernommen; keine zusätzliche Rücklese-/Gesamtprüfserie.

Der erste QA-Lauf hinterließ einen inaktiven `enabled`-Override für ein altes QA-Label; Job und plist sind entfernt. **OFFICE-BUG-0037, NIEDRIG**, Eintritt des Restes belegt: keine laufende Funktion oder Produktwirkung. Die Ursache ist korrigiert; neue QA-Labels werden nicht unnötig mit `enable` persistiert. Der vorhandene OS-Metadateneintrag bleibt bewusst erhalten, um keine fremden Benutzerpräferenzen mit einem globalen `reset-disabled` zurückzusetzen.
