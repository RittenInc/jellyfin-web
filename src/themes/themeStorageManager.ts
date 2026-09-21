import { StorageManager } from '@mui/material/styles';

import Events, { type Event } from 'utils/events';
import { EventType } from 'constants/eventType';

/** MUI's storage key for the mode (light/dark/system) rather than a color scheme. */
const MODE_STORAGE_KEY = 'mode';

/**
 * A custom MUI StorageManager.
 *
 * Since we switch the theme based on the current page, we handle getting/setting the current theme via autoTheme +
 * themeManager. We need to implement `subscribe` so MUI is aware of theme changes though otherwise the `useTheme` hook
 * will always return the default theme.
 */
export const ThemeStorageManager: StorageManager = ({ key }) => ({
    get: defaultValue => {
        // MUI seeds its color scheme from here and then asserts `data-theme` itself
        // when it mounts. Answering with the default overwrites the theme themeManager
        // has already applied, which leaves the attribute on the default while the
        // stylesheet ThemeCss loaded is the user's theme: a page rendered half in each,
        // since a theme stylesheet reads its colors back out of the --jf-palette-*
        // properties MUI keys off that attribute. Report what is actually applied.
        // The mode is not a theme, so it keeps the default.
        if (key === MODE_STORAGE_KEY) return defaultValue;

        return document.documentElement.getAttribute('data-theme') || defaultValue;
    },
    set: () => { /* no-op */ },
    subscribe: handler => {
        const wrappedHandler = (_e: Event, value: string) => handler(value);
        Events.on(document, EventType.THEME_CHANGE, wrappedHandler);
        return () => Events.off(document, EventType.THEME_CHANGE, wrappedHandler);
    }
});
