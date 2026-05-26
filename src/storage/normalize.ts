import { MAX_ID_LENGTH, SHARD_DELIM } from "./keys";

export type Scope = "channel-videos" | "channel-shorts" | "channel-live" | "subscriptions" | "home" | "search";

export const ALL_SCOPES: readonly Scope[] = ["channel-videos", "channel-shorts", "channel-live", "subscriptions", "home", "search"];

export type LocaleOverride = "auto" | "en" | "ja";

export const ALL_LOCALE_OVERRIDES: readonly LocaleOverride[] = ["auto", "en", "ja"];

export type Settings = {
  enabled: boolean;
  activeScopes: Record<Scope, boolean>;
  removeShortsSection: boolean;
  hideHomeShelves: boolean;
  skipTopRecommendations: boolean;
  topRecommendationsCount: number;
  watchedThreshold: number;
  localeOverride: LocaleOverride;
  manuallyWatchedIds: string[];
};

export type StoredSettings = Omit<Settings, "manuallyWatchedIds">;
export type MarkedMeta = { count: number; shardCount: number };

type LegacyTabs = { videos?: boolean; shorts?: boolean; live?: boolean };

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  activeScopes: { "channel-videos": false, "channel-shorts": false, "channel-live": false, subscriptions: false, home: false, search: false },
  removeShortsSection: false,
  hideHomeShelves: false,
  skipTopRecommendations: false,
  topRecommendationsCount: 12,
  watchedThreshold: 0,
  localeOverride: "auto",
  manuallyWatchedIds: []
};

function pickLocaleOverride(value: unknown, fallback: LocaleOverride): LocaleOverride {
  return value === "auto" || value === "en" || value === "ja" ? value : fallback;
}

function pickBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function pickNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function pickStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (
      typeof item === "string" &&
      item.length > 0 &&
      item.length <= MAX_ID_LENGTH &&
      !item.includes(SHARD_DELIM)
    ) {
      out.push(item);
    }
  }
  return out;
}

export function normalizeSettings(raw: unknown): Settings {
  const v = (raw ?? {}) as Record<string, unknown>;
  const legacy = v.activeTabs as LegacyTabs | undefined;
  const scopes = v.activeScopes as Partial<Record<Scope, boolean>> | undefined;

  return {
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
    localeOverride: pickLocaleOverride(v.localeOverride, DEFAULT_SETTINGS.localeOverride),
    manuallyWatchedIds: pickStringArray(v.manuallyWatchedIds)
  };
}

export function normalizeStoredSettings(raw: unknown): StoredSettings {
  const { manuallyWatchedIds: _marked, ...stored } = normalizeSettings(raw);
  void _marked;
  return stored;
}

export function normalizeMeta(raw: unknown): MarkedMeta {
  const v = (raw ?? {}) as Record<string, unknown>;
  return {
    count: Math.max(0, Math.floor(pickNumber(v.count, 0))),
    shardCount: Math.max(0, Math.floor(pickNumber(v.shardCount, 0)))
  };
}
