/**
 * AWS Error Handling Utilities
 * 
 * Provides comprehensive error handling for AWS operations
 * with user-friendly error messages and proper logging
 */

import { S3Client, S3ServiceException } from '@aws-sdk/client-s3';
import { CloudFrontClient, CloudFrontServiceException } from '@aws-sdk/client-cloudfront';
import { logger } from '@/lib/logger';

export interface AWSError {
  code: string;
  message: string;
  statusCode: number;
  retryable: boolean;
  userMessage: string;
}

export class AWSErrorHandler {
  /**
   * Handle S3 operation errors with comprehensive error mapping
   * 
   * @param error - The error object from S3 operations
   * @returns AWSError object with user-friendly message and retry information
   * 
   * @example
   * ```typescript
   * try {
   *   await s3Client.putObject(params);
   * } catch (error) {
   *   const awsError = AWSErrorHandler.handleS3Error(error);
   *   console.log(awsError.userMessage); // User-friendly message
   * }
   * ```
   */
  static handleS3Error(error: unknown): AWSError {
    if (error instanceof S3ServiceException) {
      switch (error.name) {
        case 'NoSuchBucket':
          return {
            code: 'BUCKET_NOT_FOUND',
            message: error.message,
            statusCode: 404,
            retryable: false,
            userMessage: 'Image storage bucket not found. Please contact support.'
          };
        
        case 'AccessDenied':
          return {
            code: 'ACCESS_DENIED',
            message: error.message,
            statusCode: 403,
            retryable: false,
            userMessage: 'Access denied to image storage. Please check your permissions.'
          };
        
        case 'InvalidAccessKeyId':
          return {
            code: 'INVALID_CREDENTIALS',
            message: error.message,
            statusCode: 401,
            retryable: false,
            userMessage: 'Invalid AWS credentials. Please contact support.'
          };
        
        case 'SignatureDoesNotMatch':
          return {
            code: 'INVALID_SIGNATURE',
            message: error.message,
            statusCode: 401,
            retryable: false,
            userMessage: 'AWS signature verification failed. Please contact support.'
          };
        
        case 'RequestTimeout':
          return {
            code: 'REQUEST_TIMEOUT',
            message: error.message,
            statusCode: 408,
            retryable: true,
            userMessage: 'Request timed out. Please try again.'
          };
        
        case 'ServiceUnavailable':
          return {
            code: 'SERVICE_UNAVAILABLE',
            message: error.message,
            statusCode: 503,
            retryable: true,
            userMessage: 'Image storage service is temporarily unavailable. Please try again later.'
          };
        
        case 'ThrottlingException':
          return {
            code: 'RATE_LIMITED',
            message: error.message,
            statusCode: 429,
            retryable: true,
            userMessage: 'Too many requests. Please wait a moment and try again.'
          };
        
        case 'InvalidParameterValue':
          return {
            code: 'INVALID_PARAMETER',
            message: error.message,
            statusCode: 400,
            retryable: false,
            userMessage: 'Invalid image parameters. Please check your upload settings.'
          };
        
        case 'EntityTooLarge':
          return {
            code: 'FILE_TOO_LARGE',
            message: error.message,
            statusCode: 413,
            retryable: false,
            userMessage: 'Image file is too large. Please reduce the file size and try again.'
          };
        
        default:
          return {
            code: 'S3_ERROR',
            message: error.message,
            statusCode: 500,
            retryable: true,
            userMessage: 'Image upload failed. Please try again.'
          };
      }
    }
    
    // Handle non-S3 errors
    if (error instanceof Error) {
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message,
        statusCode: 500,
        retryable: true,
        userMessage: 'An unexpected error occurred. Please try again.'
      };
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Unknown error occurred',
      statusCode: 500,
      retryable: true,
      userMessage: 'An unexpected error occurred. Please try again.'
    };
  }
  
  /**
   * Handle CloudFront operation errors with comprehensive error mapping
   * 
   * @param error - The error object from CloudFront operations
   * @returns AWSError object with user-friendly message and retry information
   * 
   * @example
   * ```typescript
   * try {
   *   await cloudFrontClient.createInvalidation(params);
   * } catch (error) {
   *   const awsError = AWSErrorHandler.handleCloudFrontError(error);
   *   console.log(awsError.userMessage); // User-friendly message
   * }
   * ```
   */
  static handleCloudFrontError(error: unknown): AWSError {
    if (error instanceof CloudFrontServiceException) {
      switch (error.name) {
        case 'NoSuchDistribution':
          return {
            code: 'DISTRIBUTION_NOT_FOUND',
            message: error.message,
            statusCode: 404,
            retryable: false,
            userMessage: 'CDN distribution not found. Please contact support.'
          };
        
        case 'AccessDenied':
          return {
            code: 'CDN_ACCESS_DENIED',
            message: error.message,
            statusCode: 403,
            retryable: false,
            userMessage: 'Access denied to CDN. Please check your permissions.'
          };
        
        case 'InvalidArgument':
          return {
            code: 'INVALID_CDN_ARGUMENT',
            message: error.message,
            statusCode: 400,
            retryable: false,
            userMessage: 'Invalid CDN configuration. Please contact support.'
          };
        
        default:
          return {
            code: 'CLOUDFRONT_ERROR',
            message: error.message,
            statusCode: 500,
            retryable: true,
            userMessage: 'CDN operation failed. Please try again.'
          };
      }
    }
    
    return this.handleS3Error(error);
  }
  
  /**
   * Log AWS errors with appropriate level
   */
  static logError(error: AWSError, context: string, metadata?: Record<string, unknown>): void {
    const logData = {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      retryable: error.retryable,
      context,
      ...metadata
    };
    
    if (error.statusCode >= 500) {
      logger.error('AWS service error', JSON.stringify(logData));
    } else if (error.statusCode >= 400) {
      logger.warn('AWS client error', JSON.stringify(logData));
    } else {
      logger.info('AWS operation completed', JSON.stringify(logData));
    }
  }
  
  /**
   * Check if error is retryable
   */
  static isRetryable(error: AWSError): boolean {
    return error.retryable;
  }
  
  /**
   * Get retry delay based on error type
   */
  static getRetryDelay(error: AWSError, attempt: number): number {
    if (!this.isRetryable(error)) {
      return 0;
    }
    
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    
    return delay + jitter;
  }
  
  /**
   * Format error for API response
   */
  static formatErrorResponse(error: AWSError): {
    error: string;
    code: string;
    retryable: boolean;
    statusCode: number;
  } {
    return {
      error: error.userMessage,
      code: error.code,
      retryable: error.retryable,
      statusCode: error.statusCode
    };
  }
}

/**
 * Retry utility for AWS operations
 */
export class AWSRetryHandler {
  private static readonly MAX_RETRIES = 3;
  
  /**
   * Execute operation with retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    let lastError: AWSError | null = null;
    
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const awsError = AWSErrorHandler.handleS3Error(error);
        AWSErrorHandler.logError(awsError, context, { attempt, ...metadata });
        
        lastError = awsError;
        
        if (!AWSErrorHandler.isRetryable(awsError) || attempt === this.MAX_RETRIES) {
          break;
        }
        
        const delay = AWSErrorHandler.getRetryDelay(awsError, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    if (lastError) {
      throw new Error(lastError.userMessage);
    }
    
    throw new Error('Operation failed after maximum retries');
  }
}
