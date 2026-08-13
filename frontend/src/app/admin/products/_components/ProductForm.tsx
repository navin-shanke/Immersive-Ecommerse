'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Plus, X, Trash2, ImagePlus, Package, UploadCloud } from 'lucide-react';
import type { AdminCategory, AdminProduct } from '@/types/admin';
import type { ProductPayload, ProductImagePayload } from '@/lib/admin-api';
import { uploadAdminImage } from '@/lib/admin-api';
import { useUIStore } from '@/stores/useUIStore';
import { Button, Card, Field, Input, Select, Textarea, Toggle } from '../../_components/ui';
import ImageCropModal from './ImageCropModal';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

interface ProductFormProps {
  initial?: AdminProduct | null;
  categories: AdminCategory[];
  submitting: boolean;
  onSubmit: (payload: ProductPayload) => void;
}

interface FormVariant {
  name: string;
  sku: string;
  price: string;
  sale_price: string | null;
  stock: string;
  options: Record<string, string>;
  color: string | null;
  color_hex: string | null;
  size: string | null;
}

interface FormState {
  name: string;
  slug: string;
  sku: string;
  category_id: string;
  description: string;
  long_description: string;
  price: string;
  compare_at_price: string;
  stock: string;
  status: 'active' | 'draft' | 'archived';
  featured: boolean;
  tags: string;
  images: ProductImagePayload[];
  variants: FormVariant[];
}

