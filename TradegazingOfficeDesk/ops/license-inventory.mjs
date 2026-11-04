// Reproducible evidence snapshot; declarations are not a legal assessment.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, lstatSync } from 'node:fs';
import { resolve, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('..', import.meta.url));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const lockBytes = readFileSync(resolve(root, 'package-lock.json'));
const lock = JSON.parse(lockBytes);
const evidence = resolve(root, 'docs/legal/evidence/npm');
mkdirSync(evidence, { recursive: true });
const packages = [];
for (const [location, pkg] of Object.entries(lock.packages || {}).sort(([a], [b]) => a.localeCompare(b))) {
  if (!location) continue;
  const folder = resolve(root, location);
  if (!location.startsWith('node_modules/') || !folder.startsWith(resolve(root, 'node_modules') + sep)) throw new Error('Unexpected package location');
  const files = [];
  let installed = false;
  try {
    if (lstatSync(folder).isSymbolicLink()) throw new Error('Linked package requires separate review');
    const names = readdirSync(folder); installed = true;
    for (const name of names.sort()) {
      if (!/^(licen[cs]e|copying|notice|copyright)([._-].*)?$/i.test(name)) continue;
      const source = resolve(folder, name);
      if (!lstatSync(source).isFile()) continue;
      const bytes = readFileSync(source);
      const target = resolve(evidence, `${sha256(bytes)}.txt`);
      writeFileSync(target, bytes);
      files.push({ source: `${location}/${name}`, archive: relative(root, target), sha256: sha256(bytes) });
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  packages.push({ location, version: pkg.version || null, declared_license: pkg.license || null, dev: Boolean(pkg.dev), optional: Boolean(pkg.optional), resolved: pkg.resolved || null, integrity: pkg.integrity || null, installed, evidence: files, review: 'OPEN' });
}
const target = resolve(root, 'docs/legal/npm-inventory.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify({ format: 1, lock_sha256: sha256(lockBytes), scope: 'Desk dependency declarations; exact shipped bundle and nested third-party notices require review', packages }, null, 2) + '\n');
console.log(JSON.stringify({ packages: packages.length, with_evidence: packages.filter(p => p.evidence.length).length, missing_evidence: packages.filter(p => !p.evidence.length).length }));
