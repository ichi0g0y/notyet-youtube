export type Scope =
  | "channel-videos"
  | "channel-shorts"
  | "channel-live"
  | "subscriptions"
  | "home";

export const ALL_SCOPES: readonly Scope[] = [
  "channel-videos",
  "channel-shorts",
  "channel-live",
  "subscriptions",
  "home"
];

export type Settings = {
  enabled: boolean;
  activeScopes: Record<Scope, boolean>;
  removeShortsSection: boolean;
  skipTopRecommendations: boolean;
  topRecommendationsCount: number;
  watchedThreshold: number;
};

const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  activeScopes: {
    "channel-videos": false,
    "channel-shorts": false,
    "channel-live": false,
    subscriptions: false,
    home: false
  },
  removeShortsSection: false,
  skipTopRecommendations: false,
  topRecommendationsCount: 12,
  watchedThreshold: 0
};

type LegacyTabs = { videos?: boolean; shorts?: boolean; live?: boolean };

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get([
    "enabled",
    "activeScopes",
    "activeTabs",
    "removeShortsSection",
    "skipTopRecommendations",
    "topRecommendationsCount",
    "watchedThreshold"
  ]);
  const legacy = stored.activeTabs as LegacyTabs | undefined;
  const next = stored.activeScopes as Partial<Record<Scope, boolean>> | undefined;

  return {
    enabled: stored.enabled ?? DEFAULT_SETTINGS.enabled,
    activeScopes: {
      "channel-videos": next?.["channel-videos"] ?? legacy?.videos ?? false,
      "channel-shorts": next?.["channel-shorts"] ?? legacy?.shorts ?? false,
      "channel-live": next?.["channel-live"] ?? legacy?.live ?? false,
      subscriptions: next?.subscriptions ?? false,
      home: next?.home ?? false
    },
    removeShortsSection: stored.removeShortsSection ?? DEFAULT_SETTINGS.removeShortsSection,
    skipTopRecommendations: stored.skipTopRecommendations ?? DEFAULT_SETTINGS.skipTopRecommendations,
    topRecommendationsCount: stored.topRecommendationsCount ?? DEFAULT_SETTINGS.topRecommendationsCount,
    watchedThreshold: stored.watchedThreshold ?? DEFAULT_SETTINGS.watchedThreshold
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({
    enabled: settings.enabled,
    activeScopes: settings.activeScopes,
    removeShortsSection: settings.removeShortsSection,
    skipTopRecommendations: settings.skipTopRecommendations,
    topRecommendationsCount: settings.topRecommendationsCount,
    watchedThreshold: settings.watchedThreshold
  });
  await chrome.storage.local.remove("activeTabs");
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ enabled });
}

export async function ensureDefaults(): Promise<void> {
  const stored = await chrome.storage.local.get(["enabled", "activeScopes", "activeTabs"]);

  if (
    stored.enabled === undefined ||
    (stored.activeScopes === undefined && stored.activeTabs === undefined)
  ) {
    await chrome.storage.local.set(DEFAULT_SETTINGS);
  }
}
