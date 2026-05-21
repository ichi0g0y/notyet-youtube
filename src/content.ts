import {
  getSettings,
  markWatched,
  saveSettings,
  type Scope,
  type Settings,
  unmarkWatched
} from "./storage";

const BUTTON_ID = "notyet-toggle";
const MARK_BTN_CLASS = "notyet-mark-btn";
const MARK_INJECTED_ATTR = "data-notyet-mark";
const HIDDEN_ATTR = "data-notyet-hidden";
const WATCHED_LABELS = ["Watched", "視聴済み"];

type MessageKey =
  | "label.channel-videos"
  | "label.channel-shorts"
  | "label.channel-live"
  | "label.subscriptions"
  | "label.home"
  | "label.disabled"
  | "label.mark"
  | "label.unmark";

type Locale = "en" | "ja";

const MESSAGES: Record<Locale, Record<MessageKey, string>> = {
  en: {
    "label.channel-videos": "Hide watched videos (Channel)",
    "label.channel-shorts": "Hide watched shorts (Channel)",
    "label.channel-live": "Hide watched streams (Channel)",
    "label.subscriptions": "Hide watched (Subscriptions)",
    "label.home": "Hide watched (Home)",
    "label.disabled": "Disabled",
    "label.mark": "Mark as watched",
    "label.unmark": "Unmark watched"
  },
  ja: {
    "label.channel-videos": "視聴済み動画を隠す（チャンネル）",
    "label.channel-shorts": "視聴済みショートを隠す（チャンネル）",
    "label.channel-live": "視聴済みライブを隠す（チャンネル）",
    "label.subscriptions": "視聴済みを隠す（登録チャンネル）",
    "label.home": "視聴済みを隠す（ホーム）",
    "label.disabled": "無効",
    "label.mark": "視聴済みにする",
    "label.unmark": "視聴済みを解除"
  }
};

function getPageLocale(): Locale {
  const raw = document.documentElement.lang || navigator.language || "en";
  const base = raw.split("-")[0]?.toLowerCase();
  return base === "ja" ? "ja" : "en";
}

function t(key: MessageKey): string {
  return MESSAGES[getPageLocale()][key];
}

// Icons from npm "lolicon" (ichi0g0y/lolicon) — View / ViewHide glyphs, built with DOM API to bypass page-level Trusted Types.
const SVG_NS = "http://www.w3.org/2000/svg";

const VIEW_PATH =
  "M 2.06943 7.14746C 2.04023 7.08008 2.02279 7.03156 2.0125 7C 2.02279 6.96844 2.04023 6.91992 2.06943 6.85254C 2.15181 6.65991 2.2622 6.45642 2.43916 6.18579C 2.80449 5.62134 3.30807 5.00348 4.01971 4.36969C 5.46653 3.06451 7.38721 1.96802 10 2C 12.6128 1.96802 14.5335 3.06451 15.9803 4.36969C 16.6919 5.00348 17.1955 5.62134 17.5608 6.18579C 17.7378 6.45642 17.8482 6.65991 17.9306 6.85254C 17.9598 6.91992 17.9772 6.96844 17.9875 7C 17.9772 7.03156 17.9598 7.08008 17.9306 7.14746C 17.8482 7.34009 17.7378 7.54358 17.5608 7.81421C 17.1955 8.37866 16.6919 8.99652 15.9803 9.63031C 14.5335 10.9355 12.6128 12.032 10 12C 7.38721 12.032 5.46653 10.9355 4.01971 9.63031C 3.30807 8.99652 2.80449 8.37866 2.43916 7.81421C 2.2622 7.54358 2.15181 7.34009 2.06943 7.14746ZM 10 0C 6.88552 0.0319824 4.3062 1.43549 2.68483 2.88031C 1.86238 3.62152 1.18983 4.44116 0.762543 5.09546C 0.543196 5.4342 0.353159 5.7854 0.234196 6.05762C 0.120506 6.32007 0 6.66284 0 7C 0 7.33716 0.120506 7.67993 0.234196 7.94238C 0.353159 8.2146 0.543196 8.5658 0.762543 8.90454C 1.18983 9.55884 1.86238 10.3785 2.68483 11.1197C 4.3062 12.5645 6.88552 13.968 10 14C 13.1145 13.968 15.6938 12.5645 17.3152 11.1197C 18.1376 10.3785 18.8102 9.55884 19.2375 8.90454C 19.4568 8.5658 19.6468 8.2146 19.7658 7.94238C 19.8795 7.67993 20 7.33716 20 7C 20 6.66284 19.8795 6.32007 19.7658 6.05762C 19.6468 5.7854 19.4568 5.4342 19.2375 5.09546C 18.8102 4.44116 18.1376 3.62152 17.3152 2.88031C 15.6938 1.43549 13.1145 0.0319824 10 0ZM 12.5 6.5C 12.6546 6.5 12.8051 6.48248 12.9496 6.44928C 12.9827 6.62781 13 6.81189 13 7C 13 8.65686 11.6569 10 10 10C 8.34315 10 7 8.65686 7 7C 7 5.34314 8.34315 4 10 4C 10.1881 4 10.3722 4.01727 10.5507 4.05042C 10.5175 4.19495 10.5 4.3454 10.5 4.5C 10.5 5.60455 11.3954 6.5 12.5 6.5Z";

