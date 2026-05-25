import { markWatched, unmarkWatched, type Scope, type Settings } from "../storage";
import { extractVideoId, getCardRoot, unique } from "./cards";
import { createViewHideIcon, createViewIcon } from "./icons";
import { t } from "./i18n";

export const MARK_BTN_CLASS = "fadee-mark-btn";
const MARK_INJECTED_ATTR = "data-fadee-mark";

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

export function applyMarkButtons(scope: Scope | null, settings: Settings): void {
  if (!scope) return;
  for (const card of getMarkableCards()) {
    const id = extractVideoId(card);
    if (!id) continue;
    const container = findMenuContainer(card);
    if (!container) continue;
    const marked = settings.manuallyWatchedIds.includes(id);
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
