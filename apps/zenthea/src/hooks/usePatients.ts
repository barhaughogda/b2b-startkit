import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { canUseConvexQuery } from "@/lib/convexIdValidation";

/**
 * Core patient data structure from the database
 */
export interface Patient {
  /** Unique patient identifier */
  _id: string;
  /** Patient's first name */
  firstName: string;
  /** Patient's last name */
  lastName: string;
  /** Date of birth as timestamp */
  dateOfBirth: number;
  /** Patient's email address */
  email?: string;
  /** Patient's phone number */
  phone?: string;
  /** Patient's address information */
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  /** Patient's insurance information */
  insurance?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
  /** Tenant ID for multi-tenancy */
  tenantId: string;
  /** Record creation timestamp */
  createdAt: number;
  /** Record last update timestamp */
  updatedAt: number;
}

/**
 * Patient data with computed fields for display in the UI
 */
export interface PatientWithComputedFields extends Patient {
  /** Computed full name (firstName + lastName) */
  name: string;
  /** Computed age from dateOfBirth */
  age: number;
  /** Patient status for display */
  status: 'Active' | 'Inactive';
  /** Last visit date for display */
  lastVisit: string;
  /** Next scheduled appointment */
  nextAppointment?: string;
  /** Patient avatar URL */
  avatar?: string;
  /** Patient gender */
  gender: 'Male' | 'Female';
}

// Mock data for when Convex is not available
const mockPatients: PatientWithComputedFields[] = [
  {
    _id: '1',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1985-03-15').getTime(),
    email: 'john.doe@email.com',
    phone: '(555) 123-4567',
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001'
    },
    insurance: {
      provider: 'Blue Cross',
      policyNumber: 'BC123456',
      groupNumber: 'GRP001'
    },
    tenantId: 'demo-tenant',
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    name: 'John Doe',
    age: 39,
    status: 'Active',
    lastVisit: '2024-01-15',
    nextAppointment: '2024-02-15',
    avatar: undefined,
    gender: 'Male'
  },
  {
    _id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    dateOfBirth: new Date('1990-07-22').getTime(),
    email: 'jane.smith@email.com',
    phone: '(555) 234-5678',
    address: {
      street: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210'
    },
    insurance: {
      provider: 'Aetna',
      policyNumber: 'AET789012',
      groupNumber: 'GRP002'
    },
    tenantId: 'demo-tenant',
    createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    name: 'Jane Smith',
    age: 34,
    status: 'Active',
    lastVisit: '2024-01-10',
    nextAppointment: undefined,
    avatar: undefined,
    gender: 'Female'
  },
  {
    _id: '3',
    firstName: 'Michael',
    lastName: 'Johnson',
    dateOfBirth: new Date('1978-11-08').getTime(),
    email: 'michael.johnson@email.com',
    phone: '(555) 345-6789',
    address: {
      street: '789 Pine St',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601'
    },
    insurance: {
      provider: 'Cigna',
      policyNumber: 'CIG345678',
      groupNumber: 'GRP003'
    },
    tenantId: 'demo-tenant',
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    name: 'Michael Johnson',
    age: 45,
    status: 'Inactive',
    lastVisit: '2023-12-20',
    nextAppointment: undefined,
    avatar: undefined,
    gender: 'Male'
  },
  {
    _id: '4',
    firstName: 'Sarah',
    lastName: 'Williams',
    dateOfBirth: new Date('1992-04-12').getTime(),
    email: 'sarah.williams@email.com',
    phone: '(555) 456-7890',
    address: {
      street: '321 Elm St',
      city: 'Houston',
      state: 'TX',
      zipCode: '77001'
    },
    insurance: {
      provider: 'UnitedHealth',
      policyNumber: 'UHC456789',
      groupNumber: 'GRP004'
    },
    tenantId: 'demo-tenant',
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    name: 'Sarah Williams',
    age: 32,
    status: 'Active',
    lastVisit: '2024-01-20',
    nextAppointment: '2024-03-01',
    avatar: undefined,
    gender: 'Female'
  },
  {
    _id: '5',
    firstName: 'David',
    lastName: 'Brown',
    dateOfBirth: new Date('1983-09-30').getTime(),
    email: 'david.brown@email.com',
    phone: '(555) 567-8901',
    address: {
      street: '654 Maple Dr',
      city: 'Phoenix',
      state: 'AZ',
      zipCode: '85001'
    },
    insurance: {
      provider: 'Kaiser',
      policyNumber: 'KAI567890',
      groupNumber: 'GRP005'
    },
    tenantId: 'demo-tenant',
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    name: 'David Brown',
    age: 40,
    status: 'Active',
    lastVisit: '2024-01-25',
    nextAppointment: '2024-02-28',
    avatar: undefined,
    gender: 'Male'
  }
];

/**
 * Custom hook for fetching and managing patient data
 * 
 * Integrates with Convex database to fetch patients by tenant ID with computed fields.
 * Handles loading states and error conditions gracefully.
 * 
 * @returns Object containing patients array, loading state, and error information
 * 
 * @example
 * ```tsx
 * function PatientsPage() {
 *   const { patients, isLoading, error } = usePatients();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   
 *   return <PatientList patients={patients} />;
 * }
 * ```
 */
export function usePatients() {
  const { data: session } = useSession();
  
  // Get tenant ID from session or use demo tenant
  const tenantId = session?.user?.tenantId || 'demo-tenant';
  
  // Check if we can use Convex queries
  const canQuery = canUseConvexQuery(session?.user?.id, tenantId);
  
  // Query patients with computed fields from Convex
  const patientsData = useQuery(
    api.patients.getPatientsWithComputedFields,
    canQuery && tenantId ? { tenantId } : 'skip'
  ) as PatientWithComputedFields[] | undefined;
  
  // Handle loading state
  const isLoading = patientsData === undefined && canQuery;
  
  // Handle error state (if query returns null or error)
  const error = patientsData === null ? new Error('Failed to fetch patients') : null;
  
  // Transform Convex data to match PatientWithComputedFields interface
  // Convert _id from Id<"patients"> to string for compatibility
  const patients: PatientWithComputedFields[] = (patientsData || []).map(patient => ({
    ...patient,
    _id: patient._id as string, // Convert Convex Id to string
  }));
  
  return {
    patients,
    isLoading,
    error,
  };
}
