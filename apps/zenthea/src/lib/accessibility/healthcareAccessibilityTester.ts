/**
 * Healthcare-Specific Accessibility Testing Utilities
 * 
 * Provides specialized testing for healthcare applications including
 * medical terminology, patient data accessibility, and healthcare workflows.
 */

export interface HealthcareAccessibilityTestResult {
  element: string;
  testType: string;
  passed: boolean;
  issues: string[];
  details: string;
  healthcareSpecific: boolean;
}

export interface HealthcareAccessibilityTestSuite {
  tests: HealthcareAccessibilityTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    score: number;
    healthcareCompliant: boolean;
  };
}

export class HealthcareAccessibilityTester {
  private page: any;
  private results: HealthcareAccessibilityTestResult[] = [];

  constructor(page: any) {
    this.page = page;
  }

  /**
   * Test medical terminology accessibility
   */
  async testMedicalTerminology(): Promise<HealthcareAccessibilityTestResult[]> {
    const results: HealthcareAccessibilityTestResult[] = [];
    
    // Test medical terms for proper pronunciation and context
    const medicalTerms = await this.page.locator('[class*="medical"], [class*="healthcare"], [class*="clinical"]').all();
    
    for (const term of medicalTerms) {
      const elementHandle = await term.elementHandle();
      if (elementHandle) {
        const result = await this.testMedicalTermAccessibility(elementHandle);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Test individual medical term accessibility
   */
  async testMedicalTermAccessibility(term: any): Promise<HealthcareAccessibilityTestResult> {
    const issues: string[] = [];
    const details: string[] = [];
    let passed = true;

    try {
      const text = await term.textContent() || '';
      const ariaLabel = await term.getAttribute('aria-label');
      const title = await term.getAttribute('title');
      const role = await term.getAttribute('role');

      // Check for medical term context
      if (text && this.isMedicalTerm(text)) {
        // Medical terms should have accessible explanations
        if (!ariaLabel && !title) {
          issues.push('Medical term lacks accessible explanation');
          passed = false;
        }

        // Check for proper pronunciation hints
        const hasPronunciation = ariaLabel?.includes('pronounced') || title?.includes('pronounced');
        if (!hasPronunciation && this.isComplexMedicalTerm(text)) {
          issues.push('Complex medical term should include pronunciation guidance');
          passed = false;
        }
      }

      details.push(`Medical term: ${text.substring(0, 50)}...`);

    } catch (error) {
      issues.push(`Error testing medical term: ${error}`);
      passed = false;
    }

    return {
      element: 'medical term',
      testType: 'medical terminology',
      passed,
      issues,
      details: details.join('\n'),
      healthcareSpecific: true
    };
  }

  /**
   * Test patient data accessibility
   */
  async testPatientDataAccessibility(): Promise<HealthcareAccessibilityTestResult[]> {
    const results: HealthcareAccessibilityTestResult[] = [];
    
    // Test patient data elements
    const patientDataElements = await this.page.locator('[class*="patient"], [class*="medical-record"], [data-patient]').all();
    
    for (const element of patientDataElements) {
      const elementHandle = await element.elementHandle();
      if (elementHandle) {
        const result = await this.testPatientDataElement(elementHandle);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Test individual patient data element
   */
  async testPatientDataElement(element: any): Promise<HealthcareAccessibilityTestResult> {
    const issues: string[] = [];
    const details: string[] = [];
    let passed = true;

    try {
      const text = await element.textContent() || '';
      const ariaLabel = await element.getAttribute('aria-label');
      const role = await element.getAttribute('role');
      const ariaLive = await element.getAttribute('aria-live');

      // Patient data should be clearly labeled
      if (text && this.isPatientData(text)) {
        if (!ariaLabel && !role) {
          issues.push('Patient data element lacks proper labeling');
          passed = false;
        }

        // Critical patient data should have live regions
        if (this.isCriticalPatientData(text) && !ariaLive) {
          issues.push('Critical patient data should have aria-live region');
          passed = false;
        }
      }

      details.push(`Patient data element: ${text.substring(0, 30)}...`);

    } catch (error) {
      issues.push(`Error testing patient data element: ${error}`);
      passed = false;
    }

    return {
      element: 'patient data',
      testType: 'patient data accessibility',
      passed,
      issues,
      details: details.join('\n'),
      healthcareSpecific: true
    };
  }

  /**
   * Test healthcare status indicators
   */
  async testHealthcareStatusIndicators(): Promise<HealthcareAccessibilityTestResult[]> {
    const results: HealthcareAccessibilityTestResult[] = [];
    
    // Test status indicators
    const statusElements = await this.page.locator('[class*="status"], [class*="healthcare-"], [data-status]').all();
    
    for (const element of statusElements) {
      const elementHandle = await element.elementHandle();
      if (elementHandle) {
        const result = await this.testStatusIndicator(elementHandle);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Test individual status indicator
   */
  async testStatusIndicator(element: any): Promise<HealthcareAccessibilityTestResult> {
    const issues: string[] = [];
    const details: string[] = [];
    let passed = true;

    try {
      const text = await element.textContent() || '';
      const ariaLabel = await element.getAttribute('aria-label');
      const role = await element.getAttribute('role');
      const ariaLive = await element.getAttribute('aria-live');

      // Status indicators should be accessible
      if (text && this.isStatusIndicator(text)) {
        if (!ariaLabel && !role) {
          issues.push('Status indicator lacks accessible labeling');
          passed = false;
        }

        // Status changes should be announced
        if (!ariaLive && this.isDynamicStatus(text)) {
          issues.push('Dynamic status should have aria-live region');
          passed = false;
        }

        // Check color contrast for status indicators
        const styles = await element.evaluate((el: Element) => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor
          };
        });

        if (!this.hasGoodContrast(styles.color, styles.backgroundColor)) {
          issues.push('Status indicator has poor color contrast');
          passed = false;
        }
      }

      details.push(`Status indicator: ${text}`);

    } catch (error) {
      issues.push(`Error testing status indicator: ${error}`);
      passed = false;
    }

    return {
      element: 'status indicator',
      testType: 'healthcare status',
      passed,
      issues,
      details: details.join('\n'),
      healthcareSpecific: true
    };
  }

  /**
   * Test healthcare form accessibility
   */
  async testHealthcareFormAccessibility(): Promise<HealthcareAccessibilityTestResult[]> {
    const results: HealthcareAccessibilityTestResult[] = [];
    
    // Test healthcare forms
    const forms = await this.page.locator('form').all();
    
    for (const form of forms) {
      const elementHandle = await form.elementHandle();
      if (elementHandle) {
        const result = await this.testHealthcareForm(elementHandle);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Test individual healthcare form
   */
  async testHealthcareForm(form: any): Promise<HealthcareAccessibilityTestResult> {
    const issues: string[] = [];
    const details: string[] = [];
    let passed = true;

    try {
      const inputs = await this.page.locator('input, select, textarea').all();
      
      for (const input of inputs) {
        const inputHandle = await input.elementHandle();
        if (!inputHandle) continue;
        
        const type = await inputHandle.getAttribute('type') || 'text';
        const id = await inputHandle.getAttribute('id');
        const ariaLabel = await inputHandle.getAttribute('aria-label');
        const ariaLabelledBy = await inputHandle.getAttribute('aria-labelledby');
        const required = await inputHandle.getAttribute('required');

        // Healthcare forms need extra accessibility
        if (id && this.isHealthcareInput(type, id)) {
          if (!ariaLabel && !ariaLabelledBy && !id) {
            issues.push('Healthcare input lacks accessible label');
            passed = false;
          }

          // Required healthcare fields should be clearly marked
          if (required && !ariaLabel?.includes('required')) {
            issues.push('Required healthcare field should indicate requirement in label');
            passed = false;
          }

          // Medical data inputs should have help text
          if (this.isMedicalDataInput(type, id) && !ariaLabel?.includes('help')) {
            issues.push('Medical data input should include help text');
            passed = false;
          }
        }
      }

      details.push(`Healthcare form with ${inputs.length} inputs`);

    } catch (error) {
      issues.push(`Error testing healthcare form: ${error}`);
      passed = false;
    }

    return {
      element: 'healthcare form',
      testType: 'healthcare form accessibility',
      passed,
      issues,
      details: details.join('\n'),
      healthcareSpecific: true
    };
  }

  /**
   * Run complete healthcare accessibility test suite
   */
  async runTestSuite(): Promise<HealthcareAccessibilityTestSuite> {
    this.results = [];

    // Run all healthcare-specific test categories
    const medicalTermResults = await this.testMedicalTerminology();
    const patientDataResults = await this.testPatientDataAccessibility();
    const statusResults = await this.testHealthcareStatusIndicators();
    const formResults = await this.testHealthcareFormAccessibility();

    this.results = [
      ...medicalTermResults,
      ...patientDataResults,
      ...statusResults,
      ...formResults
    ];

    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const score = total > 0 ? Math.round((passed / total) * 100) : 0;
    const healthcareCompliant = score >= 85; // Healthcare requires higher standards

    return {
      tests: this.results,
      summary: {
        total,
        passed,
        failed,
        score,
        healthcareCompliant
      }
    };
  }

  // Helper methods
  private isMedicalTerm(text: string): boolean {
    const medicalTerms = ['diagnosis', 'treatment', 'medication', 'symptom', 'condition', 'therapy', 'prescription'];
    return medicalTerms.some(term => text.toLowerCase().includes(term));
  }

  private isComplexMedicalTerm(text: string): boolean {
    const complexTerms = ['hypertension', 'diabetes', 'cardiovascular', 'neurological', 'gastrointestinal'];
    return complexTerms.some(term => text.toLowerCase().includes(term));
  }

  private isPatientData(text: string): boolean {
    const patientDataKeywords = ['patient', 'medical', 'record', 'history', 'allergy', 'medication'];
    return patientDataKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private isCriticalPatientData(text: string): boolean {
    const criticalKeywords = ['allergy', 'emergency', 'critical', 'urgent', 'alert'];
    return criticalKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private isStatusIndicator(text: string): boolean {
    const statusKeywords = ['active', 'inactive', 'pending', 'completed', 'cancelled', 'scheduled'];
    return statusKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private isDynamicStatus(text: string): boolean {
    const dynamicKeywords = ['updating', 'loading', 'processing', 'syncing'];
    return dynamicKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private isHealthcareInput(type: string, id: string): boolean {
    const healthcareInputs = ['medical', 'patient', 'health', 'clinical', 'diagnosis'];
    return healthcareInputs.some(input => id?.toLowerCase().includes(input));
  }

  private isMedicalDataInput(type: string, id: string): boolean {
    const medicalDataInputs = ['allergy', 'medication', 'diagnosis', 'symptom', 'condition'];
    return medicalDataInputs.some(input => id?.toLowerCase().includes(input));
  }

  private hasGoodContrast(color: string, backgroundColor: string): boolean {
    // Simplified contrast check - in production, use a proper contrast calculation
    return color !== backgroundColor;
  }
}

export default HealthcareAccessibilityTester;
