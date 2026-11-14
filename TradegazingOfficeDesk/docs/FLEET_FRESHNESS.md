# OFFICE-BUG-0031 · zuverlässige Frischeanzeige

Stand 14.11.2026 · Office-Mission 9 · gezielte Korrektur der Office-Cachekette

## Fehler und Korrektur

Im Ausgangsstand `2239dbc` lieferte ein fälliger Abruf mit vorhandenem Office-Cache sofort den alten Stand. Der Refresh lief erst im Hintergrund; der Browser las das Ergebnis regulär erst fünf Minuten später. Ein knapp vor 300 Sekunden eintreffender Browserpoll konnte zusätzlich einen ganzen Zyklus auslassen. Nach 20 Minuten Pause war die erste Anzeige daher veraltet, obwohl die Quelle frische Daten liefern konnte.

Der Fehler wurde vor der Reparatur mit künstlicher Uhr reproduziert. Die Regression für den ersten Aufruf nach 20 Minuten ergab `STALE` statt `CURRENT`; auch der gesunde Zeitraum zwischen versetzten Polls überschritt die alte Frischegrenze. Das bestehende Risiko bleibt MITTEL. Die gezielte Reparatur wurde ausdrücklich beauftragt, nicht durch eine Hochstufung begründet.

Die Korrektur bleibt in der Office-Schicht:

- Erfolgreiche Office-Antworten haben **keine zusätzliche Cachefrist**. Jeder Abruf liest den vorhandenen Mac-Reader; dieser bündelt und puffert bereits die SSH-Abholung. Dadurch kann weder eine zweite Ansicht noch ein Sichtbarkeitswechsel den Office-Cache gegenüber dem eigenen Fünf-Minuten-Takt verschieben. Office behält den letzten Stand ausschließlich als Ausfallreserve und bündelt gleichzeitig laufende Anfragen.
- Bei vorhandenem Cache wartet die Anfrage **höchstens acht Sekunden** auf den bereits zusammengefassten Refresh. Ein schneller Abruf liefert direkt den neuen Stand. Eine kalte Quelle ohne Cache behält die bestehende begrenzte Erstladezeit des Readers.
- Läuft der Abruf danach weiter, nennt die Antwort `refreshing: true`. Der Browser holt das Ergebnis nach zwei Sekunden nach, höchstens sechsmal. Danach bleibt der normale Fünf-Minuten-Takt. Nach erfolgreichem Abschluss oder einem terminalen Fehler endet das Nachholen.
- Gleichzeitige Office-Anfragen verwenden denselben laufenden Hostabruf. Der Client startet keine überlappenden Abrufe. Verlassen der Ansicht beendet Timer und Sichtbarkeitslistener.
- Beim erneuten Sichtbarwerden des Desk wird nach bestehendem Sitzungseinstieg sofort ein Abruf angestoßen. Das eröffnet keine neue Sitzung und ändert die zwölfstündige Sitzungsregel nicht.
- Nach einer Antwort wird die lokale Anzeigeuhr aktualisiert. Quelle und Messzeiten werden nicht umgeschrieben. Ein langsamer oder fehlgeschlagener Abruf erhält den letzten Stand; veraltete Originale bleiben veraltet.

## Nachvollziehbares Frischebudget

Der Mac- und Windowsbetrieb bleibt unverändert. Deshalb muss das Anzeigealter auch die legitime Pufferung der vorhandenen Kette abdecken:

| Datenart | Konservative Kette zwischen erfolgreichen Browserabrufen | Effektive Grenze |
| --- | --- | --- |
| VPS-Health | bis 300 s Mac-Cache + 300 s Browserintervall + 15 s lokale Hostmessung + 45 s Transport-/Taktreserve | **660 s** |
| Kontoaufnahme | bis 300 s EA-Export + 300 s Mac-Cache + 300 s Browserintervall + 60 s Transport-/Taktreserve | **mindestens 960 s** |

Ein größeres registriertes Konto-Frischefenster bleibt erhalten. Die private Registrierung wird nicht umgeschrieben. Die Mindestgrenzen beschreiben die bestehende Transportkette; sie machen unqualifizierte Handelskennzahlen oder EA-Gesamtstatus nicht verfügbar. Beobachtungszeit, Fehlerzustand und Datenalter bleiben die Grundlage. Ein fehlgeschlagener Backendabruf beziehungsweise ein bereits vom Mac gemeldeter STALE-Zustand wird auch innerhalb des Altersbudgets als veraltet gezeigt.

Der Office-Cache trägt im erfolgreichen Pfad keine weitere Cachefrist bei. Das kurze Warten beziehungsweise begrenzte Nachholen verhindert den zusätzlichen vollen Browserzyklus. Die Frischegrenze wird somit nicht allein erhöht, um einen unverändert alten Cache grün darzustellen. Nach 20 Minuten Pause muss tatsächlich ein neuer Quellstand zurückkommen. Ein alter Stand nach Fehler bleibt mit unveränderter Messzeit STALE.

## Gezielte Belege

