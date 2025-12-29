/**
 * Convex API Type Utilities
 * 
 * Provides type-safe access to Convex API functions, reducing the need for `as any` casts.
 * Handles cases where the Convex API may not be fully generated or available.
 */

import type { FunctionReference } from 'convex/server';
import type { api as GeneratedApi } from '../../convex/_generated/api';

/**
 * Type representing the Convex API structure
 * Uses the generated API type when available, otherwise falls back to a more permissive type
 */
export type ConvexApi = typeof GeneratedApi;

/**
 * Type guard to check if an API object has a specific namespace
 */
export function hasApiNamespace<T extends string>(
  api: unknown,
  namespace: T
): api is { [K in T]: Record<string, FunctionReference<any, any>> } {
  return (
    typeof api === 'object' &&
    api !== null &&
    namespace in api &&
    typeof (api as Record<string, unknown>)[namespace] === 'object'
  );
}

/**
 * Type guard to check if an API namespace has a specific function
 */
export function hasApiFunction(
  apiNamespace: unknown,
  functionName: string
): apiNamespace is Record<string, FunctionReference<any, any>> {
  return (
    typeof apiNamespace === 'object' &&
    apiNamespace !== null &&
    functionName in apiNamespace
  );
}

/**
 * Safely access a Convex API function
 * Returns the function reference if it exists, otherwise returns undefined
 * 
 * @example
 * ```ts
 * const findPatientByEmail = getApiFunction(api, 'patientProfile', 'findPatientByEmail');
 * if (findPatientByEmail) {
 *   const result = useQuery(findPatientByEmail, args);
 * }
 * ```
 */
export function getApiFunction<
  TNamespace extends string,
  TFunction extends string
>(
  api: unknown,
  namespace: TNamespace,
  functionName: TFunction
): FunctionReference<any, any> | undefined {
  if (!hasApiNamespace(api, namespace)) {
    return undefined;
  }
  
  const namespaceObj = (api as Record<string, unknown>)[namespace];
  if (!hasApiFunction(namespaceObj, functionName)) {
    return undefined;
  }
  
  return (namespaceObj as Record<string, FunctionReference<any, any>>)[functionName];
}

/**
 * Safely access a Convex API namespace
 * Returns the namespace object if it exists, otherwise returns undefined
 * 
 * @example
 * ```ts
 * const patientProfileApi = getApiNamespace(api, 'patientProfile');
 * if (patientProfileApi?.findPatientByEmail) {
 *   const result = useQuery(patientProfileApi.findPatientByEmail, args);
 * }
 * ```
 */
export function getApiNamespace<TNamespace extends string>(
  api: unknown,
  namespace: TNamespace
): Record<string, FunctionReference<any, any>> | undefined {
  if (!hasApiNamespace(api, namespace)) {
    return undefined;
  }
  
  return (api as Record<string, unknown>)[namespace] as Record<string, FunctionReference<any, any>>;
}

/**
 * Type-safe wrapper for accessing patientProfile API functions
 * This namespace may not be in generated types if codegen was skipped
 * 
 * Note: FunctionReference signature is FunctionReference<FunctionType, Visibility>
 * where FunctionType is 'query' | 'mutation' | 'action' and Visibility is 'public' | 'internal'
 */
export type PatientProfileApi = {
  findPatientByEmail?: FunctionReference<'query', 'public'>;
  getPatientProfile?: FunctionReference<'query', 'public'>;
  updatePatientProfile?: FunctionReference<'mutation', 'public'>;
  updatePatientAvatar?: FunctionReference<'mutation', 'public'>;
  addAllergy?: FunctionReference<'mutation', 'public'>;
  removeAllergy?: FunctionReference<'mutation', 'public'>;
  addEmergencyContact?: FunctionReference<'mutation', 'public'>;
  removeEmergencyContact?: FunctionReference<'mutation', 'public'>;
  addFamilyHistory?: FunctionReference<'mutation', 'public'>;
  removeFamilyHistory?: FunctionReference<'mutation', 'public'>;
  addImmunization?: FunctionReference<'mutation', 'public'>;
  removeImmunization?: FunctionReference<'mutation', 'public'>;
  addMedication?: FunctionReference<'mutation', 'public'>;
  removeMedication?: FunctionReference<'mutation', 'public'>;
  updateDemographics?: FunctionReference<'mutation', 'public'>;
  updateMedicalHistory?: FunctionReference<'mutation', 'public'>;
  updateInsurance?: FunctionReference<'mutation', 'public'>;
  updateLifestyle?: FunctionReference<'mutation', 'public'>;
  updateAdvanceDirectives?: FunctionReference<'mutation', 'public'>;
  updateMedicalBio?: FunctionReference<'mutation', 'public'>;
};

/**
 * Safely access patientProfile API namespace
 * Handles cases where patientProfile may not be in generated types
 */
export function getPatientProfileApi(api: unknown): PatientProfileApi | undefined {
  return getApiNamespace(api, 'patientProfile') as PatientProfileApi | undefined;
}

/**
 * Type assertion helper that provides better type safety than `as any`
 * Use this when you're certain the API structure exists but TypeScript can't infer it
 * 
 * @example
 * ```ts
 * // Instead of: (api as any).patientProfile?.findPatientByEmail
 * const patientProfileApi = assertApiNamespace<PatientProfileApi>(api, 'patientProfile');
 * const findPatientByEmail = patientProfileApi?.findPatientByEmail;
 * ```
 */
export function assertApiNamespace<T>(
  api: unknown,
  namespace: string
): T | undefined {
  if (!hasApiNamespace(api, namespace)) {
    return undefined;
  }
  
  return (api as Record<string, unknown>)[namespace] as T;
}

