import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const REFERRAL_STORAGE_KEY = 'crypto_referral_code';
const REFERRAL_EXPIRY_KEY = 'crypto_referral_expiry';
const REFERRAL_COOKIE_NAME = 'ref_code';
const REFERRAL_EXPIRY_DAYS = 30;

function setCookie(name: string, value: string, days: number) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${date.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

function storeReferral(code: string) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + REFERRAL_EXPIRY_DAYS);

  // Dual storage: localStorage + cookie for resilience
  localStorage.setItem(REFERRAL_STORAGE_KEY, code);
  localStorage.setItem(REFERRAL_EXPIRY_KEY, expiryDate.toISOString());
  setCookie(REFERRAL_COOKIE_NAME, code, REFERRAL_EXPIRY_DAYS);
}

export function useReferral() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      storeReferral(refCode);
    }
  }, [searchParams]);
}

export function getReferralCode(): string | null {
  // Try localStorage first
  const code = localStorage.getItem(REFERRAL_STORAGE_KEY);
  const expiry = localStorage.getItem(REFERRAL_EXPIRY_KEY);

  if (code && expiry && new Date() <= new Date(expiry)) {
    return code;
  }

  // Fallback to cookie (survives localStorage clears)
  const cookieCode = getCookie(REFERRAL_COOKIE_NAME);
  if (cookieCode) {
    // Re-sync to localStorage
    storeReferral(cookieCode);
    return cookieCode;
  }

  // Expired — clean up
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
  localStorage.removeItem(REFERRAL_EXPIRY_KEY);
  return null;
}

export function clearReferralCode(): void {
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
  localStorage.removeItem(REFERRAL_EXPIRY_KEY);
  deleteCookie(REFERRAL_COOKIE_NAME);
}
