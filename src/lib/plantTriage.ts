/**
 * NAFAS Plant Clinic — Stepped Triage & Diagnostic Engine
 * Implements strict emergency exposure first-aid, problem heuristic matching, and safety bans.
 */

import { ProblemRecord, ProblemMatchCandidate, PlantTriageAnswers } from '@/types/plants';
import rawData from '@/data/nafas-plants.json';

const rawProblems: any[] = (rawData as any).problems || [];

const problems: ProblemRecord[] = rawProblems.map((p) => ({
  ...p,
  problem_ar: p.problem_ar || p.name || p.id,
  problem_en: p.problem_en || p.id,
  safe_management_ar: Array.isArray(p.safe_management_ar)
    ? p.safe_management_ar
    : [p.check, p.safe_care].filter(Boolean),
  escalation_criteria_ar: p.escalation_criteria_ar || p.refer_when || '',
  symptoms_ar: Array.isArray(p.symptoms_ar) ? p.symptoms_ar : (p.signs ? [p.signs] : []),
  likely_causes_ar: Array.isArray(p.likely_causes_ar) ? p.likely_causes_ar : (p.possibilities ? [p.possibilities] : [])
}));

/**
 * Diagnostic reasons explanation for the user ("لماذا نسأل هذا السؤال؟")
 */
export const TRIAGE_QUESTION_REASONS: Record<string, { titleAr: string; explanationAr: string }> = {
  plantingContext: {
    titleAr: 'سياق الزراعة (أصيص أم أرض مفتوحة)',
    explanationAr: 'النباتات المزروعة في الأصص محكومة بحجم تراب محدود وتتأثر سريعاً بتراكم الأملاح وانسداد فتحات التصريف، بينما تتأثر نباتات الأرض بعمق المياه الجوفية وطبيعة التربة الطينية العراقية.'
  },
  environment_drainage: {
    titleAr: 'تصريف الأصيص',
    explanationAr: 'غياب فتحات التصريف في قاع الوعاء يؤدي لحبس الماء وحرمان الجذور من الأكسجين، وهو المسبب الأول لاصفرار الأوراق وتعفن الجذور في المنازل.'
  },
  environment_sunlight: {
    titleAr: 'شدة الإضاءة وحرارة الصيف',
    explanationAr: 'شمس الصيف العراقي المباشرة تتجاوز 45-50 مئوية وتسبب احتراقاً ضوئياً مدمراً للأوراق غير المهيأة، بينما قلة الضوء داخل البيوت تسبب استطالة وضعف النبات.'
  },
  environment_water: {
    titleAr: 'مصدر ماء الري والملوحة',
    explanationAr: 'مياه الآبار أو شبكات المياه المالحة في وسط وجنوب العراق تحتوي على أملاح تتراكم على حواف الأوراق وتظهر كحروق جافة بنية.'
  },
  symptomLocation: {
    titleAr: 'موضع العَرَض في النبتة',
    explanationAr: 'ظهور الأعراض على الأوراق القديمة يشير عادة إلى عناصر متحركة في النبات أو مشاكل مائية، بينما تأثر القمم النامية يشير لعناصر غير متحركة كالحديد أو هجوم حشري حديث.'
  },
  spreadRate: {
    titleAr: 'سرعة تطور وتفشي العَرَض',
    explanationAr: 'التغير المفاجئ خلال يومين أو ثلاثة يرجح صدمة حرارية، عطشاً حاداً، أو إصابة ميكانيكية، بينما التدهور التدريجي لعدة أسابيع يشير لخلل تغذية أو عدوى فطرية وبائية.'
  },
  visibleSigns: {
    titleAr: 'المظاهر الحية المرئية',
    explanationAr: 'وجود كتل بيضاء قطنية أو خيوط عنكبوتية دقيقة أو حشرات ناعمة صغيرة يعطي دليلاً قاطعاً على الآفات الحشرية المحددة ويغني عن التخمين الكيميائي.'
  }
};

/**
 * Heuristic Matcher: evaluates user answers against the 10 reference problems
 */
