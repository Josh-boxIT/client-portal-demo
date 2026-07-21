import type {
  TenantSeed, Persona, Person, Device, License, Ticket, Asset,
  RoadmapItem, QBR, MetricSeries, Document,
  FormDef, NewsItem, ActivityItem, TicketMessage, TicketAttachment,
} from '@/services/types';

// Tiny 1x1 solid-color PNG data URIs used to demo ticket image rendering in
// mock mode (no backend proxy required). Must be `data:image/png` (not SVG):
// the renderer's allowlist rejects `data:image/svg+xml` since an SVG can
// embed executable script.
const MFA_ERROR_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNQTX4NAAIkAXSaGkHUAAAAAElFTkSuQmCC';
const MFA_WORKING_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMQW+wFAAHWAQSeqOZrAAAAAElFTkSuQmCC';

const T = 'brightwater';

const personas: Persona[] = [
  { id: 'bw-admin', tenantId: T, name: 'Sarah Okonkwo', title: 'IT Manager', email: 'sarah.okonkwo@brightwaterlogistics.com', role: 'client-admin', avatarInitials: 'SO' },
  { id: 'bw-user', tenantId: T, name: 'Marcus Thiele', title: 'Operations Analyst', email: 'marcus.thiele@brightwaterlogistics.com', role: 'client-user', avatarInitials: 'MT' },
];

const people: Person[] = [
  { id: 'bw-p1', tenantId: T, name: 'Sarah Okonkwo', email: 'sarah.okonkwo@brightwaterlogistics.com', title: 'IT Manager', role: 'IT Manager', department: 'IT', status: 'active', avatarInitials: 'SO', startDate: '2020-03-15', deviceIds: ['bw-d1'], licenseIds: ['bw-lic-m365bp', 'bw-lic-aadp2'], groups: ['IT-Admins', 'All-Staff'] },
  { id: 'bw-p2', tenantId: T, name: 'Marcus Thiele', email: 'marcus.thiele@brightwaterlogistics.com', title: 'Operations Analyst', role: 'Operations Analyst', department: 'Operations', status: 'active', avatarInitials: 'MT', startDate: '2021-07-01', deviceIds: ['bw-d2'], licenseIds: ['bw-lic-m365bs'], groups: ['Operations', 'All-Staff'] },
  { id: 'bw-p3', tenantId: T, name: 'Priya Nair', email: 'priya.nair@brightwaterlogistics.com', title: 'Logistics Coordinator', role: 'Logistics Coordinator', department: 'Operations', status: 'active', avatarInitials: 'PN', startDate: '2022-01-10', deviceIds: ['bw-d3'], licenseIds: ['bw-lic-m365bs'], groups: ['Operations', 'All-Staff'] },
  { id: 'bw-p4', tenantId: T, name: 'James Kowalski', email: 'james.kowalski@brightwaterlogistics.com', title: 'Fleet Manager', role: 'Fleet Manager', department: 'Operations', manager: 'bw-p2', status: 'active', avatarInitials: 'JK', startDate: '2019-06-22', deviceIds: ['bw-d4'], licenseIds: ['bw-lic-m365bs'], groups: ['Fleet', 'Operations', 'All-Staff'] },
  { id: 'bw-p5', tenantId: T, name: 'Amara Diallo', email: 'amara.diallo@brightwaterlogistics.com', title: 'Finance Lead', role: 'Finance Lead', department: 'Finance', status: 'active', avatarInitials: 'AD', startDate: '2020-09-01', deviceIds: ['bw-d5'], licenseIds: ['bw-lic-m365bp', 'bw-lic-pbipro'], groups: ['Finance', 'All-Staff'] },
  { id: 'bw-p6', tenantId: T, name: 'Tom Brennan', email: 'tom.brennan@brightwaterlogistics.com', title: 'HR Director', role: 'HR Director', department: 'HR', status: 'active', avatarInitials: 'TB', startDate: '2018-04-12', deviceIds: ['bw-d6'], licenseIds: ['bw-lic-m365bs'], groups: ['HR', 'All-Staff'] },
  { id: 'bw-p7', tenantId: T, name: 'Lena Schneider', email: 'lena.schneider@brightwaterlogistics.com', title: 'Warehouse Supervisor', role: 'Warehouse Supervisor', department: 'Operations', status: 'active', avatarInitials: 'LS', startDate: '2021-03-01', deviceIds: ['bw-d7'], licenseIds: ['bw-lic-m365bb'], groups: ['Warehouse', 'Operations', 'All-Staff'] },
  { id: 'bw-p8', tenantId: T, name: 'Raj Patel', email: 'raj.patel@brightwaterlogistics.com', title: 'Systems Administrator', role: 'Systems Administrator', department: 'IT', manager: 'bw-p1', status: 'active', avatarInitials: 'RP', startDate: '2022-08-15', deviceIds: ['bw-d8'], licenseIds: ['bw-lic-m365bp', 'bw-lic-aadp2'], groups: ['IT-Admins', 'All-Staff'] },
  { id: 'bw-p9', tenantId: T, name: 'Elena Vasquez', email: 'elena.vasquez@brightwaterlogistics.com', title: 'Procurement Specialist', role: 'Procurement Specialist', department: 'Finance', status: 'active', avatarInitials: 'EV', startDate: '2023-02-20', deviceIds: ['bw-d9'], licenseIds: ['bw-lic-m365bs'], groups: ['Finance', 'All-Staff'] },
  { id: 'bw-p10', tenantId: T, name: 'Daniel Osei', email: 'daniel.osei@brightwaterlogistics.com', title: 'Customer Success Manager', role: 'Customer Success Manager', department: 'Sales', status: 'active', avatarInitials: 'DO', startDate: '2021-11-08', deviceIds: ['bw-d10'], licenseIds: ['bw-lic-m365bp', 'bw-lic-sfess'], groups: ['Sales', 'All-Staff'] },
  { id: 'bw-p11', tenantId: T, name: 'Fatima Al-Hassan', email: 'fatima.alhassan@brightwaterlogistics.com', title: 'Route Planner', role: 'Route Planner', department: 'Operations', status: 'onboarding', avatarInitials: 'FA', startDate: '2026-06-16', deviceIds: [], licenseIds: [], groups: ['Operations'] },
  { id: 'bw-p12', tenantId: T, name: 'Chris Nguyen', email: 'chris.nguyen@brightwaterlogistics.com', title: 'Data Analyst', role: 'Data Analyst', department: 'IT', manager: 'bw-p1', status: 'active', avatarInitials: 'CN', startDate: '2023-06-01', deviceIds: ['bw-d11'], licenseIds: ['bw-lic-pbipro'], groups: ['IT', 'All-Staff'] },
  { id: 'bw-p13', tenantId: T, name: 'Olivia Marsh', email: 'olivia.marsh@brightwaterlogistics.com', title: 'Executive Assistant', role: 'Executive Assistant', department: 'Executive', status: 'active', avatarInitials: 'OM', startDate: '2020-07-15', deviceIds: ['bw-d12'], licenseIds: ['bw-lic-m365bs'], groups: ['Executive', 'All-Staff'] },
  { id: 'bw-p14', tenantId: T, name: 'Kevin Park', email: 'kevin.park@brightwaterlogistics.com', title: 'Marketing Manager', role: 'Marketing Manager', department: 'Marketing', status: 'active', avatarInitials: 'KP', startDate: '2022-04-01', deviceIds: ['bw-d13'], licenseIds: ['bw-lic-adobecc'], groups: ['Marketing', 'All-Staff'] },
  { id: 'bw-p15', tenantId: T, name: 'Sandra Torres', email: 'sandra.torres@brightwaterlogistics.com', title: 'Compliance Officer', role: 'Compliance Officer', department: 'Legal', status: 'offboarding', avatarInitials: 'ST', startDate: '2019-09-30', deviceIds: ['bw-d14'], licenseIds: ['bw-lic-m365bs'], groups: ['Legal', 'All-Staff'] },
];

