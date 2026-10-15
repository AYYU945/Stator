import { useState, useEffect, useCallback } from 'react';

export type LicenseTier = 'free' | 'monthly' | 'lifetime';

export interface StatorLicense {
  isPro: boolean;
  tier: LicenseTier;
  key: string | null;
  activatedAt: string | null;
  expiresAt: string | null; // null for lifetime
}

export const FREE_LIMITS = {
  maxQueueBatch: 3,
  maxResolution: '1080p',
  hardwareThreads: 2,
};

export const PRO_LIMITS = {
  maxQueueBatch: 100,
  maxResolution: '4K',
  hardwareThreads: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8,
};

const STORAGE_KEY = 'stator_license';

const DEFAULT_FREE_LICENSE: StatorLicense = {
  isPro: false,
  tier: 'free',
  key: null,
  activatedAt: null,
  expiresAt: null,
};

export function getStoredLicense(): StatorLicense {
  if (typeof window === 'undefined') return DEFAULT_FREE_LICENSE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FREE_LICENSE;
    const parsed = JSON.parse(raw) as StatorLicense;
    if (parsed && typeof parsed.isPro === 'boolean') {
      // Check expiration if monthly
      if (parsed.tier === 'monthly' && parsed.expiresAt) {
        const isExpired = new Date(parsed.expiresAt).getTime() < Date.now();
        if (isExpired) {
          return DEFAULT_FREE_LICENSE;
        }
      }
      return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT_FREE_LICENSE;
}

export function saveLicense(license: StatorLicense): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(license));
    window.dispatchEvent(new CustomEvent('stator:license_change', { detail: license }));
  } catch (e) {
    console.warn('Failed to store stator_license', e);
  }
}

export function validateLicenseKey(rawKey: string): { valid: boolean; tier: LicenseTier; error?: string } {
  const cleanKey = rawKey.trim().toUpperCase();

  // Special direct developer test key requested
  if (cleanKey === 'STTR-TEST-PRO-2026') {
    return { valid: true, tier: 'lifetime' };
  }

  // Pattern: STTR-XXXX-XXXX-XXXX (where parts can be 3 to 5 alphanumeric chars)
  const pattern = /^STTR-[A-Z0-9]{3,5}-[A-Z0-9]{3,5}-[A-Z0-9]{3,5}$/;
  if (!pattern.test(cleanKey)) {
    return {
      valid: false,
      tier: 'free',
      error: 'Invalid license format. Must match STTR-XXXX-XXXX-XXXX.',
    };
  }

  // Tier determination: LIFE, TEST, or PRO indicates lifetime pass
  if (cleanKey.includes('LIFE') || cleanKey.includes('TEST')) {
    return { valid: true, tier: 'lifetime' };
  }
  return { valid: true, tier: 'monthly' };
}

export function activateLicenseKey(rawKey: string): { success: boolean; error?: string; license?: StatorLicense } {
  const check = validateLicenseKey(rawKey);
  if (!check.valid) {
    return { success: false, error: check.error || 'Invalid key' };
  }

  const now = new Date();
  const expiresAt =
    check.tier === 'monthly'
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const newLicense: StatorLicense = {
    isPro: true,
    tier: check.tier,
    key: rawKey.trim().toUpperCase(),
    activatedAt: now.toISOString(),
    expiresAt,
  };

  saveLicense(newLicense);
  return { success: true, license: newLicense };
}

export function deactivateLicense(): void {
  saveLicense(DEFAULT_FREE_LICENSE);
}

// Global hook to read license state and trigger upgrade modal
export function useLicense() {
  const [license, setLicense] = useState<StatorLicense>(getStoredLicense);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);

  useEffect(() => {
    const handleSync = () => {
      setLicense(getStoredLicense());
    };

    window.addEventListener('stator:license_change', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('stator:license_change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const openUpgradeModal = useCallback((reason?: string) => {
    setUpgradeReason(reason || null);
    setIsUpgradeModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false);
    setUpgradeReason(null);
  }, []);

  return {
    license,
    isPro: license.isPro,
    tier: license.tier,
    isUpgradeModalOpen,
    isProModalOpen: isUpgradeModalOpen,
    upgradeReason,
    openUpgradeModal,
    openProModal: openUpgradeModal,
    closeUpgradeModal,
    closeProModal: closeUpgradeModal,
    activate: activateLicenseKey,
    deactivate: deactivateLicense,
  };
}
