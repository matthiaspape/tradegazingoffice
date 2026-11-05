# Oberfläche des Tradegazing Office Desk

- Das Desk dient dem Projektmanagement. Fleet Control Desk ist eine separate Trading-Journal-Designstudie; deren Beispieldaten sind keine Projektmanagement- oder Live-Datenquelle.
- Originale Tradegazing-SVGs aus `public/brand/` verwenden; Logo für hell/dunkel, Teal/Navy und gemeinsame Navigation konsistent halten. Keine Marke neu zeichnen oder fremde Assets erfinden.
- Controlling steht vor Projektmanagement. Fleet Control ist vorerst eine Dummy-Seite und sowohl als Startseite unter `/` als auch unter `/controlling/fleet-control` erreichbar. Projektmanagement enthält Mission Log (`/missions`), Context Core, Bug Board und Legal & Lizenzen.
- Browser vor Fach-API-Zugriffen mit `ensureDeskSession` verbinden. Keine Bearer-Schlüssel, SQLite- oder Servermodule im Clientgraph. Reine Werkzeugschemas dürfen geteilt werden.
- Formulare semantisch und per Tastatur bedienbar halten. Lade-, Leer-, Fehler- und Konfliktzustände zeigen; Schreibfehler nicht als Erfolg ausgeben. Nach Speicherung relevante Daten zurücklesen.
- Bugs benötigen getrennte Risiko-/Wahrscheinlichkeits-/Belegangaben und konkrete Laufwirkung. Farben ergänzen Text; ein Status erteilt keine Freigabe.
- Betroffene Browserabläufe und schmale Ansichten prüfen; Testdaten ausschließlich in eigener isolierter Office-Testablage halten. Nicht ungeprüfte WebMCP-Host-Kompatibilität behaupten.
