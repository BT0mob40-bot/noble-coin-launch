import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
  live_fee: number;
  twitter_url?: string;
  discord_url?: string;
  telegram_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  google_verification_code?: string;
  seo_keywords?: string;
  google_auth_enabled?: boolean;
  telegram_auth_enabled?: boolean;
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
  live_fee: 1000,
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

function updateMetaTag(selector: string, attr: string, value: string) {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    // Set identifying attributes
    if (selector.includes('name=')) {
      const name = selector.match(/name="([^"]+)"/)?.[1];
      if (name) el.setAttribute('name', name);
    } else if (selector.includes('property=')) {
      const prop = selector.match(/property="([^"]+)"/)?.[1];
      if (prop) el.setAttribute('property', prop);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function updateCanonicalLink() {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', window.location.origin + window.location.pathname);
}

function injectJsonLd(settings: SiteSettings) {
  let script = document.getElementById('json-ld-website');
  if (!script) {
    script = document.createElement('script');
    script.id = 'json-ld-website';
    script.setAttribute('type', 'application/ld+json');
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: settings.site_name,
    description: settings.site_description || defaultSettings.site_description,
    url: window.location.origin,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${window.location.origin}/launchpad?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  });
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .maybeSingle();

      if (data && !error) {
        const merged = { ...defaultSettings, ...(data as any) };
        setSettings(merged);

        // Update document title
        document.title = data.site_name || defaultSettings.site_name;

        const desc = data.site_description || defaultSettings.site_description;

        // Core meta tags
        updateMetaTag('meta[name="description"]', 'content', desc!);
        updateMetaTag('meta[name="robots"]', 'content', 'index, follow, max-image-preview:large');

        // OG tags
        updateMetaTag('meta[property="og:title"]', 'content', data.site_name || defaultSettings.site_name);
        updateMetaTag('meta[property="og:description"]', 'content', desc!);
        updateMetaTag('meta[property="og:url"]', 'content', window.location.origin);
        updateMetaTag('meta[property="og:site_name"]', 'content', data.site_name || defaultSettings.site_name);

        // Twitter tags
        updateMetaTag('meta[name="twitter:title"]', 'content', data.site_name || defaultSettings.site_name);
        updateMetaTag('meta[name="twitter:description"]', 'content', desc!);

        // Google verification
        const gvCode = (data as any).google_verification_code;
        if (gvCode) {
          updateMetaTag('meta[name="google-site-verification"]', 'content', gvCode);
        }

        // SEO keywords
        const seoKw = (data as any).seo_keywords;
        if (seoKw) {
          updateMetaTag('meta[name="keywords"]', 'content', seoKw);
        }

        // Canonical URL
        updateCanonicalLink();

        // JSON-LD
        injectJsonLd(merged);
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refetch: fetchSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

export function getReferralUrl(referralCode: string): string {
  return `${getBaseUrl()}/auth?ref=${referralCode}`;
}
