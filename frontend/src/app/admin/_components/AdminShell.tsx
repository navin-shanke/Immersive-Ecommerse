'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ShoppingCart,
  Users,
  BarChart3,
  Store,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/ui/Logo';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { href: '/admin/products', label: 'Products', icon: Package },
      { href: '/admin/categories', label: 'Categories', icon: FolderTree },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
      { href: '/admin/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    label: 'Storefront',
    items: [{ href: '/admin/settings', label: 'Settings', icon: Store }],
  },
];

function getPageTitle(pathname: string): string {
  if (pathname === '/admin') return 'Dashboard';
  if (pathname === '/admin/login') return 'Sign in';
  if (pathname === '/admin/products') return 'Products';
  if (pathname.startsWith('/admin/products/new')) return 'New Product';
  if (pathname.startsWith('/admin/products/')) return 'Edit Product';
  if (pathname === '/admin/categories') return 'Categories';
  if (pathname === '/admin/orders') return 'Orders';
  if (pathname.startsWith('/admin/orders/')) return 'Order Details';
  if (pathname === '/admin/customers') return 'Customers';
  if (pathname.startsWith('/admin/customers/')) return 'Customer Details';
  if (pathname === '/admin/analytics') return 'Analytics';
  if (pathname === '/admin/settings') return 'Settings';
  return 'Admin';
}

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/70'
      )}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" />
      {item.label}
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-gray-200 dark:border-zinc-800/70">
        <Logo size="md" withText={false} />
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 leading-tight">IMMERSIVE</p>
          <p className="text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400/80 leading-tight">Admin Panel</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200 dark:border-zinc-800/70 space-y-1">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/70 transition-colors"
        >
          <ExternalLink className="w-[18px] h-[18px] shrink-0" />
          View store
        </Link>
        <div className="px-3 py-2 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-semibold text-indigo-600 dark:text-indigo-300 shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-900 dark:text-zinc-300 truncate">{user?.name ?? 'Admin'}</p>
            <p className="text-[10px] text-gray-500 dark:text-zinc-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            router.replace('/admin/login');
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-500/10 dark:text-zinc-400 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          Log out
        </button>
      </div>
    </div>
  );
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 border-r border-gray-200 bg-white dark:border-zinc-800/70 dark:bg-zinc-950 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-200 dark:bg-zinc-950 dark:border-zinc-800 z-50 lg:hidden"
            >
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/90">
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{title}</h1>
          <div className="ml-auto flex items-center">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}