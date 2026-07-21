import type {
  BacklogIntelligenceItem,
  BacklogIntelligenceSnapshot,
  BacklogPriorityBand,
} from '@/services/types';

type SourceFinding = readonly [
  externalTicketId: string,
  boardName: string,
  status: string,
  priority: string,
  accountName: string,
  assignedResource: string,
  openAgeDays: number,
  inactiveDays: number,
  attentionBand: Exclude<BacklogPriorityBand, 'MONITOR' | 'NO_ACTION'>,
  auditVerifiedOpen: boolean,
  tenantId: 'brightwater' | 'cedarvine' | 'northwind',
  requesterPersonaId: string,
];

/**
 * Display-safe projection of the supplied backlog-processing/v3 report.
 *
 * The source contains 83 findings. To keep the demo page useful and responsive,
 * this fixture includes the first ten ACT_NOW/REVIEW_TODAY findings and ten
 * representative REVIEW_THIS_WEEK findings. Aggregate cards retain the full
 * report totals. Numeric attention scores are a deterministic UI projection of
 * the source band, age, inactivity, assignment, and audit-verification fields;
 * they are not scores emitted by the source report.
 */
const sourceFindings: SourceFinding[] = [
  ['822871', 'NOC', 'Child Ticket (Bundled)', 'P1b Attn. Dispatch', 'Brightwater Logistics', 'Bert Gonzales', 321, 108, 'ACT_NOW', true, 'brightwater', 'bw-admin'],
  ['870375', 'NOC', 'Child Ticket (Bundled)', 'P1b Attn. Dispatch', 'Brightwater Logistics', '(unassigned)', 35, 34, 'ACT_NOW', true, 'brightwater', 'bw-user'],
  ['839767', 'Mt. Arlington/Consult Services', 'Child Ticket (Bundled)', 'P5 Proactive-High', 'Brightwater Logistics', '(unassigned)', 216, 66, 'REVIEW_TODAY', true, 'brightwater', 'bw-admin'],
  ['851710', 'Mt. Arlington/Consult Services', 'Child Ticket (Bundled)', 'P2 Urgent', 'Brightwater Logistics', 'Dylan Bradley', 139, 66, 'REVIEW_TODAY', true, 'brightwater', 'bw-admin'],
  ['854334', 'Mt. Arlington/Consult Services', 'Child Ticket (Bundled)', 'P3 Standard', 'Brightwater Logistics', '(unassigned)', 123, 108, 'REVIEW_TODAY', true, 'brightwater', 'bw-user'],
  ['855288', 'Mt. Arlington/Consult Services', 'Child Ticket (Bundled)', 'P4 Normal', 'Brightwater Logistics', '(unassigned)', 117, 108, 'REVIEW_TODAY', true, 'brightwater', 'bw-admin'],
  ['855664', 'Mt. Arlington/Consult Services', 'Child Ticket (Bundled)', 'P4 Normal', 'Brightwater Logistics', '(unassigned)', 115, 108, 'REVIEW_TODAY', true, 'brightwater', 'bw-admin'],
  ['855928', 'Mt. Arlington/Consult Services', 'Child Ticket (Bundled)', 'P4 Normal', 'Brightwater Logistics', '(unassigned)', 112, 108, 'REVIEW_TODAY', false, 'brightwater', 'bw-user'],
  ['857037', 'Mt. Arlington/Consult Services', 'Child Ticket (Bundled)', 'P4 Normal', 'Cedar & Vine Hospitality', '(unassigned)', 105, 102, 'REVIEW_TODAY', false, 'cedarvine', 'cv-user'],
  ['858016', 'Mt. Arlington/Consult Services', 'Waiting For Assignment', 'P4 Normal', 'Cedar & Vine Hospitality', '(unassigned)', 98, 98, 'REVIEW_TODAY', false, 'cedarvine', 'cv-admin'],
  ['834321', 'Mt. Arlington/Consult Services', 'On-site Required', 'P5 Proactive-High', 'Cedar & Vine Hospitality', '(unassigned)', 251, 31, 'REVIEW_THIS_WEEK', true, 'cedarvine', 'cv-user'],
  ['849514', 'Mt. Arlington/Consult Services', 'On-site Required', 'P5 Proactive-High', 'Cedar & Vine Hospitality', 'Andy Fram', 152, 31, 'REVIEW_THIS_WEEK', true, 'cedarvine', 'cv-admin'],
  ['851974', 'Mt. Arlington/Consult Services', 'Assigned', 'P5 Proactive-High', 'Cedar & Vine Hospitality', 'Thomas Bernstein', 138, 31, 'REVIEW_THIS_WEEK', true, 'cedarvine', 'cv-admin'],
  ['855217', 'Mt. Arlington/Consult Services', 'Assigned', 'P5 Proactive-High', 'Cedar & Vine Hospitality', 'Julius Dela Cruz', 117, 55, 'REVIEW_THIS_WEEK', true, 'cedarvine', 'cv-user'],
  ['855665', 'Mt. Arlington/Consult Services', 'Assigned', 'P5 Proactive-High', 'Northwind Health Partners', 'Simon Paverd', 115, 49, 'REVIEW_THIS_WEEK', false, 'northwind', 'nw-admin'],
  ['859472', 'Mt. Arlington/Consult Services', 'In Progress', 'P5 Proactive-High', 'Northwind Health Partners', 'Derrick Lafayette', 90, 55, 'REVIEW_THIS_WEEK', false, 'northwind', 'nw-user'],
  ['861156', 'Mt. Arlington/Consult Services', 'Assigned', 'P4 Normal', 'Northwind Health Partners', 'Thomas Bernstein', 80, 59, 'REVIEW_THIS_WEEK', false, 'northwind', 'nw-admin'],
  ['863717', 'Mt. Arlington/Consult Services', 'Assigned', 'P4 Normal', 'Northwind Health Partners', '(unassigned)', 74, 38, 'REVIEW_THIS_WEEK', false, 'northwind', 'nw-user'],
  ['864089', 'Mt. Arlington/Consult Services', 'Assigned', 'P5 Proactive-High', 'Northwind Health Partners', '(unassigned)', 70, 59, 'REVIEW_THIS_WEEK', false, 'northwind', 'nw-admin'],
  ['864596', 'Mt. Arlington/Consult Services', 'On-site Required', 'P5 Proactive-High', 'Northwind Health Partners', '(unassigned)', 67, 31, 'REVIEW_THIS_WEEK', false, 'northwind', 'nw-user'],
];

