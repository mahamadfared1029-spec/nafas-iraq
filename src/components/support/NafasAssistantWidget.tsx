'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, ArrowLeft } from 'lucide-react';
import { getAssetUrl } from '@/lib/basePath';

interface AssistantAction {
  label: string;
  type: 'view' | 'report' | 'passport' | 'help' | 'auth';
  target?: string;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  action?: AssistantAction;
}

interface NafasAssistantWidgetProps {
  onSelectView: (viewId: string) => void;
  onOpenReport: () => void;
  onOpenPassport: () => void;
  onOpenHelp: () => void;
  onOpenAuth: () => void;
}

const QUICK_QUESTIONS = [
  'ما هي منصة نَفَس؟',
  'كيف أسجل الدخول أو أؤكد حسابي؟',
  'كيف أبلغ عن تلوث بيئي؟',
  'أين أجد الصيدلية النباتية؟',
  'كيف أتواصل مع الدعم؟'
];

function getAssistantReply(query: string): { text: string; action?: AssistantAction } {
  const q = query.trim().toLowerCase();

  if (q.includes('تسجيل') || q.includes('دخول') || q.includes('حساب') || q.includes('ايميل') || q.includes('بريد') || q.includes('login')) {
    return {
      text: 'للتسجيل أو الدخول: اضغط على "دخول / تسجيل" في الأعلى. عند إنشاء حساب جديد سيصلك رابط تفعيل على بريدك الإلكتروني — افتحه واضغط التفعيل ثم سجّل الدخول بنفس البريد وكلمة المرور.',
      action: { label: 'فتح نافذة الدخول', type: 'auth' }
    };
  }

  if (q.includes('بلاغ') || q.includes('تلوث') || q.includes('مخالفة') || q.includes('حرق') || q.includes('نفايات') || q.includes('report')) {
    return {
      text: 'يمكنك الإبلاغ عن أي مخالفة بيئية (حرق نفايات، تلوث مياه، قطع أشجار) بالضغط على زر "بلّغ عن انتهاك" وتحديد الموقع على الخريطة وإرفاق صورة واضحة.',
      action: { label: 'إرسال بلاغ الآن', type: 'report' }
    };
  }

  if (q.includes('صيدلية') || q.includes('نبات') || q.includes('مرض') || q.includes('أعراض') || q.includes('تسمم') || q.includes('أوركيد') || q.includes('اوركيد')) {
    return {
      text: 'في قسم "الصيدلية النباتية" يمكنك البحث عن النباتات العراقية ومعرفة إن كانت آمنة أو سامة، وفحص مشاكل وأعراض النبتة خطوة بخطوة، واستعراض مجسم الأوركيد 3D. وفي حالات التسمم الطارئة اتصل بالإسعاف (122).',
      action: { label: 'فتح الصيدلية النباتية', type: 'view', target: 'clinic' }
    };
  }

  if (q.includes('خريطة') || q.includes('3d') || q.includes('عراق') || q.includes('أنهار') || q.includes('دجلة') || q.includes('فرات')) {
    return {
      text: 'تضم المنصة خريطة بيئية تفاعلية للعراق لمراقبة البلاغات والحملات على امتداد دجلة والفرات، بالإضافة إلى خريطة تضاريس العراق ثلاثية الأبعاد (3D).',
      action: { label: 'فتح الخريطة البيئية', type: 'view', target: 'map' }
    };
  }

  if (q.includes('حملة') || q.includes('حملات') || q.includes('تطوع') || q.includes('شهادة') || q.includes('جواز') || q.includes('نقاط')) {
    return {
      text: 'يمكنك تصفح الحملات التطوعية في محافظتك والتسجيل فيها عبر قسم "الحملات". وبعد تأكيد حضورك تصدر لك شهادة موثقة وتُضاف الساعات إلى "جواز المتطوع".',
      action: { label: 'تصفح الحملات', type: 'view', target: 'campaigns' }
    };
  }

  if (q.includes('شراكات') || q.includes('هدايا') || q.includes('مكافآت')) {
    return {
      text: 'قسم الشراكات والهدايا مغلق حالياً وسيتم افتتاحه قريباً بعد إتمام الشراكات الرسمية.',
    };
  }

  if (q.includes('تشجير') || q.includes('زراعة') || q.includes('شجرة') || q.includes('سدر') || q.includes('نخيل')) {
    return {
      text: 'قسم "التوعية والتشجير" يوفر دليلاً وتقويماً زراعياً لأفضل الأشجار الأصيلة المناسبة لمناخ كل محافظة عراقية.',
      action: { label: 'فتح دليل التشجير', type: 'view', target: 'planting' }
    };
  }

  if (q.includes('تراث') || q.includes('أهوار') || q.includes('بابل') || q.includes('أور') || q.includes('أطلس')) {
    return {
      text: 'قسم "تراث العراق" يعرض أطلساً بيئياً وتاريخياً يوثق الأهوار وحضارة وادي الرافدين.',
      action: { label: 'فتح تراث العراق', type: 'view', target: 'atlas' }
    };
  }

  if (q.includes('مساعدة') || q.includes('دعم') || q.includes('تواصل') || q.includes('مشكلة') || q.includes('رسالة')) {
    return {
      text: 'يمكنك مراسلة فريق الدعم مباشرة عبر "مركز المساعدة"، وستصل رسالتك إلى فريقنا للرد عليك عبر بريدك الإلكتروني.',
      action: { label: 'فتح مركز المساعدة', type: 'help' }
    };
  }

  if (q.includes('نفس') || q.includes('نَفَس') || q.includes('موقع') || q.includes('منصة') || q.includes('شنو') || q.includes('ما هي')) {
    return {
      text: 'منصة "نَفَس" هي منصة بيئية ومجتمعية عراقية تتيح للمواطنين الإبلاغ عن الانتهاكات البيئية على الخريطة، والمشاركة في حملات التشجير والتنظيف مع شهادات موثقة، واستخدام الصيدلية النباتية ودليل التشجير وتراث العراق.'
    };
  }

  return {
    text: 'أهلاً بك في مساعد نَفَس! يمكنك سؤالي عن أي قسم في الموقع (التسجيل، البلاغات، الحملات، الصيدلية النباتية، الخريطة 3D، أو الدعم الفني) وسأرشدك فوراً.',
    action: { label: 'تواصل مع الدعم', type: 'help' }
  };
}

