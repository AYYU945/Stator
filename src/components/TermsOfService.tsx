import React from 'react';
import { ArrowLeft, Scale, ShieldAlert, FileText, Mail } from 'lucide-react';

interface TermsOfServiceProps {
  onBack: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-zinc-300">
      <div className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Converter</span>
        </button>
        <span className="text-xs font-mono text-zinc-500">Effective Date: October 2026</span>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-2">
            Terms of Service
          </h1>
          <p className="text-sm text-zinc-400">
            Please read these terms carefully before utilizing the OmniConvert utility.
          </p>
        </div>

        {/* Section 1: Acceptance & License */}
        <div className="bg-[#121214] border border-zinc-800 rounded-lg p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-white font-semibold text-base">
            <Scale className="w-5 h-5 text-zinc-300" />
            <h2>1. License and Local Client Execution</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-300">
            OmniConvert grants you a personal, non-exclusive, revocable, and non-transferable license to access and use the software utility directly within your web browser. All execution happens on your local client machine. You agree not to reverse-engineer, exploit, or disrupt any delivery mechanisms or underlying APIs beyond normal browser interactions.
          </p>
        </div>

        {/* Section 2: User Responsibility & Content Ownership */}
        <div className="bg-[#121214] border border-zinc-800 rounded-lg p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-white font-semibold text-base">
            <ShieldAlert className="w-5 h-5 text-zinc-300" />
            <h2>2. Intellectual Property and Content Responsibility</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-300">
            You maintain full ownership of all files, images, videos, audio recordings, and documents processed using this utility. OmniConvert never acquires any copyright, trademark, or license rights in or to your uploaded or converted files.
          </p>
          <p className="text-sm leading-relaxed text-zinc-300">
            You represent and warrant that you hold all necessary licenses, copyrights, permissions, and rights to convert and process the files you supply. You agree not to process material that infringes third-party intellectual property rights or violates applicable local, national, or international regulations.
          </p>
        </div>

        {/* Section 3: DMCA Designated Agent Notification Procedure */}
        <div className="bg-[#121214] border border-zinc-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-white font-semibold text-base">
            <FileText className="w-5 h-5 text-zinc-300" />
            <h2>3. DMCA Designated Agent Notification Procedure</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-300">
            Because OmniConvert processes all files strictly client-side inside the user browser, our servers do not host, store, cache, or transmit user media. However, in full accordance with the Digital Millennium Copyright Act (17 U.S.C. § 512), OmniConvert maintains a designated notification agent for copyright compliance notices.
          </p>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-md p-4 text-xs font-mono text-zinc-300 space-y-1">
            <div className="text-white font-semibold mb-1">DMCA Designated Agent Contact:</div>
            <div>DMCA Designated Agent, OmniConvert, LLC</div>
            <div>100 Main Street, Suite 400</div>
            <div>Dover, DE 19901</div>
            <div>Email: dmca@omniconvert.app</div>
          </div>

          <p className="text-sm leading-relaxed text-zinc-300">
            To submit an effective notice of claimed infringement, please furnish our Designated Agent with a written communication containing the following statutory elements:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-zinc-400 pl-2">
            <li>A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
            <li>Identification of the copyrighted work claimed to have been infringed, or a representative list of works.</li>
            <li>Identification of the material claimed to be infringing and information reasonably sufficient to allow us to locate the material.</li>
            <li>Information reasonably sufficient to permit contact with you, including your physical address, telephone number, and valid email address.</li>
            <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
            <li>A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner of the infringed right.</li>
          </ol>
        </div>

        {/* Section 4: Disclaimer & Limitation of Liability */}
        <div className="bg-[#121214] border border-zinc-800 rounded-lg p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-white font-semibold text-base">
            <Mail className="w-5 h-5 text-zinc-300" />
            <h2>4. Disclaimer of Warranty and Limitation of Liability</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-300">
            OmniConvert is provided on an as-is and as-available basis without warranties of any kind, whether express, statutory, or implied. In no event shall OmniConvert, LLC or its contributors be liable for direct, indirect, incidental, special, consequential, or exemplary damages arising out of the performance, failure, or use of the client-side conversion routines.
          </p>
        </div>

        {/* Contact info */}
        <div className="pt-4 border-t border-zinc-800 text-xs text-zinc-500">
          <p>For legal inquiries, contact legal@omniconvert.app.</p>
        </div>
      </div>
    </div>
  );
};
