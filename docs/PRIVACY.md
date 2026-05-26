---
title: Privacy Policy
---

# Privacy Policy

Effective date: 2026-05-26

`fadee` is a Chrome extension that hides watched videos on YouTube channel pages.

## What data fadee handles

- **Watched-video IDs.** When you mark a video as watched, fadee stores its YouTube video ID locally via `chrome.storage.sync`. Because `chrome.storage.sync` is provided by Chrome itself, those IDs are synchronized across the Chrome instances signed in to your own Google account, by Chrome — not by fadee. fadee never sends them anywhere else.
- **Local UI preferences.** Small extension settings (e.g. toolbar toggles) are stored in the same `chrome.storage` area.

## What data fadee does NOT handle

- No personally identifiable information.
- No browsing history beyond the per-video watched markers above.
- No analytics, no telemetry, no crash reporting.
- No third-party trackers or SDKs.

## Network requests

fadee makes no network requests of its own. All operation is local to your browser.

## Permission rationale

- `storage` — persist the set of watched-video IDs and small UI preferences across sessions and devices via `chrome.storage.sync`.
- `offscreen` — host a hidden document that reports the OS color-scheme preference (`matchMedia("(prefers-color-scheme: dark)")`) to the service worker, so the toolbar icon can follow your system dark/light mode setting.
- `host_permissions: https://www.youtube.com/*` — required to read the channel-page DOM and apply the fade to watched videos.

## Contact

Questions or concerns? Open an issue at <https://github.com/ichi0g0y/fadee/issues>.
