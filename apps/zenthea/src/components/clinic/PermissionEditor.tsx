"use client";

import React, { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { PermissionTree, CustomRole } from "@/types";
import {
  VALID_SECTIONS,
  type ValidSection,
} from "@/lib/permissions/validation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Shield, Save, FolderOpen, Loader2, Eye, Edit, CheckCircle2, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

/**
 * Props for PermissionEditor component
 */
export interface PermissionEditorProps {
  /** The permission tree to edit */
  permissions: PermissionTree;
  /** Callback when permissions change */
  onChange?: (permissions: PermissionTree) => void;
  /** Whether the editor is in read-only/preview mode */
  readOnly?: boolean;
  /** Optional className for styling */
  className?: string;
  /** Optional tenantId (if not provided, will be fetched from session) */
  tenantId?: string;
  /** Hide the header section (title and description) when embedded in another page */
  hideHeader?: boolean;
}

/**
 * Internal state type for managing expanded/collapsed sections
 */
interface ExpandedState {
  sections: Set<string>;
  features: Set<string>;
  components: Set<string>;
}

/**
 * PermissionEditor Component
 * 
 * Component for editing hierarchical permission trees.
 * Displays sections > features > components > cards > tabs structure.
 * 
 * NOTE: viewScope has been removed from role permissions.
 * Data visibility is now controlled by user sharing settings (userSharingSettings table).
 * Roles only control feature access (can you use this feature?).
 * 
 * Features:
 * - Hierarchical toggle UI (Task 5.3.2) ✅
 * - Template save/load (Task 5.3.4) ✅
 * - Preview mode (Task 5.3.5) ✅
 */
export function PermissionEditor({
  permissions,
  onChange,
  readOnly = false,
  className,
  tenantId: propTenantId,
  hideHeader = false,
}: PermissionEditorProps) {
  const { data: session } = useSession();
  const tenantId = propTenantId || session?.user?.tenantId;

  // Preview mode state
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // Template management state
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  
  // Effective read-only state (combines prop and preview mode)
  const effectiveReadOnly = readOnly || isPreviewMode;

  // Convex queries and mutations
  const templates = useQuery(
    (api as any).customRoles?.getTemplateRoles as any,
    tenantId ? { tenantId } : "skip"
  ) as CustomRole[] | undefined;

  const createTemplate = useMutation((api as any).customRoles?.createCustomRole as any);
  // Track expanded/collapsed state for hierarchical tree
  const [expanded, setExpanded] = useState<ExpandedState>({
    sections: new Set(VALID_SECTIONS), // Start with all sections expanded
    features: new Set(),
    components: new Set(),
  });

  // Local state for permissions (controlled component pattern)
  const [localPermissions, setLocalPermissions] = useState<PermissionTree>(permissions);

  // Update local state when props change
  React.useEffect(() => {
    setLocalPermissions(permissions);
  }, [permissions]);

  /**
   * Toggle expansion state for a section
   */
  const toggleSection = (sectionName: string) => {
    setExpanded((prev) => {
      const newSections = new Set(prev.sections);
      if (newSections.has(sectionName)) {
        newSections.delete(sectionName);
      } else {
        newSections.add(sectionName);
      }
      return { ...prev, sections: newSections };
    });
  };

  /**
   * Toggle expansion state for a feature
   */
  const toggleFeature = (featureKey: string) => {
    setExpanded((prev) => {
      const newFeatures = new Set(prev.features);
      if (newFeatures.has(featureKey)) {
        newFeatures.delete(featureKey);
      } else {
        newFeatures.add(featureKey);
      }
      return { ...prev, features: newFeatures };
    });
  };

  /**
   * Toggle expansion state for a component
   */
  const toggleComponent = (componentKey: string) => {
    setExpanded((prev) => {
      const newComponents = new Set(prev.components);
      if (newComponents.has(componentKey)) {
        newComponents.delete(componentKey);
      } else {
        newComponents.add(componentKey);
      }
      return { ...prev, components: newComponents };
    });
  };

  /**
   * Deep clone a permission tree to avoid mutating the original
   */
  const clonePermissions = useCallback((perms: PermissionTree): PermissionTree => {
    return JSON.parse(JSON.stringify(perms));
  }, []);

  /**
   * Update permission at a specific path in the tree
   * Handles parent/child relationships:
   * - Disabling a parent disables all children
   * - Enabling a parent doesn't automatically enable children (user must enable them explicitly)
   */
  const updatePermission = useCallback((
    path: string[],
    value: boolean,
    perms: PermissionTree
  ): PermissionTree => {
    const newPerms = clonePermissions(perms);
    let current: any = newPerms;

    // Navigate to the parent of the target
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!current[key]) {
        // Create intermediate objects if they don't exist
        if (i === 0) {
          // Section level
          current[key] = { enabled: false };
        } else {
          current[key] = {};
        }
      }
      current = current[key];
    }

    const targetKey = path[path.length - 1];
    
    // Handle different permission structures
    if (path.length === 1) {
      // Section level: update enabled
      if (!current[targetKey]) {
        current[targetKey] = { enabled: value };
      } else {
        current[targetKey].enabled = value;
        
        // If disabling section, disable all children
        if (!value && current[targetKey].features) {
          disableChildren(current[targetKey].features);
        }
      }
    } else if (path[path.length - 2] === 'features' && path.length === 2) {
      // Feature level (boolean feature like create, edit, etc.)
      if (!current.features) {
        current.features = {};
      }
      current.features[targetKey] = value;
    } else if (path[path.length - 2] === 'features' && path.length > 2) {
      // Feature level (object feature with enabled)
      if (!current.features) {
        current.features = {};
      }
      if (!current.features[targetKey]) {
        current.features[targetKey] = { enabled: value };
      } else if (typeof current.features[targetKey] === 'object') {
        current.features[targetKey].enabled = value;
        
        // If disabling feature, disable all children
        if (!value && current.features[targetKey].components) {
          disableChildren(current.features[targetKey].components);
        }
      } else {
        // Convert boolean to object
        current.features[targetKey] = { enabled: value };
      }
    } else if (path.includes('components')) {
      // Component level
      const featureKey = path[path.indexOf('features') + 1];
      if (!current.features || !current.features[featureKey]) {
        return newPerms; // Invalid path
      }
      const feature = current.features[featureKey];
      if (typeof feature !== 'object' || !feature) {
        return newPerms; // Invalid structure
      }
      if (!feature.components) {
        feature.components = {};
      }
      if (!feature.components[targetKey]) {
        feature.components[targetKey] = { enabled: value };
      } else if (typeof feature.components[targetKey] === 'object') {
        feature.components[targetKey].enabled = value;
        
        // If disabling component, disable all children (tabs)
        if (!value && feature.components[targetKey].tabs) {
          disableChildren(feature.components[targetKey].tabs);
        }
      } else {
        // Convert boolean to object
        feature.components[targetKey] = { enabled: value };
      }
    } else if (path.includes('tabs')) {
      // Tab level
      const componentKey = path[path.indexOf('components') + 1];
      const featureKey = path[path.indexOf('features') + 1];
      if (!current.features || !current.features[featureKey]) {
        return newPerms;
      }
      const feature = current.features[featureKey];
      if (typeof feature !== 'object' || !feature || !feature.components || !feature.components[componentKey]) {
        return newPerms;
      }
      const component = feature.components[componentKey];
      if (typeof component !== 'object' || !component) {
        return newPerms;
      }
      if (!component.tabs) {
        component.tabs = {};
      }
      component.tabs[targetKey] = value;
    }

    return newPerms;
  }, [clonePermissions]);

  /**
   * Helper to disable all children in a nested structure
   */
  const disableChildren = (obj: any): void => {
    if (!obj || typeof obj !== 'object') return;
    
    for (const key in obj) {
      if (typeof obj[key] === 'boolean') {
        obj[key] = false;
      } else if (obj[key] && typeof obj[key] === 'object') {
        if ('enabled' in obj[key]) {
          obj[key].enabled = false;
        }
        // Recursively disable nested children
        if ('components' in obj[key]) {
          disableChildren(obj[key].components);
        }
        if ('tabs' in obj[key]) {
          disableChildren(obj[key].tabs);
        }
        if ('features' in obj[key]) {
          disableChildren(obj[key].features);
        }
      }
    }
  };

  /**
   * Handle permission toggle at any level
   */
  const handleToggle = useCallback((
    path: string[],
    currentValue: boolean
  ) => {
    if (effectiveReadOnly) return;

    const newValue = !currentValue;
    const updated = updatePermission(path, newValue, localPermissions);
    
    setLocalPermissions(updated);
    onChange?.(updated);
  }, [readOnly, localPermissions, updatePermission, onChange]);

  /**
   * Get permission value at a specific path
   */
  const getPermissionValue = useCallback((
    path: string[],
    perms: PermissionTree
  ): boolean => {
    let current: any = perms;
    
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      
      if (i === 0) {
        // Section level
        if (!current[key] || typeof current[key] !== 'object') {
          return false;
        }
        current = current[key];
        // Check if section is enabled
        if (current.enabled !== true) {
          return false;
        }
      } else if (key === 'features') {
        if (!current.features || typeof current.features !== 'object') {
          return false;
        }
        current = current.features;
      } else if (key === 'components') {
        if (!current.components || typeof current.components !== 'object') {
          return false;
        }
        current = current.components;
      } else if (key === 'tabs') {
        if (!current.tabs || typeof current.tabs !== 'object') {
          return false;
        }
        current = current.tabs;
      } else {
        // Feature/component/tab name
        const value = current[key];
        
        if (i === path.length - 1) {
          // Last item in path - return its value
          if (typeof value === 'boolean') {
            return value;
          } else if (value && typeof value === 'object' && 'enabled' in value) {
            return value.enabled === true;
          }
          return false;
        } else {
          // Intermediate item
          if (typeof value === 'boolean') {
            return value; // Boolean features don't have children
          } else if (value && typeof value === 'object') {
            if ('enabled' in value && value.enabled !== true) {
              return false; // Parent is disabled
            }
            current = value;
          } else {
            return false;
          }
        }
      }
    }
    
    return false;
  }, []);

  /**
   * Get human-readable label for a section
   */
  const getSectionLabel = (sectionName: string): string => {
    const labels: Record<string, string> = {
      patients: "Patients",
      appointments: "Appointments",
      messages: "Messages",
      medical_records: "Medical Records",
      billing: "Billing",
      settings: "Settings",
      reports: "Reports",
      ai_assistant: "AI Assistant",
    };
    return labels[sectionName] || sectionName;
  };

  /**
   * Generate a permission summary from the permission tree
   */
  const generatePermissionSummary = useCallback((perms: PermissionTree) => {
    const summary: {
      enabledSections: string[];
      disabledSections: string[];
      enabledFeatures: Record<string, string[]>;
      totalEnabledFeatures: number;
    } = {
      enabledSections: [],
      disabledSections: [],
      enabledFeatures: {},
      totalEnabledFeatures: 0,
    };

    VALID_SECTIONS.forEach((sectionName) => {
      const section = perms[sectionName];
      if (section && typeof section === "object" && section.enabled === true) {
        summary.enabledSections.push(getSectionLabel(sectionName));
        
        // Count enabled features
        const features = section.features;
        if (features && typeof features === "object") {
          const enabledFeatures: string[] = [];
          Object.entries(features).forEach(([featureKey]) => {
            const featurePath = [sectionName, 'features', featureKey];
            const isEnabled = getPermissionValue(featurePath, perms);
            if (isEnabled) {
              enabledFeatures.push(featureKey.replace(/_/g, " "));
              summary.totalEnabledFeatures++;
            }
          });
          if (enabledFeatures.length > 0) {
            summary.enabledFeatures[getSectionLabel(sectionName)] = enabledFeatures;
          }
        }
      } else {
        summary.disabledSections.push(getSectionLabel(sectionName));
      }
    });

    return summary;
  }, [getPermissionValue]);

  /**
   * Get permission summary for current permissions
   */
  const permissionSummary = generatePermissionSummary(localPermissions);

  /**
   * Handle saving current permissions as a template
   */
  const handleSaveTemplate = useCallback(async () => {
    if (!tenantId) {
      toast.error("Error", {
        description: "Tenant ID is required to save templates.",
      });
      return;
    }

    if (!templateName.trim()) {
      toast.error("Validation Error", {
        description: "Template name is required.",
      });
      return;
    }

    if (templateName.trim().length < 2) {
      toast.error("Validation Error", {
        description: "Template name must be at least 2 characters.",
      });
      return;
    }

    setIsSavingTemplate(true);

    try {
      await createTemplate({
        tenantId,
        name: templateName.trim(),
        description: templateDescription.trim() || undefined,
        permissions: localPermissions,
        isTemplate: true,
      });

      toast.success("Template saved", {
        description: `Template "${templateName.trim()}" has been saved successfully.`,
      });

      // Reset form
      setTemplateName("");
      setTemplateDescription("");
      setSaveTemplateOpen(false);
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template", {
        description:
          error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setIsSavingTemplate(false);
    }
  }, [tenantId, templateName, templateDescription, localPermissions, createTemplate]);

  /**
   * Handle loading a template
   */
  const handleLoadTemplate = useCallback(() => {
    if (!selectedTemplateId || !templates) {
      return;
    }

    const template = templates.find((t) => t._id === selectedTemplateId);
    if (!template) {
      toast.error("Error", {
        description: "Template not found.",
      });
      return;
    }

    // Load template permissions
    setLocalPermissions(template.permissions);
    onChange?.(template.permissions);

    toast.success("Template loaded", {
      description: `Template "${template.name}" has been loaded.`,
    });

    // Reset selection
    setSelectedTemplateId("");
  }, [selectedTemplateId, templates, onChange]);

  /**
   * Render a section of the permission tree
   */
  const renderSection = (sectionName: ValidSection, sectionData: any) => {
    // Get section data from local permissions (current state)
    const localSectionData = localPermissions[sectionName];
    if (!localSectionData || typeof localSectionData !== "object") {
      // Section doesn't exist in local permissions - show as disabled
      return (
        <Card key={sectionName} className="mb-4 opacity-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-text-tertiary" />
                <CardTitle className="text-lg">{getSectionLabel(sectionName)}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={false} disabled={effectiveReadOnly} />
                <Label className="text-sm font-medium text-text-tertiary">Disabled</Label>
              </div>
            </div>
          </CardHeader>
        </Card>
      );
    }

    const isExpanded = expanded.sections.has(sectionName);
    const enabled = localSectionData.enabled === true;
    const features = localSectionData.features;

    return (
      <Card key={sectionName} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleSection(sectionName)}
                className="p-1 hover:bg-background-secondary rounded transition-colors"
                disabled={effectiveReadOnly}
                aria-label={isExpanded ? "Collapse section" : "Expand section"}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-text-secondary" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-text-secondary" />
                )}
              </button>
              <Shield className="h-5 w-5 text-interactive-primary" />
              <CardTitle className="text-lg">{getSectionLabel(sectionName)}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={enabled}
                disabled={effectiveReadOnly}
                onCheckedChange={() => handleToggle([sectionName], enabled)}
                aria-label={`Enable ${getSectionLabel(sectionName)} section`}
              />
              <Label className="text-sm font-medium cursor-pointer" onClick={() => !effectiveReadOnly && handleToggle([sectionName], enabled)}>
                {enabled ? "Enabled" : "Disabled"}
              </Label>
            </div>
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Features */}
              {features && typeof features === "object" && (
                <div className="pl-6 space-y-2">
                  <p className="text-sm font-medium text-text-secondary mb-2">Features</p>
                  {Object.entries(features).map(([featureKey, featureValue]) => {
                    const featureKeyFull = `${sectionName}.features.${featureKey}`;
                    const isFeatureExpanded = expanded.features.has(featureKeyFull);
                    const featurePath = [sectionName, 'features', featureKey];
                    const featureEnabled = getPermissionValue(featurePath, localPermissions);
                    const hasChildren = typeof featureValue === "object" && featureValue !== null && (
                      "components" in featureValue || 
                      "enabled" in featureValue ||
                      Object.keys(featureValue).length > 0
                    );
                    
                    return (
                      <div key={featureKey} className="border-l-2 border-border-primary pl-4">
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2">
                            {hasChildren && (
                              <button
                                type="button"
                                onClick={() => toggleFeature(featureKeyFull)}
                                className="p-1 hover:bg-background-secondary rounded transition-colors"
                                disabled={effectiveReadOnly}
                                aria-label={isFeatureExpanded ? "Collapse feature" : "Expand feature"}
                              >
                                {isFeatureExpanded ? (
                                  <ChevronDown className="h-3 w-3 text-text-secondary" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-text-secondary" />
                                )}
                              </button>
                            )}
                            {!hasChildren && <div className="w-5" />}
                            <Label className="text-sm capitalize cursor-pointer" onClick={() => !effectiveReadOnly && handleToggle(featurePath, featureEnabled)}>
                              {featureKey.replace(/_/g, " ")}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={featureEnabled}
                              disabled={effectiveReadOnly || !enabled}
                              onCheckedChange={() => handleToggle(featurePath, featureEnabled)}
                              aria-label={`Enable ${featureKey} feature`}
                            />
                          </div>
                        </div>
                        {isFeatureExpanded && hasChildren && typeof featureValue === "object" && featureValue !== null && (
                          <div className="pl-6 mt-2 space-y-2">
                            {/* Components */}
                            {"components" in featureValue && featureValue.components && typeof featureValue.components === "object" && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-text-secondary mb-2">Components</p>
                                {Object.entries(featureValue.components).map(([componentKey, componentValue]) => {
                                  const componentKeyFull = `${featureKeyFull}.components.${componentKey}`;
                                  const isComponentExpanded = expanded.components.has(componentKeyFull);
                                  const componentPath = [sectionName, 'features', featureKey, 'components', componentKey];
                                  const componentEnabled = getPermissionValue(componentPath, localPermissions);
                                  // Check if component has tabs by looking at local permissions structure
                                  const sectionPerms = localPermissions[sectionName];
                                  const localFeature = sectionPerms?.features 
                                    ? (sectionPerms.features as Record<string, any>)[featureKey]
                                    : undefined;
                                  const localComponent = typeof localFeature === 'object' && localFeature !== null && 'components' in localFeature
                                    ? (localFeature as any).components?.[componentKey]
                                    : null;
                                  const hasTabs = typeof localComponent === "object" && localComponent !== null && "tabs" in localComponent && localComponent.tabs;
                                  
                                  return (
                                    <div key={componentKey} className="border-l-2 border-border-secondary pl-4">
                                      <div className="flex items-center justify-between py-1.5">
                                        <div className="flex items-center gap-2">
                                          {hasTabs && (
                                            <button
                                              type="button"
                                              onClick={() => toggleComponent(componentKeyFull)}
                                              className="p-1 hover:bg-background-secondary rounded transition-colors"
                                              disabled={effectiveReadOnly}
                                              aria-label={isComponentExpanded ? "Collapse component" : "Expand component"}
                                            >
                                              {isComponentExpanded ? (
                                                <ChevronDown className="h-3 w-3 text-text-secondary" />
                                              ) : (
                                                <ChevronRight className="h-3 w-3 text-text-secondary" />
                                              )}
                                            </button>
                                          )}
                                          {!hasTabs && <div className="w-5" />}
                                          <Label className="text-xs capitalize cursor-pointer" onClick={() => !effectiveReadOnly && handleToggle(componentPath, componentEnabled)}>
                                            {componentKey.replace(/_/g, " ")}
                                          </Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            checked={componentEnabled}
                                            disabled={effectiveReadOnly || !featureEnabled}
                                            onCheckedChange={() => handleToggle(componentPath, componentEnabled)}
                                            aria-label={`Enable ${componentKey} component`}
                                          />
                                        </div>
                                      </div>
                                      {/* Tabs */}
                                      {isComponentExpanded && hasTabs && localComponent && typeof localComponent === "object" && "tabs" in localComponent && localComponent.tabs && typeof localComponent.tabs === "object" && (
                                        <div className="pl-6 mt-1 space-y-1">
                                          <p className="text-xs text-text-tertiary mb-1">Tabs</p>
                                          {Object.entries(localComponent.tabs).map(([tabKey]) => {
                                            const tabPath = [sectionName, 'features', featureKey, 'components', componentKey, 'tabs', tabKey];
                                            const tabEnabled = getPermissionValue(tabPath, localPermissions);
                                            
                                            return (
                                              <div key={tabKey} className="flex items-center justify-between py-1 pl-4">
                                                <Label className="text-xs capitalize cursor-pointer" onClick={() => !effectiveReadOnly && handleToggle(tabPath, tabEnabled)}>
                                                  {tabKey.replace(/_/g, " ")}
                                                </Label>
                                                <Checkbox
                                                  checked={tabEnabled}
                                                  disabled={effectiveReadOnly || !componentEnabled}
                                                  onCheckedChange={() => handleToggle(tabPath, tabEnabled)}
                                                  aria-label={`Enable ${tabKey} tab`}
                                                />
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {/* Boolean features (like create, edit, delete) are already handled above */}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!features && enabled && (
                <div className="pl-6 text-sm text-text-tertiary italic">
                  No features configured for this section.
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  // Action buttons section (always visible)
  const actionButtons = (
    <div className="flex items-center gap-2">
      {/* Preview Mode Toggle */}
      {!readOnly && (
        <Button
          type="button"
          variant={isPreviewMode ? "default" : "outline"}
          size="sm"
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className="flex items-center gap-2"
          aria-label={isPreviewMode ? "Exit preview mode" : "Enter preview mode"}
        >
          {isPreviewMode ? (
            <>
              <Edit className="h-4 w-4" />
              Edit Mode
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Preview Mode
            </>
          )}
        </Button>
      )}
      {!effectiveReadOnly && tenantId && (
        <div className="flex items-center gap-2">
          {/* Load Template Selector */}
          {templates && templates.length > 0 && (
            <div className="flex items-center gap-2">
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
                disabled={effectiveReadOnly}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Load template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template._id} value={template._id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadTemplate}
                disabled={!selectedTemplateId || effectiveReadOnly}
                className="flex items-center gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                Load
              </Button>
            </div>
          )}

          {/* Save as Template Dialog */}
          <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={effectiveReadOnly}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save as Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Permission Template</DialogTitle>
                <DialogDescription>
                  Save the current permission configuration as a reusable template.
                  Templates can be loaded when creating new roles.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">
                    Template Name <span className="text-status-error">*</span>
                  </Label>
                  <Input
                    id="template-name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Standard Provider, Nurse Permissions"
                    disabled={isSavingTemplate}
                    maxLength={100}
                  />
                  <p className="text-xs text-text-secondary">
                    Choose a descriptive name for this template (2-100 characters)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-description">Description</Label>
                  <Textarea
                    id="template-description"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Describe what this template is used for..."
                    disabled={isSavingTemplate}
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-text-secondary">
                    Optional. Provide a brief description (max 500 characters)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSaveTemplateOpen(false);
                    setTemplateName("");
                    setTemplateDescription("");
                  }}
                  disabled={isSavingTemplate}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={isSavingTemplate || !templateName.trim()}
                >
                  {isSavingTemplate ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Template
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {!hideHeader ? (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-text-primary">Permission Editor</h2>
                {isPreviewMode && (
                  <Badge variant="outline" className="flex items-center gap-1.5 bg-background-secondary border-status-info text-status-info">
                    <Eye className="h-3.5 w-3.5" />
                    Preview Mode
                  </Badge>
                )}
              </div>
              <p className="text-text-secondary">
                Configure feature access for this role. Permissions control what features users can use.
              </p>
              <div className="mt-3 p-3 bg-status-info/10 border border-status-info/30 rounded-lg">
                <p className="text-sm text-text-secondary">
                  <strong className="text-text-primary">Note:</strong> Data visibility (who can see what data) is now controlled 
                  by individual user sharing settings, not roles. Users can configure their sharing preferences in Settings → Sharing.
                </p>
              </div>
            </div>
            {actionButtons}
          </div>
          {effectiveReadOnly && (
            <div className="mt-3 p-3 bg-background-secondary border border-border-primary rounded-lg flex items-start gap-2">
              <Info className="h-4 w-4 text-status-info mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary mb-1">
                  {isPreviewMode ? "Preview Mode Active" : "Read-Only Mode"}
                </p>
                <p className="text-xs text-text-secondary">
                  {isPreviewMode 
                    ? "You are viewing permissions in preview mode. Toggle to edit mode to make changes."
                    : "You are viewing permissions in read-only mode. Changes cannot be saved."}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex items-center justify-end mb-2">
            {actionButtons}
          </div>
          {effectiveReadOnly && (
            <div className="mt-3 p-3 bg-background-secondary border border-border-primary rounded-lg flex items-start gap-2">
              <Info className="h-4 w-4 text-status-info mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary mb-1">
                  {isPreviewMode ? "Preview Mode Active" : "Read-Only Mode"}
                </p>
                <p className="text-xs text-text-secondary">
                  {isPreviewMode 
                    ? "You are viewing permissions in preview mode. Toggle to edit mode to make changes."
                    : "You are viewing permissions in read-only mode. Changes cannot be saved."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Permission Summary (shown in preview mode) */}
      {isPreviewMode && (
        <Card className="mb-6 border-status-info bg-background-secondary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-status-info" />
              <CardTitle>Permission Summary</CardTitle>
            </div>
            <CardDescription>
              Overview of what permissions are granted by this configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enabled Sections */}
            {permissionSummary.enabledSections.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-status-success" />
                  <h3 className="text-sm font-semibold text-text-primary">
                    Enabled Sections ({permissionSummary.enabledSections.length})
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 pl-6">
                  {permissionSummary.enabledSections.map((section) => (
                    <Badge key={section} variant="outline" className="bg-status-success/10 border-status-success text-status-success">
                      {section}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Enabled Features Summary */}
            {permissionSummary.totalEnabledFeatures > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-status-success" />
                  <h3 className="text-sm font-semibold text-text-primary">
                    Enabled Features ({permissionSummary.totalEnabledFeatures} total)
                  </h3>
                </div>
                <div className="pl-6 space-y-2">
                  {Object.entries(permissionSummary.enabledFeatures).map(([section, features]) => (
                    <div key={section} className="text-sm">
                      <span className="font-medium text-text-primary">{section}:</span>
                      <span className="text-text-secondary ml-2">
                        {features.join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disabled Sections */}
            {permissionSummary.disabledSections.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-text-tertiary" />
                  <h3 className="text-sm font-semibold text-text-secondary">
                    Disabled Sections ({permissionSummary.disabledSections.length})
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 pl-6">
                  {permissionSummary.disabledSections.map((section) => (
                    <Badge key={section} variant="outline" className="bg-background-elevated border-border-secondary text-text-tertiary opacity-60">
                      {section}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* No Permissions Warning */}
            {permissionSummary.enabledSections.length === 0 && (
              <div className="p-3 bg-status-warning/10 border border-status-warning rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-status-warning mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-status-warning mb-1">
                      No Permissions Enabled
                    </p>
                    <p className="text-xs text-text-secondary">
                      This role currently has no enabled sections. Users with this role will have very limited access.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className={cn("space-y-4", isPreviewMode && "opacity-90")}>
        {VALID_SECTIONS.map((sectionName) => {
          const sectionData = permissions[sectionName];
          if (!sectionData) {
            // Section not present in permissions - show as disabled
            return (
              <Card key={sectionName} className="mb-4 opacity-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-text-tertiary" />
                      <CardTitle className="text-lg">{getSectionLabel(sectionName)}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={false} disabled={effectiveReadOnly} />
                      <Label className="text-sm font-medium text-text-tertiary">Disabled</Label>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          }
          return renderSection(sectionName, sectionData);
        })}
      </div>

      {/* Footer note */}
      {effectiveReadOnly && !isPreviewMode && (
        <div className="mt-6 p-4 bg-background-secondary rounded-lg border border-border-primary">
          <p className="text-sm text-text-secondary">
            <strong>Read-Only Mode:</strong> You are viewing permissions in read-only mode. 
            Changes cannot be saved.
          </p>
        </div>
      )}
    </div>
  );
}

