/**
 * Warms the Jellyfin server's image cache.
 *
 * Jellyfin resizes item images on demand and caches the result, so the first time anyone views a
 * library every poster costs a resize. This requests each poster at exactly the sizes the web
 * client asks for, turning that first visit into cache hits.
 *
 * The width math and image parameters are imported from the client rather than copied, so the
 * URLs stay in step with whatever the app actually requests.
 *
 * Usage:
 *   npm run prewarm-images -- --server https://jellyfin.example --api-key KEY --viewport 1920
 *
 * Pass the browser's `window.innerWidth` as --viewport. The client derives poster width from it,
 * so a viewport the script did not warm will still miss the cache.
 */
import { parseArgs } from 'node:util';

import { getDesiredAspect, getPostersPerRow } from '../src/components/cardbuilder/utils/builder';
import { IMAGE_QUALITY, MAX_IMAGE_SCALE } from '../src/constants/image';

/** How many items are listed per request. */
const ITEM_PAGE_SIZE = 500;

/** Viewport width warmed when none is given. */
const DEFAULT_VIEWPORT = 1920;

/**
 * Card shape of the library grid. The library views request CardShape.Auto, which resolves to
 * "portrait" for anything with poster artwork.
 */
const DEFAULT_SHAPE = 'portrait';

/** Item types warmed by default. */
const DEFAULT_TYPES = 'Movie,Series';

/**
 * Resizing is CPU bound on the server, so a handful of requests in flight saturates it without
 * starving everything else using the server.
 */
const DEFAULT_CONCURRENCY = 4;

/** How many images are warmed between progress lines. */
const PROGRESS_INTERVAL = 250;

const USAGE = `
Warms the Jellyfin server image cache for a library's posters.

  --server <url>        Jellyfin base URL (or JELLYFIN_SERVER)
  --api-key <key>       Jellyfin API key (or JELLYFIN_API_KEY)
  --viewport <px>       Browser viewport width to warm, repeatable (default ${DEFAULT_VIEWPORT})
  --types <list>        Comma separated item types (default ${DEFAULT_TYPES})
  --user-id <id>        Restrict to a user's view of the library
  --parent-id <id>      Restrict to one library
  --shape <shape>       Card shape (default ${DEFAULT_SHAPE})
  --scale <number>      Device pixel ratio cap (default ${MAX_IMAGE_SCALE})
  --quality <number>    Image quality (default ${IMAGE_QUALITY})
  --concurrency <n>     Requests in flight (default ${DEFAULT_CONCURRENCY})
  --limit <n>           Stop after this many items
  --tv                  Use the TV layout's poster sizing
  --dry-run             Print what would be requested and exit
  --help                Show this message
`;

interface Item {
    Id?: string;
    Name?: string;
    PrimaryImageAspectRatio?: number;
    ImageTags?: Record<string, string>;
}

interface Config {
    server: string;
    apiKey: string;
    userId?: string;
    parentId?: string;
    types: string;
    widths: number[];
    shape: string;
    scale: number;
    quality: number;
    concurrency: number;
    limit?: number;
    dryRun: boolean;
}

const { values } = parseArgs({
    options: {
        server: { type: 'string' },
        'api-key': { type: 'string' },
        'user-id': { type: 'string' },
        'parent-id': { type: 'string' },
        types: { type: 'string' },
        viewport: { type: 'string', multiple: true },
        shape: { type: 'string' },
        scale: { type: 'string' },
        quality: { type: 'string' },
        concurrency: { type: 'string' },
        limit: { type: 'string' },
        tv: { type: 'boolean' },
        'dry-run': { type: 'boolean' },
        help: { type: 'boolean' }
    }
});

function fail(message: string): never {
    console.error(message);
    process.exit(1);
}

function toNumber(value: string | undefined, fallback: number, name: string) {
    if (value === undefined) return fallback;

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        fail(`--${name} must be a positive number, got "${value}"`);
    }

    return parsed;
}

function getConfig(): Config {
    const server = values.server ?? process.env.JELLYFIN_SERVER;
    const apiKey = values['api-key'] ?? process.env.JELLYFIN_API_KEY;

    if (!server) fail('A server is required. Pass --server or set JELLYFIN_SERVER.');
    if (!apiKey) fail('An API key is required. Pass --api-key or set JELLYFIN_API_KEY.');

    const shape = values.shape ?? DEFAULT_SHAPE;
    const isTv = values.tv ?? false;
    const viewports = values.viewport?.length ?
        values.viewport.map((value, index) => toNumber(value, DEFAULT_VIEWPORT, `viewport[${index}]`)) :
        [DEFAULT_VIEWPORT];

    // Mirrors getImageWidth in src/components/cardbuilder/cardBuilder.js. Orientation only affects
    // the overflow shapes used by home screen rows, not the library grid.
    const widths = viewports.map(
        viewport => Math.round(viewport / getPostersPerRow(shape, viewport, true, isTv))
    );

    return {
        server,
        apiKey,
        userId: values['user-id'],
        parentId: values['parent-id'],
        types: values.types ?? DEFAULT_TYPES,
        widths: [...new Set(widths)],
        shape,
        scale: toNumber(values.scale, MAX_IMAGE_SCALE, 'scale'),
        quality: toNumber(values.quality, IMAGE_QUALITY, 'quality'),
        concurrency: toNumber(values.concurrency, DEFAULT_CONCURRENCY, 'concurrency'),
        limit: values.limit ? toNumber(values.limit, 0, 'limit') : undefined,
        dryRun: values['dry-run'] ?? false
    };
}

