const fs = require('fs');
const { execSync } = require('child_process');
const arg = process.argv[2];

if (!arg) {
  console.error('Usage: bun run version:bump <M|m|p|version>');
  console.error('  M = major, m = minor, p = patch');
  console.error('  or provide an explicit version like 1.2.3');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

let v;
if (arg === 'M') v = `${major + 1}.0.0`;
else if (arg === 'm') v = `${major}.${minor + 1}.0`;
else if (arg === 'p') v = `${major}.${minor}.${patch + 1}`;
else v = arg;

for (const f of ['package.json', 'src-tauri/tauri.conf.json']) {
  const j = JSON.parse(fs.readFileSync(f));
  j.version = v;
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
}

const cargo = fs.readFileSync('src-tauri/Cargo.toml', 'utf8');
fs.writeFileSync('src-tauri/Cargo.toml', cargo.replace(/^version = ".*"/m, `version = "${v}"`));

// Regenerate Cargo.lock to reflect the new version
execSync('cargo generate-lockfile', { cwd: 'src-tauri', stdio: 'inherit' });

console.log(`${pkg.version} → ${v}`);
