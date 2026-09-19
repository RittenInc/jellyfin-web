import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import Box from '@mui/material/Box';
import classNames from 'classnames';
import React, { type FC, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLibrary } from 'apps/modern/features/libraries/hooks/useLibrary';
import { getDefaultLibraryViewSettings } from 'apps/modern/features/libraries/utils/settings';
import Cards from 'components/cardbuilder/Card/Cards';
import { CardShape } from 'components/cardbuilder/utils/shape';
import NoItemsMessage from 'components/common/NoItemsMessage';
import Lists from 'components/listview/List/Lists';
import Loading from 'components/loading/LoadingComponent';
import { ItemAction } from 'constants/itemAction';
import ItemsContainer from 'elements/emby-itemscontainer/ItemsContainer';
import { useApi } from 'hooks/useApi';
import { useUserSettings } from 'hooks/useUserSettings';
import type { CardOptions } from 'types/cardOptions';
import { type LibraryViewSettings, ViewMode } from 'types/library';
import { LibraryTab } from 'types/libraryTab';
import type { ListOptions } from 'types/listOptions';
import { isAlphaPickerScrollEnabled } from 'utils/items';

import { findLetterIndex } from '../utils/alphabet';
import AlphabetPicker from './AlphabetPicker';
import useMediaQuery from '@mui/material/useMediaQuery';

/** Spacing left between the app bar and the item scrolled to. */
const SCROLL_TO_ITEM_SPACING = 8;

/**
 * Scrolls the page so an item sits at the top of the viewport, below the fixed app bar.
 */
const scrollToItem = (element: Element) => {
    const appBarHeight = document
        .querySelector('header.MuiAppBar-root')
        ?.getBoundingClientRect().height ?? 0;
    const top = element.getBoundingClientRect().top + window.scrollY
        - appBarHeight - SCROLL_TO_ITEM_SPACING;

    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
};

