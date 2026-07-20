import type {
  TenantSeed, Persona, Person, Device, License, Ticket, Asset,
  RoadmapItem, QBR, BudgetLine, Risk, MetricSeries, Document,
  FormDef, NewsItem, ActivityItem, TicketMessage,
} from '@/services/types';

const T = 'cedarvine';

const personas: Persona[] = [
  { id: 'cv-admin', tenantId: T, name: 'Isabella Fontaine', title: 'Director of Operations', email: 'isabella.fontaine@cedarandvine.com', role: 'client-admin', avatarInitials: 'IF' },
  { id: 'cv-user', tenantId: T, name: 'Rafael Moreno', title: 'Front Desk Manager', email: 'rafael.moreno@cedarandvine.com', role: 'client-user', avatarInitials: 'RM' },
];

const people: Person[] = [
  { id: 'cv-p1', tenantId: T, name: 'Isabella Fontaine', email: 'isabella.fontaine@cedarandvine.com', title: 'Director of Operations', role: 'Director of Operations', department: 'Operations', status: 'active', avatarInitials: 'IF', startDate: '2019-05-01', deviceIds: ['cv-d1'], licenseIds: ['cv-lic-m365bp', 'cv-lic-pbipro'], groups: ['Directors', 'All-Staff'] },
  { id: 'cv-p2', tenantId: T, name: 'Rafael Moreno', email: 'rafael.moreno@cedarandvine.com', title: 'Front Desk Manager', role: 'Front Desk Manager', department: 'Front of House', status: 'active', avatarInitials: 'RM', startDate: '2021-03-15', deviceIds: ['cv-d2'], licenseIds: ['cv-lic-m365bb'], groups: ['Front-of-House', 'All-Staff'] },
  { id: 'cv-p3', tenantId: T, name: 'Claire Beaumont', email: 'claire.beaumont@cedarandvine.com', title: 'Executive Chef', role: 'Executive Chef', department: 'Food & Beverage', status: 'active', avatarInitials: 'CB', startDate: '2020-08-01', deviceIds: ['cv-d3'], licenseIds: ['cv-lic-m365bb'], groups: ['F&B', 'All-Staff'] },
  { id: 'cv-p4', tenantId: T, name: 'Antoine Dubois', email: 'antoine.dubois@cedarandvine.com', title: 'General Manager', role: 'General Manager', department: 'Executive', status: 'active', avatarInitials: 'AD', startDate: '2017-11-01', deviceIds: ['cv-d4'], licenseIds: ['cv-lic-m365bp', 'cv-lic-aadp2'], groups: ['Directors', 'Executive', 'All-Staff'] },
  { id: 'cv-p5', tenantId: T, name: 'Mei Lin', email: 'mei.lin@cedarandvine.com', title: 'Revenue Manager', role: 'Revenue Manager', department: 'Finance', status: 'active', avatarInitials: 'ML', startDate: '2022-02-01', deviceIds: ['cv-d5'], licenseIds: ['cv-lic-m365bs'], groups: ['Finance', 'All-Staff'] },
  { id: 'cv-p6', tenantId: T, name: 'Jordan Hughes', email: 'jordan.hughes@cedarandvine.com', title: 'Event Coordinator', role: 'Event Coordinator', department: 'Events', status: 'active', avatarInitials: 'JH', startDate: '2023-01-10', deviceIds: ['cv-d6'], licenseIds: ['cv-lic-m365bs'], groups: ['Events', 'All-Staff'] },
  { id: 'cv-p7', tenantId: T, name: 'Sophie Larkin', email: 'sophie.larkin@cedarandvine.com', title: 'Sous Chef', role: 'Sous Chef', department: 'Food & Beverage', manager: 'cv-p3', status: 'active', avatarInitials: 'SL', startDate: '2022-09-01', deviceIds: [], licenseIds: ['cv-lic-m365bb'], groups: ['F&B', 'All-Staff'] },
  { id: 'cv-p8', tenantId: T, name: 'Marco Vitale', email: 'marco.vitale@cedarandvine.com', title: 'IT & Systems Coordinator', role: 'IT & Systems Coordinator', department: 'IT', status: 'active', avatarInitials: 'MV', startDate: '2021-07-15', deviceIds: ['cv-d7'], licenseIds: ['cv-lic-m365bp', 'cv-lic-aadp2'], groups: ['IT', 'All-Staff'] },
  { id: 'cv-p9', tenantId: T, name: 'Amelia Scott', email: 'amelia.scott@cedarandvine.com', title: 'Marketing & Social Media Manager', role: 'Marketing Manager', department: 'Marketing', status: 'onboarding', avatarInitials: 'AS', startDate: '2026-06-23', deviceIds: [], licenseIds: [], groups: ['Marketing'] },
  { id: 'cv-p10', tenantId: T, name: 'Leon Harrington', email: 'leon.harrington@cedarandvine.com', title: 'Sommelier', role: 'Sommelier', department: 'Food & Beverage', status: 'active', avatarInitials: 'LH', startDate: '2020-04-01', deviceIds: ['cv-d8'], licenseIds: ['cv-lic-m365bb'], groups: ['F&B', 'All-Staff'] },
  { id: 'cv-p11', tenantId: T, name: 'Nina Castillo', email: 'nina.castillo@cedarandvine.com', title: 'Reservations Manager', role: 'Reservations Manager', department: 'Front of House', status: 'active', avatarInitials: 'NC', startDate: '2021-11-01', deviceIds: ['cv-d9'], licenseIds: ['cv-lic-m365bs'], groups: ['Front-of-House', 'All-Staff'] },
  { id: 'cv-p12', tenantId: T, name: 'Patrick O\'Brien', email: 'patrick.obrien@cedarandvine.com', title: 'Facilities Manager', role: 'Facilities Manager', department: 'Facilities', status: 'active', avatarInitials: 'PO', startDate: '2018-06-01', deviceIds: ['cv-d10'], licenseIds: ['cv-lic-m365bb'], groups: ['Facilities', 'All-Staff'] },
  { id: 'cv-p13', tenantId: T, name: 'Yasmin Khalil', email: 'yasmin.khalil@cedarandvine.com', title: 'Head of HR', role: 'Head of HR', department: 'HR', status: 'active', avatarInitials: 'YK', startDate: '2020-01-15', deviceIds: ['cv-d11'], licenseIds: ['cv-lic-m365bs'], groups: ['HR', 'Directors', 'All-Staff'] },
  { id: 'cv-p14', tenantId: T, name: 'George Papadopoulos', email: 'george.papadopoulos@cedarandvine.com', title: 'Bar Manager', role: 'Bar Manager', department: 'Food & Beverage', status: 'active', avatarInitials: 'GP', startDate: '2022-05-01', deviceIds: [], licenseIds: ['cv-lic-m365bb'], groups: ['F&B', 'All-Staff'] },
  { id: 'cv-p15', tenantId: T, name: 'Tasha Nkemdirim', email: 'tasha.nkemdirim@cedarandvine.com', title: 'Catering Sales Manager', role: 'Catering Sales Manager', department: 'Events', status: 'active', avatarInitials: 'TN', startDate: '2023-03-06', deviceIds: ['cv-d12'], licenseIds: ['cv-lic-m365bs'], groups: ['Events', 'Sales', 'All-Staff'] },
  { id: 'cv-p16', tenantId: T, name: 'Henri Bouchard', email: 'henri.bouchard@cedarandvine.com', title: 'Pastry Chef', role: 'Pastry Chef', department: 'Food & Beverage', manager: 'cv-p3', status: 'offboarding', avatarInitials: 'HB', startDate: '2021-08-01', deviceIds: [], licenseIds: [], groups: ['F&B'] },
];

