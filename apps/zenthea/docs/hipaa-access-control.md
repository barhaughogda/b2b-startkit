# HIPAA Access Control & Data Visibility (Zenthea)

## Purpose

This document defines how Protected Health Information (PHI) must be accessed, restricted, logged, and governed inside the Zenthea platform to meet HIPAA requirements and pass enterprise healthcare security reviews.

This is a technical and product-level specification, not legal advice.

---

## Core HIPAA Principles

### 1. Minimum Necessary

Users may access only the minimum PHI required to perform their role.

### 2. Role-Based + Context-Aware Access

Access is determined by:
- Role
- Care relationship
- Practice or tenant
- Patient assignment
- Context (time, purpose, emergency)

### 3. Default Deny

All access is denied unless explicitly granted.

---

## Data Classification

### PHI Categories

- Clinical data
- Administrative healthcare data
- Billing and insurance data
- Digital metadata tied to patient care
- Audio, video, and AI-generated outputs
- Audit logs referencing patient activity

All categories below assume PHI unless explicitly de-identified.

---

## Roles and Allowed Access

### Provider (Physician, Specialist)

**Allowed**
- Full clinical record for patients under care
- Notes, labs, imaging, medications
- Scheduling for assigned patients

**Restricted**
- Patients outside care relationship
- Practice-wide analytics unless authorized

### Nurse / Clinical Staff

**Allowed**
- Clinical data required for active care
- Vitals, medications, care plans
- Tasks and workflows

**Restricted**
- Historical notes not relevant to care
- Sensitive notes unless explicitly granted
- Billing and financial data

### Administrative / Front Desk

**Allowed**
- Patient demographics
- Contact information
- Appointment scheduling
- Insurance status (high level)

**Restricted**
- Diagnoses
- Clinical notes
- Lab results
- Mental health data

### Billing / Finance

**Allowed**
- Insurance information
- CPT and ICD codes
- Claims and payment history
- Encounter metadata required for billing

**Restricted**
- Full clinical notes
- Sensitive diagnoses unless required

### Practice Administrator / Owner

**Allowed**
- Broad system access
- User and role management
- Reporting and analytics
- Audit logs

**Restricted**
- Still subject to minimum necessary
- No unrestricted curiosity access

### Patient

**Allowed**
- Own records only
- Visit summaries
- Medications
- Lab results
- Secure messages

**Restricted**
- Internal provider notes
- Other patients
- System audit data

### Zenthea Support / Internal Staff

**Default**
- No access to PHI

**Exception (Controlled Access)**
- Explicit customer authorization
- Time-limited access
- Purpose-bound (support ticket)
- Fully audited
- Automatically revoked

---

## Access Control Model

### Role-Based Access Control (RBAC)

Roles define baseline permissions.

Examples:
- Provider
- Nurse
- Admin
- Billing
- Patient
- Support (restricted)

### Attribute-Based Access Control (ABAC)

Final access decision depends on:
- Role
- Patient-provider relationship
- Practice/tenant
- Assignment
- Data sensitivity
- Time and context

Example:
A provider may access a patient record only if they are assigned to that patient.

---

## Sensitive Data Segmentation

Extra protection required for:
- Mental health notes
- Psychotherapy notes
- Substance use data
- HIV and sexual health data

Controls:
- Separate permissions
- Explicit grants
- Restricted default visibility

---

## Emergency (Break-Glass) Access

Used only when patient safety requires it.

Requirements:
- Explicit break-glass action
- Mandatory justification
- Elevated logging
- Post-event review

Break-glass access must never be silent.

---

## Audit Logging Requirements

Log every PHI interaction:
- User ID
- Role
- Patient ID
- Data accessed
- Action (read, write, delete)
- Timestamp
- Source (IP, device)
- Access reason (if elevated)

Audit logs are PHI and must be protected.

---

## Support Access Workflow

1. Customer explicitly enables access
2. Scope defined (patient, module, time)
3. Access automatically expires
4. All actions logged
5. Access revoked immediately after resolution

No persistent support access.

---

## Technical Enforcement Guidelines

- Default-deny permission model
- No shared accounts
- No global admin without safeguards
- Real-time permission evaluation
- Immediate access revocation support

---

## Compliance Expectations

This access model supports:
- HIPAA Security Rule
- HIPAA Privacy Rule
- SOC 2 controls
- Enterprise healthcare due diligence

---

## Strong Design Principles

- Assume all data is PHI
- Assume all access will be audited
- Make misuse visible and traceable
- Make access explicit, not convenient

---

## Final Note

HIPAA compliance succeeds or fails at the access layer.

Encryption protects data at rest.
Access control protects patients.
Encryption protects data at rest.
Access control protects patients.

This document is foundational and must be enforced consistently across all Zenthea modules.
