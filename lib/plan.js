'use strict';

const fs = require('node:fs');
const path = require('node:path');

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function fail(message) {
  const err = new Error(message);
  err.code = 'CBD_BAD_MANIFEST';
  return err;
}

function validateManifest(manifest) {
  if (!Array.isArray(manifest)) {
    throw fail('Bad manifest. Expected a JSON array of items.');
  }
  if (manifest.length === 0) {
    throw fail('Bad manifest. Array is empty.');
  }
  manifest.forEach((item, i) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw fail(`Bad manifest. Item ${i} is not an object.`);
    }
    if (typeof item.name !== 'string' || !item.name) {
      throw fail(`Bad manifest. Item ${i} is missing a string "name".`);
    }
    if (typeof item.path !== 'string' || !item.path) {
      throw fail(`Bad manifest. Item "${item.name}" is missing a string "path".`);
    }
    if (item.kind !== 'fact' && item.kind !== 'prose') {
      throw fail(`Bad manifest. Item "${item.name}" has invalid "kind". Expected "fact" or "prose".`);
    }
    if (item.kind === 'fact') {
      if (typeof item.pattern !== 'string' || !item.pattern) {
        throw fail(`Bad manifest. Fact item "${item.name}" is missing a string "pattern".`);
      }
      try {
        // Validate regex compiles.
        new RegExp(item.pattern);
      } catch (e) {
        throw fail(`Bad manifest. Fact item "${item.name}" has invalid regex pattern. ${e.message}`);
      }
    }
  });
}

function loadManifest(manifestPath) {
  let raw;
  try {
    raw = fs.readFileSync(manifestPath, 'utf8');
  } catch (e) {
    throw fail(`Bad manifest. Cannot read manifest file "${manifestPath}". ${e.message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw fail(`Bad manifest. Manifest is not valid JSON. ${e.message}`);
  }
  validateManifest(parsed);
  return parsed;
}

function extractMatchingLines(content, pattern) {
  const re = new RegExp(pattern);
  const lines = content.split(/\r?\n/);
  const matched = lines.filter((line) => re.test(line));
  // Preserve a trailing newline when there is at least one match, to mirror line extraction.
  return matched.length ? matched.join('\n') + '\n' : '';
}

/**
 * Build a plan.
 * @param {Array} manifest validated items
 * @param {{budget?: number|null, baseDir?: string}} options
 * budget is a total planned-token budget. Fact extractions are taken first.
 * Remaining budget is allocated to prose items smallest first.
 * If budget is null/undefined, all prose items are included.
 */
function buildPlan(manifest, options = {}) {
  validateManifest(manifest);
  const budget = options.budget == null ? null : options.budget;
  if (budget != null && (!Number.isFinite(budget) || budget < 0)) {
    throw fail('Bad budget. --budget must be a non-negative number.');
  }
  const baseDir = options.baseDir || process.cwd();

  const entries = manifest.map((item) => {
    const resolved = path.isAbsolute(item.path) ? item.path : path.resolve(baseDir, item.path);
    let content;
    try {
      content = fs.readFileSync(resolved, 'utf8');
    } catch (e) {
      throw fail(`Cannot read item "${item.name}" at "${item.path}". ${e.message}`);
    }
    const bytes = Buffer.byteLength(content, 'utf8');
    const naiveTokens = estimateTokens(content);
    const entry = {
      name: item.name,
      path: item.path,
      kind: item.kind,
      bytes,
      naiveTokens,
      plannedTokens: 0,
      route: null,
    };
    if (item.kind === 'fact') {
      const extracted = extractMatchingLines(content, item.pattern);
      entry.extractedBytes = Buffer.byteLength(extracted, 'utf8');
      entry.extractedTokens = estimateTokens(extracted);
      entry.plannedTokens = entry.extractedTokens;
      entry.route = 'extract';
    }
    return entry;
  });

  const factTokens = entries
    .filter((e) => e.kind === 'fact')
    .reduce((sum, e) => sum + e.plannedTokens, 0);

  const prose = entries.filter((e) => e.kind === 'prose');
  // Smallest first for allocation.
  const proseBySize = [...prose].sort((a, b) => a.naiveTokens - b.naiveTokens);

  let remaining = budget == null ? Infinity : Math.max(0, budget - factTokens);
  for (const entry of proseBySize) {
    if (entry.naiveTokens <= remaining) {
      entry.route = 'include';
      entry.plannedTokens = entry.naiveTokens;
      remaining -= entry.naiveTokens;
    } else {
      entry.route = 'defer';
      entry.plannedTokens = 0;
    }
  }

  const naiveTokensTotal = entries.reduce((s, e) => s + e.naiveTokens, 0);
  const plannedTokensTotal = entries.reduce((s, e) => s + e.plannedTokens, 0);
  const tokensSaved = naiveTokensTotal - plannedTokensTotal;

  // Return items in manifest order.
  const items = entries.map((e) => ({
    name: e.name,
    path: e.path,
    kind: e.kind,
    bytes: e.bytes,
    naiveTokens: e.naiveTokens,
    plannedTokens: e.plannedTokens,
    route: e.route,
  }));

  return {
    budget,
    items,
    totals: {
      naiveTokens: naiveTokensTotal,
      plannedTokens: plannedTokensTotal,
      tokensSaved,
    },
    tokensSaved,
  };
}

module.exports = { estimateTokens, validateManifest, loadManifest, extractMatchingLines, buildPlan };
