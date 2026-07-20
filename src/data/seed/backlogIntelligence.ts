import type { BacklogIntelligenceSnapshot } from '@/services/types';

/**
 * Synthetic scanner output derived from hack-shield-sample-tickets.json.
 * This is the staff-only, display-safe snapshot boundary: the UI renders these
 * facts and never recalculates priority or exposes raw ticket notes.
 */
export const backlogIntelligenceSnapshot: BacklogIntelligenceSnapshot = {
  schemaVersion: 'backlog-intelligence/v1',
  scoringVersion: 'queue-signal-demo/1.0.0',
  generatedAt: '2026-07-20T08:35:00-04:00',
  scope: {
    type: 'organization',
    queueIds: ['NOC', 'Service Desk'],
    timezone: 'America/New_York',
  },
  dataQuality: {
    ticketSourceFreshThrough: '2026-07-20T08:30:00-04:00',
    historyCoverage: 'partial',
    limitations: [
      'Historical ticket relationships may be incomplete.',
      'The demo fixture contains synthetic, anonymized records only.',
      'Monitoring and documentation states reflect the supplied scanner snapshot and are not live.',
      'Last meaningful activity, owner history, and account mapping are not present in the source fixture.',
    ],
  },
  summary: {
    scannedTicketCount: 10,
    eligibleTicketCount: 4,
    flaggedTicketCount: 4,
    countsByPriorityBand: {
      ACT_NOW: 2,
      REVIEW_TODAY: 1,
      MONITOR: 1,
    },
  },
  items: [
    {
      itemId: 'cluster:site-d-cloud-app-01-authentication:2026-07-20',
      itemType: 'CLUSTER',
      primaryTicketExternalId: 'DEMO-4001',
      clusterDisposition: 'PRIMARY',
      memberTicketExternalIds: ['DEMO-4001', 'DEMO-4002'],
      riskScore: 75,
      priorityBand: 'ACT_NOW',
      recommendedLane: 'SERVICE_DESK_TRIAGE',
      plannedWorkState: 'NOT_APPLICABLE',
      confidence: 'HIGH',
      attentionReasons: [
        'The SLA is due within four business hours and eight users are affected.',
        'A matching user report indicates a shared sign-in issue, while intake was skipped.',
      ],
      factorBreakdown: {
        agePressure: 0,
        slaProximity: 20,
        bounceCount: 0,
        staleness: 0,
        waitingStateDecay: 0,
        missingInformation: 10,
        clientWeight: 0,
        modifiers: { recurrence: 25, multiUserImpact: 10, intakeSkipped: 10 },
      },
      suggestedHumanAction: {
        actionType: 'ESCALATE',
        summary:
          'Confirm the shared identity-provider impact, retain DEMO-4001 as the parent, and route the evidence to service desk triage.',
      },
      dataQualityNotes: [
        'Monitoring state is unavailable for this application.',
        'Last meaningful activity was not present in the source fixture.',
      ],
      display: {
        title: 'Shared cloud sign-in issue',
        queue: 'Service Desk',
        ageHours: 1.4,
        hoursSinceMeaningfulActivity: null,
        slaState: 'AT_RISK',
        affectedUsersEstimate: 8,
        serviceSummary: 'Cloud application authentication',
        recurrenceWindow: '2 related reports in 8 minutes',
      },
    },
    {
      itemId: 'cluster:site-a-gateway-01-wan-primary:2026-07-20',
      itemType: 'CLUSTER',
      primaryTicketExternalId: 'DEMO-1001',
      clusterDisposition: 'PRIMARY',
      memberTicketExternalIds: ['DEMO-1001', 'DEMO-1002', 'DEMO-1003', 'DEMO-1004'],
      riskScore: 55,
      priorityBand: 'ACT_NOW',
      recommendedLane: 'NETWORK_ENGINEER',
      plannedWorkState: 'NOT_APPLICABLE',
      confidence: 'HIGH',
      attentionReasons: [
        'Nine related WAN flap events occurred in a compressed time window.',
        'The service recovered, but root cause is unresolved and circuit documentation is missing.',
      ],
      factorBreakdown: {
        agePressure: 0,
        slaProximity: 0,
        bounceCount: 0,
        staleness: 0,
        waitingStateDecay: 0,
        missingInformation: 10,
        clientWeight: 0,
        modifiers: { recurrence: 25, siteImpact: 15, handoffRisk: 5 },
      },
      suggestedHumanAction: {
        actionType: 'ESCALATE',
        summary:
          'Review the parent incident with network engineering, prepare ISP evidence, and retain the recovered alerts as bundled evidence.',
      },
      dataQualityNotes: [
        'Circuit and firewall documentation is missing.',
        'Last meaningful activity was not present in the source fixture.',
      ],
      display: {
        title: 'Proactive WAN instability investigation',
        queue: 'NOC',
        ageHours: 17.2,
        hoursSinceMeaningfulActivity: null,
        slaState: 'ON_TRACK',
        affectedUsersEstimate: 45,
        serviceSummary: 'Primary WAN / gateway-01',
        recurrenceWindow: '9 related events in 24 hours',
      },
    },
    {
      itemId: 'cluster:site-b-wireless-zone-01-access-layer:2026-07-20',
      itemType: 'CLUSTER',
      primaryTicketExternalId: 'DEMO-2001',
      clusterDisposition: 'PRIMARY',
      memberTicketExternalIds: ['DEMO-2001', 'DEMO-2002', 'DEMO-2003'],
      riskScore: 40,
      priorityBand: 'REVIEW_TODAY',
      recommendedLane: 'NETWORK_ENGINEER',
      plannedWorkState: 'NOT_APPLICABLE',
      confidence: 'HIGH',
      attentionReasons: [
        'Four access-layer interruptions occurred in under three hours across sibling components.',
        'A reassignment plus a missing asset record weakens an otherwise ready engineer handoff.',
      ],
      factorBreakdown: {
        agePressure: 0,
        slaProximity: 0,
        bounceCount: 5,
        staleness: 0,
        waitingStateDecay: 0,
        missingInformation: 10,
        clientWeight: 5,
        modifiers: { recurrence: 20 },
      },
      suggestedHumanAction: {
        actionType: 'ENRICH',
        summary:
          'Review the shared upstream dependency with network engineering and add the missing asset record to the briefing.',
      },
      dataQualityNotes: [
        'One related asset record is missing.',
        'Last meaningful activity was not present in the source fixture.',
      ],
      display: {
        title: 'Recurring wireless access-layer interruptions',
        queue: 'NOC',
        ageHours: 15.6,
        hoursSinceMeaningfulActivity: null,
        slaState: 'ON_TRACK',
        affectedUsersEstimate: 25,
        serviceSummary: 'Wireless zone 01 / access layer',
        recurrenceWindow: '4 related events in 24 hours',
      },
    },
    {
      itemId: 'ticket:DEMO-3001',
      itemType: 'TICKET',
      primaryTicketExternalId: 'DEMO-3001',
      clusterDisposition: 'SINGLETON',
      memberTicketExternalIds: ['DEMO-3001'],
      riskScore: 5,
      priorityBand: 'MONITOR',
      recommendedLane: 'WATCH',
      plannedWorkState: 'NOT_APPLICABLE',
      confidence: 'HIGH',
      attentionReasons: [
        'The monitoring event recovered quickly with no active impact.',
        'No recurrence signal or matching active parent is present in the available snapshot.',
      ],
      factorBreakdown: {
        agePressure: 0,
        slaProximity: 0,
        bounceCount: 0,
        staleness: 0,
        waitingStateDecay: 0,
        missingInformation: 0,
        clientWeight: 0,
        modifiers: { isolatedRecoveryWatch: 5 },
      },
      suggestedHumanAction: {
        actionType: 'MONITOR',
        summary:
          'Keep this event in the watch lane and attach it to a parent only if matching recurrence appears.',
      },
      dataQualityNotes: [
        'Historical recurrence coverage is partial.',
        'Last meaningful activity was not present in the source fixture.',
      ],
      display: {
        title: 'Recovered network collector alert',
        queue: 'NOC',
        ageHours: 10.8,
        hoursSinceMeaningfulActivity: null,
        slaState: 'UNKNOWN',
        affectedUsersEstimate: 0,
        serviceSummary: 'Network monitoring collector',
        recurrenceWindow: '1 event in 30 days',
      },
    },
  ],
  topPatterns: [
    {
      title: 'Recovered alerts are masking recurrence',
      summary: 'Two active network investigations account for five bundled, self-recovered alerts.',
      itemIds: [
        'cluster:site-a-gateway-01-wan-primary:2026-07-20',
        'cluster:site-b-wireless-zone-01-access-layer:2026-07-20',
      ],
    },
    {
      title: 'SLA-sensitive work needs a named lane',
      summary:
        'Three operational items are SLA-sensitive and already have a recommended human review lane.',
      itemIds: [
        'cluster:site-d-cloud-app-01-authentication:2026-07-20',
        'cluster:site-a-gateway-01-wan-primary:2026-07-20',
        'cluster:site-b-wireless-zone-01-access-layer:2026-07-20',
      ],
    },
    {
      title: 'Documentation gaps weaken handoffs',
      summary:
        'The WAN and wireless investigations both lack supporting configuration or asset records.',
      itemIds: [
        'cluster:site-a-gateway-01-wan-primary:2026-07-20',
        'cluster:site-b-wireless-zone-01-access-layer:2026-07-20',
      ],
    },
  ],
  suggestedDispatchAgenda: [
    {
      rank: 1,
      itemId: 'cluster:site-d-cloud-app-01-authentication:2026-07-20',
      summary:
        'Confirm the shared sign-in impact and establish DEMO-4001 as the human-reviewed parent.',
    },
    {
      rank: 2,
      itemId: 'cluster:site-a-gateway-01-wan-primary:2026-07-20',
      summary: 'Send the WAN recurrence evidence to network engineering before the SLA deadline.',
    },
    {
      rank: 3,
      itemId: 'cluster:site-b-wireless-zone-01-access-layer:2026-07-20',
      summary: 'Validate the shared dependency and complete the missing asset context.',
    },
    {
      rank: 4,
      itemId: 'ticket:DEMO-3001',
      summary: 'Leave the recovered collector alert in the watch lane unless recurrence appears.',
    },
  ],
};