// Additional people to reach ~28
const extraPeople: Person[] = Array.from({ length: 13 }, (_, i) => ({
  id: `bw-pe${i + 1}`,
  tenantId: T,
  name: ['Noah Williams', 'Isabelle Chen', 'Jamal Brown', 'Sofia Rossi', 'Ethan Hunt', 'Maya Johnson', 'Lucas Ferreira', 'Aisha Kamara', 'Sam Reeves', 'Grace Kim', 'Tyler Brooks', 'Nadia Petrov', 'Owen Clarke'][i],
  email: `user${i + 16}@brightwaterlogistics.com`,
  title: ['Driver', 'Dispatcher', 'Warehouse Associate', 'Billing Specialist', 'Safety Officer', 'Logistics Analyst', 'Driver', 'Admin Assistant', 'Operations Lead', 'IT Support', 'Driver', 'Recruiter', 'Project Manager'][i],
  role: ['Driver', 'Dispatcher', 'Warehouse Associate', 'Billing Specialist', 'Safety Officer', 'Logistics Analyst', 'Driver', 'Admin Assistant', 'Operations Lead', 'IT Support', 'Driver', 'Recruiter', 'Project Manager'][i],
  department: ['Operations', 'Operations', 'Operations', 'Finance', 'Safety', 'Operations', 'Operations', 'HR', 'Operations', 'IT', 'Operations', 'HR', 'PMO'][i],
  status: i === 4 ? 'suspended' : 'active',
  avatarInitials: ['NW', 'IC', 'JB', 'SR', 'EH', 'MJ', 'LF', 'AK', 'SR', 'GK', 'TB', 'NP', 'OC'][i],
  startDate: `202${Math.floor(i / 5)}-0${(i % 9) + 1}-01`,
  deviceIds: [],
  licenseIds: [],
  groups: ['All-Staff'],
}));

const allPeople = [...people, ...extraPeople];

