# Zenthea AI Vendor Research Guide

**Purpose**: Research HIPAA-compliant AI vendors for Zenthea's core AI features  
**Status**: Research Phase  
**Priority**: High (AI is core selling point)

---

## Research Objectives

1. **Voice AI**: Find HIPAA-compliant voice synthesis vendor (ElevenLabs preferred for quality)
2. **Content Generation**: Find HIPAA-compliant LLM/RAG vendor for patient interactions
3. **Compare Options**: Features, pricing, BAA availability, HIPAA compliance
4. **Make Decision**: Choose vendors and get BAAs signed

---

## Voice AI Vendors

### 1. ElevenLabs (Preferred - Best Audio Quality)

**Status**: ⏳ Researching HIPAA compliance

**Why Consider**: Best audio quality in the market (user requirement)

**Official HIPAA/BAA info (source-backed)**:
- ElevenLabs states **Agents** is “HIPAA-eligible” and BAAs are available for **Enterprise tier** customers.
- PHI handling requires **(1) an executed BAA** and **(2) Zero Retention Mode enabled**.
- They state Zero Retention Mode is designed so PHI is **not stored/logged** (transcripts, audio recordings, tool calls/results, analytics, system logs).
- They also enforce **LLM provider restrictions** (allowlist) unless you bring your own model via Custom LLM and sign a BAA directly with that LLM provider.

Source: `https://elevenlabs.io/docs/agents-platform/legal/hipaa`

**Research Tasks**:
- [ ] Contact ElevenLabs support about HIPAA compliance
- [ ] Check if ElevenLabs offers enterprise/HIPAA plan
- [ ] Verify BAA availability
- [ ] Review data handling policies:
  - [ ] Data retention policy
  - [ ] Training data usage (must NOT use PHI for training)
  - [ ] Data encryption (in transit and at rest)
  - [ ] Data residency (where is data stored?)
- [ ] Review pricing for HIPAA-compliant plan
- [ ] Test API/features for HIPAA-compliant usage

**Contact Information**:
- Website: https://elevenlabs.io
- Support: [Find contact form/email]
- Enterprise Sales: [Find enterprise contact]

**Questions to Ask**:
1. Do you offer HIPAA-compliant plans with Business Associate Agreements (BAAs)?
2. What are your data handling policies for HIPAA compliance?
3. Is PHI used for model training? (Must be NO)
4. What is your data retention policy?
5. Where is data stored? (Data residency requirements)
6. What encryption is used for data in transit and at rest?
7. What are the pricing options for HIPAA-compliant plans?

**Decision Criteria**:
- ✅ BAA available → Use ElevenLabs
- ❌ No BAA → Use AWS Polly (covered under AWS BAA)

---

### 2. AWS Polly (Alternative - Covered Under AWS BAA)

**Status**: ✅ Available (covered under AWS BAA)

**Why Consider**: No separate BAA needed (covered under AWS BAA)

**Pros**:
- ✅ Covered under AWS BAA (no separate BAA)
- ✅ HIPAA-compliant
- ✅ Integrated with AWS infrastructure
- ✅ Good quality (but may be lower than ElevenLabs)

**Cons**:
- ⚠️ May have lower audio quality than ElevenLabs

**Research Tasks**:
- [ ] Test AWS Polly voice quality
- [ ] Compare with ElevenLabs quality
- [ ] Review AWS Polly HIPAA compliance documentation
- [ ] Check pricing

**Documentation**:
- AWS Polly HIPAA: https://aws.amazon.com/compliance/hipaa-compliance/
- AWS Polly Docs: https://docs.aws.amazon.com/polly/

**Decision Criteria**:
- Use if ElevenLabs BAA not available
- Use if quality difference is acceptable

---

## Content Generation (LLM/RAG) Vendors

### 1. AWS Bedrock (Recommended - Covered Under AWS BAA)

**Status**: ✅ Available (covered under AWS BAA)

**Why Consider**: No separate BAA needed, integrated with AWS

**Official HIPAA/BAA info (source-backed)**:
- AWS states Bedrock is **HIPAA eligible**.
- AWS states that when you tune a model, it uses a **private copy**; your data is **not shared with model providers** and **not used to improve the base models**.

