# 0001. Service worker caching strategy

## Context
The app is an installable PWA that must work offline. Vite hashes `/assets/*` filenames. Every other file (HTML, manifest, icons) keeps a stable URL. A dev-server service worker would cache Vite's unhashed modules.

## Decision
- Serve `/assets/*` cache-first. The hashed names make them immutable.
- Serve everything else network-first. Otherwise a changed manifest never reaches the installed app.
- Share one cached shell (`/`) for all navigations, because the app is a single page.
- On install, precache the entry bundle that the current `index.html` references. The app then works offline even if the first visit happened before the service worker took over.
- Register the service worker in production builds only (`import.meta.env.PROD`). A dev service worker serves stale code.

## Consequences
- Bump `CACHE` in `public/sw.js` when the caching rules change.
- Offline loads use the last cached shell.