function msg(id: string, author: string, authorType: 'requester' | 'agent' | 'system', body: string, at: string, internal?: boolean): TicketMessage {
  return { id, author, authorType, body, at, ...(internal ? { internal: true } : {}) };
}

function timeMsg(id: string, author: string, body: string, at: string, hours: number, internal?: boolean): TicketMessage {
  return { id, author, authorType: 'agent', body, at, kind: 'time', hours, ...(internal ? { internal: true } : {}) };
}

const devices: Device[] = [
  { id: 'cv-d1', tenantId: T, name: 'CV-LT-001', type: 'laptop', os: 'macOS 14 Sonoma', owner: 'cv-p1', status: 'healthy', compliant: true, lastSeen: '2026-06-30T08:30:00Z', serial: 'AP2023-CV01', model: 'MacBook Pro 14"' },
  { id: 'cv-d2', tenantId: T, name: 'CV-DT-001', type: 'workstation', os: 'Windows 11 Pro', owner: 'cv-p2', status: 'healthy', compliant: true, lastSeen: '2026-06-30T07:15:00Z', serial: 'DT2022-CV01', model: 'Dell OptiPlex 7090' },
  { id: 'cv-d3', tenantId: T, name: 'CV-TB-001', type: 'tablet', os: 'iPadOS 17', owner: 'cv-p3', status: 'healthy', compliant: true, lastSeen: '2026-06-30T09:00:00Z', serial: 'TB2024-CV01', model: 'iPad Pro 11"' },
  { id: 'cv-d4', tenantId: T, name: 'CV-LT-002', type: 'laptop', os: 'macOS 14 Sonoma', owner: 'cv-p4', status: 'healthy', compliant: true, lastSeen: '2026-06-30T08:45:00Z', serial: 'AP2023-CV02', model: 'MacBook Air 15"' },
  { id: 'cv-d5', tenantId: T, name: 'CV-LT-003', type: 'laptop', os: 'Windows 11 Pro', owner: 'cv-p5', status: 'warning', compliant: false, lastSeen: '2026-06-29T18:00:00Z', serial: 'LT2022-CV03', model: 'Lenovo ThinkPad E14' },
  { id: 'cv-d6', tenantId: T, name: 'CV-LT-004', type: 'laptop', os: 'Windows 11 Pro', owner: 'cv-p6', status: 'healthy', compliant: true, lastSeen: '2026-06-30T09:10:00Z', serial: 'LT2023-CV04', model: 'HP EliteBook 840' },
  { id: 'cv-d7', tenantId: T, name: 'CV-LT-005', type: 'laptop', os: 'Windows 11 Pro', owner: 'cv-p8', status: 'healthy', compliant: true, lastSeen: '2026-06-30T09:20:00Z', serial: 'LT2023-CV05', model: 'Dell Latitude 5540' },
  { id: 'cv-d8', tenantId: T, name: 'CV-TB-002', type: 'tablet', os: 'iPadOS 17', owner: 'cv-p10', status: 'healthy', compliant: true, lastSeen: '2026-06-30T08:55:00Z', serial: 'TB2023-CV02', model: 'iPad 10th gen' },
  { id: 'cv-d9', tenantId: T, name: 'CV-DT-002', type: 'workstation', os: 'Windows 11 Pro', owner: 'cv-p11', status: 'healthy', compliant: true, lastSeen: '2026-06-30T07:30:00Z', serial: 'DT2022-CV02', model: 'HP EliteDesk 800' },
  { id: 'cv-d10', tenantId: T, name: 'CV-LT-006', type: 'laptop', os: 'Windows 10 Pro', owner: 'cv-p12', status: 'critical', compliant: false, lastSeen: '2026-06-25T10:00:00Z', serial: 'LT2019-CV06', model: 'Dell Latitude 5480' },
  { id: 'cv-d11', tenantId: T, name: 'CV-LT-007', type: 'laptop', os: 'macOS 14 Sonoma', owner: 'cv-p13', status: 'healthy', compliant: true, lastSeen: '2026-06-30T09:25:00Z', serial: 'AP2024-CV07', model: 'MacBook Pro 13"' },
  { id: 'cv-d12', tenantId: T, name: 'CV-LT-008', type: 'laptop', os: 'Windows 11 Pro', owner: 'cv-p15', status: 'healthy', compliant: true, lastSeen: '2026-06-30T09:05:00Z', serial: 'LT2024-CV08', model: 'Dell Latitude 5430' },
  { id: 'cv-srv1', tenantId: T, name: 'CV-SRV-001', type: 'server', os: 'Windows Server 2019', status: 'warning', compliant: true, lastSeen: '2026-06-30T09:30:00Z', serial: 'SRV2020-CV01', model: 'HP ProLiant DL360' },
  { id: 'cv-inv1', tenantId: T, name: 'CV-STOCK-001', type: 'laptop', os: 'macOS 14 Sonoma', status: 'healthy', compliant: true, lastSeen: '2026-06-28T09:00:00Z', serial: 'AP2024-CV90', model: 'MacBook Air 13"', configurationType: 'Office Inventory' },
  { id: 'cv-inv2', tenantId: T, name: 'CV-STOCK-002', type: 'workstation', os: 'Windows 11 Pro', status: 'healthy', compliant: true, lastSeen: '2026-06-27T09:30:00Z', serial: 'DT2024-CV91', model: 'HP EliteDesk 800', configurationType: 'Office Inventory' },
];

