# Oberfläche des Tradegazing Office Desk

- Das Desk umfasst Projektmanagement und die lesende Fleet-Control-Demo. Fleet-Beispieldaten bleiben von Projektdaten und Live-Daten getrennt.
- Originale Tradegazing-SVGs aus `public/brand/` verwenden; Logo für hell/dunkel, Teal/Navy und gemeinsame Navigation konsistent halten. Keine Marke neu zeichnen oder fremde Assets erfinden.
- Controlling steht vor Projektmanagement. Fleet Control zeigt fiktive Daten unter `/` und `/controlling/fleet-control`. Abdeckung gehört direkt an jede Kennzahl. Veraltete Quellen bleiben sichtbar, ihre Werte sind aus aktuellen Summen ausgeschlossen. Projektmanagement enthält Mission Log (`/missions`), Context Core, Bug Board und Legal & Lizenzen.
- Für spätere gemeinsame UI/UX-Arbeit das Zielbild in `docs/TradegazingOfficeDeskUX.md` lesen. Die zugehörige Designvorschau zeigt ausschließlich fiktive Beispieldaten.
- Browser vor Fach-API-Zugriffen mit `ensureDeskSession` verbinden. Keine Bearer-Schlüssel, SQLite- oder Servermodule im Clientgraph. Reine Werkzeugschemas dürfen geteilt werden.
- Formulare semantisch und per Tastatur bedienbar halten. Lade-, Leer-, Fehler- und Konfliktzustände zeigen; Schreibfehler nicht als Erfolg ausgeben. Nach Speicherung relevante Daten zurücklesen.
- Bugs benötigen getrennte Risiko-/Wahrscheinlichkeits-/Belegangaben und konkrete Laufwirkung. Farben ergänzen Text; ein Status erteilt keine Freigabe.
- Betroffene Browserabläufe und schmale Ansichten prüfen; Testdaten ausschließlich in eigener isolierter Office-Testablage halten. Nicht ungeprüfte WebMCP-Host-Kompatibilität behaupten.
