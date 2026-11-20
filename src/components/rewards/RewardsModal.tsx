'use client';

import React, { useState } from 'react';
import { useNafas } from '@/lib/store';
import { OrchidMotif } from '@/components/brand/OrchidMotif';
import { 
  Gift, 
  X, 
  CheckCircle2, 
  MapPin, 
  Sparkles, 
  ShoppingBag, 
  Coffee, 
  Trees, 
  BookOpen,
  ArrowRight
} from 'lucide-react';

interface RewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RewardPartner {
  id: string;
  name: string;
  category: string;
  discount: string;
  pointsRequired: number;
  location: string;
  description: string;
  icon: any;
  color: string;
}

export const RewardsModal: React.FC<RewardsModalProps> = ({ isOpen, onClose }) => {
  const { passport } = useNafas();
  const [claimedRewardId, setClaimedRewardId] = useState<string | null>(null);

  if (!isOpen) return null;

  const partners: RewardPartner[] = [
    {
      id: 'r-1',
      name: 'مشتل الزوراء للأشجار الأصيلة',
      category: 'مشاتل وزراعة',
      discount: 'شتلة نارنج أو سدر مجانية',
      pointsRequired: 80,
      location: 'بغداد — الكرخ / حدائق الزوراء',
      description: 'احصل على شتلة عراقية معتمدة لزراعتها في حديقتك المنزلية أو حيك السكني.',
      icon: Trees,
      color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
    },
    {
      id: 'r-2',
      name: 'مقهى الشابندر الثقافي',
      category: 'ثقافة ومقاهي',
      discount: 'خصم 30% على كل المشروبات',
      pointsRequired: 50,
      location: 'بغداد — شارع المتنبي التاريخي',
      description: 'استمتع بالشاي العراقي المهيّل وأجواء المتنبي العريقة تقديراً لساعاتك التطوعية.',
      icon: Coffee,
      color: 'bg-amber-500/10 text-amber-800 border-amber-500/20'
    },
    {
      id: 'r-3',
      name: 'مؤسسة نخيل البصرة للحرف البيئية',
      category: 'صناعات يدوية ومستدامة',
      discount: 'خصم 25% على منتجات سعف النخيل',
      pointsRequired: 100,
      location: 'البصرة — العشار / شناشيل البصرة',
      description: 'سلال وحقائب يدوية مصنوعة من خوص النخيل العراقي بأيدي حرفيين محليين.',
      icon: ShoppingBag,
      color: 'bg-nafas-clay/10 text-nafas-clay border-nafas-clay/20'
    },
    {
      id: 'r-4',
      name: 'مكتبة زاكروس البيئية',
      category: 'كتب وتعليم بيئي',
      discount: 'قسيمة شراء كتب بقيمة 15,000 دينار',
      pointsRequired: 120,
      location: 'أربيل — شارع 60 متري',
      description: 'كتب ومراجع علمية حول طبيعة العراق ومناخ كوردستان وأشجار الشرق الأوسط.',
      icon: BookOpen,
      color: 'bg-nafas-orchid/10 text-nafas-orchid border-nafas-orchid/20'
    }
  ];

  const handleClaim = (partner: RewardPartner) => {
    if (passport.points < partner.pointsRequired) {
      alert(`عذراً، تحتاج إلى ${partner.pointsRequired} نقطة للحصول على هذه المكافأة. رصيدك الحالي: ${passport.points} نقطة.`);
      return;
    }
    setClaimedRewardId(partner.id);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-nafas-silt/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="relative bg-nafas-ivory w-full max-w-2xl rounded-3xl shadow-2xl border border-nafas-reed/30 overflow-hidden animate-in fade-in zoom-in-95 text-right font-arabic"
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
              مكافآت وشركاء نَفَس
            </span>
            <Gift className="w-5 h-5 text-nafas-clay" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto">
          
          {/* User Points Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-nafas-sand/50 to-nafas-ivory border border-nafas-reed/30 flex items-center justify-between">
            <div>
              <span className="text-xs text-nafas-silt/70 font-semibold block">
                رصيد ساعاتك الموثقة المحول لنقاط
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black font-mono text-nafas-clay">
                  {passport.points}
                </span>
                <span className="text-xs font-bold text-nafas-silt">نقطة أثر</span>
              </div>
            </div>
            <div className="text-left text-xs text-nafas-silt/70">
              <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg font-bold inline-block">
                مؤهل للاستبدال الفوري
              </span>
            </div>
          </div>

          {/* Partners Grid */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-nafas-silt">
              شركاؤنا المحليون الداعمون للتطوع البيئي في العراق
            </h4>

            <div className="space-y-3">
              {partners.map(partner => {
                const Icon = partner.icon;
                const isClaimed = claimedRewardId === partner.id;

                return (
                  <div 
                    key={partner.id}
                    className="p-4 rounded-2xl bg-nafas-sand/30 border border-nafas-reed/30 hover:border-nafas-reed flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${partner.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-nafas-clay">{partner.discount}</span>
                          <span className="text-[10px] text-nafas-silt/60 bg-nafas-ivory px-2 py-0.5 rounded border border-nafas-reed/20">
                            {partner.category}
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-nafas-silt mt-0.5">
                          {partner.name}
                        </h5>
                        <p className="text-xs text-nafas-silt/70 mt-1 leading-relaxed">
                          {partner.description}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-nafas-silt/60 mt-1.5">
                          <MapPin className="w-3 h-3 text-nafas-clay" />
                          <span>{partner.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-left shrink-0">
                      {isClaimed ? (
                        <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold text-center">
                          <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                          <span>كود الخصم: NFS-{partner.id.toUpperCase()}-88</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleClaim(partner)}
                          className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all ${
                            passport.points >= partner.pointsRequired
                              ? 'bg-nafas-clay text-white hover:brightness-110'
                              : 'bg-nafas-sand/80 text-nafas-silt/50 cursor-not-allowed'
                          }`}
                        >
                          استبدال بـ {partner.pointsRequired} نقطة
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Civic Partner Note */}
          <div className="p-4 rounded-2xl bg-nafas-sand/50 border border-nafas-reed/20 text-xs text-nafas-silt/80 space-y-1">
            <span className="font-bold text-nafas-silt block">هل تمتلك نشاطاً تجارياً محلياً في العراق؟</span>
            <p className="leading-relaxed">
              انضم لشبكة شركاء نَفَس وقدّم مزايا لمتطوعي بيئة العراق لدعم الاقتصاد المحلي والمسؤولية المجتمعية.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
