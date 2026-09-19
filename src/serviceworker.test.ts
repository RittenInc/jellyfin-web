import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (event: unknown) => void;

const listeners: Record<string, Listener> = {};

/** Minimal stand in for the Cache API, keyed by request URL. */
class FakeCache {
    entries = new Map<string, { url: string }>();

    put(request: { url: string }, response: unknown) {
        this.entries.set(request.url, response as { url: string });
        return Promise.resolve();
    }

    keys() {
        return Promise.resolve([...this.entries.keys()].map(url => ({ url })));
    }

    delete(request: { url: string }) {
        return Promise.resolve(this.entries.delete(request.url));
    }
}

const cache = new FakeCache();

const fakeCaches = {
    open: () => Promise.resolve(cache),
    keys: () => Promise.resolve([]),
    delete: () => Promise.resolve(true),
    match: (request: { url: string }) => Promise.resolve(cache.entries.get(request.url))
};

vi.stubGlobal('self', {
    addEventListener: (type: string, listener: Listener) => {
        listeners[type] = listener;
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() }
});
vi.stubGlobal('caches', fakeCaches);

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

// The worker registers its listeners on import, so the globals above must be stubbed first
beforeAll(async () => {
    await import('./serviceworker');
});

const IMAGE_URL = 'https://jellyfin.example/Items/abc123/Images/Primary?fillWidth=320&quality=82&tag=deadbeef';

interface FetchEventStub {
    request: { method: string, url: string };
    responded?: Promise<unknown>;
    respondWith: (promise: Promise<unknown>) => void;
    waitUntil: (promise: Promise<unknown>) => void;
}

const dispatchFetch = async (url: string, method = 'GET') => {
    const pending: Promise<unknown>[] = [];
    const event: FetchEventStub = {
        request: { method, url },
        respondWith(promise) {
            this.responded = promise;
        },
        waitUntil(promise) {
            pending.push(promise);
        }
    };

    listeners.fetch(event);
    const response = event.responded ? await event.responded : undefined;
    await Promise.all(pending);

    return { handled: Boolean(event.responded), response };
};

const imageResponse = () => ({
    ok: true,
    type: 'basic',
    url: IMAGE_URL,
    clone() {
        return this;
    }
});

describe('serviceworker image cache', () => {
    beforeEach(() => {
        cache.entries.clear();
        fetchMock.mockReset();
    });

    it('Should not handle requests that are not item images', async () => {
        const { handled } = await dispatchFetch('https://jellyfin.example/Videos/abc123/stream.mkv');
        expect(handled).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('Should not handle item images without a tag, which could change', async () => {
        const { handled } = await dispatchFetch('https://jellyfin.example/Items/abc123/Images/Primary?fillWidth=320');
        expect(handled).toBe(false);
    });

    it('Should not handle non-GET requests', async () => {
        const { handled } = await dispatchFetch(IMAGE_URL, 'POST');
        expect(handled).toBe(false);
    });

    it('Should fetch and cache a tagged item image', async () => {
        fetchMock.mockResolvedValue(imageResponse());

        const { handled } = await dispatchFetch(IMAGE_URL);

        expect(handled).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(cache.entries.has(IMAGE_URL)).toBe(true);
    });

    it('Should serve a repeat request from the cache without using the network', async () => {
        fetchMock.mockResolvedValue(imageResponse());
        await dispatchFetch(IMAGE_URL);
        fetchMock.mockClear();

        const { response } = await dispatchFetch(IMAGE_URL);

        expect(fetchMock).not.toHaveBeenCalled();
        expect(response).toBeDefined();
    });

    it('Should not cache an error response', async () => {
        fetchMock.mockResolvedValue({ ok: false, type: 'basic', clone: vi.fn() });

        await dispatchFetch(IMAGE_URL);

        expect(cache.entries.size).toBe(0);
    });
});
