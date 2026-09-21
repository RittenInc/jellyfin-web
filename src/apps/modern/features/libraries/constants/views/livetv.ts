import { LibraryTab } from 'types/libraryTab';
import type { LibraryTabContent } from 'types/libraryTabContent';
import { SectionType } from 'types/sections';

const recordingsTabContent: LibraryTabContent = {
    viewType: LibraryTab.Recordings,
    sectionsView: {
        programSections: [
            SectionType.LatestRecordings,
            SectionType.RecordingFolders
        ]
    }
};

const channelsTabContent: LibraryTabContent = {
    viewType: LibraryTab.Channels,
    isBtnGridListEnabled: false,
    isBtnSortEnabled: false,
    isAlphabetPickerEnabled: false
};

const programsTabContent: LibraryTabContent = {
    viewType: LibraryTab.Programs,
    sectionsView: {
        programSections: [
            SectionType.ActivePrograms,
            SectionType.UpcomingEpisodes,
            SectionType.UpcomingMovies,
            SectionType.UpcomingSports,
            SectionType.UpcomingKids,
            SectionType.UpcomingNews
        ]
    }
};

const guideTabContent: LibraryTabContent = {
    viewType: LibraryTab.Guide
};

const liveTvViews: Record<number, LibraryTabContent> = {
    0: guideTabContent,
    1: channelsTabContent,
    2: programsTabContent,
    3: recordingsTabContent
};

export default liveTvViews;
