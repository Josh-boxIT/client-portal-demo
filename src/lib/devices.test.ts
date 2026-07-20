import { describe, it, expect } from 'vitest';
import { isInventoryDevice } from './devices';
import type { Device } from '@/services/types';

function makeDevice(configurationType?: string): Device {
  return {
    id: 'd1',
    tenantId: 't1',
    name: 'Test Device',
    type: 'laptop',
    os: 'Windows 11 Pro',
    status: 'healthy',
    compliant: true,
    lastSeen: '2026-06-30T00:00:00Z',
    serial: 'SN-1',
    model: 'Test Model',
    configurationType,
  };
}

describe('isInventoryDevice', () => {
  it('returns true for exact "Office Inventory"', () => {
    expect(isInventoryDevice(makeDevice('Office Inventory'))).toBe(true);
  });

  it('returns false when configurationType is undefined', () => {
    expect(isInventoryDevice(makeDevice(undefined))).toBe(false);
  });

  it('returns false for other configuration type strings', () => {
    expect(isInventoryDevice(makeDevice('Laptop'))).toBe(false);
  });

  it('returns false for case variants', () => {
    expect(isInventoryDevice(makeDevice('office inventory'))).toBe(false);
    expect(isInventoryDevice(makeDevice('OFFICE INVENTORY'))).toBe(false);
  });
});
