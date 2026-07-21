import type { FastifyInstance } from 'fastify';
import { requireRole } from '../admin/require-role';
import { auditRepo } from '../db/repositories';
import { NotFoundError } from '../framework/errors';
import type { ChurnService } from './service';

export function registerChurnRoutes(app: FastifyInstance, churn: ChurnService): void {
  const adminOnly = { preHandler: requireRole('admin') };

  app.get('/api/customer-churn', adminOnly, async () => churn.list());

  app.get('/api/customer-churn/:tenantId', adminOnly, async (req) => {
    const assessment = await churn.get((req.params as { tenantId: string }).tenantId);
    if (!assessment) throw new NotFoundError('Customer churn assessment not found');
    return assessment;
  });

  app.post('/api/customer-churn/:tenantId/regenerate', adminOnly, async (req) => {
    const tenantId = (req.params as { tenantId: string }).tenantId;
    const assessment = await churn.regenerate(tenantId);
    if (!assessment) throw new NotFoundError('Customer churn assessment not found');
    await auditRepo(app.db).write({
      actor: req.adminIdentity!.email,
      action: 'customer-churn.regenerate',
      target: tenantId,
      metadata: { score: assessment.score, fingerprint: assessment.fingerprint },
    });
    return assessment;
  });
}
