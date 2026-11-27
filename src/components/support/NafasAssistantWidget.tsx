'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, ArrowLeft } from 'lucide-react';
import { getAssetUrl } from '@/lib/basePath';
import { searchAndFilterPlants, getPlantHazard } from '@/lib/plantSearch';
import { IRAQ_GOVERNORATES } from '@/lib/constants';

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

function normalizeArabic(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '');
}

function getAssistantReply(
  rawQuery: string,
  history: ChatMessage[]
): { text: string; action?: AssistantAction } {
  const q = normalizeArabic(rawQuery);
  const lastBotText = [...history].reverse().find((m) => m.sender === 'bot')?.text || '';

  // 1. Conversational greetings & small talk
  if (
    /^(مرحبا|هلا|هلو|السلام|اهلا|اهلين|صباح|مساء|هاي|hi|hello|hey)/.test(q) ||
    q === 'سلام'
  ) {
    return {
      text: 'أهلاً ومرحباً بك! أنا مساعد نَفَس الذكي، يسعدني التحدث معك ومساعدتك في أي سؤال يخص المنصة أو البيئة والنباتات في العراق. كيف أقدر أساعدك اليوم؟'
    };
  }

  if (
    q.includes('شلونك') ||
    q.includes('كيف حالك') ||
    q.includes('شخبارك') ||
    q.includes('كيفك') ||
    q.includes('how are you')
  ) {
    return {
      text: 'الحمد لله بأفضل حال وجاهز لخدمتك! أحب مساعدة أهلنا في العراق لحماية البيئة والزراعة. وأنت شلونك؟ شتحب نسولف أو تستفسر عنه؟'
    };
  }

  if (
    q.includes('شكرا') ||
    q.includes('ممنون') ||
    q.includes('عاشت ايدك') ||
    q.includes('يسلمو') ||
    q.includes('بطل') ||
    q.includes('ممتاز') ||
    q.includes('رائع') ||
    q.includes('thank')
  ) {
    return {
      text: 'على راسي! هذا واجبي، وإذا احتجت أي مساعدة ثانية أو حبيت تدردش بأي موضوع بيئي أو عن الموقع أنا موجود دائماً.'
    };
  }

  if (q.includes('منو انت') || q.includes('من انت') || q.includes('اسمك') || q.includes('who are you')) {
    return {
      text: 'أنا مساعد نَفَس، الوكيل الذكي لمنصة نَفَس البيئية العراقية. أقدر أجاوبك على أسئلتك حول الموقع، أشرح لك كيفية التبليغ أو التطوع، أساعدك بمعلومات النباتات والأشجار العراقية، أو ندردش حول البيئة والمناخ!'
    };
  }

  if (q.includes('نكته') || q.includes('اضحك') || q.includes('سولف') || q.includes('ملل')) {
    return {
      text: 'أكيد! تدري ليش النخلة العراقية ما تخاف من الحر؟ لأنها متعودة على صيف العراق وتكول: "هذا جو ربيعي بالنسبة إلي!" 🌴😄 إذا عندك أي سؤال جدي أو حاب نتكلم عن الزراعة والبيئة أنا جاهز.'
    };
  }

  // 2. Follow-up context ("نعم", "اي", "اكثر", "وين", "شلون")
  if (q === 'نعم' || q === 'اي' || q === 'اوكي' || q === 'تمام' || q === 'وضح اكثر') {
    if (lastBotText.includes('الصيدلية')) {
      return {
        text: 'تفضل بالدخول إلى الصيدلية النباتية مباشرة لتصفح دليل النباتات أو فحص أعراض نبتتك خطوة بخطوة.',
        action: { label: 'فتح الصيدلية النباتية', type: 'view', target: 'clinic' }
      };
    }
    if (lastBotText.includes('الدعم')) {
      return {
        text: 'يمكنك الآن فتح مركز المساعدة وإرسال رسالتك لفريقنا وسيتم الرد عليك عبر البريد.',
        action: { label: 'فتح مركز المساعدة', type: 'help' }
      };
    }
    return {
      text: 'ممتاز! اكتب لي سؤالك بالتفصيل أو اسم القسم الذي تبحث عنه وسأوضح لك كل شيء.'
    };
  }

  // 3. Auth / Login / Registration / Password
  if (
    q.includes('تسجيل') ||
    q.includes('دخول') ||
    q.includes('حساب') ||
    q.includes('باسورد') ||
    q.includes('كلمه المرور') ||
    q.includes('نسيت') ||
    q.includes('تفعيل') ||
    q.includes('20 ثانيه') ||
    q.includes('login')
  ) {
    return {
      text: 'للدخول أو إنشاء حساب: اضغط "دخول / تسجيل" في الأعلى. بعد إنشاء الحساب يصلك رابط تفعيل لبريدك الإلكتروني؛ اضغط عليه ثم سجّل الدخول بنفس البريد. إذا ظهرت رسالة انتظار 20 ثانية فهذا للحماية من تكرار الطلبات — انتظر قليلاً ثم جرّب الدخول.',
      action: { label: 'فتح نافذة الدخول', type: 'auth' }
    };
  }

  // 4. Reports & Violations
  if (
    q.includes('بلاغ') ||
    q.includes('ابلاغ') ||
    q.includes('تبليغ') ||
    q.includes('تلوث') ||
    q.includes('مخالفه') ||
    q.includes('حرق') ||
    q.includes('نفايات') ||
    q.includes('دخان') ||
    q.includes('مياه') ||
    q.includes('report')
  ) {
    return {
      text: 'يمكنك توثيق أي مخالفة بيئية (حرق نفايات، رمي مخلفات في الأنهار، قطع أشجار) من زر "بلّغ عن انتهاك"، مع تحديد الموقع على الخريطة وإرفاق صورة. يتم تجريد بيانات الصورة الحساسة تلقائياً لحماية خصوصيتك.',
      action: { label: 'إرسال بلاغ الآن', type: 'report' }
    };
  }

  // 5. Plant Clinic & Specific Plant Search
  if (
    q.includes('صيدليه') ||
    q.includes('نبات') ||
    q.includes('نبته') ||
    q.includes('ورق') ||
    q.includes('اصفرار') ||
    q.includes('ذبول') ||
    q.includes('حشرات') ||
    q.includes('تسمم') ||
    q.includes('اوركيد') ||
    q.includes('دفله') ||
    q.includes('خروع') ||
    q.includes('عنايه')
  ) {
    // Check if user mentioned a specific plant in the database
    const words = rawQuery.trim().split(/\s+/).filter((w) => w.length >= 3);
    for (const word of words) {
      const matches = searchAndFilterPlants({ query: word });
      if (matches.length > 0 && matches.length <= 5) {
        const p = matches[0];
        const name = p.locale?.common_names?.[0]?.name || p.taxon.scientific_name;
        const haz = getPlantHazard(p.id);
        const safetyText =
          haz?.severity === 'critical' || haz?.severity === 'high'
            ? '⚠️ تحذير: هذا النبات مصنف كخطر/سام ويجب الحذر الشديد وإبعاده عن الأطفال والحيوانات.'
            : 'يمكنك الاطلاع على تفاصيل هذا النبات وطرق العناية به من الصيدلية النباتية.';
        return {
          text: `بخصوص "${name}": ${p.locale?.description || ''} ${safetyText}`,
          action: { label: 'فتح الصيدلية النباتية', type: 'view', target: 'clinic' }
        };
      }
    }

    return {
      text: 'في "الصيدلية النباتية" تقدر تبحث عن أي نبات عراقي لمعرفة هل هو آمن أم سام، وتشخّص أمراض نبتتك عبر الفاحص السهل، كما يمكنك استكشاف مجسم الأوركيد 3D من الخارج والداخل والعمليات الداخلية. وفي حالات التسمم الطارئة اتصل بالطوارئ (911).',
      action: { label: 'فتح الصيدلية النباتية', type: 'view', target: 'clinic' }
    };
  }

  // 6. Maps (2D & 3D) or specific Iraqi governorate
  const matchedGov = IRAQ_GOVERNORATES.find(
    (g) => q.includes(normalizeArabic(g.nameAr)) || q.includes(g.nameEn.toLowerCase())
  );
  if (matchedGov) {
    return {
      text: `محافظة ${matchedGov.nameAr} مشمولة بالكامل على خريطة نَفَس البيئية! يمكنك متابعة البلاغات والحملات التطوعية الخاصة بـ ${matchedGov.nameAr} والمشاركة فيها.`,
      action: { label: `عرض خريطة العراق`, type: 'view', target: 'map' }
    };
  }

  if (q.includes('خريطه') || q.includes('3d') || q.includes('دجله') || q.includes('فرات') || q.includes('محافظ')) {
    return {
      text: 'تحتوي المنصة على خريطة العراق البيئية لمتابعة البلاغات والحملات على امتداد دجلة والفرات، بالإضافة إلى مجسم خريطة العراق ثلاثية الأبعاد (3D).',
      action: { label: 'فتح الخريطة البيئية', type: 'view', target: 'map' }
    };
  }

  // 7. Campaigns, Certificates, Passport
  if (
    q.includes('حمله') ||
    q.includes('حملات') ||
    q.includes('تطوع') ||
    q.includes('شهاده') ||
    q.includes('جواز') ||
    q.includes('نقاط') ||
    q.includes('ساعات')
  ) {
    return {
      text: 'عبر قسم "الحملات" يمكنك التسجيل في حملات التشجير والتنظيف القريبة منك. بعد حضور الحملة واعتماد المنسق، تصدر لك شهادة موثقة برمز QR وتُضاف ساعاتك ونقاطك في "جواز المتطوع".',
      action: { label: 'تصفح الحملات', type: 'view', target: 'campaigns' }
    };
  }

  // 8. Partnerships & Rewards (Locked / Coming soon)
  if (q.includes('شراكات') || q.includes('شركاء') || q.includes('هدايا') || q.includes('مكافا') || q.includes('خصم')) {
    return {
      text: 'قسم الشراكات والهدايا مغلق حالياً ويجري العمل على تجهيزه وإبرام الشراكات الرسمية ليُفتح قريباً بإذن الله.'
    };
  }

  // 9. Planting Guide & Iraqi Trees
  if (q.includes('تشجير') || q.includes('زراعه') || q.includes('شجر') || q.includes('سدر') || q.includes('نخيل') || q.includes('موسم')) {
    return {
      text: 'قسم "التوعية والتشجير" يوضح أفضل مواسم الزراعة والأشجار الأصيلة المقاومة لحرارة وجفاف العراق مثل السدر والنخيل والأثل والصفصاف.',
      action: { label: 'فتح دليل التشجير', type: 'view', target: 'planting' }
    };
  }

  // 10. Heritage & Marshes
  if (q.includes('تراث') || q.includes('اهوار') || q.includes('بابل') || q.includes('اور') || q.includes('اطلس') || q.includes('تاريخ')) {
    return {
      text: 'قسم "تراث العراق" يأخذك في جولة تاريخية وبيئية عبر أهوار الجنوب وحدائق بابل وأور وحضارة وادي الرافدين.',
      action: { label: 'فتح تراث العراق', type: 'view', target: 'atlas' }
    };
  }

  // 11. Impact & Before/After
  if (q.includes('اثر') || q.includes('احصائيات') || q.includes('شفافيه') || q.includes('قبل وبعد')) {
    return {
      text: 'في قسم "أثر نَفَس" تعرض المنصة الأرقام الحقيقية للبلاغات الموثقة والحملات والأشجار المزروعة بشفافية كاملة.',
      action: { label: 'عرض أثر نَفَس', type: 'view', target: 'impact' }
    };
  }

  // 12. Support / Help / Contact
  if (q.includes('مساعده') || q.includes('دعم') || q.includes('تواصل') || q.includes('مشكله') || q.includes('رساله') || q.includes('شكوى')) {
    return {
      text: 'يسعدنا تواصلك معنا! يمكنك كتابة رسالتك من خلال "مركز المساعدة" وستصل مباشرة إلى فريق الدعم الفني للرد عليك.',
      action: { label: 'فتح مركز المساعدة', type: 'help' }
    };
  }

  // 13. About NAFAS
  if (q.includes('نفس') || q.includes('موقع') || q.includes('منصه') || q.includes('هدف') || q.includes('شنو') || q.includes('فكره')) {
    return {
      text: 'منصة "نَفَس" هي مبادرة رقمية عراقية لحماية البيئة؛ تجمع بين الإبلاغ الميداني على الخريطة، حملات التطوع والشهادات، الصيدلية النباتية، ودليل التشجير وتراث العراق.'
    };
  }

  // 14. General Smart Fallback for any open-ended question / chat
  return {
    text: `سؤال جميل بخصوص "${rawQuery.trim()}"! باختصار، منصة نَفَس مصممة لتكون رفيقك البيئي في العراق؛ سواء كنت تبحث عن معلومات عن النباتات، أو تريد المشاركة في حملات التشجير، أو التبليغ عن تلوث، أو حتى التواصل مع فريقنا. تحب أفتح لك أحد الأقسام أو أساعدك بشيء محدد؟`,
    action: { label: 'فتح مركز المساعدة', type: 'help' }
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
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'مرحباً! أنا مساعد نَفَس الذكي. اسألني أي سؤال عن الموقع أو النباتات أو دردش معي بحرية!'
    }
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isTyping]);

  // Hide suggested quick questions right after the first user question
  const hasUserAsked = messages.some((m) => m.sender === 'user');

  const sendQuery = (textToSend: string) => {
    const clean = textToSend.trim();
    if (!clean) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: clean
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const reply = getAssistantReply(clean, nextHistory);
      const botMsg: ChatMessage = {
        id: `b-${Date.now() + 1}`,
        sender: 'bot',
        text: reply.text,
        action: reply.action
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 280);
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
                <div className="text-[10px] text-nafas-sand/70">متاح للدردشة والمساعدة الفورية</div>
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

            {isTyping && (
              <div className="flex flex-col items-end">
                <div className="px-3.5 py-2 rounded-2xl bg-white text-stone-500 border border-nafas-reed/20 text-[11px] rounded-tr-sm">
                  يكتب الآن...
                </div>
              </div>
            )}

            {/* Suggested Quick Chips: Shown ONLY before the user's first question */}
            {!hasUserAsked && (
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
            )}
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
              placeholder="اكتب رسالتك أو سؤالك هنا..."
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
