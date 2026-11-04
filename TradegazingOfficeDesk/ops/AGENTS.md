# Backend und Betriebswerkzeuge

- Gemeinsame Validierung und Speicherfunktionen für REST/MCP/CLI verwenden. Der Bug-Board-Adapter arbeitet synchron innerhalb derselben SQLite-Transaktion; keine Netzwerkaufrufe oder asynchronen Unterbrechungen während einer Schreibtransaktion.
- Reine Tooldefinitionen bleiben in `tool-definitions.mjs`, `context-tools.mjs` und `bug-tools.mjs`. Keine SQLite-, Datei-, Auth- oder Serverdispatcher-Abhängigkeiten in diesen vom Browser verwendeten Modulen.
- API-Zugriffe zuerst über `authorize` prüfen. Der Store erzeugt keine Nutzerfreigabe. Request-Keys, erwartete Revisionen, Rollback und ursprüngliche Vorkommen erhalten.
- Start, GET und MCP-Lesen dürfen keine Tabellen oder fachlichen Startdaten anlegen. Neue Schemas nur im expliziten Setup beziehungsweise gestoppten Offlineweg.
- Konfiguration nur für die Office-Instanz; keine Originaldesks, deren Schlüssel oder Prozesse öffnen, migrieren oder stoppen. Keine Geheimnisse in stdout oder Fehlerantworten.
- Nach einer relevanten Änderung gezielte echte Tests ausführen; bestehende unveränderte Prüfbelege und Reviews wiederverwenden.