function toFormState(p: AdminProduct | null): FormState {
  if (!p) {
    return {
      name: '',
      slug: '',
      sku: '',
      category_id: '',
      description: '',
      long_description: '',
      price: '',
      compare_at_price: '',
      stock: '',
      status: 'draft',
      featured: false,
      tags: '',
      images: [],
      variants: [],
    };
  }
  return {
    name: p.name ?? '',
    slug: p.slug ?? '',
    sku: p.sku ?? '',
    category_id: p.category?._id ?? '',
    description: p.description ?? '',
    long_description: p.longDescription ?? '',
    price: p.price != null ? String(p.price) : '',
    compare_at_price: p.compareAtPrice != null ? String(p.compareAtPrice) : '',
    stock: p.stock != null ? String(p.stock) : '',
    status: p.status,
    featured: p.featured,
    tags: (p.tags ?? []).join(', '),
    images: (p.images ?? []).map((i) => ({ url: i.url, alt: i.alt ?? '', width: i.width, height: i.height })),
    variants: (p.variants ?? []).map((v) => ({
      name: v.name ?? '',
      sku: v.sku ?? '',
      price: v.price != null ? String(v.price) : '',
      sale_price: v.salePrice != null ? String(v.salePrice) : null,
      stock: v.stock != null ? String(v.stock) : '0',
      options: v.options ?? {},
      color: v.color ?? null,
      color_hex: v.colorHex ?? null,
      size: v.size ?? null,
    })),
  };
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function ProductForm({ initial, categories, submitting, onSubmit }: ProductFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(initial ?? null));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useUIStore((s) => s.addToast);
  const [editQueue, setEditQueue] = useState<{ src: string; file: File }[]>([]);
  const currentEdit = editQueue[0] ?? null;
  const objectUrls = useRef<string[]>([]);

  const revokeObjectUrls = () => {
    objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrls.current = [];
  };

  const dequeueEditor = () => {
    setEditQueue((queue) => {
      if (queue[0]) URL.revokeObjectURL(queue[0].src);
      return queue.slice(1);
    });
  };

  useEffect(() => {
    return revokeObjectUrls;
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setImage = (index: number, patch: Partial<ProductImagePayload>) =>
    setForm((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => (i === index ? { ...img, ...patch } : img)),
    }));

  const setVariant = (index: number, patch: Partial<FormVariant>) =>
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) {
      addToast({ type: 'error', message: 'Only image files are supported.' });
      return;
    }

    const direct: File[] = [];
    const toEdit: File[] = [];
    for (const file of list) {
      if (file.size > MAX_IMAGE_SIZE) {
        addToast({ type: 'error', message: `${file.name} is larger than 5 MB and was skipped.` });
        continue;
      }
      if (file.type === 'image/svg+xml') {
        direct.push(file);
      } else {
        toEdit.push(file);
      }
    }

    let directUploads = 0;
    for (const file of direct) {
      try {
        const { url } = await uploadAdminImage(file);
        setForm((prev) => ({ ...prev, images: [...prev.images, { url, alt: '', width: null, height: null }] }));
        directUploads += 1;
      } catch {
        addToast({ type: 'error', message: 'Upload failed. Check your connection and try again.' });
      }
    }
    if (directUploads > 0) {
      addToast({ type: 'success', message: 'Image uploaded.' });
    }

    if (toEdit.length > 0) {
      const queue = toEdit.map((file) => ({ src: URL.createObjectURL(file), file }));
      objectUrls.current.push(...queue.map((q) => q.src));
      setEditQueue((prev) => [...prev, ...queue]);
    }

    setUploading(false);
    setDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    void handleFiles(e.dataTransfer.files);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) void handleFiles(e.target.files);
  }

  async function handleEditorConfirm(file: File) {
    setUploading(true);
    try {
      if (file.size > MAX_IMAGE_SIZE) {
        addToast({ type: 'error', message: 'Edited PNG exceeds 5 MB. Crop tighter and try again.' });
        return;
      }
      const { url } = await uploadAdminImage(file);
      setForm((prev) => ({ ...prev, images: [...prev.images, { url, alt: '', width: null, height: null }] }));
      addToast({ type: 'success', message: 'Image uploaded.' });
      dequeueEditor();
    } catch {
      addToast({ type: 'error', message: 'Upload failed. Check your connection and try again.' });
    } finally {
      setUploading(false);
      setDragging(false);
    }
  }

  function handleEditorCancel() {
    dequeueEditor();
    setDragging(false);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.category_id) e.category_id = 'Select a category.';
    if (!form.price || Number.isNaN(Number(form.price)) || Number(form.price) < 0) e.price = 'Enter a valid price.';
    if (form.compare_at_price && (Number.isNaN(Number(form.compare_at_price)) || Number(form.compare_at_price) < 0)) {
      e.compare_at_price = 'Enter a valid compare-at price.';
    }
    for (let i = 0; i < form.images.length; i++) {
      if (!form.images[i].url.trim()) {
        e[`image_${i}`] = 'Image URL is required.';
        break;
      }
    }
    for (let i = 0; i < form.variants.length; i++) {
      const v = form.variants[i];
      if (!v.name.trim() || !v.sku.trim() || v.price === '' || Number.isNaN(Number(v.price)) || Number(v.price) < 0) {
        e[`variant_${i}`] = 'Each variant needs a name, SKU, and valid price.';
        break;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const isEditing = Boolean(initial);
    const slugChanged = !isEditing || form.slug.trim() !== (initial?.slug ?? '');
    const skuChanged = !isEditing || form.sku.trim() !== (initial?.sku ?? '');
    const payload: ProductPayload = {
      name: form.name.trim(),
      slug: isEditing && !slugChanged ? undefined : form.slug.trim() || slugify(form.name),
      sku: isEditing && !skuChanged ? undefined : form.sku.trim(),
      description: form.description.trim(),
      long_description: form.long_description.trim() || null,
      price: Number(form.price),
      compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
      category_id: form.category_id,
      featured: form.featured,
      stock: form.stock ? Number(form.stock) : 0,
      status: form.status,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      images: form.images.filter((img) => img.url.trim()).map((img) => ({
        url: img.url.trim(),
        alt: img.alt?.trim() || undefined,
        width: img.width || null,
        height: img.height || null,
      })),
      variants: form.variants
        .filter((v) => v.name.trim() && v.sku.trim())
        .map((v) => ({
          name: v.name.trim(),
          sku: v.sku.trim(),
          price: Number(v.price),
          sale_price: v.sale_price ? Number(v.sale_price) : null,
          stock: v.stock ? Number(v.stock) : 0,
          options: v.options ?? {},
          color: v.color?.trim() || null,
          color_hex: v.color_hex?.trim() || null,
          size: v.size?.trim() || null,
        })),
    };
    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Main column */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-100">Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Name" required error={errors.name}>
                  <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Wireless Headphones" />
                </Field>
              </div>
              <Field label="Slug" hint="Leave blank to auto-generate from the name.">
                <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="wireless-headphones" />
              </Field>
              <Field label="SKU">
                <Input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="WH-001" />
              </Field>
              <Field label="Category" required error={errors.category_id}>
                <Select value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
                  <option value="">Select a category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onChange={(e) => set('status', e.target.value as FormState['status'])}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Short description">
                  <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="A short summary shown on product cards." />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Long description">
                  <Textarea className="min-h-[140px]" value={form.long_description} onChange={(e) => set('long_description', e.target.value)} placeholder="Full product details…" />
                </Field>
              </div>
              <Field label="Tags" hint="Comma-separated.">
                <Input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="audio, wireless, new" />
              </Field>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-100">Pricing & inventory</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Price (INR)" required error={errors.price}>
                <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="99.99" />
              </Field>
              <Field label="Compare-at price" error={errors.compare_at_price}>
                <Input type="number" step="0.01" min="0" value={form.compare_at_price} onChange={(e) => set('compare_at_price', e.target.value)} placeholder="129.99" />
              </Field>
              <Field label="Stock" hint="Base stock level.">
                <Input type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} placeholder="50" />
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-200">Featured</p>
                <p className="text-xs text-zinc-500">Show this product prominently on the storefront.</p>
              </div>
              <Toggle checked={form.featured} onChange={(v) => set('featured', v)} label="Featured" />
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">Images</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set('images', [...form.images, { url: '', alt: '', width: null, height: null }])}
              >
                <ImagePlus className="w-4 h-4" />
                Add by URL
              </Button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-6 flex flex-col items-center justify-center gap-2 text-center transition-colors ${
                dragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-zinc-800 hover:border-zinc-600'
              }`}
            >
              <UploadCloud className={`w-7 h-7 ${uploading ? 'text-indigo-400 animate-pulse' : 'text-zinc-500'}`} />
              <p className="text-sm text-zinc-300">
                {uploading ? 'Uploading…' : <>Drag &amp; drop images here, or <span className="text-indigo-400 font-medium">browse</span></>}
              </p>
              <p className="text-xs text-zinc-500">JPG, PNG, WebP, GIF, AVIF, BMP or SVG · up to 5 MB each</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {form.images.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center border border-dashed border-zinc-800 rounded-lg">
                No images yet. Drop files above or add one by URL.
              </p>
            ) : (
              <div className="space-y-3">
                {form.images.map((img, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg border border-zinc-800 p-3">
                    <div className="w-14 h-14 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                      {img.url ? (
                        <Image src={img.url} alt={img.alt || 'Product image'} width={56} height={56} unoptimized className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input placeholder="Paste an image URL (external images)" value={img.url} onChange={(e) => setImage(index, { url: e.target.value })} />
                      <div className="grid grid-cols-3 gap-2">
                        <Input placeholder="Alt text" value={img.alt ?? ''} onChange={(e) => setImage(index, { alt: e.target.value })} />
                        <Input type="number" placeholder="Width" value={img.width ?? ''} onChange={(e) => setImage(index, { width: e.target.value ? Number(e.target.value) : null })} />
                        <Input type="number" placeholder="Height" value={img.height ?? ''} onChange={(e) => setImage(index, { height: e.target.value ? Number(e.target.value) : null })} />
                      </div>
                      {errors[`image_${index}`] && <p className="text-[11px] text-red-500">{errors[`image_${index}`]}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => set('images', form.images.filter((_, i) => i !== index))}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      aria-label="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">Variants</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set('variants', [...form.variants, { name: '', sku: '', price: '', sale_price: null, stock: '0', options: {}, color: null, color_hex: null, size: null }])}
              >
                <Plus className="w-4 h-4" />
                Add variant
              </Button>
            </div>
            {form.variants.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center border border-dashed border-zinc-800 rounded-lg">
                No variants. Add size/color combinations if this product has them.
              </p>
            ) : (
              <div className="space-y-3">
                {form.variants.map((v, index) => (
                  <div key={index} className="rounded-lg border border-zinc-800 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-zinc-400">Variant {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => set('variants', form.variants.filter((_, i) => i !== index))}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label="Remove variant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Name" required>
                        <Input value={v.name} onChange={(e) => setVariant(index, { name: e.target.value })} placeholder="Black / Medium" />
                      </Field>
                      <Field label="SKU" required>
                        <Input value={v.sku} onChange={(e) => setVariant(index, { sku: e.target.value })} placeholder="WH-001-BM" />
                      </Field>
                      <Field label="Price (INR)" required>
                        <Input type="number" step="0.01" min="0" value={v.price} onChange={(e) => setVariant(index, { price: e.target.value })} placeholder="99.99" />
                      </Field>
                      <Field label="Sale price">
                        <Input type="number" step="0.01" min="0" value={v.sale_price ?? ''} onChange={(e) => setVariant(index, { sale_price: e.target.value ? e.target.value : null })} placeholder="79.99" />
                      </Field>
                      <Field label="Stock">
                        <Input type="number" min="0" value={v.stock} onChange={(e) => setVariant(index, { stock: e.target.value })} placeholder="10" />
                      </Field>
                      <Field label="Size">
                        <Input value={v.size ?? ''} onChange={(e) => setVariant(index, { size: e.target.value })} placeholder="M" />
                      </Field>
                      <Field label="Color">
                        <Input value={v.color ?? ''} onChange={(e) => setVariant(index, { color: e.target.value })} placeholder="Black" />
                      </Field>
                      <Field label="Color hex" hint="e.g. #111827">
                        <Input value={v.color_hex ?? ''} onChange={(e) => setVariant(index, { color_hex: e.target.value })} placeholder="#111827" />
                      </Field>
                    </div>
                    {errors[`variant_${index}`] && <p className="text-[11px] text-red-500">{errors[`variant_${index}`]}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sticky submit column */}
        <div className="xl:sticky xl:top-20 space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-zinc-100 mb-3">Save</h3>
            <p className="text-xs text-zinc-500 mb-4">
              Products set to <span className="text-zinc-300">Active</span> appear on the storefront immediately.
              Drafts are saved but hidden.
            </p>
            <div className="space-y-2">
              <Button type="submit" loading={submitting} className="w-full" size="lg">
                {initial ? 'Save changes' : 'Create product'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <ImageCropModal
        open={currentEdit !== null}
        imageSrc={currentEdit?.src ?? ''}
        onCancel={handleEditorCancel}
        onConfirm={handleEditorConfirm}
      />
    </form>
  );
}