const devices: Device[] = [
  { id: 'bw-d1', tenantId: T, name: 'BW-LT-001', type: 'laptop', os: 'Windows 11 Pro', owner: 'bw-p1', status: 'healthy', compliant: true, lastSeen: '2026-06-30T08:22:00Z', serial: 'LT2021-0001', model: 'Dell Latitude 5530' },
  { id: 'bw-d2', tenantId: T, name: 'BW-LT-002', type: 'laptop', os: 'Windows 11 Pro', owner: 'bw-p2', status: 'healthy', compliant: true, lastSeen: '2026-06-30T09:10:00Z', serial: 'LT2021-0002', model: 'Lenovo ThinkPad E14' },
  { id: 'bw-d3', tenantId: T, name: 'BW-LT-003', type: 'laptop', os: 'Windows 10 Pro', owner: 'bw-p3', status: 'warning', compliant: false, lastSeen: '2026-06-29T17:45:00Z', serial: 'LT2020-0003', model: 'HP EliteBook 840' },
  { id: 'bw-d4', tenantId: T, name: 'BW-DT-001', type: 'workstation', os: 'Windows 11 Pro', owner: 'bw-p4', status: 'healthy', compliant: true, lastSeen: '2026-06-30T07:55:00Z', serial: 'DT2022-0001', model: 'Dell OptiPlex 5090' },
  { id: 'bw-d5', tenantId: T, name: 'BW-LT-005', type: 'laptop', os: 'macOS 14 Sonoma', owner: 'bw-p5', status: 'healthy', compliant: true, lastSeen: '2026-06-30T08:50:00Z', serial: 'AP2023-0005', model: 'MacBook Pro 14"' },
  { id: 'bw-d6', tenantId: T, name: 'BW-LT-006', type: 'laptop', os: 'Windows 11 Pro', owner: 'bw-p6', status: 'healthy', compliant: true, lastSeen: '2026-06-30T09:05:00Z', serial: 'LT2022-0006', model: 'Dell Latitude 5540' },
  { id: 'bw-d7', tenantId: T, name: 'BW-MB-001', type: 'mobile', os: 'iOS 17', owner: 'bw-p7', status: 'healthy', compliant: true, lastSeen: '2026-06-30T09:30:00Z', serial: 'MB2024-0001', model: 'iPhone 15' },
  { id: 'bw-d8', tenantId: T, name: 'BW-LT-008', type: 'laptop', os: 'Windows 11 Pro', owner: 'bw-p8', status: 'critical', compliant: false, lastSeen: '2026-06-28T14:20:00Z', serial: 'LT2022-0008', model: 'Lenovo ThinkPad T14' },
  { id: 'bw-d9', tenantId: T, name: 'BW-LT-009', type: 'laptop', os: 'Windows 11 Home', owner: 'bw-p9', status: 'warning', compliant: false, lastSeen: '2026-06-29T16:10:00Z', serial: 'LT2023-0009', model: 'HP Pavilion 15' },
  { id: 'bw-d10', tenantId: T, name: 'BW-LT-010', type: 'laptop', os: 'macOS 14 Sonoma', owner: 'bw-p10', status: 'healthy', compliant: true, lastSeen: '2026-06-30T08:40:00Z', serial: 'AP2023-0010', model: 'MacBook Air 15"' },
  { id: 'bw-d11', tenantId: T, name: 'BW-LT-011', type: 'laptop', os: 'Windows 11 Pro', owner: 'bw-p12', status: 'healthy', compliant: true, lastSeen: '2026-06-30T09:15:00Z', serial: 'LT2023-0011', model: 'Dell Latitude 5430' },
  { id: 'bw-d12', tenantId: T, name: 'BW-DT-002', type: 'workstation', os: 'Windows 11 Pro', owner: 'bw-p13', status: 'healthy', compliant: true, lastSeen: '2026-06-30T09:00:00Z', serial: 'DT2022-0012', model: 'Dell OptiPlex 7090' },
  { id: 'bw-d13', tenantId: T, name: 'BW-LT-013', type: 'laptop', os: 'macOS 14 Sonoma', owner: 'bw-p14', status: 'healthy', compliant: true, lastSeen: '2026-06-30T08:30:00Z', serial: 'AP2024-0013', model: 'MacBook Pro 16"' },
  { id: 'bw-d14', tenantId: T, name: 'BW-LT-014', type: 'laptop', os: 'Windows 11 Pro', owner: 'bw-p15', status: 'offline', compliant: false, lastSeen: '2026-06-20T15:00:00Z', serial: 'LT2020-0014', model: 'HP EliteBook 850' },
  { id: 'bw-srv1', tenantId: T, name: 'BW-SRV-001', type: 'server', os: 'Windows Server 2022', status: 'healthy', compliant: true, lastSeen: '2026-06-30T09:35:00Z', serial: 'SRV2021-0001', model: 'Dell PowerEdge R750' },
  { id: 'bw-srv2', tenantId: T, name: 'BW-SRV-002', type: 'server', os: 'Ubuntu 22.04 LTS', status: 'warning', compliant: true, lastSeen: '2026-06-30T09:20:00Z', serial: 'SRV2020-0002', model: 'HP ProLiant DL380' },
  { id: 'bw-inv1', tenantId: T, name: 'BW-STOCK-001', type: 'laptop', os: 'Windows 11 Pro', status: 'healthy', compliant: true, lastSeen: '2026-06-28T10:00:00Z', serial: 'LT2024-0101', model: 'Dell Latitude 5540', configurationType: 'Office Inventory' },
  { id: 'bw-inv2', tenantId: T, name: 'BW-STOCK-002', type: 'laptop', os: 'Windows 11 Pro', status: 'healthy', compliant: true, lastSeen: '2026-06-27T11:00:00Z', serial: 'LT2024-0102', model: 'Lenovo ThinkPad E14', configurationType: 'Office Inventory' },
  { id: 'bw-inv3', tenantId: T, name: 'BW-STOCK-003', type: 'workstation', os: 'Windows 11 Pro', status: 'healthy', compliant: true, lastSeen: '2026-06-26T09:00:00Z', serial: 'DT2024-0103', model: 'Dell OptiPlex 7090', configurationType: 'Office Inventory' },
];

