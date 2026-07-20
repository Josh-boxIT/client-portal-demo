import type {
  TenantSeed, Persona, Person, Device, License, Ticket, Asset,
  RoadmapItem, QBR, BudgetLine, Risk, MetricSeries, Document,
  FormDef, AppTile, NewsItem, ActivityItem, TicketMessage,
} from '@/services/types';

const T = 'northwind';

const personas: Persona[] = [
  { id: 'nw-admin', tenantId: T, name: 'Dr. Patricia Lund', title: 'Chief Information Officer', email: 'p.lund@northwindhealthpartners.org', role: 'client-admin', avatarInitials: 'PL' },
  { id: 'nw-user', tenantId: T, name: 'James Oduya', title: 'Clinical Informatics Specialist', email: 'j.oduya@northwindhealthpartners.org', role: 'client-user', avatarInitials: 'JO' },
];

function msg(id: string, author: string, authorType: 'requester' | 'agent' | 'system', body: string, at: string, internal?: boolean): TicketMessage {
  return { id, author, authorType, body, at, ...(internal ? { internal: true } : {}) };
}

function timeMsg(id: string, author: string, body: string, at: string, hours: number, internal?: boolean): TicketMessage {
  return { id, author, authorType: 'agent', body, at, kind: 'time', hours, ...(internal ? { internal: true } : {}) };
}

const people: Person[] = [
  { id: 'nw-p1', tenantId: T, name: 'Dr. Patricia Lund', email: 'p.lund@northwindhealthpartners.org', title: 'Chief Information Officer', role: 'CIO', department: 'IT', status: 'active', avatarInitials: 'PL', startDate: '2018-01-08', deviceIds: ['nw-d1'], licenseIds: ['nw-lic-m365e3', 'nw-lic-mdeep2'], groups: ['IT-Leadership', 'Executive', 'All-Staff'] },
  { id: 'nw-p2', tenantId: T, name: 'James Oduya', email: 'j.oduya@northwindhealthpartners.org', title: 'Clinical Informatics Specialist', role: 'Clinical Informatics Specialist', department: 'IT', manager: 'nw-p1', status: 'active', avatarInitials: 'JO', startDate: '2021-04-19', deviceIds: ['nw-d2'], licenseIds: ['nw-lic-m365bp'], groups: ['IT', 'All-Staff'] },
  { id: 'nw-p3', tenantId: T, name: 'Dr. Rebecca Torres', email: 'r.torres@northwindhealthpartners.org', title: 'Medical Director', role: 'Medical Director', department: 'Clinical', status: 'active', avatarInitials: 'RT', startDate: '2016-09-01', deviceIds: ['nw-d3'], licenseIds: ['nw-lic-m365e3', 'nw-lic-pbipro'], groups: ['Clinical-Leadership', 'All-Staff'] },
  { id: 'nw-p4', tenantId: T, name: 'Samuel Adeyemi', email: 's.adeyemi@northwindhealthpartners.org', title: 'Systems Administrator', role: 'Systems Administrator', department: 'IT', manager: 'nw-p1', status: 'active', avatarInitials: 'SA', startDate: '2022-02-14', deviceIds: ['nw-d4'], licenseIds: ['nw-lic-m365e3', 'nw-lic-mdeep2'], groups: ['IT', 'IT-Admins', 'All-Staff'] },
  { id: 'nw-p5', tenantId: T, name: 'Hannah Weiss', email: 'h.weiss@northwindhealthpartners.org', title: 'Compliance & Privacy Officer', role: 'Compliance Officer', department: 'Legal & Compliance', status: 'active', avatarInitials: 'HW', startDate: '2020-07-06', deviceIds: ['nw-d5'], licenseIds: ['nw-lic-m365e3', 'nw-lic-mpcomp'], groups: ['Compliance', 'All-Staff'] },
  { id: 'nw-p6', tenantId: T, name: 'Marcus Webb', email: 'm.webb@northwindhealthpartners.org', title: 'Senior Nurse Practitioner', role: 'Nurse Practitioner', department: 'Clinical', status: 'active', avatarInitials: 'MW', startDate: '2019-03-11', deviceIds: ['nw-d6'], licenseIds: ['nw-lic-m365bs'], groups: ['Clinical', 'All-Staff'] },
  { id: 'nw-p7', tenantId: T, name: 'Chloe Bergmann', email: 'c.bergmann@northwindhealthpartners.org', title: 'Patient Care Coordinator', role: 'Patient Care Coordinator', department: 'Clinical', status: 'active', avatarInitials: 'CB', startDate: '2023-05-15', deviceIds: ['nw-d7'], licenseIds: ['nw-lic-m365bs'], groups: ['Clinical', 'All-Staff'] },
  { id: 'nw-p8', tenantId: T, name: 'Dr. Arun Mehta', email: 'a.mehta@northwindhealthpartners.org', title: 'Cardiologist', role: 'Cardiologist', department: 'Clinical', status: 'active', avatarInitials: 'AM', startDate: '2020-11-01', deviceIds: ['nw-d8'], licenseIds: ['nw-lic-m365bs'], groups: ['Clinical', 'Cardiology', 'All-Staff'] },
  { id: 'nw-p9', tenantId: T, name: 'Felicia Okafor', email: 'f.okafor@northwindhealthpartners.org', title: 'Medical Records Manager', role: 'Medical Records Manager', department: 'Administration', status: 'active', avatarInitials: 'FO', startDate: '2021-08-30', deviceIds: ['nw-d9'], licenseIds: ['nw-lic-m365bb'], groups: ['Administration', 'All-Staff'] },
  { id: 'nw-p10', tenantId: T, name: 'Ethan Carroll', email: 'e.carroll@northwindhealthpartners.org', title: 'IT Security Analyst', role: 'IT Security Analyst', department: 'IT', manager: 'nw-p1', status: 'active', avatarInitials: 'EC', startDate: '2023-01-09', deviceIds: ['nw-d10'], licenseIds: ['nw-lic-m365e3', 'nw-lic-mdeep2'], groups: ['IT', 'IT-Security', 'All-Staff'] },
  { id: 'nw-p11', tenantId: T, name: 'Grace Nakamura', email: 'g.nakamura@northwindhealthpartners.org', title: 'HR Manager', role: 'HR Manager', department: 'HR', status: 'active', avatarInitials: 'GN', startDate: '2019-10-21', deviceIds: ['nw-d11'], licenseIds: ['nw-lic-m365bs'], groups: ['HR', 'All-Staff'] },
  { id: 'nw-p12', tenantId: T, name: 'Oliver Straus', email: 'o.straus@northwindhealthpartners.org', title: 'Finance Director', role: 'Finance Director', department: 'Finance', status: 'active', avatarInitials: 'OS', startDate: '2018-08-13', deviceIds: ['nw-d12'], licenseIds: ['nw-lic-m365e3', 'nw-lic-pbipro'], groups: ['Finance', 'Executive', 'All-Staff'] },
  { id: 'nw-p13', tenantId: T, name: 'Vera Korolev', email: 'v.korolev@northwindhealthpartners.org', title: 'Clinical Data Analyst', role: 'Clinical Data Analyst', department: 'IT', manager: 'nw-p2', status: 'onboarding', avatarInitials: 'VK', startDate: '2026-06-09', deviceIds: [], licenseIds: [], groups: ['IT'] },
  { id: 'nw-p14', tenantId: T, name: 'Benjamin Hartley', email: 'b.hartley@northwindhealthpartners.org', title: 'Radiologist', role: 'Radiologist', department: 'Clinical', status: 'active', avatarInitials: 'BH', startDate: '2021-06-01', deviceIds: ['nw-d13', 'nw-d14'], licenseIds: ['nw-lic-m365bs'], groups: ['Clinical', 'Radiology', 'All-Staff'] },
  { id: 'nw-p15', tenantId: T, name: 'Dana Osei', email: 'd.osei@northwindhealthpartners.org', title: 'Receptionist', role: 'Receptionist', department: 'Administration', status: 'active', avatarInitials: 'DO', startDate: '2024-02-05', deviceIds: ['nw-d15'], licenseIds: ['nw-lic-m365bb'], groups: ['Administration', 'All-Staff'] },
  // Non-human M365 accounts (accountClass populated) — hidden by default in the People tab.
  { id: 'nw-p16', tenantId: T, name: 'Reception Desk', email: 'reception@northwindhealthpartners.org', title: 'Shared mailbox', role: 'Shared mailbox', department: 'Administration', status: 'active', avatarInitials: 'RD', startDate: '2018-01-01', deviceIds: [], licenseIds: [], groups: [], enrichedBy: 'cipp', accountClass: 'shared-mailbox' },
  { id: 'nw-p17', tenantId: T, name: 'svc-backup', email: 'svc-backup@northwindhealthpartners.org', title: 'Service account', role: 'Service account', department: 'IT', status: 'active', avatarInitials: 'SB', startDate: '2019-05-01', deviceIds: [], licenseIds: [], groups: [], enrichedBy: 'cipp', accountClass: 'unlicensed' },
  { id: 'nw-p18', tenantId: T, name: 'Alex Contractor', email: 'alex.contractor@partnerfirm.com', title: 'External Consultant', role: 'Guest', department: 'IT', status: 'active', avatarInitials: 'AC', startDate: '2025-11-03', deviceIds: [], licenseIds: [], groups: [], enrichedBy: 'cipp', accountClass: 'guest' },
];

