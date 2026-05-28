import { ensureDefaults } from "./storage";

const ICON_SIZES = [16, 32, 48, 128] as const;
const OFFSCREEN_URL = "offscreen.html";

function iconPaths(theme: "light" | "dark"): Record<number, string> {
  return Object.fromEntries(ICON_SIZES.map((size) => [size, `icons/${theme}/${size}.png`]));
}

async function ensureThemeWatcher(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: [chrome.offscreen.Reason.MATCH_MEDIA],
    justification: "Detect prefers-color-scheme to swap the toolbar icon."
  });
}

void ensureDefaults();
void ensureThemeWatcher();

// Registering onStartup is what wakes the service worker on browser launch;
// the body is redundant with the top-level call above but the registration
// itself is the wake-up trigger that must stay.
chrome.runtime.onStartup.addListener(() => {
  void ensureThemeWatcher();
});

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (
    typeof message === "object" &&
    message !== null &&
    (message as { type?: unknown }).type === "theme"
  ) {
    const dark = (message as { dark?: unknown }).dark === true;
    void chrome.action.setIcon({ path: iconPaths(dark ? "dark" : "light") });
  }
});
