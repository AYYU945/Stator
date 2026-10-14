import React from 'react';
import { ArrowLeft, Scale, ShieldAlert, FileText, Mail, ShoppingCart, RefreshCw } from 'lucide-react';

export interface TermsOfServiceProps {
  onBack: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-zinc-700 dark:text-zinc-300">
      <div className="mb-8 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Engine</span>
        </button>
        <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">Effective Date: October 2026</span>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-2">
            Terms of Service
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Please read these terms carefully before utilizing the Stator utility or purchasing a commercial license.
          </p>
        </div>

        {/* Section 1: Acceptance & License */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <Scale className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>1. License and Local Client Execution</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Stator, LLC grants you a personal, non-exclusive, revocable, and non-transferable license to access and use the software utility directly within your web browser. All execution happens on your local client machine without transmission of file payloads. You agree not to reverse-engineer, exploit, or disrupt any delivery mechanisms or underlying APIs beyond normal browser interactions.
          </p>
        </div>

        {/* Section 2: User Responsibility & Content Ownership */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <ShieldAlert className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>2. Intellectual Property and Content Responsibility</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            You maintain full ownership of all files, images, videos, audio recordings, and documents processed using this utility. Stator, LLC never acquires any copyright, trademark, or license rights in or to your uploaded or converted files.
          </p>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            You represent and warrant that you hold all necessary licenses, copyrights, permissions, and rights to convert and process the files you supply. You agree not to process material that infringes third-party intellectual property rights or violates applicable local, national, or international regulations.
          </p>
        </div>

        {/* Section 3: Commercial Terms, Merchant of Record & Statutory Waiver */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <ShoppingCart className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>3. Commercial Terms, Merchant of Record &amp; Digital Content Waiver</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            All commercial transactions, subscriptions, and lifetime license purchases for Stator Pro are facilitated and processed by our designated third-party Merchant of Record (such as Paddle or Lemon Squeezy). The Merchant of Record is the merchant of record for all purchases, handles billing inquiries, collects applicable sales tax and VAT, and issues sales invoices.
          </p>
          <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-md p-4 text-xs font-mono text-zinc-700 dark:text-zinc-300 space-y-2">
            <div className="font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
              Statutory EU / UK Right of Withdrawal Waiver
            </div>
            <p className="leading-relaxed">
              In accordance with Directive 2011/83/EU on Consumer Rights and UK Consumer Contracts Regulations, you explicitly acknowledge and agree that the supply of digital software licenses (Stator Pro) commences immediately upon the generation or activation of your license key. You expressly agree that by initiating digital activation, you waive any statutory 14-day right of withdrawal or cooling-off period.
            </p>
          </div>
        </div>

        {/* Section 4: Subscription Auto-Renewal and Cancellation */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <RefreshCw className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>4. Subscription Auto-Renewal and Cancellation</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Monthly access subscriptions renew automatically every 30 days at the prevailing stated rate unless cancelled prior to the renewal date via the customer billing portal. Lifetime passes represent a single, non-recurring charge granting permanent access to Pro tier capabilities.
          </p>
        </div>

        {/* Section 5: Disclaimer & Limitation of Liability */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <Mail className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>5. Disclaimer of Warranty and Limitation of Liability</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Stator is provided on an as-is and as-available basis without warranties of any kind, whether express, statutory, or implied. In no event shall Stator, LLC or its contributors be liable for direct, indirect, incidental, special, exemplary, or consequential damages arising out of the performance, failure, or use of the client-side conversion routines.
          </p>
        </div>

        {/* Section 6: DMCA Designated Agent Notification Procedure */}
        <div id="dmca-notice" className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <FileText className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>6. DMCA Designated Agent Notification Procedure</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Because Stator processes all files strictly client-side inside the user browser, our servers do not host, store, cache, or transmit user media. However, in full accordance with the Digital Millennium Copyright Act (17 U.S.C. Section 512), Stator, LLC maintains a designated notification agent for copyright compliance notices.
          </p>

          <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-md p-4 text-xs font-mono text-zinc-700 dark:text-zinc-300 space-y-1">
            <div className="text-zinc-900 dark:text-white font-semibold mb-1">DMCA Designated Agent Contact:</div>
            <div>DMCA Designated Agent, Stator, LLC</div>
            <div>100 Main Street, Suite 400</div>
            <div>Dover, DE 19901</div>
            <div>Email: dmca@stator.media</div>
          </div>

          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            To submit an effective notice of claimed infringement, please furnish our Designated Agent with a written communication containing the following statutory elements:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 pl-2">
            <li>A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
            <li>Identification of the copyrighted work claimed to have been infringed, or a representative list of works.</li>
            <li>Identification of the material claimed to be infringing and information reasonably sufficient to allow us to locate the material.</li>
            <li>Information reasonably sufficient to permit contact with you, including your physical address, telephone number, and valid email address.</li>
            <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
            <li>A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner of the infringed right.</li>
          </ol>
        </div>

        {/* Contact info */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          <p>For legal inquiries, contact legal@stator.media.</p>
        </div>
      </div>
    </div>
  );
};
