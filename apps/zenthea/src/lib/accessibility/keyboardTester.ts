/**
 * Keyboard Navigation Testing Utilities
 * 
 * Provides comprehensive testing for keyboard navigation, focus management,
 * and keyboard accessibility across all interactive elements.
 */

export interface KeyboardTestResult {
  element: string;
  testType: string;
  passed: boolean;
  issues: string[];
  details: string;
}

export interface KeyboardTestSuite {
  tests: KeyboardTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    score: number;
  };
}

export class KeyboardTester {
  private page: any;
  private results: KeyboardTestResult[] = [];
  private focusableElements: any[] = [];

  constructor(page: any) {
    this.page = page;
  }

  /**
   * Test tab navigation through all focusable elements
   */
  async testTabNavigation(): Promise<KeyboardTestResult[]> {
    const results: KeyboardTestResult[] = [];
    
    // Get all focusable elements
    const locators = await this.page.locator(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"], [role="tab"], [role="menuitem"]'
    ).all();
    
    // Convert locators to element handles
    this.focusableElements = [];
    for (const locator of locators) {
      const elementHandle = await locator.elementHandle();
      if (elementHandle) {
        this.focusableElements.push(elementHandle);
      }
    }

    if (this.focusableElements.length === 0) {
      results.push({
        element: 'page',
        testType: 'tab navigation',
        passed: false,
        issues: ['No focusable elements found on page'],
        details: 'Page should have at least one focusable element for keyboard navigation'
      });
      return results;
    }

    // Test tab order
    const tabOrder = await this.testTabOrder();
    results.push(tabOrder);

    // Test tab trapping in modals
    const modalResults = await this.testModalTabTrapping();
    results.push(...modalResults);

    // Test tab navigation through forms
    // TODO: Implement testFormTabNavigation method
    // const formResults = await this.testFormTabNavigation();
    // results.push(...formResults);

    return results;
  }

  /**
   * Test tab order through all focusable elements
   */
  async testTabOrder(): Promise<KeyboardTestResult> {
    const issues: string[] = [];
    const details: string[] = [];
    let passed = true;

    try {
      // Start from the beginning of the page
      await this.page.keyboard.press('Home');
      await this.page.keyboard.press('Tab');

      const visitedElements: string[] = [];
      const maxTabs = this.focusableElements.length * 2; // Prevent infinite loops
      let tabCount = 0;

      while (tabCount < maxTabs) {
        const focusedElement = await this.page.locator(':focus');
        const elementCount = await focusedElement.count();

        if (elementCount === 0) {
          break; // No more focusable elements
        }

        // Get element information
        const tagName = await focusedElement.evaluate((el: Element) => el.tagName.toLowerCase());
        const text = await focusedElement.textContent() || '';
        const ariaLabel = await focusedElement.getAttribute('aria-label');
        const role = await focusedElement.getAttribute('role');
        const tabIndex = await focusedElement.getAttribute('tabindex');

        const elementInfo = `${tagName}${role ? `[role="${role}"]` : ''}${ariaLabel ? ` (${ariaLabel})` : text ? ` (${text.substring(0, 20)}...)` : ''}`;
        
        // Check for duplicate focus
        if (visitedElements.includes(elementInfo)) {
          issues.push(`Circular tab navigation detected: ${elementInfo}`);
          passed = false;
          break;
        }

        visitedElements.push(elementInfo);
        details.push(`Tab ${tabCount + 1}: ${elementInfo}`);

        // Check if element is actually focusable
        const isFocusable = await focusedElement.evaluate((el: Element) => {
          const computedStyle = window.getComputedStyle(el);
          return computedStyle.display !== 'none' && 
                 computedStyle.visibility !== 'hidden' && 
                 !el.hasAttribute('disabled');
        });

        if (!isFocusable) {
          issues.push(`Element is not focusable but received focus: ${elementInfo}`);
          passed = false;
        }

        await this.page.keyboard.press('Tab');
        tabCount++;
      }

      if (tabCount === 0) {
        issues.push('No elements are focusable with Tab key');
        passed = false;
      }

    } catch (error) {
      issues.push(`Error testing tab navigation: ${error}`);
      passed = false;
    }

    return {
      element: 'page',
      testType: 'tab navigation',
      passed,
      issues,
      details: details.join('\n')
    };
  }