const licenses: License[] = [
  { id: 'bw-lic-m365bp', tenantId: T, product: 'Microsoft 365 Business Premium', sku: 'M365BP', totalUnits: 3, consumedUnits: 3, status: 'in_use', costPerMonth: 22 },
  { id: 'bw-lic-m365bs', tenantId: T, product: 'Microsoft 365 Business Standard', sku: 'M365BS', totalUnits: 9, consumedUnits: 7, status: 'in_use', costPerMonth: 12.50 },
  { id: 'bw-lic-aadp2', tenantId: T, product: 'Azure AD P2', sku: 'AADP2', totalUnits: 2, consumedUnits: 2, status: 'in_use', costPerMonth: 9 },
  { id: 'bw-lic-pbipro', tenantId: T, product: 'Power BI Pro', sku: 'PBIPRO', totalUnits: 3, consumedUnits: 2, status: 'in_use', costPerMonth: 10 },
  { id: 'bw-lic-m365bb', tenantId: T, product: 'Microsoft 365 Business Basic', sku: 'M365BB', totalUnits: 1, consumedUnits: 1, status: 'in_use', costPerMonth: 6 },
  { id: 'bw-lic-sfess', tenantId: T, product: 'Salesforce Essentials', sku: 'SFESS', totalUnits: 2, consumedUnits: 1, status: 'in_use', costPerMonth: 25 },
  { id: 'bw-lic-adobecc', tenantId: T, product: 'Adobe Creative Cloud', sku: 'ADOBECC', totalUnits: 1, consumedUnits: 1, status: 'in_use', costPerMonth: 54.99 },
];

function msg(id: string, author: string, authorType: 'requester' | 'agent' | 'system', body: string, at: string, internal?: boolean): TicketMessage {
  return { id, author, authorType, body, at, ...(internal ? { internal: true } : {}) };
}

function timeMsg(id: string, author: string, body: string, at: string, hours: number, internal?: boolean): TicketMessage {
  return { id, author, authorType: 'agent', body, at, kind: 'time', hours, ...(internal ? { internal: true } : {}) };
}

