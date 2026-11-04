# Legal & Lizenzen – verbindliches Projektregister

Aus der Desk-Vorlage übernommener Pflegeworkflow, 19.09.2026. [Register öffnen](http://127.0.0.1:43120/legal).
Gilt für **Tradegazing Office und Tradegazing Office Desk**, einschließlich Konzepten, Marketing,
Buildwerkzeugen und geplanten, noch nicht verwendeten Anbietern.

## Eine gemeinsame Ablage

Das Register verwendet die bestehende Context-Core-Datenbank: Einträge mit
`LEGAL-LICENSE` werden in einer eigenen Desk-Ansicht angezeigt. Keine zweite
Liste mit abweichendem Prüfstand. Website, HTTP/stdio/WebMCP haben dieselbe
Validierung, Quellen, Versionssperre und unveränderliche Änderungshistorie.
Schema 2 und bestehende Backups bleiben gültig; keine Migration nötig.

Original-Lizenztexte und Notice-Dateien bleiben bei den betroffenen Dateien oder
unter `docs/legal/evidence/`. Detaillierte Bestände dürfen als versioniertes
Manifest verlinkt werden, wenn jede enthaltene Komponente einzeln auffindbar ist.
Rechnungen, Kontodaten, private Verträge und Lizenzschlüssel niemals in Git oder
in das Log kopieren. Im Register nur eine interne Beleg-ID und Zuständigkeit
notieren; Original privat aufbewahren. Keine privaten Dateien über die Website
ausliefern. Quellenpfade sind Referenzen, keine automatische Dateiarchivierung. Projektdateien werden als lokale Referenzen dargestellt. Remote: https://github.com/matthiaspape/tradegazingoffice.git. Lokale Dateien können noch unveröffentlicht sein; Quellen werden daher als Pfad dargestellt.

## Was immer zu erfassen ist

Vor erstmaliger Übernahme, Kauf oder Verwendung und bei jeder relevanten Änderung:

- Software/Engine, Erweiterungen, direkte und transitive Abhängigkeiten,
  eingebettete Bibliotheken, Build-/Editorwerkzeuge getrennt vom ausgelieferten Produkt.
- Modelle, Texturen, Bilder, Icons, Fonts, Musik, Geräusche, Samples, Texte und
  Daten – auch Platzhalter, eigene Erzeugnisse und abgeleitete Inhalte.
- KI-Inhalte: Werkzeug/Modell, Erzeugungsdatum, Promptnachweis, alle Eingangsquellen
  und Bearbeitungen, damaliger Vertrag/Tarif; keine pauschale Exklusivität ableiten.
- Namen, Marken, Anbieterbedingungen, Store-/Plattformbedingungen und offene
  Fragen zu Märkten, Nutzungsumfang oder widersprüchlichen Lizenzangaben.

Pro Gegenstand oder sauber abgegrenzter manifestierter Gruppe festhalten:
stabile Kennung, Dateien/Version/Hash, Herkunft/Urheber/URL und Datum, konkreter
Einsatz (Anwendung/Desk/Konzept/Marketing, Plattformen/Märkte), Lizenz-/Vertragsfassung,
Tarif/Laufzeit, lokale Nachweise oder private Beleg-ID, kommerzielle Nutzung,
Bearbeitung, Einbettung/Weitergabe, Einschränkungen, genauer Credit-/Notice-Text
und dessen Einbauort. Zusätzlich Prüfdatum, prüfende Person, Begründung und
erneuter Prüfanlass sowie offene Fragen, nächste Aktion und Zuständigkeit.
Unbekanntes ausdrücklich „offen“; einen leeren Wert nicht als Erlaubnis auslegen.

## Prüfstand und Fragen

Jeder Registereintrag hat `LEGAL-LICENSE` und genau einen dieser Tags:

| Rechteprüfstatus | Bedeutung |
| --- | --- |
| `RIGHTS-OPEN` | Prüfung offen; Belege können bereits teilweise vorhanden sein |
| `RIGHTS-EVIDENCED` | Rechte für den **konkret benannten** Einsatz mit Quellen und Begründung belegt |
| `RIGHTS-BLOCKED` | Für diesen Einsatz nicht verwenden; Grund und mögliche Alternative notieren |

Der normale Wissensstatus ist davon unabhängig. `CONFIRMED` heißt hier
„Dokumentierter Stand“, **nicht** automatisch rechtlich freigegeben. Eine belegte
Feststellung „Vertrag fehlt“ darf CONFIRMED + RIGHTS-OPEN sein. Für
RIGHTS-EVIDENCED verlangt die Anwendung CONFIRMED, Bestätigungsbegründung und
mindestens eine Dokument-/Webquelle; ob diese tatsächlich den Einsatz deckt,
muss die bearbeitende Person prüfen. Die Software erteilt keine Rechtsfreigabe.

Lizenzdatensätze normalerweise `kind: REFERENCE`, offene Klärungsfragen
`kind: QUESTION, status: OPEN`. Gelöste Fragen historisch erhalten und auf den
belegten Ergebnisdatensatz verweisen; keine ungelöste Frage still schließen.
Abgelöste Fassungen `SUPERSEDED` oder Version im bestehenden Eintrag nachführen;
alte Belege bleiben erhalten. Das Registertag darf nicht entfernt werden.

## Pflege in jeder Mission

1. **Start:** Register nach betroffenen Produkten/Dateien/Anbietern und Mission
   durchsuchen, vollständige Quellen lesen. Fehlende Einträge sofort anlegen,
   Rechtefragen als offene Notiz oder eigenständige Frage aufnehmen.
2. **Anlage jeder neuen Mission:** Zusätzlich zum Context-Core-Verweis einen
   Legal-Log-Link `http://127.0.0.1:43120/legal` mit diesem Pflegeablauf eintragen.
3. **Während der Arbeit:** Neue Assets/Abhängigkeiten, Versions-, Tarif-,
   Verwendungs- oder Rechteänderungen im selben Arbeitsblock erfassen. Genaue
   Lizenztexte sichern und geforderte Credits zum Einbau nachhalten. Bestehenden
   Eintrag lesen, mit `expected_version` und Begründung aktualisieren.
4. **Abschluss:** Tatsächlich hinzugefügte/geänderte Dateien und Paketstände
   gegen das Register prüfen. Eintrags-IDs, erfüllte Pflichten und verbleibende
   Fragen im MissionLog verlinken. Falls nicht relevant: „Keine neuen oder
   geänderten Lizenzgegenstände“ mit kurzem Prüfumfang dokumentieren.
5. **Vor Veröffentlichung oder geändertem Einsatz:** Enthaltene Dateien,
   Abhängigkeiten und Credits erneut abgleichen; fehlende Rechte klären oder
   betreffendes Material ersetzen. Ein Missionsabschluss ersetzt diese Prüfung
   nicht. Eine offene Releasefrage blockiert nicht automatisch unabhängige,
   bereits autorisierte Entwicklungsarbeit.
6. Ergebnisse zurücklesen, Core-Verweise nachführen, Desk sichern; versionierte
   Belege/Manifeste und Dokumentation regulär committen/pushen.

## MCP-Verwendung

Bestehende Werkzeuge genügen; kein weiterer MCP-Server oder Schlüssel.
Aktuelle Schemas über `tools/list`; bei alten Sitzungsschemas den Adapter nutzen.

```json
{"tag":"LEGAL-LICENSE","status":"ALL","limit":100,"offset":0}
```

Argumente für `list_context_entries`. `next_offset` weiterblättern. Zusätzliche
Filter: `query`, `mission_id`, `topic` und `legal_status: "RIGHTS-OPEN"`.
Danach `get_context_entry` mit `entry_id`, einschließlich Quellen und Verlauf.
Anlage mit `create_context_entry`, Änderungen mit `update_context_entry`.

```json
{
  "key": "legal-beispiel-asset",
  "title": "Beispielasset – Herkunft und Lizenz",
  "summary": "Für die Anwendung vorgesehen; Einbettungsrechte noch offen.",
  "content": "Datei/Version: …\nAnbieter/Datum: …\nEinsatz: …\nLizenz/Belege: offen\nCredits: offen\nNächste Aktion/Zuständigkeit: …",
  "kind": "REFERENCE", "topic": "ART", "status": "PROPOSED",
  "tags": ["LEGAL-LICENSE", "RIGHTS-OPEN"],
  "sources": [{"type":"DOCUMENT","ref":"docs/asset-herkunft.md","label":"Zu prüfender Herkunftsnachweis"}],
  "change_reason": "Neue Quelle vor Verwendung erfasst."
}
```

Die Vorlage enthält Platzhalter, keine tatsächlichen Nachweise. Im Formular
steht eine ausführlichere Vorlage bereit. Keine Belege oder Zustimmungen erfinden.

## Erstbestand und laufende Inventur

Der Erstbestand umfasst die Desk-Vorlage und die übernommenen Desk-Pakete.
Das originale Tradegazing-Logo wird auf ausdrücklichen Nutzerauftrag im Office-Desk weiterverwendet. Herkunft und identische SVG-Dateien sind in ADAPTATION.md dokumentiert; daraus folgt keine eigenständige neue Markenrechtsprüfung.

`node ops/license-inventory.mjs` erzeugt `docs/legal/npm-inventory.json` aus dem
aktuellen Lockfile und archiviert vorhandene oberste LICENSE/COPYING/NOTICE/
COPYRIGHT-Dateien inhaltstreu nach SHA-256. Das Manifest listet jede aufgelöste
Paketposition samt Version, Lizenzdeklaration, Bezugs-URL/Integrität und Belegpfad.
Optionale nicht installierte Pakete und fehlende Belege bleiben OPEN. Deklarierte
SPDX-Angaben sind keine Prüfung; verschachtelte Zusatzlizenzen und tatsächlich
ausgelieferte Bestandteile gesondert prüfen. Alte Belegdateien nicht löschen.
Nach Dependency-Änderungen neu erzeugen, Diff prüfen, Registereintrag aktualisieren.
