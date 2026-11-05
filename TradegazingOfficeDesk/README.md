# Tradegazing Office Desk

Lokales Projektmanagement für Tradegazing Office: **Mission Log, Context Core, Bug Board und Legal & Lizenzen**. Basis ist das Aunerio-Desk; Bug-Board-Funktionen und Originalmarke stammen aus Tradegazing. [Übernahmeumfang](docs/ADAPTATION.md).

[Fleet Control](http://127.0.0.1:43120/) · [Mission Log](http://127.0.0.1:43120/missions) · [Wissenskern](http://127.0.0.1:43120/context) · [Bug Board](http://127.0.0.1:43120/bugs) · [Legal](http://127.0.0.1:43120/legal)

**Controlling** steht vor **Projektmanagement**. Fleet Control ist die Startseite unter `/` und über den Untereintrag unter `/controlling/fleet-control` erreichbar. Die Seite dient vorerst als Platzhalter. **Projektmanagement** enthält Mission Log, Context Core, Bug Board und Legal & Lizenzen.

Das [gemeinsame UI/UX-Zielbild](../docs/TradegazingOfficeDeskUX.md) und die [statische Vorschau](../design/tradegazing-office-desk/index.html) beschreiben die geplante Gestaltung beider Bereiche.

## Start

Node.js 24+ und npm bei einer frischen Installation:

```sh
npm ci --ignore-scripts
npm run setup
npm run build
npm run launch
```

Auf diesem Mac findet `./desk` bei Bedarf die gebündelte Node-Runtime:

```sh
./desk setup
./desk build
./desk launch
./desk typecheck
./desk test
./desk stop
```

Alternativ `Tradegazing Office Desk.command` doppelklicken; vorher müssen Setup, Abhängigkeiten und Build vorhanden sein. Der Launcher bindet ausschließlich `127.0.0.1:43120`.

## Eigene Daten und Grenzen

Standardablage: `../.office-desk-data/` im Repositoryhauptordner, von Git ausgeschlossen. `TRADEGAZING_OFFICE_DESK_HOME` wählt eine andere private Ablage; CLI, Server und MCP müssen denselben Wert verwenden. Enthalten sind `missions.sqlite`, `local-auth.json`, eigene Logs und optional manuelle Sicherungen. Aunerio- und Tradegazing-Daten und Schlüssel werden nicht übernommen.

Setup ist ausdrücklich und wiederholbar; eine neue Installation startet ohne Missionen, Wissen oder Bugs. Start und Lesezugriffe legen keine fachlichen Daten an. Missionen/Wissen/Bugs werden anschließend über die öffentlichen Werkzeuge gepflegt. Es gibt keine Provideranbindung, Handelssteuerung oder automatische Rechnungs-/Bankaktion.

Browser und MCP nutzen dieselbe Validierung und SQLite-Transaktionen. Signierte HttpOnly-/SameSite-Sitzung, eigener Bearer-Schlüssel und Loopback-/Originprüfung bleiben erhalten. Das Bug Board hat eigene IDs `OFFICE-BUG-0001` usw.; ein Forschungskatalog wird nicht kopiert. Fremde Origins und nicht authentisierte API-Zugriffe werden abgewiesen.

**Lokale Vertrauensgrenze:** Das übernommene Sitzungsbootstrap schützt gegen fremde Browserursprünge, identifiziert aber keine Person gegenüber anderen lokalen Prozessen. Ein lokaler Prozess kann die Bootstrap-Header selbst setzen und eine Browsersitzung erhalten. `actor: Matthias` bezeichnet diesen Browserkanal, keine nachgewiesene menschliche Handlung oder Freigabe. Insbesondere darf daraus keine steuerliche, finanzielle oder operative Zustimmung abgeleitet werden. Diese Grenze bleibt als OFFICE-BUG-0007 (MITTEL, Wahrscheinlichkeit unbekannt) dokumentiert; der Desk wird ausschließlich lokal betrieben.

## Schnittstellen und Pflege

- [MCP und CLI](docs/MCP.md): 16 Werkzeuge, ohne Shell- oder Prozesssteuerung.
- [Missionsworkflow](docs/MISSION_WORKFLOW.md), [Context Core](docs/CONTEXT_CORE.md), [Bug Board](docs/BUG_BOARD.md).
- [Dreamteam](docs/DREAMTEAM.md), [Legal & Lizenzen](docs/LEGAL_LICENSE_LOG.md), [Prüfbelege](docs/VALIDATION.md).
- [Unabhängiges Review und offene Befunde](docs/REVIEW.md): CHANGES_REQUESTED, keine vollständige Abnahme. Nicht hohe Nebenbefunde bleiben im eigenen Board sichtbar.

`./desk backup` erstellt eine manuelle lokale SQLite-Sicherung. `./desk restore SICHERUNG.sqlite NEUES_VERZEICHNIS` überschreibt nichts und rotiert den Schlüssel. Keine neuen automatischen Backups oder Cloudübertragungen.

Das portable `plugin.json`/`mcp.json` beschreibt den lokalen stdio-Adapter. Eine direkte MCP-Registrierung ist die Alternative; keine doppelte Installation. Eine MCP App/Extension oder Cloudveröffentlichung gehört nicht zu diesem Desk.
