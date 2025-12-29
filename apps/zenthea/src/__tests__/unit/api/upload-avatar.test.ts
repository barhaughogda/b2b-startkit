import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/upload-avatar/route';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getToken } from 'next-auth/jwt';
import { MAX_AVATAR_SIZE, ALLOWED_AVATAR_TYPES } from '@/lib/avatar-constants';

// Mock dependencies
vi.mock('next-auth/jwt');
vi.mock('@aws-sdk/client-s3');
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    log: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock NextResponse
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server');
  return {
    ...actual,
    NextResponse: {
      json: (data: any, init?: ResponseInit) => {
        return new Response(JSON.stringify(data), {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
          },
        });
      },
    },
  };
});

// Mock apiErrors
vi.mock('@/lib/api-errors', () => ({
  apiErrors: {
    unauthorized: (message: string, debug?: Record<string, unknown>) => {
      return new Response(JSON.stringify({ error: 'Unauthorized', message, ...(debug && { debug }) }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    },
    forbidden: (message: string, debug?: Record<string, unknown>) => {
      return new Response(JSON.stringify({ error: 'Forbidden', message, ...(debug && { debug }) }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    },
    badRequest: (message: string, debug?: Record<string, unknown>) => {
      return new Response(JSON.stringify({ error: 'Bad Request', message, ...(debug && { debug }) }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    },
    configError: (message: string, debug?: Record<string, unknown>) => {
      return new Response(JSON.stringify({ error: 'Configuration Error', message, ...(debug && { debug }) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    },
    serverError: (message: string, debug?: Record<string, unknown>) => {
      return new Response(JSON.stringify({ error: 'Server Error', message, ...(debug && { debug }) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  },
}));

describe('POST /api/upload-avatar', () => {
  const mockS3Send = vi.fn();
  const mockPutObjectCommand = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment variables
    process.env.NEXTAUTH_SECRET = 'test-secret';
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_S3_BUCKET = 'test-bucket';
    process.env.NEXTAUTH_URL = 'https://app.zenthea.ai';

    // Mock S3Client
    vi.mocked(S3Client).mockImplementation(() => ({
      send: mockS3Send,
    } as any));

    // Mock PutObjectCommand
    vi.mocked(PutObjectCommand).mockImplementation((params: any) => {
      mockPutObjectCommand(params);
      return {} as any;
    });

    // Mock successful S3 upload
    mockS3Send.mockResolvedValue({ ETag: 'test-etag' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockRequest = (role: string, file?: File): NextRequest => {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }

    const request = new NextRequest('http://localhost:3000/api/upload-avatar', {
      method: 'POST',
      headers: {
        cookie: 'next-auth.session-token=test-token',
      },
    }) as any;

    // Mock formData() method
    request.formData = vi.fn().mockResolvedValue(formData);

    // Mock getToken
    vi.mocked(getToken).mockResolvedValue({
      sub: 'test-user-id',
      role: role as any,
      email: 'test@example.com',
    } as any);

    return request;
  };

  const createMockFile = (name: string = 'avatar.jpg', size: number = 1024): File => {
    const file = new File(['test content'], name, { type: 'image/jpeg' });
    // Override the size property since File constructor doesn't accept size option
    Object.defineProperty(file, 'size', {
      value: size,
      writable: false,
      configurable: true,
    });
    return file;
  };

  describe('Role Validation', () => {
    it('should allow patient role to upload avatar', async () => {
      const file = createMockFile();
      const request = createMockRequest('patient', file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.key).toContain('images/avatars/patient/test-user-id/');
    });

    it('should allow provider role to upload avatar', async () => {
      const file = createMockFile();
      const request = createMockRequest('provider', file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Provider role is normalized to 'clinic' for S3 organization
      expect(data.key).toContain('images/avatars/clinic/test-user-id/');
    });

    it('should allow admin role to upload avatar', async () => {
      const file = createMockFile();
      const request = createMockRequest('admin', file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Admin role is normalized to 'clinic' for S3 organization
      expect(data.key).toContain('images/avatars/clinic/test-user-id/');
    });

    it('should allow clinic_user role to upload avatar', async () => {
      const file = createMockFile();
      const request = createMockRequest('clinic_user', file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // clinic_user role is normalized to 'clinic' for S3 organization
      expect(data.key).toContain('images/avatars/clinic/test-user-id/');
    });

    it('should allow super_admin role to upload avatar', async () => {
      const file = createMockFile();
      const request = createMockRequest('super_admin', file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // super_admin role is normalized to 'admin' for S3 organization
      expect(data.key).toContain('images/avatars/admin/test-user-id/');
    });

    it('should allow any authenticated user to upload avatar', async () => {
      const file = createMockFile();
      const request = createMockRequest('invalid-role', file);

      const response = await POST(request);
      const data = await response.json();

      // All authenticated users can upload avatars, regardless of role
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Unknown roles default to their role name or 'patient'
      expect(data.key).toContain('images/avatars/');
    });

    it('should handle missing role gracefully', async () => {
      const file = createMockFile();
      const request = createMockRequest('patient', file);

      // Mock token without role
      vi.mocked(getToken).mockResolvedValue({
        sub: 'test-user-id',
        email: 'test@example.com',
      } as any);

      const response = await POST(request);
      const data = await response.json();

      // Should default to 'patient' role when role is missing
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.key).toContain('images/avatars/patient/test-user-id/');
    });
  });

  describe('S3 Path Organization', () => {
    it('should organize patient avatars in patient directory', async () => {
      const file = createMockFile('patient-avatar.jpg');
      const request = createMockRequest('patient', file);

      const response = await POST(request);
      const data = await response.json();

      expect(data.key).toMatch(/^images\/avatars\/patient\/test-user-id\/\d+-patient-avatar\.jpg$/);
    });

    it('should organize provider avatars in provider directory', async () => {
      const file = createMockFile('provider-avatar.jpg');
      const request = createMockRequest('provider', file);

      const response = await POST(request);
      const data = await response.json();

      expect(data.key).toMatch(/^images\/avatars\/provider\/test-user-id\/\d+-provider-avatar\.jpg$/);
    });

    it('should include timestamp in filename', async () => {
      const file = createMockFile('avatar.jpg');
      const request = createMockRequest('patient', file);

      const response = await POST(request);
      const data = await response.json();

      const timestamp = Date.now();
      const keyParts = data.key.split('/');
      const filename = keyParts[keyParts.length - 1];
      const fileTimestamp = parseInt(filename.split('-')[0]);

      // Timestamp should be within last 5 seconds
      expect(timestamp - fileTimestamp).toBeLessThan(5000);
    });
  });

  describe('S3 Metadata', () => {
    it('should include userRole in S3 metadata for patient', async () => {
      const file = createMockFile();
      const request = createMockRequest('patient', file);

      await POST(request);

      expect(mockPutObjectCommand).toHaveBeenCalled();
      const commandParams = mockPutObjectCommand.mock.calls[0][0];
      expect(commandParams.Metadata.userRole).toBe('patient');
      expect(commandParams.Metadata.type).toBe('patient-avatar');
    });

    it('should include userRole in S3 metadata for provider', async () => {
      const file = createMockFile();
      const request = createMockRequest('provider', file);

      await POST(request);

      expect(mockPutObjectCommand).toHaveBeenCalled();
      const commandParams = mockPutObjectCommand.mock.calls[0][0];
      expect(commandParams.Metadata.userRole).toBe('provider');
      expect(commandParams.Metadata.type).toBe('provider-avatar');
    });

    it('should include userId in S3 metadata', async () => {
      const file = createMockFile();
      const request = createMockRequest('patient', file);

      await POST(request);

      expect(mockPutObjectCommand).toHaveBeenCalled();
      const commandParams = mockPutObjectCommand.mock.calls[0][0];
      expect(commandParams.Metadata.userId).toBe('test-user-id');
    });
  });

  describe('Authentication', () => {
    it('should reject request without authentication token', async () => {
      const file = createMockFile();
      const request = createMockRequest('patient', file);

      vi.mocked(getToken).mockResolvedValue(null);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toContain('Please sign in');
    });

    it('should reject request without user ID', async () => {
      const file = createMockFile();
      const request = createMockRequest('patient', file);

      vi.mocked(getToken).mockResolvedValue({
        role: 'patient',
        email: 'test@example.com',
      } as any);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('File Validation', () => {
    it('should reject request without file', async () => {
      const request = createMockRequest('patient');

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad Request');
      expect(data.message).toBe('No file provided');
    });

    it('should reject invalid file types', async () => {
      const file = new File(['test'], 'test.exe', { type: 'application/x-executable' });
      const request = createMockRequest('patient', file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad Request');
      expect(data.message).toContain('Invalid file type');
    });

    it('should accept valid image types', async () => {
      for (const type of ALLOWED_AVATAR_TYPES) {
        const file = new File(['test'], `test.${type.split('/')[1]}`, { type });
        const request = createMockRequest('patient', file);

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it('should reject files exceeding size limit', async () => {
      const largeFile = createMockFile('large.jpg', MAX_AVATAR_SIZE + 1);
      const request = createMockRequest('patient', largeFile);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad Request');
      expect(data.message).toContain('File too large');
    });

    it('should accept files within size limit', async () => {
      const file = createMockFile('avatar.jpg', MAX_AVATAR_SIZE);
      const request = createMockRequest('patient', file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('AWS Configuration', () => {
    it('should reject request when AWS credentials are missing', async () => {
      const originalAccessKey = process.env.AWS_ACCESS_KEY_ID;
      const originalSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;

      const file = createMockFile();
      const request = createMockRequest('patient', file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Configuration Error');
      expect(data.message).toContain('AWS credentials');

      // Restore for other tests
      process.env.AWS_ACCESS_KEY_ID = originalAccessKey;
      process.env.AWS_SECRET_ACCESS_KEY = originalSecretKey;
    });

    it('should reject request when S3 bucket is not configured', async () => {
      const originalBucket = process.env.AWS_S3_BUCKET;
      delete process.env.AWS_S3_BUCKET;

      const file = createMockFile();
      const request = createMockRequest('patient', file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Configuration Error');
      expect(data.message).toContain('S3 bucket');

      // Restore for other tests
      process.env.AWS_S3_BUCKET = originalBucket;
    });
  });

  describe('Response Format', () => {
    it('should return correct response format for successful upload', async () => {
      const file = createMockFile('avatar.jpg', 2048);
      const request = createMockRequest('patient', file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        url: expect.stringContaining('/api/serve-image?key='),
        key: expect.stringMatching(/^images\/avatars\/patient\/test-user-id\/\d+-avatar\.jpg$/),
        bucket: 'test-bucket',
        originalName: 'avatar.jpg',
        size: 2048,
      });
    });

    it('should generate correct serving URL', async () => {
      const file = createMockFile();
      const request = createMockRequest('provider', file);

      const response = await POST(request);
      const data = await response.json();

      expect(data.url).toContain('https://app.zenthea.ai/api/serve-image?key=');
      expect(data.url).toContain(encodeURIComponent(data.key));
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain backward compatibility with patient uploads', async () => {
      const file = createMockFile('patient-avatar.jpg');
      const request = createMockRequest('patient', file);

      const response = await POST(request);
      const data = await response.json();

      // Should still work exactly as before
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.key).toContain('images/avatars/patient/');
    });

    it('should default to patient role when role is undefined', async () => {
      const file = createMockFile();
      
      // Set up mock BEFORE creating request (so override takes effect)
      vi.mocked(getToken).mockResolvedValue({
        sub: 'test-user-id',
        email: 'test@example.com',
        // role is undefined - this is what we're testing
      } as any);

      // Create request without calling createMockRequest (which would set role)
      const formData = new FormData();
      formData.append('file', file);
      const request = new NextRequest('http://localhost:3000/api/upload-avatar', {
        method: 'POST',
        headers: {
          cookie: 'next-auth.session-token=test-token',
        },
      }) as any;
      request.formData = vi.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should default to patient
      expect(data.key).toContain('images/avatars/patient/');
    });
  });
});