const bandBaseScore: Record<SourceFinding[8], number> = {
  ACT_NOW: 65,
  REVIEW_TODAY: 45,
  REVIEW_THIS_WEEK: 25,
};

interface TicketScenario {
  title: string;
  summary: string;
  action: string;
}

const ticketScenarios: Record<string, TicketScenario> = {
  '822871': {
    title: 'Recurring ISP packet loss at branch office',
    summary:
      'The customer reported intermittent ISP drops. A technician began collecting circuit evidence, but the investigation has not been updated.',
    action:
      'Ask the assigned technician to follow up with the customer liaison and ISP, confirm the circuit status, and document the next escalation step.',
  },
  '870375': {
    title: 'Backup circuit continues to flap',
    summary:
      'Monitoring recorded repeated failovers to the backup circuit, but no technician owns the follow-up and the last customer update is stale.',
    action:
      'Assign a network technician, validate the latest monitoring evidence, and contact the customer liaison before opening or updating the ISP case.',
  },
  '839767': {
    title: 'Firewall maintenance follow-up is overdue',
    summary:
      'A firewall maintenance child ticket remained open after the planned change window without confirmation that validation checks were completed.',
    action:
      'Have dispatch confirm the maintenance outcome with the engineer and customer, record the validation results, and close only if no follow-up remains.',
  },
  '851710': {
    title: 'Remote-access failures awaiting technician update',
    summary:
      'The customer reported repeated VPN failures. Initial logs were collected, but the assigned technician has not posted a recent diagnosis or next step.',
    action:
      'Ask the assigned technician to review the logs, update the customer liaison, and either schedule remediation or document the remaining blocker.',
  },
  '854334': {
    title: 'Conference-room Wi-Fi remains unstable',
    summary:
      'Users reported unstable wireless service in a conference area. Basic troubleshooting started, but no owner has confirmed whether the issue persists.',
    action:
      'Assign a technician to contact the site liaison, confirm current impact, and schedule an on-site wireless survey if remote validation is inconclusive.',
  },
  '855288': {
    title: 'DNS errors after network cutover',
    summary:
      'Intermittent DNS failures were reported after a network change. The ticket contains early troubleshooting but no documented post-change validation.',
    action:
      'Assign an engineer to verify DNS forwarding and recent change records, then provide the customer with a clear resolution or rollback plan.',
  },
  '855664': {
    title: 'Switch power alert needs hardware decision',
    summary:
      'A switch power-supply warning was acknowledged, but the record does not show whether replacement hardware or an on-site visit was approved.',
    action:
      'Confirm the switch health with monitoring, check warranty or spare availability, and coordinate an RMA or site visit with the customer liaison.',
  },
  '855928': {
    title: 'Mailbox migration record may be sync-stale',
    summary:
      'The AI platform still shows an incomplete mailbox migration, but the ConnectWise audit state was not retrieved and the work may already be closed.',
    action:
      'Check the current ConnectWise ticket and migration status first; if already completed, correct the sync discrepancy instead of reopening customer work.',
  },
  '857037': {
    title: 'Endpoint alert may already be resolved in PSA',
    summary:
      'An endpoint-health finding remains open in the AI view, but its current ConnectWise status was not verified during the scan.',
    action:
      'Reconcile the ticket against ConnectWise before assigning work; close the AI-side finding if PSA shows the alert was resolved or converted.',
  },
  '858016': {
    title: 'Backup failure awaiting assignment and sync check',
    summary:
      'A backup failure appears unassigned and stale, but incomplete audit history means the ConnectWise ticket may have changed status outside the AI platform.',
    action:
      'Verify the live ConnectWise status and latest backup result, then assign recovery work only if the failure is still active.',
  },
  '834321': {
    title: 'On-site cabling remediation lacks closure notes',
    summary:
      'A site visit was requested for a suspected cabling fault, but the ticket does not confirm whether the visit occurred or service was restored.',
    action:
      'Contact the site liaison and scheduled technician, confirm the visit outcome, and record test results before closing or rescheduling the work.',
  },
  '849514': {
    title: 'Wireless access-point replacement needs confirmation',
    summary:
      'An access-point replacement was planned, but the stale ticket has no installation result or post-replacement coverage check.',
    action:
      'Ask the assigned technician to confirm installation, capture a health check, and update the customer on any remaining wireless gaps.',
  },
  '851974': {
    title: 'Server storage alert lacks current evidence',
    summary:
      'A storage-capacity alert was assigned for review, but no recent utilization evidence or remediation decision has been documented.',
    action:
      'Have the assigned engineer refresh capacity data, confirm growth risk with the customer, and propose cleanup or expansion with a target date.',
  },
  '855217': {
    title: 'Vendor DNS case has gone quiet',
    summary:
      'A vendor escalation was opened for intermittent DNS behavior, but neither the vendor response nor the customer-facing update is current.',
    action:
      'Ask the owner to chase the vendor, update the customer liaison, and set a dated checkpoint for escalation or an alternate mitigation.',
  },
  '855665': {
    title: 'Printer fleet issue may be closed in ConnectWise',
    summary:
      'The AI view still lists a printer deployment issue, but audit verification was incomplete and ConnectWise may already contain the final resolution.',
    action:
      'Confirm the live ConnectWise status before contacting the customer; if resolved, repair the sync state and preserve the PSA closure notes.',
  },
  '859472': {
    title: 'EDR sensor investigation has an uncertain PSA state',
    summary:
      'An EDR sensor-health investigation appears in progress, but the AI platform did not verify its latest ConnectWise activity or terminal status.',
    action:
      'Review the current ConnectWise record and sensor telemetry first, then continue engineering work only if the endpoint remains unhealthy.',
  },
  '861156': {
    title: 'Shared-drive access ticket needs status reconciliation',
    summary:
      'A permissions issue remains assigned in the AI view, but the missing audit pass means the customer request may have been completed in ConnectWise.',
    action:
      'Reconcile the AI record with ConnectWise, confirm access with the requester only if still open, and correct any stale platform status.',
  },
  '863717': {
    title: 'SaaS access request has conflicting ownership',
    summary:
      'The ticket appears assigned while no resource owner is available in the scan, suggesting incomplete or stale synchronization from ConnectWise.',
    action:
      'Check ConnectWise for the current owner and status, repair the ownership sync, and dispatch the request only if it remains actionable.',
  },
  '864089': {
    title: 'MFA enrollment cleanup may no longer be open',
    summary:
      'An MFA enrollment follow-up is still visible to the AI platform, but its ConnectWise audit state was not confirmed.',
    action:
      'Verify the user and ticket state in ConnectWise before outreach; if enrollment is complete, clear the stale AI finding and retain the closure evidence.',
  },
  '864596': {
    title: 'ISP router replacement status did not synchronize',
    summary:
      'An on-site router replacement still appears pending, but the AI platform lacks verified ConnectWise activity and may be showing an obsolete status.',
    action:
      'Confirm the ConnectWise work order and device status first; coordinate the site liaison and ISP only if the replacement is genuinely outstanding.',
  },
};