Source: `https://aws.amazon.com/bedrock/security-compliance/`

**Features**:
- Multiple model options (Claude, Llama, Titan, etc.)
- RAG capabilities
- HIPAA-compliant (covered under AWS BAA)
- Integrated with AWS infrastructure

**Pros**:
- ✅ Covered under AWS BAA (no separate BAA)
- ✅ HIPAA-compliant
- ✅ Multiple model options
- ✅ Integrated with AWS (S3, RDS, etc.)
- ✅ Good for RAG implementations

**Cons**:
- ⚠️ May have fewer model options than OpenAI/Anthropic
- ⚠️ May have different pricing structure

**Research Tasks**:
- [ ] Review AWS Bedrock model options
- [ ] Test Claude, Llama, Titan models
- [ ] Review RAG capabilities
- [ ] Check pricing
- [ ] Review HIPAA compliance documentation

**Documentation**:
- AWS Bedrock: https://aws.amazon.com/bedrock/
- AWS Bedrock HIPAA: https://aws.amazon.com/compliance/hipaa-compliance/

**Decision Criteria**:
- ✅ Recommended as primary option (no separate BAA)
- Use if features meet requirements

---

### 2. OpenAI (Alternative - Requires BAA)

**Status**: ⏳ Researching HIPAA compliance

**Why Consider**: Industry-leading models (GPT-4, GPT-4 Turbo)

**Official BAA info (source-backed)**:
- OpenAI states: to use their **API platform with PHI**, you need a **BAA with OpenAI** first.
- BAA requests are handled case-by-case; OpenAI provides a BAA request email: `baa@openai.com`.

Source: `https://help.openai.com/en/articles/8660679-how-can-i-get-a-business-associate-agreement-baa-with-openai`

**Research Tasks**:
- [ ] Contact OpenAI about HIPAA compliance
- [ ] Check if OpenAI offers enterprise/HIPAA plan
- [ ] Verify BAA availability
- [ ] Review data handling policies:
  - [ ] Data retention policy
  - [ ] Training data usage (must NOT use PHI for training)
  - [ ] Data encryption
  - [ ] Data residency
- [ ] Review pricing for HIPAA-compliant plan
- [ ] Test API/features

**Contact Information**:
- Website: https://openai.com
- Enterprise Sales: https://openai.com/enterprise
- Support: [Find contact]

**Questions to Ask**:
1. Do you offer HIPAA-compliant plans with Business Associate Agreements (BAAs)?
2. What are your data handling policies for HIPAA compliance?
3. Is PHI used for model training? (Must be NO)
4. What is your data retention policy?
5. Where is data stored?
6. What encryption is used?
7. What are the pricing options for HIPAA-compliant plans?

**Decision Criteria**:
- ✅ BAA available + better features than AWS Bedrock → Consider
- ❌ No BAA → Use AWS Bedrock instead

---

### 3. Anthropic (Claude) (Alternative - Requires BAA)

**Status**: ⏳ Researching HIPAA compliance

**Why Consider**: High-quality models (Claude 3, Claude 3.5)

**Official BAA info (source-backed)**:
- Anthropic states it **may provide a BAA** after review for “HIPAA eligible services” (e.g. first-party API).
- BAA availability is tied to qualifying for certain HIPAA eligible services (e.g. **zero data retention agreements**).
- Anthropic also states BAAs do **not** cover a variety of products/features (examples listed include web search, batch processing, prompt caching, Files API uploads).

Source: `https://privacy.claude.com/en/articles/8114513-business-associate-agreements-baa-for-commercial-customers`

**Research Tasks**:
- [ ] Contact Anthropic about HIPAA compliance
- [ ] Check if Anthropic offers enterprise/HIPAA plan
- [ ] Verify BAA availability
- [ ] Review data handling policies
- [ ] Review pricing
- [ ] Test API/features

**Contact Information**:
- Website: https://www.anthropic.com
- Enterprise Sales: https://www.anthropic.com/enterprise
- Support: [Find contact]

