"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertCircle,
  Loader2,
  Mail,
  UserCheck,
  User,
  Globe,
  CheckCircle,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ClinicUser {
  _id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: "clinic_user" | "admin" | "provider" | "patient";
  isOwner?: boolean;
  isActive: boolean;
  clinics?: string[];
  customRoleId?: string;
  tenantId?: string;
  isInvited?: boolean;
}

interface CustomRole {
  _id: string;
  name: string;
  description?: string;
  tenantId: string;
}

interface Clinic {
  _id: string;
  name: string;
  description?: string;
  tenantId: string;
}

interface PublicProfileData {
  _id: string;
  displayName: string;
  title: string;
  bio: string;
  photo?: string;
  specialties: string[];
  languages?: string[];
  acceptingNewPatients: boolean;
  bookingEnabled?: boolean;
  isPublished: boolean;
  showOnLandingPage?: boolean;
  displayOrder: number;
}

interface ProfileData {
  _id: string;
  displayName: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  photo?: string;
  specialties: string[];
  languages: string[];
  visibility?: Record<string, string>;
}

interface PublicProfileResponse {
  hasProfile: boolean;
  userProfile: { name: string; email: string } | null;
  profileData: ProfileData | null;
  publicProfile: PublicProfileData | null;
}

interface EditUserDialogProps {
  user: ClinicUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: EditUserDialogProps) {
  // User details state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [customRoleId, setCustomRoleId] = useState<string | undefined>(undefined);
  const [clinicIds, setClinicIds] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState("");
  const [changePassword, setChangePassword] = useState(false);

  // Public profile state
  const [publicProfileData, setPublicProfileData] = useState<PublicProfileResponse | null>(null);
  const [isLoadingPublicProfile, setIsLoadingPublicProfile] = useState(false);
  const [showOnLandingPage, setShowOnLandingPage] = useState(false);
  const [acceptingNewPatients, setAcceptingNewPatients] = useState(true);
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [publicProfileError, setPublicProfileError] = useState<string | null>(null);
  const [isSavingPublicProfile, setIsSavingPublicProfile] = useState(false);

  // Shared state
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isLoadingClinics, setIsLoadingClinics] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(["user-details"]);

  // Fetch public profile data
  const fetchPublicProfile = useCallback(async () => {
    if (!user?._id) return;
    
    setIsLoadingPublicProfile(true);
    setPublicProfileError(null);
    
    try {
      const response = await fetch(`/api/company/users/${user._id}/public-profile`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setPublicProfileData(data.data);
        
        // Populate toggle states from public profile if exists
        if (data.data.publicProfile) {
          const profile = data.data.publicProfile;
          setShowOnLandingPage(profile.isPublished);
          setAcceptingNewPatients(profile.acceptingNewPatients ?? true);
          setBookingEnabled(profile.bookingEnabled ?? true);
        } else {
          // Reset toggles for new profile
          setShowOnLandingPage(false);
          setAcceptingNewPatients(true);
          setBookingEnabled(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch public profile:", err);
      setPublicProfileError("Failed to load profile data");
    } finally {
      setIsLoadingPublicProfile(false);
    }
  }, [user?._id]);

  // Load roles and clinics when dialog opens
  useEffect(() => {
    if (open) {
      fetchRoles();
      fetchClinics();
      fetchPublicProfile();
    }
  }, [open, fetchPublicProfile]);

  // Populate form when user changes
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setCustomRoleId(user.customRoleId || undefined);
      setClinicIds(user.clinics || []);
      setIsOwner(user.isOwner ?? false);
      setIsActive(user.isActive ?? true);
      setPassword("");
      setChangePassword(false);
      setError(null);
      setExpandedSections(["user-details"]);
    }
  }, [user]);

  const fetchRoles = async () => {
    setIsLoadingRoles(true);
    try {
      const response = await fetch("/api/company/roles");
      const data = await response.json();
      if (response.ok && data.success) {
        setRoles(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const fetchClinics = async () => {
    setIsLoadingClinics(true);
    try {
      const response = await fetch("/api/company/clinics");
      const data = await response.json();
      if (response.ok && data.success) {
        setClinics(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch clinics:", err);
    } finally {
      setIsLoadingClinics(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const updateData: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        customRoleId: customRoleId || null,
        clinicIds: clinicIds,
        isOwner,
        isActive,
      };

      if (changePassword && password) {
        updateData.password = password;
      }

      const response = await fetch(`/api/company/users/${user._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to update user");
      }

      toast.success("User details saved successfully");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePublicProfile = async () => {
    if (!user) return;
    
    setIsSavingPublicProfile(true);
    setPublicProfileError(null);

    try {
      const hasExistingProfile = !!publicProfileData?.publicProfile;
      const method = hasExistingProfile ? "PUT" : "POST";
      
      const profileData = {
        acceptingNewPatients,
        bookingEnabled,
        isPublished: showOnLandingPage,
      };

      const response = await fetch(`/api/company/users/${user._id}/public-profile`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save public profile");
      }

      toast.success(hasExistingProfile ? "Public profile updated" : "Added to landing page");
      fetchPublicProfile(); // Refresh the data
    } catch (err) {
      setPublicProfileError(err instanceof Error ? err.message : "Failed to save public profile");
      toast.error(err instanceof Error ? err.message : "Failed to save public profile");
    } finally {
      setIsSavingPublicProfile(false);
    }
  };

  const handleRemoveFromLandingPage = async () => {
    if (!user || !publicProfileData?.publicProfile) return;
    
    if (!confirm("Are you sure you want to remove this user from the landing page?")) {
      return;
    }

    setIsSavingPublicProfile(true);

    try {
      const response = await fetch(`/api/company/users/${user._id}/public-profile`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to remove from landing page");
      }

      toast.success("Removed from landing page");
      fetchPublicProfile(); // Refresh the data
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove from landing page");
    } finally {
      setIsSavingPublicProfile(false);
    }
  };

  const handleClinicToggle = (clinicId: string) => {
    setClinicIds((prev) =>
      prev.includes(clinicId)
        ? prev.filter((id) => id !== clinicId)
        : [...prev, clinicId]
    );
  };

  if (!user) return null;

  const hasProfile = publicProfileData?.hasProfile ?? false;
  const hasPublicProfile = !!publicProfileData?.publicProfile;
  const profileData = publicProfileData?.profileData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[calc(100vh-100px)] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details, roles, permissions, and landing page visibility
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          {error && (
            <Alert className="border-status-error bg-status-error/10 mb-4">
              <AlertCircle className="h-4 w-4 text-status-error" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* User Status Badge */}
          <div className="flex items-center gap-2 mb-4">
            {user.isInvited ? (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Mail className="h-3 w-3 mr-1" />
                Invited User
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <UserCheck className="h-3 w-3 mr-1" />
                Registered User
              </Badge>
            )}
            {user.isOwner && (
              <Badge variant="default" className="bg-zenthea-teal text-white">
                Owner
              </Badge>
            )}
            {hasProfile && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <User className="h-3 w-3 mr-1" />
                Profile Complete
              </Badge>
            )}
          </div>

          <Accordion
            type="multiple"
            value={expandedSections}
            onValueChange={setExpandedSections}
            className="w-full"
          >
            {/* User Details Section */}
            <AccordionItem value="user-details" className="border-border-primary">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-text-secondary" />
                  <span className="font-semibold text-text-primary">User Details</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <form onSubmit={handleSubmit} className="space-y-4 pb-2">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="User's full name"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="user@example.com"
                    />
                  </div>

                  {/* Custom Role */}
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    {isLoadingRoles ? (
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading roles...</span>
                      </div>
                    ) : (
                      <Select
                        value={customRoleId || "none"}
                        onValueChange={(value) =>
                          setCustomRoleId(value === "none" ? undefined : value)
                        }
                      >
                        <SelectTrigger id="role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No role assigned</SelectItem>
                          {roles.map((role) => (
                            <SelectItem key={role._id} value={role._id}>
                              {role.name}
                              {role.description && (
                                <span className="text-text-secondary ml-2">
                                  - {role.description}
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Clinics */}
                  <div className="space-y-2">
                    <Label>Clinics</Label>
                    {isLoadingClinics ? (
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading clinics...</span>
                      </div>
                    ) : clinics.length === 0 ? (
                      <p className="text-sm text-text-secondary">
                        No clinics available. Create clinics in Settings → Clinics.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto border border-border-primary rounded-md p-3">
                        {clinics.map((clinic) => (
                          <div
                            key={clinic._id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`clinic-${clinic._id}`}
                              checked={clinicIds.includes(clinic._id)}
                              onCheckedChange={() => handleClinicToggle(clinic._id)}
                            />
                            <label
                              htmlFor={`clinic-${clinic._id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {clinic.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Owner Status */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isOwner"
                      checked={isOwner}
                      onCheckedChange={(checked) =>
                        setIsOwner(checked === true)
                      }
                    />
                    <label
                      htmlFor="isOwner"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Clinic Owner (Full administrative access)
                    </label>
                  </div>

                  {/* Active Status */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={isActive}
                      onCheckedChange={(checked) =>
                        setIsActive(checked === true)
                      }
                    />
                    <label
                      htmlFor="isActive"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Active (User can log in)
                    </label>
                  </div>

                  {/* Password Change */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="changePassword"
                        checked={changePassword}
                        onCheckedChange={(checked) => {
                          setChangePassword(checked === true);
                          if (!checked) setPassword("");
                        }}
                      />
                      <label
                        htmlFor="changePassword"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Change Password
                      </label>
                    </div>
                    {changePassword && (
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="New password"
                        minLength={8}
                      />
                    )}
                  </div>

                  {/* Save User Details Button */}
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save User Details"
                      )}
                    </Button>
                  </div>
                </form>
              </AccordionContent>
            </AccordionItem>

            {/* Public Landing Page Section */}
            <AccordionItem value="public-profile" className="border-border-primary">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-text-secondary" />
                  <span className="font-semibold text-text-primary">Public Landing Page</span>
                  {hasPublicProfile && publicProfileData?.publicProfile?.isPublished && (
                    <Badge variant="outline" className="text-xs border-status-success text-status-success ml-2">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Published
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {isLoadingPublicProfile ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
                  </div>
                ) : !hasProfile ? (
                  // User has no profile filled out
                  <div className="p-4 bg-surface-secondary rounded-lg border border-border-primary">
                    <div className="flex items-start gap-3">
                      <Globe className="h-5 w-5 text-text-tertiary mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          Profile Required
                        </p>
                        <p className="text-sm text-text-secondary mt-1">
                          This user needs to complete their profile before they can be added to the landing page.
                          They can fill out their profile at Settings → Your Profile.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => window.open('/company/user/profile', '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Profile Page
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pb-2">
                    {publicProfileError && (
                      <Alert className="border-status-error bg-status-error/10">
                        <AlertCircle className="h-4 w-4 text-status-error" />
                        <AlertDescription>{publicProfileError}</AlertDescription>
                      </Alert>
                    )}

                    {/* Profile Preview Card */}
                    {profileData && (
                      <div className="p-4 bg-surface-secondary rounded-lg border border-border-primary">
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="w-16 h-16 rounded-lg bg-surface-elevated flex items-center justify-center overflow-hidden flex-shrink-0">
                            {profileData.photo ? (
                              <img 
                                src={profileData.photo} 
                                alt={profileData.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="h-8 w-8 text-text-tertiary" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-text-primary">
                              {profileData.displayName}
                            </h3>
                            {profileData.specialties.length > 0 && (
                              <p className="text-sm text-text-secondary">
                                {profileData.specialties[0]}
                              </p>
                            )}
                            {profileData.bio && (
                              <p className="text-sm text-text-tertiary mt-1 line-clamp-2">
                                {profileData.bio}
                              </p>
                            )}
                            {profileData.specialties.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {profileData.specialties.slice(0, 3).map((specialty, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {specialty}
                                  </Badge>
                                ))}
                                {profileData.specialties.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{profileData.specialties.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-text-tertiary mt-3">
                          This is how the user will appear on your public landing page.
                          Profile data comes from their personal profile settings.
                        </p>
                      </div>
                    )}

                    {/* Toggle Controls */}
                    <div className="space-y-3">
                      {/* Show on Landing Page Toggle */}
                      <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg border border-border-primary">
                        <div>
                          <Label htmlFor="showOnLandingPage" className="font-medium">
                            Show on Public Landing Page
                          </Label>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {showOnLandingPage 
                              ? "This user is visible on your landing page" 
                              : "Enable to display this user publicly"}
                          </p>
                        </div>
                        <Switch
                          id="showOnLandingPage"
                          checked={showOnLandingPage}
                          onCheckedChange={setShowOnLandingPage}
                        />
                      </div>

                      {/* Accepting New Patients Toggle */}
                      <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg border border-border-primary">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-status-success" />
                          <div>
                            <Label htmlFor="acceptingNewPatients" className="font-medium">
                              Accepting New Patients
                            </Label>
                            <p className="text-xs text-text-secondary mt-0.5">
                              Show badge indicating availability
                            </p>
                          </div>
                        </div>
                        <Switch
                          id="acceptingNewPatients"
                          checked={acceptingNewPatients}
                          onCheckedChange={setAcceptingNewPatients}
                        />
                      </div>

                      {/* Online Booking Toggle */}
                      <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg border border-border-primary">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-zenthea-teal" />
                          <div>
                            <Label htmlFor="bookingEnabled" className="font-medium">
                              Online Booking
                            </Label>
                            <p className="text-xs text-text-secondary mt-0.5">
                              Allow patients to book directly
                            </p>
                          </div>
                        </div>
                        <Switch
                          id="bookingEnabled"
                          checked={bookingEnabled}
                          onCheckedChange={setBookingEnabled}
                        />
                      </div>
                    </div>

                    {/* Save Actions */}
                    <div className="flex justify-between items-center pt-2">
                      {hasPublicProfile && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRemoveFromLandingPage}
                          disabled={isSavingPublicProfile}
                          className="text-status-error hover:bg-status-error/10"
                        >
                          Remove from Landing Page
                        </Button>
                      )}
                      <div className={!hasPublicProfile ? "ml-auto" : ""}>
                        <Button
                          type="button"
                          onClick={handleSavePublicProfile}
                          disabled={isSavingPublicProfile}
                        >
                          {isSavingPublicProfile ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : hasPublicProfile ? (
                            "Update Settings"
                          ) : (
                            "Add to Landing Page"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Fixed footer with close button */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border-primary mt-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
