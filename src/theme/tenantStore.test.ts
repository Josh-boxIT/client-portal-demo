import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTenantStore } from './tenantStore';

describe('tenant store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useTenantStore.setState({ tenants: [], loaded: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('recovers when the tenants endpoint briefly fails during a server restart', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tenants: [] }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const loading = useTenantStore.getState().load();
    await vi.advanceTimersByTimeAsync(200);
    await loading;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(useTenantStore.getState().loaded).toBe(true);
  });
});