const tickets: Ticket[] = [
  {
    id: 'bw-t1', tenantId: T, number: 'TKT-1042', subject: 'Laptop running extremely slow after update', status: 'in-progress', isClosed: false, priority: 'high', requesterId: 'bw-p3', assignee: 'Raj Patel', createdAt: '2026-06-28T10:00:00Z', updatedAt: '2026-06-29T14:30:00Z', category: 'Hardware',
    messages: [
      msg('m1', 'Priya Nair', 'requester', 'Since installing the Windows update last night my laptop is really slow and some apps crash.', '2026-06-28T10:00:00Z'),
      msg('m2', 'Raj Patel', 'agent', 'Thanks Priya. I can see your device. Let me run a remote diagnostic. Can you confirm: does the slowness happen at startup specifically?', '2026-06-28T10:45:00Z'),
      msg('m-int-1', 'Raj Patel', 'agent', 'RMM shows failing SMART status on the primary disk — flag for replacement before the next hardware refresh. Not customer-facing yet.', '2026-06-28T11:00:00Z', true),
      msg('m3', 'Priya Nair', 'requester', 'Yes mostly at startup but also when opening Office apps.', '2026-06-28T11:10:00Z'),
      msg('m4', 'Raj Patel', 'agent', "I've rolled back the problematic driver update. Please restart and let me know if the issue persists.", '2026-06-29T14:30:00Z'),
    ],
  },
  {
    id: 'bw-t2', tenantId: T, number: 'TKT-1043', subject: 'Cannot access shared drive — permission denied', status: 'open', isClosed: false, priority: 'medium', requesterId: 'bw-p7', createdAt: '2026-06-29T09:15:00Z', updatedAt: '2026-06-29T09:15:00Z', category: 'Access',
    messages: [
      msg('m5', 'Lena Schneider', 'requester', 'Getting "Access Denied" on the \\\\BWSRV01\\Warehouse-Ops share since this morning. Others in my team have the same issue.', '2026-06-29T09:15:00Z'),
    ],
  },
  {
    id: 'bw-t3', tenantId: T, number: 'TKT-1041', subject: 'Request: Adobe Acrobat Pro for contract reviews', status: 'waiting', isClosed: false, priority: 'low', requesterId: 'bw-p13', createdAt: '2026-06-27T14:00:00Z', updatedAt: '2026-06-28T09:00:00Z', category: 'Software',
    messages: [
      msg('m6', 'Olivia Marsh', 'requester', 'Hi team, I need Adobe Acrobat Pro to review and sign contracts. Currently using the free version.', '2026-06-27T14:00:00Z'),
      msg('m7', 'Support', 'agent', "Request received. We're getting manager approval and checking license availability.", '2026-06-28T09:00:00Z'),
      msg('m-int-2', 'Support', 'agent', 'Internal: confirmed 2 spare Acrobat Pro licenses in the pool; awaiting manager sign-off from Sarah before provisioning.', '2026-06-28T08:30:00Z', true),
    ],
  },
  {
    id: 'bw-t4', tenantId: T, number: 'TKT-1040', subject: 'MFA not working on new phone', status: 'resolved', isClosed: false, priority: 'urgent', requesterId: 'bw-p10', createdAt: '2026-06-26T08:00:00Z', updatedAt: '2026-06-26T10:30:00Z', category: 'Security',
    messages: [
      msg('m8', 'Daniel Osei', 'requester', `I got a new phone and the Microsoft Authenticator is not working. Cannot log in.\n\n![MFA error screen](${MFA_ERROR_IMAGE})`, '2026-06-26T08:00:00Z'),
      msg('m9', 'Raj Patel', 'agent', 'I can see the issue. I have reset your MFA. Please re-register on your new device using aka.ms/mfasetup', '2026-06-26T08:45:00Z'),
      timeMsg('t1', 'Raj Patel', 'Reset MFA registration in Entra ID and walked user through re-enrollment via phone.', '2026-06-26T09:00:00Z', 0.5),
      msg('m10', 'Daniel Osei', 'requester', 'Working now, thank you!', '2026-06-26T10:30:00Z'),
      msg('m11', 'Raj Patel', 'agent', 'Great. Resolving this ticket.', '2026-06-26T10:30:00Z'),
    ],
    attachments: [
      { id: 'bw-t4-att1', name: 'mfa-error-screen.png', url: MFA_ERROR_IMAGE, isImage: true, referenced: true, internal: false },
      { id: 'bw-t4-att2', name: 'mfa-working-confirmation.png', url: MFA_WORKING_IMAGE, isImage: true, referenced: false, internal: false },
    ] satisfies TicketAttachment[],
  },
  {
    id: 'bw-t5', tenantId: T, number: 'TKT-1039', subject: 'New user onboarding — Fatima Al-Hassan', status: 'in-progress', isClosed: false, priority: 'high', requesterId: 'bw-p1', assignee: 'Raj Patel', createdAt: '2026-06-20T08:00:00Z', updatedAt: '2026-06-28T16:00:00Z', category: 'Onboarding',
    messages: [
      msg('m12', 'Sarah Okonkwo', 'requester', 'Please onboard Fatima Al-Hassan, Route Planner, starting June 16. M365 Business Standard, laptop required.', '2026-06-20T08:00:00Z'),
      msg('m13', 'Raj Patel', 'agent', "Account created and laptop ordered. Device ETA June 25.", '2026-06-21T10:00:00Z'),
      timeMsg('t2', 'Raj Patel', 'Provisioned M365 account, mailbox, and group memberships for new hire.', '2026-06-21T10:15:00Z', 1),
      timeMsg('t3', 'Raj Patel', 'Checked laptop imaging queue — device flagged for expedited shipping due to vendor backorder risk.', '2026-06-22T09:00:00Z', 0.25, true),
    ],
  },
  {
    id: 'bw-t6', tenantId: T, number: 'TKT-1038', subject: 'VPN connection drops intermittently', status: 'open', isClosed: false, priority: 'medium', requesterId: 'bw-p2', createdAt: '2026-06-30T07:00:00Z', updatedAt: '2026-06-30T07:00:00Z', category: 'Network',
    messages: [
      msg('m14', 'Marcus Thiele', 'requester', 'VPN keeps dropping every 20-30 minutes when working from home. Very disruptive during calls.', '2026-06-30T07:00:00Z'),
    ],
  },
  {
    id: 'bw-t7', tenantId: T, number: 'TKT-1037', subject: 'Printer not showing on network', status: 'closed', isClosed: true, priority: 'low', requesterId: 'bw-p6', createdAt: '2026-06-24T11:00:00Z', updatedAt: '2026-06-25T13:00:00Z', category: 'Hardware',
    messages: [
      msg('m15', 'Tom Brennan', 'requester', 'The HP printer in the HR office disappeared from the network.', '2026-06-24T11:00:00Z'),
      msg('m16', 'Raj Patel', 'agent', 'Printer firmware update caused the issue. Rolled back and it is back online.', '2026-06-25T13:00:00Z'),
    ],
  },
];

