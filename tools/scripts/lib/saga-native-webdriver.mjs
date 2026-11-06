import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

// Native Firefox (including ESR) does not speak Playwright's patched protocol.
// Require explicit binaries; a configured native check must never silently skip.
export async function startNativeFirefox({ binary, driverPath, expectedVersion }) {
    assert.ok(binary && driverPath, 'Declare SAGA_FIREFOX_BINARY and SAGA_GECKODRIVER_PATH');
    const driver = spawn(driverPath, ['--host', '127.0.0.1', '--port', '0'], { windowsHide: true });
    let base, session;
    async function request(route, body, method = 'POST') {
        const response = await fetch(`${base}${route}`, { method, headers: { 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
        const result = await response.json();
        assert.ok(response.ok && !result.value?.error, JSON.stringify(result));
        return result.value;
    }
    try {
        base = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Native driver listen timeout')), 15000);
            const fail = error => { clearTimeout(timer); reject(error); };
            driver.once('error', fail); driver.once('exit', code => fail(new Error(`Native driver exited ${code}`)));
            driver.stdout.on('data', chunk => {
                const match = chunk.toString().match(/Listening on (127\.0\.0\.1:\d+)/);
                if (match) { clearTimeout(timer); resolve(`http://${match[1]}`); }
            });
            driver.stderr.on('data', chunk => process.stderr.write(chunk));
        });
        const created = await request('/session', { capabilities: { alwaysMatch: { browserName: 'firefox', 'moz:firefoxOptions': { binary, args: ['-headless'] } } } });
        session = created.sessionId;
        assert.ok(session, 'Native W3C session exists');
        assert.match(created.capabilities.browserVersion, new RegExp(expectedVersion));
        const route = suffix => `/session/${session}/${suffix}`;
        const evaluate = (fn, ...args) => request(route('execute/async'), {
            script: `const done = arguments[arguments.length - 1]; Promise.resolve((${fn.toString()})(...Array.from(arguments).slice(0, -1))).then(value => done({ok:true,value}), error => done({ok:false,error:String(error.stack || error)}));`, args,
        }).then(result => { assert.ok(result.ok, result.error); return result.value; });
        await request(route('timeouts'), { script: 30000, pageLoad: 30000 });
        return { capabilities: created.capabilities, evaluate,
            goto: url => request(route('url'), { url }),
            async stop() { try { if (session) await request(`/session/${session}`, undefined, 'DELETE'); } finally { driver.kill(); } },
        };
    } catch (error) {
        try { if (session) await request(`/session/${session}`, undefined, 'DELETE'); } finally { driver.kill(); }
        throw error;
    }
}