const licenses: License[] = [
  { id: 'cv-lic-m365bp', tenantId: T, product: 'Microsoft 365 Business Premium', sku: 'M365BP', totalUnits: 2, consumedUnits: 2, status: 'in_use', costPerMonth: 22 },
  { id: 'cv-lic-m365bb', tenantId: T, product: 'Microsoft 365 Business Basic', sku: 'M365BB', totalUnits: 9, consumedUnits: 6, status: 'in_use', costPerMonth: 6 },
  { id: 'cv-lic-pbipro', tenantId: T, product: 'Power BI Pro', sku: 'PBIPRO', totalUnits: 1, consumedUnits: 1, status: 'in_use', costPerMonth: 10 },
  { id: 'cv-lic-aadp2', tenantId: T, product: 'Azure AD P2', sku: 'AADP2', totalUnits: 2, consumedUnits: 2, status: 'in_use', costPerMonth: 9 },
  { id: 'cv-lic-m365bs', tenantId: T, product: 'Microsoft 365 Business Standard', sku: 'M365BS', totalUnits: 5, consumedUnits: 5, status: 'in_use', costPerMonth: 12.50 },
  { id: 'cv-lic-toast-6', tenantId: T, product: 'Toast POS (6 terminals)', sku: 'TOAST-6', totalUnits: 1, consumedUnits: 1, status: 'in_use', costPerMonth: 290 },
  { id: 'cv-lic-ot-rest', tenantId: T, product: 'OpenTable (Restaurant)', sku: 'OT-REST', totalUnits: 1, consumedUnits: 1, status: 'in_use', costPerMonth: 249 },
];

