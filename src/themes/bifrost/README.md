# Bifrost theme

The Bifrost look, ported from the branding stylesheet that used to be pasted
into the server's **Dashboard → General → Custom CSS** field. Once this build is
deployed, that field should be emptied — leaving it populated means two
stylesheets fighting over the same elements, and the branding sheet's Live TV
guide rules in particular will override the guide's own styling.

## Layout

| File | Purpose |
| --- | --- |
| `theme.scss` | Variable overrides passed to `_base/theme`, plus the handful of bespoke rules. Compiled by webpack into its own entry, loaded only when the theme is active. |
| `index.ts` | The matching MUI colour scheme, used by React components. Keep the two in sync. |

## Changing colours

Every accent derives from the four gradient stops declared at the top of
`theme.scss` (`$cyan`, `$blue`, `$purple`, `$magenta`). Changing those four
values re-tints buttons, the tab underline, progress bars, focus rings and the
Live TV guide together.

The guide is themed entirely through the `$guide-*` overrides in the
`@use ... with` block — `src/components/guide/guide.scss` reads them as
`--jf-guide-*` custom properties. Add guide rules there rather than here.

## Where the branding artwork lives

Only the login hero belongs to this theme. Everything else is applied app-wide
so the branding survives on other themes, before a theme loads, and outside the
page entirely (browser tab, PWA install).

| Asset | Used by |
| --- | --- |
| `src/assets/img/bifrost-login-logo.png` | `#loginPage::before` in `theme.scss` — **this theme only** |
| `src/assets/img/bifrost-header.png` | `.pageTitleWithDefaultLogo` in `_base/_theme.scss`, and the wide-screen boot splash in `src/styles/site.scss` — **all themes** |
| `src/favicon-512x512.png` | TV-layout header logo (`_base/_theme.scss`), boot splash (`site.scss`), logo screensaver |
| `src/favicon-192x192.png` | Toolbar server button, modern drawer header |
| `src/favicon*.png`, `src/favicon.ico`, `src/apple-touch-icon.png` | `src/index.html` and `src/manifest.json`; the sized PNGs are copied to `dist/favicons/` by the CopyPlugin rule in `webpack.common.js` |

### Path form matters

Inside `src/themes/bifrost/theme.scss` — a webpack **entry** — relative paths
like `url(../../assets/img/…)` work. Inside `_base/_theme.scss`, which is a
partial inlined into every theme, they do not: Sass resolves them against the
entry, not the partial. Use a bare module-style path there
(`url(assets/img/bifrost-header.png)`), which webpack resolves via
`resolve.modules`, exactly as the old `@jellyfin/ux-web/…` references did.

### Known gap

Bifrost ships a single light wordmark, so `_base/_theme.scss` no longer has the
light/dark banner branch Jellyfin used. On the light-background themes (Light,
Apple TV) the header wordmark will be hard to read until a dark variant is added
back.
