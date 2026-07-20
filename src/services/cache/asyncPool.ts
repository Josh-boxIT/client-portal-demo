// ─── Bounded concurrency pool + in-flight request dedup ──────────────────────
//
// Pure, dependency-free primitives used by the drilldown cache to warm large
// batches of per-item work (e.g. `resolveM365Licenses`, `getDetail`) without
// hammering the upstream API, and to prevent a click-during-warm from firing
// a duplicate request for the same key.

/**
 * Run `worker` over every item in `items`, at most `concurrency` at a time.
 * A shared cursor is pulled by `min(concurrency, items.length)` workers until
 * exhausted. Each item's rejection is isolated (caught + logged) so one
 * failure never aborts the rest of the batch.
 */
export async function runPool<T>(
  items: T[],
  worker: (item: T, index: number) => Promise<void>,
  concurrency: number
): Promise<void> {
  if (items.length === 0) return;
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));

  async function runWorker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index];
      try {
        await worker(item, index);
      } catch (err) {
        // Isolate: one item's failure must never abort the batch.
        console.error('[asyncPool] worker failed for item', index, err);
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
}

/**
 * In-flight request dedup keyed by string. Concurrent calls with the same
 * `key` share the same underlying promise; the entry is removed once it
 * settles so the next call re-issues fresh work.
 */
export function createInflight() {
  const inflight = new Map<string, Promise<unknown>>();

  function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = inflight.get(key);
    if (existing) return existing as Promise<T>;
    const promise = fn().finally(() => {
      inflight.delete(key);
    });
    inflight.set(key, promise);
    return promise;
  }

  return { dedupe };
}
