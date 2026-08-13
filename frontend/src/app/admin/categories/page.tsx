'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { Plus, Pencil, Trash2, FolderTree } from 'lucide-react';
import type { AdminCategory } from '@/types/admin';
import type { CategoryPayload } from '@/lib/admin-api';
import {
  fetchAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
} from '@/lib/admin-api';
import {
  Button,
  Card,
  Input,
  Field,
  Textarea,
  ConfirmModal,
  EmptyState,
  Spinner,
} from '../_components/ui';

interface EditorState {
  category: AdminCategory | null;
  open: boolean;
}

const EMPTY_FORM = { name: '', slug: '', description: '', image: '' };

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<EditorState>({ category: null, open: false });
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: fetchAdminCategories,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
  };

  const createMutation = useMutation({
    mutationFn: createAdminCategory,
    onSuccess: () => {
      invalidate();
      closeEditor();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: CategoryPayload) => updateAdminCategory(editor.category!.id, payload),
    onSuccess: () => {
      invalidate();
      closeEditor();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminCategory(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
    },
  });

  const submitting = createMutation.isPending || updateMutation.isPending;

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditor({ category: null, open: true });
  }

  function openEdit(c: AdminCategory) {
    setForm({ name: c.name, slug: c.slug, description: c.description ?? '', image: c.image ?? '' });
    setFormError(null);
    setEditor({ category: c, open: true });
  }

  function closeEditor() {
    setEditor({ category: null, open: false });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    const payload: CategoryPayload = {
      name: form.name.trim(),
      slug: form.slug.trim() ? form.slug.trim() : slugify(form.name),
      description: form.description.trim() || null,
      image: form.image.trim() || null,
    };
    if (editor.category) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  }

  const categories = categoriesQuery.data?.data.categories ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">Categories</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">{categories.length} categor{categories.length === 1 ? 'y' : 'ies'}</p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          New category
        </Button>
      </div>

      <Card className="overflow-hidden">
        {categoriesQuery.isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            message="Create categories to organize your products."
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus className="w-4 h-4" />
                New category
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-zinc-500 border-b border-gray-200 dark:border-zinc-800">
                  <th className="py-3 px-5 font-medium">Name</th>
                  <th className="py-3 px-5 font-medium">Slug</th>
                  <th className="py-3 px-5 font-medium text-right">Active products</th>
                  <th className="py-3 px-5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-b border-gray-200/60 dark:border-zinc-800/50 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        {c.image ? (
                          <Image src={c.image} alt={c.name} width={36} height={36} unoptimized className="w-9 h-9 rounded-lg object-cover bg-gray-100 dark:bg-zinc-800 shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                            <FolderTree className="w-4 h-4 text-gray-400 dark:text-zinc-600" />
                          </div>
                        )}
                        <span className="font-medium text-gray-900 dark:text-zinc-200">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-gray-500 dark:text-zinc-500">{c.slug}</td>
                    <td className="py-3 px-5 text-right text-gray-500 dark:text-zinc-400">{c.productCount}</td>
                    <td className="py-3 px-5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-2 rounded-lg text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-200 dark:hover:bg-zinc-700/60 transition-colors"
                          aria-label={`Edit ${c.name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="p-2 rounded-lg text-gray-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          aria-label={`Delete ${c.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editor.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={submitting ? undefined : closeEditor}>
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-5">
              {editor.category ? 'Edit category' : 'New category'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <Field label="Name" required error={formError ?? undefined}>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Audio" />
              </Field>
              <Field label="Slug" hint="Leave blank to auto-generate from the name.">
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="audio" />
              </Field>
              <Field label="Description">
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description…" />
              </Field>
              <Field label="Image URL">
                <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://…/audio.jpg" />
              </Field>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeEditor} disabled={submitting}>Cancel</Button>
                <Button type="submit" loading={submitting}>{editor.category ? 'Save changes' : 'Create category'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete category?"
        message={
          <>
            Deleting <span className="font-medium text-gray-900 dark:text-zinc-200">{deleteTarget?.name}</span> will{' '}
            <span className="text-red-400">permanently delete all products in this category</span> along with it. This
            cannot be undone.
          </>
        }
        confirmLabel="Delete category"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
