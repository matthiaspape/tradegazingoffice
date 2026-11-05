"use client";
import { useEffect, useRef } from 'react';

type Section = 'missions' | 'context' | 'legal' | 'bugs' | 'fleet';
const groups = [
  { label: 'Controlling', items: [
    { id: 'fleet', label: 'Fleet Control', href: '/controlling/fleet-control' },
  ] },
  { label: 'Projektmanagement', items: [
    { id: 'missions', label: 'Mission Log', href: '/missions' },
    { id: 'context', label: 'Context Core', href: '/context' },
    { id: 'bugs', label: 'Bug Board', href: '/bugs' },
    { id: 'legal', label: 'Legal & Lizenzen', href: '/legal' },
  ] },
];

export default function DeskNav({ current }: { current: Section }) {
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !navigation.current?.contains(event.target)) {
        navigation.current?.querySelectorAll('details[open]').forEach(item => item.removeAttribute('open'));
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const open = navigation.current?.querySelector<HTMLDetailsElement>('details[open]');
      if (open) {
        const restoreFocus = open.contains(document.activeElement);
        open.open = false;
        if (restoreFocus) open.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);
  return <nav ref={navigation} className="desk-nav" aria-label="Projektbereiche">
    {groups.map(group => <details key={group.label} name="office-desk-navigation" className="desk-nav-group" data-active={group.items.some(item => item.id === current)}>
      <summary>{group.label}<span aria-hidden="true">⌄</span></summary>
      <ul className="desk-subnav" aria-label={group.label}>
        {group.items.map(item => <li key={item.id}><a href={item.href} aria-current={current === item.id ? 'page' : undefined}>{item.label}</a></li>)}
      </ul>
    </details>)}
  </nav>;
}
