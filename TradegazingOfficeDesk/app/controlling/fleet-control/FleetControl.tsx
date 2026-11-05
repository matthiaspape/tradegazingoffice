import type { ReactNode } from 'react';
import DeskShell from '../../DeskShell';
import { demoFleets, demoPeriod, demoSegments, demoStand, type DemoFleet } from './demo-data';
import './fleet-control.css';

const fleetPath = '/controlling/fleet-control';
const euros = new Intl.NumberFormat('de-DE', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});
const euro = (amount: number) => euros.format(amount);
const pnl = (amount: number) => (amount > 0 ? '+' : '') + euro(amount);

function Coverage({ included, total, unit = 'Flotten' }: { included: number; total: number; unit?: 'Flotten' | 'Einsätze' }) {
  const state = included === 0 ? 'Kein aktueller Wert' : included < total ? 'Teilumfang' : 'Abgedeckt';
  const scope = unit === 'Einsätze' && total === 1 ? 'Einsatz' : unit;
  return <small className={`fleet-coverage ${included < total ? 'fleet-warn' : ''}`}>
    {included} von {total} {scope} · {state}
  </small>;
}

function Metric({ label, value, hint, children }: {
  label: string; value: ReactNode; hint?: ReactNode; children: ReactNode;
}) {
  return <div className="fleet-metric">
    <dt>{label}</dt>
    <dd>
      <strong>{value}</strong>
      {children}
      {hint && <span className="fleet-metric-note">{hint}</span>}
    </dd>
  </div>;
}

function Scope({ fleet }: { fleet?: DemoFleet }) {
  return <ul className="fleet-scope" aria-label="Datenausschnitt">
    <li>Demo</li>
    <li>{demoPeriod}</li>
    <li>Europe/Berlin</li>
    <li>EUR</li>
    <li>{fleet ? `Beobachtet ${fleet.observed} Uhr` : `Vergleichsstand ${demoStand}`}</li>
  </ul>;
}

function FleetChart({ covered, total }: { covered: number; total: number }) {
  const y = (value: number) => 162 - value * 148 / 3000;
  return <figure className="fleet-panel fleet-chart">
    <figcaption>
      <div><p className="kicker">Zurechenbarer Verlauf</p><h2>Trading-Netto</h2></div>
      <Coverage included={covered} total={total} />
    </figcaption>
    <div className="fleet-plot" aria-hidden="true">
      <div className="fleet-axis"><span>3.000 €</span><span>2.000 €</span><span>1.000 €</span><span>0 €</span></div>
      <svg viewBox="0 0 650 176" preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id="fleet-area" x2="0" y2="1">
            <stop stopColor="var(--accent)" stopOpacity=".25" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="fleet-gridlines" d="M0 14H650 M0 63.33H650 M0 112.67H650 M0 162H650" />
        {demoSegments.map(({ name, values, offset }) => {
          const points = values.map((value, index) => `${(offset + index) * 50},${y(value)}`).join(' ');
          return <g key={name}>
            <polygon fill="url(#fleet-area)" points={`${offset * 50},162 ${points} ${(offset + values.length - 1) * 50},162`} />
            <polyline className="fleet-graphline" points={points} />
          </g>;
        })}
      </svg>
    </div>
    <div className="fleet-segments">
      {demoSegments.map(({ name, range, values }) => <p key={name}>
        <strong>{name} · {range}</strong>
        <span>{euro(values[0])} → {euro(values[values.length - 1])} · Hoch {euro(Math.max(...values))}</span>
      </p>)}
    </div>
    <p className="fleet-muted">Lücke 08:50–09:00 · gemeinsame Vergleichspunkte fehlen.</p>
  </figure>;
}

function FleetMetrics({ fleet }: { fleet: DemoFleet }) {
  const { sample, current } = fleet;
  const coverage = <Coverage included={current ? fleet.accounts.length : 0} total={fleet.accounts.length} unit="Einsätze" />;
  return <>
    <Metric label="Trading-Netto" value={current ? <span className="fleet-positive">{pnl(sample.booked + sample.open)}</span> : '—'}
      hint={current ? `${pnl(sample.booked)} brokerseitig gebucht · ${pnl(sample.open)} offene Bewertung (Änderung)` : `Zuletzt ${pnl(sample.booked + sample.open)} · ${fleet.observed} Uhr`}>
      {coverage}
    </Metric>
    <Metric label="Geschlossene Tradezyklen" value={current ? sample.trades : '—'}
      hint={current ? undefined : `Zuletzt ${sample.trades} · ${fleet.observed} Uhr`}>
      {coverage}
    </Metric>
    <Metric label="Max. beob. PnL-Drawdown" value={current ? euro(sample.drawdown) : '—'}
      hint={current ? 'Beobachteter Rückgang vom Hoch · 5-Min.-Raster' : `Zuletzt ${euro(sample.drawdown)} · ${fleet.observed} Uhr`}>
      {coverage}
    </Metric>
  </>;
}

