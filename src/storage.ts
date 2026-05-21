export type Scope =
  | "channel-videos"
  | "channel-shorts"
  | "channel-live"
  | "subscriptions"
  | "home";

export type Settings = {
  enabled: boolean;
  activeScopes: Record<Scope, boolean>;
};

const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  activeScopes: {
    "channel-videos": false,
    "channel-shorts": false,
    "channel-live": false,
    subscriptions: false,
    home: false
  }
};

type LegacyTabs = { videos?: boolean; shorts?: boolean; live?: boolean };

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(["enabled", "activeScopes", "activeTabs"]);
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
    }
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({
    enabled: settings.enabled,
    activeScopes: settings.activeScopes
  });
  await chrome.storage.local.remove("activeTabs");
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ enabled });
}

export async function ensureDefaults(): Promise<void> {
  const stored = await chrome.storage.local.get(["enabled", "activeScopes", "activeTabs"]);

  if (stored.enabled === undefined || (stored.activeScopes === undefined && stored.activeTabs === undefined)) {
    await chrome.storage.local.set(DEFAULT_SETTINGS);
  }
}
