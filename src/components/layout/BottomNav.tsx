'use client';

import React from 'react';
import { Home, MapPin, Plus, Users, User, Award } from 'lucide-react';
import { OrchidMotif } from '@/components/brand/OrchidMotif';

interface BottomNavProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
  onOpenReportModal: () => void;
  onOpenPassportModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenReportModal,
  onOpenPassportModal
}) => {
  return (
    <nav 
      aria-label="شريط التنقل السفلي"
      className="fixed bottom-0 inset-x-0 z-40 bg-nafas-ivory/95 backdrop-blur-lg border-t border-nafas-reed/30 shadow-[0_-4px_20px_rgba(34,34,56,0.08)] sm:hidden transition-all duration-300 pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="flex items-center justify-around h-15 max-w-lg mx-auto px-2 relative">
        
        {/* 1. الرئيسية */}
        <button
          onClick={() => onNavigate('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            currentView === 'home' 
              ? 'text-nafas-blue font-bold scale-105' 
              : 'text-nafas-silt/70 hover:text-nafas-silt'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">الرئيسية</span>
        </button>

        {/* 2. الخريطة */}
        <button
          onClick={() => onNavigate('map')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            currentView === 'map' || currentView === 'map-3d'
              ? 'text-nafas-blue font-bold scale-105' 
              : 'text-nafas-silt/70 hover:text-nafas-silt'
          }`}
        >
          <MapPin className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">الخريطة</span>
        </button>

        {/* 3. بلّغ (Prominent Center Button with compact mobile footprint) */}
        <div className="flex-1 flex flex-col items-center justify-center relative -top-2">
          <button
            onClick={onOpenReportModal}
            aria-label="بلّغ عن مشكلة بيئية"
            className="w-11 h-11 rounded-full bg-gradient-to-tr from-nafas-clay to-[#d87d5e] text-white flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all border-2 border-nafas-ivory ring-2 ring-nafas-clay/20"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
          <span className="text-[9px] font-bold text-nafas-clay mt-0.5">بلّغ</span>
        </div>

        {/* 4. الحملات */}
        <button
          onClick={() => onNavigate('campaigns')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            currentView === 'campaigns' 
              ? 'text-nafas-blue font-bold scale-105' 
              : 'text-nafas-silt/70 hover:text-nafas-silt'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">الحملات</span>
        </button>

        {/* 5. حسابي / الجواز */}
        <button
          onClick={onOpenPassportModal}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            currentView === 'passport' 
              ? 'text-nafas-orchid font-bold scale-105' 
              : 'text-nafas-silt/70 hover:text-nafas-silt'
          }`}
        >
          <Award className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">جوازي</span>
        </button>

      </div>
    </nav>
  );
};
