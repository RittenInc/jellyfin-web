/**
 * Cache holding item images. The version suffix is part of the name so that bumping it discards
 * everything an older build cached.
 */
const IMAGE_CACHE_NAME = 'jellyfin-item-images-v1';

/** Prefix shared by every version of the image cache, used to clean up old ones. */
const IMAGE_CACHE_PREFIX = 'jellyfin-item-images-';

/**
 * The most images to keep. Posters are tens of kilobytes each, so a few thousand entries is a
 * modest amount of disk for a library's worth of artwork.
 */
const MAX_IMAGE_CACHE_ENTRIES = 3000;

/** How many images are added to the cache between size checks. */
const TRIM_INTERVAL = 50;

/** Matches the item image endpoint, e.g. /Items/{id}/Images/Primary */
const IMAGE_PATH_REGEX = /\/Items\/[^/]+\/Images\//i;

let putsSinceTrim = 0;

function getApiClient(serverId) {
    return Promise.resolve(window.connectionManager.getApiClient(serverId));
}

function executeAction(action, data, serverId) {
    return getApiClient(serverId).then(function (apiClient) {
        switch (action) {
            case 'cancel-install':
                return apiClient.cancelPackageInstallation(data.id);
            case 'restart':
                return apiClient.restartServer();
            default:
                clients.openWindow('/');
                return Promise.resolve();
        }
    });
}

/**
 * Checks whether a request is for an item image that is safe to cache indefinitely.
 * @param {Request} request - The request to check.
 * @returns {boolean} Whether the response may be cached.
 */
function isCacheableImageRequest(request) {
    if (request.method !== 'GET') {
        return false;
    }

    // Guard against an engine that runs service workers without the Cache API
    if (typeof caches === 'undefined') {
        return false;
    }

    const url = new URL(request.url);

    // The tag is a hash of the image content, so a URL carrying one can never go stale
    return IMAGE_PATH_REGEX.test(url.pathname) && url.searchParams.has('tag');
}

/**
 * Drops the oldest entries when the cache has grown past its limit.
 * @param {Cache} cache - The image cache.
 */
async function trimImageCache(cache) {
    const keys = await cache.keys();
    const excess = keys.length - MAX_IMAGE_CACHE_ENTRIES;

    if (excess > 0) {
        // Cache.keys() resolves in insertion order, so the oldest entries come first
        await Promise.all(keys.slice(0, excess).map(key => cache.delete(key)));
    }
}

async function putImageInCache(request, response) {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    await cache.put(request, response);

    putsSinceTrim += 1;
    if (putsSinceTrim >= TRIM_INTERVAL) {
        putsSinceTrim = 0;
        await trimImageCache(cache);
    }
}

/**
 * Serves an item image from the cache, falling back to the network and caching the result.
 * @param {FetchEvent} event - The fetch event being handled.
 * @returns {Promise<Response>} The image response.
 */
async function respondWithCachedImage(event) {
    const cached = await caches.match(event.request, { cacheName: IMAGE_CACHE_NAME });

    if (cached) {
        return cached;
    }

    const response = await fetch(event.request);

    // Opaque responses cannot be inspected and errors should not be kept
    if (response.ok && response.type !== 'opaque') {
        event.waitUntil(putImageInCache(event.request, response.clone()));
    }

    return response;
}

async function removeOutdatedCaches() {
    if (typeof caches === 'undefined') {
        return;
    }

    const names = await caches.keys();

    await Promise.all(
        names
            .filter(name => name.startsWith(IMAGE_CACHE_PREFIX) && name !== IMAGE_CACHE_NAME)
            .map(name => caches.delete(name))
    );
}

/* eslint-disable-next-line no-restricted-globals -- self is valid in a serviceworker environment */
self.addEventListener('notificationclick', function (event) {
    const notification = event.notification;
    notification.close();

    const data = notification.data;
    const serverId = data.serverId;
    const action = event.action;

    if (!action) {
        clients.openWindow('/');
        event.waitUntil(Promise.resolve());
        return;
    }

    event.waitUntil(executeAction(action, data, serverId));
}, false);

/* eslint-disable-next-line no-restricted-globals -- self is valid in a serviceworker environment */
self.addEventListener('fetch', event => {
    // Anything not handled here falls through to the network untouched
    if (isCacheableImageRequest(event.request)) {
        event.respondWith(respondWithCachedImage(event));
    }
});

/* eslint-disable-next-line no-restricted-globals -- self is valid in a serviceworker environment */
self.addEventListener('install', () => {
    // Take over without waiting for existing tabs to close so cache fixes ship promptly
    /* eslint-disable-next-line no-restricted-globals -- self is valid in a serviceworker environment */
    return self.skipWaiting();
});

/* eslint-disable-next-line no-restricted-globals -- self is valid in a serviceworker environment */
self.addEventListener('activate', event => {
    /* eslint-disable-next-line no-restricted-globals -- self is valid in a serviceworker environment */
    event.waitUntil(removeOutdatedCaches().then(() => self.clients.claim()));
});

// Marks this file as a module so it can be imported by tests. The bundler compiles this away, so
// the deployed worker is still a classic script.
export {};
