# Scripts Development Guide

The Saga repository includes 178 scripts in `tools/scripts/` at the time of this guide's current authoring pass. They support loredeck generation, testing, maintenance, and utilities. Treat the count as an inventory snapshot rather than a stable API; update it when the script inventory changes materially. This guide explains the script ecosystem, patterns, conventions, and how to create new scripts.

## 1. Overview and Purpose

Scripts are Node.js ESM modules that automate repetitive development tasks:

- **Generation**: Create loredeck JSON packages from evidence, specs, or source data
- **Testing**: Validate features and contracts using `node:assert/strict`
- **Maintenance**: Audit, repair, and health-check existing loredecks
- **Utilities**: Serve test harnesses, support CLI operations, debugging helpers

When to write a script:
- The task runs offline and produces files or console output
- The operation is used during development, testing, or release
- It benefits the whole team (not just one person)
- It would be error-prone to do manually (e.g., batch updates, validation)

When NOT to write a script:
- The operation belongs in production code or tests
- It's a one-time task that won't be reused
- It's complex enough to warrant a library/utility module

## 2. Script Categories and Naming Conventions

| Prefix | Category | Purpose | Examples |
|--------|----------|---------|----------|
| `generate-` | Generation | Create loredeck JSON packages from specs or evidence | `generate-star-trek-season-loredeck.mjs` |
| `test-` | Testing | Feature and integration tests | `test-basic-readiness.mjs`, `test-context-composition.mjs` |
| `audit-` | Maintenance | Analyze and report on pack health, metadata, data integrity | `audit-canon-preview.mjs` |
| `repair-` | Maintenance | Apply targeted fixes to loredecks | `repair-hp-loredeck-health.mjs` |
| `report-` | Maintenance | Gather and summarize statistics or coverage | `report-jjk-loredeck-coverage.mjs` |
| `serve-` | Utility | HTTP servers for testing harnesses | `serve-visual-smoke.mjs` |
| `scan-` | Maintenance | Detect patterns (e.g., secrets, security issues) | `scan-secrets.mjs` |
| `run-` | Utility | Miscellaneous operations, gates | `run-alpha-gate.mjs` |
| `scaffold-` | Generation | Generate starter templates or family structures | `scaffold-hp-loredeck-family.mjs` |
| `smoke-` | Testing | Live integration tests (often against external systems) | `smoke-live-st-cdp.mjs` |

**Naming guidelines:**
- Use kebab-case (lowercase with hyphens)
- Keep the subject concise but clear
- Always use `.mjs` extension (ES modules, not CommonJS)
- Place in `tools/scripts/` directory

## 2.1 Loredeck Builder CLI and focused checks

The external Loredeck authoring workflow lives primarily under `tools/loredeck/`, not in the general-purpose `tools/scripts/` directory. Run it with:

```text
node tools/loredeck/loredeck-cli.mjs <command> [args] [--json]
```

The CLI owns workshop project state, evidence status, review artifacts, conformance, Pack Health, promotion, packaging, and package verification. Keep `project.json` CLI-owned; authors may edit briefs, evidence, plans, draft registries, and draft card files according to the `loredeck-builder` skill contract. The packaged skill venders this CLI and its required health modules through `plugins/loredeck-builder/scripts/sync-from-repo.mjs`; do not hand-edit the generated plugin directories.

The focused Loredeck Builder checks are:

- `test-loredeck-workshop-state.mjs`
- `test-loredeck-evidence-store.mjs`
- `test-loredeck-cli-health-cross-deck-tags.mjs`
- `test-loredeck-cli-health-parity.mjs`
- `test-loredeck-cli-package-roundtrip.mjs`
- `test-loredeck-cli-conformance.mjs`
- `test-loredeck-review-artifacts.mjs`
- `test-loredeck-plugin-bundle.mjs`

The first seven exercise the authoring workflow and the last verifies the standalone `.skill` bundle. The focused CI workflow runs these checks independently; `run-alpha-gate.mjs` contains the core parity, state, evidence, conformance, package-roundtrip, and bundle checks as part of the broader repository gate.

## 3. Universal Patterns and Best Practices

