import type { ReactNode } from 'react';
import { BrandIdentity, ThemeToggle } from './BrandIdentity';
import DeskNav, { type Section } from './DeskNav';

const titles = {
  fleet: 'Fleet Control',
  missions: 'Mission Log',
  context: 'Context Core',
  bugs: 'Bug Board',
  legal: 'Legal & Lizenzen',
};

type Props = {
  current: Section;
  children: ReactNode;
  className?: string;
  detail?: string;
};

export default function DeskShell({ current, children, className = '', detail }: Props) {
  const fleet = current === 'fleet';
  const title = titles[current];

  return <div className="office-shell">
    <a className="office-skip" href="#desk-content">Zum Inhalt</a>
    <aside className="office-sidebar">
      <BrandIdentity />
      <DeskNav current={current} title={title} detail={Boolean(detail)} />
      <p className="office-sidebar-note">● Lokal auf deinem Mac</p>
    </aside>
    <div className="office-content">
      <header className={fleet ? 'office-topbar office-topbar-demo' : 'office-topbar'}>
        <p>{fleet ? 'Controlling' : 'Projektmanagement'} <span aria-hidden="true">/</span> {title}
          {detail && <> <span aria-hidden="true">/</span> {detail}</>}
        </p>
        <div className="office-tools">
          {fleet && <span className="office-demo">Fiktive Beispieldaten</span>}
          <ThemeToggle />
        </div>
      </header>
      <main id="desk-content" tabIndex={-1} className={`mission-page ${className}`}>{children}</main>
    </div>
  </div>;
}