**Questions to Ask**:
1. Do you offer HIPAA-compliant plans with Business Associate Agreements (BAAs)?
2. What are your data handling policies for HIPAA compliance?
3. Is PHI used for model training? (Must be NO)
4. What is your data retention policy?
5. Where is data stored?
6. What encryption is used?
7. What are the pricing options for HIPAA-compliant plans?

**Decision Criteria**:
- ✅ BAA available + better features than AWS Bedrock → Consider
- ❌ No BAA → Use AWS Bedrock instead

---

### 4. Azure OpenAI (Alternative - Requires Azure BAA)

**Status**: ⏳ Researching HIPAA compliance

**Why Consider**: OpenAI models via Microsoft Azure (may have Azure BAA)

**Official BAA/compliance info (source-backed)**:
- Microsoft states it will enter into BAAs for in-scope Azure services and provides HIPAA BAA coverage via Product Terms.

Source: `https://learn.microsoft.com/en-us/azure/compliance/offerings/offering-hipaa-us`

**Research Tasks**:
- [ ] Check if Azure OpenAI is covered under Azure BAA
- [ ] Review Azure HIPAA compliance
- [ ] Review pricing
- [ ] Test API/features

**Documentation**:
- Azure OpenAI: https://azure.microsoft.com/en-us/products/ai-services/openai-service
- Azure HIPAA: https://azure.microsoft.com/en-us/resources/microsoft-azure-compliance-offerings/

**Decision Criteria**:
- ✅ Covered under Azure BAA → Consider if using Azure infrastructure
- ❌ Not covered → Use AWS Bedrock instead

---

## Clinical Evidence Assistant Vendors (Optional, potentially high-value)

### OpenEvidence (Evidence-grounded clinical Q&A)

**Status**: ✅ Has a published BAA + HIPAA claims (requires due diligence)

**Why Consider**: Evidence-grounded answers/citations could be a strong in-product “Clinical Evidence” experience inside Zenthea.

**Official HIPAA/BAA info (source-backed)**:
- OpenEvidence publishes a “Network Business Associate Agreement” incorporated into their Terms. Source: `https://www.openevidence.com/policies/baa`
- OpenEvidence states it is HIPAA compliant and that covered entities can input PHI, handled under their BAA. Source: `https://www.openevidence.com/announcements/openevidence-is-now-hipaa-compliant`
- OpenEvidence’s Security & Compliance page states their services are primarily hosted on **Google Cloud Platform and Vercel**. Source: `https://www.openevidence.com/security`
- OpenEvidence’s Privacy Policy states: “We DO NOT train AI models on protected health information.” Source: `https://www.openevidence.com/policies/privacy`

**Key HIPAA implications for Zenthea**:
- If Zenthea sends PHI to OpenEvidence, OpenEvidence is a **Business Associate** → Zenthea must execute and keep on file a BAA with OpenEvidence.
- Because OpenEvidence states it uses **GCP + Vercel**, we should confirm OpenEvidence’s **subprocessor chain** and contractual coverage for PHI processing (BAA + downstream assurances).

**Due diligence checklist (before sending PHI)**:
- [ ] Confirm **product surface** you will integrate (API vs embedded UX) and that it’s covered under their BAA.
- [ ] Confirm **subprocessors** and whether PHI can flow beyond OpenEvidence (and on what contractual terms).
- [ ] Confirm **data retention** for prompts, outputs, and any uploaded files; confirm deletion timelines.
- [ ] Confirm **training / secondary use defaults** (their privacy policy says no PHI training—verify scope).
- [ ] Confirm **audit artifacts** (SOC2, pen test) and how to obtain them.

**Integration best-practice (Zenthea)**:
- Prefer a **“no‑PHI mode”** where possible (de-identified prompts) for general evidence lookups.
- If PHI is necessary: enforce strict **minimum-necessary** inputs + audit logging.

---

## Comparison Matrix