### Rendering UI development and acceptance

Use Node **24.16.0** and `npm ci` for build/browser development. This installs
the pinned Svelte/Vite/Playwright and native Sharp development dependencies;
Sharp needs a supported platform binary. Direct Git installation in SillyTavern
uses committed generated assets and does not require running npm or a build.
Existing direct `node tools/scripts/...` commands retain their package scopes;
they do not install dependencies implicitly.

```text
npm ci
npm run build:ui
npm run build:thumbnails
npm run check:generated
node tools/scripts/run-alpha-gate.mjs
npx playwright install --with-deps chromium firefox webkit
node tools/scripts/test-loredeck-workbench-svelte-adapter.mjs
node tools/scripts/test-loredeck-workbench-browser-parity.mjs
```

`check:generated` independently rebuilds into a temporary directory and compares
the complete generated file sets and bytes, including stale extras and checkout
line endings. The adapter suite already tests missing/changed/stale generated
files, then exercises Chromium and therefore requires Playwright installation.
The separate browser suite requires the observed original draft reference at
`tests/browser/workbench-draft-presentation-reference.json` (or
`SAGA_PARITY_DRAFT_REFERENCE`). `SAGA_PARITY_BROWSER` selects chromium, firefox,
or webkit. `SAGA_PARITY_REPORT` writes provenance. Set `SAGA_PARITY_ARTIFACT_DIR`
to capture failure metadata, a screenshot and a Playwright trace when available.
Browser engines and viewport emulation are explicitly distinct from native
Safari/Android/iOS hardware.

The UI CI workflow pins Node, installs dependencies, checks generated bytes and
runs Node/alpha suites on Linux and Windows. Separate Linux browser jobs install
each pinned engine and execute parity. On failure, CI uploads the TAP and
provenance files plus available case diagnostics from `.tmp/saga-ui-ci`.
The Loredeck Builder workflow keeps its existing scope.
These checks do not run the timed acceptance matrices or establish performance.
The Node jobs also run the complete deterministic synthetic acceptance-tooling
suite using the checked-in exact protocol fixtures. This is a tooling regression
check; it does not contain measured acceptance data.

The pure matrix evaluator, strict saved-artifact loader, supplemental probe
commands, and numerical method are documented in
[SAGA_RENDERING_EVIDENCE.md](SAGA_RENDERING_EVIDENCE.md). Fast structural checks
are `npm run test:rendering-structure`. The full deterministic synthetic suite
is `npm run test:rendering-acceptance`; it needs the exact archived protocol
fixtures checked in at `tests/fixtures/rendering-performance-9a3` and runs the
fixed 20,000-replicate method. The fast alpha gate also runs direct observation
gate/null/capability checks without constructing a complete matrix. Run the full
suite separately after
timed capture finishes. Evaluate two sealed real bundles with
`npm run evaluate:rendering -- BASELINE_BUNDLE CANDIDATE_BUNDLE OUTPUT.json`.
Inconclusive results are never a pass. Never run builds, broad validation or
supplemental HTTP/body probes concurrently with timed acceptance capture.

For a new timed capture, set `SAGA_CHROME_PATH` to the versioned browser
executable and verify its expected SHA-256 before starting either build. The
collector records the browser version, executable path and SHA-256 in the index
and in each timed and tablet case. A changed version or executable aborts the
capture. Match the exact archived protocol and fixture when replaying an old run.

### 3.1 Module System and Imports

Use ES modules with `node:` prefix for built-in modules:

```javascript
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
```

For Saga code, use relative imports from `src/`:

```javascript
import { buildBasicReadinessModel } from '../../src/runtime/runtime-basic-readiness.js';
```

### 3.2 Configuration Management

Define all constants at the top of the file (after imports) using frozen objects:

```javascript
const ROOT = process.cwd();
const EVIDENCE_PATH = path.join(ROOT, 'docs/loredecks/star-trek-memory-alpha-episode-evidence.json');

const SERIES = Object.freeze({
  TNG: {
    title: 'Star Trek: The Next Generation',
    slug: 'tng',
    sortBase: 9000,
  },
  DS9: {
    title: 'Star Trek: Deep Space Nine',
    slug: 'ds9',
    sortBase: 20000,
  },
});

const SEASON_SPECS = Object.freeze({
  'tng-season-4': {
    entryFloor: 80,
    entryCeiling: 150,
  },
});
```

