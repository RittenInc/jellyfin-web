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

/**
 * The theme for the whole site, admin dashboard included.
 *
 * Jellyfin has a separate 'dashboardTheme' setting, which we deliberately do not
 * use: one theme applies everywhere, so picking a theme does not leave the
 * dashboard behind on whatever was stored for it. Any value a user still has
 * saved under 'dashboardTheme' is ignored rather than migrated.
 */
export function useUserTheme() {
    const { theme } = useUserSettings();
    const { defaultTheme } = useThemes();

    return {
        theme: theme || resolveDefaultThemeId(defaultTheme?.id)
    };
}
