import React, { type FC, useEffect, useState } from 'react';

import { useUserTheme } from 'hooks/useUserTheme';
import { getDefaultTheme } from 'scripts/settings/webSettings';

const getThemeUrl = (id: string) => `themes/${id}/theme.css`;

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
