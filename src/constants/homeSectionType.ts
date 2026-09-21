// NOTE: This should be included in the OpenAPI spec ideally
// https://github.com/jellyfin/jellyfin/blob/1b4394199a2f9883cd601bdb8c9d66015397aa52/Jellyfin.Data/Enums/HomeSectionType.cs
export enum HomeSectionType {
    None = 'none',
    SmallLibraryTiles = 'smalllibrarytiles',
    LibraryButtons = 'librarybuttons',
    ActiveRecordings = 'activerecordings',
    Resume = 'resume',
    ResumeAudio = 'resumeaudio',
    LatestMedia = 'latestmedia',
    NextUp = 'nextup',
    LiveTv = 'livetv',
    ResumeBook = 'resumebook'
}

// NOTE: Bifrost deviates from the upstream Jellyfin defaults here.
// The server only returns homesection values that a user has explicitly saved
// (see DisplayPreferencesController.GetDisplayPreferences), so this list is what
// every user sees until they change it in Settings > Home.
// Upstream default for reference:
// [ SmallLibraryTiles, Resume, ResumeAudio, ResumeBook, LiveTv, NextUp, LatestMedia, None, None, None ]
export const DEFAULT_SECTIONS: HomeSectionType[] = [
    HomeSectionType.Resume,
    HomeSectionType.NextUp,
    HomeSectionType.LatestMedia,
    HomeSectionType.LiveTv,
    HomeSectionType.None,
    HomeSectionType.None,
    HomeSectionType.None,
    HomeSectionType.None,
    HomeSectionType.None,
    HomeSectionType.None
];
