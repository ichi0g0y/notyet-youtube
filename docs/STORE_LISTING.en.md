# Chrome Web Store Listing — English

Paste each section into the matching field in the Developer Dashboard (English locale).
Permission strings here must stay in sync with `manifest.json`.

## Name

fadee

## Short description (≤132 chars)

Fade out videos you've already watched on YouTube, so the unwatched ones are easy to spot.

## Detailed description

fadee hides videos you've already watched on YouTube, so the unwatched ones stand out at a glance.

### Features

- Auto-fades videos YouTube reports as watched (with an adjustable "counts as watched after" threshold).
- One-click "mark as watched" affordance on any video card for finer control.
- Per-scope toggles: Channel · Videos / Shorts / Streams, Subscriptions, Home, and Search results.
- Optional extras: hide all Shorts, hide themed Home shelves, keep top recommendations untouched.
- Watched-video IDs are stored in `chrome.storage.sync`, so they follow your Chrome profile across devices via Chrome's own sync. fadee never sends them anywhere.
- Toolbar icon follows your system dark / light mode.
- Popup shows current sync-storage usage and lets you clear the manually-marked list.

### How to use

1. Visit YouTube and open any page in scope (channel videos, subscriptions, home, search).
2. Videos that YouTube reports as watched fade automatically.
3. To fade a video manually, click the "mark as watched" button fadee adds to its card.
4. Open the toolbar popup to flip the master toggle, change scopes, adjust the watched threshold, or clear the manually-marked list.

### Scope

- Runs only on `https://www.youtube.com/*`.
- Stores only local extension settings and a manually-marked-video ID list via `chrome.storage`.
- Makes no external network requests of its own.
- Open source: <https://github.com/ichi0g0y/fadee>

## Category

Productivity

## Language

English

## Single-purpose statement

fadee fades out videos on YouTube that the user has already watched (either auto-detected from YouTube's own playback progress or explicitly marked by the user), so the remaining unwatched videos are easier to find.

## Permission justifications

- **storage** — fadee persists the user's manually-marked video ID list and a handful of small UI preferences (master toggle, per-scope toggles, watched threshold) via `chrome.storage.sync`. Without it the watched list and settings would not survive a reload.
- **offscreen** — fadee hosts a tiny offscreen document that reads the OS color-scheme preference via `matchMedia("(prefers-color-scheme: dark)")` and forwards the result to the service worker. This is the only MV3-permitted way for a service-worker background context to observe `matchMedia`, and is used purely so the toolbar icon can swap between light and dark variants.
- **host_permissions: https://www.youtube.com/\*** — fadee reads YouTube page DOM nodes to identify video cards, inject the per-card "mark as watched" affordance, and apply the fade CSS to watched cards.

## Data usage disclosure

- fadee does NOT collect personally identifiable information.
- fadee does NOT collect health, financial, authentication, personal communications, location, web history, or user activity.
- fadee does NOT transfer user data to third parties.
- fadee does NOT use user data for purposes unrelated to its single purpose.
- fadee does NOT sell user data.

## Privacy policy URL

<https://ichi0g0y.github.io/fadee/PRIVACY>
