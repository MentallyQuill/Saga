import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const mimeTypes = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
    ['.mjs', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'], ['.png', 'image/png'],
    ['.webp', 'image/webp'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
    ['.svg', 'image/svg+xml; charset=utf-8'], ['.ico', 'image/x-icon'],
]);
export async function startVisualSmokeServer({ sourceRoot = defaultRoot, fixtureRoot = path.join(defaultRoot, 'tests/browser'), host = '127.0.0.1', port = 8765, browserCache = false } = {}) {
    sourceRoot = await fs.realpath(path.resolve(sourceRoot));
    fixtureRoot = await fs.realpath(path.resolve(fixtureRoot));
    const cacheControl = browserCache ? 'public, max-age=3600' : 'no-store';
    function send(res, status, body, contentType = 'text/plain; charset=utf-8', head = false) {
        res.writeHead(status, { 'content-type': contentType, 'cache-control': cacheControl });
        res.end(head ? undefined : body);
    }
    const inside = (root, target) => target === root || target.startsWith(`${root}${path.sep}`);
    const server = http.createServer(async (req, res) => {
        if (!['GET', 'HEAD'].includes(req.method || '')) return send(res, 405, 'Method not allowed');
        try {
            const decoded = decodeURIComponent(String(req.url || '/').split('?')[0]);
            if (decoded === '/favicon.ico') return send(res, 204, '');
            const performanceFixture = decoded.startsWith('/__performance/');
            const root = performanceFixture ? fixtureRoot : sourceRoot;
            const relative = performanceFixture ? decoded.slice('/__performance/'.length) : decoded === '/' ? 'tests/browser/visual-smoke.html' : decoded.replace(/^\/+/, '');
            const target = path.resolve(root, relative);
            if (!inside(root, target)) return send(res, 403, 'Forbidden');
            const real = await fs.realpath(target);
            if (!inside(root, real)) return send(res, 403, 'Forbidden');
            const stat = await fs.stat(real);
            if (!stat.isFile()) return send(res, 404, 'Not found');
            return send(res, 200, await fs.readFile(real), mimeTypes.get(path.extname(real).toLowerCase()) || 'application/octet-stream', req.method === 'HEAD');
        } catch (error) {
            return send(res, error?.code === 'ENOENT' ? 404 : error instanceof URIError ? 400 : 500, error?.code === 'ENOENT' ? 'Not found' : error.message);
        }
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
    return { server, origin: `http://${host}:${server.address().port}`, cacheControl, stop: () => new Promise((resolve, reject) => { server.closeAllConnections(); server.close(error => error ? reject(error) : resolve()); }) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const args = process.argv.slice(2);
    function readArg(name, fallback) {
        const inline = args.find(arg => arg.startsWith(`--${name}=`));
        if (inline) return inline.slice(name.length + 3);
        const index = args.indexOf(`--${name}`);
        return index >= 0 && args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : fallback;
    }
    const harness = await startVisualSmokeServer({ sourceRoot: readArg('source-root', defaultRoot), fixtureRoot: readArg('fixture-root', path.join(defaultRoot, 'tests/browser')), host: readArg('host', '127.0.0.1'), port: Number(readArg('port', '8765')), browserCache: args.includes('--browser-cache') });
    const url = `${harness.origin}/tests/browser/visual-smoke.html`;
    if (!args.includes('--check')) {
        console.log(`Saga visual smoke harness: ${url}`);
        console.log('Press Ctrl+C to stop.');
    } else {
        try {
            for (const [route, title] of [['/tests/browser/visual-smoke.html', 'Saga Visual Smoke Harness'], ['/tests/browser/visual-smoke.html?tab=context&review=context-proposals', 'Saga Visual Smoke Harness'], ['/tests/browser/dropdown-latency.html', 'Saga Dropdown Latency Harness']]) {
                const response = await fetch(`${harness.origin}${route}`);
                if (!response.ok || !(await response.text()).includes(title)) throw new Error(`Harness check failed: ${route}`);
            }
            console.log('Visual smoke server check passed.');
        } catch (error) { console.error(error); process.exitCode = 1; }
        finally { await harness.stop(); }
    }
}
