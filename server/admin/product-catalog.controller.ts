import type { ProductCatalogItem, ProductPricingModel } from '@/services/types';
import type { AppDb } from '../db/client';
import { auditRepo, newId, normalizeProductName, productCatalogDto, productCatalogRepo } from '../db/repositories';
import type { NewProductCatalogRow } from '../db/schema';
import { ApiError, NotFoundError } from '../framework/errors';

export interface ProductCatalogInput {
  name: string;
  category: string;
  description: string;
  aliases?: string[];
  pricingModel: ProductPricingModel;
  monthlyPriceLow: number;
  monthlyPriceHigh: number;
  enabled?: boolean;
}

export type ProductCatalogPatch = Partial<ProductCatalogInput>;
const PRICING_MODELS: ProductPricingModel[] = ['flat', 'per-user', 'per-device'];

function cleanAliases(value: unknown): string[] {
  if (!Array.isArray(value)) throw new ApiError(400, 'bad_request', 'aliases must be an array');
  return [...new Set(value.map((item) => typeof item === 'string' ? item.trim() : '').filter(Boolean))];
}

function validate(input: ProductCatalogInput): void {
  if (!input.name?.trim()) throw new ApiError(400, 'bad_request', 'name is required');
  if (!input.category?.trim()) throw new ApiError(400, 'bad_request', 'category is required');
  if (!input.description?.trim()) throw new ApiError(400, 'bad_request', 'description is required');
  if (!PRICING_MODELS.includes(input.pricingModel)) throw new ApiError(400, 'bad_request', 'invalid pricingModel');
  if (!Number.isFinite(input.monthlyPriceLow) || !Number.isFinite(input.monthlyPriceHigh) ||
      input.monthlyPriceLow < 0 || input.monthlyPriceHigh < input.monthlyPriceLow) {
    throw new ApiError(400, 'bad_request', 'monthly price range is invalid');
  }
}

export async function listProductCatalog(db: AppDb): Promise<ProductCatalogItem[]> {
  return (await productCatalogRepo(db).list()).map(productCatalogDto)
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

export async function createProduct(
  db: AppDb,
  input: ProductCatalogInput,
  actor: string,
): Promise<ProductCatalogItem> {
  validate(input);
  const repo = productCatalogRepo(db);
  if (await repo.getByNormalizedName(input.name)) {
    throw new ApiError(409, 'conflict', `Product "${input.name.trim()}" already exists`);
  }
  const row = await repo.create({
    id: newId('product_'),
    name: input.name.trim(),
    normalizedName: normalizeProductName(input.name),
    category: input.category.trim(),
    description: input.description.trim(),
    aliases: cleanAliases(input.aliases ?? []),
    pricingModel: input.pricingModel,
    monthlyPriceLow: Math.round(input.monthlyPriceLow),
    monthlyPriceHigh: Math.round(input.monthlyPriceHigh),
    enabled: input.enabled ?? true,
  });
  await auditRepo(db).write({ actor, action: 'product.create', target: row.id, metadata: { name: row.name } });
  return productCatalogDto(row);
}

export async function updateProduct(
  db: AppDb,
  id: string,
  patch: ProductCatalogPatch,
  actor: string,
): Promise<ProductCatalogItem> {
  const repo = productCatalogRepo(db);
  const existing = await repo.get(id);
  if (!existing) throw new NotFoundError(`Product ${id} not found`);
  const merged: ProductCatalogInput = {
    name: patch.name ?? existing.name,
    category: patch.category ?? existing.category,
    description: patch.description ?? existing.description,
    aliases: patch.aliases ?? existing.aliases,
    pricingModel: patch.pricingModel ?? existing.pricingModel,
    monthlyPriceLow: patch.monthlyPriceLow ?? existing.monthlyPriceLow,
    monthlyPriceHigh: patch.monthlyPriceHigh ?? existing.monthlyPriceHigh,
    enabled: patch.enabled ?? existing.enabled,
  };
  validate(merged);
  const duplicate = await repo.getByNormalizedName(merged.name);
  if (duplicate && duplicate.id !== id) throw new ApiError(409, 'conflict', `Product "${merged.name.trim()}" already exists`);
  const updates: Partial<NewProductCatalogRow> = {
    name: merged.name.trim(), normalizedName: normalizeProductName(merged.name),
    category: merged.category.trim(), description: merged.description.trim(),
    aliases: cleanAliases(merged.aliases), pricingModel: merged.pricingModel,
    monthlyPriceLow: Math.round(merged.monthlyPriceLow), monthlyPriceHigh: Math.round(merged.monthlyPriceHigh),
    enabled: merged.enabled,
  };
  const updated = await repo.update(id, updates);
  await auditRepo(db).write({ actor, action: 'product.update', target: id, metadata: { name: updated.name } });
  return productCatalogDto(updated);
}

export async function deleteProduct(db: AppDb, id: string, actor: string): Promise<void> {
  const repo = productCatalogRepo(db);
  const existing = await repo.get(id);
  if (!existing) throw new NotFoundError(`Product ${id} not found`);
  await repo.remove(id);
  await auditRepo(db).write({ actor, action: 'product.delete', target: id, metadata: { name: existing.name } });
}