const VIEW_HIDE_PATHS = [
  "M18.0919 17.2635C18.4824 16.8729 18.4824 16.2398 18.0919 15.8492L16.2286 13.9859C16.6221 13.708 16.9846 13.416 17.3152 13.1197C18.1483 12.3729 18.7937 11.587 19.2375 10.9046C19.459 10.5639 19.6382 10.237 19.7658 9.94239C19.8795 9.67992 20 9.33716 20 9C20 8.66283 19.8795 8.32008 19.7658 8.05761C19.6382 7.76304 19.459 7.43606 19.2375 7.09543C18.7937 6.41302 18.1483 5.62706 17.3152 4.88034C15.6487 3.38668 13.1709 2 10 2C8.21732 2 6.65369 2.4383 5.33013 3.08749L2.53553 0.292892C2.14501 -0.0976305 1.51184 -0.0976305 1.12132 0.292892C0.730793 0.683417 0.730797 1.31658 1.12132 1.70711L16.6777 17.2635C17.0682 17.654 17.7014 17.654 18.0919 17.2635ZM6.84489 4.60225L8.59259 6.34995C9.01231 6.12657 9.49137 6 10 6C11.6569 6 13 7.34315 13 9C13 9.50863 12.8734 9.98769 12.65 10.4074L14.7894 12.5468C15.2257 12.2613 15.6231 11.9504 15.9803 11.6303C16.6813 11.0021 17.212 10.3505 17.5608 9.81418C17.7356 9.54544 17.8568 9.31773 17.9306 9.14745C17.9598 9.08006 17.9772 9.03153 17.9875 9C17.9772 8.96846 17.9598 8.91994 17.9306 8.85255C17.8568 8.68227 17.7356 8.45456 17.5608 8.18582C17.212 7.64948 16.6813 6.99794 15.9803 6.36966C14.5786 5.11332 12.5564 4 10 4C8.83453 4 7.78011 4.23139 6.84489 4.60225Z",
  "M2.43916 8.18582C2.62448 7.90088 2.86115 7.58342 3.14742 7.2542C3.32609 7.04873 3.32418 6.73839 3.13164 6.54585L2.42325 5.83747C2.22571 5.63992 1.90372 5.64189 1.71823 5.85078C1.33557 6.28172 1.01615 6.70548 0.762543 7.09543C0.541012 7.43606 0.36179 7.76304 0.234196 8.05761C0.120506 8.32008 0 8.66283 0 9C0 9.33716 0.120506 9.67992 0.234196 9.94239C0.36179 10.237 0.541012 10.5639 0.762543 10.9046C1.20635 11.587 1.85171 12.3729 2.68483 13.1197C4.35131 14.6133 6.82914 16 10 16C10.4956 16 10.9743 15.9661 11.4357 15.9032C11.8258 15.8501 11.9649 15.3791 11.6865 15.1007L10.7275 14.1417C10.6257 14.0399 10.485 13.9877 10.3411 13.9934C10.2285 13.9978 10.1148 14 10 14C7.44358 14 5.42142 12.8867 4.01971 11.6303C3.31874 11.0021 2.78797 10.3505 2.43916 9.81418C2.26439 9.54544 2.14318 9.31773 2.06943 9.14745C2.04023 9.08006 2.02279 9.03153 2.0125 9C2.02279 8.96847 2.04023 8.91994 2.06943 8.85255C2.14318 8.68227 2.26439 8.45456 2.43916 8.18582Z"
];

function createIconSvg(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 32 32");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("fill-rule", "evenodd");
  svg.setAttribute("clip-rule", "evenodd");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  return svg;
}

