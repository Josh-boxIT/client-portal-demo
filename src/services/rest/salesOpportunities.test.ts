import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/auth';
import { restSalesOpportunityService } from './salesOpportunities';

afterEach(() => {
  vi.unstubAllGlobals();
  useAuthStore.setState({ token: null });
});

describe('sales opportunity REST service', () => {
  it('clears the selected tenant analysis with an authenticated DELETE request', async () => {
    useAuthStore.setState({ token: 'staff-token' });
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await restSalesOpportunityService.clear('brightwater');

    expect(fetchMock).toHaveBeenCalledWith('/api/sales-opportunities/latest', expect.objectContaining({
      method: 'DELETE',
      headers: expect.objectContaining({
        Authorization: 'Bearer staff-token',
        'x-tenant-id': 'brightwater',
      }),
    }));
  });
});
