// Type extensions for Convex API
// These modules exist in convex/ but may not be in generated types during CI builds
// The admin folder and some other modules aren't always picked up by codegen

import type { FunctionReference } from "convex/server";

declare module "@/convex/_generated/api" {
  // Extend the api export to include missing modules
  export const api: typeof import("@/convex/_generated/api").api & {
    admin?: {
      users?: {
        getUserById?: FunctionReference<"query", "public", any, any>;
        getUsers?: FunctionReference<"query", "public", any, any>;
        listUsersForSuperadmin?: FunctionReference<"query", "public", any, any>;
        createUserMutation?: FunctionReference<"mutation", "public", any, any>;
        updateUserMutation?: FunctionReference<"mutation", "public", any, any>;
        deleteUserMutation?: FunctionReference<"mutation", "public", any, any>;
        [key: string]: FunctionReference<any, any, any, any> | undefined;
      };
      compliance?: {
        [key: string]: FunctionReference<any, any, any, any> | undefined;
      };
      complianceMetrics?: {
        [key: string]: FunctionReference<any, any, any, any> | undefined;
      };
      security?: {
        [key: string]: FunctionReference<any, any, any, any> | undefined;
      };
      securityMetrics?: {
        [key: string]: FunctionReference<any, any, any, any> | undefined;
      };
      systemMetrics?: {
        getSystemMetrics?: FunctionReference<"query", "public", any, any>;
        [key: string]: FunctionReference<any, any, any, any> | undefined;
      };
      systemSettings?: {
        getSystemSettings?: FunctionReference<"query", "public", any, any>;
        updateSystemSettings?: FunctionReference<"mutation", "public", any, any>;
        [key: string]: FunctionReference<any, any, any, any> | undefined;
      };
      userMetrics?: {
        getUserMetrics?: FunctionReference<"query", "public", any, any>;
        [key: string]: FunctionReference<any, any, any, any> | undefined;
      };
      tenants?: {
        [key: string]: FunctionReference<any, any, any, any> | undefined;
      };
      platformSettings?: {
        getPlatformSettings?: FunctionReference<"query", "public", any, any>;
        [key: string]: FunctionReference<any, any, any, any> | undefined;
      };
      [key: string]: any;
    };
    locations?: {
      getProviderLocations?: FunctionReference<"query", "public", any, any>;
      getLocationsByTenant?: FunctionReference<"query", "public", any, any>;
      [key: string]: FunctionReference<any, any, any, any> | undefined;
    };
    providerAvailability?: {
      [key: string]: FunctionReference<any, any, any, any> | undefined;
    };
    calendarSync?: {
      [key: string]: FunctionReference<any, any, any, any> | undefined;
    };
  };
}