Benefits:
- Frozen objects prevent accidental modification
- Constants are easy to find and update
- Clear separation of config from logic
- Grouped logically for maintainability

### 3.3 Path Handling and Safety

Always validate and prevent directory traversal attacks:

```javascript
function validateDeckPath(deckId) {
  // Reject paths with .. or leading /
  if (deckId.includes('..') || deckId.startsWith('/')) {
    throw new Error(`Invalid deck ID: ${deckId}`);
  }
  
  const deckPath = path.join(ROOT, 'content/loredecks', deckId);
  
  // Verify the resolved path is still within the expected root
  const realPath = path.resolve(deckPath);
  const expectedRoot = path.resolve(path.join(ROOT, 'content/loredecks'));
  if (!realPath.startsWith(expectedRoot)) {
    throw new Error(`Path traversal attempt: ${deckId}`);
  }
  
  return deckPath;
}
```

### 3.4 CLI Input Handling

Use `process.argv.slice(2)` for arguments and validate:

```javascript
// For positional arguments
const deckIds = process.argv.slice(2);
if (!deckIds.length) {
  console.error(`Usage: node ${path.basename(import.meta.filename)} <deckId> [<deckId> ...]`);
  process.exit(1);
}

// For flag-based arguments
const args = new Set(process.argv.slice(2));
if (args.has('--json')) {
  // output JSON
}
if (args.has('--write-safe')) {
  // apply fixes
}
```

### 3.5 Error Handling

Throw descriptive errors with context:

```javascript
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read JSON from ${file}: ${error.message}`);
  }
}

// Exit with non-zero code on errors
try {
  generateDeck(deckId);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
```

### 3.6 Output Standards

#### JSON Output
Use consistent JSON formatting for readability:

```javascript
function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify(results, null, 2));
```

#### File I/O
Use `fs/promises` for async operations, `fs` synchronous when script execution order matters:

```javascript
// Async pattern
import fs from 'node:fs/promises';
const content = await fs.readFile(path, 'utf8');

// Sync pattern (in scripts, often acceptable)
import fs from 'node:fs';
const content = fs.readFileSync(path, 'utf8');
```

Always include trailing newlines when writing files.

## 4. Architectural Patterns

Well-organized scripts follow 8 logical layers:

```
1. Imports (all module imports)
2. Root/Constants (process.cwd, file paths, frozen config)
3. Utilities (small, reusable functions)
4. Generation/Logic (core business logic)
5. Output Builders (format and assemble results)
6. File I/O (read/write operations)
7. Orchestrator (coordinates all layers)
8. CLI Entry Point (argument parsing, error handling)
```

### 4.1 Layer 1: Imports

```javascript
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
```

### 4.2 Layer 2: Root and Constants

```javascript
const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, 'docs/loredecks/evidence.json');

const CONFIG = Object.freeze({
  // settings
});
```

### 4.3 Layer 3: Utilities

Small, focused, reusable functions:

```javascript
function slug(text) {
  return text.toLowerCase().replace(/\s+/g, '-');
}

function unique(array) {
  return [...new Set(array)];
}

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}
```

### 4.4 Layer 4: Generation/Logic

The core business logic of the script:

```javascript
function buildCards(episodes, spec) {
  const cards = [];
  for (const episode of episodes) {
    cards.push({
      id: `${spec.slug}-ep-${episode.number}`,
      title: episode.title,
      // ...
    });
  }
  return cards;
}

function buildEntry(card, spec) {
  return {
    schemaVersion: 3,
    id: card.id,
    // ...
  };
}
```

### 4.5 Layer 5: Output Builders

Transform data into output structures:

```javascript
function buildManifest(entries, spec) {
  return {
    id: spec.deckId,
    title: spec.title,
    entries: entries.length,
    source: spec.sourceFile,
    // ...
  };
}

