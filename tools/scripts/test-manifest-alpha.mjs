import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

async function readText(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

const manifest = JSON.parse(await readText('manifest.json'));
const readme = await readText('README.md');
const alphaSystems = await readText('docs/development/SAGA_ALPHA_RELEASE_SYSTEMS.md');

assert.equal(manifest.display_name, 'Saga', 'Manifest display_name should remain Saga.');
assert.equal(manifest.key, 'saga', 'Manifest key should remain saga.');
assert.match(
  manifest.version,
  /^0\.\d+\.\d+-(?:alpha|beta)\.\d+$/,
  'Manifest must declare a pre-1.0 alpha or beta version.'
);
const seriesNotesVersion = manifest.version.replace(/\.\d+$/, '.1');
const buildNotes = await readText(`docs/release/${manifest.version}.md`).catch(error => {
  if (error.code !== 'ENOENT' || seriesNotesVersion === manifest.version) throw error;
  return null;
});
const notesVersion = buildNotes === null ? seriesNotesVersion : manifest.version;
const releaseNotesPath = `docs/release/${notesVersion}.md`;
const releaseNotes = buildNotes ?? await readText(releaseNotesPath);

assert.equal(manifest.auto_update, false, 'Prerelease manifest must keep auto_update disabled.');
assert.match(
  String(manifest.minimum_client_version || ''),
  /^\d+\.\d+\.\d+$/,
  'Manifest must declare a concrete minimum_client_version.'
);

assert(readme.includes(manifest.version), 'README Status should mention the manifest version.');
assert(readme.includes(manifest.minimum_client_version), 'README Status should mention the minimum SillyTavern version.');
assert(readme.includes(releaseNotesPath), 'README should link the prerelease notes.');
assert.match(readme, /automatic updates are disabled|auto_update.+disabled/i, 'README should document manual updates.');
assert.match(readme, /does not auto-open/i, 'README Fast Start should document the non-auto-open first-run behavior.');

assert(alphaSystems.includes('node tools/scripts/run-alpha-gate.mjs'), 'Alpha systems doc should publish the release gate command.');
assert(alphaSystems.includes('auto_update: false'), 'Alpha systems doc should document disabled automatic updates.');

assert(releaseNotes.includes(notesVersion), 'Release notes should mention the version they describe.');
assert(releaseNotes.includes(manifest.minimum_client_version), 'Release notes should mention the minimum SillyTavern version.');
assert(releaseNotes.includes('auto_update: false'), 'Release notes should document disabled automatic updates.');
assert(releaseNotes.includes('node tools/scripts/run-alpha-gate.mjs'), 'Release notes should publish the release gate command.');
assert.match(releaseNotes, /Unsupported old imported state schemas are rejected/i, 'Release notes should document unsupported old-schema handling.');

console.log('Prerelease manifest contract passed.');
