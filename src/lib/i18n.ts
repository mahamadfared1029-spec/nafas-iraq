import { Language } from '@/types';

export interface TranslationDictionary {
  brandName: string;
  brandTagline: string;
  heroSubheadline: string;
  reportIssueCta: string;
  joinCampaignCta: string;
  mapNav: string;
  reportsNav: string;
  campaignsNav: string;
  impactNav: string;
  plantingNav: string;
  atlasNav: string;
  clinicNav: string;
  passportNav: string;
  filterByGovernorate: string;
  allGovernorates: string;
  filterByCategory: string;
  allCategories: string;
  filterByStatus: string;
  allStatuses: string;
  statusSubmitted: string;
  statusUnderReview: string;
  statusVerified: string;
  statusInProgress: string;
  statusResolved: string;
  statusDuplicate: string;
  statusRejected: string;
  trackingNumber: string;
  reportedDate: string;
  verifiedBadge: string;
  hazardousWarningTitle: string;
  hazardousWarningDesc: string;
  beforeAfterTitle: string;
  beforeAfterSubtitle: string;
  dragToCompare: string;
  originalCondition: string;
  verifiedRemediation: string;
  campaignTarget: string;
  volunteerCapacity: string;
  registeredVolunteers: string;
  spotsLeft: string;
  registerNow: string;
  registeredSuccess: string;
  cancelRegistration: string;
  meetingPoint: string;
  safetyGearProvided: string;
  passportTitle: string;
  verifiedHours: string;
  verifiedReports: string;
  treesPlanted: string;
  earnedCertificates: string;
  impactLedger: string;
  viewCertificate: string;
  certificateTitle: string;
  officialVerification: string;
  scanQrToVerify: string;
  digitalSeal: string;
  heritageTitle: string;
  heritageSubtitle: string;
  plantingGuideTitle: string;
  plantingGuideSubtitle: string;
  clinicTitle: string;
  clinicSubtitle: string;
  clinicDisclaimer: string;
  publicImpactTitle: string;
  publicImpactSubtitle: string;
  transparencyPledge: string;
  calculatedLiveNote: string;
  roleSwitcherLabel: string;
  currentRole: string;
  anonymousSubmit: string;
  submitSuccessTitle: string;
  submitSuccessMessage: string;
  close: string;
}

