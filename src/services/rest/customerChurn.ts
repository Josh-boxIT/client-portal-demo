import type { CustomerChurnService } from '../types';
import { rest } from './client';

export const restCustomerChurnService: CustomerChurnService = {
  list(tenantId) {
    return rest.getPath(tenantId, 'customer-churn');
  },
  get(tenantId) {
    return rest.getOrNullPath(tenantId, `customer-churn/${encodeURIComponent(tenantId)}`);
  },
  regenerate(tenantId) {
    return rest.createPath(tenantId, `customer-churn/${encodeURIComponent(tenantId)}/regenerate`, {});
  },
};
