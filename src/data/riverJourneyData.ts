export interface RiverVisualScene {
  id: string;
  order: number;
  distanceKm: number;
  distanceLabel: string;
  poeticLine: string;
  bgFrom: string;
  bgTo: string;
  unprotectedRiverColor: string;
  protectedRiverColor: string;
  unprotectedWidth: number;
  protectedWidth: number;
  flowSpeed: number;
  particleMode: 'waterfall' | 'dust' | 'sunset' | 'noria' | 'marsh' | 'sea';
}

export const RIVER_SCENES: RiverVisualScene[] = [
  {
    id: 'scene-zakho',
    order: 1,
    distanceKm: 0,
    distanceLabel: '0 كم',
    poeticLine: 'زاخو • هنا تبدأ الحياة',
    bgFrom: '#072233',
    bgTo: '#0F4C46',
    unprotectedRiverColor: 'rgba(45, 168, 178, 0.72)',
    protectedRiverColor: 'rgba(45, 212, 191, 0.92)',
    unprotectedWidth: 44,
    protectedWidth: 68,
    flowSpeed: 1.5,
    particleMode: 'waterfall',
  },
  {
    id: 'scene-nineveh-samarra',
    order: 2,
    distanceKm: 350,
    distanceLabel: '350 كم',
    poeticLine: 'نينوى وسامراء • ذاكرة الماء',
    bgFrom: '#13263B',
    bgTo: '#243648',
    unprotectedRiverColor: 'rgba(138, 128, 108, 0.68)',
    protectedRiverColor: 'rgba(56, 189, 248, 0.88)',
    unprotectedWidth: 38,
    protectedWidth: 74,
    flowSpeed: 1.15,
    particleMode: 'dust',
  },
  {
    id: 'scene-baghdad',
    order: 3,
    distanceKm: 750,
    distanceLabel: '750 كم',
    poeticLine: 'بغداد • قلب الرافدين',
    bgFrom: '#241830',
    bgTo: '#422638',
    unprotectedRiverColor: 'rgba(126, 102, 92, 0.65)',
    protectedRiverColor: 'rgba(56, 189, 248, 0.86)',
    unprotectedWidth: 34,
    protectedWidth: 76,
    flowSpeed: 1.0,
    particleMode: 'sunset',
  },
  {
    id: 'scene-anbar-babil',
    order: 4,
    distanceKm: 1050,
    distanceLabel: '1,050 كم',
    poeticLine: 'الفرات وبابل • إيقاع النواعير',
    bgFrom: '#281C14',
    bgTo: '#402B1C',
    unprotectedRiverColor: 'rgba(148, 118, 86, 0.64)',
    protectedRiverColor: 'rgba(34, 211, 238, 0.88)',
    unprotectedWidth: 32,
    protectedWidth: 72,
    flowSpeed: 1.1,
    particleMode: 'noria',
  },
  {
    id: 'scene-marshes',
    order: 5,
    distanceKm: 1450,
    distanceLabel: '1,450 كم',
    poeticLine: 'الأهوار • رئة العراق',
    bgFrom: '#172320',
    bgTo: '#0E332E',
    unprotectedRiverColor: 'rgba(130, 112, 82, 0.52)',
    protectedRiverColor: 'rgba(20, 184, 166, 0.90)',
    unprotectedWidth: 22,
    protectedWidth: 88,
    flowSpeed: 0.75,
    particleMode: 'marsh',
  },
  {
    id: 'scene-faw',
    order: 6,
    distanceKm: 1850,
    distanceLabel: '1,850 كم',
    poeticLine: 'الفاو • كل قطرة تصنع حياة',
    bgFrom: '#08182E',
    bgTo: '#0D3254',
    unprotectedRiverColor: 'rgba(92, 118, 140, 0.66)',
    protectedRiverColor: 'rgba(56, 189, 248, 0.94)',
    unprotectedWidth: 46,
    protectedWidth: 104,
    flowSpeed: 0.9,
    particleMode: 'sea',
  },
];
