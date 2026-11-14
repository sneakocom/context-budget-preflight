# context-budget-preflight

A deterministic preflight for agent context loading. It reads a manifest of
candidate files, measures each file, extracts only the matching lines from
files that hold greppable facts, and decides which prose files fit a token
budget. It prints a JSON receipt that shows the saving before any file is
loaded into a model context.

This is version 0.1.0. It is a runnable prototype, not a polished product.
It is not yet published.

## Measured baseline

During an Opsle autopilot run on 2026-11-13, an observe step pulled 8736
characters of GitHub run list JSON plus about 14000 characters of a status
document to extract fewer than 20 facts. Equivalent field projected queries
returned the same facts in under 500 characters. That is roughly a 10 to
20 times reduction in context for that step.

The saving came from projection and extraction, not from a model. This tool
applies the same idea to local files before a run starts.

## What it does

A manifest is a JSON array. Each item has a name, a path, and a kind.

Fact items also have a pattern. The pattern is a regular expression. The
tool keeps only lines that match and counts those lines as the planned cost.

Prose items have no pattern. The whole file may matter, so the tool either
includes the whole file or defers it.

Planning follows three rules.

- Fact items are always routed to extraction.
- Prose items are considered smallest first.
- Prose items are included until the budget is used up. The rest are deferred.

The budget is a total planned token budget. Fact extractions are taken
first. The remaining budget is allocated to prose.

The receipt is JSON on stdout. Each item reports its name, its naive token
count, its planned token count, and its route. The receipt also reports
totals and the total tokens saved compared with loading every file in full.

## Manifest format

```json
[
  { "name": "status-facts", "path": "docs/status.md", "kind": "fact", "pattern": "^(version|status):" },
  { "name": "guide", "path": "docs/guide.md", "kind": "prose" }
]
```

Paths in a manifest are resolved relative to the manifest file.

## Usage

```
node bin/cbp.js plan <manifest.json> [--budget N]
npm run example
```

The example manifest lives in the examples folder and plans over the docs
bundled with this repo.

## Verify

```
npm test && npm run example
```

The example receipt should show a positive value for tokensSaved.

## Limitations

Token counts use a chars divided by 4 heuristic. That is an estimate. It is
not a real tokenizer and it will differ by model and by content.

Extraction is regex line matching only. It works when the needed facts sit
on their own lines and follow a predictable shape. It does not parse JSON,
understand document structure, or judge relevance.

Prose ranking uses size only. Smallest first is a simple rule. It does not
mean the smallest file is the most valuable one.

The tool makes no model calls. It does not summarise, rank by meaning, or
fetch anything from the network.

A deferred file is not deleted or summarised. It is simply left out of the
plan. A later step can load it if the task turns out to need it.

## Files

- bin/cbp.js holds the command line entry point.
- lib/plan.js holds manifest validation, extraction, and planning.
- test/plan.test.js holds the test suite.
- examples/ holds the bundled demo.
