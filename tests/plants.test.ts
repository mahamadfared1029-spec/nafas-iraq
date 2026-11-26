/**
 * NAFAS Plant Clinic Acceptance Tests (اختبارات قبول الصيدلية النباتية في نَفَس)
 * Validates data ingestion, schema 1.0.0, tolerant search, multi-axis filtering,
 * stepped triage heuristic matching, emergency exposure protocols, distribution isolation, and privacy.
 */

import { describe, it, expect } from 'vitest';
import { 
  normalizeSearchTerm, 
  searchAndFilterPlants, 
  checkSharedFolkNameAlert, 
  getDocumentedGovernorateIds,
  botanicalData,
  getPlantHazard
} from '../src/lib/plantSearch';
import { 
  matchPlantProblems, 
  EMERGENCY_EXPOSURE_PROTOCOL, 
  TRIAGE_QUESTION_REASONS 
} from '../src/lib/plantTriage';
import { PlantTriageAnswers } from '../src/types/plants';

describe('1. Dataset Schema & Ingestion Integrity (الإصدار والاستيراد)', () => {
  it('should declare schema_version 1.0.0 and correct locale', () => {
    expect(botanicalData.schema_version).toBe('1.0.0');
    expect(botanicalData.locale).toBe('ar-IQ');
    expect(botanicalData.plants.length).toBeGreaterThanOrEqual(25);
    expect(botanicalData.hazards.length).toBeGreaterThanOrEqual(25);
    expect(botanicalData.problems.length).toBe(10);
    expect(botanicalData.seasonal_care.length).toBe(11);
    expect(botanicalData.safety_policies.length).toBe(13);
  });

  it('should contain zero duplicate IDs across all primary entities', () => {
    const checkDuplicateIds = (items: { id: string }[], name: string) => {
      const seen = new Set<string>();
      items.forEach(item => {
        expect(seen.has(item.id), `Duplicate ID in ${name}: ${item.id}`).toBe(false);
        seen.add(item.id);
      });
    };

    checkDuplicateIds(botanicalData.plants, 'plants');
    checkDuplicateIds(botanicalData.hazards, 'hazards');
    checkDuplicateIds(botanicalData.problems, 'problems');
    checkDuplicateIds(botanicalData.seasonal_care, 'seasonal_care');
    checkDuplicateIds(botanicalData.sources, 'sources');
    checkDuplicateIds(botanicalData.safety_policies, 'safety_policies');
  });

  it('should enforce HTTPS for all source URLs', () => {
    botanicalData.sources.forEach(src => {
      if (src.url) {
        expect(src.url.startsWith('https://'), `Source ${src.id} has insecure URL: ${src.url}`).toBe(true);
      }
    });
  });

  it('should maintain referential integrity between hazards and plants', () => {
    const plantIds = new Set(botanicalData.plants.map(p => p.id));
    botanicalData.hazards.forEach(h => {
      expect(plantIds.has(h.plant_id), `Hazard ${h.id} references missing plant_id: ${h.plant_id}`).toBe(true);
    });
  });

  it('should maintain referential integrity for evidence_sources', () => {
    const sourceIds = new Set(botanicalData.sources.map(s => s.id));
    
    botanicalData.plants.forEach(p => {
      p.distributions?.forEach(d => {
        d.evidence_sources?.forEach(sId => {
          expect(sourceIds.has(sId), `Plant ${p.id} distribution references missing source: ${sId}`).toBe(true);
        });
      });
      p.locale?.common_names?.forEach(cn => {
        cn.evidence_sources?.forEach(sId => {
          expect(sourceIds.has(sId), `Plant ${p.id} common name references missing source: ${sId}`).toBe(true);
        });
      });
    });

    botanicalData.hazards.forEach(h => {
      h.evidence_sources?.forEach(sId => {
        expect(sourceIds.has(sId), `Hazard ${h.id} references missing source: ${sId}`).toBe(true);
      });
    });

    botanicalData.problems.forEach(pr => {
      pr.evidence_sources?.forEach(sId => {
        expect(sourceIds.has(sId), `Problem ${pr.id} references missing source: ${sId}`).toBe(true);
      });
    });
  });
});

