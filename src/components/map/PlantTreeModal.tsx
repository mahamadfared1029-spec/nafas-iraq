'use client';

import React, { useState, useEffect } from 'react';
import { IRAQ_GOVERNORATES } from '@/lib/constants';
import {
  COMMUNITY_TREE_TYPES,
  CommunityTree,
  CommunityTreeType,
} from '@/lib/communityTreesService';
import { X, Sprout, Loader2, MapPin, MessageSquare, User } from 'lucide-react';

interface PlantTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTree: CommunityTree | null;
  defaultAuthorName?: string;
  defaultGovernorateId?: string;
  onSubmit: (payload: {
    authorName: string;
    governorateId: string;
    treeType: CommunityTreeType;
    message: string;
  }) => Promise<void>;
}

export const PlantTreeModal: React.FC<PlantTreeModalProps> = ({
  isOpen,
  onClose,
  existingTree,
  defaultAuthorName = '',
  defaultGovernorateId = 'baghdad',
  onSubmit,
}) => {
  const [authorName, setAuthorName] = useState('');
  const [governorateId, setGovernorateId] = useState(defaultGovernorateId);
  const [treeType, setTreeType] = useState<CommunityTreeType>('palm');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (existingTree) {
      setAuthorName(existingTree.authorName);
      setGovernorateId(existingTree.governorateId);
      setTreeType(existingTree.treeType);
      setMessage(existingTree.message);
    } else {
      setAuthorName(defaultAuthorName.slice(0, 40));
      setGovernorateId(defaultGovernorateId || 'baghdad');
      setTreeType('palm');
      setMessage('');
    }
    setError(null);
  }, [isOpen, existingTree, defaultAuthorName, defaultGovernorateId]);

  if (!isOpen) return null;

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

    setSaving(true);
    try {
      await onSubmit({
        authorName: authorName.trim().slice(0, 40),
        governorateId,
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
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-arabic text-right"
      role="dialog"
      aria-modal="true"
      aria-label="غابة نَفَس — ازرع شجرتك على خريطة العراق 3D"
    >
      <div className="bg-nafas-ivory border border-nafas-reed/30 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
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
                شجرة واحدة لكل مشارك تُغرس على تضاريس محافظتك
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          {/* Governorate */}
          <div>
            <label className="block text-xs font-bold text-nafas-silt mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <span>المحافظة:</span>
            </label>
            <select
              value={governorateId}
              onChange={(e) => setGovernorateId(e.target.value)}
              className="w-full text-xs sm:text-sm bg-nafas-sand border border-nafas-reed/30 rounded-xl px-3.5 py-2.5 text-nafas-silt focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {IRAQ_GOVERNORATES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nameAr}
                </option>
              ))}
            </select>
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
                <span>{existingTree ? 'حفظ تعديل الرسالة' : 'اغرس شجرتي في العراق 3D'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
