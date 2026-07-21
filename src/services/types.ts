// ─── Shared API contract types ───────────────────────────────────────────────

export interface Page<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  filters?: Record<string, string | string[] | undefined>;
}

// ─── Auth / Persona ───────────────────────────────────────────────────────────

export type Role = 'client-admin' | 'client-user';

export interface Persona {
  id: string;
  tenantId: string;
  name: string;
  title: string;
  email: string;
  role: Role;
  avatarInitials: string;
}

// ─── Person ───────────────────────────────────────────────────────────────────

export type PersonStatus = 'active' | 'onboarding' | 'offboarding' | 'suspended';

/**
 * Derived (server-computed) classification of an M365-enriched account, used
 * to hide non-human accounts from the People directory by default.
 * `undefined` on a Person (no CIPP match) is treated as `human`.
 */
export type AccountClass =
  | 'human'
  | 'guest'
  | 'shared-mailbox'
  | 'room-mailbox'
  | 'equipment-mailbox'
  | 'unlicensed';

export interface Person {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  title: string;
  role: string; // job role / title text
  department: string;
  manager?: string;
  status: PersonStatus;
  avatarInitials: string;
  startDate: string; // ISO date
  deviceIds: string[];
  licenseIds: string[];
  groups: string[];
  // ─── Enrichment (optional; filled by PeopleEnrichmentService from CIPP/M365) ──
  userPrincipalName?: string;
  accountEnabled?: boolean;
  mfaStatus?: string;
  lastSignIn?: string; // ISO datetime
  m365Licenses?: string[]; // friendly names (resolved at enrichment time)
  /** Raw M365 skuIds not yet resolved to a friendly name; resolved lazily via
   *  `PeopleService.resolveM365Licenses` on the person drill-down page. */
  m365UnresolvedSkuIds?: string[];
  m365Groups?: string[];
  /** Which enrichment source, if any, matched and merged onto this person. */
  enrichedBy?: 'cipp';
  /** Computed by `classifyAccount`; drives the People directory's non-human hide/toggle. */
  accountClass?: AccountClass;
}

// ─── Device ───────────────────────────────────────────────────────────────────

export type DeviceType = 'laptop' | 'workstation' | 'mobile' | 'tablet' | 'server';
export type DeviceStatus = 'healthy' | 'warning' | 'critical' | 'offline';

/** RMM vendor that can enrich a ConnectWise-sourced Device with real telemetry. */
export type EnrichmentSource = 'ninjarmm' | 'addigy';

/** Best-effort hardware specs surfaced only by enrichment (CW has no equivalent). */
export interface DeviceHardware {
  cpu?: string;
  ramBytes?: number;
  diskBytes?: number;
}

export interface Device {
  id: string;
  tenantId: string;
  name: string;
  type: DeviceType;
  os: string;
  owner?: string; // personId
  status: DeviceStatus;
  compliant: boolean;
  lastSeen: string; // ISO datetime
  serial: string;
  model: string;
  // ─── Enrichment (optional; filled by DeviceEnrichmentService from NinjaRMM/Addigy) ──
  manufacturer?: string;
  online?: boolean;
  hardware?: DeviceHardware;
  /** Last logged-in user, as reported by the enrichment source (NinjaRMM/Addigy). */
  lastLoggedIn?: string;
  /** Which source last set `lastSeen`; defaults to ConnectWise when unenriched. */
  lastSeenSource?: 'connectwise' | EnrichmentSource;
  /** Which enrichment source, if any, matched and merged onto this device. */
  enrichedBy?: EnrichmentSource;
  /** Raw ConnectWise configuration type name (e.g. "Office Inventory"). Undeployed stock is flagged via this. */
  configurationType?: string;
}

// ─── Device detail (rich per-device telemetry, sourced lazily from NinjaRMM) ──

export interface DeviceProcessorInfo {
  name?: string;
  architecture?: string;
  cores?: number;
  logicalCores?: number;
  clockSpeedHz?: number;
}

