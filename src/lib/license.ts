import { useState, useCallback } from 'react';

export type LicenseTier = 'open-source';

export interface StatorLicense {
  isPro: boolean;
  tier: LicenseTier;
  key: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
}

const FULL_THREADS =
  typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8;

export const FREE_LIMITS = {
  maxQueueBatch: Infinity,
  maxResolution: '4K',
  hardwareThreads: FULL_THREADS,
};

export const PRO_LIMITS = {
  maxQueueBatch: Infinity,
  maxResolution: '4K',
  hardwareThreads: FULL_THREADS,
};

const OPEN_SOURCE_LICENSE: StatorLicense = {
  isPro: true,
  tier: 'open-source',
  key: null,
  activatedAt: null,
  expiresAt: null,
};

export function getStoredLicense(): StatorLicense {
  return OPEN_SOURCE_LICENSE;
}

export function saveLicense(_license: StatorLicense): void {
  // No-op in MIT open-source edition; all features are permanently unlocked.
}

export function validateLicenseKey(_rawKey: string): {
  valid: boolean;
  tier: LicenseTier;
  error?: string;
} {
  return { valid: true, tier: 'open-source' };
}

export function activateLicenseKey(_rawKey: string): {
  success: boolean;
  error?: string;
  license?: StatorLicense;
} {
  return { success: true, license: OPEN_SOURCE_LICENSE };
}

export function deactivateLicense(): void {
  // No-op in MIT open-source edition.
}

// Open-source edition compatibility hook: all capabilities unlocked by default
export function useLicense() {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);

  const openUpgradeModal = useCallback((_reason?: string) => {
    setUpgradeReason(null);
    setIsUpgradeModalOpen(false);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false);
    setUpgradeReason(null);
  }, []);

  return {
    license: OPEN_SOURCE_LICENSE,
    isPro: true,
    tier: 'open-source' as LicenseTier,
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