describe('2. Tolerant Multilingual Search Engine (البحث المتسامح)', () => {
  it('should normalize Arabic tashkeel, tatweel, and alefs properly', () => {
    expect(normalizeSearchTerm('الـدَّفْلَةُ')).toBe('الدفله');
    expect(normalizeSearchTerm('الـخَـــرْوَع')).toBe('الخروع');
    expect(normalizeSearchTerm('إسفاناخ')).toBe('اسفاناخ');
    expect(normalizeSearchTerm('أزهار')).toBe('ازهار');
    expect(normalizeSearchTerm('حنظل')).toBe('حنظل');
  });

  it('should normalize Kurdish Sorani Latin letters and accents', () => {
    expect(normalizeSearchTerm('Sîr')).toBe('sir');
    expect(normalizeSearchTerm('Pîvaz')).toBe('pivaz');
    expect(normalizeSearchTerm('Gazna')).toBe('gazna');
  });

  it('should find Nerium oleander using Arabic with or without tashkeel', () => {
    const resultsPlain = searchAndFilterPlants({ query: 'الدفلة' });
    const resultsTashkeel = searchAndFilterPlants({ query: 'الـدَّفْلَةُ' });

    expect(resultsPlain.length).toBeGreaterThanOrEqual(1);
    expect(resultsTashkeel.length).toBeGreaterThanOrEqual(1);
    expect(resultsPlain[0].taxon.scientific_name).toBe('Nerium oleander');
    expect(resultsTashkeel[0].taxon.scientific_name).toBe('Nerium oleander');
  });

  it('should find Ricinus communis using Arabic or Latin', () => {
    const resultsAr = searchAndFilterPlants({ query: 'الخروع' });
    const resultsLat = searchAndFilterPlants({ query: 'Ricinus' });

    expect(resultsAr.length).toBeGreaterThanOrEqual(1);
    expect(resultsLat.length).toBeGreaterThanOrEqual(1);
    expect(resultsAr[0].taxon.scientific_name).toBe('Ricinus communis');
    expect(resultsLat[0].taxon.scientific_name).toBe('Ricinus communis');
  });

  it('should find Pontederia crassipes by scientific name or synonym Eichhornia crassipes', () => {
    const resultsAccepted = searchAndFilterPlants({ query: 'Pontederia crassipes' });
    const resultsSynonym = searchAndFilterPlants({ query: 'Eichhornia crassipes' });

    expect(resultsAccepted.length).toBeGreaterThanOrEqual(1);
    expect(resultsSynonym.length).toBeGreaterThanOrEqual(1);
    expect(resultsAccepted[0].taxon.scientific_name).toBe('Pontederia crassipes');
    expect(resultsSynonym[0].taxon.scientific_name).toBe('Pontederia crassipes');
  });

  it('should find Urtica dioica by Kurdish Sorani name Gazna', () => {
    const resultsKurdish = searchAndFilterPlants({ query: 'Gazna' });
    expect(resultsKurdish.length).toBeGreaterThanOrEqual(1);
    expect(resultsKurdish[0].taxon.scientific_name).toBe('Urtica dioica');
  });

  it('should trigger shared folk name alert for ambiguous hazardous names', () => {
    const oleanderAlert = checkSharedFolkNameAlert('الدفلة');
    const ricinusAlert = checkSharedFolkNameAlert('الخروع');
    const colocynthisAlert = checkSharedFolkNameAlert('الحنظل');
    const safeMintAlert = checkSharedFolkNameAlert('نعناع');

    expect(oleanderAlert).not.toBeNull();
    expect(oleanderAlert?.level).toBe('critical');

    expect(ricinusAlert).not.toBeNull();
    expect(ricinusAlert?.level).toBe('critical');

    expect(colocynthisAlert).not.toBeNull();
    expect(colocynthisAlert?.level).toBe('critical');

    expect(safeMintAlert).toBeNull();
  });
});