const assets: Asset[] = [
  { id: 'bw-a1', tenantId: T, name: 'Dell Latitude 5530 Fleet', category: 'hardware', type: 'Laptop', status: 'in-service', purchaseDate: '2022-01-15', warrantyEnd: '2025-01-15', refreshDue: '2025-07-15', cost: 1299, model: 'Latitude 5530', assignedTo: 'bw-p1' },
  { id: 'bw-a2', tenantId: T, name: 'HP EliteBook 840 G8', category: 'hardware', type: 'Laptop', status: 'aging', purchaseDate: '2020-03-10', warrantyEnd: '2023-03-10', refreshDue: '2024-09-10', cost: 1149, model: 'EliteBook 840 G8', assignedTo: 'bw-p3' },
  { id: 'bw-a3', tenantId: T, name: 'Dell PowerEdge R750', category: 'hardware', type: 'Server', status: 'in-service', purchaseDate: '2021-06-01', warrantyEnd: '2026-06-01', refreshDue: '2027-06-01', cost: 8500, model: 'PowerEdge R750' },
  { id: 'bw-a4', tenantId: T, name: 'HP ProLiant DL380 Gen10', category: 'hardware', type: 'Server', status: 'aging', purchaseDate: '2019-09-15', warrantyEnd: '2024-09-15', refreshDue: '2025-03-15', cost: 7200, model: 'ProLiant DL380 Gen10' },
  { id: 'bw-a5', tenantId: T, name: 'Microsoft 365 Business Standard (28 seats)', category: 'software', type: 'SaaS Subscription', status: 'in-service', purchaseDate: '2023-01-01', warrantyEnd: '2026-12-31', refreshDue: '2026-12-31', cost: 4200, model: 'M365 Business Standard' },
  { id: 'bw-a6', tenantId: T, name: 'Cisco Meraki MX67 Firewall', category: 'hardware', type: 'Network', status: 'in-service', purchaseDate: '2022-03-01', warrantyEnd: '2027-03-01', refreshDue: '2027-03-01', cost: 2300, model: 'Meraki MX67' },
  { id: 'bw-a7', tenantId: T, name: 'Adobe Creative Cloud (1 seat)', category: 'software', type: 'SaaS Subscription', status: 'in-service', purchaseDate: '2022-06-01', warrantyEnd: '2026-05-31', refreshDue: '2026-05-31', cost: 659.88, model: 'Creative Cloud', assignedTo: 'bw-p14' },
  { id: 'bw-a8', tenantId: T, name: 'UPS APC Smart 3000', category: 'hardware', type: 'Power', status: 'aging', purchaseDate: '2018-11-01', warrantyEnd: '2021-11-01', refreshDue: '2024-11-01', cost: 650, model: 'Smart-UPS 3000' },
];

const roadmap: RoadmapItem[] = [
  { id: 'bw-r1', tenantId: T, title: 'Microsoft 365 E3 Upgrade', description: 'Upgrade all users from Business Standard to E3 to unlock advanced compliance and security features.', quarter: '2026-Q3', status: 'planned', owner: 'Sarah Okonkwo', category: 'Cloud & Licensing', progress: 10 },
  { id: 'bw-r2', tenantId: T, title: 'Endpoint Detection & Response (EDR) Rollout', description: 'Deploy Defender for Endpoint P2 across all managed devices.', quarter: '2026-Q3', status: 'in-progress', owner: 'Raj Patel', category: 'Security', progress: 45 },
  { id: 'bw-r3', tenantId: T, title: 'Legacy Server Refresh', description: 'Replace aging HP ProLiant server (2019) with new hardware before warranty expiry.', quarter: '2026-Q4', status: 'planned', owner: 'Raj Patel', category: 'Infrastructure', progress: 5 },
  { id: 'bw-r4', tenantId: T, title: 'VPN Migration to Entra Private Access', description: 'Replace legacy VPN with Entra Global Secure Access for zero-trust connectivity.', quarter: '2027-Q1', status: 'planned', owner: 'Sarah Okonkwo', category: 'Network & Security', progress: 0 },
  { id: 'bw-r5', tenantId: T, title: 'Automated Onboarding Workflow', description: 'Build automated M365 provisioning triggered by HR system events.', quarter: '2026-Q4', status: 'in-progress', owner: 'Chris Nguyen', category: 'Automation', progress: 60 },
  { id: 'bw-r6', tenantId: T, title: 'MFA Enforcement Policy', description: 'Enforce Conditional Access MFA for all users. Complete rollout and close exceptions.', quarter: '2026-Q2', status: 'done', owner: 'Raj Patel', category: 'Security', progress: 100 },
  { id: 'bw-r7', tenantId: T, title: 'BCDR Plan Review', description: 'Annual review and tabletop exercise of the business continuity and disaster recovery plan.', quarter: '2026-Q4', status: 'planned', owner: 'Sarah Okonkwo', category: 'Compliance', progress: 0 },
  { id: 'bw-r8', tenantId: T, title: 'Power BI Fleet Dashboard', description: 'Build a real-time fleet status dashboard in Power BI connected to the TMS.', quarter: '2026-Q3', status: 'blocked', owner: 'Chris Nguyen', category: 'Analytics', progress: 30 },
];

const qbrs: QBR[] = [
  {
    id: 'bw-q1', tenantId: T, quarter: '2026-Q2', date: '2026-06-15', status: 'completed',
    summary: 'Strong quarter. MFA enforcement completed ahead of schedule. Ticket SLA attainment reached 94%. Server refresh planning initiated.',
    metrics: [
      { label: 'Ticket SLA Attainment', value: '94%', trend: 'up' },
      { label: 'Security Score', value: '82/100', trend: 'up' },
      { label: 'Open Tickets', value: '7', trend: 'down' },
      { label: 'Device Compliance', value: '78%', trend: 'up' },
    ],
    actionItems: [
      { id: 'ai1', text: 'Complete legacy server refresh RFQ', done: false, owner: 'Raj Patel' },
      { id: 'ai2', text: 'Review VPN migration options', done: true, owner: 'Sarah Okonkwo' },
      { id: 'ai3', text: 'Remediate 4 non-compliant devices', done: false, owner: 'Raj Patel' },
    ],
    deckUrl: '#',
  },
  {
    id: 'bw-q2', tenantId: T, quarter: '2026-Q3', date: '2026-09-14', status: 'upcoming',
    summary: 'Upcoming QBR scheduled for September 14. Topics: EDR rollout status, server refresh RFQ results, M365 E3 upgrade planning.',
    metrics: [],
    actionItems: [],
    deckUrl: '#',
  },
];

