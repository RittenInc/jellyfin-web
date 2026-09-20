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
| `logo-header.svg` | Wordmark shown in the header via `.pageTitleWithDefaultLogo`. |
| `logo-login.svg` | Hero artwork behind the sign-in card. |

## Replacing the artwork

The two SVGs are placeholders drawn to match the palette. To use your own
`bifrost-header.png` / `bifrost-login-logo.png`, drop them in this directory and
point the two `url()` references in `theme.scss` at them:

```scss
.pageTitleWithDefaultLogo {
    background-image: url(bifrost-header.png);
}

#loginPage::before {
    background-image: url(bifrost-login-logo.png);
}
```

Files referenced this way are hashed and emitted by webpack, so nothing needs to
be copied into the server's web root by hand.

## Changing colours

Every accent derives from the four gradient stops declared at the top of
`theme.scss` (`$cyan`, `$blue`, `$purple`, `$magenta`). Changing those four
values re-tints buttons, the tab underline, progress bars, focus rings and the
Live TV guide together.

The guide is themed entirely through the `$guide-*` overrides in the
`@use ... with` block — `src/components/guide/guide.scss` reads them as
`--jf-guide-*` custom properties. Add guide rules there rather than here.