// Extra staff to reach ~40
const extraPeople: Person[] = Array.from({ length: 25 }, (_, i) => ({
  id: `nw-pe${i + 1}`,
  tenantId: T,
  name: [
    'Amy Chen', 'Derrick Owusu', 'Laura Kim', 'Frank Soto', 'Nicole Petrov',
    'Troy Williams', 'Sandra Park', 'Michael Johansson', 'Tina Ramirez', 'Oscar Brennan',
    'Lisa Nguyen', 'Ryan Murphy', 'Keisha Brown', 'Evan Patel', 'Rosa Delgado',
    'Max Fletcher', 'Judy Okonjo', 'Carlos Rivera', 'Eileen Vu', 'Patrick Lynch',
    'Heather Goldman', 'Ivan Reyes', 'Melissa Tan', 'Andre Thompson', 'Sofia Esposito',
  ][i],
  email: `staff${i + 16}@northwindhealthpartners.org`,
  title: [
    'LPN', 'Medical Assistant', 'Billing Specialist', 'Phlebotomist', 'Scheduler',
    'Registered Nurse', 'Lab Technician', 'Physical Therapist', 'Occupational Therapist', 'Respiratory Therapist',
    'Medical Assistant', 'Registered Nurse', 'Billing Specialist', 'IT Support Tech', 'Scheduler',
    'Registered Nurse', 'Medical Records Clerk', 'LPN', 'Lab Technician', 'Physical Therapist',
    'Registered Nurse', 'Pharmacist', 'Patient Advocate', 'Medical Assistant', 'Administrative Coordinator',
  ][i],
  role: ['Clinical', 'Clinical', 'Administration', 'Clinical', 'Administration', 'Clinical', 'Lab', 'Clinical', 'Clinical', 'Clinical', 'Clinical', 'Clinical', 'Administration', 'IT', 'Administration', 'Clinical', 'Administration', 'Clinical', 'Lab', 'Clinical', 'Clinical', 'Pharmacy', 'Administration', 'Clinical', 'Administration'][i],
  department: ['Clinical', 'Clinical', 'Finance', 'Clinical', 'Administration', 'Clinical', 'Lab', 'Clinical', 'Clinical', 'Clinical', 'Clinical', 'Clinical', 'Administration', 'IT', 'Administration', 'Clinical', 'Administration', 'Clinical', 'Lab', 'Clinical', 'Clinical', 'Pharmacy', 'Administration', 'Clinical', 'Administration'][i],
  status: i === 7 ? 'offboarding' : 'active' as const,
  avatarInitials: ['AC', 'DO', 'LK', 'FS', 'NP', 'TW', 'SP', 'MJ', 'TR', 'OB', 'LN', 'RM', 'KB', 'EP', 'RD', 'MF', 'JO', 'CR', 'EV', 'PL', 'HG', 'IR', 'MT', 'AT', 'SE'][i],
  startDate: `202${Math.floor(i / 8)}-0${(i % 9) + 1}-15`,
  deviceIds: [],
  licenseIds: [],
  groups: ['All-Staff'],
}));

const allPeople = [...people, ...extraPeople];

