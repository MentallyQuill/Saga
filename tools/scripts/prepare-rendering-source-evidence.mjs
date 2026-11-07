import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { sha256 } from './lib/saga-rendering-evidence.mjs';

/** Reproduce both historical fingerprint algorithms from ONE immutable export.
 * Run after timing. This copies only the collector's explicit source inventory.
 * Canonical covers/index/exports are separately referenced by evidence schema.
 */
export async function prepareSourceEvidence({ sourceRoot, outputRoot, sourceRevision, sourceHash, capturePlatform }) {
    const root = await realpath(sourceRoot), names = [];
    async function visit(relative, optional = false) {
        let entries;
        try { entries = await readdir(path.join(root, relative), { withFileTypes: true }); }
        catch (error) { if (optional && error.code === 'ENOENT') return; throw error; }
        for (const entry of entries) {
            const child = `${relative}/${entry.name}`;
            if (entry.isDirectory()) await visit(child);
            else { assert.ok(entry.isFile(), `Unsupported source archive entry: ${child}`); names.push(child); }
        }
    }
    await visit('src'); await visit('styles'); names.push('manifest.json'); await visit('assets/generated', true);
    const entries = [];
    for (const name of names.sort()) {
        const sourceFile = await realpath(path.join(root, name));
        const local = path.relative(root, sourceFile);
        assert.ok(!local.startsWith(`..${path.sep}`) && local !== '..' && !path.isAbsolute(local), 'Source artifact escapes archive');
        const bytes = await readFile(sourceFile), file = `evidence/source/${name}`;
        const target = path.join(outputRoot, file);
        await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, bytes);
        entries.push({ path: name, file, sha256: sha256(bytes), collectorPath: name.startsWith('assets/generated/') && capturePlatform === 'win32' ? name.replaceAll('/', '\\') : name, bytes });
    }
    const digest = (items, key) => sha256(Buffer.concat([...items].sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0).map(entry => Buffer.concat([Buffer.from(key(entry)), entry.bytes]))));
    assert.equal(digest(entries, entry => entry.collectorPath), sourceHash, 'Source archive does not reproduce the capture fingerprint');
    const paritySourceHash = digest(entries.filter(entry => /^(src|styles)\//.test(entry.path)), entry => entry.path);
    const manifest = { schemaVersion: 1, sourceRevision, sourceHash, capturePlatform, paritySourceHash, files: entries.map(({ bytes, ...entry }) => entry) };
    await mkdir(outputRoot, { recursive: true });
    await writeFile(path.join(outputRoot, 'source-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    return manifest;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const [sourceRoot, outputRoot, indexFile] = process.argv.slice(2);
    assert.ok(sourceRoot && outputRoot && indexFile, 'Usage: node tools/scripts/prepare-rendering-source-evidence.mjs SOURCE_ROOT BUNDLE_ROOT INDEX.json');
    const index = JSON.parse(await readFile(indexFile, 'utf8'));
    await prepareSourceEvidence({ sourceRoot, outputRoot, sourceRevision: index.sourceRevision, sourceHash: index.sourceHash, capturePlatform: index.environment.platform });
}
