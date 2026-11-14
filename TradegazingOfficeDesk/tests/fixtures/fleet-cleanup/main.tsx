import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import FleetControl from '../../../app/controlling/fleet-control/FleetControl';

function Fixture() {
  const [mounted, setMounted] = useState(false);
  const query = new URLSearchParams(location.search);
  return <>
    <button onClick={() => setMounted(value => !value)}>
      {mounted ? 'Unmount Fleet Control' : 'Mount Fleet Control'}
    </button>
    {mounted && <FleetControl vpsId={query.get('test-vps') || undefined} fleetId={query.get('test-fleet') || undefined} />}
  </>;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