const devices: Device[] = [
  { id: 'nw-d1', tenantId: T, name: 'NW-LT-001', type: 'laptop', os: 'Windows 11 Pro', owner: 'nw-p1', status: 'healthy', compliant: true, lastSeen: '2026-06-30T08:00:00Z', serial: 'LT2023-NW01', model: 'Dell Latitude 7440' },
  { id: 'nw-d2', tenantId: T, name: 'NW-LT-002', type: 'laptop', os: 'Windows 11 Pro', owner: 'nw-p2', status: 'healthy', compliant: true, lastSeen: '2026-06-30T08:30:00Z', serial: 'LT2023-NW02', model: 'Lenovo ThinkPad T14s' },
  { id: 'nw-d3', tenantId: T, name: 'NW-LT-003', type: 'laptop', os: 'macOS 14 Sonoma', owner: 'nw-p3', status: 'healthy', compliant: true, lastSeen: '2026-06-30T09:00:00Z', serial: 'AP2024-NW03', model: 'MacBook Pro 14"' },
  { id: 'nw-d4', tenantId: T, name: 'NW-LT-004', type: 'laptop', os: 'Windows 11 Pro', owner: 'nw-p4', status: 'healthy', compliant: true, lastSeen: '2026-06-30T08:15:00Z', serial: 'LT2022-NW04', model: 'Dell Latitude 5540' },
  { id: 'nw-d5', tenantId: T, name: 'NW-LT-005', type: 'laptop', os: 'Windows 11 Pro', owner: 'nw-p5', status: 'healthy', compliant: true, lastSeen: '2026-06-30T09:10:00Z', serial: 'LT2023-NW05', model: 'HP EliteBook 840' },
  { id: 'nw-d6', tenantId: T, name: 'NW-DT-001', type: 'workstation', os: 'Windows 11 Pro', owner: 'nw-p6', status: 'healthy', compliant: true, lastSeen: '2026-06-30T07:45:00Z', serial: 'DT2022-NW06', model: 'Dell OptiPlex 7090' },
  { id: 'nw-d7', tenantId: T, name: 'NW-DT-002', type: 'workstation', os: 'Windows 11 Pro', owner: 'nw-p7', status: 'healthy', compliant: true, lastSeen: '2026-06-30T07:30:00Z', serial: 'DT2023-NW07', model: 'HP EliteDesk 800' },
  { id: 'nw-d8', tenantId: T, name: 'NW-LT-008', type: 'laptop', os: 'Windows 11 Pro', owner: 'nw-p8', status: 'warning', compliant: false, lastSeen: '2026-06-29T17:00:00Z', serial: 'LT2021-NW08', model: 'Lenovo ThinkPad E15' },
  { id: 'nw-d9', tenantId: T, name: 'NW-DT-003', type: 'workstation', os: 'Windows 11 Pro', owner: 'nw-p9', status: 'healthy', compliant: true, lastSeen: '2026-06-30T08:45:00Z', serial: 'DT2022-NW09', model: 'Dell OptiPlex 5090' },
  { id: 'nw-d10', tenantId: T, name: 'NW-LT-010', type: 'laptop', os: 'Windows 11 Pro', owner: 'nw-p10', status: 'healthy', compliant: true, lastSeen: '2026-06-30T08:20:00Z', serial: 'LT2023-NW10', model: 'Dell Latitude 5540' },
  { id: 'nw-d11', tenantId: T, name: 'NW-LT-011', type: 'laptop', os: 'macOS 14 Sonoma', owner: 'nw-p11', status: 'healthy', compliant: true, lastSeen: '2026-06-30T09:05:00Z', serial: 'AP2023-NW11', model: 'MacBook Air 15"' },
  { id: 'nw-d12', tenantId: T, name: 'NW-LT-012', type: 'laptop', os: 'Windows 11 Pro', owner: 'nw-p12', status: 'healthy', compliant: true, lastSeen: '2026-06-30T08:50:00Z', serial: 'LT2023-NW12', model: 'Dell Latitude 7440' },
  { id: 'nw-d13', tenantId: T, name: 'NW-WS-001', type: 'workstation', os: 'Windows 11 Pro', owner: 'nw-p14', status: 'healthy', compliant: true, lastSeen: '2026-06-30T07:20:00Z', serial: 'WS2023-NW13', model: 'Dell Precision 3660' },
  { id: 'nw-d14', tenantId: T, name: 'NW-TB-001', type: 'tablet', os: 'Windows 11 Pro', owner: 'nw-p14', status: 'healthy', compliant: true, lastSeen: '2026-06-29T18:30:00Z', serial: 'TB2023-NW14', model: 'Surface Pro 9' },
  { id: 'nw-d15', tenantId: T, name: 'NW-DT-004', type: 'workstation', os: 'Windows 11 Pro', owner: 'nw-p15', status: 'healthy', compliant: true, lastSeen: '2026-06-30T08:00:00Z', serial: 'DT2024-NW15', model: 'HP EliteDesk 800' },
  { id: 'nw-srv1', tenantId: T, name: 'NW-SRV-001', type: 'server', os: 'Windows Server 2022', status: 'healthy', compliant: true, lastSeen: '2026-06-30T09:35:00Z', serial: 'SRV2022-NW01', model: 'Dell PowerEdge R750xs' },
  { id: 'nw-srv2', tenantId: T, name: 'NW-SRV-002', type: 'server', os: 'Windows Server 2022', status: 'healthy', compliant: true, lastSeen: '2026-06-30T09:35:00Z', serial: 'SRV2022-NW02', model: 'Dell PowerEdge R750xs' },
  { id: 'nw-srv3', tenantId: T, name: 'NW-SRV-003 (EHR DB)', type: 'server', os: 'Ubuntu 22.04 LTS', status: 'critical', compliant: false, lastSeen: '2026-06-30T09:20:00Z', serial: 'SRV2019-NW03', model: 'HP ProLiant DL380 Gen10' },
  { id: 'nw-inv1', tenantId: T, name: 'NW-STOCK-001', type: 'laptop', os: 'Windows 11 Pro', status: 'healthy', compliant: true, lastSeen: '2026-06-28T09:00:00Z', serial: 'LT2024-NW90', model: 'Dell Latitude 5540', configurationType: 'Office Inventory' },
  { id: 'nw-inv2', tenantId: T, name: 'NW-STOCK-002', type: 'workstation', os: 'Windows 11 Pro', status: 'healthy', compliant: true, lastSeen: '2026-06-27T09:00:00Z', serial: 'DT2024-NW91', model: 'Dell OptiPlex 7090', configurationType: 'Office Inventory' },
  { id: 'nw-inv3', tenantId: T, name: 'NW-STOCK-003', type: 'laptop', os: 'Windows 11 Pro', status: 'healthy', compliant: true, lastSeen: '2026-06-26T09:00:00Z', serial: 'LT2024-NW92', model: 'HP EliteBook 840', configurationType: 'Office Inventory' },
];

const licenses: License[] = [
  { id: 'nw-lic-m365e3', tenantId: T, product: 'Microsoft 365 E3', sku: 'M365E3', totalUnits: 4, consumedUnits: 4, status: 'in_use', costPerMonth: 36 },
  { id: 'nw-lic-m365bp', tenantId: T, product: 'Microsoft 365 Business Premium', sku: 'M365BP', totalUnits: 1, consumedUnits: 1, status: 'in_use', costPerMonth: 22 },
  { id: 'nw-lic-m365bs', tenantId: T, product: 'Microsoft 365 Business Standard', sku: 'M365BS', totalUnits: 6, consumedUnits: 5, status: 'in_use', costPerMonth: 12.50 },
  { id: 'nw-lic-mdeep2', tenantId: T, product: 'Defender for Endpoint P2', sku: 'MDEEP2', totalUnits: 4, consumedUnits: 3, status: 'in_use', costPerMonth: 5.20 },
  { id: 'nw-lic-pbipro', tenantId: T, product: 'Power BI Pro', sku: 'PBIPRO', totalUnits: 2, consumedUnits: 2, status: 'in_use', costPerMonth: 10 },
  { id: 'nw-lic-mpcomp', tenantId: T, product: 'Microsoft Purview Compliance', sku: 'MPCOMP', totalUnits: 1, consumedUnits: 1, status: 'in_use', costPerMonth: 10 },
  { id: 'nw-lic-m365bb', tenantId: T, product: 'Microsoft 365 Business Basic', sku: 'M365BB', totalUnits: 5, consumedUnits: 2, status: 'in_use', costPerMonth: 6 },
];

