# NAFAS Threat Model & Security Architecture (THREAT_MODEL.md)
> **Application:** NAFAS Iraq (نَفَس — نبض بلاد الرافدين)  
> **Methodology:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) + LINDDUN (Privacy-specific)  
> **Target Standard:** OWASP ASVS 5.0 (Level 2), NIST SP 800-53, Iraqi National Data Protection Principles  
> **Audited by:** NAFAS Security Intelligence Lab

---

## 1. System Architecture & Trust Boundaries

```
[ UNTRUSTED ZONE: PUBLIC WEB CLIENTS / CITIZENS ]
                  │
                  ▼  (HTTPS / TLS 1.3)
   ┌──────────────────────────────────────────────┐
   │         Next.js App / Static Export          │
   │  - Client State (Zustand / React Context)    │
   │  - Canvas Image Redraw (EXIF Stripping)      │
   │  - Location Validation (Iraq Bounding Box)   │
   └──────────────────────────────────────────────┘
                  │
  [ TRUST BOUNDARY: API GATEWAY & AUTH TOKENS ]
                  │
                  ▼  (JWT Bearer / AAL2 Authenticator)
   ┌──────────────────────────────────────────────┐
   │         Supabase / PostgreSQL Engine         │
   │  - Row Level Security (RLS) Enforcement      │
   │  - PostGIS Spatial Boundary Containment      │
   │  - Cryptographic Signing (pgcrypto / HMAC)   │
   │  - Immutable Audit Trail (report_audit_logs) │
   └──────────────────────────────────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────────────────┐
   │        Encrypted Storage & Services          │
   │  - S3 / Supabase Storage (Private Buckets)   │
   │  - Resend SMTP (Sanitized HTML Alerts)       │
   └──────────────────────────────────────────────┘
```

---

## 2. Threat Actor Taxonomy

| Actor Profile | Motivation | Capability | Primary Vectors |
| :--- | :--- | :--- | :--- |
| **Malicious Polluter / Corporation** | Conceal illegal dumping, toxic burning, or river contamination | High (resources, legal pressure) | Doxxing whistleblowers via coordinates/UUIDs, deleting verified violation records. |
| **Unethical Volunteer / Student** | Farm academic credit or unearned service certificates | Low to Medium | Replaying registration endpoints, forging digital seal hashes, spoofing organizer role. |
| **Commercial Exploiter** | Fraudulently harvest partner discounts and merchant gifts | Low | Guessing static voucher codes, farming reward points via loop vulnerabilities. |
| **Disruptive Spammer / Troll** | Flood the public map with bogus or offensive reports | Medium (scripting, bots) | Scripting report submissions, bypassing client-side location constraints. |
| **Compromised Moderator / Insider** | Alter report outcomes or favor political/commercial entities | High (authorized access) | Modifying report status without valid field evidence or audit accountability. |

---

## 3. STRIDE Threat Analysis Matrix

### S - Spoofing Identity
- **Threat:** An unauthenticated user spoofs an `admin` or `moderator` to review reports or revoke certificates.
- **Vulnerability:** Role stored in mutable client-side React state (`store.tsx`).
- **Mitigation:** Strict JWT claims validated server-side by PostgreSQL `auth.jwt() -> role`, MFA (AAL2) mandatory for administrative mutations.

### T - Tampering with Data
- **Threat:** Citizen modifies an existing violation report to alter evidence or remove pollution records.
- **Vulnerability:** Overly permissive or missing RLS UPDATE policies.
- **Mitigation:** RLS `UPDATE` on `reports` restricted strictly to `admin` and `moderator`. Normal citizens cannot update existing reports once submitted (`status = 'submitted'`).

### R - Repudiation
- **Threat:** A moderator marks a hazardous pollution report as `rejected` or `duplicate` and denies having done so.
- **Vulnerability:** Unauthenticated or client-generated audit log records.
- **Mitigation:** Database trigger on `reports` automatically creates immutable records in `report_audit_logs` capturing `auth.uid()`, `previous_status`, `new_status`, and server timestamp `NOW()`.

### I - Information Disclosure
- **Threat:** Public queries leak whistleblower identities, unencrypted phone numbers, or exact residential GPS coordinates.
- **Vulnerability:** Direct `SELECT * FROM reports` returns `reported_by` UUID, high-accuracy GPS, and photo metadata.
- **Mitigation:**
  - `phone_number` encrypted with pgcrypto or masked.
  - Public queries routed to `public_reports` view which masks coordinates to 2 decimal places (~1.1 km) for anonymous reports and returns `reported_by = NULL`.
  - EXIF stripped from images prior to upload.

### D - Denial of Service
- **Threat:** Automated botnet floods platform with fake reports or exhausts browser storage via massive Base64 payloads.
- **Vulnerability:** Client-side Base64 storage in `localStorage` without server rate limiting.
- **Mitigation:**
  - Rate limiting (5 reports per hour per IP/user) enforced at API gateway / Supabase.
  - Image payloads stored in object storage with 5MB caps and content-type enforcement.

### E - Elevation of Privilege
- **Threat:** Citizen or Volunteer calls RPC or PATCH endpoint to assign themselves the `admin` role.
- **Vulnerability:** Direct column updates on `users.role` without RLS protection.
- **Mitigation:** `users.role` column modification restricted exclusively to `service_role` or Super Admin; RLS blocks user self-updates on `role`.

---

## 4. Specific NAFAS Mission Security Objectives

### A. Whistleblower Protection Protocol
- When `is_anonymous = true`:
  - `reported_by` MUST be set to `NULL` in public views.
  - Exact GPS coordinates (`lat`, `lng`) MUST be rounded to governorate or neighborhood centroid for public queries.
  - Exact coordinates accessible ONLY by certified environmental response personnel with logged access.

### B. Volunteer Hours & Certificate Integrity
- Digital Seal MUST NOT be client-computed FNV-1a.
- All certificates MUST be signed by a server-side HMAC-SHA256 or asymmetric key.
- Public QR code MUST point to an authoritative verification endpoint (`https://nafas.iq/verify?code=NFS-CERT-...`).
- Attendance verification requires organizer physical sign-off or geofenced check-in.
