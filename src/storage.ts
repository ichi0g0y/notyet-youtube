export type Scope = "channel-videos" | "channel-shorts" | "channel-live" | "subscriptions" | "home" | "search";

export const ALL_SCOPES: readonly Scope[] = ["channel-videos", "channel-shorts", "channel-live", "subscriptions", "home", "search"];

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

type StoredSettings = Omit<Settings, "manuallyWatchedIds">;
type MarkedMeta = { count: number; shardCount: number; cap: number };
type LegacyTabs = { videos?: boolean; shorts?: boolean; live?: boolean };

export const SHARD_SIZE = 500;
export const DEFAULT_CAP = 5000;

const LOCAL_V1_KEY = "fadee_state_v1";
const SETTINGS_KEY = "fadee_settings_v2";
const MARKED_META_KEY = "fadee_marked_meta_v2";
const MARKED_SHARD_PREFIX = "fadee_marked_v2_";

let writeChain: Promise<unknown> = Promise.resolve();

function serializeWrite<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.then(fn, fn);
  writeChain = next.catch(() => {});
  return next;
}

const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  activeScopes: { "channel-videos": false, "channel-shorts": false, "channel-live": false, subscriptions: false, home: false, search: false },
  removeShortsSection: false,
  hideHomeShelves: false,
  skipTopRecommendations: false,
  topRecommendationsCount: 12,
  watchedThreshold: 0,
  manuallyWatchedIds: []
};

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
    if (typeof item === "string" && item.length > 0 && item.length < 64) out.push(item);
  }
  return out;
}

function normalizeCap(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : DEFAULT_CAP;
}

function normalizeSettings(raw: unknown): Settings {
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
    manuallyWatchedIds: pickStringArray(v.manuallyWatchedIds)
  };
}

function normalizeStoredSettings(raw: unknown): StoredSettings {
  const { manuallyWatchedIds: _marked, ...stored } = normalizeSettings(raw);
  void _marked;
  return stored;
}

function normalizeMeta(raw: unknown): MarkedMeta {
  const v = (raw ?? {}) as Record<string, unknown>;
  return {
    count: Math.max(0, Math.floor(pickNumber(v.count, 0))),
    shardCount: Math.max(0, Math.floor(pickNumber(v.shardCount, 0))),
    cap: normalizeCap(v.cap)
  };
}

function shardKey(index: number): string {
  return `${MARKED_SHARD_PREFIX}${index}`;
}

function shardKeys(count: number): string[] {
  return Array.from({ length: count }, (_value, index) => shardKey(index));
}

function toShards(ids: string[]): string[][] {
  const shards: string[][] = [];
  for (let index = 0; index < ids.length; index += SHARD_SIZE) {
    shards.push(ids.slice(index, index + SHARD_SIZE));
  }
  return shards;
}

function countShards(shards: string[][]): number {
  return shards.reduce((sum, shard) => sum + shard.length, 0);
}

function evictOverflowShards(shards: string[][], cap: number): string[][] {
  const next = shards.filter((shard) => shard.length > 0);
  let count = countShards(next);
  while (count > cap && next.length > 0) {
    count -= next[0]?.length ?? 0;
    next.shift();
  }
  return next;
}

function markedPayload(shards: string[][], cap: number): Record<string, MarkedMeta | string[]> {
  const payload: Record<string, MarkedMeta | string[]> = {
    [MARKED_META_KEY]: { count: countShards(shards), shardCount: shards.length, cap }
  };
  for (let index = 0; index < shards.length; index += 1) {
    payload[shardKey(index)] = shards[index] ?? [];
  }
  return payload;
}

async function removeStaleShards(previousShardCount: number, nextShardCount: number): Promise<void> {
  if (previousShardCount > nextShardCount) {
    await chrome.storage.sync.remove(shardKeys(previousShardCount).slice(nextShardCount));
  }
}

async function readMeta(): Promise<MarkedMeta | undefined> {
  const stored = await chrome.storage.sync.get(MARKED_META_KEY);
  if (stored[MARKED_META_KEY] === undefined) return undefined;
  return normalizeMeta(stored[MARKED_META_KEY]);
}

async function readShards(shardCount: number): Promise<string[][]> {
  if (shardCount <= 0) return [];

  const keys = shardKeys(shardCount);
  const stored = await chrome.storage.sync.get(keys);
  return keys.map((key) => pickStringArray(stored[key]).slice(0, SHARD_SIZE));
}

async function writeMarkedShards(shards: string[][], cap: number, previousShardCount: number): Promise<void> {
  await chrome.storage.sync.set(markedPayload(shards, cap));
  await removeStaleShards(previousShardCount, shards.length);
}

