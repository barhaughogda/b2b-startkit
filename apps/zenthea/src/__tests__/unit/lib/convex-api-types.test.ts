import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FunctionReference } from 'convex/server';
import {
  hasApiNamespace,
  hasApiFunction,
  getApiFunction,
  getApiNamespace,
  getPatientProfileApi,
  assertApiNamespace,
  type PatientProfileApi,
} from '@/lib/convex-api-types';

describe('convex-api-types', () => {
  describe('hasApiNamespace', () => {
    it('should return true when namespace exists', () => {
      const api = {
        providers: {
          getProvider: {} as FunctionReference<any, any>,
        },
        patients: {
          getPatient: {} as FunctionReference<any, any>,
        },
      };

      expect(hasApiNamespace(api, 'providers')).toBe(true);
      expect(hasApiNamespace(api, 'patients')).toBe(true);
    });

    it('should return false when namespace does not exist', () => {
      const api = {
        providers: {
          getProvider: {} as FunctionReference<any, any>,
        },
      };

      expect(hasApiNamespace(api, 'nonexistent')).toBe(false);
      expect(hasApiNamespace(api, 'patients')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(hasApiNamespace(null, 'providers')).toBe(false);
      expect(hasApiNamespace(undefined, 'providers')).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(hasApiNamespace('string', 'providers')).toBe(false);
      expect(hasApiNamespace(123, 'providers')).toBe(false);
      expect(hasApiNamespace([], 'providers')).toBe(false);
    });
  });

  describe('hasApiFunction', () => {
    it('should return true when function exists in namespace', () => {
      const namespace = {
        getProvider: {} as FunctionReference<any, any>,
        createProvider: {} as FunctionReference<any, any>,
      };

      expect(hasApiFunction(namespace, 'getProvider')).toBe(true);
      expect(hasApiFunction(namespace, 'createProvider')).toBe(true);
    });

    it('should return false when function does not exist', () => {
      const namespace = {
        getProvider: {} as FunctionReference<any, any>,
      };

      expect(hasApiFunction(namespace, 'nonexistent')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(hasApiFunction(null, 'getProvider')).toBe(false);
      expect(hasApiFunction(undefined, 'getProvider')).toBe(false);
    });
  });

  describe('getApiFunction', () => {
    it('should return function reference when it exists', () => {
      const mockFunction = {} as FunctionReference<any, any>;
      const api = {
        providers: {
          getProvider: mockFunction,
        },
      };

      const result = getApiFunction(api, 'providers', 'getProvider');
      expect(result).toBe(mockFunction);
    });

    it('should return undefined when namespace does not exist', () => {
      const api = {
        providers: {
          getProvider: {} as FunctionReference<any, any>,
        },
      };

      const result = getApiFunction(api, 'nonexistent', 'getProvider');
      expect(result).toBeUndefined();
    });

    it('should return undefined when function does not exist', () => {
      const api = {
        providers: {
          getProvider: {} as FunctionReference<any, any>,
        },
      };

      const result = getApiFunction(api, 'providers', 'nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getApiNamespace', () => {
    it('should return namespace when it exists', () => {
      const namespace = {
        getProvider: {} as FunctionReference<any, any>,
        createProvider: {} as FunctionReference<any, any>,
      };
      const api = {
        providers: namespace,
      };

      const result = getApiNamespace(api, 'providers');
      expect(result).toBe(namespace);
    });

    it('should return undefined when namespace does not exist', () => {
      const api = {
        providers: {
          getProvider: {} as FunctionReference<any, any>,
        },
      };

      const result = getApiNamespace(api, 'nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getPatientProfileApi', () => {
    it('should return PatientProfileApi when patientProfile namespace exists', () => {
      const patientProfileApi: PatientProfileApi = {
        findPatientByEmail: {} as FunctionReference<'query', 'public'>,
        getPatientProfile: {} as FunctionReference<'query', 'public'>,
      };
      const api = {
        patientProfile: patientProfileApi,
      };

      const result = getPatientProfileApi(api);
      expect(result).toEqual(patientProfileApi);
    });

    it('should return undefined when patientProfile namespace does not exist', () => {
      const api = {
        providers: {
          getProvider: {} as FunctionReference<any, any>,
        },
      };

      const result = getPatientProfileApi(api);
      expect(result).toBeUndefined();
    });
  });

  describe('assertApiNamespace', () => {
    it('should return namespace when it exists', () => {
      const namespace = {
        getProvider: {} as FunctionReference<any, any>,
      };
      const api = {
        providers: namespace,
      };

      const result = assertApiNamespace(api, 'providers');
      expect(result).toBe(namespace);
    });

    it('should return undefined when namespace does not exist', () => {
      const api = {
        providers: {
          getProvider: {} as FunctionReference<any, any>,
        },
      };

      const result = assertApiNamespace(api, 'nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('PatientProfileApi type', () => {
    it('should accept valid PatientProfileApi structure', () => {
      const api: PatientProfileApi = {
        findPatientByEmail: {} as FunctionReference<'query', 'public'>,
        getPatientProfile: {} as FunctionReference<'query', 'public'>,
        updatePatientProfile: {} as FunctionReference<'mutation', 'public'>,
        updatePatientAvatar: {} as FunctionReference<'mutation', 'public'>,
      };

      expect(api).toBeDefined();
      expect(api.findPatientByEmail).toBeDefined();
      expect(api.getPatientProfile).toBeDefined();
      expect(api.updatePatientProfile).toBeDefined();
    });

    it('should allow partial PatientProfileApi', () => {
      const partialApi: PatientProfileApi = {
        findPatientByEmail: {} as FunctionReference<'query', 'public'>,
      };

      expect(partialApi).toBeDefined();
      expect(partialApi.findPatientByEmail).toBeDefined();
      expect(partialApi.getPatientProfile).toBeUndefined();
    });
  });
});

