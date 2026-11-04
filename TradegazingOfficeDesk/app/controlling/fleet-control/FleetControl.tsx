"use client";
import { BrandIdentity, ThemeToggle } from '../../BrandIdentity';
import DeskNav from '../../DeskNav';

export default function FleetControl() {
  return <main className="mission-page">
    <header className="topbar"><BrandIdentity section="Controlling"/><span className="local-badge"><i/>Lokal · Office</span><ThemeToggle/></header>
    <DeskNav current="fleet"/>
    <section className="mission-hero"><div><p className="kicker">CONTROLLING</p><h1>Fleet Control<span>.</span></h1><p>Deine Flotten und Strategien im Überblick.</p></div></section>
    <section className="fleet-placeholder" aria-labelledby="fleet-placeholder-title">
      <span className="fleet-placeholder-badge">In Vorbereitung</span>
      <h2 id="fleet-placeholder-title">Hier entsteht Fleet Control.</h2>
      <p>Dieser Bereich ist vorerst ein Platzhalter für das Controlling deiner EA-Flotten.</p>
    </section>
  </main>;
}
