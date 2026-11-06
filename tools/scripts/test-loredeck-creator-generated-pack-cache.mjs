import assert from 'node:assert/strict';
import {
  createLoredeckCreatorGeneratedPackCacheController,
  getLoredeckCreatorJobGeneratedPackId,
  hasLoredeckCreatorGeneratedPackProgressPayload,
} from '../../src/loredecks/loredeck-creator-generated-pack-cache.js';

const cloneJson = value => JSON.parse(JSON.stringify(value));

{
  let injectedCalls = 0;
  let fallbackSerializations = 0;
  const pack = {
    packId: 'generated-clone',
    payloadFile: 'generated-clone.v1.json',
    entryOverrides: { nami: { title: 'Nami' } },
    toJSON() { fallbackSerializations++; return { packId: this.packId }; },
  };
  const controller = createLoredeckCreatorGeneratedPackCacheController({
    getLoredeckDefinition: () => ({ packId: pack.packId }),
    hydrateCachedPayload: () => pack,
    cloneJson: value => { injectedCalls++; return { ...value }; },
  });
  controller.getGeneratedPackDefinition(pack.packId);
  assert.equal(injectedCalls, 1);
  assert.equal(fallbackSerializations, 0, 'An injected clone must not also evaluate the fallback clone.');
}

assert.equal(
  getLoredeckCreatorJobGeneratedPackId({ generatedPackId: 'generated-a', brief: { packId: 'brief-a' } }),
  'generated-a',
  'Generated pack id reads should prefer the linked generated pack id.',
);
assert.equal(
  getLoredeckCreatorJobGeneratedPackId({ brief: { packId: 'brief-a' } }),
  'brief-a',
  'Generated pack id reads should fall back to the approved brief pack id.',
);
assert.equal(
  hasLoredeckCreatorGeneratedPackProgressPayload({ payloadFile: 'pack.json' }),
  false,
  'Compact generated pack records without hydrated payload content should not count as progress payloads.',
);
assert.equal(
  hasLoredeckCreatorGeneratedPackProgressPayload({ payloadFile: 'pack.json', entryOverrides: { nami: {} } }),
  true,
  'Hydrated generated pack records with entry overrides should count as progress payloads.',
);
assert.equal(
  hasLoredeckCreatorGeneratedPackProgressPayload(
    { payloadFile: 'pack.json', tagRegistry: { tags: { hero: {} } } },
    { getTagRegistryCount: registry => Object.keys(registry.tags || {}).length },
  ),
  true,
  'Generated pack payload checks should honor injected registry counters.',
);

{
  let base = {
    packId: 'generated-pack',
    payloadFile: 'generated-pack.v1.json',
    revision: 1,
  };
  let hydratedOnce = true;
  const controller = createLoredeckCreatorGeneratedPackCacheController({
    getLoredeckDefinition: () => base,
    hydrateCachedPayload: pack => {
      if (!hydratedOnce) return pack;
      hydratedOnce = false;
      return {
        ...pack,
        revision: 2,
        manifestData: { id: pack.packId },
        entryOverrides: { nami: { title: 'Nami' } },
      };
    },
    cloneJson,
  });

  const hydrated = controller.getGeneratedPackDefinition('generated-pack');
  assert.equal(hydrated.entryOverrides.nami.title, 'Nami');
  hydrated.entryOverrides.nami.title = 'Mutated';

  const cached = controller.getGeneratedPackDefinition('generated-pack');
  assert.equal(cached.entryOverrides.nami.title, 'Nami', 'Cached generated packs should be cloned before returning.');
  assert.equal(cached.payloadFile, 'generated-pack.v1.json');

  base = {
    packId: 'generated-pack',
    payloadFile: 'generated-pack.v2.json',
    revision: 3,
  };
  const stale = controller.getGeneratedPackDefinition('generated-pack');
  assert.deepEqual(stale, base, 'A newer compact base record should evict stale cached generated payload content.');
  assert.equal(controller.getCachedPack('generated-pack'), null);
}

{
  const cleared = [];
  const hydrationRequests = new Map();
  const payloadCache = new Map([['generated-pack', { packId: 'generated-pack', manifestData: { id: 'generated-pack' } }]]);
  hydrationRequests.set('generated-pack', Promise.resolve(null));
  const controller = createLoredeckCreatorGeneratedPackCacheController({
    payloadCache,
    hydrationRequests,
    clearRelatedPackCaches: (packId, options) => cleared.push({ packId, options }),
  });

  assert.equal(controller.clearPackCaches('generated-pack', { clearDraftCache: true }), true);
  assert.equal(payloadCache.has('generated-pack'), false);
  assert.equal(hydrationRequests.has('generated-pack'), false);
  assert.deepEqual(cleared, [{ packId: 'generated-pack', options: { clearDraftCache: true } }]);
  assert.equal(controller.clearPackCaches('', {}), false);
}

{
  const refreshes = [];
  let hydrateCount = 0;
  const controller = createLoredeckCreatorGeneratedPackCacheController({
    getLoredeckDefinition: () => ({
      packId: 'generated-pack',
      payloadFile: 'generated-pack.v1.json',
      revision: 1,
    }),
    hydrateCachedPayload: pack => pack,
    hydratePayload: async pack => {
      hydrateCount += 1;
      return {
        ...pack,
        revision: 1,
        manifestData: { id: pack.packId },
        entryOverrides: { nami: { title: 'Nami' } },
      };
    },
    cloneJson,
    refreshCreatorWorkbench: options => refreshes.push({ target: 'workbench', options }),
    refreshPanelBody: options => refreshes.push({ target: 'panel', options }),
  });

  assert.equal(controller.maybeHydrateGeneratedPack({ generatedPackId: 'generated-pack' }), true);
  assert.equal(controller.maybeHydrateGeneratedPack({ generatedPackId: 'generated-pack' }), false, 'In-flight generated pack hydration should be deduped.');
  await controller.getHydrationRequest('generated-pack');
  assert.equal(hydrateCount, 1);
  assert.equal(controller.getHydrationRequest('generated-pack'), null);
  assert.equal(controller.getCachedPack('generated-pack').entryOverrides.nami.title, 'Nami');
  assert.deepEqual(refreshes, [
    { target: 'workbench', options: { preserveScroll: true } },
    { target: 'panel', options: { preserveScroll: true, preserveWindowScroll: true } },
  ]);
  assert.equal(controller.maybeHydrateGeneratedPack({ generatedPackId: 'generated-pack' }), false, 'Cached generated pack payloads should not be hydrated again.');
}

{
  const warnings = [];
  const controller = createLoredeckCreatorGeneratedPackCacheController({
    getLoredeckDefinition: () => ({ packId: 'generated-pack', payloadFile: 'generated-pack.v1.json' }),
    hydrateCachedPayload: pack => pack,
    hydratePayload: async () => {
      throw new Error('hydrate failed');
    },
    warn: (message, error) => warnings.push({ message, error: error.message }),
  });

  assert.equal(controller.maybeHydrateGeneratedPack({ generatedPackId: 'generated-pack' }, { refresh: false }), true);
  const result = await controller.getHydrationRequest('generated-pack');
  assert.equal(result, null);
  assert.equal(controller.getHydrationRequest('generated-pack'), null);
  assert.deepEqual(warnings, [{
    message: '[Saga] Deck Maker generated Loredeck payload hydration failed:',
    error: 'hydrate failed',
  }]);
}

console.log('Deck Maker generated-pack cache controller tests passed.');