export default function FleetControl() {
  const fresh = demoFleets.filter(fleet => fleet.current);
  const stale = demoFleets.filter(fleet => !fleet.current);
  const pools = fresh.flatMap(fleet => fleet.sample.pools);
  const fullPools = pools.filter(pool => pool.used >= pool.capacity).length;
  const unknown = pools.reduce((total, pool) => total + (pool.unknown ?? 0), 0);
  const booked = fresh.reduce((total, fleet) => total + fleet.sample.booked, 0);
  const open = fresh.reduce((total, fleet) => total + fleet.sample.open, 0);
  const used = pools.reduce((total, pool) => total + pool.used, 0);
  const capacity = pools.reduce((total, pool) => total + pool.capacity, 0);
  const attention = stale.length + fresh.filter(fleet => fleet.sample.pools.some(pool => pool.used >= pool.capacity)).length;
  const segmentB = demoSegments[1];
  const drawdown = Math.max(...segmentB.values.map((value, index) => Math.max(...segmentB.values.slice(0, index + 1)) - value));
  const coverage = <Coverage included={fresh.length} total={demoFleets.length} />;

  return <DeskShell current="fleet" className="fleet-page">
    <header className="mission-hero fleet-hero">
      <div>
        <p className="kicker">01 / Controlling</p>
        <h1>Fleet Control</h1>
        <p>Ergebnis, Risiko und Betriebszustand deiner EA-Flotten.</p>
        <Scope />
        <p className="fleet-source-line">{fresh.length} Quellen frisch · {stale.length} veraltet · <a href={`${fleetPath}/orion#fleet-source`}>Orions Datenstand ansehen</a></p>
      </div>
    </header>

    <section aria-label="Wichtigste Kennzahlen">
      <dl className="fleet-stats">
        <Metric label="Trading-Netto" value={<span className="fleet-positive">{pnl(booked + open)}</span>}
          hint={`${pnl(booked)} brokerseitig gebucht · ${pnl(open)} offene Bewertung (Änderung)`}>
          {coverage}
        </Metric>
        <Metric label="Max. beob. PnL-Drawdown" value={euro(drawdown)}
          hint={`${segmentB.name} · ${segmentB.range} · 5-Min.-Raster`}>
          {coverage}
        </Metric>
        <Metric label="Gebundenes Stoprisiko" value={`${euro(used)} / ${euro(capacity)}`}
          hint={`${fullPools} Pool am Limit · UNKNOWN ${euro(unknown)}. Die Belegung gilt je Pool. Orion ist ausgeschlossen.`}>
          {coverage}
        </Metric>
        <Metric label="Aufmerksamkeit" value={`${attention} Flotten`}
          hint="1 Pool am Limit · 1 Quelle veraltet. Für Orion liegt keine aktuelle Risikobewertung vor.">
          <Coverage included={demoFleets.length} total={demoFleets.length} />
        </Metric>
      </dl>
    </section>

    <div className="fleet-signals">
      <FleetChart covered={fresh.length} total={demoFleets.length} />
      <section className="fleet-panel fleet-attention" aria-labelledby="fleet-attention-title">
        <p className="kicker">Prioritäten</p>
        <h2 id="fleet-attention-title">Aufmerksamkeit</h2>
        <a className="fleet-incident" href={`${fleetPath}/nova#fleet-risk`}>
          <span className="fleet-badge fleet-warn">Risiko</span>
          <strong>Nova · Pool Delta am Limit</strong>
          <small>1.200 € gebunden · davon 420 € UNKNOWN</small>
        </a>
        <a className="fleet-incident" href={`${fleetPath}/orion#fleet-source`}>
          <span className="fleet-badge fleet-danger">Datenqualität</span>
          <strong>Orion · Quelle veraltet</strong>
          <small>Letzte Beobachtung 08:55 · aus Summen ausgeschlossen</small>
        </a>
      </section>
    </div>

    <section aria-labelledby="fleets-title">
      <p className="kicker">Flottenübersicht</p>
      <h2 id="fleets-title">Deine Flotten</h2>
      <div className="fleet-list">
        {demoFleets.map(fleet => <article className="fleet-panel fleet-card" key={fleet.id}>
          <header className="fleet-card-head">
            <h3>{fleet.name}</h3>
            <span className={`fleet-badge ${fleet.current ? 'fleet-good' : 'fleet-danger'}`}>
              {fleet.current ? 'Daten frisch' : 'Quelle veraltet'}
            </span>
          </header>
          <p>{fleet.variants.length} Varianten · {fleet.accounts.length} {fleet.accounts.length === 1 ? 'Einsatz' : 'Einsätze'} · {fleet.revision}</p>
          <dl className="fleet-card-metrics"><FleetMetrics fleet={fleet} /></dl>
          <a href={`${fleetPath}/${fleet.id}`}>{fleet.name} öffnen <span aria-hidden="true">→</span></a>
        </article>)}
      </div>
    </section>
  </DeskShell>;
}

