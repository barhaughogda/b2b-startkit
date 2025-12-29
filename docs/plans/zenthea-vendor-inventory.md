# Zenthea Vendor Inventory & BAA Checklist

**Purpose**: Complete vendor inventory for HIPAA compliance review (T00)  
**Status**: Draft - In Progress  
**Last Updated**: 2025-01-XX

## How to Use This Document

1. **Fill out the vendor inventory** (Section 1) with all vendors currently used or planned
2. **Answer the BAA questions** (Section 2) for each vendor
3. **Document decisions** (Section 3) - what's allowed, what needs changes, what's blocked
4. **Get legal/compliance review** before proceeding with migration

---

## 1. Vendor Inventory

### Hosting & Compute

| Vendor | Current/Target | Purpose | PHI Exposure Risk | BAA Status | Notes |
|--------|---------------|---------|-------------------|------------|-------|
| **Vercel** | Current (legacy) | Hosting Next.js app | ⚠️ HIGH - Full app access | ❓ Unknown | Moving to AWS for PHI workloads |
| **AWS (ECS/Fargate)** | Target | Hosting PHI app | ⚠️ HIGH - Full app access | ❓ Unknown | Need to confirm AWS BAA |
| **Convex** | Current (legacy) | Backend/database | ⚠️ HIGH - Stores PHI | ❓ Unknown | Being migrated away from |

**Questions to Answer:**
- [ ] Do you have an AWS BAA in place?
- [ ] Which AWS services will be used? (RDS, S3, ECS, CloudWatch, etc.)
- [ ] Is Vercel being used ONLY for non-PHI marketing site going forward?

---

### Database

| Vendor | Current/Target | Purpose | PHI Exposure Risk | BAA Status | Notes |
|--------|---------------|---------|-------------------|------------|-------|
| **Convex** | Current (legacy) | Primary database | ⚠️ HIGH - Stores PHI | ❓ Unknown | Being migrated away |
| **AWS RDS/Aurora Postgres** | Target | Primary database | ⚠️ HIGH - Stores PHI | ❓ Unknown | Covered under AWS BAA if AWS BAA exists |

**Questions to Answer:**
- [ ] Is AWS RDS/Aurora covered under your AWS BAA?
- [ ] What encryption will be used? (KMS SSE-KMS recommended)

---

### File Storage & CDN

| Vendor | Current/Target | Purpose | PHI Exposure Risk | BAA Status | Notes |
|--------|---------------|---------|-------------------|------------|-------|
| **AWS S3** | Current + Target | Medical images, file storage | ⚠️ HIGH - Stores PHI | ❓ Unknown | Need to confirm AWS BAA |
| **AWS CloudFront** | Current + Target | CDN for public assets | ⚠️ MEDIUM - May cache PHI | ❓ Unknown | Must disable caching for PHI |
| **Cloudinary** | Current | Marketing/public images | ✅ LOW - No PHI | ✅ Not needed | Only used for non-PHI assets |

**Questions to Answer:**
- [ ] Are S3 buckets configured with KMS encryption (SSE-KMS)?
- [ ] Is CloudFront configured to NOT cache PHI-containing responses?
- [ ] Are bucket policies HIPAA-compliant?

---

### Authentication

| Vendor | Current/Target | Purpose | PHI Exposure Risk | BAA Status | Notes |
|--------|---------------|---------|-------------------|------------|-------|
| **NextAuth** | Current (legacy) | Auth provider | ⚠️ MEDIUM - Session data | ❓ Unknown | Being replaced |
| **Clerk** | Target | Auth provider | ⚠️ MEDIUM - User data | ❓ Unknown | Need to confirm BAA |

**Questions to Answer:**
- [ ] Does Clerk offer BAAs? (Check their enterprise/HIPAA plan)
- [ ] What user data does Clerk store? (emails, names - may be PHI)
- [ ] Are session tokens stored securely?

---

### Email & Communications

| Vendor | Current/Target | Purpose | PHI Exposure Risk | BAA Status | Notes |
|--------|---------------|---------|-------------------|------------|-------|
| **SendGrid** | Current | Transactional emails | ⚠️ HIGH - Emails may contain PHI | ❓ Unknown | **CRITICAL** - Need BAA or ensure emails are PHI-free |
| **Resend** | Optional | Email alternative | ⚠️ HIGH - Emails may contain PHI | ❓ Unknown | Alternative if SendGrid doesn't work |

**Questions to Answer:**
- [ ] Do emails sent through Zenthea contain PHI? (patient names, appointment details, etc.)
- [ ] Does SendGrid offer BAAs? (Check their HIPAA-compliant plan)
- [ ] If emails contain PHI, what's the plan? (BAA or redesign to exclude PHI)

---

### Calendar Integration