- **17 gezielte Node-Tests bestanden:** sechs neue Zeitregressionen und elf vorhandene Adapter-/Autorisierungsfälle. Lange Pause, zehn leicht versetzte Pollzyklen, zwei Clients mit 100 Sekunden Phasenversatz über zehn Zyklen, Gesundheitsbudget bis vor den jeweils nächsten Poll, blockierter Refresh, zusammengefasste Anfragen, Nachholen, Ausfall, Originalzeiten und größeres konfiguriertes Kontobudget abgedeckt.
- **Vier isolierte Browserabläufe bestanden:** Nachholen nach zwei Sekunden statt nach fünf Minuten, Ende nach sechs erfolglosen Nachholversuchen, keine weiteren Abrufe nach vollständiger Dokumentnavigation zu Missionen und sofortiger Abruf bei erneuter Sichtbarkeit nach 20 Minuten Pause. Playwright-Uhr und ausdrücklich synthetische API-Antworten, keine native Langzeitmessung. Die Dokumentnavigation isoliert nicht die React-Cleanup-Funktion; eine solche Abnahme wird nicht behauptet. Keine JavaScript-Fehler. [Ergebnisse](mission-9/browser-checks.json), [damaliger Ablauf](https://github.com/matthiaspape/tradegazingoffice/blob/2854243/TradegazingOfficeDesk/tests/fleet-freshness-browser.cjs).
- Typecheck und Produktionsbuild bestanden. Der bekannte Middleware-Hinweis ist unverändert.

Unveränderte M8-Prüfungen und Betriebsbelege werden übernommen. Keine neue Gesamtqualifikation, keine Windows-/EA-/Retentionsprüfung. Die alten Nebenbefunde OFFICE-BUG-0030/0032/0033 waren im M9-Stand zurückgestellt und sind inzwischen durch den gesonderten Nutzerauftrag in [Mission 11](mission-11/VALIDATION.md) gezielt behoben. **OFFICE-BUG-0034 / M9-002, NIEDRIG** hielt im M9-Stand die fehlende isolierte React-Cleanup-Prüfung und die Bindung des Testskripts an lokale Browserpfade fest. Der ausdrücklich beauftragte Nachtrag in [Mission 10](FLEET_CLEANUP_TEST.md) behebt diesen Testbefund mit echter unveränderter React-Komponente, sechs wirksamen Negativkontrollen und portabler Browserauflösung; gezieltes Dreamteam-Review APPROVED 4/4. Nutzungshäufigkeit außerhalb dieses Mac unbekannt; kein beobachteter Fehler der aktuellen Dokumentnavigation. Die damalige Rückstellung und Reviewentscheidung bleiben historisch erhalten; Mission 10 ist der gesonderte Nutzerauftrag zur Nachbesserung.

## Unabhängige Prüfung und Übernahme

Dreamteam-Runde 1 `8e9b7de4594441d9897e79ab3dbc070d`, Paket `8ed3bfc784f270dc0b1cfa7897e0130cda46aae3af40169b1fffddef029354a4`: **CHANGES_REQUESTED**, C1/C3/C5 bestanden, C2/C4 offen. Der direkt zu OFFICE-BUG-0031 gehörende Phasenfehler M9-001 wurde vor der Korrektur mit zwei Clients reproduziert und durch Wegfall der erfolgreichen Office-Cachefrist korrigiert. [Originalfeedback](mission-9/review-round1.json).

Die verknüpfte Dreamteam-Runde 2 `2dc0a82d9fc740618236038ba53e919a`, Paket `eef0bb71c29e0adfddf3fa83f28966b6576732cf6ace1886e07e5050b77ed355`, bestätigt **M9-001 als behoben**: C1/C2/C3/C5 bestanden. Die Entscheidung bleibt **CHANGES_REQUESTED, 4/5**, weil C4 noch die isolierte React-Cleanup-Prüfung fehlt. Der einzige offene Befund M9-002 bleibt als OFFICE-BUG-0034 NIEDRIG zurückgestellt; die Cleanup-Funktion ist laut Quellprüfung vollständig, ein Laufzeitfehler wurde nicht beobachtet. Claude hat die Entwicklerbelege unabhängig geprüft, aber selbst keine Tests ausgeführt. [Originalfeedback](mission-9/review-round2.json). Die historische M8-Entscheidung bleibt erhalten. Keine weitere Runde allein für den niedrigen Nebenbefund.

Der Laufzeitstand `2854243` wurde am 14.11.2026 im bereits ausdrücklich freigegebenen regulären Office Desk auf 43120 aktiviert. Erster authentisierter Betriebsabruf um 12:21:58 UTC: **HTTP 200, NATIVE, ein Host, CURRENT, refreshing=false**. Betriebsquittung privat unter `.office-desk-data/dreamteam/mission-9-activation.json`. Der Mac-App-Einstieg bleibt auf diesem Desk. Eigene QA-Instanz auf 43121 beendet und ihre leere Ablage entfernt; reguläre Office-Daten, Macbackend und VPS-Dienste bleiben erhalten. OFFICE-BUG-0031 ist damit gezielt behoben; Mission 9 kann auf den vorhandenen Belegen abgeschlossen werden.
