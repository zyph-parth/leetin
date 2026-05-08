export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  maxEntries?: number;
}

export interface RateLimitDecision {
  limited: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

const DEFAULT_MAX_ENTRIES = 5_000;

function pruneStore(
  store: Map<string, RateLimitEntry>,
  nowMs: number,
  maxEntries: number,
): void {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= nowMs) store.delete(key);
  }

  if (store.size <= maxEntries) return;

  const entriesByExpiry = Array.from(store.entries()).sort((a, b) => a[1].resetAt - b[1].resetAt);
  for (const [key] of entriesByExpiry.slice(0, store.size - maxEntries)) {
    store.delete(key);
  }
}

export function checkRateLimit(
  store: Map<string, RateLimitEntry>,
  key: string,
  options: RateLimitOptions,
  nowMs = Date.now(),
): RateLimitDecision {
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  pruneStore(store, nowMs, maxEntries);

  const current = store.get(key);
  if (!current || current.resetAt <= nowMs) {
    const resetAt = nowMs + options.windowMs;
    store.set(key, { count: 1, resetAt });
    if (store.size > maxEntries) pruneStore(store, nowMs, maxEntries);
    return {
      limited: false,
      remaining: Math.max(0, options.maxRequests - 1),
      resetAt,
      retryAfterSec: 0,
    };
  }

  if (current.count >= options.maxRequests) {
    return {
      limited: true,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - nowMs) / 1000)),
    };
  }

  current.count += 1;
  return {
    limited: false,
    remaining: Math.max(0, options.maxRequests - current.count),
    resetAt: current.resetAt,
    retryAfterSec: 0,
  };
}
