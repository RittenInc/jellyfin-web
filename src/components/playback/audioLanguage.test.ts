import type { MediaStream } from '@jellyfin/sdk/lib/generated-client/models/media-stream';
import { describe, expect, it } from 'vitest';
import { getPreferredAudioStreamIndex } from './audioLanguage';

const audio = (Index: number, Language: string | null, extra: Partial<MediaStream> = {}): MediaStream => ({
    Type: 'Audio', Index, Language, ...extra
});

describe('Function: getPreferredAudioStreamIndex', () => {
    it('Should prefer English over a foreign default track when no preference is set', () => {
        const streams = [
            { Type: 'Video', Index: 0 } as MediaStream,
            audio(1, 'rus', { IsDefault: true }),
            audio(2, 'eng')
        ];
        expect(getPreferredAudioStreamIndex(streams, '')).toBe(2);
        expect(getPreferredAudioStreamIndex(streams, null)).toBe(2);
    });

    it('Should honour an explicit language preference', () => {
        const streams = [audio(1, 'eng', { IsDefault: true }), audio(2, 'jpn')];
        expect(getPreferredAudioStreamIndex(streams, 'jpn')).toBe(2);
    });

    it('Should match two-letter and full-name English codes', () => {
        expect(getPreferredAudioStreamIndex([audio(1, 'fre'), audio(2, 'en')])).toBe(2);
        expect(getPreferredAudioStreamIndex([audio(1, 'fre'), audio(2, 'English')])).toBe(2);
    });

    it('Should prefer the default English track and skip commentary', () => {
        const streams = [
            audio(1, 'eng', { Title: 'Director Commentary', IsDefault: true }),
            audio(2, 'eng'),
            audio(3, 'eng', { IsDefault: true })
        ];
        expect(getPreferredAudioStreamIndex(streams)).toBe(3);
    });

    it('Should return undefined when no track matches', () => {
        expect(getPreferredAudioStreamIndex([audio(1, 'ger'), audio(2, null)])).toBeUndefined();
        expect(getPreferredAudioStreamIndex(undefined)).toBeUndefined();
    });
});
