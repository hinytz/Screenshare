'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', 'app-builder-lib', 'out', 'vm', 'WineVm.js');
if (!fs.existsSync(file)) process.exit(0);

const src = fs.readFileSync(file, 'utf8');
const broken = 'return (0, builder_util_1.exec)(target, appArgs, options);';
const fixed = 'return (0, builder_util_1.exec)(target, appArgs, { ...options, env: { ...process.env, ...(options && options.env) } });';
if (src.includes(fixed)) process.exit(0);
if (!src.includes(broken)) process.exit(0);

fs.writeFileSync(file, src.replace(broken, fixed));
console.log('Patched app-builder-lib WineVm to keep the Windows process env');
