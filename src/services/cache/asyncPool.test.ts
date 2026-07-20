import { describe, it, expect, vi } from 'vitest';
import { runPool, createInflight } from './asyncPool';

describe('runPool', () => {
  it('runs every item exactly once', async () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    const seen: number[] = [];
    await runPool(
      items,
      async (item) => {
        seen.push(item);
      },
      3
    );
    expect(seen.sort((a, b) => a - b)).toEqual(items);
  });

  it('never exceeds the requested concurrency', async () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    let live = 0;
    let peak = 0;
    await runPool(
      items,
      async () => {
        live++;
        peak = Math.max(peak, live);
        await new Promise((resolve) => setTimeout(resolve, 1));
        live--;
      },
      4
    );
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1); // sanity: pool actually parallelized
  });

  it('isolates a rejecting worker so the rest of the batch still completes', async () => {
    const items = [1, 2, 3, 4, 5];
    const completed: number[] = [];
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await runPool(
      items,
      async (item) => {
        if (item === 3) throw new Error('boom');
        completed.push(item);
      },
      2
    );
    expect(completed.sort()).toEqual([1, 2, 4, 5]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('resolves immediately for an empty item list', async () => {
    const worker = vi.fn();
    await runPool([], worker, 5);
    expect(worker).not.toHaveBeenCalled();
  });
});

describe('createInflight', () => {
  it('returns the identical promise for concurrent same-key calls', () => {
    const { dedupe } = createInflight();
    const fn = vi.fn(() => new Promise((resolve) => setTimeout(() => resolve('a'), 5)));
    const p1 = dedupe('key', fn);
    const p2 = dedupe('key', fn);
    expect(p1).toBe(p2);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('re-issues a fresh call after the in-flight promise settles', async () => {
    const { dedupe } = createInflight();
    const fn = vi.fn(() => Promise.resolve('a'));
    await dedupe('key', fn);
    await dedupe('key', fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('keys are independent', async () => {
    const { dedupe } = createInflight();
    const fn = vi.fn(() => Promise.resolve('a'));
    const p1 = dedupe('key1', fn);
    const p2 = dedupe('key2', fn);
    expect(p1).not.toBe(p2);
    await Promise.all([p1, p2]);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
