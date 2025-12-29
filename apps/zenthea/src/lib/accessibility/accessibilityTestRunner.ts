/**
 * Comprehensive Accessibility Test Runner
 * 
 * Orchestrates screen reader and keyboard navigation testing
 * with detailed reporting and CI/CD integration.
 */

import ScreenReaderTester, { ScreenReaderTestSuite } from './screenReaderTester';
import KeyboardTester, { KeyboardTestSuite } from './keyboardTester';
import HealthcareAccessibilityTester, { HealthcareAccessibilityTestSuite } from './healthcareAccessibilityTester';

export interface AccessibilityTestResult {
  timestamp: string;
  url: string;
  theme: string;
  screenReader: ScreenReaderTestSuite;
  keyboard: KeyboardTestSuite;
  healthcare: HealthcareAccessibilityTestSuite;
  summary: {
    overallScore: number;
    wcagCompliant: boolean;
    healthcareCompliant: boolean;
    criticalIssues: number;
    recommendations: string[];
  };
}

export interface AccessibilityTestConfig {
  themes: string[];
  urls: string[];
  includeScreenReader: boolean;
  includeKeyboard: boolean;
  includeHealthcare: boolean;
  generateReport: boolean;
  outputPath?: string;
}

export class AccessibilityTestRunner {
  private page: import('playwright').Page;
  private config: AccessibilityTestConfig;
  private results: AccessibilityTestResult[] = [];

  constructor(page: import('playwright').Page, config: AccessibilityTestConfig) {
    this.page = page;
    this.config = config;
  }

  /**
   * Run accessibility tests for a specific URL and theme
   */
  async testUrlAndTheme(url: string, theme: string): Promise<AccessibilityTestResult> {
    console.log(`Testing ${url} with ${theme} theme...`);

    // Navigate to URL
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');

    // Apply theme
    await this.applyTheme(theme);

    // Wait for page to stabilize
    await this.page.waitForTimeout(1000);

    const result: AccessibilityTestResult = {
      timestamp: new Date().toISOString(),
      url,
      theme,
      screenReader: { tests: [], summary: { total: 0, passed: 0, failed: 0, score: 0 } },
      keyboard: { tests: [], summary: { total: 0, passed: 0, failed: 0, score: 0 } },
      healthcare: { tests: [], summary: { total: 0, passed: 0, failed: 0, score: 0, healthcareCompliant: false } },
      summary: {
        overallScore: 0,
        wcagCompliant: false,
        healthcareCompliant: false,
        criticalIssues: 0,
        recommendations: []
      }
    };

    // Run screen reader tests
    if (this.config.includeScreenReader) {
      const screenReaderTester = new ScreenReaderTester(this.page);
      result.screenReader = await screenReaderTester.runTestSuite();
    }

    // Run keyboard navigation tests
    if (this.config.includeKeyboard) {
      const keyboardTester = new KeyboardTester(this.page);
      result.keyboard = await keyboardTester.runTestSuite();
    }

    // Run healthcare-specific tests
    if (this.config.includeHealthcare) {
      const healthcareTester = new HealthcareAccessibilityTester(this.page);
      result.healthcare = await healthcareTester.runTestSuite();
    }

    // Calculate overall score and compliance
    this.calculateOverallScore(result);

    return result;
  }

