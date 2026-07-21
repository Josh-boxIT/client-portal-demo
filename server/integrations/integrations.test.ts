import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import type { ServerEnv } from '../config/env';
import { openTestDb } from '../db/test-db';
import type { DbClient } from '../db/client';
import {
  connectWiseCompanyCondition,
  connectWiseCompanySearchCondition,
  connectWiseTimeEntryConditions,
  connectWiseTicketConditions,
  ConnectWiseClient,
} from './connectwise';
import { ninjaOrganizationFilter, NinjaOneClient } from './ninjaone';
import { CONNECTWISE_CACHE_REFRESH_MS } from './vendor-data';

const env: ServerEnv = {
  port: 8787,
  host: '127.0.0.1',
  nodeEnv: 'test',
  openAiModel: 'test',
  openAiReasoningEffort: 'low',
  connectWise: {
    baseUrl: 'https://cw.test/v4_6_release/apis/3.0',
    companyId: 'boxit',
    publicKey: 'public',
    privateKey: 'private',
    clientId: 'client-id',
  },
  ninjaOne: {
    baseUrl: 'https://ninja.test',
    tokenUrl: 'https://ninja.test/ws/oauth/token',
    clientId: 'ninja-client',
    clientSecret: 'ninja-secret',
  },
};

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
}

