import api from '@/lib/api';

export interface PublicStoreSettings {
  store: {
    name: string;
    tagline: string;
    announcement: string;
    support_email: string;
    support_phone: string;
    address: string;
  };
  security: {
    maintenance_mode: boolean;
    allow_guest_checkout: boolean;
    require_login_for_checkout: boolean;
  };
}

/** Fetch the public store settings (store info + maintenance flag). */
export async function fetchPublicStoreSettings(): Promise<PublicStoreSettings> {
  const { data } = await api.get<{ data: PublicStoreSettings }>('/settings/public');
  return data.data;
}