export interface DeviceVolumeInfo {
  name?: string;
  driveLetter?: string;
  label?: string;
  fileSystem?: string;
  capacityBytes?: number;
  freeBytes?: number;
  bitLocker?: { protectionStatus?: string; conversionStatus?: string; encryptionMethod?: string };
}

export interface DeviceDiskInfo {
  model?: string;
  manufacturer?: string;
  interfaceType?: string;
  mediaType?: string;
  sizeBytes?: number;
  smartStatus?: string;
}

export interface DeviceNetworkAdapter {
  name?: string;
  type?: string;
  status?: string;
  ipAddresses?: string[];
  macAddresses?: string[];
  gateway?: string;
  dnsServers?: string[];
}

export interface DeviceWarranty {
  startDate?: string; // ISO date
  endDate?: string; // ISO date
}

/** Rich per-device telemetry, sourced lazily from NinjaRMM. */
export interface DeviceDetail {
  deviceId: string; // portal Device.id this detail belongs to
  source: EnrichmentSource; // 'ninjarmm'
  processors?: DeviceProcessorInfo[];
  cpuArchitecture?: string; // convenience: processors[0].architecture
  ramBytes?: number;
  volumes?: DeviceVolumeInfo[];
  disks?: DeviceDiskInfo[];
  networkAdapters?: DeviceNetworkAdapter[];
  localIps?: string[];
  publicIp?: string;
  domain?: string;
  domainRole?: string;
  timezone?: string;
  warranty?: DeviceWarranty;
  /** All custom fields keyed by their Ninja key. */
  customFields?: Record<string, string>;
  /** The 4 requested boxIT custom fields, resolved by fuzzy key match. */
  boxit?: {
    avInstalled?: string;
    azureAdJoined?: string;
    domainJoinStatus?: string;
    cpuArchitecture?: string;
    publicFirewallEnabled?: string;
    domainFirewallEnabled?: string;
    privateFirewallEnabled?: string;
  };
  /** Parsed "Location" custom field (JSON object), if present and valid. */
  location?: Record<string, unknown>;
}

// ─── License ──────────────────────────────────────────────────────────────────
// Modeled per-SKU (one row per licensed product per tenant), with seat counts —
// mirrors how M365/CIPP actually reports licenses (e.g. "Microsoft 365 E3 —
// 42/50 assigned"), not a row per individual assignment.

export type LicenseStatus = 'in_use' | 'unused';

export interface License {
  id: string;          // stable per (tenant, sku)
  tenantId: string;
  product: string;     // friendly name, e.g. "Microsoft 365 E3"
  sku: string;          // skuPartNumber, e.g. "SPE_E3"
  totalUnits: number;   // total seats
  consumedUnits: number; // assigned seats
  status: LicenseStatus; // consumedUnits > 0 ? 'in_use' : 'unused'
  costPerMonth?: number; // OPTIONAL — no CIPP source yet; kept for a future price book
  /** Users holding this per-SKU license, for the license detail page's
   *  "Assigned users" list. Materialized onto the list output (mock: reverse
   *  `Person.licenseIds` lookup; rest: CIPP join in `licenseHandlers.list`)
   *  so the sync's warm `synced_entities` snapshot carries it — no separate
   *  live route. Matched CW people carry `personId`; unmatched M365-only
   *  accounts are display-only. */
  assignedUsers?: LicenseAssignedUser[];
}

/** One user holding a given License, surfaced on the license detail page. */
export interface LicenseAssignedUser {
  personId?: string;   // portal /people/:id when matched to the CW roster; absent = display-only
  name: string;
  email: string;       // UPN / primary email
  department?: string;
}

// ─── Ticket ───────────────────────────────────────────────────────────────────

export type TicketStatus = 'open' | 'in-progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketMessage {
  id: string;
  author: string;
  authorType: 'requester' | 'agent' | 'system';
  body: string;
  at: string; // ISO datetime
  internal?: boolean; // internal/staff-only note — hidden from client (viewer) users
  kind?: 'note' | 'time'; // 'time' = derived from a CW time entry; default/undefined = a service note
  hours?: number;         // logged hours, present for time entries
}

