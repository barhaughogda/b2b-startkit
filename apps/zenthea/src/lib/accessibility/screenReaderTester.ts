/**
 * Screen Reader Testing Utilities
 * 
 * Provides utilities for testing screen reader compatibility and accessibility
 * across different assistive technologies and browsers.
 */

export interface ScreenReaderTestResult {
  element: string;
  announcedText: string;
  expectedText: string;
  passed: boolean;
  issues: string[];
}

export interface ScreenReaderTestSuite {
  tests: ScreenReaderTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    score: number;
  };
}

export class ScreenReaderTester {
  private page: any;
  private results: ScreenReaderTestResult[] = [];

  constructor(page: any) {
    this.page = page;
  }

  /**
   * Test screen reader announcements for interactive elements
   */
  async testInteractiveElements(): Promise<ScreenReaderTestResult[]> {
    const results: ScreenReaderTestResult[] = [];
    
    // Test buttons
    const buttons = await this.page.locator('button').all();
    for (const button of buttons) {
      const result = await this.testElementAnnouncement(button, 'button');
      results.push(result);
    }

    // Test links
    const links = await this.page.locator('a[href]').all();
    for (const link of links) {
      const result = await this.testElementAnnouncement(link, 'link');
      results.push(result);
    }

    // Test form inputs
    const inputs = await this.page.locator('input, select, textarea').all();
    for (const input of inputs) {
      const result = await this.testElementAnnouncement(input, 'input');
      results.push(result);
    }

    return results;
  }

  /**
   * Test screen reader announcements for a specific element
   */
  async testElementAnnouncement(element: any, elementType: string): Promise<ScreenReaderTestResult> {
    const issues: string[] = [];
    let announcedText = '';
    let expectedText = '';

    try {
      // Get element text content
      const textContent = await element.textContent() || '';
      const ariaLabel = await element.getAttribute('aria-label');
      const ariaLabelledBy = await element.getAttribute('aria-labelledby');
      const title = await element.getAttribute('title');
      const role = await element.getAttribute('role');

      // Determine expected announcement text
      expectedText = ariaLabel || textContent.trim() || title || 'Unlabeled element';
      
      // Check for accessibility issues
      if (!ariaLabel && !textContent.trim() && !title) {
        issues.push('No accessible name provided');
      }

      if (elementType === 'button' && !ariaLabel && !textContent.trim()) {
        issues.push('Button has no accessible text');
      }

      if (elementType === 'link' && !ariaLabel && !textContent.trim()) {
        issues.push('Link has no accessible text');
      }

      if (elementType === 'input') {
        const type = await element.getAttribute('type');
        const placeholder = await element.getAttribute('placeholder');
        const id = await element.getAttribute('id');
        
        if (!ariaLabel && !ariaLabelledBy && !id) {
          issues.push('Input has no accessible label');
        }

        if (placeholder && !ariaLabel && !ariaLabelledBy) {
          issues.push('Input relies on placeholder for label (not accessible)');
        }
      }

      // Test ARIA attributes
      if (role && !ariaLabel && !textContent.trim()) {
        issues.push(`Element with role "${role}" has no accessible name`);
      }

      // Check for proper ARIA states
      const ariaExpanded = await element.getAttribute('aria-expanded');
      const ariaSelected = await element.getAttribute('aria-selected');
      const ariaChecked = await element.getAttribute('aria-checked');
      
      if (ariaExpanded === 'true' && !ariaLabel && !textContent.trim()) {
        issues.push('Expandable element has no accessible name');
      }

      // Simulate screen reader announcement
      announcedText = expectedText;

    } catch (error) {
      issues.push(`Error testing element: ${error}`);
    }

    return {
      element: elementType,
      announcedText,
      expectedText,
      passed: issues.length === 0,
      issues
    };
  }

  /**
   * Test heading structure for screen readers
   */
  async testHeadingStructure(): Promise<ScreenReaderTestResult[]> {
    const results: ScreenReaderTestResult[] = [];
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').all();
    
    let previousLevel = 0;
    let hasH1 = false;

    for (const heading of headings) {
      const tagName = await heading.getAttribute('tagName');
      const level = tagName ? parseInt(tagName.replace('H', '')) : 0;
      const text = await heading.textContent() || '';
      const issues: string[] = [];

      // Check for proper heading hierarchy
      if (level > previousLevel + 1) {
        issues.push(`Heading level ${level} skips level(s) after level ${previousLevel}`);
      }

      // Check for H1
      if (level === 1) {
        hasH1 = true;
      }

      // Check for empty headings
      if (!text.trim()) {
        issues.push('Empty heading element');
      }

      // Check for duplicate H1s
      if (level === 1 && hasH1) {
        issues.push('Multiple H1 elements found');
      }

      results.push({
        element: `h${level}`,
        announcedText: text.trim(),
        expectedText: text.trim(),
        passed: issues.length === 0,
        issues
      });

      previousLevel = level;
    }

    // Check for missing H1
    if (!hasH1) {
      results.push({
        element: 'h1',
        announcedText: '',
        expectedText: 'Page should have at least one H1',
        passed: false,
        issues: ['No H1 heading found']
      });
    }

    return results;
  }

