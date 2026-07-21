import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { PackagePlus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../adminApi';
import type { ProductCatalogDto, ProductCatalogInput } from '../types';
import { useAuthStore } from '@/store/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const EMPTY: ProductCatalogInput = {
  name: '', category: '', description: '', aliases: [], pricingModel: 'flat',
  monthlyPriceLow: 0, monthlyPriceHigh: 0, enabled: true,
};

function ProductDialog({
  open, onOpenChange, product, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductCatalogDto;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ProductCatalogInput>(EMPTY);
  const [aliases, setAliases] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(product ? {
      name: product.name, category: product.category, description: product.description,
      aliases: product.aliases, pricingModel: product.pricingModel,
      monthlyPriceLow: product.monthlyPriceLow, monthlyPriceHigh: product.monthlyPriceHigh,
      enabled: product.enabled,
    } : EMPTY);
    setAliases(product?.aliases.join(', ') ?? '');
  }, [open, product]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const input = { ...form, aliases: aliases.split(',').map((item) => item.trim()).filter(Boolean) };
    try {
      if (product) await adminApi.updateProduct(product.id, input);
      else await adminApi.createProduct(input);
      toast.success(product ? 'Product updated' : 'Product added');
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save product');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{product ? 'Edit product' : 'Add product'}</DialogTitle><DialogDescription>Configure an offering the opportunity agent should check and price.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="product-name">Name</Label><Input id="product-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="product-category">Category</Label><Input id="product-category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="product-description">Description</Label><Textarea id="product-description" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="product-aliases">Matching aliases</Label><Input id="product-aliases" value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="phishing training, SAT, security training" /><p className="text-xs text-slate-500">Comma-separated terms the agent may encounter in agreements or tickets.</p></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2"><Label>Pricing model</Label><Select value={form.pricingModel} onValueChange={(value: ProductCatalogInput['pricingModel']) => setForm({ ...form, pricingModel: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="flat">Flat monthly</SelectItem><SelectItem value="per-user">Per user</SelectItem><SelectItem value="per-device">Per device</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="price-low">Monthly low ($)</Label><Input id="price-low" type="number" min="0" required value={form.monthlyPriceLow} onChange={(e) => setForm({ ...form, monthlyPriceLow: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label htmlFor="price-high">Monthly high ($)</Label><Input id="price-high" type="number" min="0" required value={form.monthlyPriceHigh} onChange={(e) => setForm({ ...form, monthlyPriceHigh: Number(e.target.value) })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300"><Checkbox checked={form.enabled} onCheckedChange={(checked) => setForm({ ...form, enabled: checked === true })} />Enabled for analysis</label>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save product'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProductsPage() {
  const { identity } = useAuthStore();
  const [products, setProducts] = useState<ProductCatalogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<ProductCatalogDto>();

  const load = useCallback(async () => {
    setLoading(true);
    try { setProducts(await adminApi.productCatalog()); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load products'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (identity?.role === 'admin') void load(); }, [identity?.role, load]);
  if (identity?.role !== 'admin') return <Navigate to="/admin/clients" replace />;

  async function toggle(product: ProductCatalogDto) {
    try { await adminApi.updateProduct(product.id, { enabled: !product.enabled }); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update product'); }
  }

  async function remove(product: ProductCatalogDto) {
    if (!window.confirm(`Delete "${product.name}" from the product catalog?`)) return;
    try { await adminApi.deleteProduct(product.id); toast.success('Product deleted'); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to delete product'); }
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between"><div><h1 className="text-2xl font-semibold text-slate-100">Product catalog</h1><p className="mt-1 text-sm text-slate-400">Global offerings checked and priced by the sales opportunity agent.</p></div><Button onClick={() => { setSelected(undefined); setDialogOpen(true); }}><PackagePlus className="mr-2 h-4 w-4" />Add product</Button></div>
      <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
        <Table><TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-slate-400">Product</TableHead><TableHead className="text-slate-400">Category</TableHead><TableHead className="text-slate-400">Pricing assumption</TableHead><TableHead className="text-slate-400">Enabled</TableHead><TableHead className="text-right text-slate-400">Actions</TableHead></TableRow></TableHeader><TableBody>
          {loading ? <TableRow><TableCell colSpan={5} className="py-12 text-center text-slate-500">Loading products…</TableCell></TableRow> : products.map((product) => (
            <TableRow key={product.id} className="border-slate-800"><TableCell><p className="font-medium text-slate-100">{product.name}</p><p className="max-w-md text-xs text-slate-500">{product.description}</p><div className="mt-1 flex flex-wrap gap-1">{product.aliases.slice(0, 3).map((alias) => <Badge key={alias} variant="secondary" className="text-[10px]">{alias}</Badge>)}</div></TableCell><TableCell className="text-slate-300">{product.category}</TableCell><TableCell className="text-slate-300">${product.monthlyPriceLow}–${product.monthlyPriceHigh} / {product.pricingModel.replace('per-', '')}</TableCell><TableCell><Checkbox checked={product.enabled} onCheckedChange={() => void toggle(product)} aria-label={`${product.enabled ? 'Disable' : 'Enable'} ${product.name}`} /></TableCell><TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => { setSelected(product); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="ghost" className="text-rose-400" onClick={() => void remove(product)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>
          ))}
        </TableBody></Table>
      </div>
      <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={selected} onSaved={() => void load()} />
    </div>
  );
}