function mockVendorFetch(requests: URL[]): typeof fetch {
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    requests.push(url);
    if (url.pathname === '/ws/oauth/token') return json({ access_token: 'ninja-token', expires_in: 3600 });
    if (url.pathname.endsWith('/company/companies/42')) return json({
      id: 42, identifier: 'BRIGHTWATER', name: 'Brightwater Logistics',
      status: { id: 1, name: 'Active' }, city: 'Seattle', state: 'WA',
      phoneNumber: '+1 206 555 0100', website: 'https://brightwater.example',
      market: { id: 4, name: 'Logistics' }, deletedFlag: false,
    });
    if (url.pathname.endsWith('/company/companies/43')) return json({
      id: 43, identifier: 'ACME', name: 'Acme Manufacturing',
      status: { id: 1, name: 'Active' }, city: 'Detroit', state: 'MI',
      phoneNumber: '+1 313 555 0100', website: 'https://acme.example',
      market: { id: 5, name: 'Manufacturing' }, deletedFlag: false,
    });
    if (url.pathname.endsWith('/company/companies')) return json([
      {
        id: 42, identifier: 'BRIGHTWATER', name: 'Brightwater Logistics',
        status: { id: 1, name: 'Active' }, city: 'Seattle', state: 'WA',
        phoneNumber: '+1 206 555 0100', website: 'https://brightwater.example',
        market: { id: 4, name: 'Logistics' }, deletedFlag: false,
      },
      {
        id: 43, identifier: 'ACME', name: 'Acme Manufacturing',
        status: { id: 1, name: 'Active' }, city: 'Detroit', state: 'MI',
        phoneNumber: '+1 313 555 0100', website: 'https://acme.example',
        market: { id: 5, name: 'Manufacturing' }, deletedFlag: false,
      },
    ]);
    if (url.pathname.endsWith('/company/contacts')) return json([{
      id: 700,
      firstName: 'Sarah',
      lastName: 'Okonkwo',
      title: 'IT Manager',
      department: { id: 1, name: 'Technology' },
      company: { id: 42, name: 'Brightwater' },
      communicationItems: [{ id: 1, communicationType: 'Email', value: 'sarah.okonkwo@brightwaterlogistics.com', defaultFlag: true }],
      inactiveFlag: false,
      _info: { lastUpdated: '2026-07-20T12:00:00Z' },
    }]);
    if (url.pathname.endsWith('/company/configurations')) return json([{
      id: 900,
      name: 'BW-LAPTOP-01',
      type: { id: 2, name: 'Laptop' },
      company: { id: 42, name: 'Brightwater' },
      contact: { id: 700, name: 'Sarah Okonkwo' },
      serialNumber: 'SN-900',
      modelNumber: 'Latitude 7440',
      manufacturer: { id: 3, name: 'Dell' },
      osInfo: 'Windows 11 Pro',
      activeFlag: true,
      _info: { lastUpdated: '2026-07-21T10:00:00Z' },
    }]);
    if (url.pathname.endsWith('/service/tickets')) return json([{
      id: 1200,
      summary: 'VPN is unavailable',
      company: { id: 42, name: 'Brightwater' },
      contact: { id: 700, name: 'Sarah Okonkwo' },
      contactName: 'Sarah Okonkwo',
      contactEmailAddress: 'sarah.okonkwo@brightwaterlogistics.com',
      board: { id: 1, name: 'Support' },
      status: { id: 2, name: 'In Progress' },
      priority: { id: 2, name: 'Priority 2 - High' },
      owner: { id: 3, name: 'Alex Engineer' },
      initialDescription: 'The VPN stopped connecting this morning.',
      closedFlag: false,
      _info: { dateEntered: '2026-07-21T08:00:00Z', lastUpdated: '2026-07-21T10:30:00Z' },
    }]);
    if (/\/service\/tickets\/1200\/allNotes$/.test(url.pathname)) return json([{
      id: 1201,
      text: 'We are investigating the gateway.',
      member: { id: 3, name: 'Alex Engineer' },
      internalAnalysisFlag: false,
      _info: { lastUpdated: '2026-07-21T09:00:00Z' },
    }]);
    if (url.pathname.endsWith('/time/entries')) return json([
      {
        id: 1400,
        chargeToId: 1200,
        chargeToType: 'ServiceTicket',
        member: { id: 3, name: 'Alex Engineer' },
        timeStart: '2026-07-21T09:15:00Z',
        timeEnd: '2026-07-21T10:00:00Z',
        actualHours: 0.75,
        notes: 'Restarted the VPN gateway service.',
        addToDetailDescriptionFlag: true,
      },
      {
        id: 1401,
        chargeToId: 1200,
        chargeToType: 'ServiceTicket',
        member: { id: 3, name: 'Alex Engineer' },
        timeStart: '2026-07-21T10:00:00Z',
        actualHours: 0.25,
        notes: 'Reviewed the firewall logs.',
        internalNotes: 'Possible certificate rollover issue.',
        addToInternalAnalysisFlag: true,
      },
    ]);
    if (/\/service\/tickets\/1200\/documents$/.test(url.pathname)) return json({ error: 'forbidden' }, 403);
    if (url.pathname.endsWith('/system/documents')) return json([{ id: 1300, title: 'VPN error', fileName: 'vpn-error.png', imageFlag: true }]);
    if (/\/system\/documents\/1300\/download$/.test(url.pathname)) return new Response(new Uint8Array([137, 80, 78, 71]), { status: 200, headers: { 'content-type': 'image/png' } });
    if (url.pathname.endsWith('/finance/agreements')) return json([{
      id: 300,
      name: 'Managed Services',
      type: { id: 1, name: 'Managed Services' },
      company: { id: 42, name: 'Brightwater' },
      contact: { id: 700, name: 'Sarah Okonkwo' },
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-12-31T00:00:00Z',
      billAmount: 5000,
      billingCycle: { id: 1, name: 'Monthly' },
      agreementStatus: 'Active',
      sla: { id: 1, name: 'Standard' },
      _info: { lastUpdated: '2026-07-20T12:00:00Z' },
    }]);
    if (/\/finance\/agreements\/300\/additions$/.test(url.pathname)) return json([{
      id: 301,
      product: { id: 10, identifier: 'Managed Endpoint' },
      description: 'Managed endpoint coverage',
      quantity: 1,
      unitPrice: 125,
      extPrice: 125,
    }]);
    if (url.pathname === '/v2/devices-detailed') return json([{
      id: 500,
      organizationId: 77,
      displayName: 'BW-LAPTOP-01',
      nodeClass: 'WINDOWS_WORKSTATION',
      offline: false,
      lastContact: 1784635200,
      os: { name: 'Windows 11 Pro', architecture: 'x64' },
      system: { serialNumber: 'SN-900', manufacturer: 'Dell', model: 'Latitude 7440' },
    }]);
    if (url.pathname === '/v2/queries/computer-systems') return json({ results: [{ deviceId: 500, manufacturer: 'Dell', model: 'Latitude 7440', serialNumber: 'SN-900', totalPhysicalMemory: 17179869184, domain: 'BRIGHTWATER', domainRole: 'MEMBER_WORKSTATION' }] });
    if (url.pathname === '/v2/queries/processors') return json({ results: [{ deviceId: 500, name: 'Intel Core i7', architecture: 'x64', numCores: 10, numLogicalCores: 12, clockSpeed: 2600000000 }] });
    if (url.pathname === '/v2/queries/volumes') return json({ results: [{ deviceId: 500, name: 'C:', driveLetter: 'C:', fileSystem: 'NTFS', capacity: 512000000000, freeSpace: 256000000000 }] });
    if (url.pathname === '/v2/queries/disks') return json({ results: [{ deviceId: 500, model: 'NVMe SSD', manufacturer: 'Samsung', mediaType: 'SSD', size: 512000000000, status: 'OK' }] });
    if (url.pathname === '/v2/queries/network-interfaces') return json({ results: [{ deviceId: 500, adapterName: 'Ethernet', interfaceName: 'Ethernet 1', interfaceType: 'Ethernet', status: 'UP', ipAddress: ['10.0.0.5'], macAddress: ['AA:BB:CC:DD:EE:FF'], defaultGateway: '10.0.0.1', dnsServers: '10.0.0.2, 10.0.0.3' }] });
    if (url.pathname === '/v2/queries/operating-systems') return json({ results: [{ deviceId: 500, name: 'Windows 11 Pro', architecture: 'x64' }] });
    if (url.pathname === '/v2/queries/logged-on-users') return json({ results: [{ deviceId: 500, userName: 'BRIGHTWATER\\sarah' }] });
    if (url.pathname === '/v2/queries/custom-fields') return json({ results: [{ deviceId: 500, fields: { boxitAvInstalled: { value: 'Yes' }, azureAdJoined: { value: 'Yes' } } }] });
    return json({ error: 'unexpected mock request', path: url.pathname }, 500);
  }) as typeof fetch;
}

