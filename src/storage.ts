import { LOCAL_V1_KEY, SETTINGS_KEY } from "./storage/keys";
import {
  type LocaleOverride,
  type MarkedMeta,
  type Scope,
  type Settings,
  type StoredSettings,
  ALL_LOCALE_OVERRIDES,
  ALL_SCOPES,
  DEFAULT_SETTINGS,
  normalizeSettings,
  normalizeStoredSettings,
  pickStringArray
} from "./storage/normalize";
import {
  countShards,
  evictOverflowShards,
  markedPayload,
  packAll,
  readMeta,
  readShards,
  removeIdFromShard,
  removeStaleShards,
  reshapeOversizedShards,
  shardContainsId,
  shardIdCount,
  shardIds,
  tryAppendToShard,
  writeMarkedShards,
  writeTailAppend
} from "./storage/shards";

export type { LocaleOverride, Scope, Settings };
export { ALL_LOCALE_OVERRIDES, ALL_SCOPES };
export { MAX_ID_LENGTH, MAX_SHARD_COUNT, SHARD_BYTE_BUDGET } from "./storage/keys";
export const STORAGE_SYNC_KEY = SETTINGS_KEY;

let writeChain: Promise<unknown> = Promise.resolve();

function serializeWrite<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.then(fn, fn);
  writeChain = next.catch(() => {});
  return next;
}

async function writeV2(settings: Settings, previousShardCount: number): Promise<void> {
  const normalized = normalizeSettings(settings);
  const storedSettings = normalizeStoredSettings(normalized);
  const shards = evictOverflowShards(packAll(normalized.manuallyWatchedIds));
  const payload: Record<string, MarkedMeta | StoredSettings | string> = {
    [SETTINGS_KEY]: storedSettings,
    ...markedPayload(shards)
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
      const v2Ids = (await readShards(meta.shardCount)).flatMap(shardIds);
      const seen = new Set(v2Ids);
      const v1Ids = normalizeSettings(localStored[LOCAL_V1_KEY]).manuallyWatchedIds;
      const merged = v2Ids.concat(v1Ids.filter((id) => !seen.has(id) && !!seen.add(id)));
      // Keep synced v2 settings; merge local marks for multi-device rollout safety.
      // packAll repacks any legacy JSON-array shards into the current byte-budget layout.
      await writeMarkedShards(evictOverflowShards(packAll(merged)), meta.shardCount);
      await chrome.storage.local.remove(LOCAL_V1_KEY);
      return;
    }
    await reshapeOversizedShards(meta);
    return;
  }
  const initial = hasLocalV1 ? normalizeSettings(localStored[LOCAL_V1_KEY]) : DEFAULT_SETTINGS;
  await writeV2(initial, 0);
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
  return {
    ...normalizeStoredSettings(settingsStored[SETTINGS_KEY]),
    manuallyWatchedIds: shards.flatMap(shardIds)
  };
}

async function saveSettingsInternal(settings: Settings): Promise<void> {
  const meta = await readMeta();
  await writeV2(settings, meta?.shardCount ?? 0);
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
    const meta = (await readMeta()) ?? { count: 0, shardCount: 0 };
    const shards = await readShards(meta.shardCount);
    if (shards.some((s) => shardContainsId(s, videoId))) return;

    const lastIndex = shards.length - 1;
    const tail = lastIndex >= 0 ? shards[lastIndex] ?? "" : "";
    const appended = tryAppendToShard(tail, videoId);
    if (appended !== undefined && lastIndex >= 0) {
      shards[lastIndex] = appended;
    } else {
      const fresh = tryAppendToShard("", videoId);
      if (fresh === undefined) return;
      shards.push(fresh);
    }

    const evicted = evictOverflowShards(shards);
    if (evicted.length !== shards.length) {
      await writeMarkedShards(evicted, meta.shardCount);
      return;
    }

    const tailIndex = shards.length - 1;
    const tailShard = shards[tailIndex];
    if (tailShard === undefined) return;
    await writeTailAppend(
      tailIndex,
      tailShard,
      { count: countShards(shards), shardCount: shards.length },
      meta.shardCount
    );
  });
}

export async function unmarkWatched(videoId: string): Promise<void> {
  await serializeWrite(async () => {
    await ensureV2Initialized();
    const meta = (await readMeta()) ?? { count: 0, shardCount: 0 };
    const shards = await readShards(meta.shardCount);
    let removed = false;
    const next = shards.flatMap((shard) => {
      const stripped = removeIdFromShard(shard, videoId);
      if (stripped !== shard) removed = true;
      return shardIdCount(stripped) > 0 ? [stripped] : [];
    });
    if (removed) await writeMarkedShards(next, meta.shardCount);
  });
}

export async function getSyncStorageUsage(): Promise<{
  count: number;
  bytesInUse: number;
  bytesQuota: number;
}> {
  await ensureV2();
  const meta = (await readMeta()) ?? { count: 0, shardCount: 0 };
  const bytesInUse = await chrome.storage.sync.getBytesInUse(null);
  return {
    count: meta.count,
    bytesInUse,
    bytesQuota: chrome.storage.sync.QUOTA_BYTES ?? 102_400
  };
}

export async function clearMarked(): Promise<void> {
  await serializeWrite(async () => {
    await ensureV2Initialized();
    const meta = await readMeta();
    await writeMarkedShards([], meta?.shardCount ?? 0);
  });
}

export async function ensureDefaults(): Promise<void> {
  await ensureV2();
}
