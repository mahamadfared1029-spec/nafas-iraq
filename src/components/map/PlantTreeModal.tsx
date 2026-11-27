'use client';

import React, { useState, useEffect } from 'react';
import { IRAQ_GOVERNORATES } from '@/lib/constants';
import {
  COMMUNITY_TREE_TYPES,
  CommunityTree,
  CommunityTreeType,
} from '@/lib/communityTreesService';
import { X, Sprout, Loader2, MapPin, MessageSquare, User, Navigation, CheckCircle2 } from 'lucide-react';

interface PlantTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTree: CommunityTree | null;
  isAuthenticated?: boolean;
  defaultAuthorName?: string;
  defaultGovernorateId?: string;
  onSubmit: (payload: {
    authorName: string;
    governorateId: string;
    lat?: number | null;
    lng?: number | null;
    treeType: CommunityTreeType;
    message: string;
  }) => Promise<void>;
}

export const PlantTreeModal: React.FC<PlantTreeModalProps> = ({
  isOpen,
  onClose,
  existingTree,
  isAuthenticated = false,
  defaultAuthorName = '',
  defaultGovernorateId = 'baghdad',
  onSubmit,
}) => {
  const [authorName, setAuthorName] = useState('');
  const [governorateId, setGovernorateId] = useState(defaultGovernorateId);
  const [treeType, setTreeType] = useState<CommunityTreeType>('palm');
  const [message, setMessage] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('التقط موقعي بالـ GPS');
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [gpsIsError, setGpsIsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (existingTree) {
      setAuthorName(existingTree.authorName);
      setGovernorateId(existingTree.governorateId);
      setTreeType(existingTree.treeType);
      setMessage(existingTree.message);
      if (
        typeof existingTree.lat === 'number' &&
        Number.isFinite(existingTree.lat) &&
        typeof existingTree.lng === 'number' &&
        Number.isFinite(existingTree.lng)
      ) {
        setCoords({ lat: existingTree.lat, lng: existingTree.lng });
      } else {
        setCoords(null);
      }
    } else {
      setAuthorName(defaultAuthorName.slice(0, 40));
      setGovernorateId(defaultGovernorateId || 'baghdad');
      setTreeType('palm');
      setMessage('');
      setCoords(null);
    }
    setGpsNotice(null);
    setGpsIsError(false);
    setError(null);
  }, [isOpen, existingTree, defaultAuthorName, defaultGovernorateId]);

  if (!isOpen) return null;

  const findNearestGovernorate = (lat: number, lng: number) => {
    let nearest = IRAQ_GOVERNORATES[0];
    let minDistSq = Infinity;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    for (const gov of IRAQ_GOVERNORATES) {
      const dLat = gov.lat - lat;
      const dLng = (gov.lng - lng) * cosLat;
      const distSq = dLat * dLat + dLng * dLng;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        nearest = gov;
      }
    }
    return nearest;
  };

  const handleAcquireGPS = async () => {
    setGpsIsError(false);
    setGpsNotice(null);

    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setGpsIsError(true);
      setGpsNotice('تحديد الموقع يتطلب اتصالاً آمناً HTTPS.');
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsIsError(true);
      setGpsNotice('متصفحك لا يدعم تحديد الموقع الجغرافي GPS.');
      return;
    }

    try {
      if (navigator.permissions?.query) {
        const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (perm.state === 'denied') {
          setGpsIsError(true);
          setGpsNotice('إذن الموقع مرفوض. فعّله من أيقونة القفل بجانب شريط العنوان ثم أعد المحاولة.');
          return;
        }
      }
    } catch {
      // ignore unsupported permissions query
    }

    setGpsLoading(true);
    setGpsStatus('جارٍ التقاط GPS...');

    const onSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      if (latitude < 28.5 || latitude > 38.5 || longitude < 38.0 || longitude > 49.5) {
        setGpsLoading(false);
        setGpsIsError(true);
        setGpsNotice('الموقع المقروء خارج نطاق العراق (قد يكون الـ VPN مفعّلاً). أوقف الـ VPN أو اختر المحافظة يدوياً.');
        return;
      }

      const roundedLat = Number(latitude.toFixed(6));
      const roundedLng = Number(longitude.toFixed(6));
      const nearestGov = findNearestGovernorate(roundedLat, roundedLng);
      setCoords({ lat: roundedLat, lng: roundedLng });
      setGovernorateId(nearestGov.id);
      setGpsIsError(false);
      setGpsNotice(`تم تحديد موقعك في ${nearestGov.nameAr} بدقة ±${Math.round(accuracy)} م.`);
      setGpsLoading(false);
    };

    const onFinalError = (err: GeolocationPositionError) => {
      setGpsLoading(false);
      setGpsIsError(true);
      if (err.code === 1) {
        setGpsNotice('تم رفض إذن الموقع. فعّل الإذن من المتصفح أو اختر محافظتك يدوياً.');
      } else {
        setGpsNotice('تعذّر التقاط GPS حالياً. يمكنك إعادة المحاولة أو الغرس في مركز المحافظة المختارة.');
      }
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (err) => {
        if (err.code === 2 || err.code === 3) {
          setGpsStatus('جارٍ التحديد عبر الشبكة...');
          navigator.geolocation.getCurrentPosition(
            onSuccess,
            onFinalError,
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 }
          );
          return;
        }
        onFinalError(err);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!authorName.trim()) {
      setError('يرجى كتابة اسمك.');
      return;
    }
    if (!message.trim()) {
      setError('يرجى كتابة رسالة قصيرة على الشجرة.');
      return;
    }

    const selectedGov = IRAQ_GOVERNORATES.find((g) => g.id === governorateId) || IRAQ_GOVERNORATES[0];
    const finalLat = coords ? coords.lat : selectedGov.lat;
    const finalLng = coords ? coords.lng : selectedGov.lng;

    setSaving(true);
    try {
      await onSubmit({
        authorName: authorName.trim().slice(0, 40),
        governorateId,
        lat: finalLat,
        lng: finalLng,
        treeType,
        message: message.trim().slice(0, 120),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'تعذّر حفظ الشجرة، يرجى المحاولة مجدداً.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-arabic text-right overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="غابة نَفَس — ازرع شجرتك على خريطة العراق 3D"
    >
      <div className="bg-nafas-ivory border border-nafas-reed/30 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-gradient-to-l from-emerald-800 to-teal-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Sprout className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-black">
                {existingTree ? 'تعديل شجرتك في غابة نَفَس' : 'غابة نَفَس — ازرع شجرتك 3D'}
              </h3>
              <p className="text-[11px] text-emerald-100">
                شجرة واحدة لكل مشارك تُغرس في موقعك الفعلي على خريطة العراق
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/15 text-white transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {!isAuthenticated && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold leading-relaxed">
              تنبيه: أنت غير مسجّل الدخول حالياً — ستُحفظ شجرتك على هذا الجهاز فقط. سجّل الدخول بحسابك لتظهر شجرتك لجميع العراقيين على الخريطة.
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Author Name */}
          <div>
            <label className="block text-xs font-bold text-nafas-silt mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-700" />
              <span>اسم صاحب الشجرة:</span>
            </label>
            <input
              type="text"
              required
              maxLength={40}
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="مثال: علي حسين"
              className="w-full text-xs sm:text-sm bg-nafas-sand border border-nafas-reed/30 rounded-xl px-3.5 py-2.5 text-nafas-silt focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* GPS Location Capture + Governorate */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>موقع غرس الشجرة (خط الطول والعرض):</span>
              </span>

              <button
                type="button"
                onClick={handleAcquireGPS}
                disabled={gpsLoading}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
              >
                {gpsLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{gpsStatus}</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5" />
                    <span>التقط موقعي (GPS)</span>
                  </>
                )}
              </button>
            </div>

            {coords && (
              <div
                dir="ltr"
                className="text-[11px] font-mono text-emerald-900 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center justify-between"
              >
                <span>
                  {coords.lat.toFixed(6)}°N, {coords.lng.toFixed(6)}°E
                </span>
                <span className="inline-flex items-center gap-1 font-arabic font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>موقع GPS دقيق</span>
                </span>
              </div>
            )}

            {gpsNotice && (
              <p className={`text-[11px] font-bold ${gpsIsError ? 'text-red-700' : 'text-emerald-800'}`}>
                {gpsNotice}
              </p>
            )}

            <div>
              <label className="block text-[11px] font-bold text-nafas-neutral-slate mb-1">
                المحافظة:
              </label>
              <select
                value={governorateId}
                onChange={(e) => {
                  setGovernorateId(e.target.value);
                  setCoords(null);
                }}
                className="w-full text-xs sm:text-sm bg-white border border-nafas-reed/30 rounded-xl px-3.5 py-2 text-nafas-silt focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {IRAQ_GOVERNORATES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4 Visual Iraqi Tree Types */}
          <div>
            <span className="block text-xs font-bold text-nafas-silt mb-2">
              اختر نوع الشجرة العراقية:
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {COMMUNITY_TREE_TYPES.map((t) => {
                const selected = treeType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTreeType(t.id)}
                    className={`text-right p-3 rounded-2xl border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      selected
                        ? 'bg-emerald-50 border-emerald-600 shadow-sm'
                        : 'bg-nafas-sand/50 border-nafas-reed/25 hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-lg">{t.emoji}</span>
                      <span className="text-xs font-black text-nafas-silt">{t.labelAr}</span>
                    </div>
                    <p className="text-[10px] text-nafas-neutral-slate leading-snug">
                      {t.subtitleAr}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Short Message */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-nafas-silt flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                <span>رسالة قصيرة على الشجرة:</span>
              </label>
              <span className="text-[11px] font-bold text-nafas-neutral-slate">
                {message.length} / 120
              </span>
            </div>
            <textarea
              required
              rows={2}
              maxLength={120}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="مثال: لتنبت بغداد خضراء دائماً لأجيالنا القادمة..."
              className="w-full text-xs sm:text-sm bg-nafas-sand border border-nafas-reed/30 rounded-xl px-3.5 py-2.5 text-nafas-silt focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-black flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جارٍ الغرس على الخريطة...</span>
              </>
            ) : (
              <>
                <Sprout className="w-4 h-4" />
                <span>{existingTree ? 'حفظ تعديل الشجرة' : 'اغرس شجرتي في العراق 3D'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
