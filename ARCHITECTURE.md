# NAFAS — Technical Architecture Document

## 1. Architectural Philosophy
NAFAS adopts a clean, layered architecture designed for low-latency delivery across varied mobile networks in Iraq. It isolates domain business logic, data models, and geospatial processing from presentation concerns.

## 2. System Topology

```
+-------------------------------------------------------+
|                   Presentation Layer                  |
|  Next.js 14 App Router, React 18, Tailwind CSS, Lucide|
+---------------------------+---------------------------+
                            |
                            v
+-------------------------------------------------------+
|               Client & Domain Services                |
|  - Language & Localization Service (ar-IQ, ckb, en)   |
|  - Role & Permission Simulation / RBAC Engine         |
|  - Geospatial Clustering & Leaflet Bridge             |
|  - Certificate Generator & QR Encoder                 |
+---------------------------+---------------------------+
                            |
                            v
+-------------------------------------------------------+
|                   Application API                     |
|  - /api/reports (CRUD, Lifecycle transitions)         |
|  - /api/campaigns (Registration, Attendance, Hours)   |
|  - /api/certificates (Verification lookup)            |
|  - /api/metrics (Public computed impact totals)       |
+---------------------------+---------------------------+
                            |
                            v
+-------------------------------------------------------+
|              Data & Persistence Engine                |
|  - PostgreSQL / Relational Schema Definition          |
|  - Immutable Audit Log Ledger                         |
|  - In-Memory & Local Database Repository              |
+-------------------------------------------------------+
```

## 3. Data Flow & Security Boundaries
1. **Report Submissions**: Input sanitization -> File size/MIME verification -> Immediate hazardous keywords safety scan -> Geo-coordinate bounds validation -> Unique tracking code generation (`NFS-2026-XXXX`).
2. **Campaign Registrations**: Capacity check -> Duplicate registration prevention -> Waiting list triage -> Volunteer contact privacy mask.
3. **Attendance Verification**: Organizer authorization check -> Attendance status toggle -> Automated volunteer hours calculation -> Points ledger entry.
4. **Certificate Issuance**: Verification threshold check -> Cryptographic ID generation -> QR code payload signing.