function buildTimeline(entries) {
  return {
    anchors: entries.filter(e => e.isAnchor),
    windows: entries.map(e => e.window),
  };
}
```

### 4.6 Layer 6: File I/O

Separate file operations from logic:

```javascript
function readManifest(deckPath) {
  const manifestFile = path.join(deckPath, 'manifest.json');
  return JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
}

function writeEntry(deckPath, fileName, entries) {
  const filePath = path.join(deckPath, fileName);
  fs.writeFileSync(filePath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
}
```

### 4.7 Layer 7: Orchestrator

Coordinates all layers to execute the main task:

```javascript
function generateDeck(deckId) {
  // 1. Validate inputs
  const deckPath = validateDeckPath(deckId);
  
  // 2. Read source data
  const evidence = readJson(EVIDENCE_PATH);
  const spec = SEASON_SPECS[deckId] || buildDefaultSpec(deckId);
  
  // 3. Generate cards and entries
  const cards = buildCards(evidence.episodes, spec);
  const entries = cards.map(card => buildEntry(card, spec));
  
  // 4. Validate entry counts
  assert.ok(entries.length >= spec.entryFloor, `Too few entries: ${entries.length} < ${spec.entryFloor}`);
  
  // 5. Build output structures
  const manifest = buildManifest(entries, spec);
  const timeline = buildTimeline(entries);
  
  // 6. Write files
  fs.mkdirSync(deckPath, { recursive: true });
  writeJson(path.join(deckPath, 'manifest.json'), manifest);
  writeJson(path.join(deckPath, 'timeline.json'), timeline);
  
  // 7. Return summary
  return { deckId, entryCount: entries.length, status: 'success' };
}
```

### 4.8 Layer 8: CLI Entry Point

Parse arguments and kick off the orchestrator:

```javascript
const deckIds = process.argv.slice(2);
if (!deckIds.length) {
  console.error(`Usage: node tools/scripts/generate-star-trek-season-loredeck.mjs <deckId> [<deckId> ...]`);
  process.exit(1);
}

try {
  const results = deckIds.map(deckId => generateDeck(deckId));
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
```

## 5. Generation Scripts Specifics

Generation scripts create loredeck JSON packages. See [LOREDECK_AND_LORECARD_CREATION_GUIDE.md](../loredecks/LOREDECK_AND_LORECARD_CREATION_GUIDE.md) and [SAGA_LOREDECK_SCHEMA.md](../loredecks/SAGA_LOREDECK_SCHEMA.md) for schema details.

### Key Patterns

**Schema Compliance:**
```javascript
const ENTRY_SCHEMA_VERSION = 3;

function buildEntry(card, spec) {
  return {
    schemaVersion: ENTRY_SCHEMA_VERSION,
    id: card.id,
    title: card.title,
    kind: card.kind,
    tags: card.tags,
    content: card.content,
    context: { /* validation windows */ },
    continuity: { /* canon guards */ },
    // ... other required fields
  };
}
```

**Hand-Authored Specs + Fallback:**
```javascript
const SEASON_SPECS = Object.freeze({
  'tng-season-4': {
    // ... explicit configuration
  },
});

function buildDefaultSpec(deckId) {
  // Fallback if not in SEASON_SPECS
  return {
    entryFloor: 60,
    entryCeiling: 200,
    // ... reasonable defaults
  };
}

const spec = SEASON_SPECS[deckId] || buildDefaultSpec(deckId);
```

**Entry Validation:**
```javascript
assert.ok(entries.length >= spec.entryFloor, `Too few entries: ${entries.length} < ${spec.entryFloor}`);
assert.ok(entries.length <= spec.entryCeiling, `Too many entries: ${entries.length} > ${spec.entryCeiling}`);
```

**File Splitting (for large decks):**
If a category (episodes, characters, guards) has many entries, split across multiple files:

```javascript
function groupByFile(entries, maxPerFile = 22) {
  const groups = [];
  for (let i = 0; i < entries.length; i += maxPerFile) {
    groups.push(entries.slice(i, i + maxPerFile));
  }
  return groups;
}

const episodeGroups = groupByFile(episodeEntries);
episodeGroups.forEach((group, index) => {
  const fileName = `episodes/season-${season}-episode-gates-${String.fromCharCode(97 + index)}.json`;
  writeJson(path.join(deckPath, fileName), group);
});
```

**Registry Collection:**
```javascript
function collectTags(entries) {
  const tags = new Map();
  for (const entry of entries) {
    for (const tag of entry.tags || []) {
      if (!tags.has(tag)) tags.set(tag, []);
      tags.get(tag).push(entry.id);
    }
  }
  return Object.fromEntries(tags);
}

function collectEntities(entries) {
  const entities = {};
  for (const entry of entries) {
    for (const character of entry.characters || []) {
      if (!entities[character]) entities[character] = [];
      entities[character].push(entry.id);
    }
  }
  return entities;
}
```

**Output Structure:**
A typical loredeck generation produces:

```
content/loredecks/{deckId}/
  manifest.json          # Main deck metadata
  timeline.json          # Story anchors and context windows
  resolver.json          # Phrase-to-context resolution rules
  tags.json              # Tag registry
  entities.json          # Character/faction entities
  taxonomy.json          # Category definitions
  gate-types.json        # Gate type descriptions
  scoring.json           # Retrieval scoring profiles
  episodes/
    season-1-episode-gates-a.json
    season-1-episode-gates-b.json
  crew/
    season-1-character-and-faction-states-a.json
  secrets/
    season-1-reveal-and-future-guards-a.json
  assets/
    cover.png            # (optional)
```

## 6. Test Scripts Specifics

Test scripts validate features and contracts using Node.js `assert/strict`:

```javascript
import assert from 'node:assert/strict';
import { buildBasicReadinessModel } from '../../src/runtime/runtime-basic-readiness.js';

function testBasicReadiness() {
  const model = buildBasicReadinessModel({
    enabledLoredecks: 0,
    contextCount: 0,
    selectedLore: 0,
  });
  
  assert.equal(model.nextAction.id, 'loredecks', 'Should start with Loredecks action');
}

testBasicReadiness();
console.log('Basic readiness contract passed.');
```

### Key Patterns

**No External Test Frameworks:**
Use only `node:assert/strict`. No Jest, Vitest, Mocha, or other runners.

**Helper Functions:**
```javascript
function row(model, id) {
  return model.rows.find(item => item.id === id);
}

function assertNext(input, expected, message) {
  const model = buildBasicReadinessModel(input);
  assert.equal(model.nextAction?.id, expected.id, `${message}: next action id`);
  assert.equal(model.nextAction?.actionLabel, expected.actionLabel || '', `${message}: action label`);
  return model;
}
```

**Sequential Assertions with Context:**
```javascript
let model = assertNext(
  { enabledLoredecks: 0, contextCount: 0 },
  { id: 'loredecks', actionLabel: 'Open Library' },
  'empty stack'
);
assert.equal(row(model, 'loredecks').missingText, 'Open Library, ...', 'Should explain the workflow');

model = assertNext(
  { enabledLoredecks: 1, contextCount: 0 },
  { id: 'context' },
  'missing Context'
);
assert.equal(row(model, 'context').missingText, 'Browse Context...', 'Should ask for context');
```

**Spawn for CLI Integration Tests:**
```javascript
import { spawnSync } from 'node:child_process';

const result = spawnSync('node', ['tools/scripts/some-script.mjs', '--flag'], {
  cwd: ROOT,
  encoding: 'utf8',
});

assert.equal(result.status, 0, 'Script should exit successfully');
assert.ok(result.stdout.includes('expected output'), 'Should output expected text');
```

**Success Message:**
End with a success message:

```javascript
console.log('Basic readiness contract passed.');
console.log('Context composition tests completed.');
```

## 7. Maintenance Scripts Specifics

Maintenance scripts audit, repair, and monitor loredeck health.

### Audit Scripts

Read and analyze data, report issues:

```javascript
function auditLoredeckHealth(deckPath) {
  const manifest = readJson(path.join(deckPath, 'manifest.json'));
  const issues = [];
  
  if (!manifest.id) issues.push('Missing deck ID');
  if (!manifest.entries || manifest.entries.length === 0) {
    issues.push('No entries found');
  }
  
  return { deckId: manifest.id, issueCount: issues.length, issues };
}
```

### Repair Scripts

Apply targeted fixes with validation:

```javascript
function repairTagMapping(entry, mapping) {
  for (const tag of entry.tags || []) {
    if (mapping[tag]) {
      const index = entry.tags.indexOf(tag);
      entry.tags[index] = mapping[tag];
    }
  }
  return entry;
}

function applyRepairs(deckPath, mapping) {
  const manifest = readJson(path.join(deckPath, 'manifest.json'));
  const changes = new Set();
  
  for (const file of manifest.files || []) {
    const filePath = path.join(deckPath, file);
    const json = readJson(filePath);
    
    for (const entry of json.entries || []) {
      repairTagMapping(entry, mapping);
    }
    
    changes.add(filePath);
  }
  
  // Write back repaired files
  for (const filePath of changes) {
    const json = readJson(filePath);
    writeJson(filePath, json);
  }
  
  return changes.size;
}
```

### Health-Check Scripts

Validate structure and identify patterns:

```javascript
function inferRole(entry) {
  const kind = String(entry.kind || '').toLowerCase();
  const category = String(entry.category || '').toLowerCase();
  
  if (kind.includes('guard')) return 'active_guardrail';
  if (category.includes('character')) return 'character_state';
  if (category.includes('event')) return 'event_anchor';
  
  return 'reference_only';
}

function analyzeEntry(entry) {
  const role = inferRole(entry);
  const flags = [];
  
  if (!entry.id) flags.push('missing-id');
  if (!entry.title) flags.push('missing-title');
  
  return { role, flags };
}
```

## 8. Utility Scripts Specifics

### Server Scripts

Lightweight HTTP servers for testing:

```javascript
import http from 'node:http';
import path from 'node:path';

const port = 3456;
const root = process.cwd();

const server = http.createServer((req, res) => {
  const filePath = path.join(root, req.url === '/' ? 'index.html' : req.url);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
```

### Helper Scripts

Utilities that can be imported or run standalone:

```javascript
export function readLoredeckManifest(deckPath) {
  return JSON.parse(fs.readFileSync(path.join(deckPath, 'manifest.json'), 'utf8'));
}

export function validateDeckStructure(manifest) {
  const required = ['id', 'title', 'entries'];
  for (const field of required) {
    if (!manifest[field]) throw new Error(`Missing field: ${field}`);
  }
  return true;
}

// Can be imported by other scripts or run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  const deckPath = process.argv[2];
  const manifest = readLoredeckManifest(deckPath);
  validateDeckStructure(manifest);
  console.log(`Deck ${manifest.id} is valid.`);
}
```

## 9. Documentation Within Scripts

### Module Docstring

Include a comment at the top describing the script:

```javascript
/**
 * Generates Star Trek Loredeck JSON packages from Memory Alpha episode evidence.
 * 
 * Creates complete loredeck structures with manifests, timelines, resolvers,
 * tags, entities, and episode/character/guard cards.
 * 
 * Usage:
 *   node tools/scripts/generate-star-trek-season-loredeck.mjs star-trek-tng-season-4
 *   node tools/scripts/generate-star-trek-season-loredeck.mjs star-trek-tng-season-1 star-trek-ds9-season-1
 * 
 * Output:
 *   Creates directories under content/loredecks/{deckId}/ with JSON files
 *   Updates content/loredecks/index.json with the new deck
 * 
 * See: docs/loredecks/SAGA_LOREDECK_SCHEMA.md for schema details
 */
```

### Function Comments

Document non-obvious logic:

```javascript
function buildDefaultSpec(deckId) {
  // Fallback spec for seasons not hand-authored in SEASON_SPECS.
  // Reasonable defaults to avoid over-generating or under-generating.
  return {
    entryFloor: 60,    // Minimum entries to avoid sparse decks
    entryCeiling: 200, // Maximum entries to prevent bloat
  };
}

function groupByFile(entries, maxPerFile = 22) {
  // Split large entry arrays to stay under 22 entries per file.
  // This keeps individual JSON files manageable and aligns with
  // typical storage system limits.
  const groups = [];
  for (let i = 0; i < entries.length; i += maxPerFile) {
    groups.push(entries.slice(i, i + maxPerFile));
  }
  return groups;
}
```

Don't document the obvious:

```javascript
// BAD: Over-commented
function slug(text) {
  // Convert text to lowercase
  const lower = text.toLowerCase();
  // Replace spaces with hyphens
  return lower.replace(/\s+/g, '-');
}

// GOOD: Self-explanatory
function slug(text) {
  return text.toLowerCase().replace(/\s+/g, '-');
}
```

## 10. Running Scripts

### Basic Usage

```bash
# Run a generation script
node tools/scripts/generate-star-trek-season-loredeck.mjs star-trek-tng-season-4

# Run a test script
node tools/scripts/test-basic-readiness.mjs

# Run an audit with flags
node tools/scripts/audit-canon-preview.mjs --json
node tools/scripts/audit-canon-preview.mjs --write-safe
```

### Environment

Scripts run with `process.cwd()` as the repository root. This means:
- Relative paths in constants work correctly
- Output is written to predictable locations
- Tests import from `src/` reliably

### Exit Codes

- `0`: Success
- `1`: Error (validation failure, file not found, assertion failed, etc.)

### Output

Scripts typically output to:
- **stdout**: JSON, success messages, human-readable reports
- **stderr**: Error messages, usage instructions
- **Filesystem**: Generated/modified files

## 11. Common Utilities and Shared Functions

If you find yourself writing similar utility functions across multiple scripts, consider extracting them to a shared module:

**Example: shared loredeck utilities**

```javascript
// src/loredeck-utilities.js
export function parseDecfkId(deckId) {
  const match = deckId.match(/^([a-z-]+)-season-(\d+)$/);
  if (!match) throw new Error(`Invalid deck ID: ${deckId}`);
  return { series: match[1], season: parseInt(match[2]) };
}

export function validateDeckPath(deckId, root) {
  if (deckId.includes('..')) throw new Error('Invalid deck ID');
  return path.join(root, 'content/loredecks', deckId);
}

// then import in your script
import { parseDecfkId, validateDeckPath } from '../../src/loredeck-utilities.js';
```

Common candidates for extraction:
- Path validation
- JSON I/O helpers
- Schema validators
- Text normalization (slug, titleCase, etc.)

## 12. Maintenance and Evolution

### Updating Scripts Safely

1. **Test first**: Understand the current behavior
2. **Make small changes**: Modify one layer at a time
3. **Validate outputs**: Check that file structures match expectations
4. **Run affected tests**: Verify downstream consumers aren't broken

### Breaking Changes

If you change a script's input format or output structure:
1. Update the module docstring with the new signature
2. Provide migration path for old formats
3. Update any dependent scripts
4. Document in the script commit message

### Archiving Scripts

When a script is no longer needed:
1. Move it to `tools/scripts/archive/` with a note about deprecation
2. Leave a shell script redirect or comment for 1-2 releases
3. Update documentation to point to the replacement

## 13. Examples and Templates

See the templates in `/docs/development/SCRIPT_TEMPLATES/`:

- `generate-template.mjs`: Full loredeck generation example
- `test-template.mjs`: Test script pattern
- `maintenance-template.mjs`: Audit/repair pattern
- `utility-server-template.mjs`: HTTP server pattern

Use these as starting points for new scripts.

## Related Documentation

- [LOREDECK_AND_LORECARD_CREATION_GUIDE.md](../loredecks/LOREDECK_AND_LORECARD_CREATION_GUIDE.md): Authoring loredecks (used by generation scripts)
- [SAGA_LOREDECK_SCHEMA.md](../loredecks/SAGA_LOREDECK_SCHEMA.md): JSON schema for loredeck entries
- [LLM_LOREDECK_GENERATION_GUIDE.md](../loredecks/LLM_LOREDECK_GENERATION_GUIDE.md): Using LLMs to generate loredecks
- [SAGA_VISUAL_SMOKE.md](./SAGA_VISUAL_SMOKE.md): Visual smoke test scripts
