/**
 * Legal Page Default Content
 * 
 * Default templates for Terms of Service and Privacy Policy pages.
 * These are healthcare-specific and HIPAA-compliant templates that
 * clinics can customize for their needs.
 */

import type { BlockInstance } from './types';

// =============================================================================
// TERMS OF SERVICE DEFAULT CONTENT
// =============================================================================

export const DEFAULT_TERMS_OF_SERVICE_CONTENT = `<p><strong>IMPORTANT: This document is a template and should be reviewed by qualified legal counsel before use. Healthcare regulations vary by state and jurisdiction. This template is provided for informational purposes only and does not constitute legal advice.</strong></p>

<h2>1. Introduction and Acceptance</h2>
<p>Welcome to our healthcare practice. By accessing our website, scheduling appointments, using our patient portal, or receiving services from our clinic, you agree to be bound by these Terms of Service ("Terms"). Please read them carefully before using our services. If you do not agree to these Terms, please do not use our services.</p>
<p>These Terms constitute a legally binding agreement between you and our medical practice. By using our services, you represent that you are at least 18 years of age, or if you are a minor, that you have obtained parental or guardian consent to use our services.</p>

<h2>2. Healthcare Services</h2>
<h3>2.1 Nature of Services</h3>
<p>Our services are intended to provide medical care, healthcare information, and facilitate appointment scheduling. The information provided on this website is for general informational purposes only and should not be considered as a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.</p>

<h3>2.2 Provider-Patient Relationship</h3>
<p>Use of this website alone does not establish a provider-patient relationship. A provider-patient relationship is only established when you have been formally accepted as a patient, completed our registration process, and have received care from one of our healthcare providers. We reserve the right to decline to accept any individual as a patient.</p>

<h3>2.3 Scope of Practice</h3>
<p>Our providers practice within their scope of licensure and in accordance with applicable state and federal laws. We may refer you to specialists or other healthcare facilities when your medical needs require expertise outside our scope of practice.</p>

<h3>2.4 Informed Consent</h3>
<p>Before receiving treatment, you will be asked to provide informed consent. This includes understanding the nature of the proposed treatment, potential risks and benefits, available alternatives, and the consequences of refusing treatment. You have the right to ask questions and receive answers before providing consent.</p>

<h2>3. Emergency Services Disclaimer</h2>
<h3>3.1 Not an Emergency Service</h3>
<p>Our clinic provides non-emergency medical services. <strong>If you are experiencing a medical emergency, please call 911 or go to your nearest emergency room immediately.</strong> Do not use our website, patient portal, or messaging systems for emergency situations.</p>

<h3>3.2 Definition of Emergency</h3>
<p>A medical emergency includes, but is not limited to: chest pain, difficulty breathing, severe bleeding, signs of stroke, severe allergic reactions, loss of consciousness, severe injuries, or any condition that could result in serious harm without immediate medical attention.</p>

<h3>3.3 After-Hours Care</h3>
<p>Our online services, including the patient portal and messaging, are not monitored outside of regular business hours. For urgent medical concerns outside of business hours, please contact our after-hours answering service, visit an urgent care facility, or seek emergency care as appropriate.</p>

<h2>4. Appointment Scheduling and Policies</h2>
<h3>4.1 Scheduling Policy</h3>
<p>Appointments can be scheduled through our online booking system, patient portal, or by contacting our office directly. By scheduling an appointment, you agree to:</p>
<ul>
<li>Arrive on time for your scheduled appointment</li>
<li>Provide accurate and complete information about your health history</li>
<li>Bring required documentation including identification and insurance cards</li>
<li>Notify us of any changes to your contact information or insurance</li>
</ul>

<h3>4.2 Cancellation Policy</h3>
<p>We require at least <strong>24 hours notice</strong> for appointment cancellations. Failure to provide adequate notice may result in:</p>
<ul>
<li>A cancellation fee of up to the cost of the scheduled service</li>
<li>Requirement of prepayment for future appointments</li>
<li>After three no-shows or late cancellations, potential dismissal from our practice</li>
</ul>

<h3>4.3 Late Arrivals</h3>
<p>Patients arriving more than <strong>15 minutes late</strong> may need to reschedule their appointment to ensure all patients receive adequate time with their healthcare provider. If you anticipate being late, please call our office as soon as possible.</p>

<h3>4.4 Wait Times</h3>
<p>While we make every effort to see patients at their scheduled time, medical emergencies and complex cases may occasionally cause delays. We appreciate your patience and understanding.</p>

<h2>5. Telehealth Services</h2>
<h3>5.1 Telehealth Consent and Understanding</h3>
<p>By using our telehealth services, you acknowledge and agree that:</p>
<ul>
<li>Telehealth involves the use of electronic communications to enable healthcare providers to deliver services remotely</li>
<li>Telehealth has limitations and may not be suitable for all medical conditions</li>
<li>Technical difficulties may occasionally interfere with telehealth services</li>
<li>Despite reasonable security measures, electronic communications may be subject to interception</li>
<li>In some cases, an in-person visit may be necessary for proper diagnosis and treatment</li>
</ul>

<h3>5.2 Technical Requirements</h3>
<p>You are responsible for:</p>
<ul>
<li>Having the necessary equipment (computer, tablet, or smartphone with camera and microphone)</li>
<li>Maintaining a stable internet connection for video consultations</li>
<li>Being in a private, quiet location during your telehealth visit</li>
<li>Testing your equipment before your scheduled appointment</li>
</ul>

<h3>5.3 Limitations of Telehealth</h3>
<p>Telehealth services cannot replace in-person examinations in all circumstances. Our providers may determine that an in-person visit is necessary based on your symptoms, medical history, or the type of care required. You agree to seek in-person care when recommended by your provider.</p>

<h3>5.4 Emergency Situations During Telehealth</h3>
<p>If you experience a medical emergency during a telehealth visit, the provider may instruct you to hang up and call 911 or go to the nearest emergency room. Please ensure you are in a location where emergency services can reach you.</p>

<h2>6. Patient Portal Terms</h2>
<h3>6.1 Account Responsibilities</h3>
<p>When using our patient portal, you agree to:</p>
<ul>
<li>Provide accurate registration information</li>
<li>Maintain the confidentiality of your login credentials</li>
<li>Notify us immediately if you suspect unauthorized access to your account</li>
<li>Use the portal only for its intended purposes</li>
<li>Not share your account access with others (except authorized caregivers)</li>
</ul>

<h3>6.2 Portal Functionality</h3>
<p>Our patient portal allows you to:</p>
<ul>
<li>View your health records and test results</li>
<li>Schedule and manage appointments</li>
<li>Communicate with your care team through secure messaging</li>
<li>Request prescription refills</li>
<li>Access educational materials</li>
<li>Complete forms and questionnaires</li>
</ul>

<h3>6.3 Response Times</h3>
<p>Messages sent through the patient portal are not monitored in real-time. Please allow <strong>1-2 business days</strong> for a response. For urgent matters, please call our office. For emergencies, call 911.</p>

<h3>6.4 Portal Security</h3>
<p>We implement industry-standard security measures to protect your information. However, no electronic transmission is completely secure. By using the portal, you acknowledge this inherent risk.</p>

<h2>7. Payment, Insurance, and Billing</h2>
<h3>7.1 Payment Responsibility</h3>
<p>You are financially responsible for all services rendered, regardless of insurance coverage. This includes:</p>
<ul>
<li>Co-payments and deductibles due at the time of service</li>
<li>Services not covered by your insurance plan</li>
<li>Charges for services rendered before insurance eligibility is verified</li>
<li>Any remaining balance after insurance payment</li>
</ul>

<h3>7.2 Insurance Verification</h3>
<p>While we verify insurance eligibility as a courtesy, you are responsible for:</p>
<ul>
<li>Understanding your insurance benefits and coverage limitations</li>
<li>Providing accurate and current insurance information</li>
<li>Obtaining required referrals or prior authorizations</li>
<li>Notifying us of insurance changes before your appointment</li>
</ul>

<h3>7.3 Out-of-Network Services</h3>
<p>If we are not in-network with your insurance plan, you may be responsible for a larger portion of the charges. We encourage you to verify our network status with your insurance provider.</p>

<h3>7.4 Self-Pay and Uninsured Patients</h3>
<p>For patients without insurance or those choosing to self-pay, we offer:</p>
<ul>
<li>Transparent pricing information</li>
<li>Payment plans for qualifying patients</li>
<li>A prompt-pay discount when payment is made at time of service (where applicable)</li>
</ul>

<h3>7.5 Collections</h3>
<p>Accounts with outstanding balances may be referred to a collection agency after reasonable attempts to collect payment. Collection agency fees may be added to your balance.</p>

<h3>7.6 Financial Hardship</h3>
<p>We are committed to providing care to all patients. If you are experiencing financial hardship, please speak with our billing department about:</p>
<ul>
<li>Payment plan options</li>
<li>Financial assistance programs</li>
<li>Sliding scale fee arrangements (where available)</li>
</ul>

<h2>8. Prescription Policy</h2>
<h3>8.1 Prescription Requests</h3>
<p>Prescription refills may be requested through:</p>
<ul>
<li>Our patient portal</li>
<li>Calling our office during business hours</li>
<li>Through your pharmacy (for routine refills)</li>
</ul>
<p>Please allow <strong>48-72 business hours</strong> for refill requests to be processed.</p>

<h3>8.2 Controlled Substances</h3>
<p>Prescriptions for controlled substances are subject to additional requirements:</p>
<ul>
<li>May require in-person visits at intervals determined by your provider</li>
<li>Cannot be refilled early</li>
<li>Are subject to state and federal regulations</li>
<li>May require verification through prescription drug monitoring programs</li>
</ul>

<h3>8.3 New Prescriptions</h3>
<p>New medications typically require an office visit for proper evaluation. We generally do not prescribe new medications based solely on phone or portal requests.</p>

<h2>9. Medical Records</h2>
<h3>9.1 Access to Records</h3>
<p>You have the right to access your medical records. To request copies:</p>
<ul>
<li>Submit a written request to our medical records department</li>
<li>Complete the required authorization form</li>
<li>Allow up to 30 days for request processing</li>
<li>A fee may be charged for copying and administrative costs</li>
</ul>

<h3>9.2 Record Retention</h3>
<p>We retain medical records in accordance with state and federal requirements. Records are maintained securely and confidentially.</p>

<h3>9.3 Record Amendments</h3>
<p>You may request amendments to your medical records. We will review requests and respond within 60 days. We may deny requests if the records are accurate, were not created by our practice, or are not part of your designated record set.</p>

<h2>10. HIPAA Acknowledgment</h2>
<h3>10.1 Notice of Privacy Practices</h3>
<p>We maintain a Notice of Privacy Practices that describes how we use and disclose your Protected Health Information (PHI). This notice is available on our website, in our office, and upon request.</p>

<h3>10.2 Your Privacy Rights</h3>
<p>Under HIPAA, you have the right to:</p>
<ul>
<li>Receive a copy of our Notice of Privacy Practices</li>
<li>Request restrictions on certain uses and disclosures of your PHI</li>
<li>Request confidential communications</li>
<li>Inspect and copy your health records</li>
<li>Request amendments to your records</li>
<li>Receive an accounting of certain disclosures</li>
<li>File a complaint with us or the HHS Office for Civil Rights</li>
</ul>

<h3>10.3 Authorization Requirements</h3>
<p>Certain uses and disclosures of your PHI require your written authorization, including:</p>
<ul>
<li>Most marketing communications</li>
<li>Sale of PHI</li>
<li>Certain research activities</li>
<li>Psychotherapy notes (if applicable)</li>
</ul>

<h2>11. Patient Responsibilities</h2>
<p>As a patient of our practice, you agree to:</p>
<ul>
<li>Provide accurate and complete health information</li>
<li>Follow treatment plans agreed upon with your provider</li>
<li>Ask questions when you don't understand your care</li>
<li>Notify us of changes in your condition</li>
<li>Treat staff and other patients with respect</li>
<li>Follow clinic policies and procedures</li>
<li>Pay for services as agreed</li>
</ul>

<h2>12. Complaint Procedures</h2>
<h3>12.1 Filing a Complaint</h3>
<p>If you have concerns about your care or our services, please:</p>
<ol>
<li>Speak directly with your healthcare provider or our office manager</li>
<li>Submit a written complaint to our practice administrator</li>
<li>Contact our patient advocate if available</li>
</ol>

<h3>12.2 External Complaints</h3>
<p>You may also file complaints with:</p>
<ul>
<li>Your state medical board</li>
<li>Your state health department</li>
<li>The HHS Office for Civil Rights (for HIPAA concerns)</li>
<li>Your insurance company</li>
</ul>
<p>We take all complaints seriously and will investigate promptly.</p>

<h2>13. Limitation of Liability</h2>
<h3>13.1 Website Disclaimer</h3>
<p>The information on our website is provided for general informational purposes only. While we strive to keep information accurate and up-to-date, we make no warranties about the completeness, reliability, or accuracy of this information.</p>

<h3>13.2 Limitation</h3>
<p>To the fullest extent permitted by law, our practice shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from:</p>
<ul>
<li>Your use of or inability to use our services or website</li>
<li>Technical failures or interruptions</li>
<li>Unauthorized access to your information despite our security measures</li>
<li>Actions taken or not taken based on website information</li>
</ul>
<p>This limitation does not apply to claims arising from professional negligence or malpractice.</p>

<h2>14. Intellectual Property</h2>
<p>All content on our website, including text, graphics, logos, and software, is the property of our practice or its content suppliers and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.</p>

<h2>15. Governing Law and Dispute Resolution</h2>
<p>These Terms shall be governed by and construed in accordance with the laws of the state where our practice is located. Any disputes arising from these Terms or your use of our services shall be resolved through binding arbitration or in the courts of our jurisdiction, at our discretion.</p>

<h2>16. Severability</h2>
<p>If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.</p>

<h2>17. Changes to Terms</h2>
<p>We reserve the right to modify these Terms of Service at any time. Material changes will be posted on our website with an updated effective date. Your continued use of our services after such changes constitutes acceptance of the modified terms.</p>

<h2>18. Contact Information</h2>
<p>If you have questions about these Terms of Service, please contact our office:</p>
<ul>
<li>By phone during regular business hours</li>
<li>Through our patient portal</li>
<li>By mail to our office address</li>
</ul>

<p><em>Last Updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</em></p>`;