function pts(vals: number[], startDate = '2026-01-01'): { date: string; value: number }[] {
  return vals.map((v, i) => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    return { date: d.toISOString().split('T')[0], value: v };
  });
}

const metricSeries: MetricSeries[] = [
  { id: 'bw-ms1', tenantId: T, key: 'tickets-volume', label: 'Tickets Volume', unit: 'count', points: pts([18, 22, 15, 19, 24, 14]) },
  { id: 'bw-ms2', tenantId: T, key: 'sla-attainment', label: 'SLA Attainment', unit: 'percent', points: pts([88, 91, 90, 93, 92, 94]) },
  { id: 'bw-ms3', tenantId: T, key: 'security-score', label: 'Security Score', unit: 'score', points: pts([68, 72, 74, 76, 80, 82]) },
  { id: 'bw-ms4', tenantId: T, key: 'device-compliance', label: 'Device Compliance', unit: 'percent', points: pts([65, 68, 72, 75, 76, 78]) },
  { id: 'bw-ms5', tenantId: T, key: 'license-utilization', label: 'License Utilization', unit: 'percent', points: pts([78, 80, 82, 84, 85, 86]) },
];

const documents: Document[] = [
  { id: 'bw-doc1', tenantId: T, title: 'IT Acceptable Use Policy', folder: 'Policies', tags: ['policy', 'security', 'compliance'], updatedAt: '2026-03-01T00:00:00Z', author: 'Sarah Okonkwo', excerpt: 'Guidelines for acceptable use of Brightwater IT systems and resources.', body: '# IT Acceptable Use Policy\n\n## Purpose\nThis policy defines acceptable use of Brightwater Logistics IT systems.\n\n## Scope\nApplies to all employees, contractors, and third parties.\n\n## Guidelines\n- Use systems only for business purposes\n- Do not share passwords\n- Report suspicious activity immediately\n- Enable MFA on all accounts\n\n## Violations\nViolations may result in disciplinary action up to and including termination.' },
  { id: 'bw-doc2', tenantId: T, title: 'VPN Setup Guide', folder: 'How-To Guides', tags: ['vpn', 'remote-work', 'guide'], updatedAt: '2026-04-15T00:00:00Z', author: 'Raj Patel', excerpt: 'Step-by-step instructions for connecting to the Brightwater VPN from home.', body: '# VPN Setup Guide\n\n## Requirements\n- Windows 11 or macOS 13+\n- Corporate device (personal devices not supported)\n\n## Steps\n1. Download the GlobalProtect VPN client from IT self-service\n2. Install and launch GlobalProtect\n3. Enter portal address: vpn.brightwaterlogistics.com\n4. Sign in with your Microsoft 365 credentials\n5. Complete MFA prompt\n\n## Troubleshooting\nIf connection fails, restart the GlobalProtect service and try again.' },
  { id: 'bw-doc3', tenantId: T, title: 'New Employee IT Checklist', folder: 'Onboarding', tags: ['onboarding', 'checklist'], updatedAt: '2026-05-01T00:00:00Z', author: 'Sarah Okonkwo', excerpt: 'Everything a new Brightwater employee needs to set up on day one.', body: '# New Employee IT Checklist\n\n## Day 1\n- [ ] Log in to your laptop using temp credentials\n- [ ] Change password immediately\n- [ ] Set up Microsoft Authenticator MFA\n- [ ] Install required apps via Company Portal\n\n## Day 2–5\n- [ ] Connect to VPN and verify access\n- [ ] Set up email signature\n- [ ] Join relevant Microsoft Teams channels\n- [ ] Complete mandatory security awareness training' },
  { id: 'bw-doc4', tenantId: T, title: 'Password Policy', folder: 'Policies', tags: ['password', 'security', 'policy'], updatedAt: '2026-01-15T00:00:00Z', author: 'Sarah Okonkwo', excerpt: 'Password requirements and best practices for all Brightwater accounts.', body: '# Password Policy\n\n## Requirements\n- Minimum 14 characters\n- At least 1 uppercase, 1 lowercase, 1 number, 1 symbol\n- No reuse of last 12 passwords\n- No dictionary words\n\n## MFA Required\nAll accounts must have MFA enabled. Password alone is not sufficient.\n\n## Sharing Prohibited\nNever share passwords with anyone, including IT staff.' },
  { id: 'bw-doc5', tenantId: T, title: 'How to request software', folder: 'How-To Guides', tags: ['software', 'request', 'guide'], updatedAt: '2026-06-01T00:00:00Z', author: 'Raj Patel', excerpt: 'Use the self-service portal to request software instead of installing unauthorized apps.', body: '# How to Request Software\n\n## Why go through IT?\nAll software must be approved before installation to ensure security and licensing compliance.\n\n## Steps\n1. Open the Client Portal\n2. Navigate to Actions\n3. Click "Request software or a license"\n4. Fill in the form with the software name and business justification\n5. Submit — an IT ticket is created automatically\n\n## Timeline\nTypically 2–5 business days for evaluation and provisioning.' },
];

