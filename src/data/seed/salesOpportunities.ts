import type { ConnectWiseAgreement, Ticket } from '@/services/types';

const agreements: Record<string, ConnectWiseAgreement[]> = {
  brightwater: [{
    id: 'agreement-bw-managed', tenantId: 'brightwater', externalId: 'CW-AGR-4107',
    name: 'Brightwater Managed Services', type: 'Managed Services', status: 'active',
    startDate: '2025-10-01', endDate: '2026-09-30', autoRenew: true, renewalNoticeDays: 60,
    billingCycle: 'monthly', monthlyAmount: 6840, currency: 'USD', coveredUsers: 28,
    coveredDevices: 22, sla: '24×7 critical response; 4 business-hour standard response',
    contractContacts: [
      { name: 'Sarah Okonkwo', role: 'IT Manager', email: 'sarah.okonkwo@brightwaterlogistics.com' },
      { name: 'Amara Diallo', role: 'Finance Lead', email: 'amara.diallo@brightwaterlogistics.com' },
    ],
    addOns: ['After-hours critical support', 'Quarterly technology review'],
    exclusions: ['Project labor', 'Hardware purchases', 'Third-party software subscriptions'],
    lineItems: [
      { id: 'bw-li-1', name: 'Managed Help Desk', description: 'Remote support for covered users', quantity: 28, unitPrice: 145, monthlyAmount: 4060 },
      { id: 'bw-li-2', name: 'Network Management', description: 'Monitoring and management for two sites', quantity: 2, unitPrice: 790, monthlyAmount: 1580 },
      { id: 'bw-li-3', name: 'Microsoft 365 Administration', description: 'Identity and tenant administration', quantity: 28, unitPrice: 30, monthlyAmount: 840 },
      { id: 'bw-li-4', name: 'Quarterly Technology Review', description: 'Roadmap and planning review', quantity: 1, unitPrice: 360, monthlyAmount: 360 },
    ],
    sourceUpdatedAt: '2026-07-18T14:22:00Z',
  }],
  cedarvine: [{
    id: 'agreement-cv-managed', tenantId: 'cedarvine', externalId: 'CW-AGR-4172',
    name: 'Cedar & Vine Hospitality Care', type: 'Managed Services', status: 'active',
    startDate: '2026-01-01', endDate: '2026-12-31', autoRenew: true, renewalNoticeDays: 45,
    billingCycle: 'monthly', monthlyAmount: 4975, currency: 'USD', coveredUsers: 18,
    coveredDevices: 19, sla: '7am–11pm support; 30-minute critical response',
    contractContacts: [
      { name: 'Isabella Fontaine', role: 'Director of Operations', email: 'isabella.fontaine@cedarandvine.com' },
      { name: 'Rafael Moreno', role: 'Front Desk Manager', email: 'rafael.moreno@cedarandvine.com' },
    ],
    addOns: ['Weekend support', 'PCI quarterly review'],
    exclusions: ['POS vendor support', 'Guest Wi-Fi cabling', 'New-location projects'],
    lineItems: [
      { id: 'cv-li-1', name: 'Hospitality Help Desk', description: 'Extended-hours user support', quantity: 18, unitPrice: 155, monthlyAmount: 2790 },
      { id: 'cv-li-2', productCatalogId: 'product-managed-antivirus', name: 'Managed Antivirus', description: 'Managed endpoint antivirus protection', quantity: 19, unitPrice: 13, monthlyAmount: 247 },
      { id: 'cv-li-3', name: 'Network & Wi-Fi Management', description: 'Corporate and guest network management', quantity: 3, unitPrice: 496, monthlyAmount: 1488 },
      { id: 'cv-li-4', name: 'PCI Advisory', description: 'Quarterly PCI readiness review', quantity: 1, unitPrice: 450, monthlyAmount: 450 },
    ],
    sourceUpdatedAt: '2026-07-19T09:10:00Z',
  }],
  northwind: [{
    id: 'agreement-nw-managed', tenantId: 'northwind', externalId: 'CW-AGR-3998',
    name: 'Northwind Healthcare Managed IT', type: 'Managed Services', status: 'expiring',
    startDate: '2023-09-01', endDate: '2026-08-31', autoRenew: false, renewalNoticeDays: 90,
    billingCycle: 'monthly', monthlyAmount: 13750, currency: 'USD', coveredUsers: 43,
    coveredDevices: 48, sla: '24×7 support; 15-minute priority-one response; HIPAA escalation path',
    contractContacts: [
      { name: 'Dr. Patricia Lund', role: 'Chief Information Officer', email: 'p.lund@northwindhealthpartners.org' },
      { name: 'Hannah Weiss', role: 'Compliance & Privacy Officer', email: 'h.weiss@northwindhealthpartners.org' },
    ],
    addOns: ['HIPAA incident escalation', 'Monthly security review', 'After-hours clinical support'],
    exclusions: ['EHR application support', 'Medical device support', 'Major infrastructure projects'],
    lineItems: [
      { id: 'nw-li-1', name: 'Healthcare Help Desk', description: '24×7 support for covered users', quantity: 43, unitPrice: 180, monthlyAmount: 7740 },
      { id: 'nw-li-2', productCatalogId: 'product-managed-siem', name: 'Managed SIEM', description: 'Managed security information and event monitoring', quantity: 48, unitPrice: 34, monthlyAmount: 1632 },
      { id: 'nw-li-3', productCatalogId: 'product-email-security', name: 'Advanced Email Security', description: 'Email threat protection', quantity: 43, unitPrice: 8, monthlyAmount: 344 },
      { id: 'nw-li-4', name: 'Infrastructure Management', description: 'Server and network management', quantity: 1, unitPrice: 2834, monthlyAmount: 2834 },
      { id: 'nw-li-5', name: 'vCIO & Compliance Advisory', description: 'HIPAA roadmap and executive advisory', quantity: 1, unitPrice: 1200, monthlyAmount: 1200 },
    ],
    sourceUpdatedAt: '2026-07-20T11:05:00Z',
  }],
};

