// jsdom doesn't implement IndexedDB; the template store persists there
// (see useTemplateStore.ts), so tests need a fake implementation.
import 'fake-indexeddb/auto';
