import { createHash } from 'node:crypto';
import { getChurnAssessment, type ChurnAssessment } from '@/data/seed/customerChurn';
import type { AppDb } from '../db/client';
import { churnNarrativeRepo } from '../db/repositories';
import { tenantDisplayName, type Tenant } from '../db/schema';
import type { ConfigStore } from '../framework/config-store';
import type { VendorDataService } from '../integrations/vendor-data';
import { buildChurnAssessment, fallbackChurnNarrative } from './scoring';
import { CHURN_NARRATIVE_PROMPT_VERSION, type ChurnNarrativeProvider } from './provider';

function narrativeFingerprint(assessmentFingerprint: string, displayName: string): string {
  return createHash('sha256')
    .update(`${assessmentFingerprint}:${displayName}:${CHURN_NARRATIVE_PROMPT_VERSION}`)
    .digest('hex').slice(0, 32);
}

export class ChurnService {
  private readonly repo: ReturnType<typeof churnNarrativeRepo>;
  private readonly inFlight = new Map<string, Promise<ChurnAssessment>>();

  constructor(
    db: AppDb,
    private readonly configStore: ConfigStore,
    private readonly vendorData: VendorDataService,
    private readonly provider: ChurnNarrativeProvider | null,
  ) {
    this.repo = churnNarrativeRepo(db);
  }

  async list(): Promise<ChurnAssessment[]> {
    return Promise.all(this.configStore.tenants().map((tenant) => this.forTenant(tenant)));
  }

  async get(tenantId: string): Promise<ChurnAssessment | null> {
    const tenant = this.configStore.tenantById(tenantId);
    return tenant ? this.forTenant(tenant) : null;
  }

  async regenerate(tenantId: string): Promise<ChurnAssessment | null> {
    const tenant = this.configStore.tenantById(tenantId);
    return tenant ? this.forTenant(tenant, true) : null;
  }

  private async forTenant(tenant: Tenant, forceNarrative = false): Promise<ChurnAssessment> {
    if (tenant.connectWiseCompanyId === null) {
      return getChurnAssessment(tenant.id) ?? buildChurnAssessment(tenant.id, {});
    }
    const base = buildChurnAssessment(tenant.id, await this.vendorData.churnInputs(tenant));
    const displayName = tenantDisplayName(tenant);
    const cacheFingerprint = narrativeFingerprint(base.fingerprint!, displayName);
    const key = `${tenant.id}:${cacheFingerprint}`;
    if (!forceNarrative) {
      const cached = await this.repo.get(tenant.id);
      if (cached && cached.fingerprint === cacheFingerprint) return {
        ...base,
        assessment: cached.assessment,
        suggestedActions: cached.suggestedActions,
        narrativeGeneratedAt: cached.generatedAt,
        narrativeModel: cached.model,
      };
      const pending = this.inFlight.get(key);
      if (pending) return pending;
    }
    const generated = this.generateNarrative(tenant, base, cacheFingerprint);
    if (!forceNarrative) this.inFlight.set(key, generated);
    try {
      return await generated;
    } finally {
      if (!forceNarrative) this.inFlight.delete(key);
    }
  }

  private async generateNarrative(
    tenant: Tenant,
    base: ChurnAssessment,
    cacheFingerprint: string,
  ): Promise<ChurnAssessment> {
    const generatedAt = new Date().toISOString();
    let narrative = fallbackChurnNarrative(base);
    let model = 'deterministic';
    if (this.provider) {
      try {
        narrative = await this.provider.generate({
          tenantId: tenant.id,
          tenantName: tenantDisplayName(tenant),
          assessment: base,
          safetyIdentifier: createHash('sha256')
            .update(`client-portal-demo:churn:${tenant.id}`).digest('hex'),
        });
        model = this.provider.modelName;
      } catch {
        // The deterministic score and summary remain usable when the model is unavailable.
      }
    }
    const saved = await this.repo.save({
      tenantId: tenant.id,
      fingerprint: cacheFingerprint,
      assessment: narrative.assessment,
      suggestedActions: narrative.suggestedActions,
      generatedAt,
      model,
    });
    return {
      ...base,
      assessment: saved.assessment,
      suggestedActions: saved.suggestedActions,
      narrativeGeneratedAt: saved.generatedAt,
      narrativeModel: saved.model,
    };
  }
}
