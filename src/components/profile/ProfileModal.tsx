'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Camera,
  MapPin,
  FileText,
  Phone,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2
} from 'lucide-react';
import { nafasAuth } from '@/lib/auth/authService';
import { IRAQ_GOVERNORATES } from '@/lib/constants';
import { OrchidMotif } from '@/components/brand/OrchidMotif';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function resizeAvatarToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('تعذر معالجة الصورة.'));
          return;
        }
        // Center-crop square
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('الملف المحدد ليس صورة صالحة.'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة.'));
    reader.readAsDataURL(file);
  });
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const [fullName, setFullName] = useState('');
  const [governorateId, setGovernorateId] = useState('baghdad');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const user = nafasAuth.getCurrentUser();
      if (user) {
        setFullName(user.fullName || '');
        setGovernorateId(user.governorateId || 'baghdad');
        setSpecialty(user.specialty || '');
        setPhone(user.phone || '');
        setBio(user.bio || '');
        setAvatarUrl(user.avatarUrl);
      }
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await resizeAvatarToDataUrl(file);
      setAvatarUrl(dataUrl);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل الصورة.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (fullName.trim().length < 2) {
      setError('يرجى إدخال الاسم الكامل.');
      return;
    }

    setSaving(true);
    try {
      await nafasAuth.updateProfile({
        fullName: fullName.trim(),
        governorateId,
        specialty: specialty.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        avatarUrl
      });
      setSuccess('تم حفظ الملف الشخصي بنجاح!');
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err?.message || 'تعذر حفظ التعديلات.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-nafas-silt/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="relative bg-nafas-ivory w-full max-w-lg rounded-3xl shadow-2xl border border-nafas-reed/30 overflow-hidden animate-in fade-in zoom-in-95 text-right font-arabic"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        {/* Header */}
        <div className="bg-nafas-silt text-nafas-limestone px-6 py-4 flex items-center justify-between border-b border-white/10">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
            aria-label="إغلاق الملف الشخصي"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <OrchidMotif variant="icon" size="sm" />
            <h2 id="profile-modal-title" className="font-black text-lg text-nafas-limestone">
              الملف الشخصي
            </h2>
            <User className="w-5 h-5 text-nafas-misty" />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-3 pb-2">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-nafas-misty/40 border-2 border-nafas-blue/40 overflow-hidden flex items-center justify-center shadow-md">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="الصورة الشخصية" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-nafas-blue/60" />
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-nafas-blue hover:bg-nafas-blue-dark text-white shadow-lg transition-colors"
                title="تغيير الصورة الشخصية"
                aria-label="تغيير الصورة الشخصية"
              >
                <Camera className="w-4 h-4" />
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(undefined)}
                  className="absolute bottom-0 left-0 p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors"
                  title="إزالة الصورة"
                  aria-label="إزالة الصورة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <span className="text-[11px] text-stone-500">
              اضغط على الكاميرا لاختيار صورة شخصية
            </span>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-nafas-blue" />
              <span>الاسم الكامل</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="الاسم الثلاثي أو اللقب"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-xs text-stone-900 focus:ring-2 focus:ring-nafas-blue outline-none"
            />
          </div>

          {/* Governorate & Specialty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-nafas-blue" />
                <span>المحافظة</span>
              </label>
              <select
                value={governorateId}
                onChange={(e) => setGovernorateId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-xs text-stone-900 focus:ring-2 focus:ring-nafas-blue outline-none"
              >
                {IRAQ_GOVERNORATES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-nafas-blue" />
                <span>التخصص أو الاهتمام البيئي</span>
              </label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="مثال: تشجير، زراعة، تصوير..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-xs text-stone-900 focus:ring-2 focus:ring-nafas-blue outline-none"
              />
            </div>
          </div>

          {/* Phone (optional) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-nafas-blue" />
              <span>رقم الهاتف للتواصل التطوعي (اختياري)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0770 000 0000"
              dir="ltr"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-xs text-stone-900 focus:ring-2 focus:ring-nafas-blue outline-none text-left"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-nafas-blue" />
              <span>نبذة عنك</span>
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="اكتب نبذة قصيرة عن اهتماماتك البيئية أو مهاراتك..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-xs text-stone-900 focus:ring-2 focus:ring-nafas-blue outline-none resize-none"
            />
          </div>

          {/* Save */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-nafas-blue hover:bg-nafas-blue-dark text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ الملف الشخصي</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
