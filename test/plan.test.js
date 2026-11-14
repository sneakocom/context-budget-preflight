'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { buildPlan, loadManifest } = require('../lib/plan');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cbp-test-'));
}

test('extraction shrinks a fact item', () => {
  const dir = tmpDir();
  const file = path.join(dir, 'status.md');
  const lines = ['version: 1.2.3', ...Array.from({ length: 40 }, (_, i) => `background line ${i} with extra prose to fill context`), 'status: ok'];
  fs.writeFileSync(file, lines.join('\n') + '\n');
  const manifest = [{ name: 'status', path: file, kind: 'fact', pattern: '^(version|status):' }];
  const receipt = buildPlan(manifest, { baseDir: dir });
  const item = receipt.items[0];
  assert.equal(item.route, 'extract');
  assert.ok(item.plannedTokens < item.naiveTokens, `planned ${item.plannedTokens} should be < naive ${item.naiveTokens}`);
  assert.ok(receipt.totals.tokensSaved > 0);
});

test('budget deferral defers larger prose items first', () => {
  const dir = tmpDir();
  const small = path.join(dir, 'small.md');
  const large = path.join(dir, 'large.md');
  fs.writeFileSync(small, 'small prose file\n');
  fs.writeFileSync(large, 'large '.repeat(200) + '\n');
  const manifest = [
    { name: 'large', path: large, kind: 'prose' },
    { name: 'small', path: small, kind: 'prose' },
  ];
  // Budget fits the small file but not the large one.
  const receipt = buildPlan(manifest, { budget: 10, baseDir: dir });
  const byName = Object.fromEntries(receipt.items.map((i) => [i.name, i]));
  assert.equal(byName.small.route, 'include');
  assert.ok(byName.small.plannedTokens > 0);
  assert.equal(byName.large.route, 'defer');
  assert.equal(byName.large.plannedTokens, 0);
  assert.ok(receipt.totals.tokensSaved > 0);
});

test('bad manifest errors clearly', () => {
  const dir = tmpDir();
  const bad = path.join(dir, 'bad.json');
  fs.writeFileSync(bad, JSON.stringify([{ name: 'x', path: 'y.md', kind: 'unknown' }]));
  assert.throws(() => loadManifest(bad), /Bad manifest/);

  const missingPattern = path.join(dir, 'bad2.json');
  fs.writeFileSync(missingPattern, JSON.stringify([{ name: 'f', path: 'y.md', kind: 'fact' }]));
  assert.throws(() => loadManifest(missingPattern), /Bad manifest.*pattern/);

  // CLI exits non-zero on a bad manifest.
  const bin = path.join(__dirname, '..', 'bin', 'cbp.js');
  let code = 0;
  let stderr = '';
  try {
    execFileSync(process.execPath, [bin, 'plan', bad], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    code = e.status;
    stderr = String(e.stderr || '');
  }
  assert.notEqual(code, 0);
  assert.match(stderr, /Bad manifest/);
});