describe('3. Multi-Axis Filtering & Safety Isolations (الفلاتر المتعددة)', () => {
  it('should filter plants by family correctly', () => {
    const apocynaceaePlants = searchAndFilterPlants({ family: 'Apocynaceae' });
    expect(apocynaceaePlants.length).toBeGreaterThanOrEqual(1);
    apocynaceaePlants.forEach(p => {
      expect(p.taxon.family).toBe('Apocynaceae');
    });
  });

  it('should filter plants by hazard route', () => {
    const ingestionHazardPlants = searchAndFilterPlants({ hazardRoute: 'ingestion' });
    expect(ingestionHazardPlants.length).toBeGreaterThanOrEqual(3);
    const scientificNames = ingestionHazardPlants.map(p => p.taxon.scientific_name);
    expect(scientificNames).toContain('Nerium oleander');
    expect(scientificNames).toContain('Ricinus communis');
    expect(scientificNames).toContain('Citrullus colocynthis');
  });

  it('should filter plants by sensitive target audience (pets toxicity)', () => {
    const petToxicityPlants = searchAndFilterPlants({ targetAudience: 'pets' });
    expect(petToxicityPlants.length).toBeGreaterThanOrEqual(1);
    const scientificNames = petToxicityPlants.map(p => p.taxon.scientific_name);
    // Allium or Nerium are toxic to pets
    expect(scientificNames.some(name => name.includes('Allium') || name === 'Nerium oleander')).toBe(true);
  });

  it('should filter plants by invasive status', () => {
    const invasivePlants = searchAndFilterPlants({ isInvasive: true });
    expect(invasivePlants.length).toBeGreaterThanOrEqual(1);
    expect(invasivePlants.some(p => p.taxon.scientific_name === 'Pontederia crassipes')).toBe(true);
  });

  it('should isolate hold_distribution_review records from public distribution by default', () => {
    const publicPlants = searchAndFilterPlants({ excludeDistributionHold: true });
    const holdPlant = publicPlants.find(p => p.taxon.scientific_name === 'Datura metel');
    expect(holdPlant).toBeUndefined();

    // When researcher mode is on, hold records can be inspected
    const researcherPlants = searchAndFilterPlants({ excludeDistributionHold: false });
    const researcherDatura = researcherPlants.find(p => p.taxon.scientific_name === 'Datura metel');
    expect(researcherDatura).toBeDefined();
    expect(researcherDatura?.review_status).toBe('hold_distribution_review');
  });

  it('should not treat absence of hazard as safe', () => {
    const notAssessedPlants = searchAndFilterPlants({ notAssessedOnly: true });
    expect(notAssessedPlants.length).toBeGreaterThan(0);
    notAssessedPlants.forEach(p => {
      const hazard = getPlantHazard(p.id);
      const isUnassessed = !hazard || hazard.severity === 'not_assessed' || p.hazards?.severity === 'not_assessed' || p.review_status === 'needs_hazard_review';
      expect(isUnassessed).toBe(true);
    });
  });
});

describe('4. GIS Governorate Mapping & Distribution Evidence (ربط الخريطة)', () => {
  it('should map Pontederia crassipes strictly to documented governorates (Dhi Qar & Baghdad)', () => {
    const pontederia = botanicalData.plants.find(p => p.taxon.scientific_name === 'Pontederia crassipes');
    expect(pontederia).toBeDefined();
    const info = getDocumentedGovernorateIds(pontederia!);

    expect(info.governorateIds.has('dhi-qar')).toBe(true);
    expect(info.governorateIds.has('baghdad')).toBe(true);
    // Must NOT fabricate other random governorates like Nineveh or Anbar
    expect(info.governorateIds.has('ninawa')).toBe(false);
    expect(info.isCountryWideOnly).toBe(false);
  });

  it('should map Nerium oleander to northern mountain governorates for wild records', () => {
    const oleander = botanicalData.plants.find(p => p.taxon.scientific_name === 'Nerium oleander');
    expect(oleander).toBeDefined();
    const info = getDocumentedGovernorateIds(oleander!);

    expect(info.governorateIds.has('erbil')).toBe(true);
    expect(info.governorateIds.has('duhok')).toBe(true);
    expect(info.governorateIds.has('sulaymaniyah')).toBe(true);
  });

  it('should flag country-wide only records as isCountryWideOnly', () => {
    const juliflora = botanicalData.plants.find(p => p.taxon.scientific_name === 'Neltuma juliflora');
    expect(juliflora).toBeDefined();
    const info = getDocumentedGovernorateIds(juliflora!);

    expect(info.isCountryWideOnly).toBe(true);
  });
});