export function matchPlantProblems(answers: PlantTriageAnswers): {
  candidates: ProblemMatchCandidate[];
  isInsufficientData: boolean;
  safeRemediesSummary: string[];
} {
  const scores: { problem: ProblemRecord; score: number; evidence: string[] }[] = [];

  for (const pr of problems) {
    let score = 0;
    const evidence: string[] = [];

    // Category 1: Visible Signs (Definitive diagnostic evidence)
    if (answers.visibleSigns === 'cottony_white') {
      if (pr.id === 'mealy') {
        score += 0.8;
        evidence.push('مطابقة قاطعة: وجود كتل بيضاء قطنية يشير مباشرة للبق الدقيقي (Mealybugs).');
      }
    } else if (answers.visibleSigns === 'fine_webs') {
      if (pr.id === 'mite') {
        score += 0.8;
        evidence.push('مطابقة قاطعة: وجود خيوط شبكية عنكبوتية دقيقة يشير لحلم الغبار / العنكبوت الأحمر.');
      }
    } else if (answers.visibleSigns === 'soft_insects_honeydew') {
      if (pr.id === 'aphid') {
        score += 0.8;
        evidence.push('مطابقة قاطعة: وجود حشرات ناعمة وإفرازات عسلية دبقة يشير لحشرة المن (Aphids).');
      }
    }

    // Category 2: Appearance of change
    if (answers.appearance === 'full_yellow') {
      if (pr.id === 'yellow') {
        score += 0.35;
        evidence.push('اصفرار الأوراق الشامل يتطابق مع نقص امتصاص العناصر أو زيادة الرطوبة.');
      }
      if (answers.environment.potDrainage === 'no_drain_holes' && pr.id === 'rot') {
        score += 0.35;
        evidence.push('غياب فتحات التصريف مع الاصفرار يرجح اختناق وعفن الجذور.');
      }
    } else if (answers.appearance === 'interveinal_yellow') {
      if (pr.id === 'yellow') {
        score += 0.45;
        evidence.push('اصفرار النسيج بين عروق الورقة مع بقاء العروق خضراء دليل كلاسيكي على نقص امتصاص الحديد في التربة العراقية الكلسية.');
      }
    } else if (answers.appearance === 'burnt_margins') {
      if (pr.id === 'sun') {
        score += 0.35;
        evidence.push('احتراق وجفاف الحواف يرتبط بالإجهاد الحراري وأشعة الشمس الساطعة.');
      }
      if (answers.environment.waterType === 'well_saline' && pr.id === 'salt') {
        score += 0.45;
        evidence.push('الري بماء بئر مالح مع احتراق الحواف يعكس تراكم الأملاح التسممي في الأطراف.');
      }
    } else if (answers.appearance === 'wilt_droop') {
      if (pr.id === 'wilt') {
        score += 0.45;
        evidence.push('تدلي وذبول الأوراق رغم رطوبة التربة أو جفافها الحاد يطابق الذبول الوعائي أو إجهاد الجذور.');
      }
    } else if (answers.appearance === 'spots_brown_black') {
      if (pr.id === 'leafspot') {
        score += 0.45;
        evidence.push('تبقع الأوراق بدوائر أو بقع بنية/سوداء متفرقة يتطابق مع الأمراض الفطرية الورقية.');
      }
    } else if (answers.appearance === 'rot_soft') {
      if (answers.symptomLocation === 'fruits' && pr.id === 'tom_end') {
        score += 0.5;
        evidence.push('اسوداد وتعفن قاعدة الثمار في الطماطم يتطابق مع عفن الطرف الزهري (نقص الكالسيوم مع تذبذب الري).');
      } else if (pr.id === 'rot') {
        score += 0.4;
        evidence.push('ليونة الساق أو الجذور مع رائحة تعفن يؤكد الإصابة الفطرية البكتيرية لعفن الجذور.');
      }
    } else if (answers.appearance === 'curling') {
      if (pr.id === 'aphid' || pr.id === 'mite') {
        score += 0.25;
        evidence.push('التفاف الأوراق وتجعدها ناتج عن امتصاص العصارة النباتية من قِبل الآفات الثاقبة الماصة.');
      }
    }

    // Category 3: Environmental triggers matching
    if (answers.environment.sunlightExposure === 'direct_harsh' && pr.id === 'sun') {
      score += 0.2;
      evidence.push('التعرض لأشعة الشمس الحارقة المباشرة بدون تظليل.');
    }
    if (answers.environment.potDrainage === 'no_drain_holes' && pr.id === 'rot') {
      score += 0.2;
      evidence.push('أصيص بدون تصريف مائي يسبب ركود الماء اللاهوائي.');
    }
    if (answers.spreadRate === 'rapid_days' && (pr.id === 'wilt' || pr.id === 'sun')) {
      score += 0.15;
      evidence.push('التدهور السريع خلال أيام معدودة يتطابق مع الصدمة الحرارية أو الانسداد الوعائي.');
    }

    if (score > 0.1) {
      scores.push({
        problem: pr,
        score: Math.min(score, 0.95),
        evidence
      });
    }
  }

  // Sort descending by score
  scores.sort((a, b) => b.score - a.score);

  // Take top 3
  const topCandidates = scores.slice(0, 3);

  // If highest score is weak (< 0.35) or no scores: insufficient data
  const isInsufficientData = topCandidates.length === 0 || topCandidates[0].score < 0.35;

  const candidateResults: ProblemMatchCandidate[] = topCandidates.map(c => ({
    problem: c.problem,
    confidenceScore: Math.round(c.score * 100) / 100,
    matchingEvidence: c.evidence,
    nextSteps: c.problem.safe_management_ar,
    whenToEscalate: c.problem.escalation_criteria_ar
  }));

  const safeRemediesSummary = [
    'افحص رطوبة التربة بإصبعك بعمق 3-5 سم؛ لا تروِ إذا كانت التربة رطبة وباردة.',
    'تأكد من وجود ثقوب تصريف سالكة في قاع الوعاء، وتخلص من الماء المتجمع في الصحن السفلي بعد 15 دقيقة من الري.',
    'اعزل النبات المشتبه بإصابته عن النباتات السليمة لمنع انتقال أي عدوى أو حشرات طائرة.',
    'انقل النبات إلى مكان تصله إضاءة غير مباشرة وتجنب أشعة الشمس القاسية وقت الظهيرة.',
    'تنبيه صارم: يُحظر تطبيق مبيدات كيميائية أو خلطات منزلية عشوائية دون تشخيص موثق من مهندس زراعي مرخص.'
  ];

  return {
    candidates: candidateResults,
    isInsufficientData,
    safeRemediesSummary
  };
}