const tickets: Ticket[] = [
  {
    id: 'nw-t1', tenantId: T, number: 'TKT-2201', subject: 'EHR server critical alert — disk 94% full', status: 'in-progress', isClosed: false, priority: 'urgent', requesterId: 'nw-p4', assignee: 'Samuel Adeyemi', createdAt: '2026-06-30T06:15:00Z', updatedAt: '2026-06-30T08:00:00Z', category: 'Infrastructure',
    messages: [
      msg('m1', 'Samuel Adeyemi', 'requester', 'NW-SRV-003 (EHR database server) is at 94% disk capacity. Monitoring alert fired at 6am. EHR may fail if it hits 100%.', '2026-06-30T06:15:00Z'),
      msg('m2', 'Support', 'agent', 'Escalated to senior team. Clearing old log files and temp data now. ETA for resolution: 2 hours.', '2026-06-30T06:45:00Z'),
      msg('m-int-1', 'Support', 'agent', 'Escalated to on-call senior engineer per critical infra runbook — EHR-adjacent server, page threshold met. Tracking in PagerDuty incident INC-4471.', '2026-06-30T06:50:00Z', true),
      msg('m3', 'Samuel Adeyemi', 'requester', 'Disk now at 87% after log cleanup. Continuing to archive older records.', '2026-06-30T08:00:00Z'),
    ],
  },
  {
    id: 'nw-t2', tenantId: T, number: 'TKT-2200', subject: 'Dr. Mehta laptop not syncing with EHR — BitLocker issue?', status: 'open', isClosed: false, priority: 'high', requesterId: 'nw-p2', createdAt: '2026-06-29T14:30:00Z', updatedAt: '2026-06-29T14:30:00Z', category: 'Endpoint',
    messages: [
      msg('m4', 'James Oduya', 'requester', 'Dr. Mehta cannot sync patient records from his laptop. EHR client throws an encryption error. Possibly related to the BitLocker policy rollout?', '2026-06-29T14:30:00Z'),
    ],
  },
  {
    id: 'nw-t3', tenantId: T, number: 'TKT-2199', subject: 'New clinical data analyst onboarding — Vera Korolev', status: 'in-progress', isClosed: false, priority: 'medium', requesterId: 'nw-p1', assignee: 'Samuel Adeyemi', createdAt: '2026-06-01T09:00:00Z', updatedAt: '2026-06-08T16:00:00Z', category: 'Onboarding',
    messages: [
      msg('m5', 'Dr. Patricia Lund', 'requester', 'Please provision Vera Korolev (Clinical Data Analyst, start June 9) with M365 E3, Intune-enrolled laptop, and EHR read access.', '2026-06-01T09:00:00Z'),
      msg('m6', 'Samuel Adeyemi', 'agent', 'Account created. Laptop ordered (Dell Latitude 5540, ETA June 8). EHR access pending security review.', '2026-06-03T11:00:00Z'),
      timeMsg('t1', 'Samuel Adeyemi', 'Provisioned M365 E3 account and Intune enrollment profile for incoming analyst.', '2026-06-03T11:30:00Z', 1),
      msg('m7', 'Samuel Adeyemi', 'agent', 'Laptop ready and enrolled. EHR access granted after HIPAA clearance confirmed.', '2026-06-08T16:00:00Z'),
      timeMsg('t2', 'Samuel Adeyemi', 'Completed HIPAA clearance review before granting EHR read access; documented in compliance log.', '2026-06-08T15:30:00Z', 0.5, true),
    ],
  },
  {
    id: 'nw-t4', tenantId: T, number: 'TKT-2198', subject: 'HIPAA security awareness training — user questions', status: 'resolved', isClosed: false, priority: 'low', requesterId: 'nw-p9', createdAt: '2026-06-25T10:00:00Z', updatedAt: '2026-06-25T14:00:00Z', category: 'Training',
    messages: [
      msg('m8', 'Felicia Okafor', 'requester', 'I have completed the HIPAA training module but the system says I have not. Can you check?', '2026-06-25T10:00:00Z'),
      msg('m9', 'Ethan Carroll', 'agent', 'Found a sync issue with the LMS. Manually marked your training complete. Certificate emailed.', '2026-06-25T14:00:00Z'),
      timeMsg('t3', 'Ethan Carroll', 'Diagnosed LMS sync failure, manually marked training complete, and re-issued certificate.', '2026-06-25T14:10:00Z', 0.25),
    ],
  },
  {
    id: 'nw-t5', tenantId: T, number: 'TKT-2197', subject: 'Request: Surface Pro for ward rounding', status: 'waiting', isClosed: false, priority: 'medium', requesterId: 'nw-p6', createdAt: '2026-06-22T09:00:00Z', updatedAt: '2026-06-23T10:00:00Z', category: 'Hardware',
    messages: [
      msg('m10', 'Marcus Webb', 'requester', 'For ward rounding I need a tablet that can connect to the EHR. Can we get a Surface Pro?', '2026-06-22T09:00:00Z'),
      msg('m11', 'Dr. Patricia Lund', 'agent', 'Reasonable request. Getting procurement approval — should have answer by end of week.', '2026-06-23T10:00:00Z'),
    ],
  },
  {
    id: 'nw-t6', tenantId: T, number: 'TKT-2196', subject: 'PHI data on personal email — potential breach', status: 'open', isClosed: false, priority: 'urgent', requesterId: 'nw-p5', createdAt: '2026-06-30T07:30:00Z', updatedAt: '2026-06-30T07:30:00Z', category: 'Security',
    messages: [
      msg('m12', 'Hannah Weiss', 'requester', 'Received a report that a clinical staff member may have emailed PHI to a personal Gmail account. Needs immediate investigation.', '2026-06-30T07:30:00Z'),
      msg('m-int-2', 'Ethan Carroll', 'agent', 'Internal: pulled mail flow logs, identified sender and recipient message. Compliance officer notified per HIPAA breach protocol; do not close this ticket until legal signs off.', '2026-06-30T08:15:00Z', true),
    ],
  },
  {
    id: 'nw-t7', tenantId: T, number: 'TKT-2195', subject: 'Shared printer in records room offline', status: 'closed', isClosed: true, priority: 'low', requesterId: 'nw-p9', createdAt: '2026-06-27T11:00:00Z', updatedAt: '2026-06-27T15:00:00Z', category: 'Hardware',
    messages: [
      msg('m13', 'Felicia Okafor', 'requester', 'The shared laser printer in Medical Records is offline.', '2026-06-27T11:00:00Z'),
      msg('m14', 'Samuel Adeyemi', 'agent', 'Power cycled and re-added to print server. Online now.', '2026-06-27T15:00:00Z'),
    ],
  },
  {
    id: 'nw-t8', tenantId: T, number: 'TKT-2194', subject: 'MFA registration required — 3 staff members', status: 'open', isClosed: false, priority: 'high', requesterId: 'nw-p10', createdAt: '2026-06-29T09:00:00Z', updatedAt: '2026-06-29T09:00:00Z', category: 'Security',
    messages: [
      msg('m15', 'Ethan Carroll', 'requester', 'Compliance scan shows 3 staff members have not registered MFA yet. Policy requires completion by June 30.', '2026-06-29T09:00:00Z'),
    ],
  },
];

