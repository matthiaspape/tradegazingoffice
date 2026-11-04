# Herkunft und Übernahmeumfang

Stand: 04.11.2026. Nutzerauftrag: Aunerio-Desk für Tradegazing Office kopieren, Tradegazing-Bug-Board und Logo ergänzen, Arbeitsregeln pflegen und committen/pushen.

| Bestandteil | Quelle | Gelieferter Stand |
| --- | --- | --- |
| Projektmanagement | Aunerio, AuroraDesk, Commit `0d855f0362b147e22e59b09db6d4413d60f3b7cb` | Missionen, Logs, Context Core/Legal, REST/MCP/CLI, lokaler Zugriff, Setup/Backup/Restore und passende Tests |
| Bug Board | TradegazingDesk, Commit `5c6ff9052034fb7113f68266433f0c4f0f6143b4` | UI, Validierung, fachliche Vorkommen-/Dubletten-/Idempotenzregeln und SQL-Schema; an Office-SQLite/Auth/MCP angepasst |
| Markenidentität | TradegazingDesk/public/brand | Original-SVGs für hell/dunkel/monochrom, Teal/Navy-Farben, Office-Desk-Titel |
| Abhängigkeiten | Aunerio/AuroraDesk/package-lock.json | Unveränderte gepinnte Paketversionen; eigene Paketidentität 0.1.0 |

Eigener Ort: `TradegazingOfficeDesk/`; eigene Laufzeitvariable `TRADEGAZING_OFFICE_DESK_HOME`, Datenablage `.office-desk-data/`, Port 43120, Cookie-/MCP-Namensraum und `OFFICE-BUG-…`-Nummern. Keine Datenbanken, Missionen, Zugangsschlüssel, Game-/Ludo-Integrationen, vorigen Reviewabnahmen oder produktiven Bugs aus anderen Projekten übernommen. Originalbestände und Prozesse wurden nicht verändert.

Die importierte Boardlogik verwendet einen kleinen synchronen Adapter auf dieselbe Office-SQLite-Verbindung und dieselbe Transaktion. Reine Tooldefinitionen sind von Serverdispatch getrennt, damit WebMCP keine Datenbankmodule in das Browserpaket zieht. Alle 16 Werkzeuge nutzen denselben fachlichen Speicher.

Das Projektmanagement ist eigenständig gegenüber der bestehenden Fleet-Control-Desk-Designstudie. Die Designstudie bleibt in `design/fleet-control-desk/`; ein Projektmanagement-Desk ist keine MT5-Liveanbindung.
