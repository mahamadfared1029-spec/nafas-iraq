# NAFAS Incident Response Plan (INCIDENT_RESPONSE_PLAN.md)
> **National Environmental & Volunteer Platform — Incident Response Protocol**  
> **Target Audience:** Incident Commanders, Cloud Architects, DevSecOps, Platform Moderators  
> **Standard:** NIST SP 800-61 Rev. 2 (Computer Security Incident Handling Guide)

---

## 1. Incident Classification Matrix

| Severity Level | Criteria | Example in NAFAS | Response Time SLA | Incident Commander |
| :--- | :--- | :--- | :--- | :--- |
| **SEV-1 (CRITICAL)** | Unauthorized database access, mass whistleblower exposure, admin session hijacking, infrastructure compromise | Unencrypted citizen dump leaked, malicious admin user created | **< 1 Hour** | Project Owner / Principal SecOps |
| **SEV-2 (HIGH)** | Service disruption, certificate forging at scale, automated spam botnet flooding map | Botnet posting 1,000 fake burning reports, points farming attack | **< 4 Hours** | Lead Backend Engineer |
| **SEV-3 (MEDIUM)** | Isolated client-side bug, individual report tampering, single voucher exploitation | LocalStorage crash on mobile, broken GIS boundary calculation | **< 24 Hours** | Frontend Engineer |
| **SEV-4 (LOW)** | Minor informational anomaly, cosmetic UI vulnerability, false positive alarm | Outdated documentation, non-sensitive styling artifact | **< 72 Hours** | Support / Community Lead |

---

## 2. Six-Phase Incident Handling Lifecycle

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 1. PREPARATION│ ──> │ 2. DETECTION │ ──> │3.CONTAINMENT │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 6. LESSONS   │ <── │ 5. RECOVERY  │ <── │4. ERADICATION│
└──────────────┘     └──────────────┘     └──────────────┘
```

### Phase 1: Preparation
- Maintenance of immutable database audit logs (`report_audit_logs`).
- Pinned cryptographic keys and environment secrets stored exclusively in secret managers (never in git).
- Regularly tested backups of PostgreSQL database with PostGIS geometry tables.

### Phase 2: Detection & Analysis
- Monitor Supabase authentication failures and sudden spikes in `reports` inserts (> 20 reports/minute from single ASN/IP).
- Monitor outbound email throttling alerts from `notificationService.ts`.
- Triage community reports of suspicious volunteer certificates.

### Phase 3: Containment
- **Short-Term Workaround:** Revoke compromised tokens via Supabase Auth Dashboard.
- **Circuit Breaker:** Toggle `isDemoMode = true` or activate Read-Only maintenance mode on API endpoints if active database injection is suspected.
- **Network Boundary:** Block malicious IP/CIDR ranges at Cloudflare / Edge CDN.

### Phase 4: Eradication
- Patch root cause vulnerability in code or RLS policy.
- Revoke all certificates issued by compromised actor using `is_revoked = TRUE` flag:
  ```sql
  UPDATE certificates 
  SET is_revoked = TRUE, revoked_reason = 'Incident SEV-1 Containment', revoked_at = NOW() 
  WHERE organizer_id = 'compromised-uuid';
  ```
- Purge forged reports and restore verified status logs.

### Phase 5: Recovery
- Validate database integrity and ensure PostGIS geometry indices (`GIST`) are intact.
- Re-enable write permissions after verification by independent security reviewer.
- Monitor error rates and latency for 48 hours post-recovery.

### Phase 6: Post-Incident Review & Lessons Learned
- Convene post-mortem meeting within 5 business days.
- Document Root Cause Analysis (RCA), timeline of events, and preventative actions.
- Update `SECURITY_FINDINGS.md` and ASVS checklist.

---

## 3. Whistleblower Breach Emergency Protocol
If citizen or whistleblower identities are suspected to have been exposed:
1. Immediately isolate `public_reports` view and disable direct table access to `reports`.
2. Review server access logs for queries accessing `reported_by` or raw coordinates.
3. Notify affected citizens securely through encrypted SMS if legal/safety risks exist.
4. Rotate all master encryption keys and database access credentials.