function getAuthHeaders(config: Config) {
    return { Authorization: `MediaBrowser Token="${config.apiKey}"` };
}

async function fetchItems(config: Config) {
    const items: Item[] = [];
    let total = Infinity;

    while (items.length < total) {
        const url = new URL('Items', `${config.server.replace(/\/$/, '')}/`);
        url.searchParams.set('recursive', 'true');
        url.searchParams.set('includeItemTypes', config.types);
        url.searchParams.set('fields', 'PrimaryImageAspectRatio');
        url.searchParams.set('enableImageTypes', 'Primary');
        url.searchParams.set('startIndex', String(items.length));
        url.searchParams.set('limit', String(ITEM_PAGE_SIZE));
        if (config.userId) url.searchParams.set('userId', config.userId);
        if (config.parentId) url.searchParams.set('parentId', config.parentId);

        const response = await fetch(url, { headers: getAuthHeaders(config) });
        if (!response.ok) {
            fail(`Listing items failed: ${response.status} ${response.statusText}`);
        }

        const page = await response.json() as { Items?: Item[], TotalRecordCount?: number };
        const pageItems = page.Items ?? [];

        items.push(...pageItems);
        total = page.TotalRecordCount ?? items.length;

        // A short page means the server has nothing more to give, whatever the count claims
        if (!pageItems.length) break;
        if (config.limit && items.length >= config.limit) break;
    }

    return config.limit ? items.slice(0, config.limit) : items;
}

/**
 * Builds the image URLs for an item, matching getCardImageUrl in
 * src/components/cardbuilder/utils/url.ts.
 */
function getImageUrls(item: Item, config: Config) {
    const tag = item.ImageTags?.Primary;
    if (!tag || !item.Id) return [];

    // The client prefers the item's own aspect ratio and falls back to the card shape's
    const aspect = item.PrimaryImageAspectRatio || getDesiredAspect(config.shape) || 1;

    return config.widths.map(width => {
        const url = new URL(`Items/${item.Id}/Images/Primary`, `${config.server.replace(/\/$/, '')}/`);
        url.searchParams.set('fillHeight', String(Math.ceil((width / aspect) * config.scale)));
        url.searchParams.set('fillWidth', String(Math.ceil(width * config.scale)));
        url.searchParams.set('quality', String(config.quality));
        url.searchParams.set('tag', tag);
        return url.toString();
    });
}

async function runPool(tasks: (() => Promise<void>)[], concurrency: number) {
    let next = 0;

    const worker = async () => {
        while (next < tasks.length) {
            const index = next++;
            await tasks[index]();
        }
    };

    await Promise.all(
        Array.from({ length: Math.min(concurrency, tasks.length) }, worker)
    );
}

async function main() {
    if (values.help) {
        console.log(USAGE);
        return;
    }

    const config = getConfig();

    console.log(`Listing ${config.types} from ${config.server}`);
    const items = await fetchItems(config);

    const urls = items.flatMap(item => getImageUrls(item, config));
    const withoutImages = items.length - items.filter(item => item.ImageTags?.Primary).length;

    console.log(
        `${items.length} items (${withoutImages} without a poster), `
        + `widths ${config.widths.join(', ')} at ${config.scale}x, quality ${config.quality}`
    );
    console.log(`${urls.length} images to warm`);

    if (config.dryRun) {
        urls.slice(0, 5).forEach(url => {
            console.log(`  ${url}`);
        });
        if (urls.length > 5) console.log(`  ... and ${urls.length - 5} more`);
        return;
    }

    const headers = getAuthHeaders(config);
    let done = 0;
    let failed = 0;
    let bytes = 0;
    const started = Date.now();

    await runPool(urls.map(url => async () => {
        try {
            const response = await fetch(url, { headers });
            if (response.ok) {
                bytes += (await response.arrayBuffer()).byteLength;
            } else {
                failed += 1;
            }
        } catch {
            failed += 1;
        }

        done += 1;
        if (done % PROGRESS_INTERVAL === 0) {
            console.log(`  ${done}/${urls.length}`);
        }
    }), config.concurrency);

    const seconds = (Date.now() - started) / 1000;
    const warmed = done - failed;

    console.log(`Warmed ${warmed} images in ${seconds.toFixed(1)}s (${failed} failed)`);
    if (warmed) {
        console.log(`Average size ${(bytes / warmed / 1024).toFixed(1)} KB, ${(bytes / 1024 / 1024).toFixed(1)} MB total`);
    }
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
