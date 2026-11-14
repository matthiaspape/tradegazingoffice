# OFFICE-BUG-0031 · zuverlässige Frischeanzeige

Stand 14.11.2026 · Office-Mission 9 · gezielte Korrektur der Office-Cachekette

## Fehler und Korrektur

Im Ausgangsstand `2239dbc` lieferte ein fälliger Abruf mit vorhandenem Office-Cache sofort den alten Stand. Der Refresh lief erst im Hintergrund; der Browser las das Ergebnis regulär erst fünf Minuten später. Ein knapp vor 300 Sekunden eintreffender Browserpoll konnte zusätzlich einen ganzen Zyklus auslassen. Nach 20 Minuten Pause war die erste Anzeige daher veraltet, obwohl die Quelle frische Daten liefern konnte.

Der Fehler wurde vor der Reparatur mit künstlicher Uhr reproduziert. Die Regression für den ersten Aufruf nach 20 Minuten ergab `STALE` statt `CURRENT`; auch der gesunde Zeitraum zwischen versetzten Polls überschritt die alte Frischegrenze. Das bestehende Risiko bleibt MITTEL. Die gezielte Reparatur wurde ausdrücklich beauftragt, nicht durch eine Hochstufung begründet.

Die Korrektur bleibt in der Office-Schicht:

- Der Office-Refresh wird nach **240 Sekunden** fällig, vor dem regulären Browserabruf nach 300 Sekunden.
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

Der zusätzliche volle Office-Cachezyklus entfällt durch das kurze Warten beziehungsweise begrenzte Nachholen. Die Frischegrenze wird somit nicht allein erhöht, um einen unverändert alten Cache grün darzustellen. Nach 20 Minuten Pause muss tatsächlich ein neuer Quellstand zurückkommen. Ein alter Stand nach Fehler bleibt mit unveränderter Messzeit STALE.

## Gezielte Belege

- **16 gezielte Node-Tests bestanden:** fünf neue Zeitregressionen und elf vorhandene Adapter-/Autorisierungsfälle. Lange Pause, zehn leicht versetzte Pollzyklen, Gesundheitsbudget zwischen Polls, blockierter Refresh, zusammengefasste Anfragen, Nachholen, Ausfall, Originalzeiten und größeres konfiguriertes Kontobudget abgedeckt.
- **Vier isolierte Browserabläufe bestanden:** Nachholen nach zwei Sekunden statt nach fünf Minuten, Ende nach sechs erfolglosen Nachholversuchen, Ende beim Verlassen von Fleet Control und sofortiger Abruf bei erneuter Sichtbarkeit nach 20 Minuten Pause. Playwright-Uhr und ausdrücklich synthetische API-Antworten, keine native Langzeitmessung. Keine JavaScript-Fehler. [Ergebnisse](mission-9/browser-checks.json), [Ablauf](../tests/fleet-freshness-browser.cjs).
- Typecheck und Produktionsbuild bestanden. Der bekannte Middleware-Hinweis ist unverändert.

Unveränderte M8-Prüfungen und Betriebsbelege werden übernommen. Keine neue Gesamtqualifikation, keine Windows-/EA-/Retentionsprüfung. Die alten Nebenbefunde OFFICE-BUG-0030/0032/0033 bleiben zurückgestellt; diese Mission repariert sie nicht.

## Unabhängige Prüfung und Übernahme

Dreamteam prüft den neuen Timingstand einschließlich der relevanten Quellen und tatsächlichen Testbelege. Entscheidung und Paketbindung werden hier nach Eingang ergänzt. Historische M8-Reviewentscheidungen bleiben historisch erhalten.
