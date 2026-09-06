'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const lockPath = path.join(root, 'package-lock.json');

function parseBump(arg) {
  if (!arg || arg === 'patch') return { kind: 'inc', part: 2 };
  if (arg === 'minor') return { kind: 'inc', part: 1 };
  if (arg === 'major') return { kind: 'inc', part: 0 };
  if (/^\d+\.\d+\.\d+$/.test(arg)) return { kind: 'set', version: arg };
  throw new Error('Usage: npm run bump -- [patch|minor|major|x.y.z]');
}

function nextVersion(version, spec) {
  if (spec.kind === 'set') return spec.version;
  const parts = String(version).split('.').map((n) => Number(n) || 0);
  while (parts.length < 3) parts.push(0);
  parts[spec.part] += 1;
  for (let i = spec.part + 1; i < 3; i++) parts[i] = 0;
  return parts.slice(0, 3).join('.');
}

const spec = parseBump(process.argv[2]);
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const previous = pkg.version;
const next = nextVersion(previous, spec);
pkg.version = next;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  lock.version = next;
  if (lock.packages && lock.packages['']) lock.packages[''].version = next;
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
}

console.log(`Screenshare ${previous} -> ${next}`);