const tickets: Ticket[] = [
  {
    id: 'cv-t1', tenantId: T, number: 'TKT-0521', subject: 'Toast POS terminal 3 not printing receipts', status: 'in-progress', isClosed: false, priority: 'urgent', requesterId: 'cv-p2', assignee: 'Marco Vitale', createdAt: '2026-06-30T06:30:00Z', updatedAt: '2026-06-30T07:15:00Z', category: 'Hardware',
    messages: [
      msg('m1', 'Rafael Moreno', 'requester', 'Terminal 3 at the bar is not printing receipts. Service is backed up.', '2026-06-30T06:30:00Z'),
      msg('m2', 'Marco Vitale', 'agent', 'On it. Checking print spooler remotely. Can you confirm is it the bar receipt printer or kitchen?', '2026-06-30T06:45:00Z'),
      msg('m3', 'Rafael Moreno', 'requester', 'Bar receipt printer — the Star TSP100', '2026-06-30T06:50:00Z'),
      msg('m-int-1', 'Marco Vitale', 'agent', 'This is the third spooler jam on TSP100 #3 this month — recommend swapping the unit under warranty rather than continuing to patch it. Will raise with Rafael separately.', '2026-06-30T07:00:00Z', true),
      msg('m4', 'Marco Vitale', 'agent', 'Cleared the print queue. Please try a test print now.', '2026-06-30T07:15:00Z'),
    ],
  },
  {
    id: 'cv-t2', tenantId: T, number: 'TKT-0520', subject: 'Guest WiFi not working in Garden Suite', status: 'open', isClosed: false, priority: 'high', requesterId: 'cv-p2', createdAt: '2026-06-29T14:00:00Z', updatedAt: '2026-06-29T14:00:00Z', category: 'Network',
    messages: [
      msg('m5', 'Rafael Moreno', 'requester', 'Guests in suites 12–15 (Garden wing) are reporting no WiFi. Multiple complaints.', '2026-06-29T14:00:00Z'),
    ],
  },
  {
    id: 'cv-t3', tenantId: T, number: 'TKT-0519', subject: 'Facilities laptop needs replacement (Windows 10 EOL)', status: 'open', isClosed: false, priority: 'medium', requesterId: 'cv-p12', createdAt: '2026-06-28T09:00:00Z', updatedAt: '2026-06-28T09:00:00Z', category: 'Hardware',
    messages: [
      msg('m6', 'Patrick O\'Brien', 'requester', 'My laptop is running Windows 10 and it is slow. I hear Windows 10 support ends soon?', '2026-06-28T09:00:00Z'),
    ],
  },
  {
    id: 'cv-t4', tenantId: T, number: 'TKT-0518', subject: 'New email account for Amelia Scott', status: 'in-progress', isClosed: false, priority: 'high', requesterId: 'cv-p1', assignee: 'Marco Vitale', createdAt: '2026-06-20T10:00:00Z', updatedAt: '2026-06-22T14:00:00Z', category: 'Onboarding',
    messages: [
      msg('m7', 'Isabella Fontaine', 'requester', 'Please set up email and M365 for Amelia Scott, Marketing Manager, starting June 23.', '2026-06-20T10:00:00Z'),
      msg('m8', 'Marco Vitale', 'agent', 'Account created. Laptop is being configured — ready for pickup June 23 AM.', '2026-06-22T14:00:00Z'),
      timeMsg('t1', 'Marco Vitale', 'Provisioned M365 mailbox and configured laptop image for new hire.', '2026-06-22T14:15:00Z', 1.5),
    ],
  },
  {
    id: 'cv-t5', tenantId: T, number: 'TKT-0517', subject: 'Server showing warning in monitoring dashboard', status: 'resolved', isClosed: false, priority: 'medium', requesterId: 'cv-p8', createdAt: '2026-06-24T11:00:00Z', updatedAt: '2026-06-25T15:00:00Z', category: 'Infrastructure',
    messages: [
      msg('m9', 'Marco Vitale', 'requester', 'CV-SRV-001 is showing a warning in the monitoring dashboard — disk at 78% capacity.', '2026-06-24T11:00:00Z'),
      msg('m-int-2', 'Support', 'agent', 'Internal: root cause was an unrotated Toast POS log directory eating ~30GB. Added logrotate rule; monitoring closely before we mention it to the client.', '2026-06-25T09:00:00Z', true),
      timeMsg('t2', 'Marco Vitale', 'Investigated disk usage, identified Toast POS log directory as root cause, added logrotate rule.', '2026-06-25T09:30:00Z', 0.75, true),
      msg('m10', 'Support', 'agent', 'Expanded storage via external NAS. Disk now at 45%. Monitoring continues.', '2026-06-25T15:00:00Z'),
      timeMsg('t3', 'Marco Vitale', 'Attached and configured external NAS for additional storage capacity.', '2026-06-25T15:10:00Z', 1),
    ],
  },
];

