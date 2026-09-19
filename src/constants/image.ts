/**
 * The quality requested for item images.
 *
 * The server default of 96 is close to lossless and costs roughly twice the bytes of a value that
 * is indistinguishable at the size posters are actually displayed at.
 */
export const IMAGE_QUALITY = 82;

/**
 * The maximum scale factor applied to requested image dimensions on high density displays.
 *
 * Requesting the full device pixel ratio quadruples the pixel count on a 2x display for a poster
 * that is only a couple of hundred CSS pixels wide, which is a poor trade for how little of that
 * detail is visible.
 */
export const MAX_IMAGE_SCALE = 1.5;

/**
 * How far outside the viewport, in pixels, item images start loading.
 *
 * The library default is 100px, which only starts a download once a row is almost on screen, so
 * images are perpetually catching up while scrolling.
 */
export const IMAGE_LOAD_THRESHOLD = 800;