const assets: Asset[] = [
  { id: 'nw-a1', tenantId: T, name: 'Epic EHR — Clinical License (40 users)', category: 'software', type: 'EHR System', status: 'in-service', purchaseDate: '2022-01-01', warrantyEnd: '2027-12-31', refreshDue: '2027-12-31', cost: 48000, model: 'Epic Hyperspace' },
  { id: 'nw-a2', tenantId: T, name: 'Dell PowerEdge R750xs (x2)', category: 'hardware', type: 'Server', status: 'in-service', purchaseDate: '2022-06-01', warrantyEnd: '2027-06-01', refreshDue: '2028-06-01', cost: 18000, model: 'PowerEdge R750xs' },
  { id: 'nw-a3', tenantId: T, name: 'HP ProLiant DL380 Gen10 (EHR DB)', category: 'hardware', type: 'Server', status: 'eol', purchaseDate: '2019-03-01', warrantyEnd: '2022-03-01', refreshDue: '2024-09-01', cost: 8500, model: 'ProLiant DL380 Gen10' },
  { id: 'nw-a4', tenantId: T, name: 'Microsoft 365 E3 (8 seats)', category: 'software', type: 'SaaS Subscription', status: 'in-service', purchaseDate: '2023-01-01', warrantyEnd: '2026-12-31', refreshDue: '2026-12-31', cost: 3456, model: 'M365 E3' },
  { id: 'nw-a5', tenantId: T, name: 'Cisco Catalyst 9300 Switch Stack', category: 'hardware', type: 'Network', status: 'in-service', purchaseDate: '2021-09-01', warrantyEnd: '2026-09-01', refreshDue: '2027-09-01', cost: 12000, model: 'Catalyst 9300' },
  { id: 'nw-a6', tenantId: T, name: 'Palo Alto PA-440 Firewall (HA pair)', category: 'hardware', type: 'Security', status: 'in-service', purchaseDate: '2023-03-01', warrantyEnd: '2026-03-01', refreshDue: '2028-03-01', cost: 9800, model: 'PA-440' },
  { id: 'nw-a7', tenantId: T, name: 'Veeam Backup & Replication', category: 'software', type: 'Backup Solution', status: 'in-service', purchaseDate: '2022-01-01', warrantyEnd: '2026-12-31', refreshDue: '2026-12-31', cost: 2400, model: 'Veeam B&R v12' },
  { id: 'nw-a8', tenantId: T, name: 'Dell Precision 3660 Workstation (Radiology)', category: 'hardware', type: 'Workstation', status: 'in-service', purchaseDate: '2023-06-01', warrantyEnd: '2026-06-01', refreshDue: '2027-06-01', cost: 2800, model: 'Precision 3660', assignedTo: 'nw-p14' },
];

const roadmap: RoadmapItem[] = [
  { id: 'nw-r1', tenantId: T, title: 'EHR Server Modernization', description: 'Replace EOL HP ProLiant DB server with new hardware or migrate EHR DB to Azure SQL.', quarter: '2026-Q3', status: 'in-progress', owner: 'Samuel Adeyemi', category: 'Infrastructure', progress: 20 },
  { id: 'nw-r2', tenantId: T, title: 'HIPAA Security Risk Assessment', description: 'Conduct annual HIPAA Security Rule risk assessment per 45 CFR 164.308(a)(1).', quarter: '2026-Q3', status: 'in-progress', owner: 'Hannah Weiss', category: 'Compliance', progress: 35 },
  { id: 'nw-r3', tenantId: T, title: 'Zero Trust Network Access (ZTNA)', description: 'Implement Entra Private Access + Conditional Access for PHI-bearing systems.', quarter: '2027-Q1', status: 'planned', owner: 'Ethan Carroll', category: 'Security', progress: 0 },
  { id: 'nw-r4', tenantId: T, title: 'BitLocker Full Disk Encryption Rollout', description: 'Enforce BitLocker on all managed Windows endpoints via Intune.', quarter: '2026-Q3', status: 'in-progress', owner: 'Samuel Adeyemi', category: 'Security', progress: 65 },
  { id: 'nw-r5', tenantId: T, title: 'EHR Mobile Access (Epic Haiku)', description: 'Enable Epic Haiku on managed mobile devices for clinical staff.', quarter: '2026-Q4', status: 'planned', owner: 'James Oduya', category: 'Clinical IT', progress: 5 },
  { id: 'nw-r6', tenantId: T, title: 'Secure Email Gateway Upgrade', description: 'Replace legacy SEG with Defender for Office 365 Plan 2 to prevent PHI exfiltration.', quarter: '2026-Q3', status: 'planned', owner: 'Ethan Carroll', category: 'Security', progress: 10 },
  { id: 'nw-r7', tenantId: T, title: 'HIPAA Security Awareness Training Program', description: 'Implement annual training + monthly phishing simulations for all staff.', quarter: '2026-Q2', status: 'done', owner: 'Ethan Carroll', category: 'Compliance', progress: 100 },
  { id: 'nw-r8', tenantId: T, title: 'DR / BCP Plan Update', description: 'Update Business Continuity Plan to reflect new infrastructure and personnel.', quarter: '2026-Q4', status: 'planned', owner: 'Dr. Patricia Lund', category: 'Compliance', progress: 0 },
  { id: 'nw-r9', tenantId: T, title: 'Network Segmentation for IoMT Devices', description: 'Isolate Internet of Medical Things devices on dedicated VLAN per NIST guidelines.', quarter: '2026-Q4', status: 'planned', owner: 'Samuel Adeyemi', category: 'Network', progress: 0 },
];

const qbrs: QBR[] = [
  {
    id: 'nw-q1', tenantId: T, quarter: '2026-Q2', date: '2026-06-20', status: 'completed',
    summary: 'Productive quarter. HIPAA training completed for all staff. BitLocker rollout 65% complete. EHR server capacity concern escalated to Q3 priority.',
    metrics: [
      { label: 'Ticket SLA Attainment', value: '96%', trend: 'up' },
      { label: 'Security Score', value: '79/100', trend: 'up' },
      { label: 'Open Tickets', value: '11', trend: 'up' },
      { label: 'Device Compliance', value: '84%', trend: 'up' },
      { label: 'HIPAA Training Complete', value: '100%', trend: 'up' },
    ],
    actionItems: [
      { id: 'ai1', text: 'Complete EHR server RFP — target Q3 refresh', done: false, owner: 'Samuel Adeyemi' },
      { id: 'ai2', text: 'Finish BitLocker rollout on remaining 6 devices', done: false, owner: 'Samuel Adeyemi' },
      { id: 'ai3', text: 'Investigate PHI email incident and update DLP policy', done: false, owner: 'Hannah Weiss' },
      { id: 'ai4', text: 'Procure Surface Pro for ward rounding', done: false, owner: 'Dr. Patricia Lund' },
    ],
    deckUrl: '#',
  },
  {
    id: 'nw-q2', tenantId: T, quarter: '2026-Q3', date: '2026-09-19', status: 'upcoming',
    summary: 'Upcoming QBR. Topics: EHR server refresh decision, HIPAA risk assessment results, ZTNA planning, secure email gateway.',
    metrics: [],
    actionItems: [],
    deckUrl: '#',
  },
];

