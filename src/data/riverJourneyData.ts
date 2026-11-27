export interface RiverStation {
  id: string;
  order: number;
  nameAr: string;
  subtitleAr: string;
  distanceKm: number;
  distanceLabel: string;
  governorateId: string;
  governorateNameAr: string;
  bgFrom: string;
  bgTo: string;
  accentColor: string;
  badgeClasses: string;
  riverHealthPct: number;
  vegetationPct: number;
  lens: {
    history: {
      title: string;
      description: string;
      quote: string;
    };
    challenge: {
      title: string;
      description: string;
      riverStatusLabel: string;
      vegetationStatusLabel: string;
    };
    hope: {
      title: string;
      description: string;
      primaryActionLabel: string;
      primaryView: 'campaigns' | 'planting';
      secondaryActionLabel: string;
      secondaryView: 'campaigns' | 'planting';
    };
  };
}

export const RIVER_STATIONS: RiverStation[] = [
  {
    id: 'st-zakho',
    order: 1,
    nameAr: 'فيشخابور وزاخو',
    subtitleAr: 'بوابة دجلة الجبلية',
    distanceKm: 0,
    distanceLabel: '~0 كم',
    governorateId: 'duhok',
    governorateNameAr: 'دهوك وزاخو',
    bgFrom: '#0B2538',
    bgTo: '#134E4A',
    accentColor: '#5EEAD4',
    badgeClasses: 'bg-teal-500/20 text-teal-200 border-teal-400/40',
    riverHealthPct: 78,
    vegetationPct: 72,
    lens: {
      history: {
        title: 'ينابيع الجبال وبوابة دخول دجلة',
        description:
          'من مرتفعات زاغروس وعيون فيشخابور وزاخو تتجمع أولى القطرات العذبة لتشكّل مجرى دجلة عند دخوله أرض العراق، محاطة بغابات البلوط والكروم الجبلية وقنوات الكاريز التراثية.',
        quote: '«من ثلوج القمم العالية تبدأ حياة السهل؛ فحيثما صفا المنبع، اطمأنّ المصب.» — من إرث الجبل والنهر'
      },
      challenge: {
        title: 'تذبذب الأمطار والثلوج الموسمية',
        description:
          'يواجه المنبع الشمالي تراجعاً في الغطاء الثلجي الشتوي وتقلباً في مواسم الأمطار مع ضغط متزايد على الينابيع الجبلية وحرائق الغابات الصيفية.',
        riverStatusLabel: 'منسوب المنبع (مستقر نسبياً)',
        vegetationStatusLabel: 'غابات البلوط الجبلية'
      },
      hope: {
        title: 'حماية العيون وتشجير السفوح',
        description:
          'تعمل الفرق التطوعية في دهوك وزاخو على حملات تشجير البلوط وتنظيف مجاري الينابيع الجبلية لحفظ صفاء القطرة الأولى في رحلتها جنوباً.',
        primaryActionLabel: 'حملات التطوع في دهوك',
        primaryView: 'campaigns',
        secondaryActionLabel: 'دليل التشجير الجبلي',
        secondaryView: 'planting'
      }
    }
  },
  {
    id: 'st-nineveh-samarra',
    order: 2,
    nameAr: 'نينوى وسامراء',
    subtitleAr: 'السهول والضفاف التاريخية',
    distanceKm: 350,
    distanceLabel: '~350 كم',
    governorateId: 'nineveh',
    governorateNameAr: 'نينوى وصلاح الدين',
    bgFrom: '#18283B',
    bgTo: '#2D3A4B',
    accentColor: '#7DD3FC',
    badgeClasses: 'bg-sky-500/20 text-sky-200 border-sky-400/40',
    riverHealthPct: 62,
    vegetationPct: 54,
    lens: {
      history: {
        title: 'إرث قنوات سنحاريب والري العباسي',
        description:
          'هنا حفر الآشوريون قناطر جروانة الحجرية لإرواء سهول نينوى، ثم هندس العباسيون في سامراء شبكات الإسقاء الجاذبية لضبط جريان دجلة وسط البساتين.',
        quote: '«أجريتُ المياه عبر الجبال والأودية لتروي مروج نينوى وتزهر ضفاف النهر.» — نقش سنحاريب'
      },
      challenge: {
        title: 'النفايات العشوائية وتآكل الضفاف',
        description:
          'تؤدي المخلفات المرمية على أطراف المجرى وتراجع الأشجار النهرية إلى تآكل التربة الرسوبية وتلوث نقاط السحب المائي في المدن الوسطى.',
        riverStatusLabel: 'جودة المجرى الأوسط',
        vegetationStatusLabel: 'الغطاء النباتي للضفاف'
      },
      hope: {
        title: 'تنظيف الضفاف وتثبيت التربة بالصفصاف',
        description:
          'تتكاتف مبادرات الشباب في نينوى وصلاح الدين لإزالة النفايات الصلبة عن الضفاف وإعادة زراعة أشجار الغرب والصفصاف المثبّتة للتربة.',
        primaryActionLabel: 'شارك في حملات التنظيف',
        primaryView: 'campaigns',
        secondaryActionLabel: 'أشجار تثبيت الضفاف',
        secondaryView: 'planting'
      }
    }
  },
  {
    id: 'st-baghdad',
    order: 3,
    nameAr: 'بغداد',
    subtitleAr: 'قلب الرافدين',
    distanceKm: 750,
    distanceLabel: '~750 كم',
    governorateId: 'baghdad',
    governorateNameAr: 'بغداد',
    bgFrom: '#261E35',
    bgTo: '#3B2838',
    accentColor: '#FDBA74',
    badgeClasses: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
    riverHealthPct: 48,
    vegetationPct: 41,
    lens: {
      history: {
        title: 'دجلة يشق قلب العاصمة وضفاف الكرادة وأبو نؤاس',
        description:
          'عبر قرون طويلة، تنفست بغداد برئة دجلة؛ من كورنيش الكرادة والأعظمية إلى حدائق أبو نؤاس، حيث شكّلت البساتين المحيطة حزاماً طبيعياً يلطّف حرارة الصيف.',
        quote: '«دجلة في بغداد ليس نهراً يمرّ بالمدينة، بل نبضها الذي يكتب ذاكرتها.» — من الأدب البغدادي'
      },
      challenge: {
        title: 'حرارة الصيف الشديدة وتلوث الضفاف الحضرية',
        description:
          'يواجه النهر في قلب العاصمة ضغطاً حضرياً كبيراً بسبب البلاستيك والمخلفات السائلة، مع ارتفاع موجات الحر وانحسار الأحزمة الخضراء المحيطة.',
        riverStatusLabel: 'ضغط التلوث الحضري',
        vegetationStatusLabel: 'الأحزمة الخضراء الحضرية'
      },
      hope: {
        title: 'أحزمة خضراء وحملات شبابية على ضفاف دجلة',
        description:
          'تنظّم فرق نَفَس في بغداد جولات دورية لتنظيف كورنيش الكرادة وأبو نؤاس، بالتوازي مع غرس أشجار السدر والنخيل المقاومة للحرارة.',
        primaryActionLabel: 'انضم لحملات بغداد',
        primaryView: 'campaigns',
        secondaryActionLabel: 'الدليل الزراعي لبغداد',
        secondaryView: 'planting'
      }
    }
  },
  {
    id: 'st-anbar-babil',
    order: 4,
    nameAr: 'الأنبار وبابل',
    subtitleAr: 'ذراع الفرات الخالد',
    distanceKm: 1050,
    distanceLabel: '~1,050 كم',
    governorateId: 'babil',
    governorateNameAr: 'الأنبار وبابل',
    bgFrom: '#2B2118',
    bgTo: '#3D2B1F',
    accentColor: '#FCD34D',
    badgeClasses: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
    riverHealthPct: 44,
    vegetationPct: 49,
    lens: {
      history: {
        title: 'نواعير هيت وعانة وميثاق حمورابي المائي',
        description:
          'على الفرات دارت نواعير هيت وعانة بطاقة الماء المتجددة لترفع الحياة إلى البساتين، وفي بابل شقّ حمورابي قناة «وفرة الشعب» وسنّ أول قانون يعاقب على إهمال السدود وقطع الأشجار.',
        quote: '«حفرتُ قناةً سمّيتها (حمورابي وفرة الشعب) لتجلب فيض الماء إلى أرض سومر وأكد.» — مسلّة حمورابي'
      },
      challenge: {
        title: 'الزحف العمراني وانخفاض المناسيب',
        description:
          'تتعرض بساتين النخيل والحمضيات في الحلة وضفاف الفرات في الأنبار لتراجع مناسيب المياه وتجريف المساحات الزراعية لصالح البناء العشوائي.',
        riverStatusLabel: 'منسوب الفرات الأوسط',
        vegetationStatusLabel: 'بساتين النخيل والحمضيات'
      },
      hope: {
        title: 'ترميم النواعير وحماية البساتين التراثية',
        description:
          'تستنهض المبادرات المحلية جهود توثيق التعديات على البساتين وإحياء الزراعة الطبقية ثلاثية المستويات ودعم ترميم النواعير التراثية.',
        primaryActionLabel: 'حملات الأنبار وبابل',
        primaryView: 'campaigns',
        secondaryActionLabel: 'زراعة النخيل والبساتين',
        secondaryView: 'planting'
      }
    }
  },
  {
    id: 'st-marshes',
    order: 5,
    nameAr: 'أهوار ميسان وذي قار',
    subtitleAr: 'رئة العراق',
    distanceKm: 1450,
    distanceLabel: '~1,450 كم',
    governorateId: 'dhi_qar',
    governorateNameAr: 'ميسان وذي قار',
    bgFrom: '#0F2A2E',
    bgTo: '#1E3A34',
    accentColor: '#34D399',
    badgeClasses: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
    riverHealthPct: 35,
    vegetationPct: 38,
    lens: {
      history: {
        title: 'القصب والمضيف والطيور المهاجرة والجاموس',
        description:
          'أكبر نظام أراضٍ رطبة في الشرق الأوسط ومدرج على لائحة اليونسكو؛ هنا عاش الإنسان بتوازن فريد مع القصب والبردي والمشحوف منذ فجر الحضارة السومرية.',
        quote: '«حيث تلتقي المياه بالسماء، نبت القصب أولاً ليعلم الإنسان كيف يبني سفينته الأولى.» — ألواح سومرية'
      },
      challenge: {
        title: 'الجفاف وتملح المياه',
        description:
          'تراجع الإيرادات المائية وارتفاع درجات التبخر يهددان المسطحات المائية بالجفاف، مما يضغط على التنوع الحيوي والطيور المهاجرة ومعيشة مربي الجاموس.',
        riverStatusLabel: 'مناسيب الأهوار المائية',
        vegetationStatusLabel: 'غطاء القصب والبردي'
      },
      hope: {
        title: 'إحياء الممرات المائية وحماية المحميات',
        description:
          'يركز متطوعو الجنوب على رصد بؤر التلوث والتجفيف، ودعم السكان المحليين كحراس طبيعيين لمحميات الأهوار وتنظيم حملات التوعية.',
        primaryActionLabel: 'حملات ميسان وذي قار',
        primaryView: 'campaigns',
        secondaryActionLabel: 'الدليل النباتي للجنوب',
        secondaryView: 'planting'
      }
    }
  },
  {
    id: 'st-faw',
    order: 6,
    nameAr: 'شط العرب والفاو',
    subtitleAr: 'اللقاء الكبير مع الخليج',
    distanceKm: 1850,
    distanceLabel: '~1,850 كم',
    governorateId: 'basra',
    governorateNameAr: 'البصرة والفاو',
    bgFrom: '#0A192F',
    bgTo: '#112D4E',
    accentColor: '#38BDF8',
    badgeClasses: 'bg-sky-500/20 text-sky-200 border-sky-400/40',
    riverHealthPct: 39,
    vegetationPct: 43,
    lens: {
      history: {
        title: 'التقاء دجلة والفرات في القرنة وامتدادهما إلى الفاو',
        description:
          'في القرنة يعانق دجلة شقيقه الفرات ليولدا شط العرب العظيم، الذي يروي ملايين النخيل على ضفاف البصرة وأبي الخصيب وصولاً إلى مصبّه الكبير في الفاو والخليج.',
        quote: '«هنا تكتمل رحلة القطرة: نهران توأمان يلتقيان ليصنعا حياة النخيل والبحر.» — ذاكرة شط العرب'
      },
      challenge: {
        title: 'اللسان الملحي وحماية بساتين النخيل',
        description:
          'يسمح ضعف التدفق العذب القادم من الشمال بتمدد اللسان الملحي من الخليج نحو شط العرب، مما يرفع الملوحة ويهدد بساتين النخيل التاريخية في البصرة والفاو.',
        riverStatusLabel: 'توازن العذوبة أمام اللسان الملحي',
        vegetationStatusLabel: 'بساتين نخيل البصرة والفاو'
      },
      hope: {
        title: 'إنقاذ النخيل والتكاتف من المنبع للمصب',
        description:
          'كل قطرة نوفرها في الشمال والوسط تمنح شط العرب قوة إضافية لدفع اللسان الملحي؛ ومع حملات البصرة لزراعة النخيل المقاوم للملوحة يعود الأمل للضفاف.',
        primaryActionLabel: 'حملات البصرة والفاو',
        primaryView: 'campaigns',
        secondaryActionLabel: 'نباتات تتحمل الملوحة',
        secondaryView: 'planting'
      }
    }
  }
];
