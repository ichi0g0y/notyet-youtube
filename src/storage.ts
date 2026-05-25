export type Scope =
  | "channel-videos"
  | "channel-shorts"
  | "channel-live"
  | "subscriptions"
  | "home"
  | "search";

export const ALL_SCOPES: readonly Scope[] = [
  "channel-videos",
  "channel-shorts",
  "channel-live",
  "subscriptions",
  "home",
  "search"
];

export type Settings = {
  enabled: boolean;
  activeScopes: Record<Scope, boolean>;
  removeShortsSection: boolean;
  hideHomeShelves: boolean;
  skipTopRecommendations: boolean;
  topRecommendationsCount: number;
  watchedThreshold: number;
  manuallyWatchedIds: string[];
};

type FadeeStateV1 = Settings & { version: 1 };

const SYNC_KEY = "fadee_state_v1";
const LEGACY_SYNC_KEY = "notyet_state_v1";
const MAX_MARKED_IDS = 50000;

const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  activeScopes: {
    "channel-videos": false,
    "channel-shorts": false,
    "channel-live": false,
    subscriptions: false,
    home: false,
    search: false
  },
  removeShortsSection: false,
  hideHomeShelves: false,
  skipTopRecommendations: false,
  topRecommendationsCount: 12,
  watchedThreshold: 0,
  manuallyWatchedIds: []
};

type LegacyTabs = { videos?: boolean; shorts?: boolean; live?: boolean };

function pickBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function pickNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function pickStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.length > 0 && item.length < 64) {
      out.push(item);
    }
  }
  return out;
}

function normalize(raw: unknown): FadeeStateV1 {
  const v = (raw ?? {}) as Record<string, unknown>;
  const legacy = v.activeTabs as LegacyTabs | undefined;
  const scopes = v.activeScopes as Partial<Record<Scope, boolean>> | undefined;
  return {
    version: 1,
    enabled: pickBool(v.enabled, DEFAULT_SETTINGS.enabled),
    activeScopes: {
      "channel-videos": pickBool(scopes?.["channel-videos"], legacy?.videos ?? false),
      "channel-shorts": pickBool(scopes?.["channel-shorts"], legacy?.shorts ?? false),
      "channel-live": pickBool(scopes?.["channel-live"], legacy?.live ?? false),
      subscriptions: pickBool(scopes?.subscriptions, false),
      home: pickBool(scopes?.home, false),
      search: pickBool(scopes?.search, false)
    },
    removeShortsSection: pickBool(v.removeShortsSection, DEFAULT_SETTINGS.removeShortsSection),
    hideHomeShelves: pickBool(v.hideHomeShelves, DEFAULT_SETTINGS.hideHomeShelves),
    skipTopRecommendations: pickBool(
      v.skipTopRecommendations,
      DEFAULT_SETTINGS.skipTopRecommendations
    ),
    topRecommendationsCount: pickNumber(
      v.topRecommendationsCount,
      DEFAULT_SETTINGS.topRecommendationsCount
    ),
    watchedThreshold: pickNumber(v.watchedThreshold, DEFAULT_SETTINGS.watchedThreshold),
    manuallyWatchedIds: pickStringArray(v.manuallyWatchedIds).slice(-MAX_MARKED_IDS)
  };
}

function stripVersion(state: FadeeStateV1): Settings {
  const { version: _v, ...rest } = state;
  void _v;
  return rest;
}

async function readLocalState(): Promise<FadeeStateV1 | undefined> {
  const localStored = await chrome.storage.local.get(SYNC_KEY);
  if (localStored[SYNC_KEY] === undefined) return undefined;
  return normalize(localStored[SYNC_KEY]);
}

// Sync-side data is intentionally left in place after migrating to local:
// chrome.storage.sync.remove() propagates across the user's signed-in Chromes,
// which would wipe the source before other devices have a chance to migrate.
// The orphaned sync entry is harmless (≤100KB quota, never read again on
// already-migrated devices) and serves as the migration source for any later
// device that updates to this version.

export async function getSettings(): Promise<Settings> {
  const localState = await readLocalState();
  if (localState !== undefined) return stripVersion(localState);

  const synced = await chrome.storage.sync.get(SYNC_KEY);
  if (synced[SYNC_KEY] !== undefined) {
    const migrated = normalize(synced[SYNC_KEY]);
    const newerLocalState = await readLocalState();
    if (newerLocalState !== undefined) return stripVersion(newerLocalState);
    await chrome.storage.local.set({ [SYNC_KEY]: migrated });
    return stripVersion(migrated);
  }

  const legacySynced = await chrome.storage.sync.get(LEGACY_SYNC_KEY);
  if (legacySynced[LEGACY_SYNC_KEY] !== undefined) {
    const migrated = normalize(legacySynced[LEGACY_SYNC_KEY]);
    const newerLocalState = await readLocalState();
    if (newerLocalState !== undefined) return stripVersion(newerLocalState);
    await chrome.storage.local.set({ [SYNC_KEY]: migrated });
    return stripVersion(migrated);
  }

  const legacyKeys = [
    "enabled",
    "activeScopes",
    "activeTabs",
    "removeShortsSection",
    "hideHomeShelves",
    "skipTopRecommendations",
    "topRecommendationsCount",
    "watchedThreshold",
    "manuallyWatchedIds"
  ];
  const legacy = await chrome.storage.local.get(legacyKeys);
  const hasLegacy = legacyKeys.some((key) => legacy[key] !== undefined);

  const migrated = normalize(hasLegacy ? legacy : DEFAULT_SETTINGS);
  const newerLocalState = await readLocalState();
  if (newerLocalState !== undefined) return stripVersion(newerLocalState);
  await chrome.storage.local.set({ [SYNC_KEY]: migrated });
  if (hasLegacy) {
    await chrome.storage.local.remove(legacyKeys);
  }
  return stripVersion(migrated);
}

export async function saveSettings(settings: Settings): Promise<void> {
  const next: FadeeStateV1 = {
    version: 1,
    ...settings,
    manuallyWatchedIds: settings.manuallyWatchedIds.slice(-MAX_MARKED_IDS)
  };
  await chrome.storage.local.set({ [SYNC_KEY]: next });
}

export async function setEnabled(enabled: boolean): Promise<void> {
  const current = await getSettings();
  await saveSettings({ ...current, enabled });
}

export async function markWatched(videoId: string): Promise<void> {
  const s = await getSettings();
  if (s.manuallyWatchedIds.includes(videoId)) return;
  await saveSettings({
    ...s,
    manuallyWatchedIds: [...s.manuallyWatchedIds, videoId]
  });
}

export async function unmarkWatched(videoId: string): Promise<void> {
  const s = await getSettings();
  if (!s.manuallyWatchedIds.includes(videoId)) return;
  await saveSettings({
    ...s,
    manuallyWatchedIds: s.manuallyWatchedIds.filter((id) => id !== videoId)
  });
}

export async function ensureDefaults(): Promise<void> {
  await getSettings(); // triggers migration / initial set
}

export const STORAGE_SYNC_KEY = SYNC_KEY;
