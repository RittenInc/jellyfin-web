import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import React, { type FC } from 'react';
import { useLocation } from 'react-router-dom';

import { appRouter, PUBLIC_PATHS } from 'components/router/appRouter';
import BaseToolbar from 'components/toolbar/AppToolbar';
import ServerButton from 'components/toolbar/ServerButton';
import { useEmbeddedMenuLink } from 'hooks/useEmbeddedMenuLink';

import RemotePlayButton from './RemotePlayButton';
import SyncPlayButton from './SyncPlayButton';
import SearchButton from './SearchButton';
import UserViewNav from './userViews/UserViewNav';

interface AppToolbarProps {
    isDrawerAvailable: boolean
    isDrawerOpen: boolean
    onDrawerButtonClick: (event: React.MouseEvent<HTMLElement>) => void
}

const AppToolbar: FC<AppToolbarProps> = ({
    isDrawerAvailable,
    isDrawerOpen,
    onDrawerButtonClick
}) => {
    const location = useLocation();
    const embeddedMenuLink = useEmbeddedMenuLink();

    // The video osd does not show the standard toolbar
    if (location.pathname === '/video') return null;

    // Only show the back button in apps when appropriate
    const isBackButtonAvailable = window.NativeShell && appRouter.canGoBack(location.pathname);

    // Check if the current path is a public path to hide user content
    const isPublicPath = PUBLIC_PATHS.includes(location.pathname);

    return (
        <BaseToolbar
            buttons={!isPublicPath && (
                <>
                    <SyncPlayButton />
                    <RemotePlayButton />
                    <SearchButton />
                </>
            )}
            isDrawerAvailable={isDrawerAvailable}
            isDrawerOpen={isDrawerOpen}
            onDrawerButtonClick={onDrawerButtonClick}
            isBackButtonAvailable={isBackButtonAvailable}
            isUserMenuAvailable={!isPublicPath}
            className='padded-left padded-right'
        >
            {!isDrawerAvailable ? (
                <Stack
                    direction='row'
                    spacing={0.5}
                >
                    <ServerButton />

                    {!isPublicPath && (
                        <UserViewNav />
                    )}
                </Stack>
            ) : (
                // The drawer replaces the server button and nav on small screens, leaving nothing to
                // identify an embedded site, so show its name as the page title instead.
                embeddedMenuLink && (
                    <Typography
                        variant='h6'
                        component='h1'
                        noWrap
                        sx={{ minWidth: 0, fontSize: '1.1rem' }}
                    >
                        {embeddedMenuLink.name}
                    </Typography>
                )
            )}
        </BaseToolbar>
    );
};

export default AppToolbar;
