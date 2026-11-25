# NAFAS Security Findings Register (SECURITY_FINDINGS.md)
> **NAFAS Iraq Environmental Platform — Comprehensive Audit Findings**  
> **Auditing Standard:** OWASP Top 10:2025, OWASP ASVS 5.0 Level 2/3, CVSS v3.1  
> **Classification:** CONFIDENTIAL // PROJECT OWNER & SECURITY LAB ONLY  
> **Status:** AUDITED — REMEDIATION IN PROGRESS

---

## Findings Overview Matrix

| Finding ID | Vulnerability Title | Severity | CVSS v3.1 | Status | Affected Component |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **NFS-SEC-001** | Hardcoded GitHub Personal Access Token in Local Git Remote | **CRITICAL** | **9.1** | VERIFIED | `.git/config` (`remote.origin.url`) |
| **NFS-SEC-002** | Client-Side Role Spoofing & Complete Administrative Privilege Escalation | **CRITICAL** | **9.8** | VERIFIED | `Header.tsx`, `store.tsx`, `CampaignList.tsx` |
| **NFS-SEC-003** | Incomplete PostgreSQL RLS Policies & Whistleblower Identity/Coordinate Exposure | **HIGH** | **8.2** | VERIFIED | `src/lib/server/schema.sql` |
| **NFS-SEC-004** | Stored HTML Injection / Email Phishing in Administrative Notification Service | **HIGH** | **7.4** | VERIFIED | `src/lib/server/notificationService.ts` |
| **NFS-SEC-005** | Multiple Critical Supply Chain Vulnerabilities (Next.js & Vitest/Tinypool) | **HIGH** | **8.8** | VERIFIED | `package.json`, `package-lock.json` |
| **NFS-SEC-006** | Client-Side DoS via Unbounded Base64 LocalStorage Ingestion | **MEDIUM** | **6.5** | VERIFIED | `ReportSubmissionModal.tsx`, `store.tsx` |
| **NFS-SEC-007** | Business Logic Abuse: Infinite Points Farming via Registration Loop | **MEDIUM** | **6.3** | VERIFIED | `src/lib/store.tsx` |
| **NFS-SEC-008** | Insecure Static Voucher Code Generation & Zero Points Deduction | **MEDIUM** | **5.3** | VERIFIED | `src/components/rewards/RewardsModal.tsx` |
| **NFS-SEC-009** | Retention of Sensitive EXIF / GPS Metadata in Citizen Photo Uploads | **MEDIUM** | **5.3** | VERIFIED | `src/components/reports/ReportSubmissionModal.tsx` |
| **NFS-SEC-010** | Missing Server Verification for Cryptographic Certificate Digital Seals | **LOW** | **3.8** | VERIFIED | `src/components/certificates/CertificateModal.tsx` |

---

## Detailed Findings & Evidence

### NFS-SEC-001: Hardcoded GitHub PAT in Local Git Remote URL
- **Severity:** CRITICAL
- **CVSS v3.1:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N` (Score: 9.1)
- **Affected File:** `.git/config`
- **Evidence:**
  ```text
  origin https://mahamadfared1029-spec:ghp_qsua********************************@github.com/mahamadfared1029-spec/nafas-iraq.git
  ```
- **Root Cause:** A personal access token with repository read/write privileges was embedded directly in the remote URL instead of using secure credential storage or SSH authentication.
- **Business Impact:** Full compromise of repository source code, release pipeline, and GitHub Pages deployment. An attacker obtaining this token can push malicious code directly to `main`.
- **Recommended Fix:** 
  1. Immediately revoke the token `ghp_qsua...` in GitHub Developer Settings.
  2. Change local git remote URL to standard HTTPS or SSH:
     ```bash
     git remote set-url origin https://github.com/mahamadfared1029-spec/nafas-iraq.git
     ```
  3. Enforce Git Credential Manager or SSH keys.

---

### NFS-SEC-002: Client-Side Role Spoofing & Complete Privilege Escalation
- **Severity:** CRITICAL
- **CVSS v3.1:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H` (Score: 9.8)
- **Affected Files:** `src/lib/store.tsx`, `src/components/layout/Header.tsx`, `src/components/campaigns/CampaignList.tsx`, `src/components/reports/ReportDetailModal.tsx`
- **Evidence:**
  ```tsx
  // Header.tsx
  const { role, setRole } = useNafas();
  // Role menu allows any user to select 'admin', 'moderator', or 'organizer'
  
  // store.tsx
  const verifyAttendance = (campaignId: string, attendeeName: string, hours: number) => {
    if (role !== 'organizer' && role !== 'admin') {
      throw new Error('...');
    }
    // Issues official certificate with cryptographic seal
  }
  ```