| Vendor | Service | BAA Status | Quality | Pricing | Recommendation |
|--------|---------|------------|---------|---------|----------------|
| **AWS Bedrock** | LLM/RAG | ✅ Covered under AWS BAA | High | Variable | ✅ Recommended |
| **AWS Polly** | Voice | ✅ Covered under AWS BAA | Good | Variable | ✅ Alternative |
| **ElevenLabs** | Voice | ⏳ Researching | ⭐ Best | TBD | ⭐ Preferred (if BAA) |
| **OpenAI** | LLM | ⏳ Researching | ⭐ Best | TBD | Consider (if BAA) |
| **Anthropic** | LLM | ⏳ Researching | High | TBD | Consider (if BAA) |
| **Azure OpenAI** | LLM | ⏳ Researching | High | TBD | Consider (if Azure BAA) |

---

## Recommended Architecture

### Option 1: Minimal BAAs (1 BAA - AWS Only)

```
┌─────────────────────────────────────────┐
│         Zenthea Application             │
├─────────────────────────────────────────┤
│                                         │
│  Content Generation                     │
│  └─ AWS Bedrock (covered under AWS BAA)│
│                                         │
│  Voice Synthesis                        │
│  └─ AWS Polly (covered under AWS BAA)  │
│                                         │
└─────────────────────────────────────────┘
```

**BAAs Required**: 1 (AWS only)  
**Pros**: Simplest, minimal BAAs  
**Cons**: May have lower voice quality than ElevenLabs

---

### Option 2: Best Quality (2 BAAs - AWS + ElevenLabs)

```
┌─────────────────────────────────────────┐
│         Zenthea Application             │
├─────────────────────────────────────────┤
│                                         │
│  Content Generation                     │
│  └─ AWS Bedrock (covered under AWS BAA)│
│                                         │
│  Voice Synthesis                        │
│  └─ ElevenLabs (separate BAA required) │
│                                         │
└─────────────────────────────────────────┘
```

**BAAs Required**: 2 (AWS + ElevenLabs)  
**Pros**: Best voice quality  
**Cons**: Additional BAA required

---

### Option 3: Premium AI (3 BAAs - AWS + ElevenLabs + LLM)

```
┌─────────────────────────────────────────┐
│         Zenthea Application             │
├─────────────────────────────────────────┤
│                                         │
│  Content Generation                     │
│  └─ OpenAI/Anthropic (separate BAA)    │
│                                         │
│  Voice Synthesis                        │
│  └─ ElevenLabs (separate BAA required) │
│                                         │
└─────────────────────────────────────────┘
```

**BAAs Required**: 3 (AWS + ElevenLabs + LLM vendor)  
**Pros**: Best AI quality  
**Cons**: Most BAAs required

---

## Zenthea Decision (✅ LOCKED)

- **PHI LLM**: AWS Bedrock (covered under AWS BAA)
- **PHI Voice**: ElevenLabs (Enterprise) with **BAA + Zero Retention Mode**
- **Evidence assistant**: OpenEvidence in **NO‑PHI mode only**

## Research Timeline

### Week 1: Initial Research
- [ ] Contact ElevenLabs about HIPAA compliance
- [ ] Contact OpenAI about HIPAA compliance
- [ ] Contact Anthropic about HIPAA compliance
- [ ] Review AWS Bedrock documentation
- [ ] Review AWS Polly documentation

### Week 2: Comparison & Testing
- [ ] Compare vendor responses
- [ ] Test AWS Bedrock models
- [ ] Test AWS Polly voice quality
- [ ] Compare pricing

### Week 3: Decision & BAA Requests
- [ ] Make vendor decisions
- [ ] Request BAAs from chosen vendors
- [ ] Document BAA status

---

## Next Steps

1. **Start Research** (This Week):
   - Contact ElevenLabs about HIPAA compliance
   - Contact OpenAI/Anthropic about HIPAA compliance
   - Review AWS Bedrock/AWS Polly options

2. **Compare Options** (Next Week):
   - Compare features, pricing, BAA availability
   - Test quality differences

3. **Make Decision** (Week 3):
   - Choose vendors
   - Request BAAs
   - Document decisions

---

## Questions?

- **Default**: Use AWS Bedrock + AWS Polly (1 BAA - AWS only)
- **Best Quality**: Use AWS Bedrock + ElevenLabs (2 BAAs)
- **Premium**: Use OpenAI/Anthropic + ElevenLabs (3 BAAs)
