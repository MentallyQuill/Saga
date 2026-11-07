import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const paritySourceRoot = path.resolve(process.env.SAGA_PARITY_SOURCE_ROOT || process.cwd());
export async function parityRuntimeHash(root) {
    root = path.resolve(root);
    const files = (await Promise.all(['src', 'styles'].map(async dir =>
        (await readdir(path.join(root, dir), { recursive: true, withFileTypes: true })).filter(item => item.isFile())
            .map(item => path.relative(root, path.join(item.parentPath, item.name)).replaceAll('\\', '/'))))).flat().sort();
    return sha256(Buffer.concat(await Promise.all(files.map(async file => Buffer.concat([Buffer.from(file), await readFile(path.join(root, file))])))));
}
export async function parityProvenance(extraFiles = []) {
    const view = 'src/ui/generated/workbench/view.js';
    const files = await Promise.all(['tests/browser/performance-fixtures.mjs', ...extraFiles].filter(Boolean)
        .map(async file => [file, sha256(await readFile(file))]));
    files.push([view, sha256(await readFile(path.join(paritySourceRoot, view)))]);
    return { revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim(),
        sourceRoot: paritySourceRoot, sourceHash: await parityRuntimeHash(paritySourceRoot), node: process.version, files: Object.fromEntries(files) };
}