function projectFinding(source: SourceFinding): BacklogIntelligenceItem {
  const [
    externalTicketId,
    boardName,
    status,
    priority,
    accountName,
    assignedResource,
    openAgeDays,
    inactiveDays,
    priorityBand,
    auditVerifiedOpen,
    tenantId,
    requesterPersonaId,
  ] = source;
  const isUnassigned = assignedResource === '(unassigned)';
  const isBundledChild = status === 'Child Ticket (Bundled)';
  const scenario = ticketScenarios[externalTicketId];
  const agePressure = Math.min(15, Math.floor(openAgeDays / 60) * 5);
  const staleness = Math.min(10, Math.floor(inactiveDays / 30) * 5);
  const missingInformation = auditVerifiedOpen ? 0 : 10;
  const modifiers: Record<string, number> = {
    operationalPriority: bandBaseScore[priorityBand],
    ...(isUnassigned ? { unassigned: 5 } : {}),
  };
  const riskScore = Math.min(
    100,
    agePressure + staleness + missingInformation + Object.values(modifiers).reduce((a, b) => a + b, 0)
  );

  return {
    itemId: `ticket:${externalTicketId}`,
    tenantId,
    requesterPersonaId,
    itemType: 'TICKET',
    primaryTicketExternalId: externalTicketId,
    clusterDisposition: isBundledChild ? 'BUNDLE' : 'SINGLETON',
    memberTicketExternalIds: [externalTicketId],
    riskScore,
    priorityBand,
    recommendedLane: isUnassigned ? 'DISPATCH' : boardName.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
    plannedWorkState: 'NOT_APPLICABLE',
    confidence: auditVerifiedOpen ? 'HIGH' : 'MEDIUM',
    attentionReasons: [
      scenario.summary,
      `Opened ${openAgeDays} calendar days ago; no meaningful activity for ${inactiveDays} days.`,
      isUnassigned ? 'Unassigned — no resource owner.' : `Assigned to ${assignedResource}.`,
      auditVerifiedOpen
        ? 'Verified open in the PSA audit trail.'
        : 'PSA audit verification was not completed in this scan.',
    ],
    factorBreakdown: {
      agePressure,
      slaProximity: 0,
      bounceCount: 0,
      staleness,
      waitingStateDecay: 0,
      missingInformation,
      clientWeight: 0,
      modifiers,
    },
    suggestedHumanAction: {
      actionType: 'FOLLOW_UP',
      summary: scenario.action,
    },
    dataQualityNotes: auditVerifiedOpen
      ? []
      : ['Audit trail was not retrieved for this ticket because the scan hit response-volume limits.'],
    display: {
      title: `${accountName} · ${scenario.title}`,
      queue: boardName,
      ageHours: openAgeDays * 24,
      hoursSinceMeaningfulActivity: inactiveDays * 24,
      slaState: 'UNKNOWN',
      affectedUsersEstimate: 0,
      serviceSummary: priority,
      recurrenceWindow: isBundledChild ? 'Bundled child; parent not confirmed' : 'Standalone ticket',
      accountName,
      assignedResource,
      ticketStatus: status,
      auditVerifiedOpen,
    },
  };
}

