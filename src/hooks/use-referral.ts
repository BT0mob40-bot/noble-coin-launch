import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const REFERRAL_STORAGE_KEY = 'crypto_referral_code';
const REFERRAL_EXPIRY_KEY = 'crypto_referral_expiry';
const REFERRAL_EXPIRY_DAYS = 30;

export function useReferral() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      // Store referral code with expiry
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + REFERRAL_EXPIRY_DAYS);
      
      localStorage.setItem(REFERRAL_STORAGE_KEY, refCode);
      localStorage.setItem(REFERRAL_EXPIRY_KEY, expiryDate.toISOString());
    }
  }, [searchParams]);
}

export function getReferralCode(): string | null {
  const code = localStorage.getItem(REFERRAL_STORAGE_KEY);
  const expiry = localStorage.getItem(REFERRAL_EXPIRY_KEY);
  
  if (!code || !expiry) return null;
  
  // Check if expired
  if (new Date() > new Date(expiry)) {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    localStorage.removeItem(REFERRAL_EXPIRY_KEY);
    return null;
  }
  
  return code;
}

export function clearReferralCode(): void {
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
  localStorage.removeItem(REFERRAL_EXPIRY_KEY);
}