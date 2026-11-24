# NAFAS — Security & Privacy Architecture

## 1. Principles of Least Privilege & Data Minimization
- **Volunteer Phone Number Privacy**: Citizen and volunteer contact details are strictly encrypted and invisible on public UI surfaces, reports, or campaign listings. Only verified campaign organizers have time-limited, audited access to participant rosters.
- **Geographic Precision Masking**: Sensitive environmental reports involving vulnerable areas or ongoing litigation may have their precise coordinates masked to neighborhood centroids for public viewers while retaining exact GIS points for municipality remediation teams.
- **Anti-Farming & Abuse Prevention**:
  - Duplicate detection by comparing coordinate Euclidean distance (< 50 meters) and category timestamps.
  - Per-account submission rate limits (maximum 5 reports/hour).
  - Points ledger verification: points are awarded **only upon verified remediation or verified campaign check-in**, never merely on report submission.

## 2. File Upload Hardening
- Client-side and server-side MIME type verification (restricted to `image/jpeg`, `image/png`, `image/webp`).
- Max payload cap: 10MB (10,485,760 bytes) per image matching frontend and Supabase storage bucket limits.
- Image stripping of sensitive EXIF metadata before public display.

## 3. Input Sanitization & Server Boundaries
- All user text is parameterized and sanitized against Cross-Site Scripting (XSS).
- Role-based authorization enforced server-side.
