const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src', 'quora.js'), 'utf8');
const audit = fs.readFileSync(path.join(root, 'docs', '100-systems.md'), 'utf8');
const keys = [...source.matchAll(/feature\('([^']+)'\)/g)].map((match) => match[1]);
const unique = [...new Set(keys)];
const checked = [...audit.matchAll(/^- \[x\] \d{3}\. `([^`]+)`$/gm)].map((match) => match[1]);

if (unique.length < 100) {
  console.error(`SYSTEM_AUDIT_FAIL: only ${unique.length} unique static feature hooks`);
  process.exit(1);
}
if (checked.length !== 100 || checked.some((key) => !unique.includes(key))) {
  console.error(`SYSTEM_AUDIT_FAIL: checklist has ${checked.length} entries or an item without a live hook`);
  process.exit(1);
}

console.log(`SYSTEM_AUDIT_OK ${unique.length} unique code hooks; 100 checklist items mapped to source`);
