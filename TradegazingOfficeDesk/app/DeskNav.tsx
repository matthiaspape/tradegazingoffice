export default function DeskNav({ current }: { current: 'missions' | 'context' | 'legal' | 'bugs' }) {
  return <nav className="desk-nav" aria-label="Projektbereiche">
    <a href="/" aria-current={current === 'missions' ? 'page' : undefined}>Mission Log</a>
    <a href="/context" aria-current={current === 'context' ? 'page' : undefined}>Context Core</a>
    <a href="/bugs" aria-current={current === 'bugs' ? 'page' : undefined}>Bug Board</a>
    <a href="/legal" aria-current={current === 'legal' ? 'page' : undefined}>Legal &amp; Lizenzen</a>
  </nav>;
}