const signalTemplates: Record<string, Array<[string, string, string, string]>> = {
  brightwater: [
    ['Potential phishing emails reaching dispatch', 'Security', 'Several dispatchers received convincing delivery-failure messages this month.', 'No recurring security awareness program is listed on the agreement; discuss training and phishing simulations.'],
    ['Restore test failed for shared operations folder', 'Backup', 'A deleted route workbook could not be recovered from the available snapshot.', 'Agreement has no managed backup line item. Recovery coverage should be reviewed.'],
    ['Malware alert on unmanaged warehouse laptop', 'Security', 'A warehouse laptop displayed a malware warning and was isolated manually.', 'Endpoint coverage appears inconsistent across warehouse devices.'],
    ['New depot opening needs technology plan', 'Planning', 'Operations expects a new depot with twelve users and fifteen devices next quarter.', 'Expansion likely changes covered user and device counts.'],
    ['Repeated VPN instability for drivers', 'Network', 'Remote users continue to report intermittent VPN drops during dispatch windows.', 'Recurring friction may warrant a network modernization project before renewal.'],
    ['Insurance questionnaire requests vulnerability scans', 'Compliance', 'The cyber insurer requested evidence of quarterly external and internal scans.', 'Vulnerability management is not listed on the current agreement.'],
  ],
  cedarvine: [
    ['Seasonal staff targeted by credential phishing', 'Security', 'Three seasonal employees entered credentials into a fake scheduling site.', 'EDR is present, but recurring awareness training and email protection are not.'],
    ['Front desk mailbox deleted reservation messages', 'Backup', 'Reservation emails were deleted and native retention did not restore the full thread.', 'Microsoft 365 backup is not included in the agreement.'],
    ['Guest Wi-Fi capacity complaints during events', 'Network', 'Conference guests report severe Wi-Fi slowdown during sold-out weekends.', 'A wireless capacity assessment could support an expansion project.'],
    ['PCI scan found aging payment workstation', 'Compliance', 'The quarterly scan identified unsupported software on a payment workstation.', 'A vulnerability management service could make remediation continuous.'],
    ['New property acquisition technology review', 'Planning', 'Leadership is evaluating a second property with twenty-five rooms.', 'The account may need a standardized opening package and expanded coverage.'],
    ['Shared admin passwords remain in use', 'Security', 'Managers report a shared local administrator password across back-office PCs.', 'Identity hardening and managed privileged access are outside current coverage.'],
  ],
  northwind: [
    ['Clinical share restore exceeded eight hours', 'Backup', 'Recovery of a deleted clinical operations folder took most of the business day.', 'Managed backup and disaster recovery are not listed on the agreement.'],
    ['Recurring storage alerts on EHR-adjacent server', 'Infrastructure', 'The same server has crossed the critical storage threshold three times.', 'A capacity remediation project should precede an aggressive upsell.'],
    ['HIPAA risk assessment remediation backlog', 'Compliance', 'Twelve medium findings remain open from the latest risk assessment.', 'Existing advisory could expand into managed vulnerability remediation.'],
    ['Renewal concerns after support escalations', 'Account', 'The CIO requested an executive review after repeated response-time escalations.', 'Prioritize retention and service recovery because the agreement expires soon.'],
    ['Unprotected Microsoft 365 recovery requirement', 'Backup', 'Compliance requested immutable recovery for executive and clinical mailboxes.', 'Microsoft 365 backup is not listed in the agreement.'],
    ['New outpatient clinic planned for Q4', 'Planning', 'The planned clinic adds fourteen staff and eighteen managed endpoints.', 'Expansion could increase covered counts after retention concerns are addressed.'],
  ],
};

function buildTickets(tenantId: string): Ticket[] {
  const prefix = tenantId === 'brightwater' ? 'BW' : tenantId === 'cedarvine' ? 'CV' : 'NW';
  const requester = tenantId === 'brightwater' ? 'bw-p1' : tenantId === 'cedarvine' ? 'cv-p1' : 'nw-p1';
  return signalTemplates[tenantId].map(([subject, category, body, internal], index) => ({
    id: `${tenantId}-sales-signal-${index + 1}`,
    tenantId,
    number: `${prefix}-OPP-${String(index + 1).padStart(3, '0')}`,
    subject,
    status: index % 3 === 0 ? 'open' : 'resolved',
    isClosed: false,
    priority: index % 3 === 0 ? 'high' : 'medium',
    requesterId: requester,
    assignee: 'boxIT Service Team',
    category,
    createdAt: `2026-0${index + 1}-12T14:00:00Z`,
    updatedAt: `2026-0${index + 1}-14T16:30:00Z`,
    messages: [
      { id: `${tenantId}-opp-${index + 1}-request`, author: 'Client contact', authorType: 'requester', body, at: `2026-0${index + 1}-12T14:00:00Z` },
      { id: `${tenantId}-opp-${index + 1}-internal`, author: 'Account team', authorType: 'agent', body: internal, at: `2026-0${index + 1}-14T16:30:00Z`, internal: true },
    ],
  }));
}

export function getDemoAgreements(tenantId: string): ConnectWiseAgreement[] {
  return agreements[tenantId] ?? [];
}

export function getSalesSignalTickets(tenantId: string): Ticket[] {
  return signalTemplates[tenantId] ? buildTickets(tenantId) : [];
}
