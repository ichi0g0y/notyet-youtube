// YouTube video IDs are 11 chars today; reserve headroom for Shorts / Live
// schemes that may extend the format. IDs over this length, or containing
// SHARD_DELIM, are dropped so the packed shard format stays parseable and
// no single shard can overrun QUOTA_BYTES_PER_ITEM.
export const MAX_ID_LENGTH = 24;

// Packed shard format: ",ID1,ID2,...,IDN," with leading + trailing delim so
// shardContainsId can match ",ID," without false-positive prefix collisions.
// Comma is outside the YouTube base64url alphabet (A-Z a-z 0-9 _ -).
export const SHARD_DELIM = ",";

const QUOTA_BYTES_PER_ITEM = 8192;
const SHARD_KEY_BYTES_RESERVED = 24;
const SHARD_JSON_QUOTE_BYTES = 2;
const SHARD_BYTE_SAFETY_FRACTION = 0.85;
// Maximum byte length of a packed shard string (chrome.storage measures
// JSON.stringify(value).length + key.length per item; a string value adds
// 2 bytes for the wrapping quotes).
export const SHARD_BYTE_BUDGET = Math.floor(
  (QUOTA_BYTES_PER_ITEM - SHARD_KEY_BYTES_RESERVED - SHARD_JSON_QUOTE_BYTES) * SHARD_BYTE_SAFETY_FRACTION
);

// chrome.storage.sync.QUOTA_BYTES = 102_400. Reserve space for the settings
// + meta items, apply a safety margin, then derive how many shards we can
// keep before FIFO eviction kicks in. Holding fewer items per shard (longer
// IDs) naturally caps the effective ID count lower; the eviction threshold
// stays the same.
const TOTAL_QUOTA_BYTES = 102_400;
const NON_SHARD_RESERVED_BYTES = 500;
const TOTAL_QUOTA_SAFETY_FRACTION = 0.85;
export const MAX_SHARD_COUNT = Math.floor(
  ((TOTAL_QUOTA_BYTES - NON_SHARD_RESERVED_BYTES) * TOTAL_QUOTA_SAFETY_FRACTION) / SHARD_BYTE_BUDGET
);

export const LOCAL_V1_KEY = "fadee_state_v1";
export const SETTINGS_KEY = "fadee_settings_v2";
export const MARKED_META_KEY = "fadee_marked_meta_v2";
export const MARKED_SHARD_PREFIX = "fadee_marked_v2_";