describe('vendor API request construction', () => {
  it('uses documented ConnectWise slash-reference conditions and GET-only reads', async () => {
    const requests: URL[] = [];
    const client = new ConnectWiseClient(env.connectWise!, mockVendorFetch(requests));
    await client.listContacts(42);
    await client.listConfigurations(42);
    const now = new Date('2026-07-21T12:00:00Z');
    await client.listTickets(42, 1200, now);
    await client.listTicketTimeEntries(1200);
    expect(connectWiseCompanyCondition(42)).toBe('company/id = 42');
    expect(requests.map((url) => url.searchParams.get('conditions'))).toEqual([
      'company/id = 42',
      'company/id = 42 AND activeFlag = true',
      'company/id = 42 AND dateEntered >= [2025-07-21T12:00:00Z] AND id = 1200',
      'chargeToType = "ServiceTicket" AND chargeToId = 1200',
    ]);
    expect(connectWiseTicketConditions(42, undefined, now)).toBe(
      'company/id = 42 AND dateEntered >= [2025-07-21T12:00:00Z]',
    );
    expect(connectWiseTimeEntryConditions(1200)).toBe(
      'chargeToType = "ServiceTicket" AND chargeToId = 1200',
    );
  });

  it('searches ConnectWise companies with documented contains conditions', async () => {
    const requests: URL[] = [];
    const client = new ConnectWiseClient(env.connectWise!, mockVendorFetch(requests));
    await client.searchCompanies('Acme "HQ"');
    expect(connectWiseCompanySearchCondition('Acme "HQ"')).toBe(
      '(name contains "Acme HQ" OR identifier contains "Acme HQ") AND deletedFlag = false',
    );
    const request = requests.find((url) => url.pathname.endsWith('/company/companies'));
    expect(request?.searchParams.get('conditions')).toBe(
      '(name contains "Acme HQ" OR identifier contains "Acme HQ") AND deletedFlag = false',
    );
    expect(request?.searchParams.get('pageSize')).toBe('50');
  });

  it('uses the documented URL-encoded NinjaOne organization and device filters', async () => {
    const requests: URL[] = [];
    const client = new NinjaOneClient(env.ninjaOne!, mockVendorFetch(requests));
    await client.listDevices(77);
    await client.deviceDetail(500);
    expect(ninjaOrganizationFilter(77)).toBe('org = 77');
    expect(requests.find((url) => url.pathname === '/v2/devices-detailed')?.searchParams.get('df')).toBe('org = 77');
    expect(requests.filter((url) => url.pathname.startsWith('/v2/queries/')).every((url) => url.searchParams.get('df') === 'id = 500')).toBe(true);
  });
});

