import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { sha256 } from './saga-parity-provenance.mjs';

function bounded(operation, timeoutMs, label) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    return Promise.race([operation, timeout]).finally(() => clearTimeout(timer));
}

const message = error => String(error?.message ?? error).slice(0, 800);
const fileRecord = (file, bytes) => ({ path: file, bytes: bytes.length, sha256: sha256(bytes) });

async function createRecord({ directory, caseName, browserName, provenance }, error, harness) {
    await mkdir(directory, { recursive: true });
    const slug = caseName.replace(/[^a-z0-9]+/gi, '-').slice(0, 80) || 'case';
    const folder = await mkdtemp(path.join(path.resolve(directory), `${slug}-`));
    return { folder, metadata: { caseName, browser: { name: harness?.browserName ?? browserName,
        version: harness?.browserVersion ?? null, executablePath: harness?.executablePath ?? null },
    provenance, error: { name: error?.name ?? 'Error', message: message(error) }, artifacts: {}, unavailable: {} } };
}

async function writeMetadata({ folder, metadata }) {
    await writeFile(path.join(folder, 'failure.json'), JSON.stringify(metadata, null, 2));
}

async function recordWithoutPage(options, error, reason, harness) {
    try {
        const record = await createRecord(options, error, harness);
        record.metadata.unavailable = { screenshot: reason, trace: reason };
        await writeMetadata(record);
    } catch (artifactError) { console.warn(`Parity failure metadata unavailable: ${message(artifactError)}`); }
}

async function saveTrace(tracing, folder, timeoutMs) {
    const pending = path.join(folder, '.trace.pending');
    const file = path.join(folder, 'trace.zip');
    const removePending = () => rm(pending, { force: true }).catch(() => {});
    const operation = Promise.resolve().then(() => tracing.stop({ path: pending }));
    try {
        await bounded(operation, timeoutMs, 'Trace stop');
        const bytes = await readFile(pending);
        if (!bytes.length) throw new Error('Trace returned an empty archive');
        await rename(pending, file);
        return fileRecord(file, bytes);
    } catch (error) {
        // A stop which settles after its deadline can only write the temporary
        // path. Remove it when it eventually settles as well as during cleanup.
        void operation.then(removePending, removePending);
        throw error;
    } finally { await removePending(); }
}

export async function allocateParityHarness(options) {
    const { directory, allocate, timeoutMs = 5000 } = options;
    if (!directory) return allocate();

    let harness;
    try { harness = await allocate(); }
    catch (error) {
        await recordWithoutPage(options, error, 'Harness allocation failed before diagnostics could access a page');
        throw error;
    }

    const originalStop = harness.stop.bind(harness);
    let tracing, traceUnavailable, traceStopAttempted = false;
    try {
        tracing = harness.page.context().tracing;
        await bounded(tracing.start({ screenshots: true, snapshots: true, sources: true }), timeoutMs, 'Trace start');
    } catch (error) { traceUnavailable = message(error); }

    let failure, cleanup, failed = false;
    harness.captureFailure = async error => {
        if (failed) return;
        failed = true;
        try {
            failure = await createRecord(options, error, harness);
            const { folder, metadata } = failure;
            try {
                const page = harness.page;
                if (!page || page.isClosed()) throw new Error('Page closed before screenshot capture');
                const bytes = await bounded(page.screenshot({ fullPage: true, timeout: timeoutMs }), timeoutMs, 'Screenshot');
                if (!bytes?.length) throw new Error('Screenshot returned empty bytes');
                const file = path.join(folder, 'failure.png');
                await writeFile(file, bytes);
                metadata.artifacts.screenshot = fileRecord(file, bytes);
            } catch (artifactError) { metadata.unavailable.screenshot = message(artifactError); }
            if (traceUnavailable) metadata.unavailable.trace = traceUnavailable;
            else {
                traceStopAttempted = true;
                try { metadata.artifacts.trace = await saveTrace(tracing, folder, timeoutMs); }
                catch (artifactError) { metadata.unavailable.trace = message(artifactError); }
            }
            await writeMetadata(failure);
        } catch (artifactError) { console.warn(`Parity failure artifacts unavailable: ${message(artifactError)}`); }
    };

    harness.stop = () => cleanup ??= (async () => {
        if (tracing && !traceStopAttempted) {
            try { await bounded(tracing.stop(), timeoutMs, 'Discard trace'); }
            catch { /* Diagnostics must leave original cleanup available. */ }
        }
        try { await originalStop(); }
        catch (error) {
            if (!failed) {
                await recordWithoutPage(options, error, 'Failure was detected during original cleanup', harness);
                throw error;
            }
            if (failure) {
                failure.metadata.unavailable.cleanup = message(error);
                try { await writeMetadata(failure); }
                catch (artifactError) { console.warn(`Parity cleanup metadata unavailable: ${message(artifactError)}`); }
            }
        } finally {
            if (failure) await rm(path.join(failure.folder, '.trace.pending'), { force: true }).catch(() => {});
            harness.captureFailure = undefined;
            tracing = undefined;
            failure = undefined;
        }
    })();
    return harness;
}
