import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';

const METRIC_SAMPLE_RATE = 0.15;
const MAX_ENDPOINT_LENGTH = 180;

function sanitizeEndpoint(input: string) {
  try {
    const url = new URL(input, window.location.origin);
    if (url.hostname !== window.location.hostname && !url.hostname.includes('supabase.co')) return null;
    return `${url.pathname}${url.search ? '?' + url.search.slice(1, 80) : ''}`.slice(0, MAX_ENDPOINT_LENGTH);
  } catch {
    return String(input).slice(0, MAX_ENDPOINT_LENGTH);
  }
}

function recordMetric(payload: {
  user_id?: string | null;
  metric_type: 'page_load' | 'api_latency' | 'stk_latency';
  route?: string | null;
  endpoint?: string | null;
  duration_ms: number;
  status_code?: number | null;
  success?: boolean;
  metadata?: Record<string, unknown>;
}) {
  if (Math.random() > METRIC_SAMPLE_RATE) return;
  const body = {
    user_id: payload.user_id ?? null,
    metric_type: payload.metric_type,
    route: payload.route ?? window.location.pathname,
    endpoint: payload.endpoint ?? null,
    duration_ms: Math.max(0, Math.round(payload.duration_ms)),
    status_code: payload.status_code ?? null,
    success: payload.success ?? true,
    metadata: payload.metadata ?? {},
  };
  const schedule = window.requestIdleCallback || ((cb: () => void) => window.setTimeout(cb, 1500));
  schedule(() => {
    supabase.from('performance_metrics' as any).insert(body).then(() => undefined);
  });
}

let fetchPatched = false;

export function PerformanceMonitor() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      recordMetric({
        user_id: user?.id,
        metric_type: 'page_load',
        route: location.pathname,
        duration_ms: nav.loadEventEnd || nav.domContentLoadedEventEnd || nav.responseEnd,
        metadata: {
          domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
          responseEnd: Math.round(nav.responseEnd),
        },
      });
    }
  }, [location.pathname, user?.id]);

  useEffect(() => {
    if (fetchPatched) return;
    fetchPatched = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const started = performance.now();
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      try {
        const response = await originalFetch(input, init);
        const endpoint = sanitizeEndpoint(url);
        if (endpoint && !endpoint.includes('performance_metrics')) {
          const metricType = endpoint.includes('/functions/v1/mpesa-stk') ? 'stk_latency' : 'api_latency';
          recordMetric({
            user_id: user?.id,
            metric_type: metricType,
            endpoint,
            duration_ms: performance.now() - started,
            status_code: response.status,
            success: response.ok,
          });
        }
        return response;
      } catch (error) {
        const endpoint = sanitizeEndpoint(url);
        if (endpoint) {
          recordMetric({
            user_id: user?.id,
            metric_type: 'api_latency',
            endpoint,
            duration_ms: performance.now() - started,
            success: false,
            metadata: { error: error instanceof Error ? error.message : 'fetch_failed' },
          });
        }
        throw error;
      }
    };
  }, [user?.id]);

  return null;
}