| Vendor | Current/Target | Purpose | PHI Exposure Risk | BAA Status | Notes |
|--------|---------------|---------|-------------------|------------|-------|
| **Google Calendar API** | Current | Calendar sync | ⚠️ HIGH - Appointments may contain PHI | ❓ Unknown | Need to confirm Google Workspace BAA |

**Questions to Answer:**
- [ ] Are calendar events synced with Google Calendar?
- [ ] Do calendar events contain PHI? (patient names, appointment types)
- [ ] Do you have a Google Workspace BAA? (Required for PHI)

---

### AI Services

| Vendor | Current/Target | Purpose | PHI Exposure Risk | BAA Status | Notes |
|--------|---------------|---------|-------------------|------------|-------|
| **OpenAI** | Current (optional) | AI features | ⚠️ HIGH - May process PHI | ❓ Unknown | **CRITICAL** - Need BAA or strict redaction |
| **ElevenLabs** | Current (optional) | Voice AI | ⚠️ HIGH - May process PHI | ❓ Unknown | **CRITICAL** - Need BAA or strict redaction |

**Questions to Answer:**
- [ ] Are OpenAI/ElevenLabs used with patient data?
- [ ] Do OpenAI/ElevenLabs offer BAAs? (Check enterprise/HIPAA plans)
- [ ] If no BAA, can PHI be redacted before sending to these services?
- [ ] What's the data retention policy? (PHI must not be used for training)

---

### Billing & Payments

| Vendor | Current/Target | Purpose | PHI Exposure Risk | BAA Status | Notes |
|--------|---------------|---------|-------------------|------------|-------|
| **Stripe** | Target | Subscription billing | ✅ LOW - No PHI in billing | ✅ Not needed | Billing data doesn't contain PHI |

**Questions to Answer:**
- [ ] Does Stripe store any PHI? (Should be NO - only billing info)
- [ ] Are patient names/identifiers excluded from Stripe metadata?

---

### Observability & Monitoring

| Vendor | Current/Target | Purpose | PHI Exposure Risk | BAA Status | Notes |
|--------|---------------|---------|-------------------|------------|-------|
| **AWS CloudWatch** | Target | Logging | ⚠️ HIGH - Logs may contain PHI | ❓ Unknown | Covered under AWS BAA if AWS BAA exists |
| **AWS CloudTrail** | Target | API audit logs | ⚠️ MEDIUM - May log PHI access | ❓ Unknown | Covered under AWS BAA |
| **PostHog** | Optional | Product analytics | ⚠️ HIGH - May capture PHI | ❓ Unknown | **CRITICAL** - Must be configured to NOT capture PHI |
| **Sentry** | Optional | Error tracking | ⚠️ HIGH - Error reports may contain PHI | ❓ Unknown | **CRITICAL** - Must redact PHI from error reports |

**Questions to Answer:**
- [ ] Are CloudWatch logs configured to redact PHI?
- [ ] Is PostHog configured with PHI filtering? (IP addresses, user IDs, etc.)
- [ ] Is Sentry configured to sanitize error reports? (Remove PHI from stack traces)
- [ ] What's the log retention policy? (HIPAA may require specific retention)

---

### CI/CD & Development Tools

| Vendor | Current/Target | Purpose | PHI Exposure Risk | BAA Status | Notes |
|--------|---------------|---------|-------------------|------------|-------|
| **GitHub** | Current | Code repository | ✅ LOW - No PHI in code | ✅ Not needed | Code doesn't contain PHI |
| **GitHub Actions** | Current | CI/CD | ✅ LOW - No PHI in builds | ✅ Not needed | Builds don't contain PHI |
| **Vercel (CI/CD)** | Current | Deployments | ⚠️ MEDIUM - May access PHI env vars | ❓ Unknown | Moving away from Vercel |

**Questions to Answer:**
- [ ] Are environment variables containing PHI stored securely? (AWS Secrets Manager)
- [ ] Is Vercel CI/CD used for PHI environments? (Should be NO)

---

### DNS & Networking

| Vendor | Current/Target | Purpose | PHI Exposure Risk | BAA Status | Notes |
|--------|---------------|---------|-------------------|------------|-------|
| **Vercel (DNS)** | Current | DNS hosting | ✅ LOW - DNS doesn't contain PHI | ✅ Not needed | Moving to Route 53 |
| **AWS Route 53** | Target | DNS hosting | ✅ LOW - DNS doesn't contain PHI | ✅ Not needed | DNS records don't contain PHI |

**Questions to Answer:**
- [ ] When will DNS be moved to Route 53?
- [ ] Are DNS records configured correctly for HIPAA environments?

---

## 2. BAA Decision Framework

For each vendor, answer these questions:

### A. Does this vendor handle PHI?

