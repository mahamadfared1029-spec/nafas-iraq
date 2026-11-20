/**
 * NAFAS Plant Clinic — Search & Filtering Engine
 * Supports tolerant normalization (Arabic & Kurdish Sorani), multi-axis filters, and safety isolations.
 */

import { PlantRecord, HazardRecord, BotanicalDataset } from '@/types/plants';
import rawData from '@/data/nafas-plants.json';

export const botanicalData: BotanicalDataset = rawData as unknown as BotanicalDataset;

/**
 * Normalizes text for fault-tolerant search.
 * Strips Arabic tashkeel, tatweel, unifies alef, yaa, and taa marbuta.
 * Normalizes Latin letters and removes diacritics.
 */
export function normalizeSearchTerm(input: string): string {
  if (!input) return '';

  let text = input.trim().toLowerCase();

  // 1. Remove Arabic Diacritics (Tashkeel: Fatha, Damma, Kasra, Sukun, Tanween, Shadda)
  text = text.replace(/[\u064B-\u065F\u0670]/g, '');

  // 2. Remove Tatweel / Kashida (ـ)
  text = text.replace(/\u0640/g, '');

  // 3. Normalize Alefs (أ, إ, آ, ٱ -> ا)
  text = text.replace(/[أإآٱ]/g, 'ا');

  // 4. Normalize Yaa and Alef Maqsura (ى, ي -> ي)
  text = text.replace(/[ىي]/g, 'ي');

  // 5. Normalize Taa Marbuta (ة -> ه)
  text = text.replace(/ة/g, 'ه');

  // 6. Normalize Kurdish Sorani Latin letters (î -> i, ê -> e, û -> u, ç -> c, ş -> s)
  text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 7. Strip extraneous punctuation
  text = text.replace(/[-_.,;:!?()[\]{}"'`]/g, ' ');

  // 8. Collapse spaces
  return text.replace(/\s+/g, ' ').trim();
}

export interface PlantFilterOptions {
  query?: string;
  family?: string;
  distributionStatus?: string;
  governorate?: string;
  hazardRoute?: 'ingestion' | 'skin' | 'eyes' | 'pollen' | 'food';
  targetAudience?: 'children' | 'pets' | 'pregnancy' | 'livestock';
  isInvasive?: boolean;
  notAssessedOnly?: boolean;
  excludeDistributionHold?: boolean;
}

/**
 * Shared folk name alerts for plants with potentially hazardous confusion
 */
export const SHARED_FOLK_NAMES_ALERTS: Record<string, { warningAr: string; level: 'critical' | 'caution' }> = {
  الدفله: {
    warningAr: 'تنبيه أمان: تُزرع الدفلة أحياناً كنبات زينة منزلي أو على الأرصفة، وجميع أجزائها شديدة السمية للإنسان والحيوان باحتوائها على غليكوسيدات قلبية.',
    level: 'critical'
  },
  الخروع: {
    warningAr: 'تنبيه أمان: حبوب الخروع تحتوي على بروتين الريسين المميت. يُمنع منعاً باتاً تناول البذور كاملة أو مطحونة دون معالجة صيدلانية معتمدة.',
    level: 'critical'
  },
  الحنظل: {
    warningAr: 'تنبيه أمان: يُعرف شعبياً أيضاً بالـ «علكم»؛ ثماره لبّية كروية مرّة وشديدة الإسهال والتسمم المعوي ولا يجوز استخدامها عشوائياً كعلاج للسكر.',
    level: 'critical'
  },
  القريص: {
    warningAr: 'تنبيه أمان: يُعرف بالسورانية باسم Gazna؛ شعيرات أوراقه تفرز الهستامين وحمض الفورميك مسببة التهاباً وحكة شديدة عند الملامسة المباشرة.',
    level: 'caution'
  },
  ام_الحليب: {
    warningAr: 'تنبيه أمان: نبات الفربيون (أم الحليب) يفرز عصارة حليبية كاوية تسبب حروقاً بالغة في الجلد والقرنية عند ملامسة العينين.',
    level: 'critical'
  },
  الثوم: {
    warningAr: 'تنبيه بيطري: الثوم ومشتقاته سام جداً للقطط والكلاب بسبب مادة N-propyl disulfide التي تسبب تكسر كريات الدم الحمراء (Hemolysis).',
    level: 'caution'
  },
  البصل: {
    warningAr: 'تنبيه بيطري: البصل سام جداً للحيوانات الأليفة (القطط والكلاب) حتى في الأطعمة المطبوخة أو المجففة.',
    level: 'caution'
  }
};

/**
 * Checks if search text triggers any shared folk name warning
 */
export function checkSharedFolkNameAlert(query: string): { name: string; warningAr: string; level: 'critical' | 'caution' } | null {
  const normQuery = normalizeSearchTerm(query);
  if (!normQuery) return null;

  for (const [key, alert] of Object.entries(SHARED_FOLK_NAMES_ALERTS)) {
    const normKey = normalizeSearchTerm(key);
    if (normQuery.includes(normKey) || normKey.includes(normQuery)) {
      return {
        name: key,
        warningAr: alert.warningAr,
        level: alert.level
      };
    }
  }
  return null;
}

/**
 * Returns hazard details for a given plant
 */
export function getPlantHazard(plantId: string): HazardRecord | undefined {
  return botanicalData.hazards.find(h => h.plant_id === plantId);
}

/**
 * Filters plants based on search query, multi-axis filters, and review status
 */
export function searchAndFilterPlants(options: PlantFilterOptions = {}): PlantRecord[] {
  const {
    query,
    family,
    distributionStatus,
    governorate,
    hazardRoute,
    targetAudience,
    isInvasive,
    notAssessedOnly,
    excludeDistributionHold = true
  } = options;

  const normalizedQuery = query ? normalizeSearchTerm(query) : '';

  return botanicalData.plants.filter(plant => {
    // 1. Exclude records on hold from public distribution if requested
    if (excludeDistributionHold && plant.review_status === 'hold_distribution_review') {
      // If the filter specifically asks for something else, exclude hold records
      // unless user is an authenticated researcher
      if (options.excludeDistributionHold) {
        return false;
      }
    }

    // 2. Query search across Arabic names, Kurdish names, Scientific names, and Synonyms
    if (normalizedQuery) {
      let matches = false;

      // Taxon scientific name
      const normScientific = normalizeSearchTerm(plant.taxon?.scientific_name || '');
      if (normScientific.includes(normalizedQuery)) {
        matches = true;
      }

      // Family
      const normFamily = normalizeSearchTerm(plant.taxon?.family || '');
      if (normFamily.includes(normalizedQuery)) {
        matches = true;
      }

      // Synonyms
      if (Array.isArray(plant.taxon?.synonyms)) {
        for (const syn of plant.taxon.synonyms) {
          if (normalizeSearchTerm(syn).includes(normalizedQuery)) {
            matches = true;
            break;
          }
        }
      }

      // Previous accepted names
      if (Array.isArray(plant.previous_accepted_names)) {
        for (const pan of plant.previous_accepted_names) {
          if (normalizeSearchTerm(pan).includes(normalizedQuery)) {
            matches = true;
            break;
          }
        }
      }

      // Common names (Arabic & Kurdish)
      if (Array.isArray(plant.locale?.common_names)) {
        for (const cn of plant.locale.common_names) {
          if (normalizeSearchTerm(cn.name).includes(normalizedQuery)) {
            matches = true;
            break;
          }
        }
      }

      if (!matches) {
        return false;
      }
    }

    // 3. Family Filter
    if (family && family !== 'all') {
      if (plant.taxon?.family?.toLowerCase() !== family.toLowerCase()) {
        return false;
      }
    }

    // 4. Distribution Status Filter
    if (distributionStatus && distributionStatus !== 'all') {
      const hasStatus = plant.distributions?.some(d => d.status === distributionStatus);
      if (!hasStatus) {
        return false;
      }
    }

    // 5. Governorate / Documented Range Filter
    if (governorate && governorate !== 'all') {
      const normGov = normalizeSearchTerm(governorate);
      const matchesGov = plant.distributions?.some(d => {
        if (!d.region_ar) return false;
        const normRegion = normalizeSearchTerm(d.region_ar);
        return normRegion.includes(normGov) || normGov.includes(normRegion);
      });
      if (!matchesGov) {
        return false;
      }
    }

    const hazardRecord = getPlantHazard(plant.id);

    // 6. Hazard Route Filter
    if (hazardRoute) {
      if (!hazardRecord || !hazardRecord.routes?.includes(hazardRoute)) {
        return false;
      }
    }

    // 7. Sensitive Audience Filter
    if (targetAudience) {
      if (!hazardRecord) return false;
      const hAny = hazardRecord as any;
      const tags: string[] = hAny.tags || [];
      const audiences: string[] = hAny.audiences || [];
      const targetAudiences: string[] = hAny.target_audiences || [];

      const matchesAudience =
        targetAudiences.includes(targetAudience) ||
        (targetAudience === 'children' && (tags.includes('child') || audiences.includes('الأطفال') || tags.includes('children'))) ||
        (targetAudience === 'pets' && (tags.includes('pet') || audiences.includes('الحيوانات الأليفة') || tags.includes('pets'))) ||
        (targetAudience === 'pregnancy' && (tags.includes('pregnancy') || audiences.includes('الحوامل'))) ||
        (targetAudience === 'livestock' && (tags.includes('livestock') || audiences.includes('المواشي')));

      if (!matchesAudience) {
        return false;
      }
    }

    // 8. Invasive Status Filter
    if (isInvasive) {
      const hasInvasive = plant.distributions?.some(d =>
        d.status === 'introduced' ||
        d.status === 'ornamental' ||
        (d.notes && d.notes.includes('غاز'))
      );
      if (!hasInvasive && plant.taxon?.scientific_name !== 'Pontederia crassipes') {
        return false;
      }
    }

    // 9. "التقييم غير متوفر" Filter
    if (notAssessedOnly) {
      const isNotAssessed = !hazardRecord ||
        hazardRecord.severity === 'not_assessed' ||
        plant.hazards?.severity === 'not_assessed' ||
        plant.review_status === 'needs_hazard_review';
      if (!isNotAssessed) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Extract unique plant families from dataset
 */
export function getUniquePlantFamilies(): string[] {
  const families = new Set<string>();
  botanicalData.plants.forEach(p => {
    if (p.taxon?.family) families.add(p.taxon.family);
  });
  return Array.from(families).sort();
}

/**
 * Extract unique governorates mentioned in plant distributions
 */
export function getUniqueDocumentedRegions(): string[] {
  const regions = new Set<string>();
  botanicalData.plants.forEach(p => {
    p.distributions?.forEach(d => {
      if (d.region_ar) regions.add(d.region_ar.trim());
    });
  });
  return Array.from(regions).sort();
}

/**
 * Maps documented regions in plant distribution records to GIS governorate IDs.
 * Strictly avoids fabricating coordinates, and identifies country-level-only status.
 */
export function getDocumentedGovernorateIds(plant: PlantRecord): {
  governorateIds: Set<string>;
  isCountryWideOnly: boolean;
  regionsNotes: string[];
} {
  const governorateIds = new Set<string>();
  const regionsNotes: string[] = [];
  let isCountryWideOnly = false;

  if (!plant.distributions || plant.distributions.length === 0) {
    return { governorateIds, isCountryWideOnly: true, regionsNotes };
  }

  plant.distributions.forEach(d => {
    if (d.region_ar) {
      regionsNotes.push(d.region_ar);
      const reg = d.region_ar;
      if (reg.includes('بغداد')) governorateIds.add('baghdad');
      if (reg.includes('ذي قار')) governorateIds.add('dhi-qar');
      if (reg.includes('أربيل') || reg.includes('اربیل') || reg.includes('چومان')) governorateIds.add('erbil');
      if (reg.includes('دهوك')) governorateIds.add('duhok');
      if (reg.includes('السليمانية') || reg.includes('سليمانية')) governorateIds.add('sulaymaniyah');
      if (reg.includes('البصرة')) governorateIds.add('basra');
      if (reg.includes('النجف')) governorateIds.add('najaf');
      if (reg.includes('الأنبار') || reg.includes('انبار')) governorateIds.add('anbar');
      if (reg.includes('بابل')) governorateIds.add('babil');
      if (reg.includes('واسط')) governorateIds.add('wasit');
      if (reg.includes('المثنى')) governorateIds.add('muthanna');
      if (reg.includes('القادسية') || reg.includes('ديوانية')) governorateIds.add('qadisiyyah');
      if (reg.includes('نينوى') || reg.includes('موصل')) governorateIds.add('ninawa');
      if (reg.includes('كركوك')) governorateIds.add('kirkuk');
      if (reg.includes('ميسان')) governorateIds.add('maysan');
      if (reg.includes('ديالى')) governorateIds.add('diyala');
      if (reg.includes('صلاح الدين')) governorateIds.add('salah-al-din');
      if (reg.includes('كربلاء')) governorateIds.add('karbala');

      if (reg.includes('شمال العراق')) {
        governorateIds.add('erbil');
        governorateIds.add('duhok');
        governorateIds.add('sulaymaniyah');
      }
      if (reg.includes('وسط العراق وجنوبه') || reg.includes('وسط وجنوب')) {
        governorateIds.add('baghdad');
        governorateIds.add('babil');
        governorateIds.add('najaf');
        governorateIds.add('karbala');
        governorateIds.add('wasit');
        governorateIds.add('qadisiyyah');
        governorateIds.add('muthanna');
        governorateIds.add('dhi-qar');
        governorateIds.add('maysan');
        governorateIds.add('basra');
      }
    } else if (d.country === 'IQ') {
      isCountryWideOnly = true;
    }
  });

  if (governorateIds.size === 0) {
    isCountryWideOnly = true;
  }

  return { governorateIds, isCountryWideOnly, regionsNotes };
}
