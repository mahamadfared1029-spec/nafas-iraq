# NAFAS — Database Schema & Data Models

## 1. Relational Entity Relationship Diagram

```
[Users]
  id: UUID (PK)
  phone: VARCHAR (Encrypted, Private)
  full_name: VARCHAR
  role: ENUM ('citizen', 'volunteer', 'organizer', 'moderator', 'admin')
  governorate_id: VARCHAR (FK -> Governorates)
  points: INTEGER (DEFAULT 0)
  created_at: TIMESTAMP

[Governorates]
  id: VARCHAR (PK, e.g., 'baghdad', 'basra')
  name_ar: VARCHAR
  name_ku: VARCHAR
  name_en: VARCHAR
  latitude: FLOAT
  longitude: FLOAT
  climate_zone: VARCHAR

[Reports]
  id: VARCHAR (PK, e.g., 'NFS-2026-8812')
  user_id: UUID (FK -> Users, NULL for anonymous)
  governorate_id: VARCHAR (FK -> Governorates)
  neighborhood: VARCHAR
  latitude: FLOAT
  longitude: FLOAT
  category: ENUM ('garbage', 'dumping', 'burning', 'water', 'debris', 'flora')
  severity: ENUM ('low', 'medium', 'high', 'critical')
  description: TEXT
  image_before_url: VARCHAR
  image_after_url: VARCHAR (Nullable)
  status: ENUM ('submitted', 'under_review', 'verified', 'in_progress', 'resolved', 'duplicate', 'rejected')
  assigned_entity: VARCHAR (Nullable)
  is_hazardous: BOOLEAN (DEFAULT FALSE)
  created_at: TIMESTAMP
  resolved_at: TIMESTAMP (Nullable)

[ReportAuditLogs]
  id: UUID (PK)
  report_id: VARCHAR (FK -> Reports)
  actor_id: UUID (FK -> Users)
  previous_status: VARCHAR
  new_status: VARCHAR
  notes: TEXT
  created_at: TIMESTAMP

[Campaigns]
  id: VARCHAR (PK, e.g., 'CMP-BAG-01')
  organizer_id: UUID (FK -> Users)
  governorate_id: VARCHAR (FK -> Governorates)
  title_ar: VARCHAR
  title_en: VARCHAR
  description_ar: TEXT
  meeting_location: VARCHAR
  target_saplings: INTEGER
  capacity: INTEGER
  registered_count: INTEGER (DEFAULT 0)
  start_date: TIMESTAMP
  duration_hours: FLOAT
  status: ENUM ('upcoming', 'in_progress', 'completed', 'cancelled')
  gear_provided: JSONB
  certificate_eligible: BOOLEAN

[Registrations]
  id: UUID (PK)
  campaign_id: VARCHAR (FK -> Campaigns)
  user_id: UUID (FK -> Users)
  status: ENUM ('confirmed', 'waitlisted', 'attended', 'cancelled')
  registered_at: TIMESTAMP
  verified_at: TIMESTAMP (Nullable)

[Certificates]
  id: VARCHAR (PK, e.g., 'NFS-CERT-2026-9041')
  user_id: UUID (FK -> Users)
  campaign_id: VARCHAR (FK -> Campaigns)
  hours_awarded: FLOAT
  issue_date: TIMESTAMP
  verification_token: VARCHAR (Cryptographic hash)
```
