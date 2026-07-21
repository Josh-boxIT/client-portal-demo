import type { FastifyInstance } from 'fastify';
import type { ConfigStore } from '../framework/config-store';
import { ApiError } from '../framework/errors';
import {
  getClient,
  importConnectWiseCompany,
  listClientsView,
  markImportedCompanies,
  updateClient,
  type UpdateClientPatch,
} from './clients.controller';
import { requireRole } from './require-role';
import {
  createUser,
  disableUser,
  getUser,
  listUsers,
  updateUser,
  type CreateUserInput,
  type UpdateUserPatch,
} from './users.controller';
import {
  createActionDef,
  deleteActionDef,
  listActionDefs,
  updateActionDef,
  type ActionDefDeps,
  type CreateActionDefInput,
  type UpdateActionDefPatch,
} from './action-defs.controller';
import {
  createProduct,
  deleteProduct,
  listProductCatalog,
  updateProduct,
  type ProductCatalogInput,
  type ProductCatalogPatch,
} from './product-catalog.controller';
import type { VendorDataService } from '../integrations/vendor-data';

export function registerAdminRoutes(
  app: FastifyInstance,
  configStore: ConfigStore,
  vendorData: VendorDataService,
): void {
  app.get('/api/admin/clients', { preHandler: requireRole('admin', 'editor') }, async () => {
    return listClientsView(app.db);
  });

  app.get('/api/admin/clients/:id', { preHandler: requireRole('admin', 'editor') }, async (req) => {
    return getClient(app.db, (req.params as { id: string }).id);
  });

  app.patch('/api/admin/clients/:id', { preHandler: requireRole('admin', 'editor') }, async (req) => {
    if (!req.adminIdentity) throw new ApiError(401, 'unauthenticated', 'Admin identity required');
    return updateClient(
      app.db,
      configStore,
      (req.params as { id: string }).id,
      req.body as UpdateClientPatch,
      req.adminIdentity.email,
    );
  });

  app.get('/api/admin/connectwise/companies', { preHandler: requireRole('admin', 'editor') }, async (req) => {
    if (!vendorData.connectWiseConfigured) {
      throw new ApiError(503, 'connectwise_not_configured', 'ConnectWise credentials are not configured');
    }
    const search = typeof (req.query as { search?: unknown }).search === 'string'
      ? (req.query as { search: string }).search.trim()
      : '';
    try {
      return markImportedCompanies(app.db, await vendorData.searchConnectWiseCompanies(search));
    } catch {
      throw new ApiError(502, 'connectwise_unavailable', 'Could not load companies from ConnectWise');
    }
  });

  app.post('/api/admin/connectwise/import', { preHandler: requireRole('admin', 'editor') }, async (req, reply) => {
    if (!vendorData.connectWiseConfigured) {
      throw new ApiError(503, 'connectwise_not_configured', 'ConnectWise credentials are not configured');
    }
    const companyId = (req.body as { companyId?: unknown })?.companyId;
    if (!Number.isInteger(companyId) || Number(companyId) <= 0) {
      throw new ApiError(400, 'bad_request', 'companyId must be a positive integer');
    }
    let company;
    try {
      company = await vendorData.connectWiseCompany(Number(companyId));
    } catch {
      throw new ApiError(502, 'connectwise_unavailable', 'Could not load the company from ConnectWise');
    }
    if (!company) throw new ApiError(404, 'not_found', 'ConnectWise company not found');
    const imported = await importConnectWiseCompany(
      app.db,
      configStore,
      company,
      req.adminIdentity!.email,
    );
    return reply.status(201).send(imported);
  });

  app.get('/api/admin/users', { preHandler: requireRole('admin') }, async () => listUsers(app.db));
  app.get('/api/admin/users/:id', { preHandler: requireRole('admin') }, async (req) => getUser(app.db, (req.params as { id: string }).id));
  app.post('/api/admin/users', { preHandler: requireRole('admin') }, async (req, reply) => {
    const result = await createUser(app.db, req.body as CreateUserInput, req.adminIdentity!.email);
    return reply.status(201).send(result);
  });
  app.patch('/api/admin/users/:id', { preHandler: requireRole('admin') }, async (req) => {
    return updateUser(app.db, (req.params as { id: string }).id, req.body as UpdateUserPatch, req.adminIdentity!.email);
  });
  app.post('/api/admin/users/:id/disable', { preHandler: requireRole('admin') }, async (req) => {
    return disableUser(app.db, (req.params as { id: string }).id, req.adminIdentity!.email);
  });

  app.get('/api/admin/action-defs', { preHandler: requireRole('admin', 'editor') }, async (req) => {
    const { tenantId } = req.query as { tenantId?: string };
    if (!tenantId) throw new ApiError(400, 'bad_request', 'tenantId is required');
    return listActionDefs(actionDeps(req.adminIdentity!.email), tenantId);
  });
  app.post('/api/admin/action-defs', { preHandler: requireRole('admin', 'editor') }, async (req, reply) => {
    const result = await createActionDef(actionDeps(req.adminIdentity!.email), req.body as CreateActionDefInput);
    return reply.status(201).send(result);
  });
  app.patch('/api/admin/action-defs/:id', { preHandler: requireRole('admin', 'editor') }, async (req) => {
    return updateActionDef(actionDeps(req.adminIdentity!.email), (req.params as { id: string }).id, req.body as UpdateActionDefPatch);
  });
  app.delete('/api/admin/action-defs/:id', { preHandler: requireRole('admin', 'editor') }, async (req, reply) => {
    await deleteActionDef(actionDeps(req.adminIdentity!.email), (req.params as { id: string }).id);
    return reply.status(204).send();
  });

  app.get('/api/admin/product-catalog', { preHandler: requireRole('admin') }, async () => {
    return listProductCatalog(app.db);
  });
  app.post('/api/admin/product-catalog', { preHandler: requireRole('admin') }, async (req, reply) => {
    return reply.status(201).send(await createProduct(
      app.db, req.body as ProductCatalogInput, req.adminIdentity!.email,
    ));
  });
  app.patch('/api/admin/product-catalog/:id', { preHandler: requireRole('admin') }, async (req) => {
    return updateProduct(
      app.db,
      (req.params as { id: string }).id,
      req.body as ProductCatalogPatch,
      req.adminIdentity!.email,
    );
  });
  app.delete('/api/admin/product-catalog/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    await deleteProduct(app.db, (req.params as { id: string }).id, req.adminIdentity!.email);
    return reply.status(204).send();
  });

  function actionDeps(actor: string): ActionDefDeps {
    return { db: app.db, actor, configStore };
  }
}