export const TRANSLATIONS: Record<Language, TranslationDictionary> = {
  ar: {
    brandName: 'نَفَس',
    brandTagline: 'خلّي العراق يتنفس',
    heroSubheadline: 'من بلاغ صغير، لتغيير حقيقي. ساعدنا نعرف الأماكن اللي تحتاج اهتمام، وخلّينا نشتغل سوه حتى نصنع فرق ببيئتنا الرافدينية.',
    reportIssueCta: 'بلّغ عن مشكلة',
    joinCampaignCta: 'شارك بحملة تطوع',
    mapNav: 'خريطة العراق البيئية',
    reportsNav: 'البلاغات الميدانية',
    campaignsNav: 'حملات التطوع',
    impactNav: 'أثر نَفَس الموثّق',
    plantingNav: 'الدليل الزراعي للمحافظات',
    atlasNav: 'أطلس نَفَس (التراث)',
    clinicNav: 'صيدلية نَفَس النباتية',
    passportNav: 'جواز نَفَس',
    filterByGovernorate: 'اختر المحافظة',
    allGovernorates: 'كل محافظات العراق (18)',
    filterByCategory: 'نوع المشكلة البيئية',
    allCategories: 'جميع التصنيفات',
    filterByStatus: 'حالة البلاغ',
    allStatuses: 'جميع الحالات',
    statusSubmitted: 'تم الاستلام',
    statusUnderReview: 'قيد المراجعة',
    statusVerified: 'موثّق ميدانياً',
    statusInProgress: 'قيد المعالجة الميدانية',
    statusResolved: 'تمت المعالجة بنجاح',
    statusDuplicate: 'بلاغ مكرر',
    statusRejected: 'مستبعد',
    trackingNumber: 'رقم التتبع',
    reportedDate: 'تاريخ الإبلاغ',
    verifiedBadge: 'موثّق بالأدلة الميدانية',
    hazardousWarningTitle: 'تحذير أمان عاجل — مواد خطرة',
    hazardousWarningDesc: 'البلاغ يشير إلى مواد خطرة أو احتراق سام أو أسلاك مكهربة. يُمنع منعاً باتاً اقتراب المتطوعين أو لمس النفايات. تم إخطار الجهات المختصة والدفاع المدني فوراً.',
    beforeAfterTitle: 'شاهد الأثر الحقيقي: قبل وبعد المعالجة',
    beforeAfterSubtitle: 'توثيق حقيقي من الميدان للبلاغات التي تحولت بفضل سواعد الشباب والبلديات إلى مساحات نظيفة تتنفس.',
    dragToCompare: 'اسحب المؤشر للمقارنة التفاعلية أو استخدم مفاتيح الأسهم',
    originalCondition: 'الحالة السابقة (قبل المعالجة)',
    verifiedRemediation: 'النتيجة الموثقة (بعد الحملة)',
    campaignTarget: 'هدف الحملة',
    volunteerCapacity: 'العدد المستهدف',
    registeredVolunteers: 'المسجلون فعلياً',
    spotsLeft: 'مقاعد متبقية',
    registerNow: 'سجّل في الحملة الآن',
    registeredSuccess: 'تم تأكيد تسجيلك بنجاح!',
    cancelRegistration: 'إلغاء التسجيل',
    meetingPoint: 'نقطة التجمع والانطلاق',
    safetyGearProvided: 'معدات السلامة المقدمة للمتطوعين',
    passportTitle: 'جواز نَفَس — سجلك البيئي الموثّق',
    verifiedHours: 'ساعات تطوع موثّقة',
    verifiedReports: 'بلاغات بيئية معالجة',
    treesPlanted: 'شتلات تم غرسها ورعايتها',
    earnedCertificates: 'شهادات المشاركة المعتمدة',
    impactLedger: 'سجل نقاط الأثر والمشاركات',
    viewCertificate: 'عرض الشهادة الرقمية',
    certificateTitle: 'شهادة مشاركة وخدمة بيئية مجتمعية',
    officialVerification: 'توثيق رسمي صادر عن منصة نَفَس — العراق',
    scanQrToVerify: 'امسح رمز QR للتحقق الفوري من صحة هذه الشهادة عبر المنصة',
    digitalSeal: 'الختم الرقمي المعتمد',
    heritageTitle: 'أطلس نَفَس — حكاية أرض الرافدين',
    heritageSubtitle: 'رحلة استكشافية توثق التعايش التاريخي بين الإنسان العراقي وبيئة دجلة والفرات والأهوار العريقة.',
    plantingGuideTitle: 'دليل الغرس الموسمي للمحافظات العراقية',
    plantingGuideSubtitle: 'نباتات وأشجار أصيلة تتحمل الصيف العراقي الحار والملوحة، مع إرشادات الترشيد المائي المعتمدة.',
    clinicTitle: 'صيدلية نَفَس النباتية',
    clinicSubtitle: 'مساعد استشاري لتشخيص مشاكل الأشجار والنباتات المنزلية وحمايتها بطرق بيئية آمنة.',
    clinicDisclaimer: 'ملاحظة هامة: هذه الاستشارات أولية وغير مبنية على مبيدات كيميائية خطرة. في الحالات الزراعية الكبرى، يُرجى استشارة المهندس الزراعي المعتمد.',
    publicImpactTitle: 'لوحة الشفافية والأثر العام',
    publicImpactSubtitle: 'أرقام حقيقية مستخرجة مباشرة من قاعدة البيانات، دون تزييف أو تضخيم، لأن بيئتنا تستحق الصدق.',
    transparencyPledge: 'ميثاق الشفافية: جميع الأرقام المعلنة تخضع لتدقيق ميداني وتحديث لحظي.',
    calculatedLiveNote: 'تم احتساب الإحصائيات لحظياً من البلاغات وحملات النظافة والتشجير المنفذة.',
    roleSwitcherLabel: 'تبديل دور المستخدم (للتجربة والتحقق):',
    currentRole: 'الدور الحالي',
    anonymousSubmit: 'إبلاغ مجهول الهوية (لحماية الخصوصية)',
    submitSuccessTitle: 'تم تسجيل بلاغك بنجاح!',
    submitSuccessMessage: 'شكراً لحرصك على بيئة العراق. تم توليد رقم تتبع فريد لمتابعة البلاغ حتى إنجازه.',
    close: 'إغلاق'
  },
  ku: {
    brandName: 'نَفَس',
    brandTagline: 'با عێراق هەناسە بدات',
    heroSubheadline: 'لە هەواڵپێدانێکی بچووکەوە بۆ گۆڕانکارییەکی ڕاستەقینە. یارمەتیمان بدە بۆ ناسینی ئەو شوێنانەی پێویستیان بە چاودێرییە، تا پێکەوە کار بکەین بۆ ژینگەکەمان.',
    reportIssueCta: 'کێشەیەک ڕابگەیەنە',
    joinCampaignCta: 'بەشداری لە کەمپین بکە',
    mapNav: 'نەخشەی ژینگەیی عێراق',
    reportsNav: 'ڕاپۆرتە مەیدانییەکان',
    campaignsNav: 'کەمپینەکانی خۆبەخشی',
    impactNav: 'کاریگەری پشتڕاستکراو',
    plantingNav: 'ڕێبەری دارچاندن بەپێی پارێزگا',
    atlasNav: 'ئەتڵەسی نَفَس (مێژوو و ژینگە)',
    clinicNav: 'دەرمانخانەی ڕووەکی نَفَس',
    passportNav: 'پاسپۆرتی نَفَس',
    filterByGovernorate: 'پارێزگا هەڵبژێرە',
    allGovernorates: 'هەموو پارێزگاکانی عێراق (١٨)',
    filterByCategory: 'جۆری کێشە ژینگەییەکە',
    allCategories: 'هەموو جۆرەکان',
    filterByStatus: 'دۆخی ڕاپۆرت',
    allStatuses: 'هەموو دۆخەکان',
    statusSubmitted: 'وەرگیراوە',
    statusUnderReview: 'لە پێداچوونەوەدایە',
    statusVerified: 'پشتڕاستکراوەتەوە',
    statusInProgress: 'لە جێبەجێکردندایە',
    statusResolved: 'چارەسەر کرا',
    statusDuplicate: 'دووبارەبووەوە',
    statusRejected: 'ڕەتکرایەوە',
    trackingNumber: 'ژمارەی بەدواداچوون',
    reportedDate: 'بەرواری ڕاگەیاندن',
    verifiedBadge: 'پشتڕاستکراوە بە بەڵگەی مەیدانی',
    hazardousWarningTitle: 'ئاگاداری بەپەلەی سەلامەتی — ماددەی مەترسیدار',
    hazardousWarningDesc: 'ئەم ڕاپۆرتە ئاماژە بە پاشماوەی مەترسیدار دەکات. بە هیچ شێوەیەک نزیک مەبنەوە، بەرگری شارستانی ئاگادار کراوەتەوە.',
    beforeAfterTitle: 'کاریگەری ڕاستەقینە: پێش و پاش پاککردنەوە',
    beforeAfterSubtitle: 'بەڵگەی مەیدانی ڕاستەقینە بۆ ئەو شوێنانەی بە هەوڵی گەنجان پاککراونەتەوە.',
    dragToCompare: 'هێڵەکە ڕابکێشە بۆ بەراوردکردن یان دوگمەکانی تیر بەکاربهێنە',
    originalCondition: 'دۆخی پێشوو (پێش پاککردنەوە)',
    verifiedRemediation: 'ئەنجامی پشتڕاستکراو (دوای کەمپین)',
    campaignTarget: 'ئامانجی کەمپین',
    volunteerCapacity: 'ژمارەی دیاریکراو',
    registeredVolunteers: 'خۆبەخشانی تۆمارکراو',
    spotsLeft: 'شوێنی ماوە',
    registerNow: 'ئێستا ناوت تۆمار بکە',
    registeredSuccess: 'تۆمارکردنەکەت بە سەرکەوتوویی ئەنجامدرا!',
    cancelRegistration: 'هەڵوەشاندنەوەی تۆمارکردن',
    meetingPoint: 'شوێنی کۆبوونەوە',
    safetyGearProvided: 'کەلوپەلی سەلامەتی دابینکراو',
    passportTitle: 'پاسپۆرتی نَفَس — تۆماری ژینگەیی تۆ',
    verifiedHours: 'کاتژمێری خۆبەخشی پشتڕاستکراو',
    verifiedReports: 'ڕاپۆرتی چارەسەرکراو',
    treesPlanted: 'نەمامی چێنراو',
    earnedCertificates: 'بڕوانامەی فەرمی',
    impactLedger: 'مێژووی خاڵ و چالاکییەکان',
    viewCertificate: 'پیشاندانی بڕوانامە',
    certificateTitle: 'بڕوانامەی بەشداری و خزمەتی ژینگەیی',
    officialVerification: 'بەڵگەنامەی فەرمی لەلایەن پلاتفۆرمی نَفَس — عێراق',
    scanQrToVerify: 'کۆدی QR سکان بکە بۆ دڵنیابوونەوە لە ڕاستیی بڕوانامەکە',
    digitalSeal: 'مۆری دیجیتاڵی فەرمی',
    heritageTitle: 'ئەتڵەسی نَفَس — چیرۆکی خاکی میزۆپۆتامیا',
    heritageSubtitle: 'گەشتێک بۆ ناسینی پێکەوەژیانی مێژوویی مرۆڤ و ژینگەی دێرینی دیجلە و فورات.',
    plantingGuideTitle: 'ڕێبەری دارچاندنی وەرزی بۆ پارێزگاکان',
    plantingGuideSubtitle: 'دار و درەختی گونجاو لەگەڵ کەشوهەوای عێراق و بەرگەگرتنی گەرما و وشکەساڵی.',
    clinicTitle: 'دەرمانخانەی ڕووەکی نَفَس',
    clinicSubtitle: 'یاریدەدەری ڕاوێژکاری بۆ دیاریکردنی نەخۆشییەکانی دار و ڕووەک بە ڕێگەی سروشتی.',
    clinicDisclaimer: 'تێبینی گرنگ: ئەم ڕاوێژانە سەرەتایین و بە بێ بەکارهێنانی ماددەی کیمیایی مەترسیدارن.',
    publicImpactTitle: 'تەختەی شەفافییەت و کاریگەری گشتی',
    publicImpactSubtitle: 'ژمارەی ڕاستەقینە لە بنکەدراوەوە بە بێ زیادەڕۆیی، ژینگەکەمان شایەنی ڕاستگۆییە.',
    transparencyPledge: 'پەیمانی شەفافییەت: هەموو ژمارەکان لە مەیداندا وردبینی دەکرێن.',
    calculatedLiveNote: 'ئامارەکان راستەوخۆ لە ڕاپۆرتە جێبەجێکراوەکانەوە دەرهێنراون.',
    roleSwitcherLabel: 'گۆڕینی ڕۆڵی بەکارهێنەر (بۆ تاقیکردنەوە):',
    currentRole: 'ڕۆڵی ئێستا',
    anonymousSubmit: 'ڕاگەیاندنی بێ ناو (بۆ پاراستنی تایبەتمەندی)',
    submitSuccessTitle: 'ڕاپۆرتەکەت بە سەرکەوتوویی تۆمارکرا!',
    submitSuccessMessage: 'سوپاس بۆ خەمخۆریت بۆ ژینگەی وڵات. ژمارەیەکی تایبەتت پێدرا بۆ بەدواداچوون.',
    close: 'داخستن'
  },
  en: {
    brandName: 'NAFAS',
    brandTagline: 'Let Iraq Breathe',
    heroSubheadline: 'From a simple field report to verifiable restoration. Help map the areas in Iraq that need immediate care, and let us mobilize together to heal our environment.',
    reportIssueCta: 'Report an Incident',
    joinCampaignCta: 'Join a Volunteer Campaign',
    mapNav: 'Geospatial Map',
    reportsNav: 'Field Incidents',
    campaignsNav: 'Campaigns',
    impactNav: 'Verified Impact',
    plantingNav: 'Planting Guide',
    atlasNav: 'Heritage Atlas',
    clinicNav: 'Plant Clinic',
    passportNav: 'Volunteer Passport',
    filterByGovernorate: 'Select Governorate',
    allGovernorates: 'All 18 Governorates',
    filterByCategory: 'Issue Category',
    allCategories: 'All Categories',
    filterByStatus: 'Status',
    allStatuses: 'All Statuses',
    statusSubmitted: 'Submitted',
    statusUnderReview: 'Under Review',
    statusVerified: 'Field Verified',
    statusInProgress: 'Remediation In Progress',
    statusResolved: 'Fully Resolved',
    statusDuplicate: 'Duplicate',
    statusRejected: 'Dismissed',
    trackingNumber: 'Tracking Ref',
    reportedDate: 'Reported Date',
    verifiedBadge: 'Verified with Evidence',
    hazardousWarningTitle: 'Urgent Safety Warning — Hazardous Material',
    hazardousWarningDesc: 'This incident indicates potential chemical, medical, or electrical hazards. Volunteers must NOT approach or touch the site. Civil Defense and municipal authorities have been notified.',
    beforeAfterTitle: 'Tangible Impact: Before and After Remediation',
    beforeAfterSubtitle: 'Authentic field documentation demonstrating how citizen reports translate into clean, restored public spaces across Iraq.',
    dragToCompare: 'Drag slider to compare or use keyboard arrow keys',
    originalCondition: 'Before Intervention',
    verifiedRemediation: 'Verified Outcome',
    campaignTarget: 'Campaign Goal',
    volunteerCapacity: 'Target Capacity',
    registeredVolunteers: 'Registered Volunteers',
    spotsLeft: 'Spots Available',
    registerNow: 'Register for Campaign',
    registeredSuccess: 'Registration Confirmed!',
    cancelRegistration: 'Cancel Registration',
    meetingPoint: 'Rendezvous Point',
    safetyGearProvided: 'Protective Equipment Provided',
    passportTitle: 'NAFAS Passport — Your Verified Civic Ledger',
    verifiedHours: 'Verified Volunteer Hours',
    verifiedReports: 'Remediated Reports',
    treesPlanted: 'Native Saplings Planted',
    earnedCertificates: 'Accredited Certificates',
    impactLedger: 'Civic Ledger & Impact History',
    viewCertificate: 'View Digital Certificate',
    certificateTitle: 'Certificate of Civic Environmental Service',
    officialVerification: 'Official accreditation issued by NAFAS Platform — Iraq',
    scanQrToVerify: 'Scan QR code to verify certificate authenticity on the platform',
    digitalSeal: 'Authentic Digital Seal',
    heritageTitle: 'NAFAS Atlas — Tale of Mesopotamia',
    heritageSubtitle: 'An editorial journey exploring the millennia-old ecological relationship between the people of Iraq and the Tigris, Euphrates, and southern marshes.',
    plantingGuideTitle: 'Regional Planting Guide for Iraq',
    plantingGuideSubtitle: 'Native drought-tolerant flora scientifically adapted to Iraqi summers, saline soils, and water conservation priorities.',
    clinicTitle: 'NAFAS Plant Clinic',
    clinicSubtitle: 'Consultative triage for tree and plant distress using non-toxic organic methods.',
    clinicDisclaimer: 'Important: Advice is consultative and avoids restricted chemical pesticides. Consult licensed agronomists for major agricultural blights.',
    publicImpactTitle: 'Public Impact & Transparency Dashboard',
    publicImpactSubtitle: 'Authentic metrics aggregated dynamically from database records. No fabricated statistics; Iraq deserves honest data.',
    transparencyPledge: 'Transparency Pledge: Every metric corresponds to a verified field remediation.',
    calculatedLiveNote: 'Aggregated live from active reports, cleanups, and tree planting campaigns.',
    roleSwitcherLabel: 'Switch User Role (For verification & preview):',
    currentRole: 'Current Role',
    anonymousSubmit: 'Anonymous Submission (Privacy Protected)',
    submitSuccessTitle: 'Report Successfully Registered!',
    submitSuccessMessage: 'Thank you for standing up for Iraq’s biosphere. A unique tracking reference has been generated.',
    close: 'Close'
  }
};