export const NafasAssistantWidget: React.FC<NafasAssistantWidgetProps> = ({
  onSelectView,
  onOpenReport,
  onOpenPassport,
  onOpenHelp,
  onOpenAuth
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'مرحباً! أنا مساعد نَفَس الذكي. اسألني أي شيء عن أقسام الموقع وكيفية استخدامه.'
    }
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendQuery = (textToSend: string) => {
    const clean = textToSend.trim();
    if (!clean) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: clean
    };

    const reply = getAssistantReply(clean);
    const botMsg: ChatMessage = {
      id: `b-${Date.now() + 1}`,
      sender: 'bot',
      text: reply.text,
      action: reply.action
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
  };

  const handleAction = (action: AssistantAction) => {
    setIsOpen(false);
    if (action.type === 'view' && action.target) {
      onSelectView(action.target);
    } else if (action.type === 'report') {
      onOpenReport();
    } else if (action.type === 'passport') {
      onOpenPassport();
    } else if (action.type === 'help') {
      onOpenHelp();
    } else if (action.type === 'auth') {
      onOpenAuth();
    }
  };

  const avatarSrc = getAssetUrl('/brand/nafas-assistant.jpg');

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-4 sm:left-6 z-40 font-arabic text-right">
      {/* Chat Popup */}
      {isOpen && (
        <div
          className="mb-3 w-[320px] sm:w-[360px] bg-nafas-ivory rounded-3xl shadow-2xl border border-nafas-reed/30 overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[70vh]"
          role="dialog"
          aria-label="مساعد منصة نَفَس الذكي"
        >
          {/* Header */}
          <div className="bg-nafas-silt text-nafas-ivory px-4 py-3 flex items-center justify-between border-b border-white/10">
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-white/10 text-white transition-colors"
              aria-label="إغلاق المساعد"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="text-right">
                <div className="text-xs font-black flex items-center gap-1 justify-end">
                  <Sparkles className="w-3.5 h-3.5 text-nafas-misty" />
                  <span>مساعد نَفَس</span>
                </div>
                <div className="text-[10px] text-nafas-sand/70">وكيل إرشادي للمنصة</div>
              </div>
              <img
                src={avatarSrc}
                alt="مساعد نَفَس"
                className="w-9 h-9 rounded-full object-cover border-2 border-white/80 bg-white shrink-0"
              />
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="p-3.5 space-y-3 overflow-y-auto flex-1 bg-nafas-sand/20">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-nafas-blue text-white rounded-tl-sm'
                      : 'bg-white text-nafas-silt border border-nafas-reed/20 rounded-tr-sm shadow-xs'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.action && (
                    <button
                      type="button"
                      onClick={() => handleAction(msg.action!)}
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-nafas-misty text-nafas-blue font-bold text-[11px] hover:bg-nafas-blue hover:text-white transition-colors"
                    >
                      <span>{msg.action.label}</span>
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Quick Suggestion Chips */}
            <div className="pt-1 flex flex-wrap gap-1.5 justify-end">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendQuery(q)}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-white hover:bg-nafas-misty/50 text-nafas-silt border border-nafas-reed/25 font-bold transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendQuery(input);
            }}
            className="p-2.5 bg-white border-t border-nafas-reed/20 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اسألني عن أي شيء في الموقع..."
              className="flex-1 px-3 py-2 rounded-xl bg-nafas-sand/25 border border-stone-200 text-xs text-stone-900 outline-none focus:ring-2 focus:ring-nafas-blue"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-nafas-blue hover:bg-nafas-blue-dark text-white transition-colors shrink-0"
              aria-label="إرسال السؤال"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Circular Avatar Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="فتح مساعد نَفَس الذكي"
        title="اسأل مساعد نَفَس"
        className="w-14 h-14 rounded-full bg-white border-2 border-nafas-silt shadow-xl hover:scale-105 active:scale-95 transition-transform overflow-hidden relative group"
      >
        <img
          src={avatarSrc}
          alt="مساعد نَفَس"
          className="w-full h-full object-cover"
        />
        <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
      </button>
    </div>
  );
};
