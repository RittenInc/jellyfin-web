import { getDefaultTheme } from 'scripts/settings/webSettings';

import { useThemes } from './useThemes';
import { useUserSettings } from './useUserSettings';

export const FALLBACK_THEME_ID = 'dark';

/**
 * The theme id to use for a user who has never picked one.
 *
 * A served config.json that predates the themes in this build names no default,
 * which would otherwise drop those users onto 'dark'. getDefaultTheme falls back
 * to the config bundled with this build, so prefer it over the bare fallback.
 *
 * @param configuredDefaultId - The default theme id from the served web config.
 */
export const resolveDefaultThemeId = (configuredDefaultId?: string) => (
    configuredDefaultId || getDefaultTheme()?.id || FALLBACK_THEME_ID
);

export function useUserTheme() {
    const { theme, dashboardTheme } = useUserSettings();
    const { defaultTheme } = useThemes();

    const defaultId = resolveDefaultThemeId(defaultTheme?.id);

    return {
        theme: theme || defaultId,
        dashboardTheme: dashboardTheme || defaultId
    };
}
