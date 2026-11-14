#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { loadManifest, buildPlan } = require('../lib/plan');

function usage() {
  return 'Usage. node bin/cbp.js plan <manifest.json> [--budget N]';
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args[0] !== 'plan') {
    throw new Error(`Bad command. Expected "plan". ${usage()}`);
  }
  const manifestPath = args[1];
  if (!manifestPath) {
    throw new Error(`Missing manifest path. ${usage()}`);
  }
  let budget = null;
  for (let i = 2; i < args.length; i++) {
    const a = args[i];
    if (a === '--budget') {
      const v = args[i + 1];
      if (v == null) throw new Error('Bad --budget. Missing value.');
      budget = Number(v);
      i++;
    } else if (a.startsWith('--budget=')) {
      budget = Number(a.slice('--budget='.length));
    } else {
      throw new Error(`Unknown argument "${a}". ${usage()}`);
    }
  }
  if (budget != null && (!Number.isFinite(budget) || budget < 0)) {
    throw new Error('Bad --budget. Must be a non-negative number.');
  }
  return { manifestPath, budget };
}

function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv);
  } catch (e) {
    console.error(`Error. ${e.message}`);
    process.exit(2);
  }
  try {
    const manifestAbs = path.resolve(process.cwd(), parsed.manifestPath);
    const manifest = loadManifest(manifestAbs);
    const baseDir = path.dirname(manifestAbs);
    const receipt = buildPlan(manifest, { budget: parsed.budget, baseDir });
    process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
  } catch (e) {
    console.error(`Error. ${e.message}`);
    process.exit(1);
  }
}

if (require.main === module) main();
