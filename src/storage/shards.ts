import { MARKED_META_KEY, MARKED_SHARD_PREFIX, MAX_ID_LENGTH, MAX_SHARD_COUNT, SHARD_BYTE_BUDGET, SHARD_DELIM } from "./keys";
import { type MarkedMeta, normalizeMeta } from "./normalize";

export function shardKey(index: number): string {
  return `${MARKED_SHARD_PREFIX}${index}`;
}

function shardKeys(count: number): string[] {
  return Array.from({ length: count }, (_value, index) => shardKey(index));
}

function isValidId(id: string): boolean {
  return id.length > 0 && id.length <= MAX_ID_LENGTH && !id.includes(SHARD_DELIM);
}

function packIds(ids: string[]): string {
  if (ids.length === 0) return "";
  return SHARD_DELIM + ids.join(SHARD_DELIM) + SHARD_DELIM;
}

export function shardIds(packed: string): string[] {
  if (!packed) return [];
  return packed.split(SHARD_DELIM).filter(isValidId);
}

export function shardIdCount(packed: string): number {
  return shardIds(packed).length;
}

// Returns the packed shard with id appended, or undefined if the new size would
// exceed the per-item byte budget (caller should start a fresh shard).
export function tryAppendToShard(packed: string, id: string): string | undefined {
  const next = packed === "" ? SHARD_DELIM + id + SHARD_DELIM : packed + id + SHARD_DELIM;
  if (next.length > SHARD_BYTE_BUDGET) return undefined;
  return next;
}

export function shardContainsId(packed: string, id: string): boolean {
  return packed.includes(SHARD_DELIM + id + SHARD_DELIM);
}

// Returns the packed shard with id removed (no-op when id is absent).
export function removeIdFromShard(packed: string, id: string): string {
  return packed.replace(SHARD_DELIM + id + SHARD_DELIM, SHARD_DELIM);
}

// Bucket a flat ID list into packed shards that each fit within SHARD_BYTE_BUDGET.
export function packAll(ids: string[]): string[] {
  const shards: string[] = [];
  let current = "";
  for (const id of ids) {
    if (!isValidId(id)) continue;
    const appended = tryAppendToShard(current, id);
    if (appended !== undefined) {
      current = appended;
      continue;
    }
    if (current !== "") shards.push(current);
    const fresh = tryAppendToShard("", id);
    // A single MAX_ID_LENGTH=24 ID fits in 26 bytes vs ~6941 budget; guard anyway.
    if (fresh === undefined) continue;
    current = fresh;
  }
  if (current !== "") shards.push(current);
  return shards;
}

export function countShards(shards: string[]): number {
  return shards.reduce((sum, s) => sum + shardIdCount(s), 0);
}

// FIFO-evict empty shards and any oldest shards that would push the total
// shard count past the storage-byte ceiling (MAX_SHARD_COUNT).
export function evictOverflowShards(shards: string[]): string[] {
  const next = shards.filter((s) => s !== "");
  while (next.length > MAX_SHARD_COUNT) {
    next.shift();
  }
  return next;
}

export function markedPayload(shards: string[]): Record<string, MarkedMeta | string> {
  const payload: Record<string, MarkedMeta | string> = {
    [MARKED_META_KEY]: { count: countShards(shards), shardCount: shards.length }
  };
  for (let index = 0; index < shards.length; index += 1) {
    payload[shardKey(index)] = shards[index] ?? "";
  }
  return payload;
}

export async function removeStaleShards(previousShardCount: number, nextShardCount: number): Promise<void> {
  if (previousShardCount > nextShardCount) {
    await chrome.storage.sync.remove(shardKeys(previousShardCount).slice(nextShardCount));
  }
}

export async function readMeta(): Promise<MarkedMeta | undefined> {
  const stored = await chrome.storage.sync.get(MARKED_META_KEY);
  if (stored[MARKED_META_KEY] === undefined) return undefined;
  return normalizeMeta(stored[MARKED_META_KEY]);
}

// Tolerates both the current packed-string format and the legacy JSON-array format
// (written by older builds). Always returns a packed-string shard.
function readStoredShard(value: unknown): string {
  if (typeof value === "string") {
    return packIds(value.split(SHARD_DELIM).filter(isValidId));
  }
  if (Array.isArray(value)) {
    const ids: string[] = [];
    for (const item of value) {
      if (typeof item === "string" && isValidId(item)) ids.push(item);
    }
    return packIds(ids);
  }
  return "";
}

export async function readShards(shardCount: number): Promise<string[]> {
  if (shardCount <= 0) return [];
  const keys = shardKeys(shardCount);
  const stored = await chrome.storage.sync.get(keys);
  // Returned strings may exceed SHARD_BYTE_BUDGET when reading legacy oversized
  // arrays; reshapeOversizedShards rewrites them on the next ensureV2Initialized.
  return keys.map((key) => readStoredShard(stored[key]));
}

export async function writeMarkedShards(shards: string[], previousShardCount: number): Promise<void> {
  await chrome.storage.sync.set(markedPayload(shards));
  await removeStaleShards(previousShardCount, shards.length);
}

// Differential path for the common markWatched case: only the tail shard and meta change,
// so re-setting the full layout would propagate every shard across sync needlessly.
export async function writeTailAppend(
  tailIndex: number,
  tailShard: string,
  meta: MarkedMeta,
  previousShardCount: number
): Promise<void> {
  await chrome.storage.sync.set({
    [MARKED_META_KEY]: meta,
    [shardKey(tailIndex)]: tailShard
  });
  await removeStaleShards(previousShardCount, meta.shardCount);
}

// Repack any over-budget shards (e.g. legacy 500-entry JSON arrays converted to
// a single oversized packed string by readStoredShard) into the byte-budget layout.
export async function reshapeOversizedShards(meta: MarkedMeta): Promise<void> {
  const shards = await readShards(meta.shardCount);
  if (shards.every((s) => s.length <= SHARD_BYTE_BUDGET)) return;
  const allIds = shards.flatMap(shardIds);
  const repacked = evictOverflowShards(packAll(allIds));
  await writeMarkedShards(repacked, meta.shardCount);
}
