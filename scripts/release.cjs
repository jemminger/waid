#!/usr/bin/env node
// Usage: bun run release
//
// Pushes the current version tag, waits for the GitHub Actions release
// workflow to complete, then publishes the draft release.

const { execSync } = require('child_process');

function run(cmd, opts) {
  return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', ...opts }).trim();
}

function runLoud(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

const version = require('../package.json').version;
const tag = `v${version}`;

// Check the tag exists locally
try {
  run(`git rev-parse ${tag}`);
} catch {
  console.error(`Tag ${tag} does not exist. Run "bun run version:push" first.`);
  process.exit(1);
}

// Push tag if not already on remote
try {
  run(`git ls-remote --tags origin refs/tags/${tag}`);
  const remote = run(`git ls-remote --tags origin refs/tags/${tag}`);
  if (!remote) {
    console.log(`Pushing tag ${tag}...`);
    runLoud(`git push origin ${tag}`);
  } else {
    console.log(`Tag ${tag} already on remote.`);
  }
} catch {
  console.log(`Pushing tag ${tag}...`);
  runLoud(`git push origin ${tag}`);
}

// Wait for the release workflow run to appear, then watch it
console.log(`Waiting for release workflow to start...`);
let runId;
for (let i = 0; i < 30; i++) {
  const result = run(`gh run list --workflow=release.yml --branch=${tag} --limit=1 --json databaseId,status --jq '.[0]'`);
  if (result) {
    const parsed = JSON.parse(result);
    if (parsed.databaseId) {
      runId = parsed.databaseId;
      break;
    }
  }
  execSync('sleep 2');
}

if (!runId) {
  console.error('Timed out waiting for release workflow to start.');
  process.exit(1);
}

console.log(`Watching run ${runId}...`);
try {
  runLoud(`gh run watch ${runId} --exit-status`);
} catch {
  console.error('Release workflow failed. Check GitHub Actions for details.');
  process.exit(1);
}

// Publish the draft release
console.log(`Publishing release ${tag}...`);
try {
  runLoud(`gh release edit ${tag} --draft=false`);
} catch {
  console.error(`Failed to publish release ${tag}. You may need to publish it manually on GitHub.`);
  process.exit(1);
}

console.log(`Released ${tag} successfully.`);
