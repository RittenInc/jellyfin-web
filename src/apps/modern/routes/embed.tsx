import OpenInNew from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import ResizeObserver from 'resize-observer-polyfill';

import Page from 'components/Page';
import { useWebConfig } from 'hooks/useWebConfig';
import globalize from 'lib/globalize';
import { findEmbeddableMenuLink } from 'utils/menuLinks';

/** How long to wait before assuming the site refused to be framed. */
const LOAD_TIMEOUT_MS = 12000;

const MIN_FRAME_HEIGHT = 240;

const Embed = () => {
    const [ searchParams ] = useSearchParams();
    const { menuLinks } = useWebConfig();

    const url = searchParams.get('url');
    const menuLink = findEmbeddableMenuLink(menuLinks, url);

    const containerRef = useRef<HTMLDivElement>(null);
    const [ frameHeight, setFrameHeight ] = useState<number>();
    const [ isLoaded, setIsLoaded ] = useState(false);
    const [ isTimedOut, setIsTimedOut ] = useState(false);

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
    }, [ isLoaded ]);

    const onLoad = useCallback(() => {
        setIsLoaded(true);
        setIsTimedOut(false);
    }, []);

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
                    component='iframe'
                    src={menuLink.url}
                    title={menuLink.name}
                    onLoad={onLoad}
                    // Fullscreen is deliberately not allowed: the framed site would cover the app
                    // chrome and leave no way back out.
                    allow='clipboard-write'
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