**Definition**: Vendor "handles" PHI if they:
- Store PHI (database, file storage)
- Process PHI (AI services, email)
- Transmit PHI (CDN, email)
- Have access to PHI (hosting, logs)

**Answer**: ✅ YES / ❌ NO / ⚠️ MAYBE

---

### B. If YES or MAYBE, what's the PHI exposure?

- **HIGH**: Vendor stores/processes PHI directly (database, email with PHI, AI processing PHI)
- **MEDIUM**: Vendor has access to PHI but doesn't store it (hosting, logs)
- **LOW**: Vendor doesn't touch PHI (DNS, non-PHI CDN)

---

### C. BAA Options

1. **Vendor offers BAA** → Get BAA signed before using with PHI
2. **Vendor doesn't offer BAA** → Either:
   - Don't use vendor for PHI workloads
   - Redesign to exclude PHI from vendor
   - Find alternative vendor with BAA

---

### D. Technical Safeguards

Even with a BAA, implement:
- Encryption in transit (TLS)
- Encryption at rest (KMS)
- Access controls (least privilege)
- Audit logging
- PHI redaction in logs/errors

---

## 3. Decision Log

### ✅ Approved for PHI (BAA in place or not needed)

| Vendor | Status | Notes |
|--------|--------|-------|
| AWS (RDS, S3, ECS, CloudWatch) | ⏳ Pending | Need to confirm AWS BAA |
| Stripe | ✅ Approved | No PHI in billing data |
| Cloudinary | ✅ Approved | Only used for non-PHI assets |
| GitHub | ✅ Approved | Code doesn't contain PHI |

---

### ⚠️ Needs BAA or Redesign

| Vendor | Issue | Action Required | Owner | Deadline |
|--------|-------|----------------|-------|----------|
| **SendGrid** | Emails may contain PHI | Get BAA OR redesign emails to exclude PHI | [Owner] | [Date] |
| **OpenAI** | May process PHI | Get BAA OR implement strict PHI redaction | [Owner] | [Date] |
| **ElevenLabs** | May process PHI | Get BAA OR implement strict PHI redaction | [Owner] | [Date] |
| **Google Calendar** | Calendar events may contain PHI | Get Google Workspace BAA | [Owner] | [Date] |
| **Clerk** | User data may be PHI | Get Clerk BAA (check enterprise plan) | [Owner] | [Date] |
| **PostHog** | Analytics may capture PHI | Configure PHI filtering OR don't use | [Owner] | [Date] |
| **Sentry** | Error reports may contain PHI | Configure PHI sanitization OR don't use | [Owner] | [Date] |

---

### ❌ Blocked (No BAA, cannot exclude PHI)

| Vendor | Reason | Alternative |
|--------|--------|-------------|
| [None yet] | - | - |

---

## 4. Action Items

### Immediate (Before Migration)

- [ ] **Confirm AWS BAA** - Contact AWS support to get BAA signed
- [ ] **SendGrid decision** - Either get BAA or redesign emails to exclude PHI
- [ ] **AI services decision** - Get BAAs for OpenAI/ElevenLabs OR implement strict redaction
- [ ] **Clerk BAA** - Check if Clerk offers HIPAA-compliant plan with BAA
- [ ] **Google Calendar** - Confirm if calendar sync is needed, get BAA if yes

### Before Production

- [ ] **Observability configuration** - Configure PostHog/Sentry to NOT capture PHI
- [ ] **Log redaction** - Implement PHI redaction in CloudWatch logs
- [ ] **S3 encryption** - Ensure KMS encryption (SSE-KMS) is enabled
- [ ] **CloudFront caching** - Disable caching for PHI-containing responses

---

## 5. Vendor Contact Information

| Vendor | Contact | BAA Request Process | Notes |
|--------|---------|---------------------|-------|
| AWS | [Contact] | [Process] | [Notes] |
| SendGrid | [Contact] | [Process] | [Notes] |
| Clerk | [Contact] | [Process] | [Notes] |
| OpenAI | [Contact] | [Process] | [Notes] |
| ElevenLabs | [Contact] | [Process] | [Notes] |
| Google | [Contact] | [Process] | [Notes] |

---

## 6. References

- [HIPAA BAA Requirements](https://www.hhs.gov/hipaa/for-professionals/covered-entities-and-business-associates/business-associate-agreements/index.html)
- [AWS HIPAA Compliance](https://aws.amazon.com/compliance/hipaa-compliance/)
- [StartKit Migration Plan](../plans/zenthea-migration-hipaa.md)

---

## Next Steps

1. Fill out vendor inventory with current status
2. Answer BAA questions for each vendor
3. Contact vendors to request BAAs where needed
4. Document decisions in Decision Log
5. Update this document as decisions are made
6. Get legal/compliance review before proceeding
