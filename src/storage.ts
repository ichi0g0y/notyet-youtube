export type ChannelTab = "videos" | "shorts" | "live";

export type Settings = {
  enabled: boolean;
  activeTabs: Record<ChannelTab, boolean>;
};

const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  activeTabs: {
    videos: false,
    shorts: false,
    live: false
  }
};

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);

  return {
    enabled: stored.enabled ?? DEFAULT_SETTINGS.enabled,
    activeTabs: {
      videos: stored.activeTabs?.videos ?? DEFAULT_SETTINGS.activeTabs.videos,
      shorts: stored.activeTabs?.shorts ?? DEFAULT_SETTINGS.activeTabs.shorts,
      live: stored.activeTabs?.live ?? DEFAULT_SETTINGS.activeTabs.live
    }
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set(settings);
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ enabled });
}

export async function ensureDefaults(): Promise<void> {
  const stored = await chrome.storage.local.get(["enabled", "activeTabs"]);

  if (stored.enabled === undefined || stored.activeTabs === undefined) {
    await chrome.storage.local.set(DEFAULT_SETTINGS);
  }
}
