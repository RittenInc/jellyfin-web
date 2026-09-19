# jellyfin-web — Structural Map

Web client (SPA) for the Jellyfin media server. No backend here: all data comes from a
Jellyfin server over HTTP via `@jellyfin/sdk`. Webpack builds a static bundle to `dist/`.
The codebase is mid-migration from legacy vanilla-JS "controllers + HTML views" to
React + MUI + TanStack Query (~607 TS/TSX files vs ~247 JS/JSX).

## Entry points

| Entry | What it does |
|---|---|
| `src/index.jsx` | The real entry (webpack `entry: { 'main.jellyfin': './index.jsx' }`). Boots polyfills, `appHost`, resolves the server URL, initializes `ServerConnections`/ApiClient, loads the i18n dictionary, loads frontend plugins, wires API error handlers + server notifications, then mounts React into `#reactRoot`. |
| `src/index.html` | HTML shell with the splash logo and `#reactRoot`; processed by `html-webpack-plugin`. |
| `src/RootApp.tsx` | React root. Provider stack: `PersistQueryClientProvider` → `ApiProvider` → `UserSettingsProvider` → `WebConfigProvider` → router. |
| `src/RootAppRouter.tsx` | `createHashRouter` — merges modern **or** legacy app routes (chosen by `layoutManager.modern`) with dashboard + wizard routes. Renders the always-present `Backdrop` and `AppHeader`. |
| `src/serviceworker.js` | Service worker (registered from `index.jsx` on non-TV, non-native builds). |
| `webpack.common.js` / `.dev.js` / `.prod.js` | Build config; `resolve.modules` includes `src`, so imports are bare paths (`components/...`, `hooks/...`) — no `@/` alias. |

## Core boundaries

- **`src/apps/`** — Four route-level applications mounted by `RootAppRouter`: `modern` (new React UI), `legacy` (older UI kept for the non-modern layout), `dashboard` (admin), `wizard` (first-run setup). Each owns `routes/`, `features/`, `components/`, and an `AppLayout.tsx`.
- **`src/components/`** — Shared cross-app UI and the legacy runtime glue: `router/` (route helpers, `ErrorBoundary`, `appRouter`), `viewManager/` (mounts legacy HTML views inside React routes), `playback/` (`playbackmanager.js`, play queue), `cardbuilder/`, dialogs, and `apphost.js`.
- **`src/lib/` + `src/utils/` + `src/scripts/`** — Non-UI infrastructure: `lib/jellyfin-apiclient/ServerConnections` (server/session/ApiClient registry and the source of `localusersignedin`/`-out` events), `lib/globalize` (i18n against `src/strings/*.json`, 108 locales), `utils/query/queryClient.ts`, and `scripts/settings/` (app/user/web settings).
- **`src/hooks/`** — React data layer. `useApi` exposes `{ api, user, __legacyApiClient__ }`; `hooks/api/*` wrap SDK calls as TanStack Query options/hooks.
- **`src/plugins/` + `src/elements/`** — Runtime-loaded feature plugins (players: `htmlVideoPlayer`, `bookPlayer`, `chromecastPlayer`, `syncPlay`, screensavers) loaded via `pluginManager`; `elements/` holds the legacy `emby-*` web components still used throughout.

## Data flow / state

There is no local database. State lives in four places:

1. **Server state → TanStack Query.** `src/utils/query/queryClient.ts` is the single `QueryClient`: 1-min `staleTime`, 24-h `gcTime`, 2 retries, 401s cancelled and nulled out. Persisted to **IndexedDB** via `idb-keyval` under the key `jellyfin-query-cache`, busted by `__JF_BUILD_VERSION__`. Query keys are SDK-shaped arrays, e.g. `[ 'User', userId, 'Views', params ]`.
2. **Session / connection state.** `ServerConnections` (`src/lib/jellyfin-apiclient/`) holds servers, credentials, and the active `ApiClient`; it emits events consumed by `ApiProvider` (`src/hooks/useApi.tsx`) to publish `api`/`user` through React context.
3. **Settings.** `scripts/settings/userSettings.js` — per-user display preferences, debounced-saved to the server as DisplayPreferences (`usersettings`/client `emby`) and mirrored into the query cache; `appSettings.js` — device-local `localStorage`; `webSettings.js` — deployment config fetched from `config.json` with `src/config.json` as fallback.
4. **Imperative legacy state.** Singletons kept outside React: `playbackmanager.js`/`playqueuemanager.js`, `layoutManager`, `viewManager` (caches mounted legacy views), and the `utils/events.ts` pub/sub bus that connects legacy modules to React.

## Convention anchors

| Concern | Exemplar |
|---|---|
| API routes / data fetching | `src/hooks/api/useUserViews.ts` — `fetchX` + exported `getXQuery(queryOptions)` + `useX` hook; always pass `{ signal }`, gate with `enabled: !!api`. Feature-local variants live under e.g. `src/apps/modern/features/libraries/hooks/api/`. |
| Route definition | `src/apps/modern/routes/routes.tsx` — `RouteObject[]` built from `ASYNC_*`/`LEGACY_*` lists via `toAsyncPageRoute` / `toViewManagerPageRoute`, wrapped in `ConnectionRequired` (`public` / default / `admin`). Dashboard equivalent: `src/apps/dashboard/routes/routes.tsx`. |
| Errors | `src/components/router/ErrorBoundary.tsx` — router `errorElement`/`ErrorBoundary` rendering an MUI `Alert` with name, message, and stack. Fetch-layer 401 handling sits in `utils/query/queryClient.ts`. |
| Logging | No logger abstraction — `console.*` with a bracketed module tag, e.g. `console.warn('[QueryCache] failed to remove unauthorized data', e)` in `src/utils/query/queryClient.ts` and `console.info('[ApiProvider] ...')` in `src/hooks/useApi.tsx`. |
| Tests | `src/apps/modern/features/libraries/utils/alphabet.test.ts` — Vitest (`describe`/`it`/`expect` imported explicitly), jsdom env, colocated `*.test.ts` next to the unit under test. Run with `npm test`. Coverage is thin: 13 test files, all pure-util. |
| Layout/feature component | `src/apps/modern/features/libraries/components/ItemsView.tsx` inside the `features/<name>/{components,hooks,constants,types,utils}` layout. |

## Commands

- `npm start` / `npm run serve` — webpack dev server
- `npm run build:production` — production bundle to `dist/`
- `npm test` — Vitest (single run); `npm run test:watch`
- `npm run lint` (ESLint 9 flat config), `npm run stylelint`, `npm run build:check` (`tsc --noEmit`)
