"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, UserCheck, UserCog, User } from "lucide-react";

interface RolePermissions {
  [key: string]: {
    name: string;
    description: string;
    permissions: string[];
    icon: React.ReactNode;
  };
}

const rolePermissions: RolePermissions = {
  admin: {
    name: "Admin",
    description: "Full system access with all administrative privileges",
    permissions: [
      "Manage all users and roles",
      "Access system settings",
      "View security dashboard",
      "Generate compliance reports",
      "Manage tenant settings",
      "Access audit logs",
      "Configure integrations",
    ],
    icon: <Shield className="h-5 w-5" />,
  },
  provider: {
    name: "Provider",
    description: "Healthcare provider with patient management access",
    permissions: [
      "View and manage assigned patients",
      "Create and edit medical records",
      "Schedule appointments",
      "View patient history",
      "Access clinical tools",
      "Manage provider profile",
    ],
    icon: <UserCheck className="h-5 w-5" />,
  },
  demo: {
    name: "Demo",
    description: "Limited access for demonstration purposes",
    permissions: [
      "View demo data",
      "Limited patient access",
      "Read-only mode for most features",
    ],
    icon: <UserCog className="h-5 w-5" />,
  },
  patient: {
    name: "Patient",
    description: "Patient portal access with personal health information",
    permissions: [
      "View own medical records",
      "Schedule appointments",
      "Message providers",
      "View test results",
      "Manage personal information",
      "Access patient portal",
    ],
    icon: <User className="h-5 w-5" />,
  },
};

interface FeatureAccess {
  feature: string;
  admin: boolean;
  provider: boolean;
  demo: boolean;
  patient: boolean;
}

const featureAccessMatrix: FeatureAccess[] = [
  {
    feature: "User Management",
    admin: true,
    provider: false,
    demo: false,
    patient: false,
  },
  {
    feature: "Patient Records",
    admin: true,
    provider: true,
    demo: true,
    patient: true,
  },
  {
    feature: "Appointment Scheduling",
    admin: true,
    provider: true,
    demo: true,
    patient: true,
  },
  {
    feature: "Medical Records (Edit)",
    admin: true,
    provider: true,
    demo: false,
    patient: false,
  },
  {
    feature: "Billing & Invoicing",
    admin: true,
    provider: false,
    demo: false,
    patient: false,
  },
  {
    feature: "System Settings",
    admin: true,
    provider: false,
    demo: false,
    patient: false,
  },
  {
    feature: "Security Dashboard",
    admin: true,
    provider: false,
    demo: false,
    patient: false,
  },
  {
    feature: "Compliance Reports",
    admin: true,
    provider: false,
    demo: false,
    patient: false,
  },
  {
    feature: "Audit Logs",
    admin: true,
    provider: false,
    demo: false,
    patient: false,
  },
  {
    feature: "Patient Portal",
    admin: true,
    provider: false,
    demo: false,
    patient: true,
  },
];

export function UserRoles() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Roles & Permissions
          </CardTitle>
          <CardDescription>
            Overview of available roles and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(rolePermissions).map(([roleKey, role]) => (
              <AccordionItem key={roleKey} value={roleKey}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="text-text-secondary">{role.icon}</div>
                    <div className="text-left">
                      <div className="font-medium text-text-primary">
                        {role.name}
                      </div>
                      <div className="text-sm text-text-secondary">
                        {role.description}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2 space-y-2">
                    <p className="text-sm font-medium text-text-secondary mb-3">
                      Permissions:
                    </p>
                    <ul className="space-y-2">
                      {role.permissions.map((permission, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-text-primary"
                        >
                          <span className="text-status-success mt-1">✓</span>
                          <span>{permission}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Access Matrix</CardTitle>
          <CardDescription>
            Detailed breakdown of feature access by role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border-primary">
                  <th className="text-left p-3 font-medium text-text-primary">
                    Feature
                  </th>
                  <th className="text-center p-3 font-medium text-text-primary">
                    Admin
                  </th>
                  <th className="text-center p-3 font-medium text-text-primary">
                    Provider
                  </th>
                  <th className="text-center p-3 font-medium text-text-primary">
                    Demo
                  </th>
                  <th className="text-center p-3 font-medium text-text-primary">
                    Patient
                  </th>
                </tr>
              </thead>
              <tbody>
                {featureAccessMatrix.map((feature, index) => (
                  <tr
                    key={index}
                    className="border-b border-border-primary hover:bg-surface-elevated"
                  >
                    <td className="p-3 text-text-primary">{feature.feature}</td>
                    <td className="p-3 text-center">
                      {feature.admin ? (
                        <Badge variant="default" className="bg-status-success">
                          ✓
                        </Badge>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {feature.provider ? (
                        <Badge variant="default" className="bg-status-success">
                          ✓
                        </Badge>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {feature.demo ? (
                        <Badge variant="default" className="bg-status-success">
                          ✓
                        </Badge>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {feature.patient ? (
                        <Badge variant="default" className="bg-status-success">
                          ✓
                        </Badge>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

