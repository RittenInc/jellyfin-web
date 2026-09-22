import type { MenuLink } from 'types/webConfig';

/** The route that renders an external menu link inside the app. */
export const EMBED_PATH = '/embed';

/** Checks if a menu link should be opened inside the app instead of a new tab. */
export const isEmbeddedMenuLink = (menuLink: MenuLink) => menuLink.embed === true;

/** Builds the in-app route for an embeddable menu link. */
export const getEmbedPath = (menuLink: MenuLink) => (
    `${EMBED_PATH}?url=${encodeURIComponent(menuLink.url)}`
);

/**
 * Resolves the url from the embed route back to a configured menu link. Only urls that are present
 * in the web config are allowed so arbitrary sites cannot be framed by a crafted link.
 */
export const findEmbeddableMenuLink = (menuLinks: MenuLink[] | undefined, url: string | null) => (
    url ? menuLinks?.find(menuLink => isEmbeddedMenuLink(menuLink) && menuLink.url === url) : undefined
);
