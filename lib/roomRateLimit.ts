type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  "create-room": { windowMs: 30_000, maxRequests: 3 },
  "join-room": { windowMs: 30_000, maxRequests: 5 },
};

const inMemoryBuckets = new Map<string, number[]>();

function getBucketKey(action: string, identifier = "default") {
  return `guess-the-person:rate-limit:${action}:${identifier}`;
}

function getBucket(action: string, identifier = "default"): number[] {
  const key = getBucketKey(action, identifier);

  if (typeof window === "undefined") {
    return inMemoryBuckets.get(key) ?? [];
  }

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "number" && Number.isFinite(value)) : [];
  } catch (error) {
    console.warn("Failed to read rate-limit bucket", error);
    return inMemoryBuckets.get(key) ?? [];
  }
}

function setBucket(action: string, timestamps: number[], identifier = "default") {
  const key = getBucketKey(action, identifier);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(key, JSON.stringify(timestamps));
      return;
    } catch (error) {
      console.warn("Failed to persist rate-limit bucket", error);
    }
  }

  inMemoryBuckets.set(key, timestamps);
}

export function resetRoomRateLimit(action: string, identifier = "default") {
  const key = getBucketKey(action, identifier);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn("Failed to clear rate-limit bucket", error);
    }
  }

  inMemoryBuckets.delete(key);
}

export function checkRoomActionRateLimit(
  action: string,
  now = Date.now(),
  configOverride?: Partial<RateLimitConfig>,
  identifier = "default"
) {
  const config = {
    ...DEFAULT_LIMITS[action],
    ...configOverride,
  };

  if (!config || !config.windowMs || !config.maxRequests) {
    return { allowed: true, retryAfterMs: 0, remaining: Number.MAX_SAFE_INTEGER };
  }

  const timestamps = getBucket(action, identifier).filter((timestamp) => now - timestamp < config.windowMs);

  if (timestamps.length >= config.maxRequests) {
    const oldest = timestamps[0];
    const retryAfterMs = Math.max(0, config.windowMs - (now - oldest));
    setBucket(action, timestamps, identifier);
    return { allowed: false, retryAfterMs, remaining: 0 };
  }

  const nextTimestamps = [...timestamps, now];
  setBucket(action, nextTimestamps, identifier);
  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: Math.max(0, config.maxRequests - nextTimestamps.length),
  };
}
