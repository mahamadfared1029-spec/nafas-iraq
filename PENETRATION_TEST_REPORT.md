# NAFAS Ethical Penetration Test Report (PENETRATION_TEST_REPORT.md)
> **Target:** NAFAS Environmental & Volunteer Platform (Local Sandbox / GitHub Pages Staging)  
> **Testing Scope:** Authorization, Business Logic, Input Validation, Client-Side Persistence, Cryptographic Seals  
> **Methodology:** OWASP Web Security Testing Guide (WSTG v4.2) / PTES  
> **Tester:** Senior Ethical Penetration Tester — NAFAS Security Intelligence Lab  
> **Rules of Engagement:** Zero production disruption, zero DDoS, synthetic test accounts only.

---

## 1. Executive Summary & Test Outcome
A black-box and grey-box ethical penetration test was conducted against the NAFAS application codebase. Multiple exploitable vulnerabilities were identified in the client-side state logic, notification parsing, and PostgreSQL security policies.

---

## 2. Test Execution & Exploitation Scenarios

### Scenario A: Client-Side Role Spoofing (WSTG-ATHZ-02 / BOLA)
- **Objective:** Escalate privileges from an unverified citizen visitor to platform administrator and issue unauthorized volunteer certificates.
- **Procedure:**
  1. Open browser developer console or interface role menu in `Header.tsx`.
  2. Switch role in React context state:
     ```javascript
     // Invoking context setter via React devtools or UI header
     window.__NAFAS_SET_ROLE__('organizer');
     ```
  3. Navigate to `CampaignList` or `VolunteerPassport`.
  4. The "Verify Attendance" form becomes visible and functional.
  5. Enter arbitrary participant name (`مهاجم مجهول`) and 100 volunteer hours.
  6. Submit the form.
- **Observed Result:** `verifyAttendance` executes successfully. An official certificate with ID `NFS-CERT-2026-XXXX-XXXX` and digital seal hash is generated, +100 hours are awarded, and +100 points are added to the user's passport.
- **Verdict:** **EXPLOITABLE (CRITICAL)**. Complete authorization bypass in client-side runtime.

---

### Scenario B: Infinite Impact Points Farming Loop (WSTG-BUSL-04)
- **Objective:** Manipulate campaign registration endpoints to farm infinite points without participating in events.
- **Procedure:**
  1. Inspect `src/lib/store.tsx` functions `registerForCampaign` and `cancelCampaignRegistration`.
  2. Execute sequential registrations and cancellations:
     ```javascript
     for (let i = 0; i < 20; i++) {
       window.__NAFAS_STORE__.registerForCampaign('CMP-BAG-01', 'Test Volunteer');
       window.__NAFAS_STORE__.cancelCampaignRegistration('CMP-BAG-01');
     }
     ```
- **Observed Result:** Each registration awards `+15` points. Cancellation decrements campaign capacity but does NOT deduct awarded points. After 20 iterations, the user balance increases by 300 points without attending any event.
- **Verdict:** **EXPLOITABLE (HIGH)**. Business logic vulnerability enabling instant redemption of partner discount vouchers.

---

### Scenario C: Stored HTML Injection in Administrative Alerts (WSTG-INPV-02)
- **Objective:** Inject malicious HTML elements into admin alert emails via the report submission payload.
- **Procedure:**
  1. Open `ReportSubmissionModal.tsx`.
  2. In the "Neighborhood / Area" input field, submit the following payload:
     ```html
     الكرادة"><a href="https://evil-phish.iq/admin-login" style="display:block;padding:20px;background:red;color:white;font-size:20px;">اضغط هنا فوراً لتوثيق البلاغ العاجل</a><!--
     ```
  3. The payload is passed to `dispatchReportAlert` -> `formatAlertEmail`.
- **Observed Result:** The template concatenates:
  ```html
  <td style="padding: 8px 0;">الكرادة"><a href="https://evil-phish.iq/admin-login"...><!--</td>
  ```
  The table cell markup is broken, injecting a high-priority phishing button directly into the administrative notification email.
- **Verdict:** **EXPLOITABLE (HIGH)**. Unsanitized interpolation allows HTML/CSS injection in email clients.

---

### Scenario D: LocalStorage Exhaustion / Client-Side DoS (WSTG-CLNT-08)
- **Objective:** Trigger persistent storage failure in the user's browser by submitting valid high-resolution camera images.
- **Procedure:**
  1. Upload two 4MB PNG/JPEG photographs taken with a modern smartphone camera.
  2. `readAsDataURL` creates Base64 strings of ~5.4MB each.
  3. Submitting the second report triggers `localStorage.setItem('nafas_user_reports', JSON.stringify(reports))`.
- **Observed Result:** Browser throws `DOMException: QuotaExceededError`. The entire user report array fails to save. Subsequent application loads encounter unhandled JSON or empty states.
- **Verdict:** **EXPLOITABLE (MEDIUM)**. Storage design flaw causing localized application crash.

---

### Scenario E: Anonymous Whistleblower De-Anonymization via RLS (WSTG-CONF-04)
- **Objective:** Extract the real user identity and exact residential coordinates of an anonymous whistleblower.
- **Procedure:**
  1. A citizen submits a report of illegal medical waste dumping with `is_anonymous = true`.
  2. An unauthenticated attacker queries the Supabase REST API:
     ```http
     GET /rest/v1/reports?select=id,title,reported_by,lat,lng,accuracy_m,is_anonymous HTTP/1.1
     Host: nafas-db.supabase.co
     apikey: <ANON_KEY>
     ```
- **Observed Result:** The server executes `CREATE POLICY "Public can view non-rejected reports"` which returns the exact coordinates (e.g. `lat: 33.312845, lng: 44.361524`) and `reported_by: "550e8400-e29b-41d4-a716-446655440000"`.
  The attacker cross-references this UUID against public comments or volunteer activity to de-anonymize the citizen.
- **Verdict:** **EXPLOITABLE (HIGH)**. RLS policy fails to sanitize anonymous reports.
