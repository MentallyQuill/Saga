import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, readdir, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { allocateParityHarness } from './saga-parity-failure-artifacts.mjs';

function mockHarness({ closed = false, screenshotError, traceError, closeError, stallDiscard = false } = {}) {
    const calls = [];
    const tracing = {
        async start() { calls.push('start'); },
        async stop(options) {
            calls.push(options?.path ? 'save-trace' : 'discard-trace');
            if (!options?.path && stallDiscard) return new Promise(() => {});
            if (options?.path) {
                if (traceError) throw traceError;
                await writeFile(options.path, 'mock trace');
            }
        },
    };
    return { calls, harness: { browserName: 'chromium', browserVersion: 'mock', executablePath: 'mock-browser',
        page: { isClosed: () => closed, context: () => ({ tracing }), async screenshot(options) {
            assert.equal(options.fullPage, true);
            calls.push('screenshot');
            if (screenshotError) throw screenshotError;
            return Buffer.from('mock PNG');
        } },
        async stop() { calls.push('close'); if (closeError) throw closeError; },
    } };
}

async function artifactDirectory(t) {
    const directory = await mkdtemp(path.join(tmpdir(), 'saga-parity-artifact-test-'));
    t.after(async () => {
        for (const name of await readdir(directory)) {
            const caseDirectory = path.join(directory, name);
            for (const file of await readdir(caseDirectory)) await unlink(path.join(caseDirectory, file));
            await rmdir(caseDirectory);
        }
        await rmdir(directory);
    });
    return directory;
}

const options = (directory, allocate) => ({ directory, allocate, caseName: 'Mock parity case', browserName: 'chromium', provenance: { revision: 'mock-source', files: { probe: 'mock-hash' } } });

async function readCase(directory) {
    const cases = await readdir(directory);
    assert.equal(cases.length, 1);
    const caseDirectory = path.join(directory, cases[0]);
    return { files: (await readdir(caseDirectory)).sort(), metadata: JSON.parse(await readFile(path.join(caseDirectory, 'failure.json'), 'utf8')) };
}

test('disabled path returns the original harness without diagnostics', async () => {
    const { calls, harness } = mockHarness();
    assert.equal(await allocateParityHarness(options(undefined, async () => harness)), harness);
    await harness.stop();
    assert.deepEqual(calls, ['close']);
});

test('successful case discards its trace and closes exactly once without artifacts', async t => {
    const directory = await artifactDirectory(t);
    const { calls, harness } = mockHarness();
    const allocated = await allocateParityHarness(options(directory, async () => harness));
    await allocated.stop(); await allocated.stop();
    assert.deepEqual(calls, ['start', 'discard-trace', 'close']);
    assert.deepEqual(await readdir(directory), []);
});

test('failed case captures both artifacts before closing and preserves the original error', async t => {
    const directory = await artifactDirectory(t);
    const { calls, harness } = mockHarness({ closeError: new Error('cleanup fault') });
    const allocated = await allocateParityHarness(options(directory, async () => harness));
    const original = new Error('original assertion');
    await assert.rejects(async () => {
        try { throw original; }
        catch (error) { await allocated.captureFailure(error); throw error; }
        finally { await allocated.stop(); }
    }, error => error === original);
    await allocated.stop();
    assert.deepEqual(calls, ['start', 'screenshot', 'save-trace', 'close']);
    const { files, metadata } = await readCase(directory);
    assert.deepEqual(files, ['failure.json', 'failure.png', 'trace.zip']);
    assert.equal(metadata.error.message, original.message);
    assert.equal(metadata.caseName, 'Mock parity case');
    assert.equal(metadata.browser.version, 'mock');
    assert.equal(metadata.provenance.revision, 'mock-source');
    assert.match(metadata.artifacts.screenshot.sha256, /^[a-f0-9]{64}$/);
    assert.match(metadata.artifacts.trace.sha256, /^[a-f0-9]{64}$/);
});

test('capture faults leave metadata, preserve the assertion, and still close once', async t => {
    const directory = await artifactDirectory(t);
    const { calls, harness } = mockHarness({ screenshotError: new Error('screenshot fault'), traceError: new Error('trace fault') });
    const allocated = await allocateParityHarness(options(directory, async () => harness));
    const original = new Error('assertion with capture faults');
    await assert.rejects(async () => {
        try { throw original; }
        catch (error) { await allocated.captureFailure(error); throw error; }
        finally { await allocated.stop(); }
    }, error => error === original);
    const { files, metadata } = await readCase(directory);
    assert.deepEqual(files, ['failure.json']);
    assert.match(metadata.unavailable.screenshot, /screenshot fault/);
    assert.match(metadata.unavailable.trace, /trace fault/);
    assert.equal(calls.filter(call => call === 'close').length, 1);
});

test('allocation failure records unavailable diagnostics without replacing the allocation error', async t => {
    const directory = await artifactDirectory(t);
    const original = new Error('allocation fault');
    await assert.rejects(allocateParityHarness(options(directory, async () => { throw original; })), error => error === original);
    const { files, metadata } = await readCase(directory);
    assert.deepEqual(files, ['failure.json']);
    assert.match(metadata.unavailable.screenshot, /allocat/i);
    assert.match(metadata.unavailable.trace, /allocat/i);
});

test('a closed page records the unavailable screenshot and retains a recoverable trace', async t => {
    const directory = await artifactDirectory(t);
    const { calls, harness } = mockHarness({ closed: true });
    const allocated = await allocateParityHarness(options(directory, async () => harness));
    await allocated.captureFailure(new Error('page closed'));
    await allocated.stop();
    const { files, metadata } = await readCase(directory);
    assert.deepEqual(files, ['failure.json', 'trace.zip']);
    assert.match(metadata.unavailable.screenshot, /closed/i);
    assert.deepEqual(calls, ['start', 'save-trace', 'close']);
});

test('a stalled trace discard cannot prevent original cleanup', async t => {
    const directory = await artifactDirectory(t);
    const { calls, harness } = mockHarness({ stallDiscard: true });
    const allocated = await allocateParityHarness({ ...options(directory, async () => harness), timeoutMs: 5 });
    await allocated.stop();
    assert.deepEqual(calls, ['start', 'discard-trace', 'close']);
    assert.deepEqual(await readdir(directory), []);
});
