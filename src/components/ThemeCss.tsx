import React, { type FC, useEffect, useState } from 'react';

import { useUserTheme } from 'hooks/useUserTheme';
import { getDefaultTheme } from 'scripts/settings/webSettings';

// Theme stylesheets are emitted at a fixed path with no content hash (see the
// MiniCssExtractPlugin filename rule in webpack.common.js), so a browser keeps serving
// the previous build's copy after a deploy while the hashed bundles update normally --
// which looks exactly like a theme change that failed to deploy. HtmlWebpackPlugin
// cache-busts the bundles in index.html; do the same here using the commit the client
// was built from. Empty when git was unavailable at build time, in which case the URL
// is unchanged.
const BUILD_ID = typeof __COMMIT_SHA__ === 'string' ? encodeURIComponent(__COMMIT_SHA__) : '';

const getThemeUrl = (id: string) => (
    BUILD_ID ? `themes/${id}/theme.css?${BUILD_ID}` : `themes/${id}/theme.css`
);

const DEFAULT_THEME_URL = getThemeUrl(getDefaultTheme().id);

const ThemeCss: FC = () => {
    const { theme } = useUserTheme();
    const [ themeUrl, setThemeUrl ] = useState(DEFAULT_THEME_URL);

    useEffect(() => {
        if (theme) setThemeUrl(getThemeUrl(theme));
    }, [theme]);

    return (
        <link
            rel='stylesheet'
            type='text/css'
            href={themeUrl}
        />
    );
};

export default ThemeCss;
