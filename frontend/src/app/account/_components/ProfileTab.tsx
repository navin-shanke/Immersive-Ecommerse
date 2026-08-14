'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { User } from '@/types/user';
import { useUIStore } from '@/stores/useUIStore';

interface ProfileTabProps {
  user: User;
  onUserUpdated: (user: User) => void;
}

export default function ProfileTab({ user, onUserUpdated }: ProfileTabProps) {
  const addToast = useUIStore((s) => s.addToast);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [address, setAddress] = useState(user.address ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setErrors({});
    try {
      const { data } = await api.put('/auth/me', { name, email, phone, address });
      onUserUpdated(data.data.user);
      addToast({ type: 'success', message: 'Profile updated' });
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number; data?: { errors?: Record<string, string[]> } } };
      if (anyErr?.response?.status === 422 && anyErr.response.data?.errors) {
        setErrors(
          Object.fromEntries(
            Object.entries(anyErr.response.data.errors).map(([k, v]) => [k, v[0]])
          ) as Record<string, string>
        );
      } else {
        addToast({ type: 'error', message: 'Failed to update profile. Please try again.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await api.postForm('/auth/avatar', { file });
      onUserUpdated(data.data.user);
      addToast({ type: 'success', message: 'Avatar updated' });
    } catch {
      addToast({ type: 'error', message: 'Failed to upload avatar. Try a different image.' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar}
            alt={user.name}
            className="w-16 h-16 rounded-full object-cover border border-gray-200 dark:border-zinc-700"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1">
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl cursor-pointer hover:bg-indigo-700 transition-colors">
            {uploading ? 'Uploading…' : 'Change Avatar'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={handleFile}
              data-testid="avatar-input"
            />
          </label>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name
          </label>
          <input
            id="profile-name"
            aria-label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white"
          />
          {errors.name && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            id="profile-email"
            aria-label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white"
          />
          {errors.email && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="profile-phone"
            aria-label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white"
          />
          {errors.phone && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="profile-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Address <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            id="profile-address"
            aria-label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white"
          />
          {errors.address && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.address}</p>}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
