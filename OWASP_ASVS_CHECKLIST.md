# NAFAS OWASP ASVS 5.0 Compliance Checklist (OWASP_ASVS_CHECKLIST.md)
> **Standard:** OWASP Application Security Verification Standard (ASVS) 5.0 — Level 2 (Standard Applications)  
> **Target Scope:** Frontend (Next.js), Backend (PostgreSQL/Supabase & API Client), Mobile View, Storage  
> **Verification Status:** AUDITED WITH EMPIRICAL EVIDENCE // ZERO FALSE PASSES

---

## ASVS Verification Summary

| Chapter | Verification Domain | Total Applicable | Pass | Fail / Incomplete | Compliance % |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **V1** | Architecture, Design & Threat Modeling | 8 | 4 | 4 | 50% |
| **V2** | Authentication Verification | 10 | 2 | 8 | 20% |
| **V3** | Session Management | 6 | 3 | 3 | 50% |
| **V4** | Access Control (Role & RLS) | 12 | 2 | 10 | 17% |
| **V5** | Validation, Sanitization & Encoding | 10 | 6 | 4 | 60% |
| **V6** | Stored Cryptography | 6 | 1 | 5 | 17% |
| **V7** | Error Handling & Logging | 6 | 4 | 2 | 67% |
| **V8** | Data Protection & Privacy | 8 | 2 | 6 | 25% |
| **V9** | Communications Security | 4 | 3 | 1 | 75% |
| **V10** | Malicious Code & Supply Chain | 6 | 2 | 4 | 33% |
| **V11** | Business Logic Integrity | 8 | 3 | 5 | 38% |
| **V12** | File & Storage Security | 6 | 2 | 4 | 33% |

---

## Detailed Control Audit

### V1: Architecture & Threat Modeling
- [x] **V1.1.1** Application architecture clearly defined and documented (`ARCHITECTURE.md`). **PASS**
- [ ] **V1.1.2** Threat model developed covering all system boundaries. **FAIL** (Remediated via `THREAT_MODEL.md`).
- [ ] **V1.4.1** Automated security controls integrated in build/CI. **FAIL** (Missing `.github/workflows`).
- [x] **V1.8.1** Principles of least privilege documented. **PASS**

### V2: Authentication Verification
- [ ] **V2.1.1** Passwords or OTP tokens transmitted only over TLS. **UNVERIFIED (Demo Mode)**
- [ ] **V2.2.1** Passwords stored using argon2id, bcrypt, or PBKDF2. **UNVERIFIED (Pending Server)**
- [ ] **V2.7.1** MFA (AAL2) required for administrative/moderation actions. **FAIL** (Client-side role toggle present without MFA).
- [ ] **V2.8.1** Brute-force protection / rate limiting on auth endpoints. **FAIL** (No rate limiting configured).

### V4: Access Control
- [ ] **V4.1.1** Principle of Least Privilege enforced on server-side. **FAIL** (Client-side role toggle controls UI privileges).
- [ ] **V4.1.2** All data access endpoints enforce authorization checks. **FAIL** (RLS policies missing for `users`, `campaigns`, `report_audit_logs`).
- [ ] **V4.2.1** Prevention of Insecure Direct Object References (IDOR). **FAIL** (`reported_by` UUID exposed publicly in reports).
- [ ] **V4.3.1** Administrative interfaces inaccessible to unauthenticated users. **FAIL** (Moderator modal accessible by toggling client state).

### V5: Validation, Sanitization & Encoding
- [x] **V5.1.1** Input validation enforced on coordinate boundaries (lat 28.5–38.5, lng 38.0–49.5). **PASS**
- [x] **V5.1.2** Input validation for file extensions and MIME types. **PASS** (`image/jpeg`, `image/png`, `image/webp`).
- [ ] **V5.3.1** Output encoding enforced to prevent XSS. **FAIL** (HTML Injection in `notificationService.ts` email template).
- [x] **V5.5.1** Parameterized database queries and PostGIS geometry constructors used. **PASS**

### V6: Stored Cryptography
- [ ] **V6.1.1** Citizen phone numbers and sensitive identifiers encrypted at rest. **FAIL** (`phone_number` stored plaintext).
- [ ] **V6.2.1** Cryptographic signatures generated using approved algorithms (HMAC-SHA256, Ed25519). **FAIL** (Client-side FNV-1a hash used).
- [x] **V6.2.2** Cryptographic salt/nonce used for national ID hashes (SHA-256). **PASS**

### V8: Data Protection & Citizen Privacy
- [ ] **V8.1.1** Whistleblower anonymity enforced at database level. **FAIL** (`reported_by` UUID exposed in raw `reports` table).
- [ ] **V8.2.1** EXIF/GPS metadata stripped from user-uploaded images. **FAIL** (Direct FileReader dataURL serialization retains EXIF).
- [ ] **V8.3.1** Accurate coordinates masked for sensitive public reports. **FAIL** (Full precision numeric lat/lng returned).

### V10: Malicious Code & Supply Chain
- [ ] **V10.1.1** Dependencies free from known critical CVEs. **FAIL** (`npm audit` reports 3 Critical, 1 High).
- [x] **V10.2.1** Source code repository free from committed secrets. **PASS**
- [ ] **V10.2.2** Local Git configuration free from embedded PATs. **FAIL** (`.git/config` contained plaintext PAT).

### V11: Business Logic Integrity
- [ ] **V11.1.1** Impact points cannot be farmed through loop actions. **FAIL** (Register-cancel loop awards +15 points without deduction).
- [ ] **V11.1.2** Reward vouchers are single-use and deduct points atomically. **FAIL** (Static coupon code, no points deduction).
- [x] **V11.2.1** Campaign registration prevents double-booking at DB level (`uq_user_campaign`). **PASS**
