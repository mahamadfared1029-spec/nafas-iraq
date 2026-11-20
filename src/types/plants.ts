/**
 * NAFAS Plant Clinic Types (الصيدلية النباتية في نَفَس)
 * Derived from nafas-plants.json schema_version 1.0.0
 */

export type DistributionStatus =
  | 'native'
  | 'wild_documented'
  | 'ornamental'
  | 'introduced'
  | 'cultivated'
  | 'specimen_reported'
  | 'reported_unresolved'
  | 'doubtful_or_historical';

export type ReviewStatus =
  | 'research_draft'
  | 'needs_hazard_review'
  | 'needs_botanical_review'
  | 'hold_distribution_review'
  | 'published'
  | 'verified';

export type HazardSeverity = 'low' | 'moderate' | 'high' | 'critical' | 'not_assessed';

export type HazardRoute = 'ingestion' | 'skin' | 'eyes' | 'pollen' | 'food';

export type TargetAudience = 'general' | 'children' | 'pets' | 'pregnancy' | 'livestock';

export interface CommonName {
  name: string;
  language: string; // 'ar-IQ' | 'ckb-Latn' | 'en'
  region?: string | null;
  evidence_sources: string[];
}

export interface Taxon {
  scientific_name: string;
  authority?: string;
  family: string;
  rank?: string;
  wcvp_id?: string;
  ipni_id?: string;
  synonyms: string[];
}

export interface PlantLocale {
  language: string;
  common_names: CommonName[];
  description: string;
  habitat: string;
  field_notes?: string;
}

export interface DistributionItem {
  country: string;
  region_ar?: string | null;
  status: DistributionStatus;
  evidence_sources: string[];
  notes?: string;
}

export interface PlantCare {
  sunlight?: string;
  watering?: string;
  soil?: string;
  tolerance_iraq?: string;
  caution?: string;
  verified_in_iraq?: boolean;
}

export interface PlantHazardSummary {
  has_hazard: boolean;
  severity: HazardSeverity;
  primary_routes: HazardRoute[];
  warning_summary_ar: string;
  hazard_record_id?: string;
}

export interface PlantRecord {
  id: string;
  taxon: Taxon;
  locale: PlantLocale;
  distributions: DistributionItem[];
  care?: PlantCare;
  hazards?: PlantHazardSummary;
  gbif_audit?: {
    taxon_key?: number;
    match_type?: string;
    dataset_citations?: string[];
  };
  confidence?: 'high' | 'moderate' | 'preliminary' | 'disputed';
  review_status?: ReviewStatus;
  previous_accepted_names?: string[];
}

export interface HazardRecord {
  id: string;
  plant_id: string;
  severity: HazardSeverity;
  target_audiences: TargetAudience[];
  routes: HazardRoute[];
  toxic_parts: string[];
  symptoms_ar: string[];
  first_aid_ar: {
    immediate_actions: string[];
    emergency_call_priority: boolean;
    eye_exposure?: string;
    skin_exposure?: string;
    ingestion?: string;
    veterinary_note?: string;
  };
  clinical_note?: string;
  evidence_sources: string[];
}

export interface ProblemRecord {
  id: string;
  problem_ar: string;
  problem_en: string;
  category: 'water' | 'pest' | 'disease' | 'nutrition' | 'climate' | 'soil';
  primary_symptoms: string[];
  affected_parts: string[];
  environmental_triggers: string[];
  safe_management_ar: string[];
  chemical_warning_ar: string;
  escalation_criteria_ar: string;
  evidence_sources: string[];
}

export interface SeasonalCareRecord {
  id: string;
  crop_or_zone_ar: string;
  timing_ar: string;
  key_actions_ar: string[];
  water_management_ar: string;
  warnings_ar: string[];
  evidence_sources: string[];
}

export interface SourceRecord {
  id: string;
  title_ar: string;
  title_en?: string;
  citation: string;
  url: string;
  access_date?: string;
  evidence_tier: 'tier_1_herbarium' | 'tier_2_peer_reviewed' | 'tier_3_governmental' | 'tier_4_academic';
}

export interface SafetyPolicyRecord {
  id: string;
  title_ar: string;
  rule_ar: string;
  mandatory_actions: string[];
  disclaimers: string[];
}

export interface BotanicalDataset {
  schema_version: string;
  dataset_version: string;
  locale: string;
  review_status: string;
  accessed_on: string;
  plants: PlantRecord[];
  hazards: HazardRecord[];
  problems: ProblemRecord[];
  seasonal_care: SeasonalCareRecord[];
  sources: SourceRecord[];
  safety_policies: SafetyPolicyRecord[];
}

/**
 * Triage State & Questionnaire Types
 */
export type TriagePathway = 'exposure_emergency' | 'plant_problem' | null;

export interface PlantTriageAnswers {
  plantKnown: boolean;
  plantId?: string;
  plantingContext: 'container' | 'open_ground' | 'unknown';
  governorateId?: string;
  environment: {
    sunlightExposure?: 'direct_harsh' | 'filtered' | 'indoor_low' | 'unknown';
    potDrainage?: 'has_drain_holes' | 'no_drain_holes' | 'unknown';
    waterType?: 'tap_city' | 'well_saline' | 'river' | 'unknown';
    recentlyRepotted?: boolean;
    symptomOnsetDays?: 'recent_fast' | 'gradual_slow' | 'unknown';
  };
  symptomLocation: 'top_growth' | 'old_leaves' | 'new_leaves' | 'stem' | 'roots' | 'fruits' | 'general';
  appearance: 'full_yellow' | 'interveinal_yellow' | 'burnt_margins' | 'wilt_droop' | 'spots_brown_black' | 'rot_soft' | 'curling' | 'other';
  spreadRate: 'rapid_days' | 'gradual_weeks';
  visibleSigns: 'cottony_white' | 'fine_webs' | 'soft_insects_honeydew' | 'none_visible';
}

export interface ProblemMatchCandidate {
  problem: ProblemRecord;
  confidenceScore: number; // 0 to 1
  matchingEvidence: string[];
  nextSteps: string[];
  whenToEscalate: string;
}

export interface SpecialistReferralPayload {
  consultationId: string;
  governorateId: string;
  plantTypeDescription: string;
  symptomsDescription: string;
  hasConsentedToPrivacy: boolean;
  imageProvided: boolean;
  retentionExpiryDate: string; // ISO string 30 days
}
