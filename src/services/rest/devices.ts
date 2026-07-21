import type { Device, DeviceDetail, DeviceService, ListParams, Page } from '../types';
import { rest } from './client';

export const restDeviceService: DeviceService = {
  list(tenantId: string, params?: ListParams): Promise<Page<Device>> {
    return rest.list<Device>(tenantId, 'devices', params);
  },
  get(tenantId: string, id: string): Promise<Device | null> {
    return rest.getOrNull<Device>(tenantId, 'devices', id);
  },
  async listForPerson(tenantId: string, personId: string): Promise<Device[]> {
    const page = await rest.getPath<Page<Device>>(
      tenantId,
      `devices?personId=${encodeURIComponent(personId)}&pageSize=1000`,
    );
    return page.data;
  },
  getDetail(tenantId: string, id: string): Promise<DeviceDetail | null> {
    return rest.getOrNullPath<DeviceDetail>(tenantId, `devices/${encodeURIComponent(id)}/detail`);
  },
  getLiveTelemetry(tenantId: string, id: string): Promise<Device | null> {
    return rest.getOrNullPath<Device>(tenantId, `devices/${encodeURIComponent(id)}/telemetry`);
  },
};