export interface TicketAttachment {
  id: string;        // CW document id (string)
  name: string;      // fileName or title
  url: string;       // same-origin proxy URL: /api/tickets/{ticketId}/images/{docId}
  isImage: boolean;
  referenced: boolean; // true if this image is inlined into a message body
  internal: boolean;   // true if referenced ONLY by internal notes (staff-only)
}

export interface Ticket {
  id: string;
  tenantId: string;
  number: string;
  subject: string;
  status: TicketStatus;
  isClosed: boolean; // maps to ConnectWise ticket `closedFlag`
  priority: TicketPriority;
  requesterId: string;
  assignee?: string;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
  category: string;
  messages: TicketMessage[];
  attachments?: TicketAttachment[];
}

// ─── Sales opportunities / generated ConnectWise agreements ─────────────────

export type ProductPricingModel = 'flat' | 'per-user' | 'per-device';

export interface ProductCatalogItem {
  id: string;
  name: string;
  category: string;
  description: string;
  aliases: string[];
  pricingModel: ProductPricingModel;
  monthlyPriceLow: number;
  monthlyPriceHigh: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgreementLineItem {
  id: string;
  productCatalogId?: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  monthlyAmount: number;
}

export interface ConnectWiseAgreement {
  id: string;
  tenantId: string;
  externalId: string;
  name: string;
  type: string;
  status: 'active' | 'expiring' | 'expired';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  renewalNoticeDays: number;
  billingCycle: 'monthly' | 'quarterly' | 'annual';
  monthlyAmount: number;
  currency: 'USD';
  coveredUsers: number;
  coveredDevices: number;
  sla: string;
  contractContacts: Array<{ name: string; role: string; email: string }>;
  addOns: string[];
  exclusions: string[];
  lineItems: AgreementLineItem[];
  sourceUpdatedAt: string;
}

export type SalesOpportunityKind = 'gap' | 'expansion' | 'renewal' | 'retention' | 'other';
export type SalesOpportunityPriority = 'high' | 'medium' | 'low';

export interface SalesOpportunityEvidence {
  sourceType: 'agreement' | 'ticket' | 'churn';
  sourceId: string;
  label: string;
  href: string;
}

export interface SalesOpportunityFinding {
  fingerprint: string;
  tenantId: string;
  catalogProductId?: string;
  title: string;
  category: string;
  kind: SalesOpportunityKind;
  priority: SalesOpportunityPriority;
  confidence: number;
  monthlyValueLow: number | null;
  monthlyValueHigh: number | null;
  rationale: string;
  suggestedApproach: string;
  evidence: SalesOpportunityEvidence[];
  sentAt?: string;
  sentBy?: string;
}

export interface SalesOpportunityAnalysis {
  tenantId: string;
  analyzedAt: string;
  model: string;
  sourceSummary: {
    agreementCount: number;
    ticketCount: number;
    catalogProductCount: number;
    churnScore: number | null;
  };
  findings: SalesOpportunityFinding[];
}

export interface SalesOpportunityContext {
  tenantId: string;
  tenantName: string;
  agreements: ConnectWiseAgreement[];
  ticketCount: number;
  churn: {
    score: number;
    assessment: string;
    suggestedActions: string;
    assessedAt: string;
  } | null;
}

export interface CreateTicketInput {
  subject: string;
  priority: TicketPriority;
  category: string;
  body: string;
  requesterId: string;
}

export interface UpdateTicketStatusInput {
  status: TicketStatus;
}

export interface CreateTicketReplyInput {
  body: string;
}

// ─── Asset ────────────────────────────────────────────────────────────────────

export type AssetCategory = 'hardware' | 'software';
export type AssetStatus = 'in-service' | 'aging' | 'eol' | 'retired';

export interface Asset {
  id: string;
  tenantId: string;
  name: string;
  category: AssetCategory;
  type: string;
  status: AssetStatus;
  purchaseDate: string; // ISO date
  warrantyEnd: string; // ISO date
  refreshDue: string; // ISO date
  cost: number;
  model: string;
  assignedTo?: string; // personId
}

// ─── Roadmap ──────────────────────────────────────────────────────────────────

export type RoadmapStatus = 'planned' | 'in-progress' | 'done' | 'blocked';

export interface RoadmapItem {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  quarter: string; // e.g. "2025-Q3"
  status: RoadmapStatus;
  owner: string;
  category: string;
  progress: number; // 0–100
}

// ─── QBR ──────────────────────────────────────────────────────────────────────

export type QBRStatus = 'completed' | 'upcoming';

export interface QBRMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'flat';
}

