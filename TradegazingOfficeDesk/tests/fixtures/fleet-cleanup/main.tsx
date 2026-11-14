import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import FleetControl from '../../../app/controlling/fleet-control/FleetControl';

function Fixture() {
  const [mounted, setMounted] = useState(false);
  return <>
    <button onClick={() => setMounted(value => !value)}>
      {mounted ? 'Unmount Fleet Control' : 'Mount Fleet Control'}
    </button>
    {mounted && <FleetControl />}
  </>;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
