import React, { useState } from 'react';
import { X, Check, Lock, ShieldCheck, Zap, Layers, Cpu, Music2, ExternalLink } from 'lucide-react';
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

    if (!licenseKeyInput.trim()) {
      setKeyError('Please provide a valid license key.');
      return;
    }

    setIsActivating(true);
    const result = activateLicenseKey(licenseKeyInput);
    setIsActivating(false);

    if (result.success && result.license) {
      setKeySuccess(`Stator Pro (${result.license.tier.toUpperCase()}) successfully activated.`);
      if (onActivated) {
        onActivated(result.license);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setKeyError(result.error || 'Failed to validate license key.');
    }
  };

  const handleCheckoutRedirect = () => {
    // In production, redirects to Merchant of Record checkout flow
    // Here we provide interactive checkout simulation or checkout URL
    const checkoutUrl =
      selectedPlan === 'lifetime'
        ? 'https://checkout.stator.media/buy/stator-pro-lifetime'
        : 'https://checkout.stator.media/buy/stator-pro-monthly';
    
    // Fallback: provide direct instant test activation shortcut if user clicks checkout
    const sampleKey =
      selectedPlan === 'lifetime' ? 'STTR-LIFE-2026-X892' : 'STTR-PRO8-2026-K104';
    setLicenseKeyInput(sampleKey);
    setKeyError(null);
    setKeySuccess(`Demo checkout sample key generated: ${sampleKey}. Click Activate to apply.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 max-w-lg w-full shadow-2xl relative max-h-[92vh] overflow-y-auto no-scrollbar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-upgrade-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Reason banner if triggered by a gate */}
        {reason && (
          <div className="mb-4 p-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300">
            <Lock className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            <span>{reason}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="space-y-1.5 pr-6">
          <div className="flex items-center gap-2">
            <h2
              id="pro-upgrade-title"
              className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              Stator Pro
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-md">
              Industrial Utility
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Unlock unconstrained local processing power. All conversion workloads execute entirely in browser memory on your device.
          </p>
        </div>

        {/* Already Pro State Info */}
        {isPro && (
          <div className="my-5 p-4 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
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

        {/* Feature Comparison Grid */}
        <div className="my-5 border-y border-zinc-200 dark:border-zinc-800/80 py-4 space-y-2.5">
          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider">
            Included Capabilities
          </div>
          <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
            <li className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-zinc-900 dark:text-zinc-100" />
              </div>
              <span>2K &amp; 4K Lanczos-3 Resolution Upscaling</span>
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <Layers className="w-3 h-3 text-zinc-900 dark:text-zinc-100" />
              </div>
              <span>Uncapped Batch Queue Processing (50+ files)</span>
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <Cpu className="w-3 h-3 text-zinc-900 dark:text-zinc-100" />
              </div>
              <span>Maximum Multi-Core Hardware Concurrency</span>
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <Music2 className="w-3 h-3 text-zinc-900 dark:text-zinc-100" />
              </div>
              <span>High-Fidelity Audio Bitrates (320 kbps MP3 &amp; Lossless FLAC)</span>
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <Zap className="w-3 h-3 text-zinc-900 dark:text-zinc-100" />
              </div>
              <span>Zero Cloud Egress Guaranteed</span>
            </li>
          </ul>
        </div>

        {/* Plan Selector */}
        <div className="space-y-2 mb-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedPlan('monthly')}
              className={`p-3 text-left rounded-md border transition-colors cursor-pointer ${
                selectedPlan === 'monthly'
                  ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-200 text-zinc-900 dark:text-white'
                  : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
              }`}
            >
              <div className="text-xs font-medium">Monthly Access</div>
              <div className="text-base font-semibold text-zinc-900 dark:text-white mt-1">€4.99 / mo</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-tight">
                Billed monthly. Cancel anytime with one click.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlan('lifetime')}
              className={`p-3 text-left rounded-md border transition-colors cursor-pointer relative ${
                selectedPlan === 'lifetime'
                  ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-200 text-zinc-900 dark:text-white'
                  : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
              }`}
            >
              <span className="absolute top-2 right-2 text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold">
                Best Value
              </span>
              <div className="text-xs font-medium">Lifetime Pass</div>
              <div className="text-base font-semibold text-zinc-900 dark:text-white mt-1">€59 one-time</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-tight">
                Single payment. Permanent offline access including all future updates.
              </div>
            </button>
          </div>
        </div>

        {/* Purchase Action & Legal Waiver */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleCheckoutRedirect}
            className="bg-zinc-900 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium py-2.5 px-4 rounded-md text-sm w-full transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Continue to Secure Checkout</span>
            <ExternalLink className="w-4 h-4" />
          </button>

          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center leading-normal px-2">
            Order processed by Merchant of Record. By proceeding, you consent to immediate contract performance and waive your statutory 14-day right of withdrawal once digital license activation occurs.
          </p>
        </div>

        {/* License Key Activation Row */}
        <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
            <span>Already have a license key?</span>
            <span className="font-mono text-[10px] text-zinc-400">STTR-XXXX-XXXX-XXXX</span>
          </div>

          <form onSubmit={handleActivateKey} className="flex gap-2">
            <input
              type="text"
              value={licenseKeyInput}
              onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
              placeholder="STTR-XXXX-XXXX-XXXX"
              className="flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-md px-3 py-1.5 text-xs font-mono uppercase text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
            />
            <button
              type="submit"
              disabled={isActivating}
              className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-200 dark:hover:bg-zinc-300 text-white dark:text-zinc-900 rounded-md text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              {isActivating ? 'Verifying...' : 'Activate'}
            </button>
          </form>

          {keyError && (
            <div className="text-[11px] text-rose-500 font-mono">
              {keyError}
            </div>
          )}

          {keySuccess && (
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
              {keySuccess}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
