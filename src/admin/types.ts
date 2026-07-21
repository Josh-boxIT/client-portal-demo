import type { ActionDef, ActionStep, ActionTicketConfig, ProductCatalogItem, ProductPricingModel } from '@/services/types';

export type AdminRole = 'admin' | 'editor' | 'viewer';

export interface AdminIdentity {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface AdminUser extends AdminIdentity {
  status: 'active' | 'disabled';
  clientIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  role: AdminRole;
  clientIds?: string[];
}

export interface UpdateUserPatch {
  name?: string;
  role?: AdminRole;
  status?: 'active' | 'disabled';
  clientIds?: string[];
}

export interface TenantThemeTokens {
  primary: string;
  accent: string;
  primaryForeground?: string;
  accentForeground?: string;
  ring?: string;
  sidebarGradient: string;
}

export interface ClientView {
  id: string;
  slug: string;
  name: string;
  status: string;
  vertical: string | null;
  theme: TenantThemeTokens;
  connectWiseCompanyId: number | null;
  ninjaOneOrganizationId: number | null;
}

export interface ConnectWiseCompanyView {
  id: number;
  identifier: string;
  name: string;
  status: string;
  city: string;
  state: string;
  phoneNumber: string;
  website: string;
  market: string;
  importedTenantId: string | null;
}

export type ActionDefDto = ActionDef;

export interface CreateActionDefInput {
  tenantId: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  enabled?: boolean;
  steps?: ActionStep[];
  ticket: ActionTicketConfig;
}

export interface UpdateActionDefPatch {
  key?: string;
  title?: string;
  description?: string;
  icon?: string;
  category?: string;
  enabled?: boolean;
  steps?: ActionStep[];
  ticket?: ActionTicketConfig;
}

export type ProductCatalogDto = ProductCatalogItem;

export interface ProductCatalogInput {
  name: string;
  category: string;
  description: string;
  aliases: string[];
  pricingModel: ProductPricingModel;
  monthlyPriceLow: number;
  monthlyPriceHigh: number;
  enabled?: boolean;
}

export type ProductCatalogPatch = Partial<ProductCatalogInput>;
