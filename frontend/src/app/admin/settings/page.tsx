'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Store } from 'lucide-react';
import { fetchAdminSettings, updateAdminSettings } from '@/lib/admin-api';
import { Button, Card, Field, Input, Spinner, Toggle } from '../_components/ui';
import { cn } from '@/lib/utils';

interface SettingSpec {
  key: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'toggle';
  hint?: string;
}

interface GroupSpec {
  key: string;
  label: string;
  description: string;
  specs: SettingSpec[];
}

const GROUP_SPECS: GroupSpec[] = [
  {
    key: 'store',
    label: 'Store',
    description: 'General store identity and support contact details.',
    specs: [
      { key: 'name', label: 'Store name', type: 'text' },
      { key: 'tagline', label: 'Tagline', type: 'text' },
      { key: 'support_email', label: 'Support email', type: 'email' },
      { key: 'support_phone', label: 'Support phone', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'announcement', label: 'Announcement banner', type: 'text', hint: 'Leave empty to hide.' },
    ],
  },
  {
    key: 'shipping',
    label: 'Shipping',
    description: 'Shipping rates and delivery options.',
    specs: [
      { key: 'free_shipping_threshold', label: 'Free shipping threshold (₹)', type: 'number' },
      { key: 'standard_fee', label: 'Standard fee (₹)', type: 'number' },
      { key: 'express_fee', label: 'Express fee (₹)', type: 'number' },
      { key: 'free_shipping_enabled', label: 'Enable free shipping', type: 'toggle' },
      { key: 'express_enabled', label: 'Enable express shipping', type: 'toggle' },
    ],
  },
  {
    key: 'tax',
    label: 'Tax',
    description: 'Tax rate and pricing behaviour.',
    specs: [
      { key: 'tax_rate', label: 'Tax rate (%)', type: 'number' },
      { key: 'tax_inclusive', label: 'Prices include tax', type: 'toggle' },
    ],
  },
  {
    key: 'profile',
    label: 'Business profile',
    description: 'Legal details used on invoices.',
    specs: [
      { key: 'company_name', label: 'Company name', type: 'text' },
      { key: 'company_address', label: 'Company address', type: 'text' },
      { key: 'gstin', label: 'GSTIN', type: 'text' },
      { key: 'website', label: 'Website', type: 'text' },
    ],
  },
  {
    key: 'security',
    label: 'Security & checkout',
    description: 'Checkout and maintenance preferences.',
    specs: [
      { key: 'allow_guest_checkout', label: 'Allow guest checkout', type: 'toggle' },
      { key: 'require_login_for_checkout', label: 'Require login for checkout', type: 'toggle' },
      { key: 'maintenance_mode', label: 'Maintenance mode', type: 'toggle', hint: 'When enabled, the storefront may be offline.' },
    ],
  },
];

type Draft = Record<string, unknown>;

export function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value;
  const raw = String(value);
  const s = raw.trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s === 'true') return true;
  if (s === 'false') return false;
  // Return the untrimmed string so leading/trailing spaces (e.g. a space the
  // user just typed, or a multi-word announcement) are preserved in the input.
  return raw;
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [savedGroup, setSavedGroup] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: fetchAdminSettings,
  });

  const mutation = useMutation({
    mutationFn: ({ group, values }: { group: string; values: Draft }) => updateAdminSettings(group, values),
    onSuccess: (_res, vars) => {
      setSavedGroup(vars.group);
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
      // Storefront reads the same cache via ['store-settings'] (SiteChrome) —
      // invalidate it so announcement/maintenance changes appear immediately.
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
      setTimeout(() => setSavedGroup(null), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (isError || !data?.success) {
    return (
      <Card className="p-10 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-1">Could not load settings</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mb-4">The server may be offline. Try again.</p>
        <button onClick={() => refetch()} className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition-colors">
          Retry
        </button>
      </Card>
    );
  }

  const settings = data.data.settings as Record<string, unknown> | undefined;
  const settingsKey = JSON.stringify(settings ?? {});

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">Settings</h2>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">Manage store-wide configuration. Changes apply immediately.</p>
      </div>

      <SettingsList
        key={settingsKey}
        settings={settings}
        onSave={(group: string, values: Draft) => mutation.mutate({ group, values })}
        savingGroup={mutation.isPending && mutation.variables ? mutation.variables.group : null}
        savedGroup={savedGroup}
        error={mutation.isError ? String(mutation.error?.message ?? 'Save failed') : null}
      />
    </div>
  );
}

interface SettingsListProps {
  settings?: Record<string, unknown>;
  onSave: (group: string, values: Draft) => void;
  savingGroup: string | null;
  savedGroup: string | null;
  error: string | null;
}

function SettingsList({ settings, onSave, savingGroup, savedGroup, error }: SettingsListProps) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const next: Record<string, Draft> = {};
    if (settings) {
      for (const [group, map] of Object.entries(settings)) {
        next[group] = { ...(map as Draft) };
      }
    }
    return next;
  });

  const setValue = (group: string) => (key: string, value: unknown) =>
    setDrafts((prev) => ({
      ...prev,
      [group]: { ...(prev[group] ?? {}), [key]: normalizeValue(value) },
    }));

  return (
    <>
      {GROUP_SPECS.map((group) => (
        <SettingsSection
          key={group.key}
          group={group}
          values={drafts[group.key] ?? {}}
          setValue={setValue(group.key)}
          saving={savingGroup === group.key}
          saved={savedGroup === group.key}
          error={error}
          onSave={() => onSave(group.key, drafts[group.key] ?? {})}
        />
      ))}
    </>
  );
}

function SettingsSection({
  group,
  values,
  setValue,
  saving,
  saved,
  error,
  onSave,
}: {
  group: GroupSpec;
  values: Draft;
  setValue: (key: string, value: unknown) => void;
  saving: boolean;
  saved: boolean;
  error: string | null;
  onSave: () => void;
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{group.label}</h3>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}
          {error && (
            <span className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" /> {error}
            </span>
          )}
          <Button size="sm" onClick={onSave} loading={saving} disabled={saving}>
            Save changes
          </Button>
        </div>
      </div>

      <Card className="p-5">
        <p className="text-xs text-gray-500 dark:text-zinc-500 mb-5">{group.description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {group.specs.map((s) => {
            const current = normalizeValue(values[s.key]);
            if (s.type === 'toggle') {
              return (
                <label key={s.key} className="flex items-center justify-between gap-4 py-1 sm:col-span-2">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-zinc-200">{s.label}</span>
                    {s.hint && <span className="block text-[11px] text-gray-500 dark:text-zinc-500">{s.hint}</span>}
                  </div>
                  <Toggle checked={Boolean(current)} onChange={(v) => setValue(s.key, v)} />
                </label>
              );
            }
            return (
              <Field
                key={s.key}
                label={s.label}
                hint={s.hint}
                className={cn(s.type === 'text' && 'sm:col-span-2')}
              >
                <Input
                  type={s.type === 'email' ? 'email' : s.type === 'number' ? 'number' : 'text'}
                  value={String(current ?? '')}
                  step={s.type === 'number' ? '0.01' : undefined}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (s.type === 'number') {
                      setValue(s.key, v === '' ? '' : Number(v));
                    } else {
                      setValue(s.key, v);
                    }
                  }}
                />
              </Field>
            );
          })}
        </div>
      </Card>
    </div>
  );
}