const items = sourceFindings.map(projectFinding).sort((a, b) => b.riskScore - a.riskScore);

export const backlogIntelligenceSnapshot: BacklogIntelligenceSnapshot = {
  schemaVersion: 'backlog-intelligence/v1',
  scoringVersion: 'report-band-projection/1.0.0',
  generatedAt: '2026-07-21T13:15:00Z',
  scope: {
    type: 'organization',
    queueIds: ['Mt. Arlington/Consult Services', 'Prevent', 'IaaS', 'NOC', 'SOC'],
    timezone: 'America/New_York',
  },
  dataQuality: {
    ticketSourceFreshThrough: '2026-07-21T13:15:00Z',
    historyCoverage: 'partial',
    limitations: [
      'Audit-trail verification was completed on approximately 20 of 91 candidates.',
      'Unverified findings use provider last-updated activity and may already be closed in PSA.',
      'Eight type-converted tickets were confirmed closed in PSA while still appearing open in Forge.',
      'Authoritative SLA state was unavailable, so every finding reports UNKNOWN.',
    ],
  },
  summary: {
    scannedTicketCount: 106,
    eligibleTicketCount: 106,
    flaggedTicketCount: 83,
    countsByPriorityBand: {
      ACT_NOW: 2,
      REVIEW_TODAY: 38,
      REVIEW_THIS_WEEK: 43,
      MONITOR: 0,
    },
    unassignedCount: 64,
    bundledChildCount: 21,
    syncStaleTicketCount: 8,
    displayedItemCount: items.length,
  },
  items,
  topPatterns: [
    {
      title: 'Unassigned work is the largest actionable slice',
      summary: '64 of 83 stagnant findings have no resource owner.',
      itemIds: items.filter((item) => item.display.assignedResource === '(unassigned)').map((item) => item.itemId),
    },
    {
      title: 'Type conversion is creating a status sync gap',
      summary: 'Eight Service tickets converted to Project Issue tickets were closed in PSA but still appeared open in Forge.',
      itemIds: [],
    },
    {
      title: 'Consult Services dominates the backlog',
      summary: '66 of 83 findings belong to the Mt. Arlington/Consult Services board.',
      itemIds: items.filter((item) => item.display.queue === 'Mt. Arlington/Consult Services').map((item) => item.itemId),
    },
  ],
  suggestedDispatchAgenda: items.slice(0, 4).map((item, index) => ({
    rank: index + 1,
    itemId: item.itemId,
    summary: `${item.primaryTicketExternalId}: ${item.suggestedHumanAction.summary}`,
  })),
};
