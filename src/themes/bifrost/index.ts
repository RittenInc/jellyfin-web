import { buildCustomColorScheme } from 'themes/utils';

/** The "Bifrost" color scheme. */
const theme = buildCustomColorScheme({
    palette: {
        background: {
            default: '#050a12',
            paper: '#0c141f'
        },
        primary: {
            main: '#55e8ff',
            dark: '#2bb4cc',
            light: '#8af1ff',
            contrastText: '#06101b'
        },
        secondary: {
            main: '#936cff',
            contrastText: '#fff'
        },
        text: {
            primary: '#f5f8ff',
            secondary: '#aeb8c8'
        },
        action: {
            focus: 'rgba(85, 232, 255, 0.14)',
            hover: 'rgba(85, 232, 255, 0.08)'
        },
        divider: 'rgba(85, 232, 255, 0.14)',
        AppBar: {
            defaultBg: '#050a12'
        },
        Button: {
            inheritContainedBg: 'rgba(12, 20, 31, 0.82)',
            inheritContainedHoverBg: 'rgba(20, 31, 47, 0.92)'
        },
        FilledInput: {
            bg: 'rgba(7, 15, 27, 0.9)'
        },
        SnackbarContent: {
            bg: '#0c141f',
            color: 'rgba(255, 255, 255, 0.87)'
        }
    }
});

export default theme;