const ItemsView: FC = () => {
    const {
        id: parentId,
        collectionType,
        content,
        itemsResult,
        viewSettings,
        setViewSettings
    } = useLibrary();
    const viewType = content?.viewType ?? LibraryTab.Movies;
    const libraryViewSettings = viewSettings ?? getDefaultLibraryViewSettings(viewType);
    const setLibraryViewSettings = useMemo(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        () => setViewSettings ?? ((action: SetStateAction<LibraryViewSettings>) => { /* no-op */ }),
        [setViewSettings]
    );
    const { isAlphabetPickerEnabled, noItemsMessage } = content ?? {};
    // Check if the alphabet picker will fit in the current viewport
    const isAlphabetPickerSupported = useMediaQuery(t => [
        // Extra small screens have no padding around letters but larger AppBar
        `${t.breakpoints.down('sm')} and (min-height: 575px)`,
        // Small screens have padding around letters but smaller AppBar
        // NOTE: Helper methods down/up add "@media" to the query string so use the value directly
        `(min-width: ${t.breakpoints.values.sm}px) and (min-height: 610px)`
    ].join(', '));

    const { __legacyApiClient__, user } = useApi();
    const { libraryPageSize } = useUserSettings();
    // Without pagination the whole library is on the page, so the picker can scroll to a letter
    // instead of filtering the results down to it.
    const isScrollToLetterEnabled = isAlphaPickerScrollEnabled(libraryPageSize);
    const [scrolledLetter, setScrolledLetter] = useState<string | null>();
    const itemsRef = useRef<HTMLDivElement>(null);

    const items = useMemo(() => itemsResult?.data?.Items ?? [], [itemsResult?.data?.Items]);

    // The query key for all items for the current user.
    // This should be used to invalidate queries that affect multiple parents, such as collections and playlists.
    const allItemsQueryKey = useMemo(() => ['User', user?.Id, 'Items'], [user?.Id]);
    // The query key for all views for the current parent item.
    const allViewsQueryKey = useMemo(() => [...allItemsQueryKey, parentId, 'ViewByType'], [allItemsQueryKey, parentId]);

    const getListOptions = useCallback(() => {
        const listOptions: ListOptions = {
            items,
            context: collectionType
        };

        if (viewType === LibraryTab.Songs) {
            listOptions.showParentTitle = true;
            listOptions.action = ItemAction.PlayAllFromHere;
            listOptions.smallIcon = true;
            listOptions.showArtist = true;
            listOptions.addToListButton = true;
        } else if (viewType === LibraryTab.Albums) {
            listOptions.sortBy = libraryViewSettings.SortBy[0];
            listOptions.addToListButton = true;
        } else if (viewType === LibraryTab.Episodes) {
            listOptions.showParentTitle = true;
        }

        return listOptions;
    }, [items, collectionType, viewType, libraryViewSettings.SortBy]);

    const getCardOptions = useCallback(() => {
        let shape;
        let preferThumb;
        let preferDisc;
        let preferLogo;

        if (libraryViewSettings.ImageType === ImageType.Banner) {
            shape = CardShape.Banner;
        } else if (libraryViewSettings.ImageType === ImageType.Disc) {
            shape = CardShape.Square;
            preferDisc = true;
        } else if (libraryViewSettings.ImageType === ImageType.Logo) {
            shape = CardShape.Backdrop;
            preferLogo = true;
        } else if (libraryViewSettings.ImageType === ImageType.Thumb) {
            shape = CardShape.Backdrop;
            preferThumb = true;
        } else {
            shape = CardShape.Auto;
        }

        const cardOptions: CardOptions = {
            shape,
            showTitle: libraryViewSettings.ShowTitle,
            showYear: libraryViewSettings.ShowYear,
            cardLayout: libraryViewSettings.CardLayout,
            centerText: true,
            context: collectionType,
            coverImage: true,
            preferThumb,
            preferDisc,
            preferLogo,
            overlayText: !libraryViewSettings.ShowTitle,
            imageType: libraryViewSettings.ImageType,
            queryKey: allViewsQueryKey,
            serverId: __legacyApiClient__?.serverId()
        };

        if (
            viewType === LibraryTab.Songs
            || viewType === LibraryTab.Albums
            || viewType === LibraryTab.Episodes
        ) {
            cardOptions.showParentTitle = libraryViewSettings.ShowTitle;
            cardOptions.overlayPlayButton = true;
        } else if (viewType === LibraryTab.Artists || viewType === LibraryTab.Authors) {
            cardOptions.lines = 1;
            cardOptions.showYear = false;
            cardOptions.overlayPlayButton = true;
        } else if (viewType === LibraryTab.Channels) {
            cardOptions.shape = CardShape.Square;
            cardOptions.showDetailsMenu = true;
            cardOptions.showCurrentProgram = true;
            cardOptions.showCurrentProgramTime = true;
        } else if (viewType === LibraryTab.SeriesTimers) {
            cardOptions.shape = CardShape.Backdrop;
            cardOptions.showSeriesTimerTime = true;
            cardOptions.showSeriesTimerChannel = true;
            cardOptions.overlayMoreButton = true;
            cardOptions.lines = 3;
        } else if (viewType === LibraryTab.Movies) {
            cardOptions.overlayPlayButton = true;
        } else if (viewType === LibraryTab.Series || viewType === LibraryTab.Studios) {
            cardOptions.overlayMoreButton = true;
        }

        return cardOptions;
    }, [
        __legacyApiClient__,
        libraryViewSettings.ShowTitle,
        libraryViewSettings.ImageType,
        libraryViewSettings.ShowYear,
        libraryViewSettings.CardLayout,
        collectionType,
        allViewsQueryKey,
        viewType
    ]);

    const getItems = useCallback(() => {
        if (!items.length) {
            return <NoItemsMessage message={noItemsMessage ?? 'MessageNoItemsAvailable'} />;
        }

        if (libraryViewSettings.ViewMode === ViewMode.ListView) {
            return (
                <Lists
                    items={items}
                    listOptions={getListOptions()}
                />
            );
        }
        return (
            <Cards
                items={items}
                cardOptions={getCardOptions()}
            />
        );
    }, [
        libraryViewSettings.ViewMode,
        items,
        getListOptions,
        getCardOptions,
        noItemsMessage
    ]);

    const handleAlphabetFilter = useCallback((newValue: string | null | undefined) => {
        setLibraryViewSettings((prevState) => ({
            ...prevState,
            StartIndex: 0,
            Alphabet: newValue
        }));
    }, [setLibraryViewSettings]);

    const handleAlphabetScroll = useCallback((newValue: string | null | undefined) => {
        // Picking the letter that is already selected clears the value, so scroll to it again
        const letter = newValue ?? scrolledLetter;
        if (!letter || !items.length) return;

        setScrolledLetter(letter);

        const index = findLetterIndex(
            items,
            letter,
            libraryViewSettings.SortBy,
            libraryViewSettings.SortOrder
        );
        // Nothing is filed at or after the letter, so the last item is as close as we can get
        const itemId = index === -1 ? items[items.length - 1].Id : items[index].Id;
        const element = itemId ?
            itemsRef.current?.querySelector(`[data-id="${itemId}"]`) :
            null;

        if (element) scrollToItem(element);
    }, [items, libraryViewSettings.SortBy, libraryViewSettings.SortOrder, scrolledLetter]);

    // Drop a letter filter left over from a paginated session so the full library is shown
    useEffect(() => {
        if (isScrollToLetterEnabled && libraryViewSettings.Alphabet != null) {
            handleAlphabetFilter(null);
        }
    }, [handleAlphabetFilter, isScrollToLetterEnabled, libraryViewSettings.Alphabet]);

    const hasSortName = !libraryViewSettings.SortBy.includes(ItemSortBy.Random);

    const itemsContainerClass = classNames(
        'padded-left padded-right',
        libraryViewSettings.ViewMode === ViewMode.ListView ?
            'vertical-list' :
            'vertical-wrap'
    );

    return (
        <Box className='padded-bottom-page'>
            {isAlphabetPickerSupported && isAlphabetPickerEnabled && hasSortName && (
                <AlphabetPicker
                    value={isScrollToLetterEnabled ? scrolledLetter : libraryViewSettings.Alphabet}
                    onChange={isScrollToLetterEnabled ? handleAlphabetScroll : handleAlphabetFilter}
                />
            )}

            <Box ref={itemsRef}>
                {(!itemsResult || itemsResult.isPending) ? (
                    <Loading />
                ) : (
                    <ItemsContainer
                        className={itemsContainerClass}
                        parentId={parentId}
                        reloadItems={itemsResult?.refetch}
                        queryKey={allItemsQueryKey}
                    >
                        {getItems()}
                    </ItemsContainer>
                )}
            </Box>
        </Box>
    );
};

export default ItemsView;
