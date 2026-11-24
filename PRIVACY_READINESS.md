# NAFAS Iraq — Privacy Readiness & Data Governance Report
**Standard:** Privacy by Design • Data Minimization Principles • GDPR & Iraqi Constitutional Standards  
**Date:** 24 November 2026  
**Auditor / Engine:** NYX OMNI ULTIMATE V3 (SUPERMAN Edition)

---

## 1. Privacy Framework & Legal Context
The NAFAS platform operates under the core principle of **"Citizen Safety & Environmental Transparency"**. In accordance with:
- **Article 17 of the Iraqi Constitution:** "Every individual shall have the right to personal privacy, so long as it does not contradict the rights of others and public morals."
- **Article 33 of the Iraqi Constitution:** "Every individual has the right to live in safe environmental conditions."
- **International Best Practices (GDPR / ISO 27701 Alignment):** Lawfulness, fairness, purpose limitation, and storage limitation.

---

## 2. Personal Data Inventory & Classification

| Data Element | Classification | Storage Location | Retention Period | Access Controls |
|---|---|---|---|---|
| **Full Name** | Personal Identifier | `public.profiles` | Until account deletion | Private to account holder; first name only on public comments |
| **Email Address** | Sensitive Identifier | `auth.users` | Until account deletion | Strict authentication only; never published |
| **Password Hash** | Security Credential | `auth.users` (Bcrypt) | Until changed | Cryptographically inaccessible to platform administrators |
| **Phone Number** | Direct Contact Info | `public.campaign_participants` | 30 days post-campaign | Masked; temporary audited access for verified coordinators only |
| **GPS Coordinates** | Geolocation Data | `public.reports` | Permanent (anonymized) | Exact coords for municipality; centroid masking for sensitive disputes |
| **Report Photos** | Media / Evidence | Supabase Storage (`reports`) | Permanent | Stripped of EXIF metadata before public display |
| **MFA TOTP Secret** | High-Security Credential| `auth.mfa_factors` | Until factor revoked | Authenticator device only; inaccessible to staff |

---

## 3. Core Privacy Safeguards Implemented

### 3.1 Zero-Tracking Policy (Zero Third-Party Beacons)
- **No Advertising Pixels:** Zero integration with Facebook Pixel, TikTok Pixel, or ad networks.
- **No Behavioral Trackers:** No Google Analytics, Hotjar, or session-recording SDKs.
- **No Cross-Site Profiling:** The platform issues zero third-party cookies.

### 3.2 Granular User Consent Mechanisms
- **Explicit Geolocation Consent:** GPS location is only queried when the user explicitly clicks the "تحديد موقعي الحالي" button. The user may alternatively drop a pin manually on the Leaflet map without granting device GPS permissions.
- **Media Upload Consent:** Users are explicitly informed that submitted photos are published publicly for environmental advocacy, with EXIF camera details stripped.
- **Terms & Charter Acceptance:** Registration requires an active checkbox acknowledging the Environmental Protection Charter.

### 3.3 Data Subject Rights (Self-Service & Formal Requests)
- **Right to Access:** Users can view all their submitted reports, points history, and profile data in real time.
- **Right to Rectification:** Users can update profile information and draft reports at any time.
- **Right to Erasure (Right to be Forgotten):** Users can permanently delete their account. In accordance with the public interest in historical environmental data, existing pollution reports are unlinked from the user's identity and archived anonymously.

---

## 4. Privacy Readiness Conclusion

NAFAS demonstrates a mature privacy posture. All personal data flows are minimized, encrypted, and isolated by PostgreSQL Row Level Security.