async function writeV2(settings: Settings, cap: number, previousShardCount: number): Promise<void> {
  const normalized = normalizeSettings(settings);
  const storedSettings = normalizeStoredSettings(normalized);
  const shards = evictOverflowShards(toShards(normalized.manuallyWatchedIds), cap);
  const payload: Record<string, MarkedMeta | StoredSettings | string[]> = {
    [SETTINGS_KEY]: storedSettings,
    ...markedPayload(shards, cap)
  };

  await chrome.storage.sync.set(payload);
  await removeStaleShards(previousShardCount, shards.length);
}

async function ensureV2Initialized(): Promise<void> {
  const localStored = await chrome.storage.local.get(LOCAL_V1_KEY);
  const hasLocalV1 = localStored[LOCAL_V1_KEY] !== undefined;
  const meta = await readMeta();
  if (meta !== undefined) {
    if (hasLocalV1) {
      const v2Ids = (await readShards(meta.shardCount)).flat();
      const seen = new Set(v2Ids);
      const v1Ids = normalizeSettings(localStored[LOCAL_V1_KEY]).manuallyWatchedIds;
      const merged = v2Ids.concat(v1Ids.filter((id) => !seen.has(id) && !!seen.add(id)));
      // Keep synced v2 settings; merge local marks for multi-device rollout safety.
      await writeMarkedShards(evictOverflowShards(toShards(merged), meta.cap), meta.cap, meta.shardCount);
      await chrome.storage.local.remove(LOCAL_V1_KEY);
    }
    return;
  }
  const initial = hasLocalV1 ? normalizeSettings(localStored[LOCAL_V1_KEY]) : DEFAULT_SETTINGS;
  await writeV2(initial, DEFAULT_CAP, 0);
  if (hasLocalV1) {
    await chrome.storage.local.remove(LOCAL_V1_KEY);
  }
}

async function ensureV2(): Promise<void> {
  await serializeWrite(ensureV2Initialized);
}

async function readSettingsInternal(): Promise<Settings> {
  const [settingsStored, meta] = await Promise.all([chrome.storage.sync.get(SETTINGS_KEY), readMeta()]);
  const shards = await readShards(meta?.shardCount ?? 0);
  return { ...normalizeStoredSettings(settingsStored[SETTINGS_KEY]), manuallyWatchedIds: shards.flat() };
}

async function saveSettingsInternal(settings: Settings): Promise<void> {
  const meta = await readMeta();
  await writeV2(settings, meta?.cap ?? DEFAULT_CAP, meta?.shardCount ?? 0);
}

export async function getSettings(): Promise<Settings> {
  await ensureV2();
  return readSettingsInternal();
}

export async function saveSettings(settings: Settings): Promise<void> {
  await serializeWrite(async () => {
    await ensureV2Initialized();
    await saveSettingsInternal(settings);
  });
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await serializeWrite(async () => {
    await ensureV2Initialized();
    await saveSettingsInternal({ ...(await readSettingsInternal()), enabled });
  });
}

export async function markWatched(videoId: string): Promise<void> {
  if (pickStringArray([videoId]).length === 0) return;

  await serializeWrite(async () => {
    await ensureV2Initialized();
    const meta = (await readMeta()) ?? { count: 0, shardCount: 0, cap: DEFAULT_CAP };
    const shards = await readShards(meta.shardCount);
    if (shards.some((shard) => shard.includes(videoId))) return;

    const tail = shards[shards.length - 1];
    if (tail === undefined || tail.length >= SHARD_SIZE) {
      shards.push([videoId]);
    } else {
      tail.push(videoId);
    }

    const evicted = evictOverflowShards(shards, meta.cap);
    await writeMarkedShards(evicted, meta.cap, meta.shardCount);
  });
}

export async function unmarkWatched(videoId: string): Promise<void> {
  await serializeWrite(async () => {
    await ensureV2Initialized();
    const meta = (await readMeta()) ?? { count: 0, shardCount: 0, cap: DEFAULT_CAP };
    const shards = await readShards(meta.shardCount);
    let removed = false;
    const next = shards.flatMap((shard) => {
      const filtered = shard.filter((id) => id !== videoId);
      removed ||= filtered.length !== shard.length;
      return filtered.length > 0 ? [filtered] : [];
    });

    if (removed) await writeMarkedShards(next, meta.cap, meta.shardCount);
  });
}

export async function getMarkedCount(): Promise<{ count: number; cap: number }> {
  await ensureV2();
  const meta = (await readMeta()) ?? { count: 0, shardCount: 0, cap: DEFAULT_CAP };
  return { count: meta.count, cap: meta.cap };
}

export async function ensureDefaults(): Promise<void> {
  await ensureV2();
}

export const STORAGE_SYNC_KEY = SETTINGS_KEY;
