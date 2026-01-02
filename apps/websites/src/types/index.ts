// Global type definitions for Websites app

export interface PermissionTree {
  [key: string]: any;
}

export interface ZentheaSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId?: string;
    image?: string;
    isOwner?: boolean;
    clinics?: string[];
    permissions?: PermissionTree;
    originalRole?: string;
  };
  expires: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  tenantId?: string;
}
