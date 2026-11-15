# Neustartbetrieb · Office-Mission 13

Stand 15.11.2026 · OFFICE-BUG-0036

Der Nutzer meldete einen nach Neustart nicht laufenden Desk und verlangte den Wiederanlauf der benötigten Komponenten auf Mac und VPS. Der gemeinsame Desk wurde mit dem vorhandenen `./desk launch` wiederhergestellt; die authentisierte Übersicht lieferte HTTP200/NATIVE, CURRENT-Health und unveränderte Originalmesszeiten. Projektmanagement wurde danach hier in Mission 13 angelegt.

## Befund und gezielte Änderung

Auf dem Mac war nur `de.tradegazing.office-desk` für das Python-Macbackend8766 eingerichtet. Für den gemeinsamen Office Desk43120 gab es keinen Autostart. Das ist als OFFICE-BUG-0036 erfasst, MITTEL mit hoher Eintrittswahrscheinlichkeit beim Neustart; keine Daten- oder Handelsveränderung.

Der neue getrennte Benutzer-LaunchAgent `de.tradegazing.office-main-desk` startet den existierenden Node/vinext-Build direkt bei Anmeldung und wird nach Prozessende durch launchd erneut gestartet. `./desk autostart` richtet ihn ausdrücklich ein; `./desk stop` entlädt einen verwalteten Job für einen gewollten Stop, `./desk launch` lädt denselben Job wieder. Vorhandener manueller Start bleibt für Instanzen ohne Agent verfügbar. Besitz, Label, Projekt-/Datenpfad und Herkunft eines geladenen Jobs werden vor Eingriffen geprüft.

Der VPS benötigte keine Korrektur: Collector und API-Reader haben aktivierte Boottrigger, getrennte Dienstidentitäten und laufen seit zwei Sekunden nach dem tatsächlichen Systemboot am14.11.2026. Das geladene Macbackend und die native Health sind ebenfalls vorhanden. [Lesender VPS-Befund](vps-startup.json). Gesunde Konfigurationen wurden erhalten.

## Tatsächliche Prüfung

- Sechs gezielte Node-Tests bestanden, einschließlich plist-Rundlauf über das native `plutil`, fremder Konfiguration/Besitzer/Symlink, geladener Jobherkunft und geschütztem Legacy-Stop.
- Ein isolierter nativer launchd-Test mit eigenem QA-Label, temporärer Ablage und Port43122 bestand: Bootstrap/Health, automatischer Neustart nach SIGTERM, absichtliches Entladen ohne Wiederbelebung und erneuter Start. Eigener Job und Dateien sind entfernt. [Quittung](native-launch-agent.json).
- Windows wurde ausschließlich lesend über den vorhandenen SSH-Zugang geprüft; Bootzeit, Aufgabenstart und tatsächliche laufende Prozesse sind belegt. Keine Windows-/MT5-/Research- oder System-Neustarts ausgeführt.
- Typecheck/Produktionsbuild und Fachprüfungen für den unveränderten Produktcode werden übernommen. Keine zusätzliche Gesamt-, EA-, Retentions- oder ACL-Prüfserie.

Der neue Mac-Start ist nach Benutzeranmeldung vorgesehen; kein systemweiter Betrieb vor Anmeldung/FileVault-Entsperrung. Der vollständige Mac-Neustart wurde nicht durch diese Mission ausgelöst. [Betrieb, genaue Start-/Stop-Befehle und Grenzen](../operations/AUTOSTART.md).

Der aktuelle Betriebsauftrag autorisiert die reguläre Einrichtung und Aktivierung des geprüften eigenen LaunchAgents. Dreamteam prüft davor den gezielten Implementierungsstand. Historische M8–M12-Entscheidungen und bestehende Qualifikationsgrenzen bleiben erhalten. Benötigte Belege werden bewahrt; abgeschlossene zuverlässige Schritte werden nicht nochmals qualifiziert.
