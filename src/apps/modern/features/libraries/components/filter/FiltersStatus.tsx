import { ItemFilter } from '@jellyfin/sdk/lib/generated-client/models/item-filter';
import React, { FC, useCallback } from 'react';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import { LibraryViewSettings } from 'types/library';
import { LibraryTab } from 'types/libraryTab';

const defaultFiltersOptions = [
    { label: 'Played', value: ItemFilter.IsPlayed },
    { label: 'Unplayed', value: ItemFilter.IsUnplayed },
    { label: 'Favorite', value: ItemFilter.IsFavorite },
    { label: 'ContinueWatching', value: ItemFilter.IsResumable }
];

const mutuallyExclusiveFilters: Partial<Record<ItemFilter, ItemFilter>> = {
    [ItemFilter.IsPlayed]: ItemFilter.IsUnplayed,
    [ItemFilter.IsUnplayed]: ItemFilter.IsPlayed
};

interface FiltersStatusProps {
    viewType: LibraryTab;
    libraryViewSettings: LibraryViewSettings;
    setLibraryViewSettings: React.Dispatch<React.SetStateAction<LibraryViewSettings>>;
}

const FiltersStatus: FC<FiltersStatusProps> = ({
    viewType,
    libraryViewSettings,
    setLibraryViewSettings
}) => {
    const { user } = useApi();
    const isDuplicatesFilterVisible = !!user?.Policy?.IsAdministrator
        && (viewType === LibraryTab.Movies || viewType === LibraryTab.Series);

    let statusFiltersOptions = defaultFiltersOptions;

    if (viewType === LibraryTab.Books) {
        statusFiltersOptions = defaultFiltersOptions.map((option) => (
            option.value === ItemFilter.IsResumable ? { ...option, label: 'ContinueReading' } : option
        ));
    }

    const onFiltersStatusChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            event.preventDefault();
            const value = event.target.value as ItemFilter;
            const existingStatus = libraryViewSettings?.Filters?.Status ?? [];
            const exclusiveFilter = mutuallyExclusiveFilters[value];

            const updatedStatus = existingStatus.includes(value) ?
                existingStatus.filter((filter) => filter !== value) :
                [...existingStatus.filter((filter) => filter !== exclusiveFilter), value];

            setLibraryViewSettings((prevState) => ({
                ...prevState,
                StartIndex: 0,
                Filters: {
                    ...prevState.Filters,
                    Status: updatedStatus.length ? updatedStatus : undefined
                }
            }));
        },
        [setLibraryViewSettings, libraryViewSettings?.Filters?.Status]
    );

    const onFiltersDuplicatesChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            event.preventDefault();
            setLibraryViewSettings((prevState) => ({
                ...prevState,
                StartIndex: 0,
                Filters: {
                    ...prevState.Filters,
                    Duplicates: event.target.checked || undefined
                }
            }));
        },
        [setLibraryViewSettings]
    );

    const getVisibleFiltersStatus = () => {
        const visibleFiltersStatus: ItemFilter[] = [ItemFilter.IsFavorite];

        if (
            viewType !== LibraryTab.Albums
            && viewType !== LibraryTab.Artists
            && viewType !== LibraryTab.AlbumArtists
            && viewType !== LibraryTab.Songs
            && viewType !== LibraryTab.Channels
            && viewType !== LibraryTab.PhotoAlbums
            && viewType !== LibraryTab.Authors
            && viewType !== LibraryTab.Photos
            && viewType !== LibraryTab.Studios
        ) {
            visibleFiltersStatus.push(ItemFilter.IsUnplayed);
            visibleFiltersStatus.push(ItemFilter.IsPlayed);
            visibleFiltersStatus.push(ItemFilter.IsResumable);
        }

        return visibleFiltersStatus;
    };

    return (
        <FormGroup>
            {statusFiltersOptions
                .filter((filter) => getVisibleFiltersStatus().includes(filter.value))
                .map((filter) => (
                    <FormControlLabel
                        key={filter.value}
                        control={
                            <Checkbox
                                checked={
                                    !!libraryViewSettings?.Filters?.Status?.includes(filter.value)
                                }
                                onChange={onFiltersStatusChange}
                                value={filter.value}
                            />
                        }
                        label={globalize.translate(filter.label)}
                    />
                ))}
            {isDuplicatesFilterVisible && (
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={!!libraryViewSettings?.Filters?.Duplicates}
                            onChange={onFiltersDuplicatesChange}
                        />
                    }
                    label={globalize.translate('Duplicates')}
                />
            )}
        </FormGroup>
    );
};

export default FiltersStatus;