const assets: Asset[] = [
  { id: 'cv-a1', tenantId: T, name: 'Toast POS System (6 terminals)', category: 'hardware', type: 'POS System', status: 'in-service', purchaseDate: '2023-03-01', warrantyEnd: '2026-03-01', refreshDue: '2027-03-01', cost: 4200, model: 'Toast Flex' },
  { id: 'cv-a2', tenantId: T, name: 'Dell Latitude 5480 (Facilities)', category: 'hardware', type: 'Laptop', status: 'eol', purchaseDate: '2019-07-01', warrantyEnd: '2022-07-01', refreshDue: '2024-01-01', cost: 899, model: 'Latitude 5480', assignedTo: 'cv-p12' },
  { id: 'cv-a3', tenantId: T, name: 'HP ProLiant DL360 Server', category: 'hardware', type: 'Server', status: 'aging', purchaseDate: '2020-06-01', warrantyEnd: '2023-06-01', refreshDue: '2025-06-01', cost: 5800, model: 'ProLiant DL360' },
  { id: 'cv-a4', tenantId: T, name: 'Ubiquiti UniFi WiFi 6 Access Points (24)', category: 'hardware', type: 'Network', status: 'in-service', purchaseDate: '2022-09-01', warrantyEnd: '2027-09-01', refreshDue: '2028-09-01', cost: 7200, model: 'UniFi U6-Pro' },
  { id: 'cv-a5', tenantId: T, name: 'OpenTable Reservation System', category: 'software', type: 'SaaS Subscription', status: 'in-service', purchaseDate: '2020-01-01', warrantyEnd: '2026-12-31', refreshDue: '2026-12-31', cost: 2988, model: 'OpenTable Pro' },
  { id: 'cv-a6', tenantId: T, name: 'Microsoft 365 Business (16 seats)', category: 'software', type: 'SaaS Subscription', status: 'in-service', purchaseDate: '2023-01-01', warrantyEnd: '2026-12-31', refreshDue: '2026-12-31', cost: 1800, model: 'M365 Business' },
  { id: 'cv-a7', tenantId: T, name: 'iPad Fleet (8 units)', category: 'hardware', type: 'Tablet', status: 'in-service', purchaseDate: '2023-09-01', warrantyEnd: '2026-09-01', refreshDue: '2027-09-01', cost: 5600, model: 'iPad (9th gen)' },
];

const roadmap: RoadmapItem[] = [
  { id: 'cv-r1', tenantId: T, title: 'Server Refresh — HP ProLiant', description: 'Replace aging server with new hardware or migrate to Azure.', quarter: '2026-Q3', status: 'planned', owner: 'Marco Vitale', category: 'Infrastructure', progress: 5 },
  { id: 'cv-r2', tenantId: T, title: 'Windows 10 EOL Device Replacement', description: 'Replace all Windows 10 devices before Oct 14 end-of-support date.', quarter: '2026-Q3', status: 'in-progress', owner: 'Marco Vitale', category: 'Endpoint', progress: 25 },
  { id: 'cv-r3', tenantId: T, title: 'Guest WiFi Redesign', description: 'Upgrade guest wireless network for higher capacity and PCI segmentation.', quarter: '2026-Q4', status: 'planned', owner: 'Marco Vitale', category: 'Network', progress: 0 },
  { id: 'cv-r4', tenantId: T, title: 'PCI DSS Compliance Audit', description: 'Annual PCI DSS self-assessment questionnaire and remediation.', quarter: '2026-Q3', status: 'in-progress', owner: 'Isabella Fontaine', category: 'Compliance', progress: 40 },
  { id: 'cv-r5', tenantId: T, title: 'Migrate to Cloud PMS (Property Mgmt System)', description: 'Evaluate and migrate from legacy on-prem PMS to cloud-based solution.', quarter: '2027-Q1', status: 'planned', owner: 'Isabella Fontaine', category: 'Cloud', progress: 0 },
  { id: 'cv-r6', tenantId: T, title: 'Security Awareness Training', description: 'Implement monthly phishing simulations and annual security training.', quarter: '2026-Q2', status: 'done', owner: 'Marco Vitale', category: 'Security', progress: 100 },
];

