# Office Bug Board

Eigener Bereich `/bugs` im Tradegazing Office Desk. Funktional aus Tradegazing übernommen, mit eigenem Office-Datenbestand und dem Präfix `OFFICE-BUG-`. Historische Tradegazing-IDs bleiben externe Referenzen.

Ein Befund erfasst erwartetes/tatsächliches Verhalten, Wirkung, Kritikalität, Wahrscheinlichkeit, Gesamtrisiko mit Begründung, Belegstatus, Komponenten, Owner, Status und gegebenenfalls Zurückstellungs-/Abschlussgrund. Vorkommen binden Mission, Run, Stufe, Version und konkrete Belege. Bewertungssicherheit ist keine Eintrittswahrscheinlichkeit.

## Workflow und Grenzen

Vor Neuanlage `bug_list`, dann `bug_create` oder `bug_add_occurrence`. Nur ein beobachteter/reproduzierter notwendiger Laufblocker ohne einfache sichere Fortsetzung darf während eines Such-/Researchlaufs repariert werden. HOCH allein erlaubt keine Reparatur. Eigenständige Entwicklungsaufträge behalten ihren beauftragten Umfang. Status und Laufentscheidung starten keine Prozesse und erteilen keine zusätzlichen Rechte.

WEITER und EINGESCHRAENKT erlauben die Fortsetzung. BLOCKIERT benötigt Run, Stufe, Beleg, blockierten notwendigen Schritt und Begründung des fehlenden Workarounds. Pro Mission/Run/Stufe zählt das neueste Vorkommen; frühere bleiben erhalten. Nach Fix WEITER, bei Ende KONTEXT_BEENDET anhängen. Nichtblocker verhindern keinen administrativen Missionsabschluss.

Status: NEU, EINGESCHAETZT, ZURUECKGESTELLT, EINGEPLANT, IN_ARBEIT, ERLEDIGT, DUPLIKAT, KEIN_FEHLER. Zurückstellung benötigt Grund; Abschluss benötigt Beleg. Duplikate verweisen direkt auf ein Original. Neue Vorkommen können erledigte Bugs wieder öffnen; ein bloßer Kontextabschluss tut dies nicht.

## API und Speicherung

| Zugang | Wirkung |
| --- | --- |
| GET /api/bugs | Liste/Filter oder Detail mit id |
| POST /api/bugs | bug_create |
| PATCH /api/bugs | bug_update mit expected_revision |
| PUT /api/bugs | bug_add_occurrence |
| MCP/CLI | bug_list, bug_get, bug_create, bug_update, bug_add_occurrence |

Gemeinsame Filter: q, risk, status, component, mission_id, decision, limit, offset. Kennzahlen gelten für die gesamte gefilterte Auswahl. Mission und Laufentscheidung müssen am selben aktuellen Vorkommen zutreffen.

Write-Request-Keys sind dauerhaft eindeutig. Gleicher Key und gleicher kanonischer Inhalt liefern das gespeicherte Ergebnis vor der Revisionsprüfung; geänderter Inhalt ergibt 409. Mutation, erstes Vorkommen und Ereignis werden in einer SQLite-Transaktion gespeichert; Fehler rollen alles zurück. Die History hat keinen Edit-/Delete-Endpunkt.

Eigene Tabellen in `missions.sqlite`: bug_board_schema, desk_bugs, bug_occurrences und bug_events. Neues `./desk setup` legt das Schema explizit an. Start, GET und MCP-Lesen tun das nicht. Fehlendes Schema ergibt BUG_BOARD_SCHEMA_MISSING, HTTP 503; kein leerer Erfolg. Bestehende Office-Instanz vor `./desk bug-schema --apply --offline` stoppen. Es wird keine Tradegazing-Datenbank geöffnet.

Alle API-Wege nutzen Office-Authentisierung und Originprüfung. Browser bekommt eine eigene signierte lokale Sitzung. Hoher Risikowert, Boardstatus und Missionabschluss umgehen keine fachlichen Sicherheits-/Autorisierungsgrenzen. Datenbank, Schlüssel, Logs und Backups bleiben außerhalb von Git.
