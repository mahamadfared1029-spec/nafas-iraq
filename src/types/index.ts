export type Role = 
  | 'guest' 
  | 'citizen' 
  | 'volunteer' 
  | 'organizer' 
  | 'moderator' 
  | 'admin'
  | 'super_admin';

export type Language = 'ar' | 'ku' | 'en';

export type Season = 'auto' | 'spring' | 'summer' | 'autumn' | 'winter';

export type PollutionCategory = 
  | 'garbage' 
  | 'dumping' 
  | 'burning' 
  | 'water' 
  | 'debris' 
  | 'flora'
  | 'other';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export type ReportStatus = 
  | 'submitted' 
  | 'under_review' 
  | 'verified' 
  | 'assigned'
  | 'in_progress' 
  | 'pending_verification'
  | 'resolved' 
  | 'duplicate' 
  | 'rejected'
  | 'reopened'
  | 'archived';

export interface Governorate {
  id: string;
  nameAr: string;
  nameKu: string;
  nameEn: string;
  lat: number;
  lng: number;
  zoom: number;
  climateZone: string;
  activeReportsCount: number;
  resolvedReportsCount: number;
  descriptionAr: string;
}

export interface ReportAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: Role;
  previousStatus: ReportStatus;
  newStatus: ReportStatus;
  notes: string;
}

export interface EnvironmentalReport {
  id: string;
  trackingNumber: string;
  title: string;
  description: string;
  category: PollutionCategory;
  severity: SeverityLevel;
  governorateId: string;
  neighborhood: string;
  lat: number;
  lng: number;
  location_source?: 'gps' | 'manual_picker' | 'initial_coords' | 'governorate_center_approximate';
  accuracy_m?: number;
  source_layer_version?: string;
  imageBeforeUrl: string;
  imageBeforeName?: string;
  imageBeforeSize?: number;
  imageAfterUrl?: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  reportedBy: string;
  reporterDisplayName?: string;
  isAnonymous: boolean;
  isHazardous: boolean;
  isArchived?: boolean;
  assignedModeratorId?: string;
  assignedEntity?: string;
  verificationEvidence?: string;
  imageBeforeStoragePath?: string;
  imageAfterStoragePath?: string;
  auditLogs: ReportAuditLog[];
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  governorateId: string;
  phoneMasked?: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  specialty?: string;
  isVerifiedVolunteer?: boolean;
  points?: number;
  mfaEnabled?: boolean;
  isSuspended?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationOutboxItem {
  id: string;
  eventId: string;
  reportId: string;
  eventType: string;
  recipientMasked: string;
  deliveryStatus: 'pending' | 'queued' | 'sent' | 'failed' | 'retry_scheduled' | 'unconfigured';
  provider: string;
  attemptCount: number;
  lastAttemptAt?: string;
  externalMessageId?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditLogItem {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  ipHash?: string;
  createdAt: string;
}

export type CampaignType = 
  | 'reforestation' 
  | 'cleanup' 
  | 'recycling' 
  | 'education' 
  | 'river_protection' 
  | 'biodiversity';

export type CampaignStatus = 'draft' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

export interface VolunteerCampaign {
  id: string;
  titleAr: string;
  titleKu: string;
  titleEn: string;
  descriptionAr: string;
  descriptionKu: string;
  descriptionEn: string;
  campaignType: CampaignType;
  governorateId: string;
  meetingArea: string;
  meetingCoordinates?: { lat: number; lng: number };
  date: string;
  startTime: string;
  durationHours: number;
  targetTrees: number;
  treesPlanted?: number;
  wasteCollectedKg?: number;
  volunteerCapacity: number;
  registeredCount: number;
  confirmedCount: number;
  organizer: string;
  organizerId?: string;
  organizerRole: string;
  safetyEquipment: string[];
  status: CampaignStatus;
  certificateEligible: boolean;
  partnerRewardsNotice?: string;
}

export interface UserRegistration {
  id: string;
  campaignId: string;
  campaignTitle?: string;
  governorateId?: string;
  date?: string;
  userName: string;
  userPhone: string; // masked in UI
  registeredAt: string;
  attended: boolean;
  attendedAt?: string;
  status: 'registered' | 'checked_in' | 'attended' | 'cancelled' | 'no_show';
  verifiedHours: number;
  certificateIssued: boolean;
}

export interface IssuedCertificate {
  id: string;
  verificationCode: string;
  participantName: string;
  campaignTitle: string;
  governorate: string;
  hoursAwarded: number;
  issueDate: string;
  organizerSignature: string;
  digitalSealHash: string;
  revoked?: boolean;
  revokedReason?: string;
  revokedAt?: string;
  recipientPhoneMasked?: string;
  isDemoCertificate?: boolean;
  watermarkText?: string;
}

export interface ImpactMetrics {
  totalReportsSubmitted: number;
  totalVerifiedIssues: number;
  totalResolvedCleanups: number;
  totalCampaignsHeld: number;
  totalActiveVolunteers: number;
  totalVolunteerHours: number;
  totalTreesPlanted: number;
  activeGovernoratesCount: number;
  lastUpdated: string;
}

export interface PlantingRecommendation {
  id: string;
  speciesNameAr: string;
  scientificName: string;
  suitableGovernorates: string[]; // governorateIds or 'all'
  bestPlantingMonths: number[]; // 1 to 12
  waterNeed: 'low' | 'moderate' | 'high';
  heatTolerance: 'extreme' | 'high' | 'moderate';
  salinityTolerance: 'high' | 'moderate' | 'low';
  ecologicalRole: string;
  careTips: string;
}

export interface HeritageChapter {
  id: string;
  governorateId: string;
  governorateNameAr: string;
  era: string;
  titleAr: string;
  historicalLandmark: string;
  naturalHeritage: string;
  traditionalEcology: string;
  ecoInnovation: string;
  historicalFact: string;
  historicalQuote: string;
  modernChallenge: string;
  conservationHope: string;
}