const qbrs: QBR[] = [
  {
    id: 'cv-q1', tenantId: T, quarter: '2026-Q1', date: '2026-03-20', status: 'completed',
    summary: 'Solid quarter with security training launched. POS system upgraded. Identified server refresh as Q3 priority.',
    metrics: [
      { label: 'Ticket SLA Attainment', value: '88%', trend: 'flat' },
      { label: 'Security Score', value: '71/100', trend: 'up' },
      { label: 'Open Tickets', value: '5', trend: 'flat' },
      { label: 'Device Compliance', value: '68%', trend: 'up' },
    ],
    actionItems: [
      { id: 'ai1', text: 'Begin Windows 10 EOL device audit', done: true, owner: 'Marco Vitale' },
      { id: 'ai2', text: 'Start PCI DSS self-assessment', done: false, owner: 'Isabella Fontaine' },
      { id: 'ai3', text: 'Quote server refresh options', done: false, owner: 'Marco Vitale' },
    ],
    deckUrl: '#',
  },
  {
    id: 'cv-q2', tenantId: T, quarter: '2026-Q3', date: '2026-09-18', status: 'upcoming',
    summary: 'Upcoming QBR. Topics: Windows EOL progress, PCI compliance status, server refresh decision.',
    metrics: [],
    actionItems: [],
    deckUrl: '#',
  },
];

function bp(id: string, category: string, period: string, budgeted: number, actual: number, projected: number, type: 'recurring' | 'one-time'): BudgetLine {
  return { id, tenantId: T, category, period, budgeted, actual, projected, type };
}

const budgetLines: BudgetLine[] = [
  bp('cv-b1', 'Cloud & SaaS', '2026-01', 2800, 2790, 2800, 'recurring'),
  bp('cv-b2', 'Cloud & SaaS', '2026-02', 2800, 2810, 2800, 'recurring'),
  bp('cv-b3', 'Cloud & SaaS', '2026-03', 2800, 2800, 2800, 'recurring'),
  bp('cv-b4', 'Cloud & SaaS', '2026-04', 2800, 2800, 2800, 'recurring'),
  bp('cv-b5', 'Cloud & SaaS', '2026-05', 2800, 2750, 2800, 'recurring'),
  bp('cv-b6', 'Cloud & SaaS', '2026-06', 2800, 2800, 2800, 'recurring'),
  bp('cv-b7', 'Managed IT Services', '2026-01', 1800, 1800, 1800, 'recurring'),
  bp('cv-b8', 'Managed IT Services', '2026-02', 1800, 1800, 1800, 'recurring'),
  bp('cv-b9', 'Managed IT Services', '2026-03', 1800, 1800, 1800, 'recurring'),
  bp('cv-b10', 'Managed IT Services', '2026-04', 1800, 1800, 1800, 'recurring'),
  bp('cv-b11', 'Managed IT Services', '2026-05', 1800, 1800, 1800, 'recurring'),
  bp('cv-b12', 'Managed IT Services', '2026-06', 1800, 1800, 1800, 'recurring'),
  bp('cv-b13', 'Hardware', '2026-06', 5000, 0, 12000, 'one-time'),
  bp('cv-b14', 'Compliance & Audit', '2026-Q2', 2000, 1600, 2000, 'one-time'),
];

const risks: Risk[] = [
  { id: 'cv-rk1', tenantId: T, title: 'POS system PCI scope', description: 'Toast POS terminals need segmentation from corporate network to maintain PCI DSS scope.', severity: 'high', likelihood: 'possible', status: 'mitigating', owner: 'Marco Vitale', mitigation: 'VLAN segmentation in progress. PCI DSS self-assessment in Q3.', category: 'Compliance' },
  { id: 'cv-rk2', tenantId: T, title: 'EOL server (HP ProLiant 2020)', description: 'Server is past warranty and running older OS. Hardware failure risk.', severity: 'high', likelihood: 'possible', status: 'open', owner: 'Marco Vitale', mitigation: 'Refresh scheduled Q3 2026. Azure backup active.', category: 'Infrastructure' },
  { id: 'cv-rk3', tenantId: T, title: 'Windows 10 EOL on 2 devices', description: 'Two devices still on Windows 10 which reaches end-of-support October 14, 2025.', severity: 'medium', likelihood: 'almost-certain', status: 'mitigating', owner: 'Marco Vitale', mitigation: 'Replacement devices on order. Target completion August 2026.', category: 'Endpoint' },
  { id: 'cv-rk4', tenantId: T, title: 'Guest WiFi coverage gaps', description: 'Garden wing WiFi AP showing packet loss — guest complaints increasing.', severity: 'medium', likelihood: 'likely', status: 'open', owner: 'Marco Vitale', mitigation: 'Additional AP ordered. Network redesign planned Q4.', category: 'Network' },
];