describe('mapped vendor-backed portal routes', () => {
  let app: FastifyInstance;
  let raw: DbClient;
  let requests: URL[];
  let token: string;

  beforeEach(async () => {
    const opened = openTestDb();
    raw = opened.raw;
    requests = [];
    app = await buildApp({ db: opened.db, env, logger: false, vendorFetch: mockVendorFetch(requests), salesOpportunityProvider: null });
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'alex.morgan@boxit.demo' } });
    token = login.json().token;
    const mapped = await app.inject({
      method: 'PATCH',
      url: '/api/admin/clients/brightwater',
      headers: { authorization: `Bearer ${token}` },
      payload: { connectWiseCompanyId: 42, ninjaOneOrganizationId: 77 },
    });
    expect(mapped.statusCode).toBe(200);
  });

  afterEach(async () => {
    await app.close();
    raw.close();
  });

  function headers() {
    return { authorization: `Bearer ${token}`, 'x-tenant-id': 'brightwater' };
  }

  it('persists mappings and serves normalized people, devices, telemetry, tickets, and agreements', async () => {
    const clients = await app.inject({ method: 'GET', url: '/api/admin/clients', headers: headers() });
    expect(clients.json().find((client: { id: string }) => client.id === 'brightwater')).toMatchObject({
      connectWiseCompanyId: 42,
      ninjaOneOrganizationId: 77,
    });
    const tenants = await app.inject({ method: 'GET', url: '/api/tenants' });
    expect(tenants.json().tenants.find((tenant: { id: string }) => tenant.id === 'brightwater').dataSource).toEqual({ connectWise: true, ninjaOne: true });

    const people = await app.inject({ method: 'GET', url: '/api/people?pageSize=100', headers: headers() });
    expect(people.json()).toMatchObject({ source: 'connectwise', fallback: false, data: [{ id: 'cw-contact-700', email: 'sarah.okonkwo@brightwaterlogistics.com' }] });
    expect(requests.filter((url) => url.pathname.endsWith('/company/contacts'))).toHaveLength(1);

    const devices = await app.inject({ method: 'GET', url: '/api/devices?pageSize=100', headers: headers() });
    expect(devices.json()).toMatchObject({ source: 'connectwise', fallback: false, data: [{ id: 'cw-config-900', enrichedBy: 'ninjarmm', online: true }] });
    const detail = await app.inject({ method: 'GET', url: '/api/devices/cw-config-900/detail', headers: headers() });
    expect(detail.json()).toMatchObject({
      deviceId: 'cw-config-900',
      source: 'ninjarmm',
      ramBytes: 17179869184,
      cpuArchitecture: 'x64',
      networkAdapters: [{ name: 'Ethernet', ipAddresses: ['10.0.0.5'], macAddresses: ['AA:BB:CC:DD:EE:FF'] }],
      boxit: { avInstalled: 'Yes', azureAdJoined: 'Yes' },
    });

    const tickets = await app.inject({ method: 'GET', url: '/api/tickets?pageSize=100', headers: headers() });
    expect(tickets.json()).toMatchObject({ source: 'connectwise', fallback: false, data: [{ id: 'cw-ticket-1200', requesterId: 'bw-p1' }] });
    const openTickets = await app.inject({
      method: 'GET',
      url: '/api/tickets?pageSize=100&sortBy=updatedAt&sortDir=desc&filter.isClosed=false',
      headers: headers(),
    });
    expect(openTickets.json()).toMatchObject({
      source: 'connectwise',
      fallback: false,
      total: 1,
      data: [{ id: 'cw-ticket-1200', isClosed: false }],
    });
    const ticket = await app.inject({ method: 'GET', url: '/api/tickets/cw-ticket-1200', headers: headers() });
    expect(ticket.json().messages).toMatchObject([
      { id: 'cw-ticket-1200-initial' },
      { id: 'cw-note-1201' },
      { id: 'cw-time-1400', kind: 'time', hours: 0.75 },
      { id: 'cw-time-1401', kind: 'time', hours: 0.25, internal: true },
      { id: 'cw-time-1401-internal', kind: 'time', internal: true },
    ]);
    const timeRequest = requests.find((url) => url.pathname.endsWith('/time/entries'));
    expect(timeRequest?.searchParams.get('conditions')).toBe(
      'chargeToType = "ServiceTicket" AND chargeToId = 1200',
    );
    expect(ticket.json().attachments).toMatchObject([{ id: '1300', isImage: true }]);

    const clientLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'sarah.okonkwo@brightwaterlogistics.com' },
    });
    const clientTicket = await app.inject({
      method: 'GET',
      url: '/api/tickets/cw-ticket-1200',
      headers: {
        authorization: `Bearer ${clientLogin.json().token}`,
        'x-tenant-id': 'brightwater',
      },
    });
    expect(clientTicket.json().messages.map((message: { id: string }) => message.id)).toEqual([
      'cw-ticket-1200-initial',
      'cw-note-1201',
      'cw-time-1400',
    ]);
    expect(requests.filter((url) => url.pathname.endsWith('/service/tickets'))).toHaveLength(2);
    expect(requests.filter((url) => url.pathname.endsWith('/time/entries'))).toHaveLength(1);
    const attachment = await app.inject({ method: 'GET', url: '/api/tickets/cw-ticket-1200/images/1300', headers: headers() });
    expect(attachment.statusCode).toBe(200);
    expect(attachment.headers['content-type']).toBe('image/png');

    const context = await app.inject({ method: 'GET', url: '/api/sales-opportunities/context', headers: headers() });
    expect(context.json()).toMatchObject({ agreements: [{ id: 'cw-agreement-300', lineItems: [{ id: 'cw-addition-301' }] }], ticketCount: 1 });
    expect(requests.filter((url) => url.pathname.endsWith('/finance/agreements'))).toHaveLength(1);
  });

  it('rejects all ticket mutations for a mapped client', async () => {
    const ninjaOnly = await app.inject({
      method: 'PATCH',
      url: '/api/admin/clients/brightwater',
      headers: headers(),
      payload: { connectWiseCompanyId: null, ninjaOneOrganizationId: 77 },
    });
    expect(ninjaOnly.statusCode).toBe(200);
    const create = await app.inject({ method: 'POST', url: '/api/tickets', headers: headers(), payload: { subject: 'No', body: 'No', requesterId: 'bw-p1', category: 'Support', priority: 'medium' } });
    const status = await app.inject({ method: 'PATCH', url: '/api/tickets/cw-ticket-1200/status', headers: headers(), payload: { status: 'resolved' } });
    const reply = await app.inject({ method: 'POST', url: '/api/tickets/cw-ticket-1200/replies', headers: headers(), payload: { body: 'No' } });
    expect([create.statusCode, status.statusCode, reply.statusCode]).toEqual([409, 409, 409]);
    expect(create.json().error.code).toBe('read_only_integration');
  });

  it('searches and imports a ConnectWise company as a new portal client', async () => {
    const search = await app.inject({
      method: 'GET',
      url: '/api/admin/connectwise/companies?search=Acme',
      headers: headers(),
    });
    expect(search.statusCode).toBe(200);
    expect(search.json()).toMatchObject([
      { id: 42, importedTenantId: 'brightwater' },
      { id: 43, name: 'Acme Manufacturing', importedTenantId: null },
    ]);

    const imported = await app.inject({
      method: 'POST',
      url: '/api/admin/connectwise/import',
      headers: headers(),
      payload: { companyId: 43 },
    });
    expect(imported.statusCode).toBe(201);
    expect(imported.json()).toMatchObject({
      id: 'cw-43',
      slug: 'acme-manufacturing',
      name: 'Acme Manufacturing',
      vertical: 'Manufacturing',
      connectWiseCompanyId: 43,
      ninjaOneOrganizationId: null,
    });

    const tenants = await app.inject({ method: 'GET', url: '/api/tenants' });
    expect(tenants.json().tenants).toContainEqual(expect.objectContaining({
      id: 'cw-43',
      name: 'Acme Manufacturing',
      dataSource: { connectWise: true, ninjaOne: false },
    }));

    const people = await app.inject({
      method: 'GET',
      url: '/api/people?pageSize=100',
      headers: { authorization: `Bearer ${token}`, 'x-tenant-id': 'cw-43' },
    });
    expect(people.statusCode).toBe(200);
    expect(people.json()).toMatchObject({ source: 'connectwise', fallback: false });
    expect(requests.findLast((url) => url.pathname.endsWith('/company/contacts'))
      ?.searchParams.get('conditions')).toBe('company/id = 43');

    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/admin/connectwise/import',
      headers: headers(),
      payload: { companyId: 43 },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('company_already_imported');
  });
});

