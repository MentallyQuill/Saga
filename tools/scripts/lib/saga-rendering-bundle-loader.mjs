import assert from 'node:assert/strict';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { artifactJSON, sha256 } from './saga-rendering-evidence.mjs';

/** Only explicitly referenced artifacts are read; no directory discovery or live source hashing. */
export async function loadRenderingBundle(directory, { evidenceFile = 'acceptance-evidence.json' } = {}) {
    const root = await realpath(directory), artifacts = new Map(), expanded = new Set();
    async function readRelative(relative) {
        assert.ok(typeof relative === 'string' && relative && !relative.includes('\\') && !path.isAbsolute(relative) && !relative.split('/').some(part => !part || part === '.' || part === '..'), 'Artifact paths must be canonical relative paths');
        const resolved = await realpath(path.resolve(root, relative));
        const local = path.relative(root, resolved);
        assert.ok(local && !local.startsWith(`..${path.sep}`) && local !== '..' && !path.isAbsolute(local), `Artifact escapes bundle: ${relative}`);
        return readFile(resolved);
    }
    const index = JSON.parse((await readRelative('index.json')).toString('utf8'));
    const evidenceBytes = await readRelative(evidenceFile);
    artifacts.set(evidenceFile, evidenceBytes);
    const evidence = JSON.parse(evidenceBytes.toString('utf8'));
    assert.equal(evidence.schemaVersion, 1, 'Unsupported supplemental evidence schema');
    const bundle = { index, evidence, evidencePath: { file: evidenceFile, sha256: sha256(evidenceBytes) }, artifacts, captures: [] };
    async function loadReferences(value) {
        if (!value || typeof value !== 'object') return;
        if (typeof value.file === 'string' && typeof value.sha256 === 'string') {
            if (!artifacts.has(value.file)) artifacts.set(value.file, await readRelative(value.file));
            assert.equal(sha256(artifacts.get(value.file)), value.sha256, `Corrupt artifact: ${value.file}`);
            if (value.file.endsWith('.json') && !expanded.has(value.file)) {
                expanded.add(value.file);
                await loadReferences(JSON.parse(artifacts.get(value.file).toString('utf8')));
            }
        }
        for (const child of Object.values(value)) await loadReferences(child);
    }
    // Load nested JSON references, e.g. source inventory, TAP, paired PNGs.
    await loadReferences(evidence);
    assert.ok(Array.isArray(index.captures), 'Missing capture index');
    for (const record of index.captures) {
        await loadReferences(record.screenshot);
        if (!record.file) { bundle.captures.push({ id: record.id, metadata: record.metadata }); continue; }
        const bytes = await readRelative(record.file);
        // The collector did not record raw JSON hashes. The supplemental frozen
        // capture manifest supplies these; never infer trust from a new digest.
        const reference = evidence.rawCaptures?.find(item => item.file === record.file);
        assert.ok(reference, `Missing sealed raw-capture hash: ${record.file}`);
        assert.equal(sha256(bytes), reference.sha256, 'Raw capture differs from sealed manifest');
        artifacts.set(record.file, bytes);
        const raw = artifactJSON(bundle, reference);
        assert.ok(!Object.hasOwn(raw, 'id') && !Object.hasOwn(raw, 'rawReference'), 'Reserved raw fields');
        bundle.captures.push({ ...raw, id: record.id, rawReference: reference });
    }
    return bundle;
}