  /**
   * Test tab trapping in modal dialogs
   */
  async testModalTabTrapping(): Promise<KeyboardTestResult[]> {
    const results: KeyboardTestResult[] = [];
    const modalLocators = await this.page.locator('[role="dialog"], [role="alertdialog"], .modal, [data-modal]').all();

    for (const modalLocator of modalLocators) {
      const modalHandle = await modalLocator.elementHandle();
      if (modalHandle) {
        const result = await this.testModalTabTrappingForModal(modalHandle);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Test tab trapping for a specific modal
   */
  async testModalTabTrappingForModal(modal: any): Promise<KeyboardTestResult> {
    const issues: string[] = [];
    const details: string[] = [];
    let passed = true;

    try {
      // Check if modal is visible
      const isVisible = await modal.isVisible();
      if (!isVisible) {
        return {
          element: 'modal',
          testType: 'tab trapping',
          passed: true,
          issues: [],
          details: 'Modal is not visible, skipping test'
        };
      }

      // Get focusable elements within modal
      const modalLocators = await this.page.locator(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ).all();
      
      const modalFocusableElements: any[] = [];
      for (const locator of modalLocators) {
        const elementHandle = await locator.elementHandle();
        if (elementHandle) {
          modalFocusableElements.push(elementHandle);
        }
      }

      if (modalFocusableElements.length === 0) {
        issues.push('Modal has no focusable elements');
        passed = false;
      } else {
        // Test tab trapping
        const firstElement = modalFocusableElements[0];
        const lastElement = modalFocusableElements[modalFocusableElements.length - 1];

        // Focus first element
        await firstElement.focus();
        details.push('Focused first element in modal');

        // Test tab forward
        await this.page.keyboard.press('Tab');
        const focusedAfterTab = await this.page.locator(':focus');
        const lastElementHandle = await lastElement.evaluate((lastEl: Element) => lastEl);
        const isLastElement = await focusedAfterTab.evaluate((el: Element) => 
          el === lastElementHandle
        );

        if (!isLastElement && modalFocusableElements.length > 1) {
          issues.push('Tab does not cycle to last element in modal');
          passed = false;
        }

        // Test shift+tab backward
        await this.page.keyboard.press('Shift+Tab');
        const focusedAfterShiftTab = await this.page.locator(':focus');
        const firstElementHandle = await firstElement.evaluate((firstEl: Element) => firstEl);
        const isFirstElement = await focusedAfterShiftTab.evaluate((el: Element) => 
          el === firstElementHandle
        );

        if (!isFirstElement && modalFocusableElements.length > 1) {
          issues.push('Shift+Tab does not cycle to first element in modal');
          passed = false;
        }

        details.push(`Modal has ${modalFocusableElements.length} focusable elements`);
      }

    } catch (error) {
      issues.push(`Error testing modal tab trapping: ${error}`);
      passed = false;
    }

    return {
      element: 'modal',
      testType: 'tab trapping',
      passed,
      issues,
      details: details.join('\n')
    };
  }

  /**
   * Test form tab navigation
   */
  async testFormTabNavigation(): Promise<KeyboardTestResult[]> {
    const results: KeyboardTestResult[] = [];
    const formLocators = await this.page.locator('form').all();

    for (const formLocator of formLocators) {
      const formHandle = await formLocator.elementHandle();
      if (formHandle) {
        const result = await this.testSingleFormTabNavigation(formHandle);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Test tab navigation within a specific form
   */
  async testSingleFormTabNavigation(form: any): Promise<KeyboardTestResult> {
    const issues: string[] = [];
    const details: string[] = [];
    let passed = true;

    try {
      const formInputLocators = await this.page.locator('input, select, textarea, button').all();
      
      const formInputs: any[] = [];
      for (const locator of formInputLocators) {
        const elementHandle = await locator.elementHandle();
        if (elementHandle) {
          formInputs.push(elementHandle);
        }
      }
      
      if (formInputs.length === 0) {
        return {
          element: 'form',
          testType: 'form tab navigation',
          passed: true,
          issues: [],
          details: 'Form has no interactive elements'
        };
      }

      // Test tab order through form elements
      await formInputs[0].focus();
      details.push('Focused first form element');

      for (let i = 0; i < formInputs.length; i++) {
        await this.page.keyboard.press('Tab');
        const focusedElement = await this.page.locator(':focus');
        const nextElementHandle = await formInputs[i + 1]?.evaluate((nextEl: Element) => nextEl);
        const isFocused = await focusedElement.evaluate((el: Element) => 
          el === nextElementHandle
        );

        if (i < formInputs.length - 1 && !isFocused) {
          issues.push(`Tab navigation skipped form element ${i + 1}`);
          passed = false;
        }
      }

      details.push(`Form has ${formInputs.length} interactive elements`);

    } catch (error) {
      issues.push(`Error testing form tab navigation: ${error}`);
      passed = false;
    }

    return {
      element: 'form',
      testType: 'form tab navigation',
      passed,
      issues,
      details: details.join('\n')
    };
  }

  /**
   * Test arrow key navigation for menus and lists
   */
  async testArrowKeyNavigation(): Promise<KeyboardTestResult[]> {
    const results: KeyboardTestResult[] = [];
    
    // Test menu navigation
    const menuLocators = await this.page.locator('[role="menu"], [role="menubar"], [role="tablist"]').all();
    for (const menuLocator of menuLocators) {
      const menuHandle = await menuLocator.elementHandle();
      if (menuHandle) {
        const result = await this.testMenuArrowNavigation(menuHandle);
        results.push(result);
      }
    }

    // Test list navigation
    const listLocators = await this.page.locator('[role="listbox"], [role="tree"], [role="grid"]').all();
    for (const listLocator of listLocators) {
      const listHandle = await listLocator.elementHandle();
      if (listHandle) {
        const result = await this.testListArrowNavigation(listHandle);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Test arrow key navigation for menus
   */
  async testMenuArrowNavigation(menu: any): Promise<KeyboardTestResult> {
    const issues: string[] = [];
    const details: string[] = [];
    let passed = true;

    try {
      const menuItemLocators = await this.page.locator('[role="menuitem"], [role="tab"], [role="option"]').all();
      
      const menuItems: any[] = [];
      for (const locator of menuItemLocators) {
        const elementHandle = await locator.elementHandle();
        if (elementHandle) {
          menuItems.push(elementHandle);
        }
      }
      
      if (menuItems.length === 0) {
        return {
          element: 'menu',
          testType: 'arrow navigation',
          passed: true,
          issues: [],
          details: 'Menu has no items'
        };
      }

      // Focus first menu item
      await menuItems[0].focus();
      details.push('Focused first menu item');

      // Test arrow down navigation
      for (let i = 1; i < menuItems.length; i++) {
        await this.page.keyboard.press('ArrowDown');
        const focusedElement = await this.page.locator(':focus');
        const menuItemHandle = await menuItems[i].evaluate((itemEl: Element) => itemEl);
        const isFocused = await focusedElement.evaluate((el: Element) => 
          el === menuItemHandle
        );

        if (!isFocused) {
          issues.push(`Arrow down navigation failed at item ${i}`);
          passed = false;
        }
      }

      // Test arrow up navigation
      for (let i = menuItems.length - 2; i >= 0; i--) {
        await this.page.keyboard.press('ArrowUp');
        const focusedElement = await this.page.locator(':focus');
        const menuItemHandle = await menuItems[i].evaluate((itemEl: Element) => itemEl);
        const isFocused = await focusedElement.evaluate((el: Element) => 
          el === menuItemHandle
        );

        if (!isFocused) {
          issues.push(`Arrow up navigation failed at item ${i}`);
          passed = false;
        }
      }

      details.push(`Menu has ${menuItems.length} items`);

    } catch (error) {
      issues.push(`Error testing menu arrow navigation: ${error}`);
      passed = false;
    }

    return {
      element: 'menu',
      testType: 'arrow navigation',
      passed,
      issues,
      details: details.join('\n')
    };
  }

  /**
   * Test arrow key navigation for lists
   */
  async testListArrowNavigation(list: any): Promise<KeyboardTestResult> {
    const issues: string[] = [];
    const details: string[] = [];
    let passed = true;

    try {
      const listItemLocators = await this.page.locator('[role="option"], [role="treeitem"], [role="gridcell"]').all();
      
      const listItems: any[] = [];
      for (const locator of listItemLocators) {
        const elementHandle = await locator.elementHandle();
        if (elementHandle) {
          listItems.push(elementHandle);
        }
      }
      
      if (listItems.length === 0) {
        return {
          element: 'list',
          testType: 'arrow navigation',
          passed: true,
          issues: [],
          details: 'List has no items'
        };
      }

      // Focus first list item
      await listItems[0].focus();
      details.push('Focused first list item');

      // Test arrow navigation
      for (let i = 1; i < Math.min(5, listItems.length); i++) {
        await this.page.keyboard.press('ArrowDown');
        const focusedElement = await this.page.locator(':focus');
        const listItemHandle = await listItems[i].evaluate((itemEl: Element) => itemEl);
        const isFocused = await focusedElement.evaluate((el: Element) => 
          el === listItemHandle
        );

        if (!isFocused) {
          issues.push(`Arrow down navigation failed at item ${i}`);
          passed = false;
        }
      }

      details.push(`List has ${listItems.length} items`);

    } catch (error) {
      issues.push(`Error testing list arrow navigation: ${error}`);
      passed = false;
    }

    return {
      element: 'list',
      testType: 'arrow navigation',
      passed,
      issues,
      details: details.join('\n')
    };
  }

  /**
   * Test escape key functionality
   */
  async testEscapeKey(): Promise<KeyboardTestResult[]> {
    const results: KeyboardTestResult[] = [];
    
    // Test escape key on modals
    const modalLocators = await this.page.locator('[role="dialog"], [role="alertdialog"]').all();
    for (const modalLocator of modalLocators) {
      const modalHandle = await modalLocator.elementHandle();
      if (modalHandle) {
        const result = await this.testModalEscapeKey(modalHandle);
        results.push(result);
      }
    }

    // Test escape key on dropdowns
    const dropdownLocators = await this.page.locator('[role="menu"], [role="listbox"]').all();
    for (const dropdownLocator of dropdownLocators) {
      const dropdownHandle = await dropdownLocator.elementHandle();
      if (dropdownHandle) {
        const result = await this.testDropdownEscapeKey(dropdownHandle);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Test escape key on modal
   */
  async testModalEscapeKey(modal: any): Promise<KeyboardTestResult> {
    const issues: string[] = [];
    const details: string[] = [];
    let passed = true;

    try {
      const isVisible = await modal.isVisible();
      if (!isVisible) {
        return {
          element: 'modal',
          testType: 'escape key',
          passed: true,
          issues: [],
          details: 'Modal is not visible, skipping test'
        };
      }

      // Focus modal
      await modal.focus();
      details.push('Focused modal');

      // Press escape key
      await this.page.keyboard.press('Escape');
      
      // Check if modal is still visible (should be closed)
      const stillVisible = await modal.isVisible();
      if (stillVisible) {
        issues.push('Modal did not close on Escape key');
        passed = false;
      } else {
        details.push('Modal closed on Escape key');
      }

    } catch (error) {
      issues.push(`Error testing modal escape key: ${error}`);
      passed = false;
    }

    return {
      element: 'modal',
      testType: 'escape key',
      passed,
      issues,
      details: details.join('\n')
    };
  }

  /**
   * Test escape key on dropdown
   */
  async testDropdownEscapeKey(dropdown: any): Promise<KeyboardTestResult> {
    const issues: string[] = [];
    const details: string[] = [];
    let passed = true;

    try {
      const isVisible = await dropdown.isVisible();
      if (!isVisible) {
        return {
          element: 'dropdown',
          testType: 'escape key',
          passed: true,
          issues: [],
          details: 'Dropdown is not visible, skipping test'
        };
      }

      // Focus dropdown
      await dropdown.focus();
      details.push('Focused dropdown');

      // Press escape key
      await this.page.keyboard.press('Escape');
      
      // Check if dropdown is still visible (should be closed)
      const stillVisible = await dropdown.isVisible();
      if (stillVisible) {
        issues.push('Dropdown did not close on Escape key');
        passed = false;
      } else {
        details.push('Dropdown closed on Escape key');
      }

    } catch (error) {
      issues.push(`Error testing dropdown escape key: ${error}`);
      passed = false;
    }

    return {
      element: 'dropdown',
      testType: 'escape key',
      passed,
      issues,
      details: details.join('\n')
    };
  }

  /**
   * Test focus indicators visibility
   */
  async testFocusIndicators(): Promise<KeyboardTestResult[]> {
    const results: KeyboardTestResult[] = [];
    
    for (const element of this.focusableElements) {
      const result = await this.testElementFocusIndicator(element);
      results.push(result);
    }

    return results;
  }

  /**
   * Test focus indicator for a specific element
   */
  async testElementFocusIndicator(element: any): Promise<KeyboardTestResult> {
    const issues: string[] = [];
    const details: string[] = [];
    let passed = true;

    try {
      // Focus the element
      await element.focus();
      details.push('Focused element');

      // Check if element is focused
      const isFocused = await element.evaluate((el: Element) => el === document.activeElement);
      if (!isFocused) {
        issues.push('Element did not receive focus');
        passed = false;
      }

      // Check focus indicator visibility
      const focusStyles = await element.evaluate((el: Element) => {
        const styles = window.getComputedStyle(el, ':focus');
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
          borderColor: styles.borderColor,
          backgroundColor: styles.backgroundColor
        };
      });

      const hasFocusIndicator = 
        focusStyles.outline !== 'none' || 
        focusStyles.boxShadow !== 'none' ||
        focusStyles.borderColor !== 'rgba(0, 0, 0, 0)' ||
        focusStyles.backgroundColor !== 'rgba(0, 0, 0, 0)';

      if (!hasFocusIndicator) {
        issues.push('Element has no visible focus indicator');
        passed = false;
      } else {
        details.push('Element has visible focus indicator');
      }

    } catch (error) {
      issues.push(`Error testing focus indicator: ${error}`);
      passed = false;
    }

    return {
      element: 'focusable element',
      testType: 'focus indicator',
      passed,
      issues,
      details: details.join('\n')
    };
  }

  /**
   * Run complete keyboard test suite
   */
  async runTestSuite(): Promise<KeyboardTestSuite> {
    this.results = [];

    // Run all test categories
    const tabResults = await this.testTabNavigation();
    const arrowResults = await this.testArrowKeyNavigation();
    const escapeResults = await this.testEscapeKey();
    const focusResults = await this.testFocusIndicators();

    this.results = [
      ...(Array.isArray(tabResults) ? tabResults : [tabResults]),
      ...(Array.isArray(arrowResults) ? arrowResults : []),
      ...(Array.isArray(escapeResults) ? escapeResults : []),
      ...(Array.isArray(focusResults) ? focusResults : [])
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
    let report = `# Keyboard Navigation Test Report\n\n`;
    report += `## Summary\n`;
    report += `- **Total Tests**: ${suite.summary.total}\n`;
    report += `- **Passed**: ${suite.summary.passed}\n`;
    report += `- **Failed**: ${suite.summary.failed}\n`;
    report += `- **Score**: ${suite.summary.score}%\n\n`;

    if (suite.summary.failed > 0) {
      report += `## Failed Tests\n\n`;
      const failedTests = suite.tests.filter(t => !t.passed);
      
      failedTests.forEach(test => {
        report += `### ${test.element} - ${test.testType}\n`;
        report += `- **Issues**: ${test.issues.join(', ')}\n`;
        report += `- **Details**: ${test.details}\n\n`;
      });
    }

    return report;
  }

  private getTestSuite(): KeyboardTestSuite {
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

export default KeyboardTester;