// =============================================================================
// PRIVACY POLICY DEFAULT CONTENT
// =============================================================================

export const DEFAULT_PRIVACY_POLICY_CONTENT = `<p><strong>IMPORTANT: This document is a template and should be reviewed by qualified legal counsel before use. Healthcare regulations vary by state and jurisdiction. This template is provided for informational purposes only and does not constitute legal advice. This Privacy Policy should be used in conjunction with a formal HIPAA Notice of Privacy Practices.</strong></p>

<h2>1. Introduction</h2>
<p>This Privacy Policy describes how we collect, use, disclose, and protect your personal information and Protected Health Information (PHI). We are committed to protecting your privacy and complying with the Health Insurance Portability and Accountability Act (HIPAA), the Health Information Technology for Economic and Clinical Health (HITECH) Act, and other applicable federal and state privacy laws.</p>
<p>This Privacy Policy applies to:</p>
<ul>
<li>Our website and online services</li>
<li>Our patient portal</li>
<li>Our mobile applications (if applicable)</li>
<li>Information collected during in-person visits</li>
<li>Communications via phone, email, text, or other methods</li>
</ul>

<h2>2. Types of Information We Collect</h2>
<h3>2.1 Protected Health Information (PHI)</h3>
<p>Under HIPAA, PHI includes any individually identifiable health information. We collect PHI necessary to provide you with medical care, including:</p>
<ul>
<li><strong>Medical History</strong>: Past and current health conditions, surgeries, hospitalizations, and family medical history</li>
<li><strong>Clinical Information</strong>: Diagnoses, treatment plans, progress notes, and clinical observations</li>
<li><strong>Medications</strong>: Current and past medications, dosages, and pharmacy information</li>
<li><strong>Allergies</strong>: Known allergies to medications, foods, or environmental factors</li>
<li><strong>Lab Results</strong>: Laboratory tests, diagnostic imaging, and other test results</li>
<li><strong>Vital Signs</strong>: Height, weight, blood pressure, temperature, and other measurements</li>
<li><strong>Immunization Records</strong>: Vaccination history and schedules</li>
<li><strong>Mental Health Information</strong>: Psychological assessments and mental health treatment (with additional protections)</li>
</ul>

<h3>2.2 Personal Identification Information</h3>
<p>We collect personal information to identify you and manage your care:</p>
<ul>
<li>Full legal name and any preferred names</li>
<li>Date of birth</li>
<li>Social Security Number (for billing and identification purposes)</li>
<li>Government-issued ID information</li>
<li>Photographs (for identification and medical documentation)</li>
<li>Biometric information (if applicable to services provided)</li>
</ul>

<h3>2.3 Contact Information</h3>
<ul>
<li>Home, work, and mobile phone numbers</li>
<li>Email addresses</li>
<li>Mailing address</li>
<li>Emergency contact information</li>
<li>Preferred communication methods</li>
</ul>

<h3>2.4 Insurance and Financial Information</h3>
<ul>
<li>Health insurance plan details and member ID</li>
<li>Subscriber information</li>
<li>Prior authorization numbers</li>
<li>Payment card information</li>
<li>Bank account information (for direct payments)</li>
<li>Billing address</li>
</ul>

<h3>2.5 Website and Digital Information</h3>
<p>When you use our website or patient portal, we may automatically collect:</p>
<ul>
<li>IP address and approximate location</li>
<li>Browser type, version, and language preferences</li>
<li>Device type and operating system</li>
<li>Pages visited and time spent on our website</li>
<li>Referring website addresses</li>
<li>Cookies and similar tracking technologies</li>
<li>Portal usage patterns and preferences</li>
</ul>

<h3>2.6 Communication Records</h3>
<ul>
<li>Phone call recordings (where legally permitted and disclosed)</li>
<li>Voicemail messages</li>
<li>Email correspondence</li>
<li>Text messages and portal messages</li>
<li>Written correspondence</li>
</ul>

<h2>3. How We Use Your Information</h2>
<h3>3.1 Treatment</h3>
<p>We use your health information to:</p>
<ul>
<li>Diagnose and treat medical conditions</li>
<li>Develop and implement treatment plans</li>
<li>Coordinate care with other healthcare providers</li>
<li>Consult with other clinicians about your care</li>
<li>Provide telehealth services</li>
<li>Send appointment reminders and follow-up communications</li>
</ul>

<h3>3.2 Payment</h3>
<p>We use your information to:</p>
<ul>
<li>Bill and collect payment for services</li>
<li>Submit claims to health insurance plans</li>
<li>Verify insurance eligibility and benefits</li>
<li>Obtain prior authorizations</li>
<li>Communicate with your insurance company about claims</li>
<li>Manage accounts receivable</li>
</ul>

<h3>3.3 Healthcare Operations</h3>
<p>We use your information for:</p>
<ul>
<li>Quality assessment and improvement activities</li>
<li>Reviewing provider performance</li>
<li>Training healthcare professionals</li>
<li>Conducting business management and planning</li>
<li>Customer service activities</li>
<li>Compliance and auditing functions</li>
<li>Resolving grievances and complaints</li>
</ul>

<h3>3.4 Communications</h3>
<p>We may contact you to:</p>
<ul>
<li>Send appointment reminders</li>
<li>Provide test results and follow-up care information</li>
<li>Share health-related information and education</li>
<li>Notify you of changes to our services or policies</li>
<li>Respond to your inquiries</li>
</ul>

<h3>3.5 Legal and Regulatory Compliance</h3>
<p>We use your information to:</p>
<ul>
<li>Comply with federal and state laws</li>
<li>Respond to court orders and legal processes</li>
<li>Report to public health authorities</li>
<li>Cooperate with law enforcement when required</li>
<li>Participate in health oversight activities</li>
</ul>

<h2>4. HIPAA Notice of Privacy Practices</h2>
<h3>4.1 Relationship to This Privacy Policy</h3>
<p>As a HIPAA-covered entity, we maintain a separate <strong>Notice of Privacy Practices (NPP)</strong> that provides more detailed information about how we may use and disclose your PHI and your rights under HIPAA. The NPP is:</p>
<ul>
<li>Available at our office locations</li>
<li>Provided to you at your first appointment</li>
<li>Available upon request</li>
<li>Posted on our website</li>
</ul>
<p>This Privacy Policy supplements but does not replace our Notice of Privacy Practices.</p>

<h3>4.2 Your Rights Under HIPAA</h3>
<p>You have the following rights regarding your health information:</p>
<p><strong>Right to Access</strong>: You may request to inspect and obtain a copy of your health records. We may charge a reasonable fee for copying costs.</p>
<p><strong>Right to Amend</strong>: You may request that we correct information in your records that you believe is incorrect or incomplete. We may deny requests in certain circumstances, and you have the right to file a statement of disagreement.</p>
<p><strong>Right to Accounting of Disclosures</strong>: You may request a list of certain disclosures we have made of your PHI. This does not include disclosures for treatment, payment, or healthcare operations.</p>
<p><strong>Right to Request Restrictions</strong>: You may request restrictions on certain uses and disclosures of your PHI. We are not required to agree to most restrictions, but must agree to restrict disclosure to health plans for services you paid for in full out-of-pocket.</p>
<p><strong>Right to Confidential Communications</strong>: You may request that we communicate with you in a specific way or at a specific location.</p>
<p><strong>Right to a Paper Copy</strong>: You have the right to receive a paper copy of our Notice of Privacy Practices upon request.</p>
<p><strong>Right to File a Complaint</strong>: If you believe your privacy rights have been violated, you may file a complaint with us or with the Secretary of the Department of Health and Human Services.</p>

<h3>4.3 Uses and Disclosures Requiring Authorization</h3>
<p>Certain uses and disclosures of your PHI require your written authorization:</p>
<ul>
<li>Marketing communications (with limited exceptions)</li>
<li>Sale of PHI</li>
<li>Most uses of psychotherapy notes</li>
<li>Uses and disclosures not described in our Notice of Privacy Practices</li>
<li>Sharing with third parties for their own purposes</li>
</ul>
<p>You may revoke an authorization at any time in writing, but this will not affect disclosures already made.</p>

<h2>5. Information Sharing and Disclosure</h2>
<h3>5.1 Without Your Authorization</h3>
<p>We may share your information without authorization for:</p>
<p><strong>Treatment</strong>: With other healthcare providers involved in your care, including specialists, hospitals, laboratories, pharmacies, and home health agencies.</p>
<p><strong>Payment</strong>: With your health insurance plan, billing companies, collection agencies, and other parties involved in payment for services.</p>
<p><strong>Healthcare Operations</strong>: For quality improvement, training, credentialing, and other operational activities.</p>
<p><strong>Required by Law</strong>: When required by federal, state, or local law.</p>
<p><strong>Public Health</strong>: To public health authorities for disease prevention, injury reporting, or vital statistics.</p>
<p><strong>Abuse and Neglect</strong>: To report suspected abuse, neglect, or domestic violence.</p>
<p><strong>Health Oversight</strong>: To agencies conducting audits, investigations, or inspections.</p>
<p><strong>Legal Proceedings</strong>: In response to court orders or certain subpoenas.</p>
<p><strong>Law Enforcement</strong>: For law enforcement purposes as permitted by law.</p>
<p><strong>Coroners and Medical Examiners</strong>: For identification or determination of cause of death.</p>
<p><strong>Organ Donation</strong>: To organizations handling organ, eye, or tissue donation.</p>
<p><strong>Research</strong>: For research purposes with appropriate approvals and safeguards.</p>
<p><strong>Serious Threat</strong>: To prevent or lessen a serious and imminent threat to health or safety.</p>
<p><strong>Workers' Compensation</strong>: For workers' compensation claims.</p>
<p><strong>Military and Veterans</strong>: For military command authorities if you are a member of the armed forces.</p>
<p><strong>National Security</strong>: For intelligence, counterintelligence, and national security activities.</p>

<h3>5.2 With Your Authorization</h3>
<p>For uses and disclosures not covered above, we will obtain your written authorization. This includes:</p>
<ul>
<li>Sharing information with family members or friends you designate</li>
<li>Sending information to attorneys or other parties you specify</li>
<li>Most marketing communications</li>
<li>Any disclosure of psychotherapy notes</li>
</ul>

<h3>5.3 Business Associates</h3>
<p>We may share your information with Business Associates who perform services on our behalf. These may include:</p>
<ul>
<li>Electronic health record vendors</li>
<li>Billing and practice management companies</li>
<li>Telehealth platform providers</li>
<li>IT and cloud service providers</li>
<li>Legal and accounting firms</li>
<li>Consulting and quality improvement organizations</li>
</ul>
<p>All Business Associates are required to sign agreements ensuring they protect your information in compliance with HIPAA.</p>

<h2>6. Electronic Health Records (EHR)</h2>
<h3>6.1 EHR System</h3>
<p>We maintain your health records electronically. Our EHR system:</p>
<ul>
<li>Is certified to meet federal standards for security and interoperability</li>
<li>Uses encryption to protect data at rest and in transit</li>
<li>Implements access controls and audit logging</li>
<li>Is regularly backed up and maintained</li>
</ul>

<h3>6.2 Health Information Exchange</h3>
<p>We may participate in Health Information Exchanges (HIEs) that allow healthcare providers to share patient information electronically. This facilitates coordinated care across different providers and settings. You may opt out of HIE participation by submitting a written request.</p>

<h3>6.3 Patient Portal</h3>
<p>Our patient portal provides secure online access to:</p>
<ul>
<li>Portions of your medical records</li>
<li>Test results</li>
<li>Appointment scheduling</li>
<li>Secure messaging with your care team</li>
<li>Prescription refill requests</li>
<li>Educational materials</li>
</ul>
<p>Portal access is protected by username and password. You are responsible for maintaining the confidentiality of your login credentials.</p>

<h2>7. Data Security</h2>
<h3>7.1 Administrative Safeguards</h3>
<p>We implement administrative measures including:</p>
<ul>
<li>Designated Privacy and Security Officers</li>
<li>Comprehensive policies and procedures</li>
<li>Workforce training on privacy and security</li>
<li>Risk assessments and management</li>
<li>Business Associate agreements</li>
<li>Incident response procedures</li>
</ul>

<h3>7.2 Physical Safeguards</h3>
<p>We protect physical access to information through:</p>
<ul>
<li>Facility access controls</li>
<li>Workstation security policies</li>
<li>Device and media disposal procedures</li>
<li>Secure areas for servers and equipment</li>
</ul>

<h3>7.3 Technical Safeguards</h3>
<p>We employ technical measures including:</p>
<ul>
<li>Encryption of data at rest and in transit</li>
<li>Access controls and authentication</li>
<li>Audit logging and monitoring</li>
<li>Automatic logoff</li>
<li>Firewalls and intrusion detection</li>
<li>Antivirus and malware protection</li>
<li>Regular security assessments and penetration testing</li>
</ul>

<h2>8. Data Breach Notification</h2>
<h3>8.1 Our Commitment</h3>
<p>In the event of a breach of your unsecured PHI, we will:</p>
<ul>
<li>Promptly investigate the breach</li>
<li>Take steps to mitigate harm</li>
<li>Notify affected individuals as required by law</li>
<li>Report to the HHS Secretary</li>
<li>Notify media outlets if the breach affects more than 500 individuals in a state</li>
</ul>

<h3>8.2 Notification Contents</h3>
<p>Breach notifications will include:</p>
<ul>
<li>Description of what happened</li>
<li>Types of information involved</li>
<li>Steps you should take to protect yourself</li>
<li>What we are doing to investigate and mitigate the breach</li>
<li>Contact information for questions</li>
</ul>

<h2>9. Data Retention</h2>
<h3>9.1 Retention Periods</h3>
<p>We retain your information in accordance with:</p>
<ul>
<li>Federal and state medical records retention requirements</li>
<li>Insurance and billing regulations</li>
<li>Professional standards and accreditation requirements</li>
<li>Our business needs for ongoing patient care</li>
</ul>
<p>Medical records are typically retained for a minimum of:</p>
<ul>
<li><strong>Adults</strong>: 7-10 years from the last date of service (varies by state)</li>
<li><strong>Minors</strong>: Until the patient reaches age of majority plus the applicable retention period</li>
</ul>

<h3>9.2 Secure Disposal</h3>
<p>When information is no longer needed, we dispose of it securely through:</p>
<ul>
<li>Shredding of paper records</li>
<li>Secure deletion of electronic data</li>
<li>Destruction of media containing PHI</li>
</ul>

<h2>10. State-Specific Requirements</h2>
<h3>10.1 Additional Protections</h3>
<p>Certain states have additional privacy protections that may provide greater rights than HIPAA. These may include:</p>
<ul>
<li>More restrictive consent requirements</li>
<li>Enhanced protections for mental health, substance abuse, or HIV/AIDS information</li>
<li>Broader access rights</li>
<li>Stricter breach notification requirements</li>
<li>Specific telehealth privacy requirements</li>
</ul>
<p>We comply with all applicable state laws in addition to federal requirements.</p>

<h3>10.2 State Health Information Exchanges</h3>
<p>Participation in state-specific HIEs may be governed by additional rules and may require separate opt-in or opt-out procedures.</p>

<h2>11. Cookies and Website Tracking</h2>
<h3>11.1 Types of Cookies We Use</h3>
<ul>
<li><strong>Essential Cookies</strong>: Required for website functionality and cannot be disabled</li>
<li><strong>Functional Cookies</strong>: Remember your preferences and settings</li>
<li><strong>Analytics Cookies</strong>: Help us understand how visitors use our website</li>
<li><strong>Marketing Cookies</strong>: Used to track visitors and display relevant advertisements (if applicable)</li>
</ul>

<h3>11.2 Managing Cookies</h3>
<p>You can control cookies through your browser settings. Note that disabling certain cookies may affect website functionality.</p>

<h3>11.3 Do Not Track</h3>
<p>Our website responds to Do Not Track signals where technically feasible. When Do Not Track is enabled, we limit non-essential tracking.</p>

<h2>12. Third-Party Links and Services</h2>
<p>Our website may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing any personal information.</p>

<h2>13. Children's Privacy</h2>
<h3>13.1 COPPA Compliance</h3>
<p>We do not knowingly collect personal information from children under 13 through our website without parental consent. If you believe we have collected such information, please contact us immediately.</p>

<h3>13.2 Minor Patient Records</h3>
<p>For minor patients, parents or legal guardians may access their child's medical records in accordance with state law. As minors reach certain ages, they may gain independent rights to privacy for certain types of care.</p>

<h2>14. International Data Transfers</h2>
<p>If you access our services from outside the United States, please note that your information may be transferred to, stored, and processed in the United States, where data protection laws may differ from those in your country.</p>

<h2>15. Your Choices</h2>
<h3>15.1 Communication Preferences</h3>
<p>You may opt out of:</p>
<ul>
<li>Non-essential emails and newsletters</li>
<li>Text message reminders (may affect appointment notifications)</li>
<li>Marketing communications</li>
</ul>
<p>You cannot opt out of communications necessary for your care or required by law.</p>

<h3>15.2 Access and Correction</h3>
<p>You may request to review and correct your personal information by contacting our Privacy Officer.</p>

<h2>16. Changes to This Privacy Policy</h2>
<p>We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. Material changes will be:</p>
<ul>
<li>Posted on our website with a new effective date</li>
<li>Communicated to patients through appropriate channels</li>
</ul>
<p>Your continued use of our services after changes are posted constitutes acceptance of the modified policy.</p>

<h2>17. Complaints and Questions</h2>
<h3>17.1 Contact Our Privacy Officer</h3>
<p>If you have questions about this Privacy Policy or wish to exercise your privacy rights, please contact our Privacy Officer:</p>
<ul>
<li>By phone during regular business hours</li>
<li>Through our patient portal</li>
<li>By mail to our office address</li>
</ul>

<h3>17.2 Filing a Complaint</h3>
<p>You have the right to file a complaint if you believe your privacy rights have been violated. Complaints may be filed:</p>
<ul>
<li>With our Privacy Officer</li>
<li>With the Secretary of the Department of Health and Human Services at:
  <ul>
  <li>Website: www.hhs.gov/ocr/complaints</li>
  <li>By mail to the appropriate regional office</li>
  </ul>
</li>
</ul>
<p><strong>We will not retaliate against you for filing a complaint.</strong></p>

<h2>18. Effective Date</h2>
<p>This Privacy Policy is effective as of the date shown below and applies to all information collected on or after that date.</p>

<p><em>Last Updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</em></p>`;