describe('mapped fallback behavior', () => {
  it('uses demo records when configured vendor HTTP reads fail', async () => {
    const opened = openTestDb();
    const failingFetch = vi.fn(async () => json({ error: 'offline' }, 503)) as typeof fetch;
    const app = await buildApp({ db: opened.db, env, logger: false, vendorFetch: failingFetch });
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'alex.morgan@boxit.demo' } });
    const token = login.json().token;
    await app.inject({ method: 'PATCH', url: '/api/admin/clients/brightwater', headers: { authorization: `Bearer ${token}` }, payload: { connectWiseCompanyId: 42, ninjaOneOrganizationId: 77 } });
    const result = await app.inject({ method: 'GET', url: '/api/tickets?pageSize=100', headers: { authorization: `Bearer ${token}`, 'x-tenant-id': 'brightwater' } });
    expect(result.json().source).toBe('demo');
    expect(result.json().fallback).toBe(true);
    expect(result.json().data[0].id).toMatch(/^bw-/);
    await app.close();
    opened.raw.close();
  });
});

describe('ConnectWise cache scheduling', () => {
  it('refreshes mapped tenants every five minutes', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const opened = openTestDb();
    const requests: URL[] = [];
    const app = await buildApp({
      db: opened.db,
      env,
      logger: false,
      vendorFetch: mockVendorFetch(requests),
      salesOpportunityProvider: null,
    });
    try {
      const login = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'alex.morgan@boxit.demo' },
      });
      await app.inject({
        method: 'PATCH',
        url: '/api/admin/clients/brightwater',
        headers: { authorization: `Bearer ${login.json().token}` },
        payload: { connectWiseCompanyId: 42 },
      });
      expect(requests.filter((url) => url.pathname.endsWith('/company/contacts'))).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(CONNECTWISE_CACHE_REFRESH_MS);

      expect(requests.filter((url) => url.pathname.endsWith('/company/contacts'))).toHaveLength(2);
    } finally {
      await app.close();
      opened.raw.close();
      vi.useRealTimers();
    }
  });
});
