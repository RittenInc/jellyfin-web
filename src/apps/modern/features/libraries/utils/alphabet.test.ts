import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { describe, expect, it } from 'vitest';

import type { ItemDto } from 'types/base/models/item-dto';

import { findLetterIndex, getItemLetter } from './alphabet';

const item = (Name: string, SortName?: string): ItemDto => ({ Name, SortName });

describe('getItemLetter', () => {
    it('Should use the first letter of the sort name when there is one', () => {
        expect(getItemLetter(item('The Matrix', 'Matrix, The'))).toBe('M');
    });

    it('Should fall back to the name', () => {
        expect(getItemLetter(item('Blade Runner'))).toBe('B');
    });

    it('Should ignore diacritics', () => {
        expect(getItemLetter(item('Ámelie'))).toBe('A');
    });

    it('Should file names that do not start with a letter under #', () => {
        expect(getItemLetter(item('1917'))).toBe('#');
        expect(getItemLetter(item('[REC]'))).toBe('#');
        expect(getItemLetter(item(''))).toBe('#');
    });
});

describe('findLetterIndex', () => {
    const items = [
        item('300'),
        item('Alien'),
        item('Ikiru'),
        item('The Matrix', 'Matrix, The'),
        item('Nope')
    ];
    const byName = [ItemSortBy.SortName];

    it('Should find the first item for the letter', () => {
        expect(findLetterIndex(items, 'I', byName, SortOrder.Ascending)).toBe(2);
        expect(findLetterIndex(items, '#', byName, SortOrder.Ascending)).toBe(0);
    });

    it('Should fall through to the next letter with items when the letter is empty', () => {
        // There are no "K" items, so "Matrix, The" is where "K" would be
        expect(findLetterIndex(items, 'K', byName, SortOrder.Ascending)).toBe(3);
    });

    it('Should follow a descending sort', () => {
        const reversed = [...items].reverse();
        expect(findLetterIndex(reversed, 'I', byName, SortOrder.Descending)).toBe(2);
        expect(findLetterIndex(reversed, 'K', byName, SortOrder.Descending)).toBe(2);
    });

    it('Should return -1 when there is nothing at or after the letter', () => {
        expect(findLetterIndex(items, 'Z', byName, SortOrder.Ascending)).toBe(-1);
    });

    it('Should only match exactly when the items are not in name order', () => {
        const byDate = [ItemSortBy.DateCreated, ItemSortBy.SortName];
        expect(findLetterIndex(items, 'I', byDate, SortOrder.Ascending)).toBe(2);
        expect(findLetterIndex(items, 'K', byDate, SortOrder.Ascending)).toBe(-1);
    });
});
