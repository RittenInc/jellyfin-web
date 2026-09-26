import type { MediaStream } from '@jellyfin/sdk/lib/generated-client/models/media-stream';

/** Audio language used when the user has not picked a preference of their own. */
export const DEFAULT_AUDIO_LANGUAGE = 'eng';

const LANGUAGE_ALIASES: Record<string, string> = {
    en: 'eng',
    english: 'eng'
};

function normalizeLanguage(language?: string | null) {
    const value = (language || '').trim().toLowerCase();
    return LANGUAGE_ALIASES[value] || value;
}

function isCommentary(stream: MediaStream) {
    return /commentary/i.test(stream.Title || stream.DisplayTitle || '');
}

/**
 * Picks the audio track matching the user's preferred language, falling back to English when
 * no preference is set. Unlike the server's own selection, a track flagged as the file's default
 * never wins over a track in the preferred language.
 */
export function getPreferredAudioStreamIndex(
    mediaStreams: MediaStream[] | null | undefined,
    preferredLanguage?: string | null
): number | undefined {
    const language = normalizeLanguage(preferredLanguage) || DEFAULT_AUDIO_LANGUAGE;

    const matches = (mediaStreams || []).filter(stream => (
        stream.Type === 'Audio' && normalizeLanguage(stream.Language) === language
    ));

    // Prefer the file's default track among the matches, and main audio over commentary
    matches.sort((a, b) => (
        Number(isCommentary(a)) - Number(isCommentary(b))
        || Number(!!b.IsDefault) - Number(!!a.IsDefault)
    ));

    return matches[0]?.Index;
}
