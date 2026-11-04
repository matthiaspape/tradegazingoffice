# Tradegazing Office Desk – MCP und CLI

Eigener JSON-RPC-Endpunkt: `http://127.0.0.1:43120/api/mcp`. Der lokale stdio-Adapter reicht an diese Office-Instanz weiter und liest den Schlüssel aus ihrer privaten Datenablage. Keine Tokens in argv, Manifesten oder Clientkonfiguration.

```sh
./desk launch
./desk call get_project_context
./desk call list_missions
./desk call bug_list
./desk call get_mission - <<'JSON'
{"mission_id":"ID_AUS_LIST_MISSIONS"}
JSON
```

Optionaler direkter Codex-Anschluss:

```sh
codex mcp add tradegazing_office_desk -- /absoluter/pfad/zu/node /absoluter/pfad/zu/tradegazingoffice/TradegazingOfficeDesk/ops/mcp-stdio.mjs
```

`plugin.json` und `mcp.json` beschreiben alternativ den portablen lokalen Anschluss. Nur einen Weg verwenden. Die Dateien allein beweisen keine aktive Clientregistrierung; tatsächlich verfügbare Tools nach Anschluss prüfen. Alte Chats laden neue MCP-Registrierungen gegebenenfalls erst nach Neuladen. Der CLI-Fallback ist sofort nutzbar.

## Werkzeuge

| Bereich | Werkzeuge |
| --- | --- |
| Missionen | recommend_mission_profile, list_missions, get_mission, create_mission, update_mission, add_mission_log |
| Wissenskern / Legal | get_project_context, list_context_entries, get_context_entry, create_context_entry, update_context_entry |
| Bug Board | bug_list, bug_get, bug_create, bug_update, bug_add_occurrence |

Schema über `tools/list`. Unterstützt: initialize, ping, tools/list, tools/call. Notifications führen keine Werkzeuge aus. Toolfehler nutzen `isError`; Bugfehler enthalten ihren fachlichen Code. Wissensupdates verlangen die gelesene `expected_version`; Bugupdates `expected_revision`. Bei Missionsupdates ist die Versionsprüfung aus der Vorlage technisch optional, während der Agentenworkflow sie zwingend mitgeben soll. Ohne Version ist kein Schutz gegen Überholen neuerer Missionsänderungen zugesagt (OFFICE-BUG-0011). Bugwrites benötigen stabile Request-Keys.

REST: `/api/missions`, `/api/missions/logs` und `/api/bugs`. GET/POST/PATCH/PUT des Bug-Endpunkts entsprechen Liste/Detail, Anlage, Änderung und Vorkommen. Alle Fach-APIs einschließlich GET verlangen Office-Authentisierung; `/api/local/session` richtet die lokale Browsersitzung ein. `/api/health` ist nur eine technische Livenessanzeige.

Das Sitzungsbootstrap ist kein Personen-Login: lokale Prozesse können seine Browserheader nachbilden. Die Signatur und Originprüfung schützen den lokalen Browserkanal, nicht gegen andere Programme auf demselben Rechner. Actor-/Author-Felder sind technische Zuordnungen und kein menschlicher Freigabenachweis (OFFICE-BUG-0007). Der CLI-/MCP-Bearer wird weiterhin privat gelesen; keine Secrets in Clientkonfiguration.

DOCUMENT-Quellen sind validierte relative Repositorypfade unter `docs/`, `design/`, `assets/`, `TradegazingOfficeDesk/` oder AGENTS.md/README.md. Der Desk liest keine beliebigen Dateien. Quellen werden als Referenztext dargestellt, kein generischer Dateiserver.

Werkzeuge starten keine Prozesse, Researchläufe oder Chats und wechseln kein laufendes Modell. Browser-WebMCP ist aus der Vorlage übernommen und optional; keine Kompatibilitätsabnahme in einem echten WebMCP-Host behaupten.
