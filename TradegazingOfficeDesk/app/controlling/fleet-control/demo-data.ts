// Fiktive, lokale UI-Beispiele. Werte und Zeiten sind eingefroren.
export const demoStand = '05.11.2026 · 09:35';
export const demoPeriod = '05.11.2026 · 08:30–09:35';

type Pool = { name: string; used: number; capacity: number; unknown?: number };
type Variant = { name: string; symbol: string; timeframe: string; revision: string; pool: string; state: string };
type Sample = {
  booked: number;
  open: number;
  trades: number;
  drawdown: number;
  pools: readonly Pool[];
};

export type DemoFleet = {
  id: string;
  name: string;
  revision: string;
  source: string;
  observed: string;
  current: boolean;
  accounts: readonly string[];
  variants: readonly Variant[];
  sample: Sample;
};

export const demoFleets: readonly DemoFleet[] = [
  {
    id: 'nova', name: 'Nova', revision: 'r12', source: 'Demo-Collector Nord', observed: '09:35',
    current: true, accounts: ['Demo A · r12', 'Demo B · r12'],
    sample: {
      booked: 1510, open: 230, trades: 38, drawdown: 620,
      pools: [
        { name: 'Alpha', used: 740, capacity: 1200 },
        { name: 'Beta', used: 480, capacity: 1200 },
        { name: 'Delta', used: 1200, capacity: 1200, unknown: 420 },
      ],
    },
    variants: [
      { name: 'Atlas Breakout', symbol: 'EURUSD', timeframe: 'H1', revision: 'v12', pool: 'Alpha', state: 'Aktiv · v11 läuft aus' },
      { name: 'Meridian Revert', symbol: 'GBPUSD', timeframe: 'M30', revision: 'v07', pool: 'Beta', state: 'Aktiv' },
      { name: 'Ion Trend', symbol: 'USDJPY', timeframe: 'H4', revision: 'v04', pool: 'Beta', state: 'Aktiv' },
      { name: 'Echo Session', symbol: 'EURGBP', timeframe: 'M15', revision: 'v05', pool: 'Delta', state: 'Neueinstieg begrenzt' },
    ],
  },
  {
    id: 'vega', name: 'Vega', revision: 'r08', source: 'Demo-Collector West', observed: '09:35',
    current: true, accounts: ['Demo C · r08'],
    sample: {
      booked: 640, open: 100, trades: 24, drawdown: 310,
      pools: [
        { name: 'Epsilon', used: 650, capacity: 1200 },
        { name: 'Zeta', used: 410, capacity: 1200 },
      ],
    },
    variants: [
      { name: 'Pulse Trend', symbol: 'XAUUSD', timeframe: 'M30', revision: 'v08', pool: 'Epsilon', state: 'Aktiv' },
      { name: 'Arc Range', symbol: 'AUDUSD', timeframe: 'H1', revision: 'v05', pool: 'Zeta', state: 'Aktiv' },
      { name: 'Drift Revert', symbol: 'EURUSD', timeframe: 'M15', revision: 'v03', pool: 'Zeta', state: 'Aktiv' },
    ],
  },
  {
    id: 'orion', name: 'Orion', revision: 'r06', source: 'Demo-Collector Süd', observed: '08:55',
    current: false, accounts: ['Demo D · zuletzt r06'],
    sample: {
      booked: 160, open: -40, trades: 7, drawdown: 180,
      pools: [{ name: 'Kappa', used: 360, capacity: 900 }],
    },
    variants: [
      { name: 'Lumen Breakout', symbol: 'EURUSD', timeframe: 'H4', revision: 'v06', pool: 'Kappa', state: 'Zuletzt aktiv' },
      { name: 'Nadir Range', symbol: 'USDCHF', timeframe: 'M30', revision: 'v03', pool: 'Kappa', state: 'Zuletzt aktiv' },
    ],
  },
];

// Beobachtungen im 5-Minuten-Raster ab 08:30. Zwischen A und B fehlen Vergleichspunkte.
export const demoSegments = [
  { name: 'Segment A', range: '08:30–08:45', offset: 0, values: [0, 260, 190, 1180] },
  { name: 'Segment B', range: '09:05–09:35', offset: 7, values: [1800, 1850, 2850, 2130, 2240, 2690, 2480] },
] as const;