function bp(id: string, category: string, period: string, budgeted: number, actual: number, projected: number, type: 'recurring' | 'one-time'): BudgetLine {
  return { id, tenantId: T, category, period, budgeted, actual, projected, type };
}

const budgetLines: BudgetLine[] = [
  bp('nw-b1', 'Cloud & SaaS Licenses', '2026-01', 7200, 7180, 7200, 'recurring'),
  bp('nw-b2', 'Cloud & SaaS Licenses', '2026-02', 7200, 7250, 7200, 'recurring'),
  bp('nw-b3', 'Cloud & SaaS Licenses', '2026-03', 7200, 7200, 7200, 'recurring'),
  bp('nw-b4', 'Cloud & SaaS Licenses', '2026-04', 7200, 7200, 7200, 'recurring'),
  bp('nw-b5', 'Cloud & SaaS Licenses', '2026-05', 7200, 7150, 7200, 'recurring'),
  bp('nw-b6', 'Cloud & SaaS Licenses', '2026-06', 7200, 7200, 7200, 'recurring'),
  bp('nw-b7', 'EHR Licensing (Epic)', '2026-01', 4000, 4000, 4000, 'recurring'),
  bp('nw-b8', 'EHR Licensing (Epic)', '2026-02', 4000, 4000, 4000, 'recurring'),
  bp('nw-b9', 'EHR Licensing (Epic)', '2026-03', 4000, 4000, 4000, 'recurring'),
  bp('nw-b10', 'EHR Licensing (Epic)', '2026-04', 4000, 4000, 4000, 'recurring'),
  bp('nw-b11', 'EHR Licensing (Epic)', '2026-05', 4000, 4000, 4000, 'recurring'),
  bp('nw-b12', 'EHR Licensing (Epic)', '2026-06', 4000, 4000, 4000, 'recurring'),
  bp('nw-b13', 'Managed IT Services', '2026-01', 5500, 5500, 5500, 'recurring'),
  bp('nw-b14', 'Managed IT Services', '2026-02', 5500, 5500, 5500, 'recurring'),
  bp('nw-b15', 'Managed IT Services', '2026-03', 5500, 5500, 5500, 'recurring'),
  bp('nw-b16', 'Managed IT Services', '2026-04', 5500, 5500, 5500, 'recurring'),
  bp('nw-b17', 'Managed IT Services', '2026-05', 5500, 5500, 5500, 'recurring'),
  bp('nw-b18', 'Managed IT Services', '2026-06', 5500, 5500, 5500, 'recurring'),
  bp('nw-b19', 'Compliance & Audit', '2026-Q2', 8000, 5500, 8000, 'one-time'),
  bp('nw-b20', 'Hardware Refresh', '2026-Q3', 25000, 0, 25000, 'one-time'),
  bp('nw-b21', 'Security Tools', '2026-01', 1800, 1800, 1800, 'recurring'),
  bp('nw-b22', 'Security Tools', '2026-02', 1800, 1800, 1800, 'recurring'),
  bp('nw-b23', 'Security Tools', '2026-03', 1800, 1800, 1800, 'recurring'),
  bp('nw-b24', 'Security Tools', '2026-04', 1800, 1800, 1800, 'recurring'),
  bp('nw-b25', 'Security Tools', '2026-05', 1800, 1800, 1800, 'recurring'),
  bp('nw-b26', 'Security Tools', '2026-06', 1800, 1850, 1800, 'recurring'),
];

const risks: Risk[] = [
  { id: 'nw-rk1', tenantId: T, title: 'EOL EHR database server', description: 'HP ProLiant DL380 Gen10 hosting EHR database is past warranty (2019 hardware). Disk near capacity. Failure would cause clinical operations outage.', severity: 'critical', likelihood: 'possible', status: 'mitigating', owner: 'Samuel Adeyemi', mitigation: 'Emergency disk cleanup done. Server refresh RFP in progress for Q3. Veeam backups verified daily.', category: 'Infrastructure' },
  { id: 'nw-rk2', tenantId: T, title: 'Potential PHI exfiltration via personal email', description: 'Suspected PHI sent to personal Gmail. Active investigation underway.', severity: 'critical', likelihood: 'possible', status: 'open', owner: 'Hannah Weiss', mitigation: 'DLP policy being reviewed. Microsoft Purview audit logs being analysed. Legal counsel notified.', category: 'Compliance' },
  { id: 'nw-rk3', tenantId: T, title: 'Incomplete BitLocker enforcement', description: '6 endpoints not yet encrypted. Breach risk if device is lost.', severity: 'high', likelihood: 'possible', status: 'mitigating', owner: 'Samuel Adeyemi', mitigation: 'Intune policy deployed. Remaining devices queued for next patch window.', category: 'Security' },
  { id: 'nw-rk4', tenantId: T, title: 'HIPAA risk assessment not annual', description: 'Last formal HIPAA risk assessment was 14 months ago. Regulatory requirement is annual.', severity: 'high', likelihood: 'almost-certain', status: 'mitigating', owner: 'Hannah Weiss', mitigation: 'Assessment in progress — Q3 completion target.', category: 'Compliance' },
  { id: 'nw-rk5', tenantId: T, title: 'No network segmentation for IoMT devices', description: 'Medical IoT devices (monitors, infusion pumps) on same VLAN as clinical workstations. NIST and HIPAA recommend segmentation.', severity: 'high', likelihood: 'unlikely', status: 'open', owner: 'Samuel Adeyemi', mitigation: 'Segmentation project planned Q4. Firewall ACLs applied as interim measure.', category: 'Network' },
  { id: 'nw-rk6', tenantId: T, title: 'MFA gaps — 3 staff not enrolled', description: 'Three staff members have not completed MFA enrollment. Conditional Access is in report-only mode for these accounts.', severity: 'medium', likelihood: 'possible', status: 'open', owner: 'Ethan Carroll', mitigation: 'Deadline communicated. If not enrolled by July 1, accounts will be blocked pending enrollment.', category: 'Security' },
];

function pts(vals: number[], startDate = '2026-01-01'): { date: string; value: number }[] {
  return vals.map((v, i) => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    return { date: d.toISOString().split('T')[0], value: v };
  });
}

