import assert from 'node:assert/strict';

// Sequence numbers are assigned at request initiation, never completion.
export function createSagaPerformanceRequestJournal() {
    const records = [];
    const byId = new Map();
    const listeners = new Set();
    const notify = () => { for (const listener of [...listeners]) listener(); };
    function range(start, end) {
        assert.ok(Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end >= start && end <= records.length, 'Invalid request-start window');
        return records.slice(start, end);
    }
    return {
        mark: () => records.length,
        snapshot(start = 0, end = records.length) { return range(start, end).map(record => ({ ...record })); },
        start({ id, url, type, startedAt }) {
            assert.ok(id && !byId.has(id), 'Request IDs must be unique');
            assert.ok(Number.isFinite(startedAt), 'Request start must be finite');
            const record = { id, sequence: records.length, url, type, startedAt, state: 'pending', status: null, fromDiskCache: false, encodedDataLength: null };
            records.push(record); byId.set(id, record);
            return id;
        },
        respond(id, { status, fromDiskCache = false, mimeType = '' }) {
            const record = byId.get(id); assert.ok(record, `Unknown request: ${id}`);
            Object.assign(record, { status, fromDiskCache, mimeType });
        },
        finish(id, encodedDataLength) {
            assert.ok(Number.isFinite(encodedDataLength) && encodedDataLength >= 0, 'Network bytes must be finite and nonnegative');
            const record = byId.get(id); assert.ok(record, `Unknown request: ${id}`);
            Object.assign(record, { state: 'complete', encodedDataLength }); notify();
        },
        fail(id, error) {
            const record = byId.get(id); assert.ok(record, `Unknown request: ${id}`);
            Object.assign(record, { state: 'failed', error: String(error) }); notify();
        },
        async settle(start, end, { timeoutMs = 30000 } = {}) {
            const measured = range(start, end);
            await new Promise((resolve, reject) => {
                let timer;
                const done = error => { clearTimeout(timer); listeners.delete(check); error ? reject(error) : resolve(); };
                const check = () => {
                    const failure = measured.find(record => record.state === 'failed');
                    if (failure) return done(new Error(`Measured request failed: ${failure.id}: ${failure.error}`));
                    if (measured.every(record => record.state === 'complete')) done();
                };
                timer = setTimeout(() => done(new Error(`Measured request window timed out: ${measured.filter(r => r.state === 'pending').map(r => r.id).join(', ')}`)), timeoutMs);
                listeners.add(check); check();
            });
            return measured.map(record => ({ ...record }));
        },
    };
}
export function resourceBytesForWindow(entries, { startMs, endMs }) {
    assert.ok(Number.isFinite(startMs) && Number.isFinite(endMs) && startMs <= endMs, 'Invalid resource timing window');
    return entries.filter(entry => entry.startTime >= startMs && entry.startTime < endMs).reduce((sum, entry) => {
        assert.ok(Number.isFinite(entry.transferSize) && entry.transferSize >= 0, 'Resource bytes must be finite and nonnegative');
        return sum + entry.transferSize;
    }, 0);
}
