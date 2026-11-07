import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { sha256 } from './lib/saga-rendering-evidence.mjs';

// Supplemental probe only. It does not alter timed samples or fetch from a
// timed browser. Run AFTER both matrices, against the immutable source export.
export async function recordAssetIdentity({ sourceRoot, protocolRoot, sourceHash, paritySourceHash, protocolHash, sourceManifestFile, assets, outputRoot }) {
    const root = await realpath(sourceRoot), protocol = await realpath(protocolRoot);
    const manifest = JSON.parse(await readFile(path.join(protocol, 'frozen-protocol.json'), 'utf8'));
    assert.ok(sourceManifestFile, 'Provide the independently prepared immutable source manifest');
    const sourceManifest = JSON.parse(await readFile(sourceManifestFile, 'utf8'));
    assert.equal(sourceManifest.sourceHash, sourceHash, 'Asset probe source fingerprint mismatch');
    assert.equal(sourceManifest.paritySourceHash, paritySourceHash, 'Asset probe parity fingerprint mismatch');
    for (const entry of sourceManifest.files) {
        assert.ok(typeof entry.path === 'string' && !entry.path.includes('\\') && !path.isAbsolute(entry.path) && entry.path.split('/').every(part => part && part !== '.' && part !== '..'), 'Noncanonical source manifest path');
        assert.equal(sha256(await readFile(path.join(root, entry.path))), entry.sha256, `Asset probe source archive changed: ${entry.path}`);
    }
    assert.equal(manifest.protocolHash, protocolHash, 'Wrong frozen protocol');
    const serverFile = 'tools/scripts/serve-visual-smoke.mjs';
    const serverHash = sha256(await readFile(path.join(protocol, serverFile)));
    assert.equal(serverHash, manifest.files.find(item => item.path === serverFile)?.sha256, 'Frozen server hash mismatch');
    const { startVisualSmokeServer } = await import(pathToFileURL(path.join(protocol, serverFile)).href);
    const server = await startVisualSmokeServer({ sourceRoot: root, fixtureRoot: path.join(protocol, 'tests/browser'), port: 0, browserCache: true });
    const responses = [], exported = [];
    try {
        for (const asset of assets) {
            assert.ok(typeof asset.path === 'string' && !asset.path.includes('\\') && !path.isAbsolute(asset.path) && asset.path.split('/').every(part => part && part !== '.' && part !== '..'), 'Noncanonical asset path');
            const file = await realpath(path.join(root, asset.path));
            const local = path.relative(root, file);
            assert.ok(local && !local.startsWith(`..${path.sep}`) && local !== '..' && !path.isAbsolute(local), 'Asset escapes source archive');
            const bytes = await readFile(file), hash = sha256(bytes);
            const url = `${server.origin}/${asset.path.split('/').map(encodeURIComponent).join('/')}`;
            const response = await fetch(url), body = Buffer.from(await response.arrayBuffer());
            assert.ok(response.ok, `HTTP ${response.status}: ${asset.path}`);
            assert.equal(sha256(body), hash, 'Observed HTTP body differs from immutable source');
            const relative = `evidence/assets/${asset.path}`;
            const target = path.join(outputRoot, relative);
            await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, bytes);
            exported.push({ ...asset, file: relative, sha256: hash });
            responses.push({ path: asset.path, url, status: response.status, sha256: hash, sourceHash, contentType: response.headers.get('content-type'), bytes: body.length });
        }
    } finally { await server.stop(); }
    const probeHash = sha256(await readFile(new URL(import.meta.url)));
    return { assets: exported, proof: { sourceHash, paritySourceHash, protocolHash, probeHash, serverHash, responses } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const [sourceRoot, protocolRoot, specificationFile, outputRoot] = process.argv.slice(2);
    assert.ok(sourceRoot && protocolRoot && specificationFile && outputRoot, 'Usage: node tools/scripts/record-rendering-asset-identity.mjs SOURCE_ROOT FROZEN_PROTOCOL_ROOT SPECIFICATION.json OUTPUT_ROOT');
    const specification = JSON.parse(await readFile(specificationFile, 'utf8'));
    const result = await recordAssetIdentity({ ...specification, sourceRoot, protocolRoot, outputRoot });
    await mkdir(outputRoot, { recursive: true });
    await writeFile(path.join(outputRoot, 'asset-identity.json'), `${JSON.stringify(result, null, 2)}\n`);
}