/**
 * Emergency Exposure Protocol Guidelines
 */
export const EMERGENCY_EXPOSURE_PROTOCOL = {
  generalTitle: 'بروتوكول الطوارئ والإسعاف الأولي الفوري عند التعرض للنباتات',
  priorityCall: {
    number: '122',
    label: 'الإسعاف الوطني العراقي (122)',
    telLink: 'tel:122',
    criticalSigns: [
      'صعوبة حادة أو تزييق في التنفس',
      'تشنجات عضلية أو حركات لا إرادية',
      'فقدان الوعي أو الدوخة الشديدة والانهيار',
      'تورم متسارع في الشفتين أو اللسان أو الحلق'
    ]
  },
  ingestionProtocol: {
    title: 'في حال الابتلاع (Ingestion)',
    steps: [
      'لا تحرّض على التقيؤ إطلاقاً؛ فقد يضاعف ذلك الحروق الكيميائية في المريء والحلق.',
      'أزل أي بقايا أوراق أو بذور متبقية في الفم بقطعة قماش مبللة بلطف.',
      'لا تعطِ المصاب حليباً أو ماء مالحاً أو أي وصفات منزلية دون استشارة طبية مباشرة.',
      'احتفظ بعينة أو صورة واضحة للنبات لإظهارها للفريق الطبي في الطوارئ.'
    ]
  },
  eyeExposureProtocol: {
    title: 'في حال ملامسة العينين (العصارات النباتية أو مسحوق البذور)',
    steps: [
      'اغسل العين فوراً بماء نظيف جارٍ فاتر أو بمحلول ملحي معقم لمدة 15 إلى 20 دقيقة متواصلة دون توقف.',
      'أبقِ الجفنين مفتوحين برفق أثناء سريان الماء لضمان وصوله تحت الجفون.',
      'تجنب فرك العين باليد نهائياً.',
      'راجع طوارئ العيون أو أقرب مستشفى على الفور لفحص القرنية من الحروق الكيميائية.'
    ]
  },
  skinExposureProtocol: {
    title: 'في حال الملامسة الجلدية الحارقة (مثل الفربيون، القريص، اللاتكس)',
    steps: [
      'اغسل المنطقة المصابة بالماء الفاتر والصابون اللطيف لمدة 15 دقيقة لإزالة العصارة الدهنية.',
      'انزع الملابس الملوثة بحذر لمنع ملامستها للوجه أو مناطق أخرى.',
      'ضع كمادات ماء بارد لتسكين الالتهاب وتجنب حك الجلد.',
      'في حال ظهور فقاعات مائية أو احمرار متسع، راجع المركز الصحي.'
    ]
  },
  veterinaryProtocol: {
    title: 'في حال تعرض الحيوانات الأليفة (القطط، الكلاب، المواشي)',
    steps: [
      'احجز الحيوان بعيداً عن مصدر النبات المشتبه به لمنعه من استهلاك المزيد.',
      'احذر: نباتات شائعة كالثوم والبصل تسبب تكسر خلايا الدم الحمراء في الكلاب والقطط، والدفلة تسبب توقف عضلة القلب.',
      'اتصل فوراً بأقرب طبيب بيطري وأخبره باسم النبتة والأعراض المرصودة (سيلان لعاب، خمول، إسهال، قيء).',
      'لا تعطِ الحيوان أي أدوية بشرية (مثل الباراسيتامول أو الأسبرين) نهائياً؛ فهي مميتة للقطط والكلاب.'
    ]
  }
};
