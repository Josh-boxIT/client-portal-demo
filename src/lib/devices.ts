import type { Device } from '@/services/types';

export const OFFICE_INVENTORY_TYPE = 'Office Inventory';

export const isInventoryDevice = (d: Device): boolean =>
  d.configurationType === OFFICE_INVENTORY_TYPE;
