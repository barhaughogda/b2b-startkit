# Zenthea: Vendors Requiring BAAs

**Purpose**: Clear list of vendors that MUST have BAAs signed before production  
**Status**: Final  
**Last Updated**: 2025-12-29

---

## 🔴 CRITICAL: Required BAAs (Must Have Before Production)

### 1. AWS (Single BAA Covers All AWS Services)

**Status**: ⏳ **NOT SIGNED** - Must get before production

**Services Covered**:
- RDS/Aurora Postgres (database - stores PHI)
- S3 (file storage - stores PHI)
- ECS/Fargate (compute - processes PHI)
- CloudWatch (logging - may contain PHI)
- CloudTrail (audit logs - may contain PHI)
- CloudFront (CDN - may cache PHI)
- Route 53 (DNS - no PHI, but covered)
- Secrets Manager (secrets - may contain PHI)
- SES (email - will contain PHI)
- **Bedrock** (LLM/RAG - processes PHI)

**Why BAA Required**: AWS hosts, stores, and processes PHI for Zenthea.

**Action Items**:
- [ ] Contact AWS support to request BAA
- [ ] Review AWS HIPAA-eligible services list
- [ ] Sign AWS BAA before production deployment
- [ ] Document BAA contract number and date

**Contact**: AWS Support → HIPAA Compliance → Request BAA

**Timeline**: Must be signed before Phase D (Compute Migration)

---

## ✅ NO BAA NEEDED: Google Calendar (PHI-Free Events)

### 2. Google (Google Calendar Sync)

**Status**: ✅ **DECIDED** - Keep Google Calendar with PHI-free events (no BAA needed)

**Service**: Google Calendar API (syncs anonymized appointments only)

**Why No BAA Required**: Calendar events are PHI-free:
- Generic event title: "Appointment" (no patient names)
- Location: Clinic name only (business entity, not PHI)
- Date/Time: Appointment time (not PHI)
- Description: Empty or generic (no patient details)

**HIPAA-Compliant Implementation**:
- ✅ DO: Strip all PHI from calendar events before syncing
- ✅ DO: Use generic event titles ("Appointment" only)
- ✅ DO: Include only clinic location (not patient-specific)
- ✅ DO: Include date/time only
- ✅ DO: Audit log all calendar syncs
- ❌ DON'T: Include patient names, IDs, or any PHI

**Action Items**:
- [ ] Implement PHI-free calendar event formatting
- [ ] Update `formatAppointmentForGoogleCalendar()` to exclude PHI
- [ ] Add audit logging for calendar syncs
- [ ] Test that events contain no PHI

**Contact**: N/A - No BAA needed for PHI-free events

---

### 3. Clerk (Authentication)

**Status**: ✅ **DECIDED** - Keep Clerk, get BAA

**Service**: Clerk authentication (stores user emails, names, IDs)

**Why BAA Required**: User data (emails, names) may be considered PHI.

**Decision**: ✅ **Use Clerk** - Required for StartKit compatibility