  /**
   * Apply theme to the page
   */
  private async applyTheme(theme: string): Promise<void> {
    if (theme === 'dark') {
      await this.page.evaluate(() => {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.documentElement.removeAttribute('data-theme');
      });
    } else if (theme === 'high-contrast') {
      await this.page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'high-contrast');
        document.documentElement.classList.remove('dark', 'light');
      });
    } else {
      // Light theme (default)
      await this.page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.documentElement.removeAttribute('data-theme');
      });
    }
  }

  /**
   * Calculate overall score and compliance
   */
  private calculateOverallScore(result: AccessibilityTestResult): void {
    const screenReaderScore = result.screenReader.summary.score;
    const keyboardScore = result.keyboard.summary.score;
    const healthcareScore = result.healthcare.summary.score;
    
    // Weighted scoring: Screen reader 40%, Keyboard 30%, Healthcare 30%
    const overallScore = Math.round(
      (screenReaderScore * 0.4) + (keyboardScore * 0.3) + (healthcareScore * 0.3)
    );

    result.summary.overallScore = overallScore;
    result.summary.wcagCompliant = overallScore >= 90; // 90% threshold for WCAG compliance
    result.summary.healthcareCompliant = healthcareScore >= 85; // 85% threshold for healthcare compliance

    // Count critical issues
    const criticalIssues = [
      ...result.screenReader.tests.filter(t => !t.passed && t.issues.some(i => 
        i.includes('No accessible name') || 
        i.includes('No accessible label') ||
        i.includes('Empty heading')
      )),
      ...result.keyboard.tests.filter(t => !t.passed && t.issues.some(i => 
        i.includes('No focusable elements') ||
        i.includes('Circular tab navigation') ||
        i.includes('No visible focus indicator')
      )),
      ...result.healthcare.tests.filter(t => !t.passed && t.issues.some(i => 
        i.includes('Status indicator has no accessible name') ||
        i.includes('Critical information element should have an appropriate ARIA role') ||
        i.includes('Potential PHI')
      ))
    ];

    result.summary.criticalIssues = criticalIssues.length;

    // Generate recommendations
    result.summary.recommendations = this.generateRecommendations(result);
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(result: AccessibilityTestResult): string[] {
    const recommendations: string[] = [];

    // Screen reader recommendations
    if (result.screenReader.summary.failed > 0) {
      const failedScreenReaderTests = result.screenReader.tests.filter(t => !t.passed);
      
      if (failedScreenReaderTests.some(t => t.issues.some(i => i.includes('No accessible name')))) {
        recommendations.push('Add accessible names to all interactive elements using aria-label or visible text');
      }
      
      if (failedScreenReaderTests.some(t => t.issues.some(i => i.includes('Empty heading')))) {
        recommendations.push('Remove empty heading elements or add meaningful text');
      }
      
      if (failedScreenReaderTests.some(t => t.issues.some(i => i.includes('No accessible label')))) {
        recommendations.push('Add labels to all form inputs using <label> elements or aria-label');
      }
    }

    // Keyboard recommendations
    if (result.keyboard.summary.failed > 0) {
      const failedKeyboardTests = result.keyboard.tests.filter(t => !t.passed);
      
      if (failedKeyboardTests.some(t => t.issues.some(i => i.includes('No focusable elements')))) {
        recommendations.push('Ensure all interactive elements are keyboard accessible');
      }
      
      if (failedKeyboardTests.some(t => t.issues.some(i => i.includes('Circular tab navigation')))) {
        recommendations.push('Fix tab order to prevent circular navigation');
      }
      
      if (failedKeyboardTests.some(t => t.issues.some(i => i.includes('No visible focus indicator')))) {
        recommendations.push('Add visible focus indicators to all interactive elements');
      }
    }

    // Healthcare recommendations
    if (result.healthcare.summary.failed > 0) {
      const failedHealthcareTests = result.healthcare.tests.filter(t => !t.passed);
      
      if (failedHealthcareTests.some(t => t.issues.some(i => i.includes('Status indicator has no accessible name')))) {
        recommendations.push('Add accessible names to all healthcare status indicators using aria-label or role="status"');
      }
      
      if (failedHealthcareTests.some(t => t.issues.some(i => i.includes('Critical information element should have an appropriate ARIA role')))) {
        recommendations.push('Add appropriate ARIA roles (alert, status) to critical healthcare information');
      }
      
      if (failedHealthcareTests.some(t => t.issues.some(i => i.includes('Potential PHI')))) {
        recommendations.push('Review PHI data exposure and ensure proper masking for screen readers');
      }
    }

    // General recommendations
    if (result.summary.overallScore < 90) {
      recommendations.push('Review WCAG 2.1 AA guidelines for comprehensive accessibility compliance');
    }

    if (result.summary.criticalIssues > 0) {
      recommendations.push('Address critical accessibility issues immediately');
    }

    return recommendations;
  }

  /**
   * Run complete accessibility test suite
   */
  async runTestSuite(): Promise<AccessibilityTestResult[]> {
    this.results = [];

    for (const url of this.config.urls) {
      for (const theme of this.config.themes) {
        try {
          const result = await this.testUrlAndTheme(url, theme);
          this.results.push(result);
          
          console.log(`✓ ${url} (${theme}): ${result.summary.overallScore}% (${result.summary.wcagCompliant ? 'WCAG Compliant' : 'Non-compliant'})`);
        } catch (error) {
          console.error(`✗ ${url} (${theme}) failed:`, error);
          
          // Add failed result
          this.results.push({
            timestamp: new Date().toISOString(),
            url,
            theme,
            screenReader: { tests: [], summary: { total: 0, passed: 0, failed: 0, score: 0 } },
            keyboard: { tests: [], summary: { total: 0, passed: 0, failed: 0, score: 0 } },
            healthcare: { tests: [], summary: { total: 0, passed: 0, failed: 0, score: 0, healthcareCompliant: false } },
            summary: {
              overallScore: 0,
              wcagCompliant: false,
              healthcareCompliant: false,
              criticalIssues: 1,
              recommendations: ['Fix test execution errors']
            }
          });
        }
      }
    }

    // Generate report if requested
    if (this.config.generateReport) {
      await this.generateReport();
    }

    return this.results;
  }

  /**
   * Generate comprehensive accessibility report
   */
  async generateReport(): Promise<void> {
    const report = this.generateReportContent();
    
    if (this.config.outputPath) {
      const fs = await import('fs');
      const path = await import('path');
      
      const outputDir = path.dirname(this.config.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      fs.writeFileSync(this.config.outputPath, report);
      console.log(`Accessibility report saved to: ${this.config.outputPath}`);
    } else {
      console.log('\n' + report);
    }
  }

  /**
   * Generate report content
   */
  private generateReportContent(): string {
    const report = {
      generated: new Date().toISOString(),
      totalTests: this.results.length,
      results: this.results,
      summary: this.getSummaryStats()
    };
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * Get summary statistics
   */
  private getSummaryStats() {
    const compliantTests = this.results.filter(r => r.summary.wcagCompliant).length;
    const healthcareCompliantTests = this.results.filter(r => r.summary.healthcareCompliant).length;
    const averageScore = Math.round(
      this.results.reduce((sum, r) => sum + r.summary.overallScore, 0) / this.results.length
    );
    const totalCriticalIssues = this.results.reduce((sum, r) => sum + r.summary.criticalIssues, 0);

    return {
      compliantTests,
      healthcareCompliantTests,
      averageScore,
      totalCriticalIssues,
      overallCompliance: compliantTests === this.results.length,
      healthcareCompliance: healthcareCompliantTests === this.results.length
    };
  }

  /**
   * Generate markdown report content
   */
  private generateMarkdownReport(): string {
    let report = `# Accessibility Test Report\n\n`;
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Total Tests**: ${this.results.length}\n\n`;

    // Summary statistics
    const compliantTests = this.results.filter(r => r.summary.wcagCompliant).length;
    const averageScore = Math.round(
      this.results.reduce((sum, r) => sum + r.summary.overallScore, 0) / this.results.length
    );
    const totalCriticalIssues = this.results.reduce((sum, r) => sum + r.summary.criticalIssues, 0);

    report += `## Summary\n`;
    report += `- **WCAG Compliant Tests**: ${compliantTests}/${this.results.length}\n`;
    report += `- **Average Score**: ${averageScore}%\n`;
    report += `- **Critical Issues**: ${totalCriticalIssues}\n`;
    report += `- **Overall Compliance**: ${compliantTests === this.results.length ? '✅ PASS' : '❌ FAIL'}\n\n`;

    // Detailed results by URL and theme
    report += `## Detailed Results\n\n`;
    
    for (const result of this.results) {
      report += `### ${result.url} (${result.theme} theme)\n`;
      report += `- **Overall Score**: ${result.summary.overallScore}%\n`;
      report += `- **WCAG Compliant**: ${result.summary.wcagCompliant ? '✅ YES' : '❌ NO'}\n`;
      report += `- **Critical Issues**: ${result.summary.criticalIssues}\n`;
      report += `- **Screen Reader Score**: ${result.screenReader.summary.score}%\n`;
      report += `- **Keyboard Score**: ${result.keyboard.summary.score}%\n\n`;

      if (result.summary.recommendations.length > 0) {
        report += `**Recommendations**:\n`;
        result.summary.recommendations.forEach(rec => {
          report += `- ${rec}\n`;
        });
        report += `\n`;
      }

      // Failed tests details
      const failedScreenReaderTests = result.screenReader.tests.filter(t => !t.passed);
      const failedKeyboardTests = result.keyboard.tests.filter(t => !t.passed);

      if (failedScreenReaderTests.length > 0) {
        report += `**Screen Reader Issues**:\n`;
        failedScreenReaderTests.forEach(test => {
          report += `- ${test.element}: ${test.issues.join(', ')}\n`;
        });
        report += `\n`;
      }

      if (failedKeyboardTests.length > 0) {
        report += `**Keyboard Issues**:\n`;
        failedKeyboardTests.forEach(test => {
          report += `- ${test.element} (${test.testType}): ${test.issues.join(', ')}\n`;
        });
        report += `\n`;
      }
    }

    // Overall recommendations
    const allRecommendations = this.results.flatMap(r => r.summary.recommendations);
    const uniqueRecommendations = [...new Set(allRecommendations)];

    if (uniqueRecommendations.length > 0) {
      report += `## Overall Recommendations\n\n`;
      uniqueRecommendations.forEach(rec => {
        report += `- ${rec}\n`;
      });
      report += `\n`;
    }

    // Compliance status
    report += `## Compliance Status\n\n`;
    if (compliantTests === this.results.length) {
      report += `✅ **All tests are WCAG 2.1 AA compliant!**\n\n`;
    } else {
      report += `❌ **${this.results.length - compliantTests} tests are not WCAG compliant.**\n`;
      report += `Please address the issues above to achieve full compliance.\n\n`;
    }

    return report;
  }

  /**
   * Get test results
   */
  getResults(): AccessibilityTestResult[] {
    return this.results;
  }

  /**
   * Check if all tests passed
   */
  allTestsPassed(): boolean {
    return this.results.every(r => r.summary.wcagCompliant);
  }

  /**
   * Get overall compliance score
   */
  getOverallScore(): number {
    if (this.results.length === 0) return 0;
    return Math.round(
      this.results.reduce((sum, r) => sum + r.summary.overallScore, 0) / this.results.length
    );
  }
}

export default AccessibilityTestRunner;
