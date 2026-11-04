# Tradegazing Office Desk – Arbeitsregeln

Diese Regeln ergänzen die AGENTS.md im Repositoryhauptordner. Nutzerauftrag und dortige Sicherheits-/Abschlussgrenzen haben Vorrang.

## Einstieg und Verbindung

- README.md, docs/MCP.md, docs/MISSION_WORKFLOW.md, docs/BUG_BOARD.md und bei Wissensarbeit docs/CONTEXT_CORE.md lesen.
- Eigene Instanz: http://127.0.0.1:43120. MCP-Name: `tradegazing_office_desk`. Eigener Datenpfad `../.office-desk-data/`, überschreibbar über `TRADEGAZING_OFFICE_DESK_HOME`.
- Jeden neuen Chat mit `get_project_context` beginnen; relevante Einträge mit `get_context_entry` und ihre Quellen lesen. Bestehende Mission samt Log mit `get_mission` lesen. Fallback: `./desk call WERKZEUG [JSON_DATEI|-]`.
- Vor neuen Missionen bestehende suchen. Ziele und Abschlusskriterien knapp festhalten. `recommend_mission_profile` und `execution_assessment` verwenden. Modelle sind übernommene Planungsmetadaten, keine Modellumschaltung oder Verfügbarkeitszusage.
- Missionen, Wissen und Bugbewertungen über REST/MCP/CLI pflegen, nicht direkt per SQL. Updates vorher lesen und erwartete Version/Revision verwenden. Quelle und Begründung beibehalten.

## Bugs und Umfang

- Vor einer Reparatur `bug_list`, dann `bug_create` oder `bug_add_occurrence` verwenden. Office-IDs heißen `OFFICE-BUG-…`; Tradegazing-Research-IDs sind andere Referenzen und werden nicht als Office-Bugs umnummeriert.
- Auswirkung, Kritikalität, Wahrscheinlichkeit, Belegstatus und Gesamtrisiko getrennt bewerten. Unbekannt bleibt unbekannt. Ein Boardstatus ist keine Reparatur-, Merge-, Deployment- oder Restartfreigabe.
- Während Such-/Researchbegleitung nur konkret belegte Laufblocker reparieren; alle anderen Funde erfassen und fortsetzen. Eigenständig beauftragte Entwicklung bleibt in ihrem ausdrücklichen Umfang zulässig.
- BLOCKIERT verlangt konkreten Run, Stufe, Beleg, notwendigen blockierten Schritt und fehlende einfache sichere Fortsetzung. EINGESCHRAENKT bedeutet weiterführen. Nach Fix die Entscheidung für denselben Kontext aktualisieren; bei Ende KONTEXT_BEENDET anhängen.
- Wesentliche Entwicklung erhält generisches Dreamteam-Review; tatsächliche Entscheidung und Grenzen ehrlich erhalten. Keine zusätzliche Runde nur für nicht hohe Nebenbefunde oder ein APPROVED-Etikett. Details: docs/DREAMTEAM.md.
- Nichtblocker mit ID, Wirkung, Wahrscheinlichkeit/Risiko und Zurückstellungsgrund im Missionslog und Abschluss nennen. Bei Nichterreichbarkeit vollständigen Fund mit „Boardübernahme ausstehend“ im Log sichern.

## Betrieb, Tests und Daten

- `./desk typecheck`, `./desk test`, `./desk build`; Browser-/HTTP-Prüfungen auf betroffene Änderungen begrenzen. Vorhandene unveränderte Abnahmen wiederverwenden. Keine Gesamtprüfung für reine Register-/Abschlussarbeit.
- `./desk setup` richtet ausdrücklich eine leere Office-Datenbank und einen neuen Schlüssel ein. Start, GET und MCP-Lesen initialisieren oder befüllen nichts.
- Nur den eigenen Office-Prozess stoppen/neu starten. Aunerio, Tradegazing und andere Deskprozesse/Daten bleiben getrennt. Keine fremden Datenbanken, Schlüssel, Nutzerpausen oder Betriebsfreigaben kopieren.
- `./desk bug-schema --apply --offline` ist nur für eine bewusst gestoppte bestehende Office-Instanz. Kein HTTP-Migrationsweg.
- Datenbank, Schlüssel, Logs und Sicherungen bleiben außerhalb von Git. Einrichtungs-/Testdaten sind isoliert; keine Bank-, Mail-, Buchhaltungs-, Handels- oder EA-Aktionen.
- Sicherung nur ausdrücklich über `./desk backup`; kein neuer Zeitplan, Cloudabgleich oder fremde Backupregel. Restore überschreibt kein vorhandenes Ziel und erzeugt einen neuen Office-Schlüssel.
- AGENTS.md, README und Architektur bei dauerhaften Struktur-/Betriebsänderungen pflegen. Commit/Push entsprechend Nutzerauftrag; nur eigene Dateien stagen, kein Force-Push.