function pts(vals: number[], startDate = '2026-01-01'): { date: string; value: number }[] {
  return vals.map((v, i) => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    return { date: d.toISOString().split('T')[0], value: v };
  });
}

const metricSeries: MetricSeries[] = [
  { id: 'cv-ms1', tenantId: T, key: 'tickets-volume', label: 'Tickets Volume', unit: 'count', points: pts([12, 9, 14, 8, 11, 7]) },
  { id: 'cv-ms2', tenantId: T, key: 'sla-attainment', label: 'SLA Attainment', unit: 'percent', points: pts([85, 87, 88, 90, 89, 91]) },
  { id: 'cv-ms3', tenantId: T, key: 'security-score', label: 'Security Score', unit: 'score', points: pts([62, 65, 68, 71, 72, 74]) },
  { id: 'cv-ms4', tenantId: T, key: 'device-compliance', label: 'Device Compliance', unit: 'percent', points: pts([60, 63, 66, 68, 70, 72]) },
  { id: 'cv-ms5', tenantId: T, key: 'license-utilization', label: 'License Utilization', unit: 'percent', points: pts([82, 83, 85, 84, 83, 86]) },
];

const documents: Document[] = [
  { id: 'cv-doc1', tenantId: T, title: 'WiFi Password Policy for Guests', folder: 'Guest Services', tags: ['wifi', 'guests', 'policy'], updatedAt: '2026-04-01T00:00:00Z', author: 'Marco Vitale', excerpt: 'How to distribute and rotate guest WiFi credentials.', body: '# Guest WiFi Policy\n\nGuest WiFi credentials rotate monthly. The current password is distributed via the front desk and displayed on table cards in dining areas.\n\n## Network\n- **SSID**: CedarVine-Guest\n- **Password**: Rotated first of each month\n- **Bandwidth**: Limited to 20Mbps per device' },
  { id: 'cv-doc2', tenantId: T, title: 'POS System Quick Guide', folder: 'Operations', tags: ['pos', 'toast', 'guide'], updatedAt: '2026-03-15T00:00:00Z', author: 'Marco Vitale', excerpt: 'Quick reference for Toast POS — opening, closing, and common issues.', body: '# Toast POS Quick Guide\n\n## Opening the system\n1. Power on terminal (hold power button 3 seconds)\n2. Swipe manager card\n3. Select your section from the floor plan\n\n## Common Issues\n**Printer not printing**: Check paper roll, clear print queue in Toast admin panel\n**Terminal frozen**: Hold power button 10 seconds to force restart' },
  { id: 'cv-doc3', tenantId: T, title: 'IT Equipment Request Process', folder: 'IT Policies', tags: ['equipment', 'request', 'policy'], updatedAt: '2026-05-01T00:00:00Z', author: 'Marco Vitale', excerpt: 'How to request new or replacement IT equipment at Cedar & Vine.', body: '# IT Equipment Request Process\n\nAll equipment requests must go through the Client Portal.\n\n## Steps\n1. Log into the Client Portal\n2. Go to Forms → IT Equipment Request\n3. Fill out the form\n4. Your manager will be notified for approval\n5. IT will contact you within 5 business days' },
];

