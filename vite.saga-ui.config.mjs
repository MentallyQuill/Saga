import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// @oxc-project/runtime 0.156.0 copies Babel helpers:
// https://github.com/oxc-project/oxc/blob/crates_v0.156.0/npm/runtime/README.md
// Notice: https://github.com/babel/babel/blob/v8.0.8/LICENSE
const helperLicense = `MIT License

Copyright (c) 2014-present Sebastian McKenzie and other contributors

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
`;

export default defineConfig({
    base: './',
    plugins: [
        svelte({ configFile: false, compilerOptions: { dev: false } }),
        {
            name: 'workbench-dependency-licenses',
            generateBundle(options, bundle) {
                const chunks = Object.values(bundle);
                if (chunks.length !== 1 || chunks[0].type !== 'chunk' || chunks[0].fileName !== 'view.js'
                    || chunks[0].imports.length || chunks[0].dynamicImports.length) {
                    throw new Error('Workbench UI must be one self-contained ES entry without CSS or extra chunks.');
                }
                for (const [id, module] of Object.entries(chunks[0].modules)) {
                    if (module.renderedLength === 0) continue;
                    const normalized = id.replaceAll('\\', '/');
                    if (!normalized.includes('/src/ui/loredeck-workbench/')
                        && !normalized.includes('/node_modules/svelte/src/')
                        && !normalized.includes('/node_modules/esm-env/')
                        && !normalized.startsWith('\0@oxc-project+runtime@')) {
                        throw new Error(`Unexpected workbench bundle dependency: ${id}`);
                    }
                }
                // Module metadata precedes final minification; unused DEV-only
                // exports can appear there even when absent from emitted code.
                if (/\/svelte\/(?:compiler|src\/internal\/client\/dev)\//.test(chunks[0].code)) {
                    throw new Error('Compiler/development code in emitted workbench bundle.');
                }
                const license = path => readFileSync(new URL(`./node_modules/${path}`, import.meta.url), 'utf8');
                this.emitFile({ type: 'asset', fileName: 'LICENSE.txt', source: [
                    'Svelte 5.57.3 (MIT)', license('svelte/LICENSE.md'), 'esm-env 1.2.2 (MIT)', license('esm-env/LICENSE'),
                    '@oxc-project/runtime 0.156.0 (Babel-derived helpers, MIT)', helperLicense,
                ].join('\n\n') });
            },
        },
    ],
    build: {
        target: ['chrome87', 'edge87', 'firefox83', 'safari14'],
        outDir: 'src/ui/generated/workbench',
        emptyOutDir: true,
        sourcemap: false,
        lib: {
            entry: fileURLToPath(new URL('./src/ui/loredeck-workbench/adapter.svelte.js', import.meta.url)),
            formats: ['es'],
            fileName: () => 'view.js',
        },
    },
});
