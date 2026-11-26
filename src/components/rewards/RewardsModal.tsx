'use client';

import React from 'react';
import { OrchidMotif } from '@/components/brand/OrchidMotif';
import { Gift, X, Lock, Clock } from 'lucide-react';

interface RewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RewardsModal: React.FC<RewardsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-nafas-silt/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="relative bg-nafas-ivory w-full max-w-md rounded-3xl shadow-2xl border border-nafas-reed/30 overflow-hidden animate-in fade-in zoom-in-95 text-right font-arabic"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-nafas-silt text-nafas-limestone px-6 py-4 flex items-center justify-between border-b border-white/10">
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-white transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <OrchidMotif variant="icon" size="sm" />
            <span className="font-black text-lg text-nafas-limestone">
              الشراكات والهدايا
            </span>
            <Gift className="w-5 h-5 text-nafas-clay" />
          </div>
        </div>

        {/* Locked Coming Soon Content */}
        <div className="p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center mx-auto text-amber-700 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold">
            <Clock className="w-3.5 h-3.5" />
            <span>قريباً</span>
          </span>

          <h3 className="text-xl font-black text-nafas-silt">
            قسم الشراكات والهدايا مغلق حالياً
          </h3>

          <p className="text-sm text-nafas-silt/75 leading-relaxed">
            نعمل حالياً على إبرام الشراكات الرسمية واعتماد متجر الهدايا والمزايا البيئية للمتطوعين. سيتم افتتاح القسم قريباً جداً.
          </p>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-nafas-silt hover:bg-nafas-silt/90 text-nafas-ivory text-sm font-bold transition-colors"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    </div>
  );
};
