import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Tradegazing Office Desk · Projektmanagement', description: 'Missionen, Projektwissen, Bug Board und Lizenznachweise für Tradegazing Office.', robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="de"><body>{children}</body></html>; }