export interface QBRActionItem {
  id: string;
  text: string;
  done: boolean;
  owner: string;
}

export interface QBR {
  id: string;
  tenantId: string;
  quarter: string;
  date: string; // ISO date
  status: QBRStatus;
  summary: string;
  metrics: QBRMetric[];
  actionItems: QBRActionItem[];
  deckUrl: string;
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export type BudgetLineType = 'recurring' | 'one-time';

export interface BudgetLine {
  id: string;
  tenantId: string;
  category: string;
  period: string; // YYYY-MM
  budgeted: number;
  actual: number;
  projected: number;
  type: BudgetLineType;
}

// ─── Risk ─────────────────────────────────────────────────────────────────────

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskLikelihood = 'rare' | 'unlikely' | 'possible' | 'likely' | 'almost-certain';
export type RiskStatus = 'open' | 'mitigating' | 'accepted' | 'closed';

export interface Risk {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  severity: RiskSeverity;
  likelihood: RiskLikelihood;
  status: RiskStatus;
  owner: string;
  mitigation: string;
  category: string;
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export interface MetricPoint {
  date: string; // ISO date (YYYY-MM-DD)
  value: number;
}

export interface MetricSeries {
  id: string;
  tenantId: string;
  key: string;
  label: string;
  unit: string;
  points: MetricPoint[];
}

export interface DashboardKPIs {
  openTickets: number;
  securityScore: number;
  securityTrend: 'up' | 'down' | 'flat';
  licensesUsed: number;
  licensesTotal: number;
  unusedMonthlyCost: number;
  devicesCompliantPct: number;
  devicesHealthy: number;
  devicesTotal: number;
}

// ─── Document ─────────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  tenantId: string;
  title: string;
  folder: string;
  tags: string[];
  updatedAt: string; // ISO datetime
  author: string;
  body: string; // markdown
  excerpt: string;
}

// ─── Forms ────────────────────────────────────────────────────────────────────

export type FormFieldType = 'text' | 'textarea' | 'select' | 'email' | 'number' | 'date' | 'checkbox';

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface FormDef {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  category: string;
  fields: FormField[];
}

export interface FormSubmission {
  id: string;
  formId: string;
  tenantId: string;
  values: Record<string, unknown>;
  submittedAt: string; // ISO datetime
  submittedBy: string; // personId or persona name
}

// ─── News ─────────────────────────────────────────────────────────────────────

export interface NewsItem {
  id: string;
  tenantId: string;
  title: string;
  category: string;
  publishedAt: string; // ISO datetime
  author: string;
  excerpt: string;
  body: string; // markdown
  pinned?: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export interface ActionStep {
  id: string;
  label: string;
  fields?: FormField[];
}

export interface ActionTicketConfig {
  summaryTemplate: string;       // e.g. "New hire: {{firstName}} {{lastName}}"
  descriptionTemplate: string;   // multi-line, {{fieldId}} tokens
  priority: TicketPriority;      // fixed
  category: string;              // fixed (portal display; CW ignores it)
}

export interface ActionDef {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  category: string;
  enabled: boolean;
  steps: ActionStep[];
  ticket: ActionTicketConfig;
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export interface ActivityItem {
  id: string;
  tenantId: string;
  type: string;
  title: string;
  detail: string;
  at: string; // ISO datetime
  actor: string;
  icon?: string;
}

// ─── Backlog Intelligence (staff-only scanner projection) ──────────────────────

export type BacklogPriorityBand = 'ACT_NOW' | 'REVIEW_TODAY' | 'MONITOR' | 'NO_ACTION';
export type BacklogClusterDisposition = 'PRIMARY' | 'BUNDLE' | 'SINGLETON';
export type BacklogPlannedWorkState = 'CURRENT' | 'PLAN_STALE' | 'NOT_APPLICABLE';
export type BacklogConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type BacklogSlaState = 'BREACHED' | 'AT_RISK' | 'ON_TRACK' | 'UNKNOWN';

export interface BacklogFactorBreakdown {
  agePressure: number;
  slaProximity: number;
  bounceCount: number;
  staleness: number;
  waitingStateDecay: number;
  missingInformation: number;
  clientWeight: number;
  modifiers?: Record<string, number>;
}

export interface BacklogSuggestedHumanAction {
  actionType:
    | 'ESCALATE'
    | 'REQUEST_INFO'
    | 'FOLLOW_UP'
    | 'ENRICH'
    | 'MERGE'
    | 'SCHEDULE'
    | 'CLOSE_CANDIDATE'
    | 'MONITOR';
  summary: string;
}

/** Display-safe fields emitted by the scanner alongside the canonical risk facts. */
export interface BacklogItemDisplay {
  title: string;
  queue: string;
  ageHours: number;
  hoursSinceMeaningfulActivity: number | null;
  slaState: BacklogSlaState;
  affectedUsersEstimate: number;
  serviceSummary: string;
  recurrenceWindow: string;
  nextCheckpoint?: string;
  waitingParty?: string;
  followUpDueAt?: string;
}

export interface BacklogIntelligenceItem {
  itemId: string;
  itemType: 'CLUSTER' | 'TICKET';
  primaryTicketExternalId: string;
  clusterDisposition: BacklogClusterDisposition;
  memberTicketExternalIds: string[];
  riskScore: number;
  priorityBand: BacklogPriorityBand;
  recommendedLane: string;
  plannedWorkState: BacklogPlannedWorkState;
  confidence: BacklogConfidence;
  attentionReasons: string[];
  factorBreakdown: BacklogFactorBreakdown;
  suggestedHumanAction: BacklogSuggestedHumanAction;
  dataQualityNotes: string[];
  display: BacklogItemDisplay;
}

export interface BacklogIntelligenceSnapshot {
  schemaVersion: 'backlog-intelligence/v1';
  scoringVersion: string;
  generatedAt: string;
  scope: {
    type: 'organization' | 'queue' | 'account';
    queueIds: string[];
    timezone: string;
  };
  dataQuality: {
    ticketSourceFreshThrough: string;
    historyCoverage: 'complete' | 'partial' | 'unknown';
    limitations: string[];
  };
  summary: {
    scannedTicketCount: number;
    eligibleTicketCount: number;
    flaggedTicketCount: number;
    countsByPriorityBand: Record<'ACT_NOW' | 'REVIEW_TODAY' | 'MONITOR', number>;
  };
  items: BacklogIntelligenceItem[];
  topPatterns: Array<{
    title: string;
    summary: string;
    itemIds: string[];
  }>;
  suggestedDispatchAgenda: Array<{
    rank: number;
    itemId: string;
    summary: string;
  }>;
}

// ─── Seed aggregate ───────────────────────────────────────────────────────────

export interface TenantSeed {
  tenantId: string;
  personas: Persona[];
  people: Person[];
  devices: Device[];
  licenses: License[];
  tickets: Ticket[];
  assets: Asset[];
  roadmap: RoadmapItem[];
  qbrs: QBR[];
  budgetLines: BudgetLine[];
  risks: Risk[];
  metricSeries: MetricSeries[];
  documents: Document[];
  forms: FormDef[];
  news: NewsItem[];
  activity: ActivityItem[];
}

// ─── Service interfaces ───────────────────────────────────────────────────────

export interface TicketService {
  list(tenantId: string, params?: ListParams): Promise<Page<Ticket>>;
  get(tenantId: string, id: string): Promise<Ticket | null>;
  create(tenantId: string, input: CreateTicketInput): Promise<Ticket>;
  updateStatus(tenantId: string, id: string, input: UpdateTicketStatusInput): Promise<Ticket>;
  reply(tenantId: string, id: string, input: CreateTicketReplyInput): Promise<Ticket>;
}

export interface PeopleService {
  list(tenantId: string, params?: ListParams): Promise<Page<Person>>;
  /**
   * Fetch a single person. Enriched with CIPP/M365 data by default; pass
   * `{ enrich: false }` for a fast CW-only fetch that skips the (slow) CIPP
   * enrichment (used by the person drill-down to render immediately, then
   * re-fetch enriched in the background).
   */
  get(tenantId: string, id: string, opts?: { enrich?: boolean }): Promise<Person | null>;
  /** Lazily, live-resolve a person's unresolved M365 license skuIds to friendly
   *  names. Unresolved skuIds are dropped, not returned. */
  resolveM365Licenses(tenantId: string, id: string): Promise<string[]>;
}

export interface DeviceService {
  list(tenantId: string, params?: ListParams): Promise<Page<Device>>;
  get(tenantId: string, id: string): Promise<Device | null>;
  listForPerson(tenantId: string, personId: string): Promise<Device[]>;
  getDetail(tenantId: string, id: string): Promise<DeviceDetail | null>;
  getLiveTelemetry(tenantId: string, id: string): Promise<Device | null>;
}

export interface LicenseService {
  list(tenantId: string, params?: ListParams): Promise<Page<License>>;
  /**
   * Mock-path-only convenience: which per-SKU License rows a person's
   * `licenseIds` reference (there is no single "assignee" on a per-SKU row
   * anymore). In `rest` mode, a person's real M365 license info comes from
   * person enrichment (`PeopleService.get`/`resolveM365Licenses`), NOT from
   * this domain — the CIPP `licenses` connector only implements `list`, so
   * `restLicenseService.listForPerson` is a best-effort no-op (see its
   * comment in `src/services/rest/licenses.ts`).
   */
  listForPerson(tenantId: string, personId: string): Promise<License[]>;
}

export interface AssetService {
  list(tenantId: string, params?: ListParams): Promise<Page<Asset>>;
  get(tenantId: string, id: string): Promise<Asset | null>;
}

export interface RoadmapService {
  list(tenantId: string, params?: ListParams): Promise<Page<RoadmapItem>>;
  get(tenantId: string, id: string): Promise<RoadmapItem | null>;
}

export interface QBRService {
  list(tenantId: string, params?: ListParams): Promise<Page<QBR>>;
  get(tenantId: string, id: string): Promise<QBR | null>;
}

export interface BudgetService {
  list(tenantId: string, params?: ListParams): Promise<Page<BudgetLine>>;
}

export interface RiskService {
  list(tenantId: string, params?: ListParams): Promise<Page<Risk>>;
  get(tenantId: string, id: string): Promise<Risk | null>;
}

export interface MetricsService {
  listSeries(tenantId: string, params?: ListParams): Promise<Page<MetricSeries>>;
  getSeries(tenantId: string, key: string): Promise<MetricSeries | null>;
  getDashboard(tenantId: string): Promise<DashboardKPIs>;
}

export interface DocumentService {
  list(tenantId: string, params?: ListParams): Promise<Page<Document>>;
  get(tenantId: string, id: string): Promise<Document | null>;
}

export interface FormService {
  list(tenantId: string, params?: ListParams): Promise<Page<FormDef>>;
  get(tenantId: string, id: string): Promise<FormDef | null>;
  submit(tenantId: string, formId: string, values: Record<string, unknown>, submittedBy: string): Promise<FormSubmission>;
  listSubmissions(tenantId: string, submittedBy: string, params?: ListParams): Promise<Page<FormSubmission>>;
}

export interface NewsService {
  list(tenantId: string, params?: ListParams): Promise<Page<NewsItem>>;
  get(tenantId: string, id: string): Promise<NewsItem | null>;
}

export interface ActionService {
  listDefs(tenantId: string, params?: ListParams): Promise<Page<ActionDef>>;
  getDef(tenantId: string, key: string): Promise<ActionDef | null>;
}

export interface ActivityService {
  list(tenantId: string, params?: ListParams): Promise<Page<ActivityItem>>;
}

// ─── Permission-aware assistant ───────────────────────────────────────

export interface AssistantCitation {
  sourceId: string;
  recordType: string;
  recordId: string;
  title: string;
  href: string;
}

export interface AssistantConversation {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  citations: AssistantCitation[];
  createdAt: string;
}

export type AssistantStreamEvent =
  | { type: 'message.delta'; delta: string }
  | { type: 'message.completed'; message: AssistantMessage }
  | { type: 'error'; message: string; retryable: boolean };

export interface AssistantService {
  status(tenantId: string): Promise<{ enabled: boolean }>;
  listConversations(tenantId: string): Promise<AssistantConversation[]>;
  createConversation(tenantId: string): Promise<AssistantConversation>;
  listMessages(tenantId: string, conversationId: string): Promise<AssistantMessage[]>;
  deleteConversation(tenantId: string, conversationId: string): Promise<void>;
  sendMessage(
    tenantId: string,
    conversationId: string,
    input: { content: string; requestId: string; currentPath?: string },
    onEvent: (event: AssistantStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void>;
}

export interface BacklogIntelligenceService {
  getSnapshot(): Promise<BacklogIntelligenceSnapshot>;
}

export interface SalesOpportunityService {
  status(tenantId: string): Promise<{ enabled: boolean }>;
  context(tenantId: string): Promise<SalesOpportunityContext>;
  latest(tenantId: string): Promise<SalesOpportunityAnalysis | null>;
  analyze(tenantId: string): Promise<SalesOpportunityAnalysis>;
  sendToConnectWise(tenantId: string, fingerprint: string): Promise<SalesOpportunityFinding>;
}

// ─── Prefetch / drilldown cache controller ────────────────────────────────────

/** Synchronous cache snapshot for the People & Devices "Person detail" panel. */
export interface PersonDrilldownSnapshot {
  person: Person;
  devices: Device[];
  licenses: License[];
  m365ExtraLicenses: string[];
}

/** Synchronous cache snapshot for the People & Devices "Device detail" panel.
 *  `detail` is `undefined` when the NinjaRMM detail hasn't been warmed yet
 *  (caller should still lazy-fetch it), `null` when it was fetched and there
 *  is none, or the resolved `DeviceDetail` on a full hit. */
export interface DeviceDrilldownSnapshot {
  device: Device;
  owner: Person | null;
  detail: DeviceDetail | null | undefined;
}

/**
 * Controller exposed on `Services.prefetch`, backed by the client-side
 * drilldown cache installed over `people`/`devices`/`licenses`. Warms are
 * fire-and-forget and idempotent per tenant; `peek*` is a synchronous,
 * cache-only read used to render a drilldown with zero skeleton flash.
 */
export interface PrefetchController {
  /** Warm every person's drilldown data (devices list, licenses, unresolved M365 SKUs). */
  warmPeopleDrilldowns(tenantId: string): void;
  /** Warm every device's rich NinjaRMM detail. */
  warmDeviceDrilldowns(tenantId: string): void;
  /** Synchronous fresh-cache snapshot for a person drilldown, or `undefined` on a miss. */
  peekPersonDrilldown(tenantId: string, id: string): PersonDrilldownSnapshot | undefined;
  /** Synchronous fresh-cache snapshot for a device drilldown, or `undefined` on a miss. */
  peekDeviceDrilldown(tenantId: string, id: string): DeviceDrilldownSnapshot | undefined;
  /** Drop the cached entry for one tenant, or every tenant when omitted. */
  invalidate(tenantId?: string): void;
}

// ─── Services aggregate ───────────────────────────────────────────────────────

export interface Services {
  tickets: TicketService;
  people: PeopleService;
  devices: DeviceService;
  licenses: LicenseService;
  assets: AssetService;
  roadmap: RoadmapService;
  qbr: QBRService;
  budget: BudgetService;
  risk: RiskService;
  metrics: MetricsService;
  documents: DocumentService;
  forms: FormService;
  news: NewsService;
  actions: ActionService;
  activity: ActivityService;
  assistant: AssistantService;
  backlogIntelligence: BacklogIntelligenceService;
  salesOpportunities: SalesOpportunityService;
  prefetch: PrefetchController;
}
