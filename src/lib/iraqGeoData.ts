/**
 * Real GIS Geospatial Geometries & Datasets for Iraq & Mesopotamia
 * - Iraq National Border Polygon (GIS GeoJSON)
 * - 18 Governorates Regional Polygons + Halabja Context
 * - Major Mesopotamian Rivers: Tigris (دجلة), Euphrates (الفرات), Shatt al-Arab (شط العرب)
 * - Category Pins: Planting (Green), Cleanup (Blue), Pollution (Copper), Activity (Purple)
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface MapPinItem {
  id: string;
  type: 'planting' | 'cleanup' | 'pollution' | 'activity';
  title: string;
  categoryLabelAr: string;
  governorateId: string;
  neighborhood: string;
  lat: number;
  lng: number;
  status: 'upcoming' | 'in_progress' | 'completed' | 'resolved' | 'verified';
  statusLabelAr: string;
  organizerOrReporter: string;
  summary: string;
  evidenceUrl?: string;
  color: string;
  targetCount?: number;
  volunteerCount?: number;
  dateOrTime?: string;
  refId: string; // Links to report.id or campaign.id
}

// 1. Geographic Iraq National Boundary Polygon [lat, lng] format for Leaflet
export const IRAQ_BORDER_COORDINATES: [number, number][] = [
  // Northwest - Syria / Turkey border vertex (Faysh Khabur)
  [37.10, 42.35],
  // Northern border with Turkey (Zakho, Amadiya, Barzan)
  [37.20, 42.75],
  [37.32, 43.30],
  [37.25, 43.85],
  [37.15, 44.30],
  [36.95, 44.90],
  // Northeast - Haji Omaran, Zagros mountain ridge with Iran
  [36.65, 45.05],
  [36.20, 45.45],
  [35.85, 45.85],
  [35.30, 46.05], // Halabja border area
  [34.80, 45.60],
  [34.30, 45.50], // Khanaqin / Diyala border
  [33.70, 45.80],
  [33.20, 46.25], // Badrah / Wasit border
  [32.65, 46.90],
  [32.10, 47.30], // Ali Al-Gharbi / Maysan border
  [31.60, 47.70], // Hawizeh marshes border
  [31.00, 47.85], // Shalamcheh / Basra border
  [30.40, 48.20],
  // Southeast - Al-Faw peninsula tip / Arabian Gulf
  [29.90, 48.55],
  [29.85, 48.35], // Khor Abd Allah
  // Southern border with Kuwait (Umm Qasr, Safwan)
  [30.05, 47.85],
  [30.00, 47.45],
  [29.10, 46.55], // Southern border corner with Kuwait & Saudi Arabia
  // Southern desert border with Saudi Arabia (Al-Muthanna & Najaf Badia)
  [29.20, 45.80],
  [29.45, 44.90],
  [29.80, 44.00],
  [30.40, 43.20],
  [31.10, 42.40], // Al-Nukhaib area
  [31.50, 41.70],
  [32.15, 41.05], // Judeidat Arar border area
  // Southwest border with Jordan (Turaibil)
  [32.60, 39.50],
  [33.00, 38.80], // Westernmost point near Trebil
  [33.40, 39.10],
  // Western / Northwest border with Syria (Al-Walid, Al-Qaim, Sinjar, Rabia)
  [34.20, 40.50],
  [34.40, 41.00], // Al-Qaim
  [35.20, 41.40],
  [36.00, 41.60],
  [36.40, 41.90], // Sinjar border
  [36.80, 42.15], // Rabia border post
  // Back to Faysh Khabur
  [37.10, 42.35]
];

// 2. Real River Paths: Tigris, Euphrates, and Shatt al-Arab
export const TIGRIS_RIVER_PATH: [number, number][] = [
  [37.10, 42.35], // Faysh Khabur entry point
  [36.85, 42.60],
  [36.55, 42.90], // Mosul dam area
  [36.34, 43.13], // Mosul city
  [36.10, 43.25], // Hammam al-Alil
  [35.80, 43.29], // Qayyarah
  [35.45, 43.45], // Makhoul / confluence with Great Zab
  [35.00, 43.55], // Baiji
  [34.60, 43.68], // Tikrit
  [34.20, 43.87], // Samarra
  [34.01, 44.14], // Balad
  [33.75, 44.25], // Dujail / Tarmiyah
  [33.42, 44.33], // Northern Baghdad / Kadhimiya
  [33.32, 44.38], // Central Baghdad (Al-Mutanabbi / Karrada)
  [33.20, 44.50], // Southern Baghdad (Jadriya / Madain)
  [32.90, 45.06], // Al-Aziziyah
  [32.65, 45.45], // Al-Zubaidiya
  [32.51, 45.83], // Al-Kut (Kut Barrage)
  [32.46, 46.68], // Ali Al-Gharbi
  [32.05, 46.95], // Kumait
  [31.84, 47.14], // Al-Amarah
  [31.51, 47.28], // Qal'at Saleh
  [31.25, 47.38], // Al-Uzair
  [31.01, 47.43]  // Al-Qurna (Meeting point with Euphrates)
];

export const EUPHRATES_RIVER_PATH: [number, number][] = [
  [34.37, 41.11], // Al-Qaim border entry
  [34.48, 41.91], // Rawa
  [34.47, 41.98], // Anah
  [34.13, 42.37], // Haditha (Haditha Dam)
  [33.90, 42.60], // Al-Baghdadi
  [33.64, 42.82], // Hit
  [33.42, 43.30], // Ramadi
  [33.35, 43.78], // Fallujah
  [33.05, 44.05], // Jurf Al-Sakhar
  [32.78, 44.29], // Al-Musayyib
  [32.65, 44.28], // Saddat Al-Hindiyah (Hindiya Barrage)
  [32.46, 44.43], // Al-Hillah
  [32.25, 44.45], // Hashimiyah
  [32.03, 44.40], // Al-Kufa / Najaf channel
  [31.75, 44.85], // Ghammas / Al-Qadisiyyah
  [31.55, 45.05], // Al-Rumaitha
  [31.31, 45.28], // Al-Samawah
  [31.15, 45.80], // Al-Khidhir
  [31.05, 46.26], // Nasiriyah
  [30.89, 46.46], // Suq Al-Shuyukh
  [30.98, 47.02], // Al-Chibayish (Central Mesopotamian Marshes)
  [31.00, 47.25], // Hawr Al-Hammar exit
  [31.01, 47.43]  // Al-Qurna (Confluence to form Shatt al-Arab)
];

export const SHATT_AL_ARAB_PATH: [number, number][] = [
  [31.01, 47.43], // Al-Qurna (Confluence)
  [30.82, 47.58], // Al-Dayr
  [30.65, 47.72], // Northern Basra / Hartha
  [30.51, 47.83], // Basra city / Ashar corniche
  [30.45, 48.01], // Abu Al-Khaseeb
  [30.30, 48.20], // Sayhan
  [30.15, 48.35], // Al-Siba
  [29.98, 48.47], // Al-Faw town
  [29.80, 48.60]  // Ras al-Bishah / Arabian Gulf
];

// 3. Governorate Regional Outlines (Generalized Polygons for GIS boundaries)
export interface GovernorateGeo {
  id: string;
  nameAr: string;
  nameEn: string;
  center: [number, number];
  polygon: [number, number][];
}

export const GOVERNORATES_GIS_DATA: GovernorateGeo[] = [
  {
    id: 'baghdad',
    nameAr: 'بغداد',
    nameEn: 'Baghdad',
    center: [33.3152, 44.3661],
    polygon: [
      [33.55, 44.15],
      [33.60, 44.45],
      [33.45, 44.65],
      [33.20, 44.55],
      [33.10, 44.30],
      [33.25, 44.10],
      [33.55, 44.15]
    ]
  },
  {
    id: 'basra',
    nameAr: 'البصرة',
    nameEn: 'Basra',
    center: [30.5081, 47.7835],
    polygon: [
      [31.25, 47.25],
      [31.10, 47.85],
      [30.40, 48.25],
      [29.90, 48.55],
      [29.85, 48.35],
      [30.05, 47.85],
      [30.00, 47.20],
      [30.50, 46.85],
      [31.25, 47.25]
    ]
  },
  {
    id: 'nineveh',
    nameAr: 'نينوى',
    nameEn: 'Nineveh',
    center: [36.3489, 43.1577],
    polygon: [
      [36.90, 42.10],
      [37.10, 42.50],
      [36.85, 43.30],
      [36.30, 43.60],
      [35.60, 43.35],
      [35.45, 42.40],
      [36.00, 41.60],
      [36.50, 41.80],
      [36.90, 42.10]
    ]
  },
  {
    id: 'erbil',
    nameAr: 'أربيل',
    nameEn: 'Erbil',
    center: [36.1911, 44.0091],
    polygon: [
      [37.05, 44.20],
      [36.85, 44.95],
      [36.45, 44.90],
      [35.95, 44.30],
      [35.75, 43.60],
      [36.30, 43.70],
      [36.85, 43.80],
      [37.05, 44.20]
    ]
  },
  {
    id: 'sulaymaniyah',
    nameAr: 'السليمانية',
    nameEn: 'Sulaymaniyah',
    center: [35.5656, 45.4329],
    polygon: [
      [36.35, 45.00],
      [36.20, 45.45],
      [35.85, 45.85],
      [35.30, 46.05],
      [35.05, 45.50],
      [35.25, 44.90],
      [35.80, 44.60],
      [36.35, 45.00]
    ]
  },
  {
    id: 'duhok',
    nameAr: 'دهوك',
    nameEn: 'Duhok',
    center: [36.8679, 42.9886],
    polygon: [
      [37.10, 42.35],
      [37.32, 43.30],
      [37.15, 43.80],
      [36.75, 43.60],
      [36.70, 42.85],
      [37.10, 42.35]
    ]
  },
  {
    id: 'kirkuk',
    nameAr: 'كركوك',
    nameEn: 'Kirkuk',
    center: [35.4681, 44.3922],
    polygon: [
      [35.85, 44.10],
      [35.80, 44.65],
      [35.35, 44.75],
      [35.05, 44.25],
      [35.30, 43.85],
      [35.85, 44.10]
    ]
  },
  {
    id: 'anbar',
    nameAr: 'الأنبار',
    nameEn: 'Al-Anbar',
    center: [33.4243, 43.2988],
    polygon: [
      [34.60, 41.80],
      [34.40, 41.00],
      [33.50, 39.00],
      [32.60, 39.50],
      [31.80, 41.50],
      [32.20, 43.00],
      [33.30, 43.60],
      [34.20, 43.40],
      [34.60, 41.80]
    ]
  },
  {
    id: 'diyala',
    nameAr: 'ديالى',
    nameEn: 'Diyala',
    center: [33.7483, 45.1437],
    polygon: [
      [34.80, 44.80],
      [34.80, 45.60],
      [34.00, 45.60],
      [33.40, 45.20],
      [33.55, 44.45],
      [34.25, 44.40],
      [34.80, 44.80]
    ]
  },
  {
    id: 'babil',
    nameAr: 'بابل',
    nameEn: 'Babil',
    center: [32.4637, 44.4309],
    polygon: [
      [32.85, 44.10],
      [32.80, 44.65],
      [32.40, 44.75],
      [32.20, 44.35],
      [32.45, 44.05],
      [32.85, 44.10]
    ]
  },
  {
    id: 'karbala',
    nameAr: 'كربلاء',
    nameEn: 'Karbala',
    center: [32.6160, 44.0249],
    polygon: [
      [32.80, 43.80],
      [32.70, 44.15],
      [32.35, 44.10],
      [32.20, 43.60],
      [32.55, 43.40],
      [32.80, 43.80]
    ]
  },
  {
    id: 'najaf',
    nameAr: 'النجف الأشرف',
    nameEn: 'Najaf',
    center: [31.9961, 44.3308],
    polygon: [
      [32.25, 44.20],
      [32.10, 44.60],
      [31.50, 44.40],
      [30.80, 43.20],
      [31.20, 42.50],
      [31.80, 43.60],
      [32.25, 44.20]
    ]
  },
  {
    id: 'qadisiyyah',
    nameAr: 'القادسية (الديوانية)',
    nameEn: 'Al-Qadisiyyah',
    center: [31.9928, 44.9255],
    polygon: [
      [32.30, 44.70],
      [32.25, 45.30],
      [31.70, 45.25],
      [31.60, 44.65],
      [32.30, 44.70]
    ]
  },
  {
    id: 'muthanna',
    nameAr: 'المثنى',
    nameEn: 'Al-Muthanna',
    center: [31.3197, 45.2813],
    polygon: [
      [31.65, 45.10],
      [31.50, 45.80],
      [30.80, 46.20],
      [29.80, 45.00],
      [29.40, 44.50],
      [30.60, 43.80],
      [31.65, 45.10]
    ]
  },
  {
    id: 'wasit',
    nameAr: 'واسط',
    nameEn: 'Wasit',
    center: [32.5134, 45.8344],
    polygon: [
      [33.15, 45.20],
      [33.20, 46.25],
      [32.50, 46.50],
      [32.00, 45.80],
      [32.40, 45.10],
      [33.15, 45.20]
    ]
  },
  {
    id: 'maysan',
    nameAr: 'ميسان',
    nameEn: 'Maysan',
    center: [31.8436, 47.1447],
    polygon: [
      [32.40, 46.70],
      [32.10, 47.30],
      [31.60, 47.70],
      [31.30, 47.20],
      [31.60, 46.60],
      [32.40, 46.70]
    ]
  },
  {
    id: 'dhi_qar',
    nameAr: 'ذي قار',
    nameEn: 'Dhi Qar',
    center: [31.0579, 46.2573],
    polygon: [
      [31.60, 45.80],
      [31.60, 46.70],
      [31.00, 47.10],
      [30.60, 46.70],
      [30.80, 45.90],
      [31.60, 45.80]
    ]
  },
  {
    id: 'saladin',
    nameAr: 'صلاح الدين',
    nameEn: 'Saladin',
    center: [34.6060, 43.6793],
    polygon: [
      [35.40, 43.20],
      [35.30, 44.10],
      [34.40, 44.40],
      [33.80, 44.10],
      [34.00, 43.30],
      [34.80, 43.20],
      [35.40, 43.20]
    ]
  }
];

// 4. Curated Map Pins Dataset (Combining Campaigns, Reports, and Activities)
export const MASTER_MAP_PINS: MapPinItem[] = [
  // --- Green: Tree-Planting Campaigns (تشجير) ---
  {
    id: 'pin-plant-baghdad',
    type: 'planting',
    title: 'حملة تشجير ضفاف دجلة — الكرادة',
    categoryLabelAr: 'حملة تشجير وتخضير',
    governorateId: 'baghdad',
    neighborhood: 'الكرادة / كورنيش أبو نؤاس',
    lat: 33.3039,
    lng: 44.4215,
    status: 'upcoming',
    statusLabelAr: 'حملة قادمة (28 تشرين الثاني)',
    organizerOrReporter: 'فريق نَفَس بغداد التطوعي',
    summary: 'غرس 40 شتلة نارنج وسدر عراقي على امتداد كورنيش أبو نؤاس لحماية ضفة النهر وتخفيف حرارة الصيف.',
    evidenceUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    color: '#16A34A',
    targetCount: 40,
    volunteerCount: 34,
    dateOrTime: '2026-11-28 • 09:00 ص',
    refId: 'CMP-BAG-2026-01'
  },
  {
    id: 'pin-plant-erbil',
    type: 'planting',
    title: 'حزام هولير الأخضر — زراعة البلوط الجبلي',
    categoryLabelAr: 'حملة تشجير وتخضير',
    governorateId: 'erbil',
    neighborhood: 'قوشتپه / سفوح التلال',
    lat: 36.0020,
    lng: 44.0320,
    status: 'upcoming',
    statusLabelAr: 'حملة قادمة (12 كانون الأول)',
    organizerOrReporter: 'منظمة زاكروس الخضراء',
    summary: 'زراعة 100 شتلة بلوط وصنوبر جبلي للحد من العواصف الترابية وحماية التنوع الأحيائي في كوردستان.',
    evidenceUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
    color: '#16A34A',
    targetCount: 100,
    volunteerCount: 42,
    dateOrTime: '2026-12-12 • 10:00 ص',
    refId: 'CMP-ERB-2026-03'
  },

  // --- Blue: Cleanup Campaigns (تنظيف) ---
  {
    id: 'pin-clean-basra',
    type: 'cleanup',
    title: 'تنظيف وتأهيل ممرات شط العرب النهرية',
    categoryLabelAr: 'حملة تنظيف مسطحات مائية',
    governorateId: 'basra',
    neighborhood: 'العشار / كورنيش البصرة',
    lat: 30.5185,
    lng: 47.8440,
    status: 'upcoming',
    statusLabelAr: 'حملة قادمة (5 كانون الأول)',
    organizerOrReporter: 'رابطة حماة شط العرب',
    summary: 'حملة بالزوارق الخفيفة لرفع المخلفات البلاستيكية والشباك العالقة من مياه شط العرب ونهر الخندق.',
    evidenceUrl: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=800&q=80',
    color: '#2563EB',
    volunteerCount: 28,
    dateOrTime: '2026-12-05 • 08:30 ص',
    refId: 'CMP-BAS-2026-02'
  },
  {
    id: 'pin-clean-ahwar',
    type: 'cleanup',
    title: 'حماية مسارات المشاحيف في هور الجبايش',
    categoryLabelAr: 'حملة تنظيف أهوار',
    governorateId: 'dhi_qar',
    neighborhood: 'الجبايش / عمق الهور',
    lat: 30.9520,
    lng: 46.9910,
    status: 'in_progress',
    statusLabelAr: 'قيد التنفيذ الميداني',
    organizerOrReporter: 'شباب أهوار الرافدين',
    summary: 'رفع النفايات العائمة وإزالة الحشائش الضارة من مجرى الزوارق التراثية لدعم السياحة والبيئة الطبيعية.',
    evidenceUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    color: '#2563EB',
    volunteerCount: 19,
    dateOrTime: '2026-11-20 • مستمر',
    refId: 'NFS-2026-9411'
  },

  // --- Copper: Pollution Reports (بلاغ تلوث) ---
  {
    id: 'pin-pollute-karbala',
    type: 'pollution',
    title: 'رمي أنقاض بناء ومخلفات خرسانية على حزام النخيل',
    categoryLabelAr: 'بلاغ تلوث بيئي موثق',
    governorateId: 'karbala',
    neighborhood: 'عين التمر / الحزام الغربي',
    lat: 32.6020,
    lng: 43.9820,
    status: 'verified',
    statusLabelAr: 'تم التحقق وتوجيه الفريق',
    organizerOrReporter: 'مرتضى الكربلائي',
    summary: 'رمي كتل خرسانية عشوائية تهدد قنوات السقي وأشجار النخيل المعمرة في الحزام الغربي.',
    evidenceUrl: 'https://images.unsplash.com/photo-1590682680695-43b964a3ae17?auto=format&fit=crop&w=800&q=80',
    color: '#C66F50',
    refId: 'NFS-2026-9305'
  },
  {
    id: 'pin-pollute-mosul',
    type: 'pollution',
    title: 'تلوث غابات الموصل بمخلفات الشواء والأكياس',
    categoryLabelAr: 'بلاغ نفايات استهلاكية',
    governorateId: 'nineveh',
    neighborhood: 'غابات الموصل / متنزه شلالات الجزيرة',
    lat: 36.3750,
    lng: 43.1420,
    status: 'in_progress',
    statusLabelAr: 'قيد الجمع والفرز',
    organizerOrReporter: 'عمر النينوي',
    summary: 'أطنان من الأكياس والعلب المتروكة تحت أشجار الكالبتوس والصنوبر بعد عطلة نهاية الأسبوع.',
    evidenceUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
    color: '#C66F50',
    refId: 'NFS-2026-8940'
  },

  // --- Purple: Community Eco Activities (نشاط بيئي مجتمعي) ---
  {
    id: 'pin-activity-najaf',
    type: 'activity',
    title: 'ورشة إكثار بذور السدر والغاف في بحر النجف',
    categoryLabelAr: 'نشاط بيئي وتعليمي',
    governorateId: 'najaf',
    neighborhood: 'منخفض بحر النجف / المحمية المجتمعية',
    lat: 31.9540,
    lng: 44.2810,
    status: 'upcoming',
    statusLabelAr: 'ورشة عمل مفتوحة',
    organizerOrReporter: 'مبادرة شريان الفرات',
    summary: 'تعليم المتطوعين والطلبة تقنيات جمع بذور الأشجار العراقية المقاومة للملوحة وإنشاء مشتل منزلي.',
    evidenceUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
    color: '#62467D',
    volunteerCount: 22,
    dateOrTime: '2026-11-29 • 04:00 م',
    refId: 'ACT-NAJ-2026'
  },
  {
    id: 'pin-activity-babil',
    type: 'activity',
    title: 'مراقبة هجرة الطيور الرافدينية وتوثيق أعشاش اللقلق',
    categoryLabelAr: 'رصد الحياة البرية',
    governorateId: 'babil',
    neighborhood: 'بساتين المسيب / ضفاف الفرات',
    lat: 32.7840,
    lng: 44.2950,
    status: 'upcoming',
    statusLabelAr: 'جولة رصد ميدانية',
    organizerOrReporter: 'نادي هواة الطبيعة البابلي',
    summary: 'جلسة تصوير ورصد للطيور المهاجرة على شواطئ الفرات لتوثيق أثر التشجير الأخير على عودة الطيور.',
    evidenceUrl: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=800&q=80',
    color: '#62467D',
    volunteerCount: 15,
    dateOrTime: '2026-12-02 • 07:00 ص',
    refId: 'ACT-BAB-2026'
  }
];
