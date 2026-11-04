# Context Core

Der Context Core ist die kompakte, aktuelle Wissensbasis für Tradegazing Office.
Webseite: [Context Core öffnen](http://127.0.0.1:43120/context).
Er gehört zum bestehenden Desk und verwendet dieselbe lokale Datenbank,
Authentifizierung, Sicherung und MCP-Verbindung `tradegazing_office_desk`.

## Was wohin gehört

| Ablage | Verbindlicher Inhalt |
| --- | --- |
| AGENTS.md | Arbeitsregeln, Verbindung und Einstieg für Chats |
| MissionLog | Aufgaben, offene Arbeitsfragen, Fortschritt, Untersuchung und Ergebnis |
| Legal & Lizenzen | Lizenzen, konkrete Nutzungsrechte, Belege, Credits und offene Rechtsfragen; eigene Ansicht auf Core-Einträge mit LEGAL-LICENSE |
| Context Core | Kompakte aktuelle Aussagen, ihre Gültigkeit, Begründung und Herkunft |
| Tradegazing Office-Repository | Ausführliche Produktkonzepte, technische Entwürfe und Implementierung |

Eine ausführliche Spezifikation bleibt in ihrer Projektdatei. Der Core hält
dazu einen kurzen Verweis oder die übergreifende Entscheidung fest. Nicht den
gesamten Chat, alle Logs oder vollständige Dokumente zusätzlich kopieren.
`../../README.md` dokumentiert den Ausgangspunkt; aktuelle
Entscheidungen werden im Core gepflegt. Regeltexte bleiben in AGENTS.md und
Workflow-Dateien; Wissenseinträge dürfen sie nicht überschreiben.

## Einträge und Gültigkeit

Jeder Eintrag hat eine unveränderliche ID und eindeutige Kennung (`key`), einen
Titel, eine Kurzfassung (max. 500 Zeichen), eine optionale Erläuterung, Art,
Thema, Tags und mindestens eine Quelle. Die Kennung verhindert erneute Anlage
desselben Eintrags bei wiederholten MCP-Aufrufen. Vor Anlage trotzdem nach
ähnlichem Inhalt suchen; unterschiedliche Kennungen können dasselbe Thema meinen.

Arten: Projektvision, Entscheidung, Rahmenbedingung, Begriff, Dokumentverweis und
offene Frage. Themen reichen von Arbeitsabläufen und Buchhaltung bis Design,
Architektur, Produktumfang und Zusammenarbeit.

| Status | Bedeutung |
| --- | --- |
| PROPOSED · Vorschlag | Idee, Hypothese oder Empfehlung, die noch nicht gilt |
| CONFIRMED · Bestätigt | Belegte Aussage oder tatsächlich bestätigte Entscheidung; `confirmation_note` nennt die Grundlage |
| OPEN · Offen | Ungeklärte Frage; nur für die Art QUESTION |
| SUPERSEDED · Überholt | Zurückgezogener, beantworteter oder ersetzter Stand; bleibt lesbar, wird nicht mehr bearbeitet |

Eine offene Frage ist keine bestätigte Antwort. Eine erfolgreiche Recherche
oder eine abgeschlossene Mission bestätigt eine Produktentscheidung nicht
automatisch. Nutzerentscheidungen nur als bestätigt eintragen, wenn der Auftrag
oder das Gespräch diese Bestätigung tatsächlich enthält. Quellenbefunde und
Interpretationen unterscheiden; eine Webadresse allein belegt keine Aussage.

Nur wenige bestätigte Grundlagen mit `is_core: true` in den Projektüberblick
aufnehmen. Diese Grundlagen werden auch bei einer gezielten Missionsabfrage
mitgeliefert. Vorschläge, Fragen und überholte Einträge sind dort ausgeschlossen.

## Herkunft

`sources` enthält eine bis acht Quellen als `{type, ref, label}`:

- `MISSION`: `ref` ist die existierende stabile Missions-ID; in der Webseite
  direkt mit dem zugehörigen MissionLog verknüpft.
- `DOCUMENT`: Repositorypfad ab `docs/`, `design/`, `assets/` oder `TradegazingOfficeDesk/`, zum Beispiel
  `docs/FleetControlDeskKonzept.md`. Der Core speichert einen Verweis und liest
  keine beliebigen Dateien. Existenz und Inhalt prüft der bearbeitende Chat
  im Repository; eine gespeicherte Referenz ist kein automatischer Dateinachweis.
- `WEB`: vollständige http(s)-Adresse ohne Zugangsdaten. Die Anwendung ruft
  die Quelle nicht automatisch ab und bewertet sie nicht automatisch.
- `USER`: konkrete Nutzervorgabe mit Gespräch/Datum und kurzem Inhalt.
  Keine Zustimmung erfinden. Die Herkunft muss für spätere Chats nachvollziehbar sein.

Bei CONFIRMED ist zusätzlich eine nichtleere `confirmation_note` erforderlich.
Auch eine inhaltliche Änderung bestätigten Wissens muss diese Grundlage
ausdrücklich mitgeben. Die Technik prüft Vollständigkeit; die sachliche
Quellenprüfung bleibt Aufgabe des bearbeitenden Chats.

## Einstieg für jeden neuen Chat

1. `get_project_context` aufrufen, bei bekannter Mission mit `mission_id`.
2. Für relevante Aussagen `get_context_entry` lesen: Volltext, Quellen,
   Bestätigungsgrundlage und Version. Quellen bei davon abhängigen Entscheidungen
   prüfen, statt allein auf eine Kurzfassung zu vertrauen.
3. Die Mission einschließlich Logbuch über `get_mission` lesen. Fehlendes Wissen
   mit `list_context_entries` nach Thema oder Suchwörtern gezielt suchen.
4. Bei `truncated` oder `next_offset` weitere passende Einträge lesen.
   Keine abgeschnittene Antwort als vollständigen Wissensbestand behandeln.
5. Bestätigtes als geltenden Stand verwenden. Vorschläge und offene Fragen
   ausdrücklich als solche behandeln; überholte Fassungen nur als Historie.

MCP macht Wissen abrufbar, lädt es aber nicht automatisch in jeden Chat.
Der Einstieg ist deshalb in den AGENTS.md-Dateien verankert. Der Core ist eine
kuratierte Ablage mit Textsuche, ohne zusätzliche Modelle, Embeddings oder Dienste.

## Wissen pflegen

Den Core laufend bei relevanten Entscheidungen, Planänderungen und dauerhaften
Erkenntnissen im selben Arbeitsblock aktualisieren; nicht bis zum Missionsende
warten. Alle konkret geplanten Missionen gehören zugleich in den MissionLog.
Eine Chatantwort ersetzt weder Missionsanlage noch Wissenspflege
(übernommener Desk-Workflow).

Jede Mission verlinkt diesen Core über einen eigenen Logbucheintrag mit
`http://127.0.0.1:43120/context` und erklärt Einstieg, laufende Wissenspflege,
Versionsschutz, Quellenprüfung sowie Rücklesen/Sichern. Der Pflichtschritt für
neue Missionen ist in `MISSION_WORKFLOW.md` beschrieben; ein Ergebnislink wird
dafür nicht überschrieben.

Nach einer Mission oder einer bestätigten Entscheidung prüfen, ob daraus
dauerhaft relevantes Wissen entsteht. Vorhandene Einträge gezielt ergänzen;
kurzlebige Arbeitsnotizen im MissionLog belassen. Bei widersprüchlichen Aussagen
Quellen und aktuellen Stand abgleichen, statt beide still als bestätigt zu führen.

- Anlage benötigt Quellen und `change_reason`; Standard ist PROPOSED bzw.
  OPEN für QUESTION. CONFIRMED ausdrücklich angeben und belegen.
- Vor Änderungen `get_context_entry`; Updates benötigen die gelesene
  `expected_version` sowie eine `change_reason`.
- Ein Versionskonflikt überschreibt nichts. Neu lesen und bewusst abgleichen;
  keine automatische Wiederholung mit einer neuen Versionsnummer.
- Jede erfolgreiche Änderung speichert eine vollständige unveränderliche Fassung
  mit Autor, Datum und Begründung. Frühere Quellen bleiben Teil dieser Fassung.
- Bei Neubewertung kann bestätigtes Wissen wieder PROPOSED werden; es fällt dann
  aus dem Projektüberblick und die frühere Bestätigung bleibt nur in der Historie.
- Ersetzte oder zurückgezogene Inhalte auf SUPERSEDED setzen. Optional
  `superseded_by` mit der ID eines aktuell bestätigten Nachfolgers angeben.
  Der überholte Eintrag ist anschließend unveränderlich. Nachfolger können später
  ebenfalls ersetzt werden; die Verweiskette bleibt nachlesbar.
- Geschriebene Ergebnisse zurücklesen und nach einem abgeschlossenen Schreibblock
  bei ausdrücklich gewünschter Sicherung den manuellen Backupbefehl verwenden. Alle Wissensfassungen sind darin enthalten.

## MCP-Beispiele

Im Desk-Repository, mit dem eingerichteten Node-Runtimepfad falls nötig:

```sh
node ops/mcp-call.mjs get_project_context
node ops/mcp-call.mjs list_context_entries - <<'JSON'
{"topic":"TECHNOLOGY","status":"CURRENT","limit":20}
JSON
```

Argumente einer Anlage:

```json
{
  "key": "prototyp-warenumfang",
  "title": "Funktionsumfang des Prototyps",
  "summary": "Für den ersten Prototyp werden drei Ansichten vorgeschlagen.",
  "kind": "DECISION",
  "topic": "PRODUCT",
  "status": "PROPOSED",
  "sources": [{"type":"MISSION","ref":"ID_DER_MISSION","label":"Produktumfang klären"}],
  "change_reason": "Begrenzten Umfang als prüfbaren Vorschlag für die Konzeptphase festhalten."
}
```

Alle Antworten aus `get_project_context` und `list_context_entries` enthalten
Kurzfassungen und `source_count`; Volltexte und Quellen kommen gezielt über
`get_context_entry`. Die Textsuche berücksichtigt alle Suchwörter und durchsucht
Titel, Kurzfassung, Erläuterung, Tags und Quellen ohne Beachtung der Großschreibung.
`list_context_entries` filtert `mission_id` exakt nach Quellenverknüpfung;
`get_project_context` ergänzt passende gemeinsame Tags. Das ist eine transparente
Relevanzregel, keine semantische Suche und keine Garantie auf Vollständigkeit.

## Betrieb und Migration

Seit Desk 0.3 nutzt der Core Schema 2 mit `context_entries` und
`context_revisions`. Neue Installationen werden explizit durch `npm run setup`
eingerichtet und bleiben leer. Bestehende Installationen werden mit
`npm run migrate` erweitert. Der Befehl legt vorher eine geprüfte Sicherung an;
die Schemaänderung läuft in einer Transaktion und ist wiederholbar.
Serverstart, Lesezugriffe und MCP migrieren oder befüllen keine Daten.

Für ein Update: Anwendung bauen, bestehenden Hintergrundprozess stoppen,
`npm run migrate`, anschließend `npm run launch`. Missionsdaten und Zugänge
bleiben erhalten. Restore akzeptiert Schema 1 und 2 und überschreibt kein
bestehendes Ziel. Eine wiederhergestellte Sicherung mit Schema 1 benötigt die
explizite Migration, bevor ihr Context Core genutzt werden kann.

## Legal-Register

[Legal & Lizenzen](http://127.0.0.1:43120/legal) verwendet dieselben Einträge und
Versionen, keine Kopien. `tag: "LEGAL-LICENSE"` filtert das Register exakt.
Der Rechteprüfstatus ist vom Wissensstatus getrennt; CONFIRMED heißt hier nur
„Dokumentierter Stand“. Regeln, Vorlage und Pflegepflichten in
[LEGAL_LICENSE_LOG.md](LEGAL_LICENSE_LOG.md).