function createPath(d: string): SVGPathElement {
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  return path;
}

function createViewIcon(): SVGSVGElement {
  const svg = createIconSvg();
  const path = createPath(VIEW_PATH);
  path.setAttribute("transform", "translate(6 9)");
  svg.appendChild(path);
  return svg;
}

function createViewHideIcon(): SVGSVGElement {
  const svg = createIconSvg();
  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("transform", "translate(6 7)");
  for (const d of VIEW_HIDE_PATHS) group.appendChild(createPath(d));
  svg.appendChild(group);
  return svg;
}

let settings: Settings | null = null;
let currentUrl = location.href;
let observer: MutationObserver | null = null;
let filterTimer: number | undefined;
let syncTimer: number | undefined;
let markTimer: number | undefined;
let shelfTimer: number | undefined;

void start();

async function start(): Promise<void> {
  settings = await getSettings();
  syncPage();
  watchNavigation();
  watchDomChanges();

  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area !== "sync") return;

    void getSettings().then((nextSettings) => {
      settings = nextSettings;
      syncPage();
    });
  });
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
  upsertButton(scope);
  applyShortsSection(settings.removeShortsSection);
  applyHomeShelves(scope === "home" ? settings.hideHomeShelves : false);
  applyMarkButtons(scope);

  if (scope && settings.activeScopes[scope]) {
    scheduleFilter(scope);
  } else {
    window.clearTimeout(filterTimer);
    showHiddenCards();
  }
}

const CHANNEL_TAB_PATTERN = /^\/(?:@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)\/(videos|shorts|streams|live)(?:\/|$)/;

function detectScope(): Scope | null {
  const path = location.pathname;
  if (path === "/feed/subscriptions") return "subscriptions";
  if (path === "/" || path === "") return "home";

  const match = CHANNEL_TAB_PATTERN.exec(path);
  if (!match) return null;
  if (match[1] === "shorts") return "channel-shorts";
  if (match[1] === "streams" || match[1] === "live") return "channel-live";
  return "channel-videos";
}

function upsertButton(scope: Scope | null): void {
  const slot = document.querySelector<HTMLElement>("#buttons.ytd-masthead");
  if (!slot) return;

  const existing = document.querySelector<HTMLButtonElement>(`#${BUTTON_ID}`);
  const button = existing ?? document.createElement("button");
  const disabled = scope === null;
  const displayScope: Scope = scope ?? "channel-videos";
  const active = !disabled && Boolean(settings?.activeScopes[scope]);
  const labelText = disabled ? t("label.disabled") : labelFor(displayScope);

  button.id = BUTTON_ID;
  button.className = "notyet-toggle";
  button.type = "button";
  button.disabled = disabled;
  button.dataset.scope = displayScope;
  button.dataset.active = String(active);
  button.setAttribute("aria-label", labelText);
  button.setAttribute("aria-pressed", String(active));
  button.setAttribute("aria-disabled", String(disabled));
  button.title = labelText;

  const iconWrap = document.createElement("span");
  iconWrap.className = "notyet-icon-wrap";
  iconWrap.append(active ? createViewHideIcon() : createViewIcon());

  const label = document.createElement("span");
  label.className = "notyet-label";
  label.textContent = labelText;

  button.replaceChildren(iconWrap, label);

  if (!existing) {
    button.addEventListener("click", () => {
      void toggleCurrentTab();
    });
  }

  if (button.parentElement !== slot) {
    slot.prepend(button);
  }
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

  settings = nextSettings;
  await saveSettings(nextSettings);
  syncPage();
}

function labelFor(scope: Scope): string {
  return t(`label.${scope}`);
}

function removeButton(): void {
  document.querySelector(`#${BUTTON_ID}`)?.remove();
}

function scheduleFilter(scope: Scope): void {
  window.clearTimeout(filterTimer);
  filterTimer = window.setTimeout(() => {
    hideWatchedCards(scope);
  }, 120);
}