// =============================================================================
// BLOCK GENERATORS
// =============================================================================

/**
 * Creates default blocks for Terms of Service page
 */
export function createTermsOfServiceBlocks(): BlockInstance[] {
  return [
    {
      id: `terms-hero-${Date.now()}`,
      type: 'hero',
      enabled: true,
      props: {
        headline: 'Terms of Service',
        tagline: 'Please read these terms carefully before using our services',
        backgroundType: 'solid',
        backgroundColor: '#f8fafc',
        alignment: 'center',
      },
    },
    {
      id: `terms-content-${Date.now()}`,
      type: 'custom-text',
      enabled: true,
      props: {
        title: '',
        content: DEFAULT_TERMS_OF_SERVICE_CONTENT,
        alignment: 'left',
        showTitle: false,
        backgroundColor: '#ffffff',
        textColor: '#000000',
        maxWidth: 'narrow',
      },
    },
  ];
}

/**
 * Creates default blocks for Privacy Policy page
 */
export function createPrivacyPolicyBlocks(): BlockInstance[] {
  return [
    {
      id: `privacy-hero-${Date.now()}`,
      type: 'hero',
      enabled: true,
      props: {
        headline: 'Privacy Policy',
        tagline: 'How we collect, use, and protect your information',
        backgroundType: 'solid',
        backgroundColor: '#f8fafc',
        alignment: 'center',
      },
    },
    {
      id: `privacy-content-${Date.now()}`,
      type: 'custom-text',
      enabled: true,
      props: {
        title: '',
        content: DEFAULT_PRIVACY_POLICY_CONTENT,
        alignment: 'left',
        showTitle: false,
        backgroundColor: '#ffffff',
        textColor: '#000000',
        maxWidth: 'narrow',
      },
    },
  ];
}

/**
 * Gets default blocks for a legal page type
 */
export function getDefaultLegalPageBlocks(pageType: 'terms' | 'privacy'): BlockInstance[] {
  if (pageType === 'terms') {
    return createTermsOfServiceBlocks();
  }
  return createPrivacyPolicyBlocks();
}

// =============================================================================
// PAGE CONFIG GENERATORS
// =============================================================================

/**
 * Creates default Terms of Service page configuration
 */
export function createDefaultTermsPage() {
  return {
    id: 'terms',
    type: 'terms' as const,
    title: 'Terms of Service',
    slug: 'terms',
    enabled: true,
    showInHeader: false,
    showInFooter: true,
    blocks: createTermsOfServiceBlocks(),
    order: 100,
    useDefaultContent: true,
  };
}

/**
 * Creates default Privacy Policy page configuration
 */
export function createDefaultPrivacyPage() {
  return {
    id: 'privacy',
    type: 'privacy' as const,
    title: 'Privacy Policy',
    slug: 'privacy',
    enabled: true,
    showInHeader: false,
    showInFooter: true,
    blocks: createPrivacyPolicyBlocks(),
    order: 101,
    useDefaultContent: true,
  };
}

