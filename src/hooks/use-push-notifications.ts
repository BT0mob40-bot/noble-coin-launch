import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const VAPID_STORAGE_KEY = 'push-notifications-enabled';

export function usePushNotifications(userId?: string) {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const supported = 'Notification' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
      setIsEnabled(localStorage.getItem(VAPID_STORAGE_KEY) === 'true' && Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        setIsEnabled(true);
        localStorage.setItem(VAPID_STORAGE_KEY, 'true');
        toast.success('Push notifications enabled!');
        return true;
      } else {
        toast.error('Notification permission denied');
        return false;
      }
    } catch {
      toast.error('Failed to request notification permission');
      return false;
    }
  }, [isSupported]);

  const disable = useCallback(() => {
    setIsEnabled(false);
    localStorage.setItem(VAPID_STORAGE_KEY, 'false');
    toast.info('Push notifications disabled');
  }, []);

  const sendLocalNotification = useCallback((title: string, body: string, icon?: string) => {
    if (!isEnabled || Notification.permission !== 'granted') return;
    try {
      new Notification(title, {
        body,
        icon: icon || '/placeholder.svg',
        badge: '/placeholder.svg',
        tag: `${Date.now()}`,
      });
    } catch {
      // Silent fail for unsupported contexts
    }
  }, [isEnabled]);

  return { isSupported, isEnabled, permission, requestPermission, disable, sendLocalNotification };
}

// Price alert types  
export interface PriceAlert {
  id: string;
  coinId: string;
  coinName: string;
  coinSymbol: string;
  targetPrice: number;
  direction: 'above' | 'below';
  isActive: boolean;
  createdAt: string;
}

const ALERTS_KEY = 'price-alerts';

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(ALERTS_KEY);
    if (stored) setAlerts(JSON.parse(stored));
  }, []);

  const save = (newAlerts: PriceAlert[]) => {
    setAlerts(newAlerts);
    localStorage.setItem(ALERTS_KEY, JSON.stringify(newAlerts));
  };

  const addAlert = (alert: Omit<PriceAlert, 'id' | 'isActive' | 'createdAt'>) => {
    const newAlert: PriceAlert = {
      ...alert,
      id: crypto.randomUUID(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    save([...alerts, newAlert]);
    return newAlert;
  };

  const removeAlert = (id: string) => {
    save(alerts.filter(a => a.id !== id));
  };

  const toggleAlert = (id: string) => {
    save(alerts.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  const checkAlerts = (coinId: string, currentPrice: number) => {
    const triggered: PriceAlert[] = [];
    const remaining = alerts.map(alert => {
      if (!alert.isActive || alert.coinId !== coinId) return alert;
      const hit = alert.direction === 'above'
        ? currentPrice >= alert.targetPrice
        : currentPrice <= alert.targetPrice;
      if (hit) {
        triggered.push(alert);
        return { ...alert, isActive: false };
      }
      return alert;
    });
    if (triggered.length > 0) save(remaining);
    return triggered;
  };

  return { alerts, addAlert, removeAlert, toggleAlert, checkAlerts };
}