const metricSeries: MetricSeries[] = [
  { id: 'nw-ms1', tenantId: T, key: 'tickets-volume', label: 'Tickets Volume', unit: 'count', points: pts([28, 32, 24, 30, 35, 22]) },
  { id: 'nw-ms2', tenantId: T, key: 'sla-attainment', label: 'SLA Attainment', unit: 'percent', points: pts([92, 94, 95, 96, 95, 96]) },
  { id: 'nw-ms3', tenantId: T, key: 'security-score', label: 'Security Score', unit: 'score', points: pts([70, 72, 74, 76, 78, 79]) },
  { id: 'nw-ms4', tenantId: T, key: 'device-compliance', label: 'Device Compliance', unit: 'percent', points: pts([75, 78, 80, 82, 83, 84]) },
  { id: 'nw-ms5', tenantId: T, key: 'license-utilization', label: 'License Utilization', unit: 'percent', points: pts([88, 89, 90, 91, 92, 90]) },
];

const documents: Document[] = [
  { id: 'nw-doc1', tenantId: T, title: 'HIPAA Security Policy', folder: 'Compliance', tags: ['hipaa', 'security', 'policy', 'compliance'], updatedAt: '2026-02-01T00:00:00Z', author: 'Hannah Weiss', excerpt: 'Northwind Health Partners HIPAA Security Rule policies and procedures.', body: '# HIPAA Security Policy\n\n## Purpose\nThis policy implements the HIPAA Security Rule requirements (45 CFR Part 164) for Northwind Health Partners.\n\n## PHI Handling\n- PHI may only be transmitted via encrypted channels\n- Do not email PHI to personal accounts — ever\n- Use Secure Patient Portal for patient communications\n\n## Workstation Security\n- Lock your screen when stepping away\n- Do not leave PHI visible on screen in public areas\n- Report lost/stolen devices immediately\n\n## Breach Reporting\nAny suspected PHI breach must be reported to the Privacy Officer within 1 hour.' },
  { id: 'nw-doc2', tenantId: T, title: 'EHR Access Guide (Epic)', folder: 'How-To Guides', tags: ['ehr', 'epic', 'guide'], updatedAt: '2026-04-01T00:00:00Z', author: 'James Oduya', excerpt: 'How to access the Epic EHR system from clinical workstations and remote locations.', body: '# EHR Access Guide\n\n## On-site access\n1. Log into your Northwind workstation\n2. Launch Epic from the desktop shortcut\n3. Use your NW network credentials\n4. MFA required for all sessions\n\n## Remote access\n- Use the VPN before launching Epic remotely\n- Epic Haiku (mobile) approved on managed devices only' },
  { id: 'nw-doc3', tenantId: T, title: 'Incident Response Procedure', folder: 'Compliance', tags: ['incident', 'security', 'hipaa', 'breach'], updatedAt: '2026-01-15T00:00:00Z', author: 'Ethan Carroll', excerpt: 'Step-by-step procedure for responding to IT security incidents at Northwind Health Partners.', body: '# Incident Response Procedure\n\n## Severity Levels\n- **P1 Critical**: PHI breach, ransomware, EHR outage — call IT immediately, 24/7\n- **P2 High**: System compromise, data exfiltration suspected\n- **P3 Medium**: Non-critical service disruption\n\n## Contact\n- IT Emergency: (555) 867-5309\n- Privacy Officer: Hannah Weiss\n- After hours: MSP on-call pager' },
  { id: 'nw-doc4', tenantId: T, title: 'New Employee IT & HIPAA Checklist', folder: 'Onboarding', tags: ['onboarding', 'hipaa', 'checklist'], updatedAt: '2026-05-01T00:00:00Z', author: 'James Oduya', excerpt: 'Day-one IT and compliance checklist for all new Northwind Health Partners staff.', body: '# New Employee IT & HIPAA Checklist\n\n## Before Day 1 (IT)\n- [ ] Account provisioned in Active Directory\n- [ ] M365 license assigned\n- [ ] MFA enrollment email sent\n- [ ] Laptop enrolled in Intune\n\n## Day 1\n- [ ] Set up MFA immediately\n- [ ] Complete HIPAA training module (mandatory — 2 hours)\n- [ ] Sign HIPAA Confidentiality Agreement\n- [ ] Review Acceptable Use Policy\n- [ ] Verify EHR access (if applicable)' },
  { id: 'nw-doc5', tenantId: T, title: 'PHI Data Handling Guidelines', folder: 'Compliance', tags: ['phi', 'data', 'hipaa', 'guidelines'], updatedAt: '2026-03-01T00:00:00Z', author: 'Hannah Weiss', excerpt: 'Approved and prohibited methods for handling Protected Health Information.', body: '# PHI Data Handling Guidelines\n\n## Approved channels\n- Epic Secure Messaging\n- Northwind Secure Patient Portal\n- Encrypted email (via Microsoft 365)\n\n## NEVER use for PHI\n- Personal email (Gmail, Yahoo, etc.)\n- SMS text messages\n- WhatsApp, iMessage, or personal apps\n- Unencrypted USB drives\n\n## Minimum Necessary Standard\nOnly access and share the minimum PHI necessary for the current task.' },
];

const forms: FormDef[] = [
  {
    id: 'nw-f1', tenantId: T, title: 'EHR Access Request', description: 'Request Epic EHR access for a new or existing staff member.', category: 'Clinical Access',
    fields: [
      { id: 'userName', label: 'Staff member name', type: 'text', required: true },
      { id: 'userEmail', label: 'Staff email', type: 'email', required: true },
      { id: 'role', label: 'Clinical role', type: 'select', required: true, options: ['Physician', 'Nurse Practitioner', 'RN', 'LPN', 'Medical Assistant', 'Admin / Billing', 'Read-only'] },
      { id: 'department', label: 'Department', type: 'text', required: true },
      { id: 'justification', label: 'Access justification', type: 'textarea', required: true },
      { id: 'hipaaConfirm', label: 'Staff member has completed HIPAA training', type: 'checkbox', required: true },
    ],
  },
  {
    id: 'nw-f2', tenantId: T, title: 'Security Incident Report', description: 'Report a security incident or potential PHI breach.', category: 'Security',
    fields: [
      { id: 'type', label: 'Incident type', type: 'select', required: true, options: ['Suspected PHI breach', 'Lost/stolen device', 'Phishing email', 'Ransomware', 'Unauthorized access', 'Other'] },
      { id: 'description', label: 'Describe the incident', type: 'textarea', required: true },
      { id: 'when', label: 'When did it occur?', type: 'date', required: true },
      { id: 'phiInvolved', label: 'Was PHI potentially involved?', type: 'checkbox', required: false },
      { id: 'urgency', label: 'Is this an active/ongoing threat?', type: 'checkbox', required: false },
    ],
  },
  {
    id: 'nw-f3', tenantId: T, title: 'Remote Work Equipment Request', description: 'Request equipment for remote or hybrid working arrangements.', category: 'Hardware',
    fields: [
      { id: 'equipment', label: 'Equipment needed', type: 'select', required: true, options: ['Laptop', 'External monitor', 'Webcam', 'Headset', 'Docking station', 'VPN token'] },
      { id: 'justification', label: 'Business justification', type: 'textarea', required: true },
      { id: 'managerApproval', label: 'Manager email for approval', type: 'email', required: true },
    ],
  },
];