function hideWatchedCards(scope: Scope): void {
  const threshold = settings?.watchedThreshold ?? 0;
  for (const card of getCards(scope)) {
    if (isWatched(card, threshold)) {
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

const SHORTS_SECTION_ATTR = "data-notyet-shorts-section";

function applyShortsSection(hide: boolean): void {
  const wanted = new Set<HTMLElement>();
  if (hide) {
    // Home / channel: explicit Shorts shelves
    for (const shelf of document.querySelectorAll<HTMLElement>(
      "ytd-reel-shelf-renderer, ytd-rich-shelf-renderer[is-shorts], grid-shelf-view-model[is-shorts]"
    )) {
      wanted.add(shelf.closest<HTMLElement>("ytd-rich-section-renderer") ?? shelf);
    }
    // Search results: grid-shelf-view-model containing shorts lockups
    for (const lockup of document.querySelectorAll<HTMLElement>(
      "ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2"
    )) {
      const wrapper =
        lockup.closest<HTMLElement>("grid-shelf-view-model") ??
        lockup.closest<HTMLElement>("ytd-reel-shelf-renderer") ??
        lockup.closest<HTMLElement>("ytd-item-section-renderer");
      if (wrapper) wanted.add(wrapper);
    }
  }
  // Cleanup: remove attribute from sections no longer targeted
  for (const previous of document.querySelectorAll<HTMLElement>(
    `[${SHORTS_SECTION_ATTR}="true"]`
  )) {
    if (!wanted.has(previous)) previous.removeAttribute(SHORTS_SECTION_ATTR);
  }
  for (const section of wanted) section.setAttribute(SHORTS_SECTION_ATTR, "true");
}

const HOME_SHELF_ATTR = "data-notyet-home-shelf";

function applyHomeShelves(hide: boolean): void {
  const wanted = new Set<HTMLElement>();
  if (hide) {
    const sections = document.querySelectorAll<HTMLElement>(
      "ytd-rich-grid-renderer > #contents > ytd-rich-section-renderer"
    );
    for (const section of sections) {
      // Skip Shorts — handled by its own attribute
      if (section.hasAttribute(SHORTS_SECTION_ATTR)) continue;
      if (section.querySelector("ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer")) {
        continue;
      }
      wanted.add(section);
    }
  }
  for (const previous of document.querySelectorAll<HTMLElement>(
    `[${HOME_SHELF_ATTR}="true"]`
  )) {
    if (!wanted.has(previous)) previous.removeAttribute(HOME_SHELF_ATTR);
  }
  for (const section of wanted) section.setAttribute(HOME_SHELF_ATTR, "true");
}

function getCards(scope: Scope): HTMLElement[] {
  if (scope === "home") {
    const items = [
      ...document.querySelectorAll<HTMLElement>(
        "ytd-rich-grid-renderer > #contents > ytd-rich-item-renderer"
      )
    ];
    if (settings?.skipTopRecommendations) {
      return items.slice(settings.topRecommendationsCount);
    }
    return items;
  }

  const selectors = [
    "ytd-rich-item-renderer",
    "yt-lockup-view-model",
    "ytd-rich-grid-media",
    "ytd-grid-video-renderer",
    "ytd-video-renderer",
    "ytd-rich-grid-slim-media",
    "ytd-reel-item-renderer"
  ];

  return [...document.querySelectorAll<HTMLElement>(selectors.join(","))].map(getCardRoot).filter(unique);
}

function getCardRoot(node: HTMLElement): HTMLElement {
  return (
    node.closest<HTMLElement>(
      "ytd-rich-item-renderer,ytd-grid-video-renderer,ytd-video-renderer,ytd-reel-item-renderer,ytd-rich-grid-slim-media"
    ) ?? node
  );
}

function isWatched(card: HTMLElement, threshold: number): boolean {
  if (isManuallyWatched(card)) return true;
  if (hasWatchedAriaLabel(card)) return true;
  const ratio = progressRatio(card);
  if (ratio === null) return false;
  return ratio >= threshold;
}

function extractVideoId(card: HTMLElement): string | null {
  const anchor = card.querySelector<HTMLAnchorElement>(
    "a#thumbnail, a[href*='watch?v=']"
  );
  if (!anchor) return null;
  try {
    const url = new URL(anchor.href, location.origin);
    return url.searchParams.get("v");
  } catch {
    return null;
  }
}

function isManuallyWatched(card: HTMLElement): boolean {
  if (!settings || settings.manuallyWatchedIds.length === 0) return false;
  const id = extractVideoId(card);
  if (!id) return false;
  return settings.manuallyWatchedIds.includes(id);
}

const MARK_CARD_SELECTORS = [
  "ytd-rich-item-renderer",
  "yt-lockup-view-model",
  "ytd-grid-video-renderer",
  "ytd-video-renderer",
  "ytd-rich-grid-media",
  "ytd-rich-grid-slim-media",
  "ytd-reel-item-renderer"
];

function getMarkableCards(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(MARK_CARD_SELECTORS.join(","))]
    .map(getCardRoot)
    .filter(unique);
}

function applyMarkButtons(scope: Scope | null): void {
  if (!scope) return;
  for (const card of getMarkableCards()) {
    const id = extractVideoId(card);
    if (!id) continue;
    const container = findMenuContainer(card);
    if (!container) continue;
    const marked = settings?.manuallyWatchedIds.includes(id) ?? false;
    upsertMarkButton(container, id, marked);
  }
}

function findMenuContainer(card: HTMLElement): HTMLElement | null {
  return (
    card.querySelector<HTMLElement>(".ytLockupMetadataViewModelMenuButton") ??
    card.querySelector<HTMLElement>("ytd-menu-renderer")
  );
}

function upsertMarkButton(container: HTMLElement, videoId: string, marked: boolean): void {
  let btn = container.querySelector<HTMLButtonElement>(`button.${MARK_BTN_CLASS}`);
  if (!btn) {
    btn = document.createElement("button");
    btn.className = MARK_BTN_CLASS;
    btn.type = "button";
    btn.setAttribute(MARK_INJECTED_ATTR, "true");
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void toggleMark(btn!);
    });
    container.append(btn);
  }

  if (btn.dataset.videoId !== videoId) {
    btn.dataset.videoId = videoId;
  }
  const currentMarked = btn.dataset.marked === "true";
  const needsRender = btn.childElementCount === 0 || currentMarked !== marked;
  if (currentMarked !== marked) {
    btn.dataset.marked = String(marked);
    btn.setAttribute("aria-pressed", String(marked));
    const label = marked ? t("label.unmark") : t("label.mark");
    btn.setAttribute("aria-label", label);
    btn.title = label;
  }
  if (needsRender) {
    btn.replaceChildren(marked ? createViewHideIcon() : createViewIcon());
  }
}

