# NAFAS Iraq — Comprehensive Threat Model
**Methodology:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)  
**Standard:** OWASP Threat Modeling Framework  
**Date:** 24 November 2026  
**Auditor:** NYX OMNI ULTIMATE V3 (SUPERMAN Edition)

---

## 1. System Overview & Asset Identification

The NAFAS platform facilitates citizen reporting of environmental violations and coordinates volunteer reforestation initiatives across Iraq.

### Core Assets to Protect:
1. **Whistleblower & Citizen Identities:** Personal names, contact numbers, and precise geolocation of reporters reporting on powerful corporate/industrial violators.
2. **Environmental Report Integrity:** Prevention of tampering, deletion, or falsification of legitimate pollution evidence.
3. **Administrative Authority:** Access to moderation dashboards, campaign coordination, and founder controls.
4. **Platform Availability & Public Trust:** Continuous uptime on zero-cost infrastructure and protection against denial of service.

---

## 2. Threat Actors & Personas

| Threat Actor | Motivation | Capability | Example Scenario |
|---|---|---|---|
| **Industrial / Polluting Violator** | Conceal illegal emissions, avoid municipal fines, or identify whistleblowers | Moderate / High | Attempting to query private reports via PostgREST to discover citizen reporter identities |
| **Spam / Farming Bot** | Farm platform points, flood the map with junk reports, or cause reputation damage | Low / Moderate | Scripted automation creating hundreds of fake reports per minute |
| **Compromised Administrative Staff** | Unauthorized status modification or suppression of legitimate reports | Insider Access | Moderator attempting privileged actions without MFA authorization |
| **Curious External Attacker** | Opportunistic vulnerability scanning | Low | Scanning for hardcoded secrets, misconfigured CORS, or RLS bypasses |

---

## 3. STRIDE Threat Analysis Matrix

### 3.1 Spoofing (Identity Deception)
- **Threat:** Attacker crafts requests claiming to be the Founder or another citizen.
- **Mitigation:**
  - Supabase Auth cryptographically signs all JWTs with RS256/HS256.
  - Verification of `auth.uid() = id` in Row Level Security policies prevents impersonation.
  - TOTP MFA (AAL2) required for administrative operations.
- **Status:** **MITIGATED & VERIFIED**

### 3.2 Tampering (Data Manipulation)
- **Threat:** Attacker modifies the approval status of an environmental report or edits another user's volunteer submission.
- **Mitigation:**
  - RLS policy `reports_update_staff_aal2` restricts status changes exclusively to verified staff at AAL2.
  - Normal citizens can only update their own draft reports prior to submission.
  - Points ledger is read-only to users and modified only by authenticated triggers.
- **Status:** **MITIGATED & VERIFIED**

### 3.3 Repudiation (Denial of Action)
- **Threat:** An administrator deletes a report and denies responsibility.
- **Mitigation:**
  - `audit_logs` table records actor ID, target entity, previous state, new state, and UTC timestamp.
  - Audit logs are append-only; updates and deletes are blocked by RLS policies.
- **Status:** **MITIGATED & VERIFIED**

### 3.4 Information Disclosure (Privacy Breaches)
- **Threat:** Exact GPS coordinates of sensitive reports or volunteer phone numbers leaked to public visitors.
- **Mitigation:**
  - Database views separate public report data from sensitive private evidence.
  - Neighborhood centroid aggregation applied to sensitive dispute cases.
  - Volunteer contact numbers encrypted and restricted to verified campaign organizers.
  - EXIF camera metadata automatically stripped from uploaded media.
- **Status:** **MITIGATED & VERIFIED**

### 3.5 Denial of Service (Resource Exhaustion)
- **Threat:** Attacker floods database with massive image payloads or hundreds of rapid reports.
- **Mitigation:**
  - Client and storage payload cap: 5MB per image.
  - Account rate limiting: Maximum 5 reports/hour.
  - Spatial deduplication: Reports within 50m of existing incidents are flagged rather than multiplied.
  - GitHub Pages CDN absorbs edge traffic spikes.
- **Status:** **MITIGATED & VERIFIED**

### 3.6 Elevation of Privilege (Unauthorized Superuser Access)
- **Threat:** Citizen user modifies their profile `role` column to `admin` or executes administrative endpoints without MFA.
- **Mitigation:**
  - Public role simulator removed from production.
  - Column-level privileges in PostgreSQL prevent users from modifying their own `role`.
  - Migration 004 & 005 enforce `auth.jwt()->>'aal' = 'aal2'` in RLS.
  - Tested in `phase1-final-integration-gate.test.ts` (passes).
- **Status:** **MITIGATED & VERIFIED**

---

## 4. Threat Modeling Summary & Continuous Verification

The STRIDE analysis confirms that defense-in-depth mitigations are active across all six threat vectors. Ongoing automated tests in GitHub Actions ensure that future commits cannot regress these security controls.
