'use client';

import React from 'react';
import { IssuedCertificate } from '@/types';
import { X, Award, ShieldCheck, Printer, CheckCircle2 } from 'lucide-react';

interface CertModalProps {
  certificate: IssuedCertificate | null;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertModalProps> = ({ certificate, onClose }) => {
  if (!certificate) return null;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-nafas-silt/80 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        className="relative bg-nafas-ivory w-full max-w-3xl rounded-3xl shadow-2xl border-4 border-nafas-blue/40 overflow-hidden animate-in fade-in zoom-in-95 text-center font-arabic"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Control Bar (Hidden on print) */}
        <div className="bg-nafas-silt text-nafas-limestone px-6 py-3 flex items-center justify-between print:hidden">
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-nafas-ivory/10 text-white transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
          
          <span className="text-xs font-bold text-white/85">
            معاينة الشهادة الرقمية المعتمدة
          </span>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg bg-nafas-blue hover:bg-nafas-blue text-nafas-ivory text-xs font-bold flex items-center gap-1.5 transition-colors shadow"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة / حفظ PDF</span>
          </button>
        </div>

        {/* Certificate Inner Canvas */}
        <div className="p-8 sm:p-12 bg-gradient-to-b from-[#F4EFE5] via-white to-[#F4EFE5] relative">
          
          {/* Ornate Mesopotamian Border */}
          <div className="absolute inset-4 border-2 border-[#28566E]/40 rounded-2xl pointer-events-none" />
          <div className="absolute inset-6 border border-[#302D29]/15 rounded-xl pointer-events-none" />

          {/* Mesopotamian Seal Header */}
          <div className="space-y-3 relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-nafas-blue/10 border-2 border-nafas-blue text-nafas-blue shadow-md mb-2">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold tracking-widest uppercase text-nafas-blue font-latin">
                REPUBLIC OF IRAQ • CIVIC ENVIRONMENTAL RESTORATION
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-nafas-silt">
                شهادة خدمة بيئية ومشاركة مجتمعية
              </h2>
              <p className="text-xs text-nafas-neutral-slate font-medium">
                صادرة عن منصة «نَفَس — نبض بلاد الرافدين»
              </p>
            </div>
          </div>

          {/* Certificate Body Text */}
          <div className="my-8 space-y-4 max-w-xl mx-auto text-center relative z-10">
            <p className="text-sm text-nafas-neutral-slate">
              تُمنح هذه الشهادة المعتمدة تقديراً وتكريماً للمتطوع/ـة:
            </p>

            <div className="text-2xl sm:text-3xl font-black text-nafas-silt py-2 border-b-2 border-nafas-blue/30 inline-block px-8">
              {certificate.participantName}
            </div>

            <p className="text-sm text-nafas-neutral-slate leading-relaxed pt-2">
              لمشاركتهـ/ـا الفاعلة والميدانية الموثقة في:
              <br />
              <strong className="text-base text-nafas-silt font-bold">
                «{certificate.campaignTitle}»
              </strong>
              <br />
              بمحافظة {certificate.governorate}، مساهماً/ـةً في حماية البيئة العراقية بإجمالي:
            </p>

            <div className="inline-flex items-center gap-2 bg-nafas-silt text-white px-5 py-2 rounded-xl text-sm font-bold shadow">
              <CheckCircle2 className="w-4 h-4 text-nafas-misty" />
              <span>{certificate.hoursAwarded} ساعات تطوعية ميدانية موثّقة</span>
            </div>
          </div>

          {/* Signatures & QR Code Section */}
          <div className="pt-8 border-t border-nafas-reed/10 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center text-xs text-nafas-neutral-slate relative z-10">
            
            {/* Signature 1 */}
            <div className="space-y-1 text-center sm:text-right">
              <span className="text-[11px] text-gray-500 block">توقيع منسق الحملة:</span>
              <div className="font-bold text-nafas-silt text-sm">
                {certificate.organizerSignature}
              </div>
              <span className="text-[10px] text-nafas-blue font-arabic block">منسق بيئي معتمد</span>
            </div>

            {/* Central Official Digital Seal */}
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-nafas-blue flex items-center justify-center bg-nafas-sand text-nafas-blue shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-bold text-nafas-silt">الختم الرقمي المعتمد</span>
            </div>

            {/* QR Code & Verification Reference */}
            <div className="space-y-1 text-center sm:text-left flex flex-col items-center sm:items-end">
              {/* Simulated QR Code SVG */}
              <div className="w-16 h-16 bg-nafas-ivory p-1 rounded-lg border border-nafas-reed/40 shadow-sm flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-full h-full fill-nafas-midnight">
                  <rect x="2" y="2" width="10" height="10" />
                  <rect x="4" y="4" width="6" height="6" fill="white" />
                  <rect x="28" y="2" width="10" height="10" />
                  <rect x="30" y="4" width="6" height="6" fill="white" />
                  <rect x="2" y="28" width="10" height="10" />
                  <rect x="4" y="30" width="6" height="6" fill="white" />
                  <rect x="16" y="6" width="8" height="4" />
                  <rect x="18" y="14" width="4" height="12" />
                  <rect x="26" y="20" width="10" height="4" />
                  <rect x="28" y="28" width="8" height="8" />
                </svg>
              </div>
              <span className="text-[10px] font-mono font-bold text-nafas-blue">
                {certificate.verificationCode}
              </span>
              <span className="text-[9px] text-gray-500">امسح للتحقق الفوري</span>
            </div>

          </div>

          {/* Bottom Security Hash */}
          <div className="mt-8 pt-4 border-t border-nafas-reed/30 text-[10px] text-gray-400 font-mono flex items-center justify-between">
            <span>التوثيق: {certificate.digitalSealHash}</span>
            <span>تاريخ الإصدار: {certificate.issueDate}</span>
          </div>

        </div>
      </div>
    </div>
  );
};
