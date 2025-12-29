# Zenthea HIPAA-Compliant Vendor Strategy

**Purpose**: Design HIPAA-compliant vendor architecture (T00)  
**Status**: Design Phase  
**Goal**: Minimize vendors while maintaining functionality

---

## Core Principle

**If a vendor can see PHI (directly or via logs/traces), you need a BAA OR you must guarantee PHI never touches that vendor.**

---

## 1. AWS (Required - Single BAA Covers All)

### ✅ DO: Use AWS for All Infrastructure

**Vendor Consolidation Strategy**: Use AWS for as many services as possible to minimize BAAs.

| Service | Purpose | HIPAA Design |
|---------|---------|--------------|
| **RDS/Aurora Postgres** | Database | ✅ Use AWS RDS with KMS encryption (SSE-KMS) |
| **S3** | File storage | ✅ Use S3 with KMS encryption (SSE-KMS) |
| **ECS/Fargate** | Compute | ✅ Use ECS Fargate for Next.js app |
| **CloudWatch** | Logging | ✅ Use CloudWatch with PHI redaction |
| **CloudTrail** | Audit logs | ✅ Use CloudTrail for API audit |
| **CloudFront** | CDN | ✅ Use CloudFront with NO caching for PHI routes |
| **Route 53** | DNS | ✅ Use Route 53 (DNS doesn't contain PHI) |
| **Secrets Manager** | Secrets | ✅ Use Secrets Manager for env vars |
| **SES** | Email | ✅ **USE AWS SES instead of SendGrid** (covered under AWS BAA) |

### ❌ DON'T: Mix AWS with Other Vendors for PHI

- ❌ Don't use Vercel for PHI workloads (use AWS ECS instead)
- ❌ Don't use Convex for PHI storage (use AWS RDS instead)
- ❌ Don't use SendGrid for PHI emails (use AWS SES instead)

### BAA Required: ✅ YES - AWS BAA (covers all AWS services)

**Action**: Get AWS BAA signed before production deployment.

---

## 2. Email (Consolidate to AWS SES)

### ✅ DO: Use AWS SES for All Emails

**Current State**: Zenthea uses SendGrid for:
- Appointment notifications (contains patient names - PHI)
- Invitation emails (contains clinic/tenant names)
- Support access requests (contains user emails/names)

**HIPAA-Compliant Design**:
- ✅ **Replace SendGrid with AWS SES** (covered under AWS BAA)
- ✅ Emails can contain PHI (patient names, appointment details)
- ✅ Use SES templates for consistent formatting
- ✅ Implement email audit logging

### ❌ DON'T: Use Third-Party Email Providers

- ❌ Don't use SendGrid (requires separate BAA)
- ❌ Don't use Resend (requires separate BAA)
- ❌ Don't use any email provider outside AWS BAA

### BAA Required: ✅ NO - Covered under AWS BAA (if using AWS SES)

**Action**: Migrate email sending from SendGrid to AWS SES.

---

## 3. Authentication (✅ DECIDED - Keep Clerk)

### ✅ DECISION: Use Clerk for Authentication

**Decision**: ✅ **Keep Clerk** - Required for StartKit compatibility

**HIPAA-Compliant Design**:
- ✅ **Use Clerk** (get Clerk BAA)
- ✅ Clerk stores: Email addresses, names, user IDs (may be PHI)
- ✅ Implement MFA for all users
- ✅ Use Clerk organizations for tenant management
- ✅ Store organization context in Postgres (synced via webhooks)

**Why Clerk?**: StartKit is deeply integrated with Clerk. Switching to Cognito would require 3-4 weeks of refactoring.

**See**: `docs/plans/zenthea-cognito-vs-clerk-impact.md` for full impact analysis.

### ❌ DON'T: Use Clerk Without BAA

- ❌ Don't use Clerk without BAA (user data may be PHI)
- ❌ Don't store PHI in Clerk metadata (store in Postgres instead)

### BAA Required: ✅ YES - Clerk BAA required

**Action Items**:
- [ ] Research Clerk HIPAA compliance options
- [ ] Contact Clerk about HIPAA-compliant plan with BAA
- [ ] Get Clerk BAA signed (required before production)
- [ ] Document BAA contract number and date

---

## 4. Calendar Integration (✅ DECIDED - HIPAA-Compliant Design)

### ✅ DECISION: Keep Google Calendar with PHI-Free Events

**Decision**: **Keep Google Calendar sync** with anonymized, PHI-free events only.

**HIPAA-Compliant Design**:
- ✅ **Event Title**: Generic only ("Appointment" - no patient names)
- ✅ **Location**: Clinic name only (business entity, not PHI)
- ✅ **Date/Time**: Appointment time (not PHI)
- ✅ **Description**: Empty or generic text only (no patient details)
- ❌ **DON'T**: Include patient names, IDs, appointment types, or any PHI
- ❌ **DON'T**: Include medical information or notes

**Implementation Requirements**:
- ✅ DO: Strip all PHI from calendar events before syncing
- ✅ DO: Use generic event titles ("Appointment")
- ✅ DO: Include only clinic location (not patient-specific)
- ✅ DO: Include date/time only
- ✅ DO: Audit log all calendar syncs (who synced, when)
- ❌ DON'T: Include patient names in event title or description
- ❌ DON'T: Include appointment types that reveal medical information
- ❌ DON'T: Include any patient identifiers

**Example HIPAA-Compliant Event**:
```
Title: "Appointment"
Location: "Downtown Clinic"
Date/Time: 2025-01-15 10:00 AM
Description: (empty or generic)
```

**Example NON-Compliant Event** (DO NOT DO):
```
Title: "Appointment with John Doe" ❌
Location: "Downtown Clinic"
Date/Time: 2025-01-15 10:00 AM
Description: "Follow-up consultation for patient #12345" ❌
```

### BAA Required: ✅ NO - Events are PHI-free

**Rationale**: Since calendar events contain NO PHI (only generic "Appointment", clinic location, date/time), Google Calendar does not handle PHI and no BAA is required.

**Action**: Implement PHI-free calendar sync formatting in `formatAppointmentForGoogleCalendar()`.

---

## 4.5 SMS / MFA / Patient Messaging (⚠️ DECISION NEEDED)

### ⚠️ Why this matters

Zenthea already has **SMS support** (notifications + MFA) and an admin setting for **SMS provider = Twilio/Vonage**. Treat SMS vendors as **PHI-touching** because they will receive/maintain/transmit identifiers (phone numbers) and message contents related to healthcare workflows.

### ✅ DECISION (for now): Disable SMS (no SMS MFA, no patient texting)

**Decision**: **Option A** — Disable all SMS features for HIPAA rollout.

- ✅ Use **TOTP/app-based MFA only**
- ✅ Remove/disable SMS reminders and SMS delivery options until we intentionally add a HIPAA-eligible messaging path
- ✅ This keeps the **BAA set minimal** (no Twilio/Vonage BAA; no AWS messaging service decision required yet)

### ✅ DO: Prefer “no extra vendors” (AWS-first)

- ✅ Prefer **AWS-managed messaging** (only if the specific service is on AWS’s HIPAA-eligible list under the AWS BAA).
- ✅ Keep SMS content **PHI-minimal** even with a BAA (no diagnoses, no patient names, no detailed appointment content).
- ✅ Use “notification + link” patterns (e.g., “You have a new message in Zenthea. Sign in to view.”).

### ❌ DON’T: Send PHI via non-BAA SMS providers

- ❌ Don’t use **Twilio/Vonage** for patient/staff SMS **unless** we have a signed BAA with that provider.
- ❌ Don’t put patient names, conditions, or detailed appointment info into SMS bodies.

### Recommended path (to minimize BAAs)

- **Preferred**: Use AWS-only messaging (HIPAA-eligible service) → **no additional BAA** beyond AWS.
- **If AWS messaging isn’t HIPAA-eligible for our use case**: we must either (a) **disable SMS features**, or (b) add a **4th BAA** (Twilio or Vonage).

---

## 5. AI Services (✅ ESSENTIAL - HIPAA-Compliant Design Required)

### ✅ DECISION: AI is Core to Zenthea - Must Be HIPAA-Compliant

**Current State**: Zenthea uses AI as a core selling point. AI features include:
- AI Assistant (chat interface)
- Voice AI (ElevenLabs widget)
- Content generation (LLM/RAG)
- Patient interaction features

**Strategy**: Use AI extensively while ensuring HIPAA compliance through:
1. **Vendor Selection**: Choose HIPAA-compliant AI vendors with BAAs
2. **Proper Usage**: Follow vendor HIPAA guidelines
3. **Data Handling**: Ensure PHI is handled correctly

---

### A. Voice AI (ElevenLabs)

**Purpose**: High-quality voice synthesis (best audio in market)

**HIPAA-Compliant Design**:
- ✅ **Research**: Investigate ElevenLabs HIPAA compliance options
  - Check if ElevenLabs offers HIPAA-compliant plan with BAA
  - Review ElevenLabs data handling policies
  - Verify data retention and training policies
- ✅ **DO**: Get ElevenLabs BAA if available
- ✅ **DO**: Ensure voice data is NOT used for training
- ✅ **DO**: Implement proper data retention policies
- ✅ **DO**: Use ElevenLabs only for voice synthesis (not content generation)
- ❌ **DON'T**: Use ElevenLabs without BAA if processing PHI
- ❌ **DON'T**: Allow ElevenLabs to use PHI for training

**✅ Decision**: Use ElevenLabs for PHI voice with **BAA + Zero Retention Mode** (Enterprise). Source: `https://elevenlabs.io/docs/agents-platform/legal/hipaa`

**Research Tasks**:
- [ ] Contact ElevenLabs support about HIPAA compliance
- [ ] Review ElevenLabs enterprise/HIPAA plans
- [ ] Verify BAA availability
- [ ] Document data handling policies
- [ ] Test HIPAA-compliant configuration

**Alternative if No BAA**: Consider AWS Polly (covered under AWS BAA) but quality may be lower.

---

### B. Content Generation (LLM/RAG)

**Purpose**: AI-powered content generation, patient interactions, clinical assistance

**HIPAA-Compliant Design**:
- ✅ **Research**: Find HIPAA-compliant LLM/RAG vendors
  - **OpenAI**: Check if OpenAI offers HIPAA-compliant plan with BAA
  - **Anthropic (Claude)**: Investigate HIPAA compliance options
  - **AWS Bedrock**: Consider AWS-managed LLMs (covered under AWS BAA)
  - **Azure OpenAI**: Check Microsoft Azure HIPAA compliance
  - **Other vendors**: Research specialized healthcare AI vendors
- ✅ **DO**: Get BAA from chosen LLM vendor
- ✅ **DO**: Ensure data is NOT used for training
- ✅ **DO**: Implement strict data retention policies
- ✅ **DO**: Use vendor's HIPAA-compliant endpoints/configurations
- ✅ **DO**: Separate voice (ElevenLabs) from content (LLM)
- ❌ **DON'T**: Use LLM services without BAAs if processing PHI
- ❌ **DON'T**: Allow LLM vendors to use PHI for training

**Research Tasks**:
- [ ] Research HIPAA-compliant LLM vendors:
  - [ ] OpenAI Enterprise/HIPAA plans
  - [ ] Anthropic (Claude) HIPAA options
  - [ ] AWS Bedrock (covered under AWS BAA)
  - [ ] Azure OpenAI (covered under Azure BAA)
  - [ ] Other healthcare-focused AI vendors
- [ ] Compare features, pricing, and BAA availability
- [ ] Test HIPAA-compliant configurations
- [ ] Document chosen vendor and BAA status

**Recommended Approach**:
1. ✅ **Primary (DECIDED)**: AWS Bedrock for PHI workloads (covered under AWS BAA) Source: `https://aws.amazon.com/bedrock/security-compliance/`
2. **Optional**: Other LLM vendors for non‑PHI workloads only (unless BAA + config constraints are satisfied)

---

### C. AI Architecture (Separate Voice from Content)

**HIPAA-Compliant Architecture**:
```
┌─────────────────────────────────────────┐
│         Zenthea Application             │
├─────────────────────────────────────────┤
│                                         │
│  Content Generation (LLM/RAG)          │
│  ├─ AWS Bedrock (covered under AWS BAA)│
│  ├─ OpenAI (if BAA available)          │
│  └─ Anthropic (if BAA available)      │
│                                         │
│  Voice Synthesis (ElevenLabs)           │
│  └─ ElevenLabs (if BAA available)     │
│                                         │
└─────────────────────────────────────────┘
```

**✅ Additional decision: OpenEvidence (NO PHI)**:
- Use OpenEvidence strictly for **general medical evidence lookup with NO PHI**.
- Keep all patient-specific reasoning (PHI) inside Zenthea.
- Enforce a server-side PHI guardrail before any OpenEvidence call.

**Note (important)**: OpenEvidence also markets a “HIPAA-secure Dialer” with optional call transcription into a clinical note (“Create Visit”). That feature is inherently **PHI-bearing** and would require treating OpenEvidence as a **PHI processor** for Zenthea (BAA + subprocessor due diligence) if we integrate or route patient calls/notes through it. Source: `https://www.openevidence.com/announcements/openevidence-hipaa-secure-dialer-now-available`

**Design Principles**:
- ✅ Separate voice synthesis from content generation
- ✅ Use different vendors for different purposes
- ✅ Ensure all vendors have BAAs if processing PHI
- ✅ Implement proper data flow (PHI → HIPAA-compliant vendors only)

---

### D. HIPAA-Compliant AI Usage Guidelines

**Data Handling**:
- ✅ DO: Process PHI only through HIPAA-compliant vendors with BAAs
- ✅ DO: Ensure vendors do NOT use PHI for training
- ✅ DO: Implement data retention policies per vendor requirements
- ✅ DO: Log all AI interactions for audit purposes
- ✅ DO: Encrypt PHI in transit to AI vendors
- ❌ DON'T: Send PHI to vendors without BAAs
- ❌ DON'T: Allow vendors to use PHI for model training
- ❌ DON'T: Store PHI in vendor systems longer than necessary

**Technical Implementation**:
- ✅ DO: Use vendor HIPAA-compliant endpoints/APIs
- ✅ DO: Configure vendors to disable training/data retention
- ✅ DO: Implement proper error handling (don't leak PHI in errors)
- ✅ DO: Monitor AI usage for compliance
- ✅ DO: Implement audit logging for all AI interactions

---

### BAA Required: ✅ YES - All AI vendors processing PHI must have BAAs

**Action Items**:
1. **Research Phase** (Immediate):
   - [ ] Contact ElevenLabs about HIPAA compliance/BAA
   - [ ] Research HIPAA-compliant LLM vendors (OpenAI, Anthropic, AWS Bedrock, Azure)
   - [ ] Compare features, pricing, and BAA availability
   - [ ] Document findings

2. **Vendor Selection** (Before Production):
   - [ ] Choose LLM vendor with BAA
   - [ ] Choose voice vendor (ElevenLabs if BAA available, or AWS Polly)
   - [ ] Get BAAs signed for chosen vendors
   - [ ] Document BAA contract numbers and dates

3. **Implementation** (During Migration):
   - [ ] Configure HIPAA-compliant AI endpoints
   - [ ] Implement proper data handling
   - [ ] Set up audit logging
   - [ ] Test HIPAA compliance

---

## 6. Observability (Configure Properly or Remove)

### ✅ DO: Use AWS CloudWatch Only

**HIPAA-Compliant Design**:
- ✅ **Use CloudWatch for all logging** (covered under AWS BAA)
- ✅ Implement PHI redaction in logs (remove patient names, IDs, etc.)
- ✅ Use CloudWatch Logs Insights for querying (with PHI filters)
- ✅ Set log retention policies (HIPAA may require 6+ years)
- ✅ Use CloudTrail for API audit logs

### ❌ DON'T: Use Third-Party Observability Tools

**PostHog (Analytics)**:
- ❌ Don't use PostHog in PHI environments (requires BAA or strict filtering)
- ✅ Alternative: Use CloudWatch Metrics + custom analytics in Postgres

**Sentry (Error Tracking)**:
- ❌ Don't use Sentry without PHI sanitization (requires BAA or strict sanitization)
- ✅ Alternative: Use CloudWatch Logs with error aggregation

**Recommendation**: **Remove PostHog and Sentry**, use CloudWatch only.

### BAA Required: ✅ NO - Covered under AWS BAA (if using CloudWatch only)

**Action**: Remove PostHog/Sentry, use CloudWatch for all observability.

---

## 6.5 Third‑Party Scripts / Embeds / CDNs (⚠️ CRITICAL GUARDRAIL)

### ✅ DO: Avoid hidden “extra vendors” on PHI pages

- ✅ Assume **any third‑party script/iframe/font/image** can receive identifiers (IP address, user agent, URL paths) and becomes a compliance/vendor issue.
- ✅ For **authenticated app pages** (patient portal, provider dashboard, admin): **no third‑party embeds/scripts** unless the vendor is **covered by a BAA** and explicitly approved in this plan.
- ✅ Self-host assets where possible (fonts, widget JS) to avoid accidental new vendors.

### ❌ DON’T: Load third-party resources on PHI-bearing pages

Examples currently present in the codebase that must be treated carefully:
- **ElevenLabs widget script via `unpkg.com`** → avoid loading from `unpkg` on PHI pages; prefer self-hosting the bundle or a server-mediated integration.
- **Google Fonts** (`fonts.googleapis.com` / `fonts.gstatic.com`) → self-host fonts for authenticated app surfaces.
- **ui-avatars** (name-in-URL) → never send names to third-party avatar generation.
- **BioDigital Human** viewer → do not use on PHI pages unless we have explicit HIPAA/BAA coverage (likely “NO”).
- **YouTube/Vimeo embeds** → only allowed on public marketing pages (no PHI), never on patient/provider authenticated surfaces.
- **Google Maps embeds** → only allowed on public marketing pages (no PHI); avoid on authenticated surfaces.

---

## 7. Billing (No BAA Needed)

### ✅ DO: Use Stripe for Billing

**HIPAA-Compliant Design**:
- ✅ Stripe stores: Payment info, subscription status (NO PHI)
- ✅ DO: Exclude patient names/IDs from Stripe metadata
- ✅ DO: Use Stripe Customer IDs only (no PHI)
- ✅ DO: Store billing relationships in Postgres (not Stripe)

### ❌ DON'T: Store PHI in Stripe

- ❌ Don't include patient names in Stripe customer metadata
- ❌ Don't include appointment details in Stripe metadata

### BAA Required: ✅ NO - Stripe doesn't handle PHI

**Action**: Ensure Stripe metadata excludes all PHI.

---

## 8. Image Storage (Marketing Only)

### ✅ DO: Use Cloudinary for Non-PHI Assets Only

**HIPAA-Compliant Design**:
- ✅ Cloudinary: Marketing images, public assets (NO PHI)
- ✅ S3: Medical images, patient files (PHI - covered under AWS BAA)
- ✅ DO: Keep Cloudinary for marketing/public assets only
- ✅ DO: Never upload PHI to Cloudinary

### ❌ DON'T: Upload PHI to Cloudinary

- ❌ Don't upload patient photos to Cloudinary
- ❌ Don't upload medical images to Cloudinary

### BAA Required: ✅ NO - Cloudinary doesn't handle PHI

**Action**: Ensure Cloudinary is only used for non-PHI assets.

---

## 9. Development Tools (No BAA Needed)

### ✅ DO: Use Standard Development Tools

**HIPAA-Compliant Design**:
- ✅ GitHub: Code repository (NO PHI in code)
- ✅ GitHub Actions: CI/CD (NO PHI in builds)
- ✅ DO: Store secrets in AWS Secrets Manager (not GitHub Secrets)
- ✅ DO: Use AWS CodePipeline/CodeBuild for PHI environment deployments

### ❌ DON'T: Store PHI in Development Tools

- ❌ Don't commit PHI to GitHub
- ❌ Don't store PHI in environment variables in GitHub Actions
- ❌ Don't use Vercel CI/CD for PHI environments

### BAA Required: ✅ NO - Development tools don't handle PHI

**Action**: Ensure no PHI touches development tools.

---

## Summary: Vendors Requiring BAAs

### ✅ REQUIRED BAAs (Must Have)

| Vendor | Service | Why | Priority |
|--------|---------|-----|----------|
| **AWS** | All infrastructure | Hosts/stores/processes PHI | 🔴 CRITICAL |

### ✅ REQUIRED BAAs (Must Have)

| Vendor | Service | Why | Status |
|--------|---------|-----|--------|
| **AWS** | All infrastructure | Hosts/stores/processes PHI | ⏳ Researching BAA |
| **Clerk** | Authentication | Stores user data (may be PHI) | ✅ **DECIDED** - Keep Clerk, get BAA |

### ⚠️ REQUIRED BAAs for AI (Core Feature)

| Vendor | Service | Why | Research Status |
|--------|---------|-----|----------------|
| **AWS Bedrock** | Content generation (RAG/LLM) | Processes PHI (core feature) | ✅ Covered under AWS BAA |
| **ElevenLabs** | Voice synthesis | Processes PHI (best audio quality) | ⏳ Requesting BAA / enabling Zero Retention |

### ✅ NO BAA NEEDED (Don't Handle PHI)

| Vendor | Service | Why |
|--------|---------|-----|
| **Google Calendar** | Calendar sync | Events are PHI-free (generic "Appointment" only) |
| **Stripe** | Billing | No PHI in billing data |
| **Cloudinary** | Marketing images | No PHI in marketing assets |
| **GitHub** | Code repository | No PHI in code |

---

## Recommended Vendor Architecture (Minimal BAAs)

### Core Stack (3 BAAs Required) ✅ Locked

1. **AWS** (BAA required)
   - RDS/Aurora Postgres (database)
   - S3 (file storage)
   - ECS/Fargate (compute)
   - CloudWatch (logging)
   - CloudTrail (audit)
   - CloudFront (CDN)
   - Route 53 (DNS)
   - Secrets Manager (secrets)
   - **SES (email)** ← Replace SendGrid
   - **Bedrock (LLM/RAG)** ← PHI AI (covered under AWS BAA)

2. **Clerk** (BAA required)
   - Authentication + organizations (StartKit compatibility)

3. **ElevenLabs** (BAA required)
   - Voice AI (PHI) + **Zero Retention Mode**

2. **Stripe** (No BAA needed)
   - Billing/subscriptions

3. **Cloudinary** (No BAA needed)
   - Marketing/public images only

### Removed/Replaced Vendors (To Minimize BAAs)

- ❌ **SendGrid** → Replace with AWS SES (covered under AWS BAA)
- ✅ **Clerk** → Keep Clerk (get BAA - required for StartKit compatibility)
- ❌ **Google Calendar** → Keep but sync PHI-free events only (no BAA needed)
- ✅ **AI Vendors** → **Locked**: AWS Bedrock (AWS BAA) + ElevenLabs (BAA + Zero Retention)
- ❌ **PostHog** → Remove, use CloudWatch (covered under AWS BAA)
- ❌ **Sentry** → Remove, use CloudWatch (covered under AWS BAA)

---

## Action Items

### Immediate (Before Migration)

- [ ] **Get AWS BAA signed** (covers all AWS services)
- [x] **Decide on Google Calendar**: ✅ Keep with PHI-free events (no BAA needed)
- [x] **Decide on AI services**: ✅ Use AI extensively - Research HIPAA-compliant vendors
- [x] **Decide on Clerk**: ✅ Keep Clerk (get BAA - required for StartKit compatibility)
- [x] **Research Clerk BAA (online)**:
  - **What we found (official)**: Clerk’s Standard Terms say you **must not send/store PHI** in Clerk “without agreeing to Company’s Subcontractor Business Associate Agreement (BAA)”. Source: `https://clerk.com/legal/standard-terms`
  - **Next action**: request Clerk’s BAA / HIPAA terms + confirm: (1) which products/tiers are covered, (2) data retention, (3) “training” / secondary use defaults, (4) subprocessors list, (5) breach notification + audit support.
- [x] **Research AI vendors (online)**:
  - **ElevenLabs (voice)**: ElevenLabs Agents is “HIPAA-eligible”, BAAs available for **Enterprise** customers, and PHI handling requires **BAA + Zero Retention Mode**; they state PHI is not stored/logged (transcripts, audio, tool calls, analytics, logs) under Zero Retention, and LLMs are allowlisted unless using Custom LLM with your own BAA. Source: `https://elevenlabs.io/docs/agents-platform/legal/hipaa`
  - **OpenAI (LLM)**: OpenAI states you need a **BAA before using the API platform with PHI**; request via `baa@openai.com`, reviewed case-by-case; most API services covered with listed exceptions; ChatGPT BAAs limited to sales-managed Enterprise/Edu. Source: `https://help.openai.com/en/articles/8660679-how-can-i-get-a-business-associate-agreement-baa-with-openai`
  - **Anthropic (LLM)**: Anthropic states it **may provide a BAA** after review for “HIPAA eligible services” (e.g. first‑party API) and typically requires a **zero data retention agreement**; BAA excludes various products/features (examples mentioned include web search, batch processing, prompt caching, Files API uploads). Source: `https://privacy.claude.com/en/articles/8114513-business-associate-agreements-baa-for-commercial-customers`
  - **AWS Bedrock (LLM)**: AWS states Bedrock is **HIPAA eligible** and that data used to tune a model is not shared with model providers and not used to improve base models; encryption in transit/at rest and KMS supported. Source: `https://aws.amazon.com/bedrock/security-compliance/`
  - **HHS OCR baseline rule**: If a vendor creates/receives/maintains/transmits ePHI for you, they are a **Business Associate** and you need a **HIPAA-compliant BAA**—even if they only store encrypted ePHI without your encryption key. Source: `https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html`
  - **Azure (reference option)**: Microsoft states it will enter into BAAs for in-scope Azure services and the HIPAA BAA is offered as part of Product Terms; customers must still build their own compliance program. Source: `https://learn.microsoft.com/en-us/azure/compliance/offerings/offering-hipaa-us`
  - **OpenEvidence (clinical evidence assistant)**:
    - Publishes a BAA. Source: `https://www.openevidence.com/policies/baa`
    - States it is HIPAA compliant and that covered entities can input PHI, handled under their BAA. Source: `https://www.openevidence.com/announcements/openevidence-is-now-hipaa-compliant`
    - Notes its services are primarily hosted on **Google Cloud Platform and Vercel** (important for vendor/subprocessor due diligence). Source: `https://www.openevidence.com/security`
    - Privacy policy states: “We DO NOT train AI models on protected health information.” Source: `https://www.openevidence.com/policies/privacy`

### Implementation (During Migration)

- [ ] **Replace SendGrid with AWS SES** (email)
- [ ] **Research Clerk BAA** (auth - keep Clerk, get BAA)
- [ ] **Get Clerk BAA signed** (required before production)
- [ ] **Implement PHI-free Google Calendar sync** (generic "Appointment" events only)
- [ ] **Research and select HIPAA-compliant AI vendors** (LLM + Voice)
- [ ] **Get BAAs signed for AI vendors** (ElevenLabs, LLM vendor)
- [ ] **Implement HIPAA-compliant AI architecture** (separate voice from content)
- [ ] **Remove PostHog/Sentry** (observability)

### Configuration (Before Production)

- [ ] **Configure CloudWatch PHI redaction** (logging)
- [ ] **Configure S3 KMS encryption** (SSE-KMS)
- [ ] **Configure CloudFront NO caching** (for PHI routes)
- [ ] **Ensure Stripe excludes PHI** (billing metadata)

---

## Next Steps

1. **Review this strategy** with team
2. **Make decisions** on optional vendors (Calendar, AI, Clerk)
3. **Contact AWS** to request BAA
4. **Update migration plan** with vendor decisions
5. **Implement vendor replacements** during migration

---

## Questions?

- **Default**: If vendor can see PHI → Need BAA OR exclude PHI
- **Minimize vendors**: Use AWS for everything possible (single BAA)
- **When in doubt**: Remove vendor or get BAA
