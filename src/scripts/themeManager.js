import Events from 'utils/events';
import { EventType } from 'constants/eventType';

import { getDefaultTheme, getThemes as getConfiguredThemes } from './settings/webSettings';

let currentThemeId;

function getThemes() {
    return getConfiguredThemes();
}

function getThemeStylesheetInfo(id) {
    return getThemes().then(themes => {
        let theme;

        if (id) {
            theme = themes.find(currentTheme => {
                return currentTheme.id === id;
            });
        }

        if (!theme) {
            theme = getDefaultTheme();
        }

        return theme;
    });
}

// `data-theme` is the source of truth, not our cached id alone. MUI's CssVarsProvider
// asserts the attribute itself when it mounts, which can land after we have set it. If
// we compared ids only we would treat that as already applied and never re-sync, which
// is why a half-themed page could previously only be fixed by switching theme away and
// back.
function isThemeApplied(id) {
    return currentThemeId === id
        && document.documentElement.getAttribute('data-theme') === id;
}

function setTheme(id) {
    return new Promise(function (resolve) {
        if (isThemeApplied(id)) {
            resolve();
            return;
        }

        getThemeStylesheetInfo(id).then(function (info) {
            if (isThemeApplied(info.id)) {
                resolve();
                return;
            }

            currentThemeId = info.id;

            // set the theme attribute for mui
            document.documentElement.setAttribute('data-theme', info.id);

            // set the meta theme color
            document.getElementById('themeColor').content = info.color;

            Events.trigger(document, EventType.THEME_CHANGE, [ info.id ]);

            resolve();
        });
    });
}

export default {
    getThemes,
    setTheme
};
