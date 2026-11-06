import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export async function parityProvenance(extraFiles = []) {
    const root = process.cwd();
    const files = (await Promise.all(['src', 'styles'].map(async dir =>
        (await readdir(path.join(root, dir), { recursive: true, withFileTypes: true })).filter(item => item.isFile())
            .map(item => path.relative(root, path.join(item.parentPath, item.name)).replaceAll('\\', '/'))))).flat().sort();
    const sourceHash = sha256(Buffer.concat(await Promise.all(files.map(async file => Buffer.concat([Buffer.from(file), await readFile(file)])))));
    return { revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim(), sourceHash,
        node: process.version, files: Object.fromEntries(await Promise.all(['tests/browser/performance-fixtures.mjs', 'src/ui/generated/workbench/view.js', ...extraFiles].filter(Boolean)
            .map(async file => [file, sha256(await readFile(file))]))) };
}