const apps: AppTile[] = [
  { id: 'nw-app1', tenantId: T, name: 'Outlook', category: 'Productivity', description: 'Email and calendar', color: '#0078d4', icon: 'Mail' },
  { id: 'nw-app2', tenantId: T, name: 'Microsoft Teams', category: 'Communication', description: 'Chat, calls, and meetings', color: '#6264a7', icon: 'MessageSquare' },
  { id: 'nw-app3', tenantId: T, name: 'Epic EHR', category: 'Clinical', description: 'Electronic Health Records system', color: '#c41230', icon: 'FileHeart' },
  { id: 'nw-app4', tenantId: T, name: 'Power BI', category: 'Analytics', description: 'Clinical and operational reporting', color: '#f2c811', icon: 'BarChart3' },
  { id: 'nw-app5', tenantId: T, name: 'Northwind Patient Portal', category: 'Clinical', description: 'Secure patient communication', color: '#0d9488', icon: 'Heart' },
  { id: 'nw-app6', tenantId: T, name: 'SharePoint', category: 'Productivity', description: 'Policies, documents, and team sites', color: '#0078d4', icon: 'FolderOpen' },
  { id: 'nw-app7', tenantId: T, name: 'OneDrive', category: 'Storage', description: 'Secure cloud file storage', color: '#0078d4', icon: 'Cloud' },
  { id: 'nw-app8', tenantId: T, name: 'Azure Portal', category: 'IT Admin', description: 'Microsoft Azure management', color: '#0089d6', icon: 'Server' },
  { id: 'nw-app9', tenantId: T, name: 'Veeam Backup Console', category: 'IT Admin', description: 'Backup and recovery management', color: '#00b336', icon: 'HardDrive' },
  { id: 'nw-app10', tenantId: T, name: 'Defender Portal', category: 'Security', description: 'Microsoft 365 security center', color: '#107c10', icon: 'Shield' },
];

const news: NewsItem[] = [
  {
    id: 'nw-n1', tenantId: T, title: 'URGENT: PHI Incident Investigation Underway', category: 'Security', publishedAt: '2026-06-30T08:00:00Z', author: 'Hannah Weiss', pinned: true,
    excerpt: 'IT and Compliance are investigating a potential PHI breach. If you received or sent patient data outside approved channels, contact the Privacy Officer immediately.',
    body: '# PHI Incident Notice\n\nThe Compliance and IT teams are investigating a potential PHI data breach.\n\n## What you should do\n- Do NOT delete any emails from the past 30 days\n- If you sent any patient data to a personal email, contact Hannah Weiss immediately\n- Do not discuss this with patients or outside parties\n\n**Contact**: h.weiss@northwindhealthpartners.org or (555) 400-1234',
  },
  {
    id: 'nw-n2', tenantId: T, title: 'HIPAA Training completed — 100% compliance achieved', category: 'Compliance', publishedAt: '2026-05-30T10:00:00Z', author: 'Ethan Carroll',
    excerpt: 'All Northwind Health Partners staff have completed mandatory HIPAA security awareness training. Thank you for your commitment to patient privacy.',
    body: '# HIPAA Training Complete\n\nWe are pleased to confirm that **100% of staff** have completed the mandatory HIPAA Security Awareness Training for 2026.\n\n## What was covered\n- PHI handling and minimum necessary standard\n- Phishing and social engineering\n- Device security and remote work\n- Breach reporting procedures\n\nTraining certificates have been filed. Next training: Q1 2027.',
  },
  {
    id: 'nw-n3', tenantId: T, title: 'EHR server emergency disk cleanup — no patient impact', category: 'Infrastructure', publishedAt: '2026-06-30T09:00:00Z', author: 'Samuel Adeyemi',
    excerpt: 'The EHR database server hit a storage warning this morning. IT resolved the issue within 2 hours. No patient data was affected.',
    body: '# EHR Server Storage Incident — Resolved\n\n**Date**: June 30, 2026\n**Status**: Resolved\n\n## What happened\nThe EHR database server triggered a storage warning at 94% disk utilization. IT was alerted at 6:15am and resolved the issue by 8:00am by clearing log files and archiving older data.\n\n## Patient impact\nNone. Epic remained operational throughout.\n\n## Next steps\nA permanent solution (server replacement or storage expansion) is planned for Q3.',
  },
  {
    id: 'nw-n4', tenantId: T, title: 'New: Clinical Data Analyst joins June 9 — Vera Korolev', category: 'Announcement', publishedAt: '2026-06-05T09:00:00Z', author: 'Grace Nakamura',
    excerpt: 'Welcome Vera Korolev, our new Clinical Data Analyst, joining Northwind Health Partners on June 9.',
    body: '# Welcome Vera Korolev\n\nWe are excited to welcome **Vera Korolev** as our new Clinical Data Analyst starting June 9.\n\nVera holds an MS in Health Informatics and brings experience in Epic reporting, SQL, and clinical outcome analysis. She will be working with James Oduya to enhance our clinical data capabilities.\n\nPlease welcome Vera warmly!',
  },
];

const activity: ActivityItem[] = [
  { id: 'nw-act1', tenantId: T, type: 'security', title: 'Critical: EHR server storage alert', detail: 'Server NW-SRV-003 hit 94% disk — IT responded within 30 minutes.', at: '2026-06-30T06:15:00Z', actor: 'Samuel Adeyemi', icon: 'AlertTriangle' },
  { id: 'nw-act2', tenantId: T, type: 'security', title: 'PHI incident investigation opened', detail: 'Potential PHI exfiltration via personal email. Compliance investigating.', at: '2026-06-30T07:30:00Z', actor: 'Hannah Weiss', icon: 'ShieldAlert' },
  { id: 'nw-act3', tenantId: T, type: 'compliance', title: 'HIPAA training 100% complete', detail: 'All staff completed 2026 mandatory HIPAA training module.', at: '2026-05-30T12:00:00Z', actor: 'Ethan Carroll', icon: 'CheckCircle' },
  { id: 'nw-act4', tenantId: T, type: 'onboarding', title: 'Vera Korolev onboarding complete', detail: 'M365 E3 account, laptop, and EHR access provisioned.', at: '2026-06-08T16:00:00Z', actor: 'Samuel Adeyemi', icon: 'UserPlus' },
  { id: 'nw-act5', tenantId: T, type: 'security', title: 'BitLocker rollout — 65% complete', detail: '26 of 40 endpoints now encrypted. Remaining devices in next patch window.', at: '2026-06-25T14:00:00Z', actor: 'Samuel Adeyemi', icon: 'Lock' },
];

export const northwindSeed: TenantSeed = {
  tenantId: T,
  personas,
  people: allPeople,
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
  apps,
  news,
  activity,
};