async function toggleMark(btn: HTMLButtonElement): Promise<void> {
  const videoId = btn.dataset.videoId;
  if (!videoId) return;
  const marked = btn.dataset.marked === "true";
  if (marked) {
    await unmarkWatched(videoId);
  } else {
    await markWatched(videoId);
  }
  // storage.onChanged listener re-syncs UI automatically.
}

const PROGRESS_SELECTORS = [
  "ytd-thumbnail-overlay-resume-playback-renderer",
  "#progress.ytd-thumbnail-overlay-resume-playback-renderer",
  ".ytThumbnailOverlayProgressBarHostWatchedProgressBar",
  ".ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment",
  ".ytThumbnailOverlayProgressBarHostWatchedProgressBarSegmentModern"
];

function progressRatio(card: HTMLElement): number | null {
  const node = PROGRESS_SELECTORS.flatMap((s) => [...card.querySelectorAll<HTMLElement>(s)]).find(
    isVisibleProgress
  );
  if (!node) return null;

  const inlineWidth = node.style.width;
  if (inlineWidth.endsWith("%")) {
    const pct = Number.parseFloat(inlineWidth);
    if (Number.isFinite(pct)) return pct / 100;
  }

  const rect = node.getBoundingClientRect();
  if (rect.width > 0) {
    const host =
      node.closest<HTMLElement>(".ytThumbnailOverlayProgressBarHost") ?? node.parentElement;
    const hostWidth = host?.getBoundingClientRect().width ?? 0;
    if (hostWidth > 0) return Math.min(1, rect.width / hostWidth);
  }

  return 1;
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
  observer = new MutationObserver((records) => {
    if (!settings?.enabled) return;

    // Skip if all mutations are our own (avoid feedback loop)
    if (records.every(isOwnMutation)) return;

    if (!document.querySelector(`#${BUTTON_ID}`)) {
      requestSync();
    }

    // Re-apply shelf hiding regardless of scope (search/home/anywhere can grow new shelves via infinite scroll)
    scheduleShelfApply();

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

function requestSync(): void {
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(syncPage, 250);
}

function scheduleShelfApply(): void {
  window.clearTimeout(shelfTimer);
  shelfTimer = window.setTimeout(() => {
    if (!settings?.enabled) return;
    applyShortsSection(settings.removeShortsSection);
    const scope = detectScope();
    applyHomeShelves(scope === "home" ? settings.hideHomeShelves : false);
  }, 300);
}

function scheduleMarkButtons(scope: Scope): void {
  window.clearTimeout(markTimer);
  markTimer = window.setTimeout(() => applyMarkButtons(scope), 200);
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