- **Root Cause:** Authorization decisions are performed exclusively in client React state without requiring server-authenticated session tokens or MFA.
- **Business Impact:** Any visitor can switch their role to `admin` or `moderator` to alter environmental report verification statuses, forge civic certificates, award arbitrary volunteer hours, and revoke legitimate certificates.
- **Recommended Fix:**
  1. Remove or isolate client role-switchers to dedicated, authenticated test fixtures outside production builds.
  2. Enforce JWT tokens with validated server-side roles on all mutations.
  3. Protect admin operations with Supabase AAL2 (Authenticator App MFA).

---

### NFS-SEC-003: Incomplete PostgreSQL RLS Policies & Whistleblower Privacy Exposure
- **Severity:** HIGH
- **CVSS v3.1:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N` (Score: 8.2)
- **Affected File:** `src/lib/server/schema.sql`
- **Evidence:**
  1. `users`, `campaigns`, and `report_audit_logs` have `ENABLE ROW LEVEL SECURITY;` but **zero RLS policies**.
  2. `reports` table public policy exposes all columns:
     ```sql
     CREATE POLICY "Public can view non-rejected reports"
         ON reports FOR SELECT
         USING (status != 'rejected');
     ```
  3. `reported_by` (citizen UUID), `geom`, and `accuracy_m` are returned for all queries, including reports marked `is_anonymous = true`.
  4. `phone_number VARCHAR(20)` is stored unencrypted in `users`.
- **Root Cause:** Premature RLS declaration without complete SELECT/INSERT/UPDATE policy definitions, and lack of database views to mask anonymous whistleblowers.
- **Business Impact:** Citizen whistleblowers reporting dangerous dumping, industrial toxic pollution, or municipal corruption can be identified via their user UUID and precise GPS coordinates.
- **Recommended Fix:**
  1. Implement complete RLS policies for all tables.
  2. Create a secure view `public_reports` that masks `reported_by` and coordinates when `is_anonymous = true`.
  3. Implement pgcrypto or application-level encryption for citizen phone numbers.

---

### NFS-SEC-004: Stored HTML Injection / Email Phishing in Administrative Notification Service
- **Severity:** HIGH
- **CVSS v3.1:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:N` (Score: 7.4)
- **Affected File:** `src/lib/server/notificationService.ts` (`formatAlertEmail`)
- **Evidence:**
  ```typescript
  // notificationService.ts line 118-132
  <td style="padding: 8px 0;">${payload.neighborhood || 'ميداني'}</td>
  ...
  <a href="${payload.adminDashboardUrl}" style="...">فتح لوحة المشرف</a>
  ```
- **Root Cause:** User-controlled strings (`neighborhood`, `trackingNumber`, `adminDashboardUrl`) are interpolated into the HTML template without HTML entity escaping.
- **Business Impact:** An attacker submitting a report containing HTML/JS or malicious links can phish administrators, hijack admin sessions, or inject fraudulent content into official government/municipality alerts.
- **Recommended Fix:** Enforce a strict `escapeHtml()` helper on all template parameters.

---

### NFS-SEC-005: Critical Supply Chain Vulnerabilities (Next.js & Vitest/Tinypool)
- **Severity:** HIGH
- **CVSS v3.1:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:H` (Score: 8.8)
- **Affected Files:** `package.json`, `package-lock.json`
- **Evidence:**
  `npm audit` reports:
  - `next < 15.5.16`: DoS via Image Optimizer (GHSA-9g9p-9gw9-jx7f), HTTP request deserialization DoS in React Server Components (GHSA-h25m-26qc-wcjf).
  - `tinypool <= 2.1.1` (via Vitest): Prototype Pollution Gadget leading to Remote Code Execution (GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr).
  - `postcss <= 8.5.22`: Path traversal in source maps leading to arbitrary file disclosure (GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849).
- **Business Impact:** Denial of Service on server instances and potential sandbox escape or code execution during automated CI test pipelines.
- **Recommended Fix:** Update devDependencies and build configurations to patched versions.

---

### NFS-SEC-006: Client-Side DoS via Unbounded Base64 LocalStorage Ingestion
- **Severity:** MEDIUM
- **CVSS v3.1:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:N/A:H` (Score: 6.5)
- **Affected Files:** `src/components/reports/ReportSubmissionModal.tsx`, `src/lib/store.tsx`
- **Evidence:**
  `readAsDataURL(file)` reads up to 5MB file into a Base64 string (~6.7MB) and appends it to `reports`, triggering `localStorage.setItem('nafas_user_reports', JSON.stringify(reports))`.
