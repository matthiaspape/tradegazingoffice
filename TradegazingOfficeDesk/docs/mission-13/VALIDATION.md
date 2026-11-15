# Neustartbetrieb · Office-Mission 13

Stand 15.11.2026 · OFFICE-BUG-0036

Der Nutzer meldete einen nach Neustart nicht laufenden Desk und verlangte den Wiederanlauf der benötigten Komponenten auf Mac und VPS. Der gemeinsame Desk wurde mit dem vorhandenen `./desk launch` wiederhergestellt; die authentisierte Übersicht lieferte HTTP200/NATIVE, CURRENT-Health und unveränderte Originalmesszeiten. Projektmanagement wurde danach hier in Mission 13 angelegt.

## Befund und gezielte Änderung

Auf dem Mac war nur `de.tradegazing.office-desk` für das Python-Macbackend8766 eingerichtet. Für den gemeinsamen Office Desk43120 gab es keinen Autostart. Das ist als OFFICE-BUG-0036 erfasst, MITTEL mit hoher Eintrittswahrscheinlichkeit beim Neustart; keine Daten- oder Handelsveränderung.

Der neue getrennte Benutzer-LaunchAgent `de.tradegazing.office-main-desk` startet den existierenden Node/vinext-Build direkt bei Anmeldung und wird nach Prozessende durch launchd erneut gestartet. `./desk autostart` richtet ihn ausdrücklich ein; `./desk stop` entlädt einen verwalteten Job für einen gewollten Stop, `./desk launch` lädt denselben Job wieder. Vorhandener manueller Start bleibt für Instanzen ohne Agent verfügbar. Besitz, Label, Projekt-/Datenpfad und Herkunft eines geladenen Jobs werden vor Eingriffen geprüft.

Der VPS benötigte keine Korrektur: Collector und API-Reader haben aktivierte Boottrigger, getrennte Dienstidentitäten und laufen seit zwei Sekunden nach dem tatsächlichen Systemboot am14.11.2026. Das geladene Macbackend und die native Health sind ebenfalls vorhanden. [Lesender VPS-Befund](vps-startup.json). Gesunde Konfigurationen wurden erhalten.

## Tatsächliche Prüfung

- Sieben gezielte Node-Tests bestanden, einschließlich plist-Rundlauf über das native `plutil`, fremder Konfiguration/Besitzer/Symlink, geladener Jobherkunft geschütztem Legacy-Stop und präziser Erkennung ausdrücklich deaktivierter eigener Labels.
- Die erweiterte isolierte native launchd-QA auf43122 bestand: fremden Health-Prozess abweisen, tatsächlichen Portbesitz des Agent-PIDs prüfen, idempotent starten, SIGTERM-Respawn, gewollter Stop und Bootstrap. Authentisierte echte Fleetübersicht unter launchd vor und nach Respawn jeweils NATIVE/CURRENT. Keine neue Readeridentität; eigene QA-Authentisierung/temporäre Quellenkonfiguration und Agent entfernt, kein neuer Override. [Aktueller Beleg](native-launch-agent-round2.json). Die [erste native QA](native-launch-agent.json) ist historisch erhalten.
- Windows wurde ausschließlich lesend über den vorhandenen SSH-Zugang geprüft; Bootzeit, Aufgabenstart und tatsächliche laufende Prozesse sind belegt. Keine Windows-/MT5-/Research- oder System-Neustarts ausgeführt.
- Typecheck/Produktionsbuild und Fachprüfungen für den unveränderten Produktcode werden übernommen. Keine zusätzliche Gesamt-, EA-, Retentions- oder ACL-Prüfserie.

Der neue Mac-Start ist nach Benutzeranmeldung vorgesehen; kein systemweiter Betrieb vor Anmeldung/FileVault-Entsperrung. Der vollständige Mac-Neustart wurde nicht durch diese Mission ausgelöst. [Betrieb, genaue Start-/Stop-Befehle und Grenzen](../operations/AUTOSTART.md).

Der aktuelle Betriebsauftrag autorisiert die reguläre Einrichtung und Aktivierung des geprüften eigenen LaunchAgents. Dreamteam prüft davor den gezielten Implementierungsstand. Historische M8–M12-Entscheidungen und bestehende Qualifikationsgrenzen bleiben erhalten. Benötigte Belege werden bewahrt; abgeschlossene zuverlässige Schritte werden nicht nochmals qualifiziert.


## Reviewrunde 1 und gezielte Rückmeldung

Dreamteam `791bc925e96041caabbc39cde6c4249f`, Paket `40cbb99a5d500e6deeb91794f575edf87807b50c4140c440593572a527963cdf`: CHANGES_REQUESTED, C1/C2/C3/C5 bestanden, C4 offen. [Originalfeedback](review-round1.json).

- M13-R1-ENV: Fleet-Reader benötigt Dateizugriff und Node-fetch zur bereits eingerichteten Loopbackquelle, keine Shell-/SSH-Unterprozesse. Eine authentisierte echte Fleetabfrage unter der reduzierten launchd-Umgebung besteht nun nativ vor und nach Respawn; Quellzeiten bleiben im Beleg sichtbar. System-PATH ist ausdrücklich gesetzt, keine Shellsecrets kopiert.
- M13-R1-PORTOWNER: Vor neuem Bootstrap wird ein belegter Port abgewiesen; nach Health muss der listenerhaltende PID zum eigenen geladenen Job gehören. Ein neuer fehlgeschlagener Bootstrap wird wieder entladen. Native Negativkontrolle mit fremdem Health-Prozess besteht.
- M13-R1-QAOVERRIDE: enable erfolgt nur für das exakte, ausdrücklich deaktivierte Label. QA-Cleanup läuft auch nach Fehlern in verschachtelten finally-Blöcken. Aktuelle QA hinterlässt keinen neuen Override. Ein alter inaktiver OS-Metadateneintrag bleibt als OFFICE-BUG-0037 NIEDRIG zurückgestellt; keine aktive Funktion, Wahrscheinlichkeit des vorhandenen Restes HOCH/beobachtet, keine Produktwirkung. Keine globale reset-disabled-Aktion, die fremde Benutzerpräferenzen ändern könnte.
- M13-R1-PROCTYPE: Background-Profil entfernt; normale launchd-Priorität, im Unit-Test gesichert.

Die verknüpfte Folgeprüfung bewertet den korrigierten Stand. Reviewerbelege sind Entwicklerausführungen, keine vom Reviewer ausgeführten Tests.
