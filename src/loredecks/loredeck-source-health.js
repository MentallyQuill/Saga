/**
 * loredeck-source-health.js -- Saga
 * Environment-agnostic Loredeck entry-file loading and Pack Health assembly.
 *
 * This module is shared by the browser runtime (loredeck-loader.js) and the
 * Node CLI toolkit (tools/loredeck). All file access goes through an injected
 * readJsonDetailed(url) function so both environments run the exact same
 * health code path. baseUrl may be an http(s) URL in the browser or a
 * file:// URL in Node; refs are resolved with the standard URL constructor
 * in both cases.
 */

import {
    analyzeEntryContextHealth,
    loadTimelineRegistryForHealth,
} from './context-health.js';
import {
    addHealthIssue,
    createHealth,
    entryListFromJson,
    finalizeHealth,
} from './loredeck-health-core.js';
import {
    analyzeEntries,
    analyzeManifestFileListHealth,
} from './loredeck-health-engine.js';
import { applyRegistryEntryOverrides } from './loredeck-normalizer.js';
import { loadTagRegistryForHealth } from './tag-registry-health.js';

const PARALLEL_ENTRY_FILE_BATCH_SIZE = 4;

function* readEntryFiles(files, baseUrl, readJsonDetailed, batchSize) {
    for (let start = 0; start < files.length; start += batchSize) {
        const batch = Array.from(files.slice(start, start + batchSize), async file => {
            try {
                const url = new URL(file, baseUrl);
                const result = await readJsonDetailed(url);
                return { file, url, result };
            } catch (error) {
                // Capture failures immediately and surface them in manifest order.
                return { error };
            }
        });
        yield* batch;
    }
}

export async function loadLoredeckEntryFilesForHealth(manifest = {}, baseUrl, health, registryRecord = null, readJsonDetailed, externalTagRegistries = [], { parallelEntryFiles = false } = {}) {
    const files = Array.isArray(manifest.files) ? manifest.files : [];
    const entryFiles = [];
    health.summary.fileCount = files.length;
    analyzeManifestFileListHealth(health, manifest);

    const batchSize = parallelEntryFiles ? PARALLEL_ENTRY_FILE_BATCH_SIZE : 1;
    for (const pending of readEntryFiles(files, baseUrl, readJsonDetailed, batchSize)) {
        const entryFile = await pending;
        if ('error' in entryFile) throw entryFile.error;
        const { file, url, result } = entryFile;
        if (!result.ok) {
            health.summary.missingFileCount += 1;
            addHealthIssue(health, 'error', 'missing_entry_file', `Loredeck entry file failed to load: ${file}.`, {
                file,
                status: result.status,
                detail: result.error || result.statusText || '',
            });
            entryFiles.push({ file, url, ok: false, entries: [], schemaVersion: 0, error: result.error || '' });
            continue;
        }

        const entries = entryListFromJson(result.json);
        health.summary.loadedFileCount += 1;
        entryFiles.push({
            file,
            url,
            ok: true,
            json: result.json,
            entries,
            schemaVersion: result.json?.schemaVersion || manifest.entrySchemaVersion || 2,
        });
    }

    const finalEntryFiles = applyRegistryEntryOverrides(entryFiles, registryRecord, manifest, health);
    const timeline = await loadTimelineRegistryForHealth(manifest, baseUrl, health, registryRecord, readJsonDetailed);
    const tagIndex = await loadTagRegistryForHealth(manifest, baseUrl, health, registryRecord, readJsonDetailed, externalTagRegistries);
    analyzeEntryContextHealth(health, finalEntryFiles, timeline);
    analyzeEntries(health, finalEntryFiles, manifest, tagIndex);
    return finalEntryFiles;
}

export async function buildLoredeckHealthForSource({ packId, manifest = {}, baseUrl, registryRecord = null, readJsonDetailed, externalTagRegistries = [] }) {
    const health = createHealth(manifest.id || packId);
    const entryFiles = await loadLoredeckEntryFilesForHealth(manifest, baseUrl, health, registryRecord, readJsonDetailed, externalTagRegistries);
    return { health: finalizeHealth(health), entryFiles };
}