**Rationale**: StartKit is **deeply integrated with Clerk**. Switching to AWS Cognito would require:
- 🔴 **Major refactoring** of `@startkit/auth` package (3-4 weeks)
- 🔴 **Superadmin app rewrite** (uses Clerk extensively)
- 🔴 **Custom impersonation** (Cognito doesn't have built-in impersonation)
- 🔴 **Organization management rewrite** (different API)
- 🔴 **Webhook system rewrite** (Cognito Lambda triggers instead)

**See**: `docs/plans/zenthea-cognito-vs-clerk-impact.md` for full analysis.

**Action Items**:
- [ ] Research Clerk HIPAA compliance options
- [ ] Contact Clerk about HIPAA-compliant plan with BAA
- [ ] Get Clerk BAA signed (required before production)
- [ ] Document BAA contract number and date

**Contact**: Clerk Support → Enterprise/HIPAA Plans → Request BAA

---

### 4. AI Vendors (✅ ESSENTIAL - Core Feature)

**Status**: ✅ **DECIDED** - Use AWS Bedrock (PHI) + ElevenLabs (PHI) + OpenEvidence (NO PHI)

**Services**: 
- ✅ **AWS Bedrock** (LLM/RAG, PHI) - covered under AWS BAA (no separate LLM BAA)
- ✅ **ElevenLabs** (voice synthesis, PHI) - requires ElevenLabs BAA + Zero Retention Mode
- ✅ **OpenEvidence** (clinical evidence) - **NO PHI** (no BAA needed if we enforce no‑PHI guardrails)

**Why BAAs Required**: AI is a core selling point and processes PHI (patient data, interactions, clinical assistance).

**Key constraints (official)**:
- **ElevenLabs PHI**: requires **BAA + Zero Retention Mode** (Enterprise tier). Source: `https://elevenlabs.io/docs/agents-platform/legal/hipaa`
- **AWS Bedrock**: AWS states Bedrock is **HIPAA eligible**. Source: `https://aws.amazon.com/bedrock/security-compliance/`

**Recommended Approach (locked)**:
1. **Content (PHI)**: AWS Bedrock
2. **Voice (PHI)**: ElevenLabs + BAA + Zero Retention Mode
3. **Evidence (NO PHI)**: OpenEvidence with strict no‑PHI guardrails

**Action Items**:
- [ ] **Request ElevenLabs BAA** (Enterprise) and enable/verify **Zero Retention Mode**
- [ ] **Document** AWS HIPAA eligible services usage (Bedrock included) under AWS BAA
- [ ] **Implement no‑PHI guardrails** for OpenEvidence (block PHI at server boundary + audit all outbound prompts)

**Explicit non-goal (for now)**:
- We are **not** using OpenEvidence for PHI-bearing calling/transcription features (e.g., their “HIPAA-secure Dialer” / “Create Visit” clinical-note transcription). If we decide to adopt that capability inside Zenthea, OpenEvidence becomes a **PHI processor** and would move from “NO PHI / no BAA” to **BAA required** (plus subprocessor due diligence). Source: `https://www.openevidence.com/announcements/openevidence-hipaa-secure-dialer-now-available`

**Contact**: 
- ElevenLabs Support → Enterprise/HIPAA Plans → Request BAA
- AWS Bedrock → Covered under AWS BAA (no separate BAA needed)

**If Using ElevenLabs with PHI**:
- [ ] Check if ElevenLabs offers HIPAA-compliant plan with BAA
- [ ] Get ElevenLabs BAA signed (if available)
- [ ] Ensure data is NOT used for training
- [ ] Document BAA contract number and date

**Contact**: ElevenLabs Support → Enterprise/HIPAA Plans → Request BAA

---

## ⚠️ CONDITIONAL: SMS / Telephony Providers (May Add a 4th BAA)

Zenthea already includes SMS/MFA configuration and references **Twilio/Vonage** as provider options.

### 5. Twilio / Vonage (SMS provider)

**Status**: ✅ **DECIDED (for now)** — **Disable SMS** (no SMS MFA, no patient texting)

**When a BAA is required**:
- If Zenthea sends **patient-facing SMS** (reminders, messages, codes) or **staff SMS MFA**, assume the SMS vendor is a **Business Associate** (phone numbers + healthcare context).

**BAA Required**:
- ✅ **YES** if using Twilio/Vonage for any PHI-adjacent SMS workflows (recommended assumption).

**How to avoid an extra BAA (preferred)**:
- Disable SMS entirely and use **TOTP/app-based MFA** (current decision), or use **AWS-only messaging** *only if* the chosen AWS messaging service is **HIPAA-eligible** under the AWS BAA.

**Action Items**:
- [x] Decide whether SMS is required for MVP (patient + staff): **NO (for now)**
- [ ] Revisit later if SMS becomes required (choose AWS HIPAA-eligible vs Twilio/Vonage + BAA)

---

## ✅ NO BAA NEEDED (Don't Handle PHI)

These vendors don't require BAAs because they don't handle PHI:

| Vendor | Service | Why No BAA Needed |
|--------|---------|-------------------|
| **Stripe** | Billing | No PHI in billing data (only payment info) |
| **Cloudinary** | Marketing images | No PHI (only public/marketing assets) |
| **GitHub** | Code repository | No PHI in code |
| **GitHub Actions** | CI/CD | No PHI in builds |

---

## Summary: BAA Requirements

### 🔴 Must Have (2-3 BAAs)

1. **AWS** - Required for all infrastructure
2. **Clerk** - Required for authentication (StartKit compatibility) ✅ **DECIDED**
3. **ElevenLabs** - Required for voice synthesis with PHI ✅ **DECIDED**
   - Requires ElevenLabs BAA + Zero Retention Mode

**Note**: **AWS Bedrock does not add a separate BAA** (covered under AWS BAA). OpenEvidence does not add a BAA if we enforce NO PHI.

### ✅ No BAA Needed (5 vendors)

- Google Calendar (PHI-free events)
- Stripe
- Cloudinary
- GitHub
- GitHub Actions

---

## Recommended Strategy: Minimize BAAs While Maintaining StartKit Compatibility

**Target**: **3 BAAs** (AWS + Clerk + ElevenLabs) ✅ **DECIDED**

**How to Achieve**:
1. ✅ Use AWS for infrastructure (covered under AWS BAA)
2. ✅ Use AWS Bedrock for LLM (covered under AWS BAA)
3. ✅ Use ElevenLabs for voice (requires BAA + Zero Retention Mode)
4. ✅ Keep Google Calendar with PHI-free events (no Google BAA needed)
5. ✅ **Use Clerk for authentication** (get Clerk BAA) - ✅ **DECIDED** - Required for StartKit compatibility

**Why Clerk?**: StartKit is deeply integrated with Clerk. Switching to Cognito would require 3-4 weeks of refactoring.

**Result (locked)**:
- **3 BAAs**: AWS + Clerk + ElevenLabs

---

## Action Plan

### Phase 1: Decisions (Now)

- [x] **Decide on Google Calendar**: ✅ Keep with PHI-free events (no BAA needed)
- [x] **Decide on AI services**: ✅ Use AI extensively - Research HIPAA-compliant vendors
- [x] **Decide on Clerk**: ✅ Keep Clerk (get BAA - required for StartKit compatibility)
- [ ] **Research Clerk BAA**: Contact Clerk about HIPAA compliance
- [ ] **Research AI vendors**: ElevenLabs, OpenAI, Anthropic, AWS Bedrock, Azure OpenAI

### Phase 2: BAA Requests (Before Production)

- [ ] **Request AWS BAA** (required - covers AWS Bedrock, AWS Polly, infrastructure)
- [ ] **Request Clerk BAA** (required - authentication, StartKit compatibility)
- [ ] **Request ElevenLabs BAA** (required for voice - if using ElevenLabs)

### Phase 3: Implementation (During Migration)

- [ ] Replace SendGrid with AWS SES
- [ ] Keep Clerk (no changes needed - already integrated with StartKit)
- [ ] Implement PHI-free Google Calendar sync (generic "Appointment" events)
- [ ] Implement HIPAA-compliant AI architecture (separate voice from content)
- [ ] Configure chosen AI vendors with HIPAA-compliant settings
- [ ] Set up audit logging for AI interactions

---

## Next Steps

1. **Review vendor decisions** in `docs/plans/zenthea-baa-questionnaire.md`
2. **Make final decisions** on optional vendors
3. **Contact AWS** to request BAA (start immediately)
4. **Update this document** as BAAs are signed
5. **Document BAA contract numbers** and dates

---

## Questions?

- **AWS BAA**: Required - start process immediately
- **Other BAAs**: Only needed if keeping those vendors
- **Recommendation (locked)**: **3 BAAs** (AWS + Clerk + ElevenLabs)
