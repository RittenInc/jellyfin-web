import type { ItemDto } from 'types/base/models/item-dto';

/**
 * Provider ids that identify a single title. Ids such as TmdbCollection are shared by several
 * titles, so they must not be used to match duplicates.
 */
const TITLE_PROVIDERS = [ 'Tmdb', 'Imdb', 'Tvdb' ];

const getMatchKeys = (item: ItemDto) => {
    const keys: string[] = [];

    for (const [ provider, id ] of Object.entries(item.ProviderIds ?? {})) {
        const titleProvider = TITLE_PROVIDERS.find(p => p.toLowerCase() === provider.toLowerCase());
        if (titleProvider && id) {
            keys.push(`${item.Type}|${titleProvider}|${id.toLowerCase()}`);
        }
    }

    // Catches copies that were never matched to a provider
    const name = item.Name?.trim().toLowerCase();
    if (name) {
        keys.push(`${item.Type}|name|${name}|${item.ProductionYear ?? ''}`);
    }

    return keys;
};

/**
 * Returns the items that share a provider id, or a name and year, with at least one other item.
 * Items keep their original order, except that each group of duplicates is kept together at the
 * position of its first item.
 */
export const getDuplicateItems = (items: ItemDto[]) => {
    // Union-find over item indexes, so items linked through different keys end up in one group
    const parents = items.map((_, i) => i);
    const find = (i: number): number => {
        while (parents[i] !== i) {
            parents[i] = parents[parents[i]];
            i = parents[i];
        }
        return i;
    };

    const firstIndexByKey = new Map<string, number>();
    items.forEach((item, i) => {
        for (const key of getMatchKeys(item)) {
            const other = firstIndexByKey.get(key);
            if (other === undefined) {
                firstIndexByKey.set(key, i);
            } else {
                parents[find(i)] = find(other);
            }
        }
    });

    const groups = new Map<number, ItemDto[]>();
    items.forEach((item, i) => {
        const root = find(i);
        const group = groups.get(root);
        if (group) {
            group.push(item);
        } else {
            groups.set(root, [ item ]);
        }
    });

    return [ ...groups.values() ].filter(group => group.length > 1).flat();
};
