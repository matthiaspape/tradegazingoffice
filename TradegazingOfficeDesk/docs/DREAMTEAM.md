# Unabhängige Entwicklungsprüfung mit Dreamteam

Tradegazing Office nutzt das vorhandene generische Dreamteam-Plugin. Der aufrufende Agent entwickelt und testet; der jeweils andere native Anbieter prüft das gezielt übergebene Textpaket. Keine Projekt-/Aufgabenprofile oder zweite Reviewengine anlegen.

- Aufgabe, Kriterien, tatsächliche Änderungen, relevante vollständige Quellen und ehrliche Testbelege übergeben. Einen stabilen Request-Key verwenden und die genaue Anfrage privat unter `.office-desk-data/dreamteam/` sichern.
- Nach Annahme Review-ID, Schleifen-ID und Paket-SHA256 im Missionslog festhalten. Bei Antwortverlust denselben unveränderten Auftrag wiederverwenden.
- Feedback lesen und anhand konkreter Wirkung/Wahrscheinlichkeit einstufen. Nur wesentliche beziehungsweise hohe notwendige Korrekturen erhalten weitere gezielte Tests/Reviewrunden. Nichtblockierende mittlere/niedrige Funde ins Board; keine Schleife für ein APPROVED-Etikett.
- Ein erforderlicher Nachfolger verknüpft previous_review_id und beantwortet jede Finding-ID. Tatsächliche Entscheidungen und ungeprüfte Bereiche bleiben erhalten.
- Nutzerpausen respektieren; fremde Aufträge nicht starten oder steuern. Ein Review führt keine Projektbefehle/Tests aus und erteilt keine zusätzlichen Merge-, Deployment-, Handels- oder Neustartrechte.
- Keine Schlüssel, privaten Belege oder vollständigen Archive übergeben. APPROVED gilt ausschließlich für das gebundene Paket und ist keine Abnahme ausgelassener Dateien oder selbst ausgeführter Integrationstests.

MCP-Funktionen: get_runtime_status, start_review, get_review_status, get_review_feedback. Aktuelle Schemas und der installierte Skill gelten; Versionen oder lokale Runtimepfade hier nicht als dauerhaft festlegen.
