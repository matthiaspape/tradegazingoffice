"use client";
import { useEffect, useState } from 'react';
export function BrandIdentity() {
  return <a className="brand-identity" href="/" aria-label="Tradegazing Office Desk Startseite">
    <span className="brand-logo">
      <img className="logo-light" src="/brand/tradegazing-logo-light.svg" alt="Tradegazing" width="178" height="40"/>
      <img className="logo-dark" src="/brand/tradegazing-logo-dark.svg" alt="Tradegazing" width="178" height="40"/>
    </span>
    <strong>Office Desk</strong>
  </a>;
}
export function ThemeToggle() {
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    try { const initial = localStorage.getItem('tradegazing-office-desk-theme') === 'dark' ? 'dark' : 'light'; setTheme(initial); document.documentElement.dataset.theme = initial; } catch { /* Browser storage is optional. */ }
  }, []);
  return <button className="theme-toggle" aria-label={theme === 'light' ? 'Dunklen Modus aktivieren' : 'Hellen Modus aktivieren'} onClick={() => {
    const next = theme === 'light' ? 'dark' : 'light'; setTheme(next); document.documentElement.dataset.theme = next;
    try { localStorage.setItem('tradegazing-office-desk-theme', next); } catch { /* Theme still works without persistence. */ }
  }}>{theme === 'light' ? '◐ Dunkel' : '☼ Hell'}</button>;
}
