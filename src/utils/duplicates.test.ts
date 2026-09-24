import { describe, expect, it } from 'vitest';

import type { ItemDto } from 'types/base/models/item-dto';
import { ItemKind } from 'types/base/models/item-kind';

import { getDuplicateItems } from './duplicates';

const movie = (Id: string, Name: string, ProductionYear?: number, ProviderIds?: Record<string, string>): ItemDto => ({
    Id, Name, ProductionYear, ProviderIds, Type: ItemKind.Movie
});

const ids = (items: ItemDto[]) => items.map(item => item.Id);

describe('getDuplicateItems', () => {
    it('Should return nothing when there are no duplicates', () => {
        const items = [
            movie('1', 'Alien', 1979, { Tmdb: '348' }),
            movie('2', 'Aliens', 1986, { Tmdb: '679' })
        ];
        expect(getDuplicateItems(items)).toEqual([]);
    });

    it('Should match items by provider id regardless of name', () => {
        const items = [
            movie('1', 'Alien', 1979, { Tmdb: '348' }),
            movie('2', 'Aliens', 1986, { Tmdb: '679' }),
            movie('3', 'Alien (Director\'s Cut)', 2003, { Tmdb: '348' })
        ];
        expect(ids(getDuplicateItems(items))).toEqual([ '1', '3' ]);
    });

    it('Should match items without provider ids by name and year', () => {
        const items = [
            movie('1', 'Alien', 1979, { Tmdb: '348' }),
            movie('2', ' alien ', 1979),
            movie('3', 'Alien', 2030)
        ];
        expect(ids(getDuplicateItems(items))).toEqual([ '1', '2' ]);
    });

    it('Should not match items that only share a collection id', () => {
        const items = [
            movie('1', 'Alien', 1979, { Tmdb: '348', TmdbCollection: '8091' }),
            movie('2', 'Aliens', 1986, { Tmdb: '679', TmdbCollection: '8091' })
        ];
        expect(getDuplicateItems(items)).toEqual([]);
    });

    it('Should keep each group together at the position of its first item', () => {
        const items = [
            movie('1', 'Alien', 1979, { Tmdb: '348' }),
            movie('2', 'Brazil', 1985, { Imdb: 'tt0088846' }),
            movie('3', 'Alien', 1979, { Imdb: 'tt0078748' }),
            movie('4', 'Brazil', 1985, { Imdb: 'tt0088846' }),
            movie('5', 'Alien', 1979, { Tmdb: '348', Imdb: 'tt0078748' })
        ];
        expect(ids(getDuplicateItems(items))).toEqual([ '1', '3', '5', '2', '4' ]);
    });
});
