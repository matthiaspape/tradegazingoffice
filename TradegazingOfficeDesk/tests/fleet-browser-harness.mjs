import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';

const root = fileURLToPath(new URL('../', import.meta.url));
const component = fileURLToPath(new URL('../app/controlling/fleet-control/FleetControl.tsx', import.meta.url));
const cleanup = 'return()=>{alive=false;clearTimeout(retry);clearInterval(poll);clearInterval(tick);document.removeEventListener(\'visibilitychange\',resume);};';
export const mutations = {
  retry: 'clearTimeout(retry);',
  poll: 'clearInterval(poll);',
  tick: 'clearInterval(tick);',
  visibility: "document.removeEventListener('visibilitychange',resume);",
};

// Only the isolated Vite transform changes; the checked-out application is never mutated.
export async function startFleetHarness(mutation) {
  if (mutation && !Object.hasOwn(mutations, mutation)) throw new Error('Unknown cleanup mutation');
  let transformed = false;
  const server = await createServer({
    configFile: false, root, publicDir: false, appType: 'mpa', logLevel: 'error',
    server: {host: '127.0.0.1', port: 0, strictPort: true},
    plugins: [mutation && {
      name: 'test-only-cleanup-mutation', enforce: 'pre',
      transform(code, id) {
        if (id.split('?')[0] !== component) return;
        if (code.split(cleanup).length !== 2) throw new Error('Cleanup mutation anchor changed');
        transformed = true;
        return code.replace(cleanup, cleanup.replace(mutations[mutation], ''));
      },
    }, react()].filter(Boolean),
  });
  try {
    await server.listen();
    const address = server.httpServer.address();
    return {
      url: `http://127.0.0.1:${address.port}/tests/fixtures/fleet-cleanup/index.html`,
      wasMutated: () => transformed,
      close: () => server.close(),
    };
  } catch (error) {await server.close(); throw error;}
}
