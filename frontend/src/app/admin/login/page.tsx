'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button, Input, Field } from '../_components/ui';
import Logo from '@/components/ui/Logo';

export default function AdminLoginPage() {
  const { user, isLoading, isAuthenticated, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in as admin → dashboard. Customer → home.
  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    router.replace(user.role === 'admin' ? '/admin' : '/');
  }, [isLoading, isAuthenticated, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      const role = useAuthStore.getState().user?.role;
      if (role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4 py-10 relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(60rem_30rem_at_top,_rgba(99,102,241,0.08),_transparent)]" />
      <div className="relative w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <Logo size="md" withText={false} />
          <div>
            <p className="text-base font-semibold leading-tight">IMMERSIVE</p>
            <p className="text-[10px] uppercase tracking-widest text-indigo-400/80 leading-tight">Admin Panel</p>
          </div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          <h1 className="text-lg font-semibold mb-1">Admin sign in</h1>
          <p className="text-xs text-zinc-500 mb-6">Only administrators can access this panel.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email" required>
              <Input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" loading={submitting} className="w-full" size="lg">
              Sign in
            </Button>
          </form>
        </div>

        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to storefront
        </Link>
      </div>
    </div>
  );
}
