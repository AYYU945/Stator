import React, { useState } from 'react';
import { X, Check, Lock, ShieldCheck } from 'lucide-react';
import { useLicense, activateLicenseKey, StatorLicense } from '../../lib/license.ts';

export interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string | null;
  onActivated?: (license: StatorLicense) => void;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({
  isOpen,
  onClose,
  reason,
  onActivated,
}) => {
  const { isPro, license, deactivate } = useLicense();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'lifetime'>('lifetime');
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySuccess, setKeySuccess] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  if (!isOpen) return null;

  const handleActivateKey = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError(null);
    setKeySuccess(null);

    const key = licenseKeyInput.trim();
    if (!key) {
      setKeyError('Please provide a valid license key.');
      return;
    }

    setIsActivating(true);
    const result = activateLicenseKey(key);
    setIsActivating(false);

    if (result.success && result.license) {
      setKeySuccess(`Stator Pro (${result.license.tier.toUpperCase()}) activated.`);
      if (onActivated) {
        onActivated(result.license);
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setKeyError(result.error || 'Failed to validate license key.');
    }
  };

  const handleCheckout = () => {
    // Demo helper: pre-fill instant activation test key
    const demoKey = selectedPlan === 'lifetime' ? 'STTR-TEST-PRO-2026' : 'STTR-PRO8-2026-K104';
    setLicenseKeyInput(demoKey);
    setKeyError(null);
    setKeySuccess(`Direct activation key populated: ${demoKey}. Click Activate.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-[#111113] border border-zinc-200 dark:border-zinc-800 rounded-lg max-w-md w-full p-6 shadow-2xl relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-upgrade-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4 text-zinc-400 hover:text-zinc-200" />
        </button>

        {/* Reason banner if triggered by a gate */}
        {reason && (
          <div className="mb-4 p-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
            <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
            <span>{reason}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="space-y-0.5 pr-6">
          <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">
            STATOR PRO // HARDWARE RUNTIME
          </div>
          <h2
            id="pro-upgrade-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight mt-1"
          >
            Stator Pro
          </h2>
        </div>

        {/* Already Pro State Info */}
        {isPro && (
          <div className="my-3.5 p-3 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Active Pro License ({license.tier.toUpperCase()})
              </span>
              <button
                onClick={deactivate}
                className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
              >
                Deactivate
              </button>
            </div>
            <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              Key: {license.key || 'Active'}
            </div>
          </div>
        )}

        {/* Feature List (Grid of clean technical specs with neutral check icons, no emojis) */}
        <div className="my-4 border-y border-zinc-200 dark:border-zinc-800 py-3 space-y-0.5">
          {[
            '2K (1440p) & 4K (2160p) Lanczos-3 resolution upscaling',
            'Studio audio encoding up to 320 kbps and lossless audio',
            'Uncapped batch conversion queue (50+ simultaneous files)',
            'Unrestricted multi-core CPU thread concurrency',
            'Zero cloud egress: 100% offline in-browser virtual memory',
          ].map((feature, idx) => (
            <div key={idx} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center py-1">
              <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 mr-2.5 shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {/* Dual Plan Selector (Precision Segmented Box) */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-md my-4">
          {/* Monthly Option */}
          <button
            type="button"
            onClick={() => setSelectedPlan('monthly')}
            className={`p-2.5 text-left rounded-md border transition-all cursor-pointer ${
              selectedPlan === 'monthly'
                ? 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 shadow-sm'
                : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-800'
            }`}
          >
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Monthly</div>
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">€4.99</div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">per month</div>
          </button>

          {/* Lifetime Option (Default) */}
          <button
            type="button"
            onClick={() => setSelectedPlan('lifetime')}
            className={`p-2.5 text-left rounded-md border transition-all cursor-pointer relative ${
              selectedPlan === 'lifetime'
                ? 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 shadow-sm'
                : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-800'
            }`}
          >
            <span className="absolute top-2 right-2 text-[9px] font-mono px-1.5 py-0.2 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-sm">
              LIFETIME
            </span>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Perpetual</div>
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">€59</div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">one-time payment</div>
          </button>
        </div>

        {/* Primary Call to Action */}
        <button
          type="button"
          onClick={handleCheckout}
          className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium text-xs rounded-md transition-colors shadow-sm cursor-pointer"
        >
          {selectedPlan === 'monthly' ? 'Get Stator Pro Monthly' : 'Get Stator Pro Lifetime'}
        </button>

        {/* Statutory Notice */}
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center mt-2 leading-relaxed">
          Billed securely via Merchant of Record. By completing your purchase you waive your statutory 14-day right of withdrawal once digital license activation occurs.
        </p>

        {/* Embedded License Key Activation Row */}
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800/80">
          <label className="text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400 mb-1.5 block">
            Have a license key?
          </label>
          <form onSubmit={handleActivateKey} className="flex items-center">
            <input
              type="text"
              value={licenseKeyInput}
              onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
              placeholder="STTR-XXXX-XXXX-XXXX"
              className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-md px-3 py-1.5 text-xs font-mono uppercase text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 w-full"
            />
            <button
              type="submit"
              disabled={isActivating}
              className="bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-3 py-1.5 rounded-md text-xs font-medium shrink-0 ml-2 transition-colors cursor-pointer"
            >
              {isActivating ? 'Activating...' : 'Activate'}
            </button>
          </form>

          {keyError && (
            <div className="text-[11px] text-rose-500 font-mono mt-1.5">
              {keyError}
            </div>
          )}

          {keySuccess && (
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-1.5">
              {keySuccess}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
