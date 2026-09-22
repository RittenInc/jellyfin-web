import { useLocation, useSearchParams } from 'react-router-dom';

import { EMBED_PATH, findEmbeddableMenuLink } from 'utils/menuLinks';

import { useWebConfig } from './useWebConfig';

/** Returns the menu link the embed page is showing, or undefined if that page is not active. */
export const useEmbeddedMenuLink = () => {
    const location = useLocation();
    const [ searchParams ] = useSearchParams();
    const { menuLinks } = useWebConfig();

    if (location.pathname !== EMBED_PATH) return undefined;

    return findEmbeddableMenuLink(menuLinks, searchParams.get('url'));
};