const forms: FormDef[] = [
  {
    id: 'cv-f1', tenantId: T, title: 'Guest Network Issue Report', description: 'Report WiFi or tech issues affecting guests.', category: 'Network',
    fields: [
      { id: 'location', label: 'Location / Room number', type: 'text', required: true, placeholder: 'e.g. Garden Suite 12, Dining Room Bar' },
      { id: 'issue', label: 'Issue description', type: 'textarea', required: true },
      { id: 'guestCount', label: 'Number of affected guests', type: 'number', required: false },
      { id: 'urgency', label: 'Priority', type: 'select', required: true, options: ['Low', 'Medium', 'High — guests actively affected'] },
    ],
  },
  {
    id: 'cv-f2', tenantId: T, title: 'POS / Payment System Issue', description: 'Report an issue with Toast POS or payment processing.', category: 'Operations',
    fields: [
      { id: 'terminal', label: 'Terminal number or location', type: 'text', required: true, placeholder: 'e.g. Terminal 3, Bar' },
      { id: 'issue', label: 'What is happening?', type: 'select', required: true, options: ['Not printing receipts', 'Not processing payments', 'Screen frozen', 'Cannot log in', 'Other'] },
      { id: 'description', label: 'Additional details', type: 'textarea', required: false },
    ],
  },
  {
    id: 'cv-f3', tenantId: T, title: 'New Staff Access Request', description: 'Request system access for a new team member.', category: 'Onboarding',
    fields: [
      { id: 'name', label: 'Employee name', type: 'text', required: true },
      { id: 'role', label: 'Role / department', type: 'text', required: true },
      { id: 'startDate', label: 'Start date', type: 'date', required: true },
      { id: 'systems', label: 'Systems needed', type: 'textarea', required: true, placeholder: 'e.g. Toast POS, OpenTable, Microsoft 365, Guest WiFi admin' },
    ],
  },
];

const news: NewsItem[] = [
  {
    id: 'cv-n1', tenantId: T, title: 'Upcoming: Windows 10 End of Life — Action Required', category: 'Security', publishedAt: '2026-06-01T09:00:00Z', author: 'Marco Vitale', pinned: true,
    excerpt: 'Microsoft ends Windows 10 support on October 14, 2026. Two devices need replacement — here is the plan.',
    body: '# Windows 10 End of Life\n\n**Date**: October 14, 2026\n\nMicrosoft will end support for Windows 10. After this date, devices will no longer receive security updates.\n\n## What this means for us\n- 2 Cedar & Vine devices are affected\n- Replacement laptops have been ordered\n- Expected delivery: August 2026\n\n## No action needed from staff\nIT will handle device replacement and data migration.',
  },
  {
    id: 'cv-n2', tenantId: T, title: 'New Marketing team member joining June 23', category: 'Announcement', publishedAt: '2026-06-18T10:00:00Z', author: 'Yasmin Khalil',
    excerpt: 'Welcome Amelia Scott, our new Marketing & Social Media Manager, joining Cedar & Vine on June 23.',
    body: '# Welcome Amelia Scott!\n\nWe are delighted to welcome Amelia Scott as our new Marketing & Social Media Manager starting June 23.\n\nAmelia brings 5 years of hospitality marketing experience. She will be focused on our social media presence, email campaigns, and partnerships.\n\nPlease give her a warm welcome!',
  },
  {
    id: 'cv-n3', tenantId: T, title: 'IT maintenance window: July 6 (PMS update)', category: 'Maintenance', publishedAt: '2026-06-25T09:00:00Z', author: 'Marco Vitale',
    excerpt: 'The property management system will be unavailable July 6 from midnight to 4am for a scheduled update.',
    body: '# Scheduled PMS Maintenance\n\n**Date**: July 6, 2026 — 12:00 AM to 4:00 AM\n\nThe property management system (Cloudbeds) will be offline during this window for a major feature update.\n\n## Impact\n- Check-in/check-out must use manual fallback procedures\n- See the laminated backup card at the front desk\n\n## After the update\n- New group booking features available\n- Improved rate calendar UI',
  },
];

const activity: ActivityItem[] = [
  { id: 'cv-act1', tenantId: T, type: 'ticket', title: 'Urgent: POS Terminal 3 issue', detail: 'Print queue cleared by Marco Vitale. Awaiting confirmation.', at: '2026-06-30T07:15:00Z', actor: 'Marco Vitale', icon: 'Ticket' },
  { id: 'cv-act2', tenantId: T, type: 'onboarding', title: 'Amelia Scott account created', detail: 'M365 account and laptop provisioned for Marketing Manager.', at: '2026-06-22T14:00:00Z', actor: 'Marco Vitale', icon: 'UserPlus' },
  { id: 'cv-act3', tenantId: T, type: 'security', title: 'Security awareness training completed', detail: 'All 14 staff members completed the phishing simulation training.', at: '2026-05-30T12:00:00Z', actor: 'Marco Vitale', icon: 'Shield' },
  { id: 'cv-act4', tenantId: T, type: 'compliance', title: 'PCI DSS self-assessment started', detail: 'SAQ-B assessment initiated for Q3 compliance review.', at: '2026-06-15T09:00:00Z', actor: 'Isabella Fontaine', icon: 'FileCheck' },
];

export const cedarvineSeed: TenantSeed = {
  tenantId: T,
  personas,
  people,
  devices,
  licenses,
  tickets,
  assets,
  roadmap,
  qbrs,
  budgetLines,
  risks,
  metricSeries,
  documents,
  forms,
  news,
  activity,
};
