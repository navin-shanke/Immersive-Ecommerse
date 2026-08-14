'use client';

import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import Logo from '@/components/ui/Logo';
import { fetchPublicStoreSettings } from '@/lib/store-settings';
import { cn } from '@/lib/utils';

/**
 * Wraps every route. Storefront chrome (Navbar/Footer/CartDrawer) renders
 * everywhere EXCEPT the /admin panel, which has its own shell. Also enforces
 * maintenance mode on storefront pages (auth stays open so admins can log in).
 */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;
  const isAuth = pathname?.startsWith('/auth') ?? false;

  const { data: settings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: fetchPublicStoreSettings,
    staleTime: 5 * 60 * 1000,
    // Re-fetch whenever this tab regains focus so admin changes (announcement,
    // maintenance mode, etc.) appear without a hard refresh. The global client
    // sets refetchOnWindowFocus: false, so it must be re-enabled here. 'always'
    // because another tab (admin) may have changed the data since this tab
    // last fetched — staleness can't be known cross-tab.
    refetchOnWindowFocus: 'always',
    enabled: !isAdmin,
  });

  const maintenance = settings?.security.maintenance_mode === true;

  if (isAdmin) {
    return <main className="flex-1 flex flex-col">{children}</main>;
  }

  if (maintenance && !isAuth) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <Logo size="lg" name={settings?.store.name} />
        <h1 className="mt-8 text-2xl font-semibold text-gray-900 dark:text-white">
          We&apos;ll be right back
        </h1>
        <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
          The store is undergoing a quick maintenance. Please check back shortly.
        </p>
        {(settings?.store.support_email || settings?.store.support_phone) && (
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Questions?{' '}
            {settings.store.support_email && (
              <a
                href={`mailto:${settings.store.support_email}`}
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {settings.store.support_email}
              </a>
            )}
            {settings.store.support_phone && <span> · {settings.store.support_phone}</span>}
          </p>
        )}
      </main>
    );
  }

  const hasAnnouncement = Boolean(settings?.store.announcement);

  return (
    <>
      <Navbar settings={settings} />
      <CartDrawer />
      <main className={cn('flex-1', hasAnnouncement && 'pt-8')}>{children}</main>
      <Footer />
    </>
  );
}
