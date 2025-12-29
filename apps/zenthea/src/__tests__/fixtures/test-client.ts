// Test client utilities for API testing
// import { vi } from 'vitest'; // Removed unused import

export class TestClient {
  private baseURL = 'http://localhost:3000';
  private defaultHeaders = {
    'Content-Type': 'application/json',
  };

  async get(endpoint: string, options: { headers?: Record<string, string> } = {}) {
    // Mock fetch response
    const headers = { ...this.defaultHeaders, ...options.headers };
    console.log(`GET ${endpoint} with headers:`, headers);
    
    const mockResponse = {
      status: 200,
      ok: true,
      json: async () => ({}),
      text: async () => '',
    };

    return mockResponse;
  }

  async post(endpoint: string, data: unknown, options: { headers?: Record<string, string> } = {}) {
    // Mock fetch response
    const headers = { ...this.defaultHeaders, ...options.headers };
    console.log(`POST ${endpoint} with headers:`, headers, 'data:', data);
    
    const mockResponse = {
      status: 201,
      ok: true,
      json: async () => ({ success: true, data }),
      text: async () => '',
    };

    return mockResponse;
  }

  async put(endpoint: string, data: unknown, options: { headers?: Record<string, string> } = {}) {
    // Mock fetch response
    const headers = { ...this.defaultHeaders, ...options.headers };
    console.log(`PUT ${endpoint} with headers:`, headers, 'data:', data);
    
    const mockResponse = {
      status: 200,
      ok: true,
      json: async () => ({ success: true, data }),
      text: async () => '',
    };

    return mockResponse;
  }

  async delete(endpoint: string, options: { headers?: Record<string, string> } = {}) {
    // Mock fetch response
    const headers = { ...this.defaultHeaders, ...options.headers };
    console.log(`DELETE ${endpoint} with headers:`, headers);
    
    const mockResponse = {
      status: 204,
      ok: true,
      json: async () => ({}),
      text: async () => '',
    };

    return mockResponse;
  }

  // Authentication helpers
  async getPatientToken(tenantId: string = 'demo-tenant-123') {
    console.log(`Getting patient token for tenant: ${tenantId}`);
    return 'mock.patient.jwt.token';
  }

  async getProviderToken(tenantId: string = 'demo-tenant-123') {
    console.log(`Getting provider token for tenant: ${tenantId}`);
    return 'mock.provider.jwt.token';
  }

  async getAdminToken(tenantId: string = 'demo-tenant-123') {
    console.log(`Getting admin token for tenant: ${tenantId}`);
    return 'mock.admin.jwt.token';
  }

  // Test setup helpers
  async setup() {
    // Setup test environment
  }

  async cleanup() {
    // Cleanup test environment
  }

  async setupTenant(tenantId: string) {
    // Setup tenant for testing
    return {
      tenantId,
      name: `Test Tenant ${tenantId}`,
      status: 'active'
    };
  }

  async createMockPatients(tenantId: string, count: number) {
    // Create mock patients for testing
    return Array.from({ length: count }, (_, i) => ({
      id: `patient-${tenantId}-${i}`,
      email: `patient${i}@${tenantId}.com`,
      firstName: `Patient${i}`,
      lastName: 'Test',
      tenantId
    }));
  }

  async createMockProviders(tenantId: string, count: number) {
    // Create mock providers for testing
    return Array.from({ length: count }, (_, i) => ({
      id: `provider-${tenantId}-${i}`,
      name: `Dr. Provider${i}`,
      specialty: 'Internal Medicine',
      tenantId
    }));
  }

  async createMockAppointments(tenantId: string, patients: unknown[], providers: unknown[]) {
    // Create mock appointments for testing
    console.log(`Creating mock appointments for tenant: ${tenantId}, patients: ${patients.length}, providers: ${providers.length}`);
    return [];
  }

  async deleteTenant(tenantId: string) {
    // Delete tenant and all associated data
    console.log(`Deleting tenant: ${tenantId}`);
  }

  async getDatabaseRecord(table: string, id: string) {
    // Get database record for verification
    console.log(`Getting database record from table: ${table}, id: ${id}`);
    return {};
  }
}

export const testClient = new TestClient();
