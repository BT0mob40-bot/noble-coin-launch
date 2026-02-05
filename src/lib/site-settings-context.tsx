import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SiteSettings {
  site_name: string;
  site_description: string | null;
  logo_url: string | null;
  primary_color: string | null;
  hero_title: string;
  hero_subtitle: string;
  hero_badge: string;
  feature_1_title: string;
  feature_1_description: string;
  feature_2_title: string;
  feature_2_description: string;
  feature_3_title: string;
  feature_3_description: string;
  feature_4_title: string;
  feature_4_description: string;
  stats_tokens: string;
  stats_traders: string;
  stats_volume: string;
  stats_uptime: string;
  cta_title: string;
  cta_subtitle: string;
  min_buy_amount: number;
  max_buy_amount: number;
  fee_percentage: number;
  admin_commission: number;
  coin_creation_fee: number;
  referral_commission_percentage: number;
}

const defaultSettings: SiteSettings = {
  site_name: 'CryptoLaunch',
  site_description: 'The first crypto launchpad designed for Africa',
  logo_url: null,
  primary_color: '#00d4ff',
  hero_title: 'Trade Crypto with M-PESA',
  hero_subtitle: 'The first crypto launchpad designed for Africa. Buy, sell, and launch tokens instantly using M-PESA mobile money.',
  hero_badge: 'Next-Gen Crypto Launchpad',
  feature_1_title: 'Launch Your Token',
  feature_1_description: 'Create and launch your crypto token in minutes with our easy-to-use platform.',
  feature_2_title: 'Secure Trading',
  feature_2_description: 'Advanced security measures protect your assets and transactions.',
  feature_3_title: 'Instant M-PESA',
  feature_3_description: 'Buy and sell tokens instantly using M-PESA mobile money.',
  feature_4_title: 'Real-Time Prices',
  feature_4_description: 'Live price updates and market data for informed trading decisions.',
  stats_tokens: '100+',
  stats_traders: '50K+',
  stats_volume: '$10M+',
  stats_uptime: '99.9%',
  cta_title: 'Join the Revolution',
  cta_subtitle: 'Start trading crypto today with the easiest mobile money integration in Africa.',
  min_buy_amount: 100,
  max_buy_amount: 100000,
  fee_percentage: 2.5,
  admin_commission: 2.5,
  coin_creation_fee: 5000,
  referral_commission_percentage: 5,
};

interface SiteSettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  refetch: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: defaultSettings,
  loading: true,
  refetch: async () => {},
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .maybeSingle();

      if (data && !error) {
        setSettings({
          ...defaultSettings,
          ...data,
        });
        
        // Update document title
        document.title = data.site_name || defaultSettings.site_name;
        
        // Update meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && data.site_description) {
          metaDesc.setAttribute('content', data.site_description);
        }
        
        // Update OG tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) {
          ogTitle.setAttribute('content', data.site_name || defaultSettings.site_name);
        }
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc && data.site_description) {
          ogDesc.setAttribute('content', data.site_description);
        }
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refetch: fetchSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

// Helper to get base URL dynamically
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

// Helper to get referral URL
export function getReferralUrl(referralCode: string): string {
  return `${getBaseUrl()}/auth?ref=${referralCode}`;
}