const forms: FormDef[] = [
  {
    id: 'bw-f1', tenantId: T, title: 'IT Access Request', description: 'Request access to systems, shared drives, or applications.', category: 'Access',
    fields: [
      { id: 'system', label: 'System or resource needed', type: 'text', required: true, placeholder: 'e.g. SharePoint Finance site' },
      { id: 'reason', label: 'Business reason', type: 'textarea', required: true },
      { id: 'duration', label: 'Duration of access', type: 'select', required: true, options: ['Permanent', '90 days', '30 days', 'Project-based'] },
      { id: 'manager', label: 'Manager email (for approval)', type: 'email', required: true },
    ],
  },
  {
    id: 'bw-f2', tenantId: T, title: 'IT Equipment Request', description: 'Request new or replacement IT equipment.', category: 'Hardware',
    fields: [
      { id: 'equipment', label: 'Equipment type', type: 'select', required: true, options: ['Laptop', 'Desktop', 'Monitor', 'Keyboard/Mouse', 'Headset', 'Mobile phone', 'Other'] },
      { id: 'reason', label: 'Reason for request', type: 'textarea', required: true },
      { id: 'urgency', label: 'Urgency', type: 'select', required: true, options: ['Routine', 'Needed within 2 weeks', 'Urgent — broken equipment'] },
    ],
  },
  {
    id: 'bw-f3', tenantId: T, title: 'Security Incident Report', description: 'Report a suspected security incident or policy violation.', category: 'Security',
    fields: [
      { id: 'type', label: 'Incident type', type: 'select', required: true, options: ['Phishing email', 'Malware', 'Unauthorized access', 'Data loss', 'Lost device', 'Other'] },
      { id: 'description', label: 'What happened?', type: 'textarea', required: true },
      { id: 'when', label: 'When did it occur?', type: 'date', required: true },
      { id: 'affected', label: 'Affected systems or accounts', type: 'text', required: false },
    ],
  },
];

const news: NewsItem[] = [
  { id: 'bw-n1', tenantId: T, title: 'MFA enforcement is now live for all users', category: 'Security', publishedAt: '2026-06-10T09:00:00Z', author: 'Sarah Okonkwo', excerpt: 'As of June 10, all users must complete MFA to sign in. Here is what you need to know.', body: '# MFA Enforcement Now Live\n\nAs of today, all Brightwater Logistics user accounts require multi-factor authentication.\n\n## What you need to do\n1. Install Microsoft Authenticator on your phone\n2. Go to aka.ms/mfasetup\n3. Follow the prompts to register your device\n\n## Need help?\nContact IT or use the "Reset MFA" action in the portal.', pinned: true },
  { id: 'bw-n2', tenantId: T, title: 'Planned maintenance: June 22 network upgrade', category: 'Maintenance', publishedAt: '2026-06-15T08:00:00Z', author: 'Raj Patel', excerpt: 'There will be a brief network outage on June 22 from 11pm–2am for firewall firmware updates.', body: '# Planned Network Maintenance\n\n**Date:** June 22, 2026\n**Time:** 11:00 PM – 2:00 AM\n\nThe network team will be performing firewall firmware upgrades. Internet and VPN connectivity will be interrupted during this window.\n\nPlease save your work and disconnect before 11pm.' },
  { id: 'bw-n3', tenantId: T, title: 'New self-service portal launched', category: 'Announcement', publishedAt: '2026-05-28T10:00:00Z', author: 'Sarah Okonkwo', excerpt: 'Introducing the Brightwater IT Client Portal — your self-service hub for IT requests and information.', body: '# Welcome to the IT Client Portal\n\nWe have launched a new self-service portal for all Brightwater Logistics staff.\n\n## What you can do\n- Submit IT requests without calling the helpdesk\n- Check the status of your tickets\n- Access IT documentation and how-to guides\n- View your assigned devices and software\n\nHave feedback? Email it@brightwaterlogistics.com' },
];

const activity: ActivityItem[] = [
  { id: 'bw-act1', tenantId: T, type: 'ticket', title: 'Ticket TKT-1042 updated', detail: 'Raj Patel added a comment and rolled back a driver update.', at: '2026-06-29T14:30:00Z', actor: 'Raj Patel', icon: 'Ticket' },
  { id: 'bw-act2', tenantId: T, type: 'security', title: 'MFA enforcement enabled', detail: 'Conditional Access policy enforcing MFA was activated for all users.', at: '2026-06-10T09:00:00Z', actor: 'Sarah Okonkwo', icon: 'Shield' },
  { id: 'bw-act3', tenantId: T, type: 'onboarding', title: 'Onboarding started: Fatima Al-Hassan', detail: 'Account provisioning and device order initiated.', at: '2026-06-20T08:00:00Z', actor: 'Sarah Okonkwo', icon: 'UserPlus' },
  { id: 'bw-act4', tenantId: T, type: 'ticket', title: 'Ticket TKT-1040 resolved', detail: 'MFA reset completed for Daniel Osei.', at: '2026-06-26T10:30:00Z', actor: 'Raj Patel', icon: 'CheckCircle' },
  { id: 'bw-act5', tenantId: T, type: 'license', title: '3 licenses reviewed', detail: 'Available license audit completed — 4 unused seats identified.', at: '2026-06-05T11:00:00Z', actor: 'Sarah Okonkwo', icon: 'Key' },
];

export const brightwaterSeed: TenantSeed = {
  tenantId: T,
  personas,
  people: allPeople,
  devices,
  licenses,
  tickets,
  assets,
  roadmap,
  qbrs,
  metricSeries,
  documents,
  forms,
  news,
  activity,
};