- **Root Cause:** Storing large binary payloads inside synchronous, 5MB-limited browser `localStorage`.
- **Business Impact:** Submitting 1 or 2 photo reports crashes application persistence with `QuotaExceededError`, leaving users unable to save or view local state.
- **Recommended Fix:** Offload images to Supabase Storage / S3 signed URLs, or IndexedDB with thumbnail compression for offline mode.

---

### NFS-SEC-007: Business Logic Abuse: Infinite Points Farming via Registration Loop
- **Severity:** MEDIUM
- **CVSS v3.1:** `CVSS:3.1/AV:L/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N` (Score: 6.3)
- **Affected File:** `src/lib/store.tsx` (`registerForCampaign`, `cancelCampaignRegistration`)
- **Evidence:**
  - `registerForCampaign` awards `+15` points immediately upon registration.
  - `cancelCampaignRegistration` cancels registration but does NOT decrement points.
- **Root Cause:** Decoupling points allocation from verified attendance and omitting reversal logic on cancellation.
- **Business Impact:** A user can repeatedly register and cancel within seconds to accumulate hundreds of points, redeeming merchant discount vouchers without attending any campaigns.
- **Recommended Fix:** Award points ONLY upon verified attendance (`verifyAttendance`), never upon registration.

---

### NFS-SEC-008: Insecure Static Voucher Code Generation & Zero Points Deduction
- **Severity:** MEDIUM
- **CVSS v3.1:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N` (Score: 5.3)
- **Affected File:** `src/components/rewards/RewardsModal.tsx`
- **Evidence:**
  Voucher code is a static template: `NFS-${partner.id.toUpperCase()}-88`.
  `handleClaim` displays the voucher code but never calls `setPassport` to deduct points.
- **Root Cause:** Hardcoded static vouchers and missing state reduction logic.
- **Business Impact:** Merchants face revenue loss from unauthorized coupon reuse, and platform reputation is damaged.
- **Recommended Fix:** Generate dynamic, one-time, cryptographically random voucher tokens and atomically deduct points upon redemption.

---

### NFS-SEC-009: Retention of Sensitive EXIF / GPS Metadata in Citizen Photo Uploads
- **Severity:** MEDIUM
- **CVSS v3.1:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N` (Score: 5.3)
- **Affected File:** `src/components/reports/ReportSubmissionModal.tsx`
- **Evidence:** Direct `FileReader.readAsDataURL` retains all EXIF tags, GPS timestamps, camera serial numbers, and orientation markers.
- **Root Cause:** No metadata stripping occurs on the canvas or prior to serialization.
- **Business Impact:** Violates citizen whistleblower anonymity by revealing personal device metadata and potential home/origin locations.
- **Recommended Fix:** Re-encode images through an in-memory HTML5 Canvas element before saving.

---

### NFS-SEC-010: Missing Server Verification for Cryptographic Certificate Digital Seals
- **Severity:** LOW
- **CVSS v3.1:** `CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:N/I:L/A:N` (Score: 3.8)
- **Affected File:** `src/components/certificates/CertificateModal.tsx`
- **Evidence:**
  Digital seal hash is computed using a 32-bit FNV-1a hash in client JavaScript with no private signing key, and the QR code is an SVG mock that does not link to an authoritative verification URL.
- **Business Impact:** Counterfeiting of volunteer certificates for university or job credentials.
- **Recommended Fix:** Implement server-side Ed25519 or HMAC-SHA256 signatures with verifiable QR URLs pointing to `https://nafas.iq/verify/<id>`.