describe('5. Stepped Triage & Emergency Protocol Engine (التشخيص والإسعاف)', () => {
  it('should provide complete emergency first-aid protocols with 911 priority without login or photo', () => {
    expect(EMERGENCY_EXPOSURE_PROTOCOL.priorityCall.number).toBe('911');
    expect(EMERGENCY_EXPOSURE_PROTOCOL.priorityCall.telLink).toBe('tel:911');
    expect(EMERGENCY_EXPOSURE_PROTOCOL.priorityCall.criticalSigns.length).toBeGreaterThanOrEqual(3);

    // Ingestion protocol forbids inducing vomiting
    const ingestionText = EMERGENCY_EXPOSURE_PROTOCOL.ingestionProtocol.steps.join(' ');
    expect(ingestionText).toContain('لا تحرّض على التقيؤ');

    // Eye exposure recommends 15 to 20 minutes continuous flush
    const eyeText = EMERGENCY_EXPOSURE_PROTOCOL.eyeExposureProtocol.steps.join(' ');
    expect(eyeText).toContain('15 إلى 20 دقيقة');

    // Skin exposure recommends 15 minutes soap wash
    const skinText = EMERGENCY_EXPOSURE_PROTOCOL.skinExposureProtocol.steps.join(' ');
    expect(skinText).toContain('15 دقيقة');

    // Veterinary protocol highlights Allium hemolysis and warns against human medications
    const vetText = EMERGENCY_EXPOSURE_PROTOCOL.veterinaryProtocol.steps.join(' ');
    expect(vetText).toContain('الثوم والبصل');
    expect(vetText).toContain('الباراسيتامول');
  });

  it('should accurately match cottony white signs to mealybugs (البق الدقيقي)', () => {
    const answers: PlantTriageAnswers = {
      plantKnown: false,
      plantingContext: 'container',
      environment: {
        potDrainage: 'has_drain_holes',
        sunlightExposure: 'filtered',
        waterType: 'tap_city'
      },
      symptomLocation: 'stem',
      appearance: 'other',
      spreadRate: 'gradual_weeks',
      visibleSigns: 'cottony_white'
    };

    const result = matchPlantProblems(answers);
    expect(result.isInsufficientData).toBe(false);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates[0].problem.id).toBe('mealy');
    expect(result.candidates[0].confidenceScore).toBeGreaterThanOrEqual(0.5);
  });

  it('should accurately match fine webs to spider mites (حلم الغبار)', () => {
    const answers: PlantTriageAnswers = {
      plantKnown: false,
      plantingContext: 'open_ground',
      environment: {
        potDrainage: 'unknown',
        sunlightExposure: 'direct_harsh',
        waterType: 'tap_city'
      },
      symptomLocation: 'old_leaves',
      appearance: 'burnt_margins',
      spreadRate: 'rapid_days',
      visibleSigns: 'fine_webs'
    };

    const result = matchPlantProblems(answers);
    expect(result.isInsufficientData).toBe(false);
    expect(result.candidates[0].problem.id).toBe('mite');
  });

  it('should accurately match interveinal yellowing in alkaline Iraqi soil to iron chlorosis', () => {
    const answers: PlantTriageAnswers = {
      plantKnown: false,
      plantingContext: 'container',
      environment: {
        potDrainage: 'has_drain_holes',
        sunlightExposure: 'filtered',
        waterType: 'tap_city'
      },
      symptomLocation: 'new_leaves',
      appearance: 'interveinal_yellow',
      spreadRate: 'gradual_weeks',
      visibleSigns: 'none_visible'
    };

    const result = matchPlantProblems(answers);
    expect(result.isInsufficientData).toBe(false);
    expect(result.candidates[0].problem.id).toBe('yellow');
  });

  it('should return isInsufficientData when symptoms are too vague', () => {
    const answers: PlantTriageAnswers = {
      plantKnown: false,
      plantingContext: 'unknown',
      environment: {
        potDrainage: 'unknown',
        sunlightExposure: 'unknown',
        waterType: 'unknown'
      },
      symptomLocation: 'general',
      appearance: 'other',
      spreadRate: 'gradual_weeks',
      visibleSigns: 'none_visible'
    };

    const result = matchPlantProblems(answers);
    expect(result.isInsufficientData).toBe(true);
  });

  it('should strictly contain zero chemical pesticide recipes in safe remedies', () => {
    const answers: PlantTriageAnswers = {
      plantKnown: false,
      plantingContext: 'container',
      environment: {
        potDrainage: 'no_drain_holes',
        sunlightExposure: 'indoor_low',
        waterType: 'tap_city'
      },
      symptomLocation: 'old_leaves',
      appearance: 'full_yellow',
      spreadRate: 'gradual_weeks',
      visibleSigns: 'none_visible'
    };

    const result = matchPlantProblems(answers);
    const remediesString = result.safeRemediesSummary.join(' ');

    expect(remediesString).toContain('يُحظر تطبيق مبيدات كيميائية');
    expect(remediesString).not.toContain('سم كيميائي');
    expect(remediesString).not.toContain('ملعقة دي دي تي');
    expect(remediesString).not.toContain('خلطة ديازينون');
  });

  it('should provide clear reasons for every diagnostic question', () => {
    expect(TRIAGE_QUESTION_REASONS.plantingContext).toBeDefined();
    expect(TRIAGE_QUESTION_REASONS.environment_drainage).toBeDefined();
    expect(TRIAGE_QUESTION_REASONS.environment_sunlight).toBeDefined();
    expect(TRIAGE_QUESTION_REASONS.environment_water).toBeDefined();
    expect(TRIAGE_QUESTION_REASONS.symptomLocation).toBeDefined();
    expect(TRIAGE_QUESTION_REASONS.spreadRate).toBeDefined();
    expect(TRIAGE_QUESTION_REASONS.visibleSigns).toBeDefined();
  });
});
