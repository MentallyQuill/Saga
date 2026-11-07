import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Seven small immutable method files only. No captures, sampling or harness.
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const relativeRoot = 'tests/fixtures/rendering-performance-9a3';
const root = path.join(repoRoot, relativeRoot);
const manifest = JSON.parse(await readFile(path.join(root, 'frozen-protocol.json'), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const chunks = [];
function checkAutocrlf(relative, bytes) {
    // Apply Git's actual clean filter with Windows autocrlf semantics, without
    // writing an object/index or performing a checkout. Attributes must preserve
    // both the six LF files and the one intentionally CRLF fixture byte-for-byte.
    const actual = execFileSync('git', ['-c', 'core.autocrlf=true', 'hash-object', '--stdin', `--path=${relative}`], { cwd: repoRoot, input: bytes, windowsHide: true }).toString('utf8').trim();
    const expected = createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
    assert.equal(actual, expected, `Git autocrlf normalization changed ${relative}`);
}
assert.equal(manifest.files.length, 6);
for (const entry of manifest.files) {
    const bytes = await readFile(path.join(root, entry.path));
    assert.equal(hash(bytes), entry.sha256, `Individual frozen file hash: ${entry.path}`);
    assert.equal(bytes.includes(13), false, 'Six protocol files retain canonical LF');
    checkAutocrlf(`${relativeRoot}/${entry.path}`, bytes);
    chunks.push(Buffer.from(entry.path), bytes);
}
assert.equal(hash(Buffer.concat(chunks)), '9a3dd0668f9be5b9403977ee2b2e65cf2a614ecf12d2737f15812e61bc94a6a3');
const fixturePath = 'tests/browser/performance-fixtures.mjs';
const fixture = await readFile(path.join(root, fixturePath));
assert.equal(hash(fixture), 'acc70381c0758438d0f1f3b59153fc3be876d82b8b764a11e15c78de6e4e6216');
checkAutocrlf(`${relativeRoot}/${fixturePath}`, fixture);
console.log('Portable six-file9a3 / acc70381 fixture hashes and Git autocrlf preservation passed; no sampling executed.');
