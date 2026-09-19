import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';

import type { ItemDto } from 'types/base/models/item-dto';

/** The alphabet picker value used for names that do not start with a letter. */
const NON_ALPHA_LETTER = '#';

/** Sort options that order items by name, so a letter maps to a position in the list. */
const NAME_SORT_OPTIONS: string[] = [
    ItemSortBy.SortName,
    ItemSortBy.SeriesSortName,
    ItemSortBy.Name
];

/**
 * Gets the alphabet picker letter an item is filed under.
 */
export const getItemLetter = (item: ItemDto): string => {
    const letter = (item.SortName ?? item.Name ?? '')
        .trim()
        .charAt(0)
        // Strip diacritics so a name like "Ámelie" is filed under "A" instead of "#"
        .normalize('NFD')
        .charAt(0)
        .toUpperCase();

    return /[A-Z]/.test(letter) ? letter : NON_ALPHA_LETTER;
};

/**
 * Finds the index of the first item to show for a picked letter.
 *
 * When the items are in name order the nearest following item is used if the letter itself has no
 * items, so picking an empty letter still lands where that letter would be. Otherwise the list is
 * not alphabetical and only an exact match is meaningful.
 * @returns The item index, or -1 if there is nothing to scroll to.
 */
export const findLetterIndex = (
    items: ItemDto[],
    letter: string,
    sortBy: ItemSortBy[],
    sortOrder: SortOrder
): number => {
    if (!NAME_SORT_OPTIONS.includes(sortBy[0])) {
        return items.findIndex((item) => getItemLetter(item) === letter);
    }

    // "#" sorts before "A" in both the server's name ordering and a plain string comparison
    return items.findIndex((item) => (
        sortOrder === SortOrder.Descending ?
            getItemLetter(item) <= letter :
            getItemLetter(item) >= letter
    ));
};
