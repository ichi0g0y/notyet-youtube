import {
  getSettings,
  saveSettings,
  type Scope,
  type Settings
} from "./storage";
import {
  detectScope,
  hideWatchedCards,
  showHiddenCards
} from "./content/cards";
import { applyMarkButtons, MARK_BTN_CLASS } from "./content/mark";
import { BUTTON_ID, removeButton, upsertButton } from "./content/toolbar";

let settings: Settings | null = null;
let manuallyWatchedIdSet: ReadonlySet<string> = new Set();
let currentUrl = location.href;
let observer: MutationObserver | null = null;
let filterTimer: number | undefined;
let syncTimer: number | undefined;
let markTimer: number | undefined;

void start();

async function start(): Promise<void> {
  setSettings(await getSettings());
  syncPage();
  watchNavigation();
  watchDomChanges();

  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area !== "sync") return;

    void getSettings().then((nextSettings) => {
      setSettings(nextSettings);
      syncPage();
    });
  });
}

function setSettings(nextSettings: Settings): void {
  settings = nextSettings;
  manuallyWatchedIdSet = new Set(nextSettings.manuallyWatchedIds);
}

function syncPage(): void {
  if (!settings?.enabled) {
    window.clearTimeout(filterTimer);
    removeButton();
    showHiddenCards();
    applyShortsSection(false);
    applyHomeShelves(false);
    return;
  }

  const scope = detectScope();
  upsertButton(scope, settings, () => toggleCurrentTab());
  applyShortsSection(settings.removeShortsSection);
  applyHomeShelves(scope === "home" ? settings.hideHomeShelves : false);
  applyMarkButtons(scope, manuallyWatchedIdSet);

  if (scope && settings.activeScopes[scope]) {
    scheduleFilter(scope);
  } else {
    window.clearTimeout(filterTimer);
    showHiddenCards();
  }
}

function scheduleFilter(scope: Scope): void {
  window.clearTimeout(filterTimer);
  filterTimer = window.setTimeout(() => {
    if (settings) hideWatchedCards(scope, settings, manuallyWatchedIdSet);
  }, 120);
}

function scheduleMarkButtons(scope: Scope): void {
  window.clearTimeout(markTimer);
  markTimer = window.setTimeout(() => {
    if (settings) applyMarkButtons(scope, manuallyWatchedIdSet);
  }, 200);
}

function applyShortsSection(hide: boolean): void {
  document.documentElement.setAttribute("data-fadee-hide-shorts", String(hide));
}

function applyHomeShelves(hide: boolean): void {
  document.documentElement.setAttribute("data-fadee-hide-home-shelves", String(hide));
}

async function toggleCurrentTab(): Promise<void> {
  if (!settings) return;
  const scope = detectScope();
  if (!scope) return;

  const nextSettings: Settings = {
    ...settings,
    activeScopes: {
      ...settings.activeScopes,
      [scope]: !settings.activeScopes[scope]
    }
  };

  setSettings(nextSettings);
  await saveSettings(nextSettings);
  syncPage();
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

function requestSync(): void {
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(syncPage, 250);
}

function watchDomChanges(): void {
  observer?.disconnect();
  observer = new MutationObserver((records) => {
    if (!settings?.enabled) return;

    // Skip if all mutations are our own (avoid feedback loop)
    if (records.every(isOwnMutation)) return;

    if (!document.querySelector(`#${BUTTON_ID}`)) {
      requestSync();
    }

    const scope = detectScope();
    if (!scope) return;
    scheduleMarkButtons(scope);
    if (settings.activeScopes[scope]) {
      scheduleFilter(scope);
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

function isOwnMutation(record: MutationRecord): boolean {
  const target = record.target as HTMLElement;
  if (
    target.classList?.contains(MARK_BTN_CLASS) ||
    target.closest?.(`.${MARK_BTN_CLASS}, #${BUTTON_ID}`)
  ) {
    return true;
  }
  for (const node of record.addedNodes) {
    if (node instanceof HTMLElement && node.classList.contains(MARK_BTN_CLASS)) return true;
  }
  return false;
}
