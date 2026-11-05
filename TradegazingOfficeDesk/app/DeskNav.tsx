"use client";
import { useRef, useState } from 'react';

export type Section = 'missions' | 'context' | 'legal' | 'bugs' | 'fleet';

const groups = [
  { label: 'Controlling', items: [
    { id: 'fleet', label: 'Fleet Control', href: '/controlling/fleet-control', icon: '◈' },
  ] },
  { label: 'Projektmanagement', items: [
    { id: 'missions', label: 'Mission Log', href: '/missions', icon: '▤' },
    { id: 'context', label: 'Context Core', href: '/context', icon: '◇' },
    { id: 'bugs', label: 'Bug Board', href: '/bugs', icon: '◎' },
    { id: 'legal', label: 'Legal & Lizenzen', href: '/legal', icon: '▣' },
  ] },
];

export default function DeskNav({ current, title, detail }: { current: Section; title: string; detail: boolean }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  return <div className="office-menu" onKeyDown={event => {
    if (event.key === 'Escape' && open && toggle.current?.getClientRects().length) {
      setOpen(false);
      toggle.current.focus();
    }
  }}>
    <button ref={toggle} className="office-menu-toggle" type="button" aria-controls="office-navigation"
      aria-expanded={open} onClick={() => setOpen(!open)}>
      Navigation <span>{title}</span> <span aria-hidden="true">{open ? '−' : '+'}</span>
    </button>
    <nav className="office-nav" id="office-navigation" data-open={open} aria-label="Desk-Bereiche">
      {groups.map(group => <div className="office-nav-group" key={group.label}>
        <p>{group.label}</p>
        <ul aria-label={group.label}>
          {group.items.map(item => <li key={item.id}>
            <a href={item.href} aria-current={current === item.id ? (detail ? 'location' : 'page') : undefined}>
              <span aria-hidden="true">{item.icon}</span> {item.label}
            </a>
          </li>)}
        </ul>
      </div>)}
    </nav>
  </div>;
}