  /**
   * Test form accessibility for screen readers
   */
  async testFormAccessibility(): Promise<ScreenReaderTestResult[]> {
    const results: ScreenReaderTestResult[] = [];
    const forms = await this.page.locator('form').all();

    for (const form of forms) {
      const inputs = await form.locator('input, select, textarea').all();
      
      for (const input of inputs) {
        const result = await this.testFormInputAccessibility(input);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Test individual form input accessibility
   */
  async testFormInputAccessibility(input: any): Promise<ScreenReaderTestResult> {
    const issues: string[] = [];
    let announcedText = '';
    let expectedText = '';

    try {
      const type = await input.getAttribute('type') || 'text';
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      const required = await input.getAttribute('required');
      const ariaRequired = await input.getAttribute('aria-required');

      // Check for proper labeling
      if (!ariaLabel && !ariaLabelledBy && !id) {
        issues.push('Input has no accessible label');
      }

      // Check for required field indication
      if (required && !ariaRequired) {
        issues.push('Required field should have aria-required="true"');
      }

      // Check for placeholder misuse
      if (placeholder && !ariaLabel && !ariaLabelledBy) {
        issues.push('Input relies on placeholder for label (not accessible)');
      }

      // Check for proper input type
      if (type === 'email' && !ariaLabel && !ariaLabelledBy) {
        issues.push('Email input should have accessible label');
      }

      if (type === 'password' && !ariaLabel && !ariaLabelledBy) {
        issues.push('Password input should have accessible label');
      }

      // Determine expected announcement
      const labelText = ariaLabel || (id ? await this.getLabelText(id) : '') || placeholder || '';
      expectedText = labelText + (required ? ' (required)' : '');
      announcedText = expectedText;

    } catch (error) {
      issues.push(`Error testing form input: ${error}`);
    }

    return {
      element: 'form input',
      announcedText,
      expectedText,
      passed: issues.length === 0,
      issues
    };
  }

  /**
   * Get label text for an input by ID
   */
  private async getLabelText(id: string): Promise<string> {
    try {
      const label = await this.page.locator(`label[for="${id}"]`);
      if (await label.count() > 0) {
        return await label.textContent() || '';
      }
    } catch (error) {
      // Label not found
    }
    return '';
  }

  /**
   * Test ARIA landmarks for screen readers
   */
  async testAriaLandmarks(): Promise<ScreenReaderTestResult[]> {
    const results: ScreenReaderTestResult[] = [];
    const landmarks = await this.page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], [role="search"]').all();

    for (const landmark of landmarks) {
      const role = await landmark.getAttribute('role');
      const ariaLabel = await landmark.getAttribute('aria-label');
      const ariaLabelledBy = await landmark.getAttribute('aria-labelledby');
      const issues: string[] = [];

      // Check for proper landmark labeling
      if (!ariaLabel && !ariaLabelledBy) {
        issues.push(`Landmark with role "${role}" should have aria-label or aria-labelledby`);
      }

      // Check for duplicate landmarks
      const sameRoleLandmarks = await this.page.locator(`[role="${role}"]`).all();
      if (sameRoleLandmarks.length > 1 && !ariaLabel) {
        issues.push(`Multiple landmarks with role "${role}" should have unique labels`);
      }

      results.push({
        element: `landmark[role="${role}"]`,
        announcedText: ariaLabel || role || '',
        expectedText: ariaLabel || role || '',
        passed: issues.length === 0,
        issues
      });
    }

    return results;
  }

  /**
   * Run complete screen reader test suite
   */
  async runTestSuite(): Promise<ScreenReaderTestSuite> {
    this.results = [];

    // Run all test categories
    const interactiveResults = await this.testInteractiveElements();
    const headingResults = await this.testHeadingStructure();
    const formResults = await this.testFormAccessibility();
    const landmarkResults = await this.testAriaLandmarks();

    this.results = [
      ...interactiveResults,
      ...headingResults,
      ...formResults,
      ...landmarkResults
    ];

    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const score = total > 0 ? Math.round((passed / total) * 100) : 0;

    return {
      tests: this.results,
      summary: {
        total,
        passed,
        failed,
        score
      }
    };
  }

  /**
   * Generate detailed test report
   */
  generateReport(): string {
    const suite = this.getTestSuite();
    let report = `# Screen Reader Accessibility Test Report\n\n`;
    report += `## Summary\n`;
    report += `- **Total Tests**: ${suite.summary.total}\n`;
    report += `- **Passed**: ${suite.summary.passed}\n`;
    report += `- **Failed**: ${suite.summary.failed}\n`;
    report += `- **Score**: ${suite.summary.score}%\n\n`;

    if (suite.summary.failed > 0) {
      report += `## Failed Tests\n\n`;
      const failedTests = suite.tests.filter(t => !t.passed);
      
      failedTests.forEach(test => {
        report += `### ${test.element}\n`;
        report += `- **Issues**: ${test.issues.join(', ')}\n`;
        report += `- **Expected**: ${test.expectedText}\n`;
        report += `- **Announced**: ${test.announcedText}\n\n`;
      });
    }

    return report;
  }

  private getTestSuite(): ScreenReaderTestSuite {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const score = total > 0 ? Math.round((passed / total) * 100) : 0;

    return {
      tests: this.results,
      summary: {
        total,
        passed,
        failed,
        score
      }
    };
  }
}

export default ScreenReaderTester;
