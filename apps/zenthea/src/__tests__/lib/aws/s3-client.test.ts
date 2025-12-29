import { S3ClientManager } from '@/lib/aws/s3-client';
import { S3Client } from '@aws-sdk/client-s3';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
// import type { MockedFunction } from 'vitest';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock AWS error handler
vi.mock('@/lib/aws/error-handler', () => ({
  AWSRetryHandler: {
    executeWithRetry: vi.fn((fn) => fn()),
  },
  AWSErrorHandler: {
    handleS3Error: vi.fn(),
    logError: vi.fn(),
    isRetryable: vi.fn(),
    getRetryDelay: vi.fn(),
    formatErrorResponse: vi.fn(),
  },
}));

describe('S3ClientManager', () => {
  let mockS3Client: any;

  beforeEach(() => {
    // Set up environment variables
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_S3_BUCKET = 'test-bucket';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';

    // Create a mock S3Client instance
    mockS3Client = {
      send: vi.fn(),
    };

    // Mock the S3Client constructor to return our mock
    (S3Client as any).mockImplementation(() => mockS3Client);
    
    // Clear the static client cache
    (S3ClientManager as any).s3Client = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateCredentials', () => {
    it('should return true for valid credentials', () => {
      const result = S3ClientManager.validateCredentials();
      expect(result).toBe(true);
    });

    it('should return false for missing credentials', () => {
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      
      const result = S3ClientManager.validateCredentials();
      expect(result).toBe(false);
    });
  });

  describe('generateImageKey', () => {
    it('should generate unique keys with timestamp', () => {
      // Mock Date.now to return different values
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = vi.fn(() => {
        callCount++;
        return 1000000000000 + callCount;
      });

      const key1 = S3ClientManager.generateImageKey('test.jpg', 'hero');
      const key2 = S3ClientManager.generateImageKey('test.jpg', 'hero');
      
      expect(key1).toMatch(/^images\/hero\/\d+-test\.jpg$/);
      expect(key2).toMatch(/^images\/hero\/\d+-test\.jpg$/);
      // Keys should be different due to timestamp
      expect(key1).not.toEqual(key2);

      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it('should sanitize filename', () => {
      const key = S3ClientManager.generateImageKey('test file with spaces.jpg', 'assets');
      expect(key).toMatch(/^images\/assets\/\d+-test-file-with-spaces\.jpg$/);
    });

    it('should use correct category', () => {
      const heroKey = S3ClientManager.generateImageKey('hero.jpg', 'hero');
      const assetsKey = S3ClientManager.generateImageKey('asset.jpg', 'assets');
      const medicalKey = S3ClientManager.generateImageKey('medical.jpg', 'medical');
      
      expect(heroKey).toContain('images/hero/');
      expect(assetsKey).toContain('images/assets/');
      expect(medicalKey).toContain('images/medical/');
    });
  });

  describe('uploadImage', () => {
    it.skip('should handle file upload with proper content type', async () => {
      // This test is temporarily skipped due to ArrayBuffer mocking issues
      // TODO: Fix ArrayBuffer mocking in Jest
      const mockArrayBuffer = new ArrayBuffer(12);
      const view = new Uint8Array(mockArrayBuffer);
      view.set([116, 101, 115, 116, 32, 99, 111, 110, 116, 101, 110, 116]); // "test content"
      
      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
        name: 'test.jpg',
        type: 'image/jpeg',
        size: 8
      } as any;
      
      const mockResult = { ETag: '"test-etag"' };
      mockS3Client.send.mockResolvedValue(mockResult);

      const result = await S3ClientManager.uploadImage(
        mockFile,
        'images/hero/test.jpg',
        'test-bucket'
      );

      expect(result).toEqual({
        url: 'http://localhost:3000/api/serve-image?key=images%2Fhero%2Ftest.jpg',
        key: 'images/hero/test.jpg',
        bucket: 'test-bucket',
        etag: '"test-etag"'
      });
      expect(mockFile.arrayBuffer).toHaveBeenCalled();
    });

    it('should handle buffer upload', async () => {
      const mockBuffer = Buffer.from('test content');
      const mockResult = { ETag: '"test-etag"' };
      
      mockS3Client.send.mockResolvedValue(mockResult);

      const result = await S3ClientManager.uploadImage(
        mockBuffer,
        'images/assets/test.png',
        'test-bucket'
      );

      expect(result.url).toContain('/api/serve-image?key=');
      expect(result.key).toBe('images/assets/test.png');
    });
  });

  describe('delete', () => {
    it('should delete object from S3', async () => {
      mockS3Client.send.mockResolvedValue({});

      await S3ClientManager.delete('test-bucket', 'images/hero/test.jpg');

      expect(mockS3Client.send).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should get object from S3', async () => {
      const mockBuffer = Buffer.from('test content');
      const mockResult = {
        Body: {
          [Symbol.asyncIterator]: async function* () {
            yield mockBuffer;
          }
        }
      };
      
      mockS3Client.send.mockResolvedValue(mockResult);

      const result = await S3ClientManager.get('test-bucket', 'images/hero/test.jpg');

      expect(result).toEqual(mockBuffer);
      expect(mockS3Client.send).toHaveBeenCalled();
    });
  });
});