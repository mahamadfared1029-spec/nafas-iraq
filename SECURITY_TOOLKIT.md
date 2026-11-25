# NAFAS Security Intelligence Toolkit (SECURITY_TOOLKIT.md)
> **NAFAS Environmental & Volunteer Platform — National Security Audit**  
> **Environment:** Windows 11 / Node.js v22.17.0 / Python 3.13.2 / PostgreSQL 15+ & PostGIS / Supabase  
> **Standard:** OWASP ASVS 5.0 (Level 2/3), ISO/IEC 27001, Iraqi Civic Data Privacy Guidelines  
> **Auditing Authority:** NAFAS Independent Security Intelligence Lab

---

## 1. Executive Summary & Verification Standard
In accordance with the **NAFAS Security Intelligence Lab** directive, this toolkit inventory strictly adheres to the principle of **Evidence Over Claims — Zero False Passes**. No tool or capability is claimed without physical verification on the local auditing host or sanctioned pipeline.

---

## 2. Verified Active Tool Inventory

| Tool / Technology | Type / Category | Detected Version | Operational Status | Verified Scope & Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Git** | SCM / Forensics | `2.55.0.windows.5` | ✅ **Active** | Commit history analysis, secret detection, diff verification, remote URL hygiene. |
| **Node.js** | Runtime Engine | `v22.17.0` | ✅ **Active** | AST parsing, TypeScript compilation, SSR/SSG execution, client runtime verification. |
| **npm** | Package Manager | `10.9.2` | ✅ **Active** | Software Composition Analysis (`npm audit`), dependency tree analysis. |
| **Python** | Analysis / Scripting | `3.13.2` | ✅ **Active** | Custom SAST scanners, PostGIS spatial verification, payload validation, report generators. |
| **Vitest** | Unit/Regression Test | `3.0.5` (in spec) | ⚠️ **Configured (Fix Needed)** | Automated security regression testing (requires repairing node_modules junction). |
| **TypeScript Compiler** | Static Type Checker | `5.7.3` | ✅ **Active** | Type safety verification, interface enforcement, null-safety checks. |
| **TailwindCSS / PostCSS**| UI Framework | `3.4.17` / `8.5.2` | ✅ **Active** | CSS injection analysis, styling boundaries. |
| **PowerShell Core/Win** | Host Automation | `5.1 / 7.x` | ✅ **Active** | Local file system inspection, environment audit, process integrity. |

---

## 3. Tool Gap Analysis & Acquisition Plan (Zero-Cost Open Source)

To reach OWASP ASVS 5.0 Level 2 compliance without incurring financial cost or commercial API subscriptions, the following zero-cost, open-source security utilities are recommended for deployment in local or CI/CD pipelines:

| Target Capability | Recommended Tool | License | Source / Repository | Deployment Protocol |
| :--- | :--- | :--- | :--- | :--- |
| **SAST (Static Analysis)** | Semgrep Community Edition | LGPL-2.1 | `github.com/semgrep/semgrep` | Run via Docker or Python wheel in sandboxed CI runner. |
| **Secret Detection** | Gitleaks | MIT | `github.com/gitleaks/gitleaks` | Standalone binary hook in pre-commit and GitHub Actions. |
| **SCA / Vulnerability** | Trivy Community | Apache-2.0 | `github.com/aquasecurity/trivy` | Scans container images, filesystem, and package-lock.json. |
| **DAST (Dynamic Testing)**| OWASP ZAP (Core CLI) | Apache-2.0 | `github.com/zaproxy/zaproxy` | Automated baseline scans against staging environments. |
| **PostgreSQL RLS Audit** | Supabase CLI / pgTAP | Apache-2.0 | `github.com/supabase/cli` | Automated testing of RLS policies against synthetic roles. |
| **Headless E2E Security** | Playwright Chromium | Apache-2.0 | `github.com/microsoft/playwright` | Automated testing of client-side role isolation and DOM security. |

---

## 4. Operational Safety & Privilege Protocol
1. **Cost Ceiling:** \$0.00 — strictly free, open-source, or local tools.
2. **Access Control:** No tool is granted access to live production database credentials or private master keys without explicit owner authorization.
3. **Data Protection:** All synthetic test data must use simulated Iraqi citizen identities (e.g., `حيدر الكرخي`, `سجاد العبيدي`) and zero real PII.
4. **Credential Sanitation:** Git remote URLs and configuration files must never store unencrypted Personal Access Tokens (PAT).
