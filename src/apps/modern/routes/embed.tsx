import Close from '@mui/icons-material/Close';
import OpenInNew from '@mui/icons-material/OpenInNew';
import Refresh from '@mui/icons-material/Refresh';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import ResizeObserver from 'resize-observer-polyfill';

import Page from 'components/Page';
import { useWebConfig } from 'hooks/useWebConfig';
import globalize from 'lib/globalize';
import { findEmbeddableMenuLink } from 'utils/menuLinks';

/** How long to wait before assuming the site refused to be framed. */
const LOAD_TIMEOUT_MS = 12000;

const MIN_FRAME_HEIGHT = 240;

interface EmbedLocationState {
    /** The path to return to when the page is closed. */
    from?: string;
}

const Embed = () => {
    const [ searchParams ] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { menuLinks } = useWebConfig();

    const url = searchParams.get('url');
    const menuLink = findEmbeddableMenuLink(menuLinks, url);

    const containerRef = useRef<HTMLDivElement>(null);
    const [ frameHeight, setFrameHeight ] = useState<number>();
    const [ isLoaded, setIsLoaded ] = useState(false);
    const [ isTimedOut, setIsTimedOut ] = useState(false);
    // Changing the key forces the iframe to reload without touching browser history
    const [ frameKey, setFrameKey ] = useState(0);

    // The iframe cannot use a percentage height since the surrounding page is not a flex container,
    // so the remaining viewport height is measured instead.
    useEffect(() => {
        const updateHeight = () => {
            const top = containerRef.current?.getBoundingClientRect().top;
            if (top == null) return;
            setFrameHeight(Math.max(MIN_FRAME_HEIGHT, Math.floor(window.innerHeight - top)));
        };

        updateHeight();
        // The app bar measures itself after mount and can wrap to a second row on narrow screens,
        // so re-measure whenever its height changes.
        const observer = new ResizeObserver(() => window.requestAnimationFrame(updateHeight));
        const appBar = document.querySelector('header.MuiAppBar-root');
        if (appBar) observer.observe(appBar);

        window.addEventListener('resize', updateHeight);
        window.addEventListener('orientationchange', updateHeight);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateHeight);
            window.removeEventListener('orientationchange', updateHeight);
        };
    }, []);

    useEffect(() => {
        if (isLoaded) return;

        const timeout = setTimeout(() => setIsTimedOut(true), LOAD_TIMEOUT_MS);
        return () => clearTimeout(timeout);
    }, [ isLoaded, frameKey ]);

    const onLoad = useCallback(() => {
        setIsLoaded(true);
        setIsTimedOut(false);
    }, []);

    const onRefresh = useCallback(() => {
        setIsLoaded(false);
        setIsTimedOut(false);
        setFrameKey(key => key + 1);
    }, []);

    // The framed site pushes its own entries onto the browser history, so history.back() is not a
    // reliable way out. Navigate to the page the link was opened from instead.
    const onClose = useCallback(() => {
        const from = (location.state as EmbedLocationState | null)?.from;
        navigate(from || '/home');
    }, [ location.state, navigate ]);

    if (!menuLink) {
        console.warn('[Embed] no embeddable menu link is configured for url', url);
        return <Navigate replace to='/home' />;
    }

    return (
        <Page
            id='embedPage'
            className='embedPage'
            title={menuLink.name}
            isBackButtonEnabled={false}
            isNowPlayingBarEnabled={false}
        >
            <Stack
                direction='row'
                alignItems='center'
                spacing={1}
                sx={{ paddingX: 1, minHeight: 44, flexShrink: 0 }}
            >
                <Tooltip title={globalize.translate('ButtonClose')}>
                    <IconButton
                        edge='start'
                        size='small'
                        color='inherit'
                        aria-label={globalize.translate('ButtonClose')}
                        onClick={onClose}
                    >
                        <Close />
                    </IconButton>
                </Tooltip>

                <Typography
                    variant='h6'
                    component='h1'
                    noWrap
                    sx={{ flexGrow: 1, fontSize: '1.1rem' }}
                >
                    {menuLink.name}
                </Typography>

                <Tooltip title={globalize.translate('Refresh')}>
                    <IconButton
                        size='small'
                        color='inherit'
                        aria-label={globalize.translate('Refresh')}
                        onClick={onRefresh}
                    >
                        <Refresh />
                    </IconButton>
                </Tooltip>

                <Tooltip title={globalize.translate('LabelOpenInNewTab')}>
                    <IconButton
                        edge='end'
                        size='small'
                        color='inherit'
                        aria-label={globalize.translate('LabelOpenInNewTab')}
                        component='a'
                        href={menuLink.url}
                        target='_blank'
                        rel='noopener noreferrer'
                    >
                        <OpenInNew />
                    </IconButton>
                </Tooltip>
            </Stack>

            <Box
                ref={containerRef}
                sx={{
                    position: 'relative',
                    width: '100%',
                    height: frameHeight ? `${frameHeight}px` : undefined,
                    overflow: 'hidden'
                }}
            >
                <Box
                    key={frameKey}
                    component='iframe'
                    src={menuLink.url}
                    title={menuLink.name}
                    onLoad={onLoad}
                    allow='fullscreen; clipboard-write'
                    sx={{
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        border: 0
                    }}
                />

                {!isLoaded && (
                    <Stack
                        alignItems='center'
                        justifyContent='center'
                        spacing={2}
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            padding: 2,
                            textAlign: 'center',
                            backgroundColor: 'background.default'
                        }}
                    >
                        {isTimedOut ? (
                            <>
                                <Typography>
                                    {globalize.translate('MessageEmbedFailed', menuLink.name)}
                                </Typography>
                                <Button
                                    variant='contained'
                                    startIcon={<OpenInNew />}
                                    component='a'
                                    href={menuLink.url}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                >
                                    {globalize.translate('LabelOpenInNewTab')}
                                </Button>
                            </>
                        ) : (
                            <CircularProgress />
                        )}
                    </Stack>
                )}
            </Box>
        </Page>
    );
};

export default Embed;
