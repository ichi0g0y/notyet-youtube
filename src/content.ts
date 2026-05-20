import { type ChannelTab, getSettings, saveSettings, type Settings } from "./storage";

const BUTTON_ID = "notyet-toggle";
const HIDDEN_ATTR = "data-notyet-hidden";
const WATCHED_LABELS = ["Watched", "視聴済み"];

let settings: Settings | null = null;
let currentUrl = location.href;
let observer: MutationObserver | null = null;
let filterTimer: number | undefined;

void start();

async function start(): Promise<void> {
  settings = await getSettings();
  syncPage();
  watchNavigation();
  watchDomChanges();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    void getSettings().then((nextSettings) => {
      settings = nextSettings;
      syncPage();
    });
  });
}

function syncPage(): void {
  if (!settings?.enabled || !isChannelContentTab()) {
    removeButton();
    showHiddenCards();
    return;
  }

  const tab = getCurrentTab();
  if (!tab) {
    removeButton();
    showHiddenCards();
    return;
  }

  upsertButton(tab);

  if (settings.activeTabs[tab]) {
    scheduleFilter(tab);
  } else {
    showHiddenCards();
  }
}

function isChannelContentTab(): boolean {
  return /^\/(@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)\/(videos|shorts|streams|live)/.test(
    location.pathname
  );
}

function getCurrentTab(): ChannelTab | null {
  const path = location.pathname;

  if (path.includes("/shorts")) return "shorts";
  if (path.includes("/streams") || path.includes("/live")) return "live";
  if (path.includes("/videos")) return "videos";

  return null;
}

function upsertButton(tab: ChannelTab): void {
  const existing = document.querySelector<HTMLButtonElement>(`#${BUTTON_ID}`);
  const button = existing ?? document.createElement("button");

  button.id = BUTTON_ID;
  button.className = "notyet-toggle";
  button.type = "button";
  button.dataset.tab = tab;
  button.dataset.active = String(Boolean(settings?.activeTabs[tab]));
  button.textContent = `${labelFor(tab)} ${settings?.activeTabs[tab] ? "ON" : "OFF"}`;
  button.title = "Hide watched videos";

  if (!existing) {
    button.addEventListener("click", () => {
      void toggleCurrentTab();
    });
    document.body.append(button);
  }
}

async function toggleCurrentTab(): Promise<void> {
  if (!settings) return;

  const tab = getCurrentTab();
  if (!tab) return;

  const nextSettings: Settings = {
    ...settings,
    activeTabs: {
      ...settings.activeTabs,
      [tab]: !settings.activeTabs[tab]
    }
  };

  settings = nextSettings;
  await saveSettings(nextSettings);
  syncPage();
}

function labelFor(tab: ChannelTab): string {
  switch (tab) {
    case "videos":
      return "Hide watched videos";
    case "shorts":
      return "Hide watched shorts";
    case "live":
      return "Hide watched live";
  }
}

function removeButton(): void {
  document.querySelector(`#${BUTTON_ID}`)?.remove();
}

function scheduleFilter(tab: ChannelTab): void {
  window.clearTimeout(filterTimer);
  filterTimer = window.setTimeout(() => {
    hideWatchedCards(tab);
  }, 120);
}

function hideWatchedCards(tab: ChannelTab): void {
  for (const card of getCards(tab)) {
    if (isWatched(card)) {
      card.setAttribute(HIDDEN_ATTR, "true");
      card.style.display = "none";
    } else if (card.getAttribute(HIDDEN_ATTR) === "true") {
      card.removeAttribute(HIDDEN_ATTR);
      card.style.display = "";
    }
  }
}

function showHiddenCards(): void {
  for (const card of document.querySelectorAll<HTMLElement>(`[${HIDDEN_ATTR}="true"]`)) {
    card.removeAttribute(HIDDEN_ATTR);
    card.style.display = "";
  }
}

function getCards(tab: ChannelTab): HTMLElement[] {
  const selectors: Record<ChannelTab, string[]> = {
    videos: ["ytd-rich-item-renderer", "ytd-rich-grid-media", "ytd-grid-video-renderer", "ytd-video-renderer"],
    shorts: [
      "ytd-rich-item-renderer",
      "ytd-rich-grid-slim-media",
      "ytd-reel-item-renderer",
      "ytd-grid-video-renderer"
    ],
    live: ["ytd-rich-item-renderer", "ytd-rich-grid-media", "ytd-grid-video-renderer", "ytd-video-renderer"]
  };

  return [...document.querySelectorAll<HTMLElement>(selectors[tab].join(","))].map(getCardRoot).filter(unique);
}

function getCardRoot(node: HTMLElement): HTMLElement {
  return (
    node.closest<HTMLElement>(
      "ytd-rich-item-renderer,ytd-grid-video-renderer,ytd-video-renderer,ytd-reel-item-renderer,ytd-rich-grid-slim-media"
    ) ?? node
  );
}

function isWatched(card: HTMLElement): boolean {
  return hasProgressOverlay(card) || hasWatchedAriaLabel(card);
}

function hasProgressOverlay(card: HTMLElement): boolean {
  const selectors = [
    "ytd-thumbnail-overlay-resume-playback-renderer",
    "#progress.ytd-thumbnail-overlay-resume-playback-renderer",
    ".ytThumbnailOverlayProgressBarHostWatchedProgressBar",
    ".ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment",
    ".ytThumbnailOverlayProgressBarHostWatchedProgressBarSegmentModern"
  ];

  return selectors.some((selector) => [...card.querySelectorAll<HTMLElement>(selector)].some(isVisibleProgress));
}

function isVisibleProgress(node: HTMLElement): boolean {
  const style = getComputedStyle(node);
  const rect = node.getBoundingClientRect();

  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
    return false;
  }

  if (rect.width > 1 && rect.height > 0) {
    return true;
  }

  const width = Number.parseFloat(style.width);
  return Number.isFinite(width) && width > 1;
}

function hasWatchedAriaLabel(card: HTMLElement): boolean {
  return WATCHED_LABELS.some((label) => Boolean(card.querySelector(`[aria-label*="${label}"]`)));
}

function unique<T>(item: T, index: number, list: T[]): boolean {
  return list.indexOf(item) === index;
}

function watchNavigation(): void {
  window.addEventListener("yt-navigate-finish", handleNavigation);
  window.addEventListener("popstate", handleNavigation);

  window.setInterval(() => {
    if (location.href !== currentUrl) {
      handleNavigation();
    }
  }, 750);
}

function handleNavigation(): void {
  currentUrl = location.href;
  window.setTimeout(syncPage, 250);
}

function watchDomChanges(): void {
  observer?.disconnect();
  observer = new MutationObserver(() => {
    const tab = getCurrentTab();
    if (settings?.enabled && tab && settings.activeTabs[tab]) {
      scheduleFilter(tab);
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}