export function FleetDetail({ fleet }: { fleet: DemoFleet }) {
  const { current, sample } = fleet;
  const coverage = <Coverage included={current ? fleet.accounts.length : 0} total={fleet.accounts.length} unit="Einsätze" />;
  return <DeskShell current="fleet" className="fleet-page" detail={fleet.name}>
    <header className="mission-hero fleet-hero">
      <div>
        <a className="fleet-back" href={fleetPath}>← Alle Flotten</a>
        <p className="kicker">Flottendetail</p>
        <h1>{fleet.name}</h1>
        <p>{fleet.variants.length} Strategielinien · {fleet.current ? 'Bestätigte Revision' : 'Letzte bekannte Revision'} {fleet.revision}</p>
        <Scope fleet={fleet} />
      </div>
    </header>

    <nav className="fleet-local-nav" aria-label={`${fleet.name} · Detailbereiche`}>
      <a href="#fleet-performance">Überblick</a>
      <a href="#fleet-variants">Varianten</a>
      <a href="#fleet-risk">Risiko</a>
      <a href="#fleet-source">Betrieb &amp; Daten</a>
    </nav>

    <section className="fleet-panel fleet-detail-section" id="fleet-performance" aria-labelledby="fleet-performance-title">
      <h2 id="fleet-performance-title">Periodenergebnis</h2>
      <dl className="fleet-stats fleet-detail-stats"><FleetMetrics fleet={fleet} /></dl>
    </section>

    <section className="fleet-panel fleet-detail-section" id="fleet-variants" aria-labelledby="fleet-variants-title">
      <h2 id="fleet-variants-title">Strategien und Revisionen</h2>
      <ul className="fleet-variant-list">
        {fleet.variants.map(variant => <li key={variant.name}>
          <strong>{variant.name}</strong>
          <span>{variant.symbol} · {variant.timeframe} · {variant.revision}</span>
          <small>Pool {variant.pool} · {variant.state}</small>
        </li>)}
      </ul>
    </section>

    <section className="fleet-panel fleet-detail-section" id="fleet-risk" aria-labelledby="fleet-risk-title">
      <h2 id="fleet-risk-title">Gebundenes Stoprisiko je Pool</h2>
      <p className="fleet-muted">Die Kapazität bleibt dem jeweiligen Pool zugeordnet.</p>
      <dl className="fleet-stats fleet-detail-stats">
        {sample.pools.map(pool => <Metric key={pool.name} label={`Pool ${pool.name}`}
          value={current ? `${euro(pool.used)} / ${euro(pool.capacity)}` : '—'}
          hint={current
            ? (pool.unknown ? `Am Limit · ${euro(pool.unknown)} ungeklärte Wirkung (UNKNOWN)` : 'Gebundener Betrag / Kapazität')
            : `Zuletzt ${euro(pool.used)} / ${euro(pool.capacity)} · ${fleet.observed} Uhr`}>
          {coverage}
        </Metric>)}
      </dl>
    </section>

    <section className="fleet-panel fleet-detail-section" id="fleet-source" aria-labelledby="fleet-source-title">
      <h2 id="fleet-source-title">Betrieb &amp; Daten</h2>
      <p><span className={`fleet-badge ${current ? 'fleet-good' : 'fleet-danger'}`}>
        {current ? 'Daten frisch' : 'Quelle veraltet'}
      </span> {fleet.source} · beobachtet am 05.11.2026 um {fleet.observed} Uhr</p>
      {!current && <p className="fleet-muted">Die letzte Beobachtung liegt 40 Minuten vor dem Vergleichsstand. Die aktuellen Summen schließen Orion aus. Die zuletzt belegten Werte bleiben am jeweiligen Feld sichtbar.</p>}
      <ul className="fleet-account-list" aria-label="Beispieleinsätze">
        {fleet.accounts.map(account => <li key={account}>{account}</li>)}
      </ul>
    </section>
  </DeskShell>;
}
