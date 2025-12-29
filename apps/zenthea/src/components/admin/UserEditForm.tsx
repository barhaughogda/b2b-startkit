"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";

export interface User {
  _id: string;
  email: string;
  name: string;
  role: "admin" | "provider" | "demo" | "patient";
  isActive: boolean;
  tenantId?: string;
  createdAt?: number;
  updatedAt?: number;
}

interface UserEditFormProps {
  user?: User;
  onSave: (userData: {
    name: string;
    email: string;
    role: "admin" | "provider" | "demo" | "patient";
    isActive: boolean;
    tenantId?: string;
    password?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function UserEditForm({
  user,
  onSave,
  onCancel,
  isLoading = false,
}: UserEditFormProps) {
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    role: (user?.role || "demo") as "admin" | "provider" | "demo" | "patient",
    isActive: user?.isActive ?? true,
    tenantId: user?.tenantId || "",
    password: "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        tenantId: user.tenantId || "",
        password: "",
      });
    }
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.name.trim()) {
      newErrors.push("Name is required");
    }

    if (!formData.email.trim()) {
      newErrors.push("Email is required");
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.push("Invalid email format");
      }
    }

    if (!user && !formData.password) {
      newErrors.push("Password is required for new users");
    }

    if (formData.password && formData.password.length < 8) {
      newErrors.push("Password must be at least 8 characters long");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData: Parameters<typeof onSave>[0] = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        isActive: formData.isActive,
      };

      if (formData.tenantId) {
        submitData.tenantId = formData.tenantId;
      }

      if (formData.password) {
        submitData.password = formData.password;
      }

      await onSave(submitData);
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "Failed to save user",
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{user ? "Edit User" : "Create New User"}</CardTitle>
        <CardDescription>
          {user
            ? "Update user information and permissions"
            : "Add a new user to the system"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.length > 0 && (
            <Alert className="border-status-error bg-status-error/10">
              <AlertCircle className="h-4 w-4 text-status-error" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-status-error">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              disabled={isSubmitting || isLoading}
              required
              aria-required="true"
              aria-invalid={errors.some((e) => e.includes("Name"))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-status-error">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              disabled={isSubmitting || isLoading}
              required
              aria-required="true"
              aria-invalid={errors.some((e) => e.includes("Email"))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">
              Role <span className="text-status-error">*</span>
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) =>
                handleInputChange(
                  "role",
                  value as "admin" | "provider" | "demo" | "patient"
                )
              }
              disabled={isSubmitting || isLoading}
            >
              <SelectTrigger id="role" aria-required="true">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="provider">Provider</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
                <SelectItem value="patient">Patient</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.isActive ? "active" : "inactive"}
              onValueChange={(value) =>
                handleInputChange("isActive", value === "active")
              }
              disabled={isSubmitting || isLoading}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {user ? "New Password (leave blank to keep current)" : "Password"}
              {!user && <span className="text-status-error">*</span>}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              disabled={isSubmitting || isLoading}
              required={!user}
              aria-required={!user}
              aria-invalid={errors.some((e) => e.includes("Password"))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

