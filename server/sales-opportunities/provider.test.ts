import { describe, expect, it } from 'vitest';
import type { ConnectWiseAgreement, ProductCatalogItem } from '@/services/types';
import { PRODUCT_CATALOG } from '../db/product-catalog';
import { buildOpportunityPromptPayload, opportunityInstructions, type OpportunityModelInput } from './provider';

function product(name: string): ProductCatalogItem {
  const item = PRODUCT_CATALOG.find((candidate) => candidate.name === name);
  if (!item) throw new Error(`Missing test product ${name}`);
  return { ...item, enabled: true, createdAt: '2026-07-21T00:00:00.000Z', updatedAt: '2026-07-21T00:00:00.000Z' };
}

function agreement(lineItems: ConnectWiseAgreement['lineItems']): ConnectWiseAgreement {
  return {
    id: 'agreement-1', tenantId: 'tenant-1', externalId: '1', name: 'Maintenance Contract',
    type: 'Maintenance Contract', status: 'active', startDate: '2026-01-01', endDate: '2026-12-31',
    autoRenew: true, renewalNoticeDays: 60, billingCycle: 'monthly', monthlyAmount: 1_000,
    currency: 'USD', coveredUsers: 20, coveredDevices: 15, sla: 'Standard', contractContacts: [],
    addOns: [], exclusions: [], lineItems, sourceUpdatedAt: '2026-07-21T00:00:00.000Z',
  };
}

function input(products: ProductCatalogItem[], agreements: ConnectWiseAgreement[]): OpportunityModelInput {
  return {
    tenantId: 'tenant-1', tenantName: 'Example Client', products, agreements, tickets: [], churn: null,
    safetyIdentifier: 'safe-test-identifier',
  };
}

describe('sales opportunity prompt context', () => {
  it('matches generalized catalog products to active additions by alias and product id', () => {
    const core = product('Core Package');
    const unlimited = product('Unlimited Support Package');
    const payload = buildOpportunityPromptPayload(input([core, unlimited], [agreement([
      {
        id: 'addition-core-mac', name: 'Core Package - Mac', description: 'Managed endpoint package',
        quantity: 10, unitPrice: 40, monthlyAmount: 400,
      },
      {
        id: 'addition-support-pc', productCatalogId: unlimited.id, name: 'Negotiated support bundle',
        description: 'Unlimited remote support', quantity: 5, unitPrice: 95, monthlyAmount: 475,
      },
    ])]));

    expect(payload.evidence.activeAgreements[0].catalogMatches).toEqual([
      {
        productId: core.id,
        productName: 'Core Package',
        additions: [{ additionId: 'addition-core-mac', additionName: 'Core Package - Mac', matchedBy: 'name_or_alias' }],
      },
      {
        productId: unlimited.id,
        productName: 'Unlimited Support Package',
        additions: [{ additionId: 'addition-support-pc', additionName: 'Negotiated support bundle', matchedBy: 'product_id' }],
      },
    ]);
  });

  it('sends only decision-relevant catalog fields and explicit anti-shotgun rules', () => {
    const payload = buildOpportunityPromptPayload(input([product('Core Package')], []));
    expect(payload.catalogProducts[0]).toMatchObject({
      productId: 'product-core-package', name: 'Core Package', category: 'Managed Services',
      pricing: { model: 'per-device', monthlyLow: 9, monthlyHigh: 91 },
    });
    expect(payload.catalogProducts[0]).not.toHaveProperty('createdAt');
    expect(opportunityInstructions()).toContain('Do not create a gap solely because a catalog product is missing.');
    expect(opportunityInstructions()).toContain('Premium Unlimited Support Package includes Unlimited Support Package and Core Package capabilities.');
    expect(opportunityInstructions()).toContain('Do not recommend a contained capability as a gap');
  });
});
