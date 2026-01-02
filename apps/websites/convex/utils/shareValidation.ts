import { Id } from "../_generated/dataModel";

/**
 * Shared validation utilities for sharing operations
 * Provides consistent validation logic across patient shares, calendar shares, and message assignments
 */

export interface ValidationResult<T> {
  owner: any;
  sharedWith: any;
  resource?: T;
}

/**
 * Common validation errors
 */
export class ShareValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public userFacingMessage?: string
  ) {
    super(message);
    this.name = "ShareValidationError";
  }
}

/**
 * Validate that a user exists and belongs to the specified tenant
 */
export async function validateUser(
  ctx: any,
  userId: Id<"users">,
  tenantId: string,
  userType: "owner" | "shared_with" | "assigner" | "assignee"
): Promise<any> {
  const user = await ctx.db.get(userId);
  if (!user) {
    const typeLabel = userType === "owner" || userType === "assigner" 
      ? "Owner" 
      : userType === "shared_with" 
      ? "Recipient" 
      : "Assignee";
    throw new ShareValidationError(
      `USER_NOT_FOUND: ${typeLabel} user not found`,
      "USER_NOT_FOUND",
      `${typeLabel} account not found. Please try again.`
    );
  }
  
  if (user.tenantId !== tenantId) {
    throw new ShareValidationError(
      `TENANT_MISMATCH: ${userType} does not belong to the specified tenant`,
      "TENANT_MISMATCH",
      "Access denied. Users can only share within their organization."
    );
  }
  
  return user;
}

/**
 * Validate that a user is not a patient (for sharing operations)
 */
export function validateNotPatient(user: any, operation: string): void {
  if (user.role === "patient") {
    throw new ShareValidationError(
      `INVALID_OPERATION: Cannot ${operation} with patients. ${operation} is only available for company staff.`,
      "INVALID_OPERATION",
      `This feature is only available for staff members. Patients cannot ${operation}.`
    );
  }
}

/**
 * Validate that users are not the same
 */
export function validateNotSelf(
  ownerId: Id<"users">,
  sharedWithId: Id<"users">,
  operation: string
): void {
  if (ownerId === sharedWithId) {
    throw new ShareValidationError(
      `INVALID_OPERATION: Cannot ${operation} with yourself`,
      "INVALID_OPERATION",
      `You cannot ${operation} with yourself.`
    );
  }
}

/**
 * Validate patient share users and tenant isolation
 */
export async function validatePatientShareUsers(
  ctx: any,
  ownerUserId: Id<"users">,
  sharedWithUserId: Id<"users">,
  patientId: Id<"patients">,
  tenantId: string
): Promise<ValidationResult<any>> {
  // Validate owner
  const owner = await validateUser(ctx, ownerUserId, tenantId, "owner");
  
  // Validate shared with user
  const sharedWith = await validateUser(ctx, sharedWithUserId, tenantId, "shared_with");
  
  // Prevent sharing with patients
  validateNotPatient(sharedWith, "share patient access");
  
  // Prevent sharing with yourself
  validateNotSelf(ownerUserId, sharedWithUserId, "share patient access");
  
  // Validate patient exists and belongs to tenant
  const patient = await ctx.db.get(patientId);
  if (!patient) {
    throw new ShareValidationError(
      "PATIENT_NOT_FOUND: Patient not found",
      "PATIENT_NOT_FOUND",
      "Patient not found. Please try again."
    );
  }
  if (patient.tenantId !== tenantId) {
    throw new ShareValidationError(
      "TENANT_MISMATCH: Patient does not belong to the specified tenant",
      "TENANT_MISMATCH",
      "Access denied. Patients can only be shared within your organization."
    );
  }
  
  return { owner, sharedWith, resource: patient };
}

/**
 * Validate calendar share users and tenant isolation
 */
export async function validateCalendarShareUsers(
  ctx: any,
  ownerUserId: Id<"users">,
  sharedWithUserId: Id<"users">,
  tenantId: string
): Promise<ValidationResult<null>> {
  // Validate owner
  const owner = await validateUser(ctx, ownerUserId, tenantId, "owner");
  
  // Validate shared with user
  const sharedWith = await validateUser(ctx, sharedWithUserId, tenantId, "shared_with");
  
  // Prevent sharing with patients
  validateNotPatient(sharedWith, "share calendar");
  
  // Prevent sharing with yourself
  validateNotSelf(ownerUserId, sharedWithUserId, "share calendar");
  
  return { owner, sharedWith };
}

/**
 * Validate message assignment users and tenant isolation
 */
export async function validateMessageAssignmentUsers(
  ctx: any,
  assignedBy: Id<"users">,
  assignedTo: Id<"users">,
  messageId: Id<"messages">,
  tenantId: string
): Promise<ValidationResult<any>> {
  // Validate assigner
  const assigner = await validateUser(ctx, assignedBy, tenantId, "assigner");
  
  // Validate assignee
  const assignee = await validateUser(ctx, assignedTo, tenantId, "assignee");
  
  // Prevent assigning to patients
  validateNotPatient(assignee, "assign messages");
  
  // Prevent assigning to yourself
  validateNotSelf(assignedBy, assignedTo, "assign message");
  
  // Validate message exists and belongs to tenant
  const message = await ctx.db.get(messageId);
  if (!message) {
    throw new ShareValidationError(
      "MESSAGE_NOT_FOUND: Message not found",
      "MESSAGE_NOT_FOUND",
      "Message not found. Please try again."
    );
  }
  if (message.tenantId !== tenantId) {
    throw new ShareValidationError(
      "TENANT_MISMATCH: Message does not belong to the specified tenant",
      "TENANT_MISMATCH",
      "Access denied. Messages can only be assigned within your organization."
    );
  }
  
  return { owner: assigner, sharedWith: assignee, resource: message };
}

