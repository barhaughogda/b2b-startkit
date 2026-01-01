'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useAction, useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Bell, Shield, Palette, Languages, Monitor, Moon, Sun, Lock, CreditCard, Calendar, Building2, Clock, Globe, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useTheme } from '@/lib/theme-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { validatePasswordComplexity, getPasswordComplexityErrorMessage } from '@/lib/validation';
import { usePatientProfileData } from '@/hooks/usePatientProfileData';
import { TimezoneSelector } from '@/components/ui/timezone-selector';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { PatientAccessManager } from '@/components/patient/PatientAccessManager';

// Force dynamic rendering required because this page uses browser APIs:
// - Notification API (Notification.permission, Notification.requestPermission)
// - localStorage (for persisting user preferences)
// These APIs are only available in the browser and cannot be used during static generation
export const dynamic = 'force-dynamic';

function PatientSettingsContent() {
  const { data: session, status } = useZentheaSession();
  const { theme, setTheme: setThemeFromHook } = useTheme();
  const { patientId, patientProfile, isLoading: patientLoading } = usePatientProfileData();
  const changePasswordAction = useAction(api.users.changePassword);
  const updatePatient = useMutation(api.patients.updatePatient);
  const updatePatientTimezone = useMutation(api.patients.updatePatientTimezone);
  
  // Booking preferences state
  const [preferredClinicId, setPreferredClinicId] = useState<string>('');
  const [isSavingBookingPrefs, setIsSavingBookingPrefs] = useState(false);
  
  // Get tenant ID from session
  const tenantId = session?.user?.tenantId || 'demo-tenant';
  
  // Fetch clinics for the tenant
  const clinics = useQuery(
    api.clinics.getClinicsByTenant,
    tenantId ? { tenantId } : 'skip'
  ) as Array<{ _id: string; name: string; isActive: boolean }> | undefined;
  
  // Filter active clinics
  const activeClinics = useMemo(() => {
    if (!clinics) return [];
    return clinics.filter(c => c.isActive);
  }, [clinics]);
  
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied' | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState<string>('');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [dateFormat, setDateFormat] = useState<string>('MM/dd/yyyy');
  const [isSavingTimePrefs, setIsSavingTimePrefs] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingEmailNotifications, setIsUpdatingEmailNotifications] = useState(false);
  const [isUpdatingPushNotifications, setIsUpdatingPushNotifications] = useState(false);
  
  // Section expansion states - notifications expanded by default
  const [notificationsExpanded, setNotificationsExpanded] = useState(true);
  const [securityExpanded, setSecurityExpanded] = useState(false);
  const [appearanceExpanded, setAppearanceExpanded] = useState(false);
  const [preferencesExpanded, setPreferencesExpanded] = useState(false);
  const [billingExpanded, setBillingExpanded] = useState(false);
  
  // Load existing booking preferences from patient profile
  useEffect(() => {
    if (patientProfile) {
      setPreferredClinicId(patientProfile.preferredClinicId || '');
    }
  }, [patientProfile]);

  useEffect(() => {
    // Check if browser notifications are supported
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = Notification.permission;
      setNotificationPermission(permission);
      setBrowserNotificationsEnabled(permission === 'granted');
    }
    
    // Load preferences from localStorage (only in browser)
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('zenthea-language');
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }

      const savedEmailNotifications = localStorage.getItem('zenthea-email-notifications');
      if (savedEmailNotifications !== null) {
        setEmailNotifications(savedEmailNotifications === 'true');
      }

      const savedPushNotifications = localStorage.getItem('zenthea-push-notifications');
      if (savedPushNotifications !== null) {
        setPushNotifications(savedPushNotifications === 'true');
      }

      // Load timezone preference
      // Priority: 1. Patient profile (database), 2. localStorage, 3. Browser timezone
      // Note: patientProfile.timezone is loaded via usePatientProfileData hook
      const savedTimezone = localStorage.getItem('zenthea-timezone');
      if (savedTimezone) {
        setTimezone(savedTimezone);
      } else {
        // Default to browser timezone if not set
        try {
          const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          setTimezone(browserTimezone);
        } catch {
          setTimezone('America/New_York'); // Fallback
        }
      }

      const savedTimeFormat = localStorage.getItem('zenthea-time-format');
      if (savedTimeFormat) {
        setTimeFormat(savedTimeFormat as '12h' | '24h');
      }

      const savedDateFormat = localStorage.getItem('zenthea-date-format');
      if (savedDateFormat) {
        setDateFormat(savedDateFormat);
      }
    }
  }, []);

  // Sync timezone from patient profile when it loads (database takes priority)
  useEffect(() => {
    const savedTimezoneFromDb = patientProfile?.settings?.timezone;
    if (savedTimezoneFromDb) {
      setTimezone(savedTimezoneFromDb);
      // Also sync to localStorage for consistency
      localStorage.setItem('zenthea-timezone', savedTimezoneFromDb);
    }
  }, [patientProfile?.settings?.timezone]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zenthea-teal mx-auto" role="status" aria-label="Loading settings"></div>
          <p className="mt-2 text-text-secondary">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'patient') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h2>
          <p className="text-text-secondary">Please sign in to access your settings.</p>
        </div>
      </div>
    );
  }

  const handleBrowserNotificationsToggle = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Browser notifications are not supported in this browser');
      return;
    }

    const permission = Notification.permission;
    
    if (permission === 'granted') {
      // Disable notifications (local preference only)
      // Note: Browser permission remains granted; user can revoke in browser settings
      setBrowserNotificationsEnabled(false);
      setNotificationPermission('granted');
      toast.success('Browser notifications disabled');
    } else if (permission === 'denied') {
      toast.error('Browser notifications are blocked. Please enable them in your browser settings.');
    } else {
      // Request permission
      const newPermission = await Notification.requestPermission();
      setNotificationPermission(newPermission);
      if (newPermission === 'granted') {
        setBrowserNotificationsEnabled(true);
        toast.success('Browser notifications enabled');
      } else {
        setBrowserNotificationsEnabled(false);
        toast.error('Browser notifications permission denied');
      }
    }
  };

  const handleEmailNotificationsToggle = async (enabled: boolean) => {
    setIsUpdatingEmailNotifications(true);
    try {
      // Save to localStorage for persistence
      localStorage.setItem('zenthea-email-notifications', enabled.toString());
      // TODO: Also save to Convex user profile when API is available
      // await updateUserPreferences({ userId: session.user.id, emailNotifications: enabled });
      setEmailNotifications(enabled);
      toast.success(enabled ? 'Email notifications enabled' : 'Email notifications disabled');
    } catch (error) {
      toast.error('Failed to update email notification preference');
    } finally {
      setIsUpdatingEmailNotifications(false);
    }
  };

  const handlePushNotificationsToggle = async (enabled: boolean) => {
    setIsUpdatingPushNotifications(true);
    try {
      // Save to localStorage for persistence
      localStorage.setItem('zenthea-push-notifications', enabled.toString());
      // TODO: Also save to Convex user profile when API is available
      // await updateUserPreferences({ userId: session.user.id, pushNotifications: enabled });
      setPushNotifications(enabled);
      toast.success(enabled ? 'Push notifications enabled' : 'Push notifications disabled');
    } catch (error) {
      toast.error('Failed to update push notification preference');
    } finally {
      setIsUpdatingPushNotifications(false);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeFromHook(newTheme);
    toast.success(`Theme set to ${newTheme}`);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('zenthea-language', newLanguage);
    // TODO: Also save to user profile via API when user profile API is available
    toast.success('Language preference saved');
  };

  const handleSaveTimePreferences = async () => {
    setIsSavingTimePrefs(true);
    try {
      // Save to localStorage for immediate use
      localStorage.setItem('zenthea-timezone', timezone);
      localStorage.setItem('zenthea-time-format', timeFormat);
      localStorage.setItem('zenthea-date-format', dateFormat);
      
      // Also persist timezone to database if patient exists
      if (patientId) {
        await updatePatientTimezone({
          patientId: patientId as Id<'patients'>,
          timezone: timezone || null,
        });
      }
      
      toast.success('Time preferences saved');
    } catch (error) {
      console.error('Failed to save time preferences:', error);
      toast.error('Failed to save time preferences');
    } finally {
      setIsSavingTimePrefs(false);
    }
  };

  // Format example for time format
  const getTimeFormatExample = (format: '12h' | '24h'): string => {
    const now = new Date();
    const effectiveTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      if (format === '12h') {
        return now.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true,
          timeZone: effectiveTimezone 
        });
      } else {
        return now.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false,
          timeZone: effectiveTimezone 
        });
      }
    } catch {
      // Fallback if timezone is invalid
      return format === '12h' ? '2:30 PM' : '14:30';
    }
  };

  // Format example for date format
  const getDateFormatExample = (format: string): string => {
    const now = new Date();
    const effectiveTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      // Get date parts in the specified timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: effectiveTimezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
      
      const parts = formatter.formatToParts(now);
      const year = parts.find(p => p.type === 'year')?.value || '';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const day = parts.find(p => p.type === 'day')?.value || '';
      
      // Get month name for abbreviated formats
      const monthFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: effectiveTimezone,
        month: 'short',
      });
      const monthName = monthFormatter.formatToParts(now).find(p => p.type === 'month')?.value || '';
      
      // Pad month and day with zeros if needed
      const monthPadded = month.padStart(2, '0');
      const dayPadded = day.padStart(2, '0');
      
      // Format according to the pattern
      switch (format) {
        case 'MM/dd/yyyy':
          return `${monthPadded}/${dayPadded}/${year}`;
        case 'dd/MM/yyyy':
          return `${dayPadded}/${monthPadded}/${year}`;
        case 'dd.MM.yyyy':
          return `${dayPadded}.${monthPadded}.${year}`;
        case 'yyyy-MM-dd':
          return `${year}-${monthPadded}-${dayPadded}`;
        case 'MMM dd, yyyy':
          return `${monthName} ${day}, ${year}`;
        case 'dd MMM yyyy':
          return `${day} ${monthName} ${year}`;
        default:
          return `${monthPadded}/${dayPadded}/${year}`;
      }
    } catch {
      // Fallback if timezone is invalid - use local time
      const fallbackDate = new Date();
      const month = String(fallbackDate.getMonth() + 1).padStart(2, '0');
      const day = String(fallbackDate.getDate()).padStart(2, '0');
      const year = fallbackDate.getFullYear();
      const monthName = fallbackDate.toLocaleDateString('en-US', { month: 'short' });
      
      switch (format) {
        case 'MM/dd/yyyy':
          return `${month}/${day}/${year}`;
        case 'dd/MM/yyyy':
          return `${day}/${month}/${year}`;
        case 'dd.MM.yyyy':
          return `${day}.${month}.${year}`;
        case 'yyyy-MM-dd':
          return `${year}-${month}-${day}`;
        case 'MMM dd, yyyy':
          return `${monthName} ${day}, ${year}`;
        case 'dd MMM yyyy':
          return `${day} ${monthName} ${year}`;
        default:
          return `${month}/${day}/${year}`;
      }
    }
  };

  const handleSaveBookingPreferences = async () => {
    if (!patientId || !updatePatient) {
      toast.error('Unable to save preferences. Please try again.');
      return;
    }

    setIsSavingBookingPrefs(true);
    try {
      await updatePatient({
        id: patientId,
        preferredClinicId: preferredClinicId ? (preferredClinicId as Id<"clinics">) : undefined,
      });
      toast.success('Booking preferences saved');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save preferences';
      toast.error(errorMessage);
    } finally {
      setIsSavingBookingPrefs(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    // Password complexity requirements
    if (!validatePasswordComplexity(newPassword)) {
      toast.error(getPasswordComplexityErrorMessage());
      return;
    }

    if (!session?.user?.id) {
      toast.error('User session not found. Please sign in again.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePasswordAction({
        userId: session.user.id as Id<'users'>,
        currentPassword,
        newPassword,
      });
      
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordFields(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-2">Manage your account preferences and privacy settings</p>
      </div>

      <div className="space-y-4">
        {/* Notifications Section */}
        <SettingsSection
          title="Notifications"
          description="Configure how you receive notifications about appointments and updates"
          icon={Bell}
          isExpanded={notificationsExpanded}
          onToggle={() => setNotificationsExpanded(!notificationsExpanded)}
        >
          <div className="space-y-6">
            {/* Browser Notifications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="browser-notifications" className="text-base font-medium">Browser Notifications</Label>
                  <p className="text-sm text-text-secondary">
                    {browserNotificationsEnabled 
                      ? 'Enabled - You will receive browser notifications'
                      : notificationPermission === 'denied'
                      ? 'Blocked - Enable in browser settings'
                      : 'Disabled - Click to enable'}
                  </p>
                </div>
                <Switch
                  id="browser-notifications"
                  checked={browserNotificationsEnabled}
                  onCheckedChange={handleBrowserNotificationsToggle}
                />
              </div>
              {notificationPermission === 'denied' && (
                <div className="p-3 bg-status-warning-bg border border-status-warning rounded-md">
                  <p className="text-sm text-status-warning font-medium mb-2">
                    Browser notifications are blocked
                  </p>
                  <p className="text-sm text-status-warning">
                    To enable them, click the lock icon in your browser&apos;s address bar, find &quot;Notifications&quot; in the permissions list, and change it to &quot;Allow&quot;.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-border-primary" />

            {/* Email Notifications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="text-base font-medium">Email Notifications</Label>
                  <p className="text-sm text-text-secondary">
                    Receive appointment reminders and health updates via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={handleEmailNotificationsToggle}
                  disabled={isUpdatingEmailNotifications}
                />
              </div>
            </div>

            <div className="border-t border-border-primary" />

            {/* Push Notifications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications" className="text-base font-medium">Push Notifications</Label>
                  <p className="text-sm text-text-secondary">
                    Receive push notifications on your mobile devices
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={pushNotifications}
                  onCheckedChange={handlePushNotificationsToggle}
                  disabled={isUpdatingPushNotifications}
                />
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Security & Privacy Section */}
        <SettingsSection
          title="Security & Privacy"
          description="Manage your account security, passwords, and medical team access permissions."
          icon={Shield}
          isExpanded={securityExpanded}
          onToggle={() => setSecurityExpanded(!securityExpanded)}
        >
          <div className="space-y-8">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-text-primary">Account Password</h4>
              {!showPasswordFields ? (
                <Button 
                  variant="outline" 
                  onClick={() => setShowPasswordFields(true)}
                  className="w-full"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handlePasswordChange} 
                      className="flex-1"
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? 'Updating...' : 'Update Password'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowPasswordFields(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border-primary pt-6">
              <h4 className="text-sm font-medium text-text-primary mb-4">Medical Team Access</h4>
              <PatientAccessManager />
            </div>
          </div>
        </SettingsSection>

        {/* Appearance & Display Section */}
        <SettingsSection
          title="Appearance & Display"
          description="Customize how the interface looks and displays information"
          icon={Eye}
          isExpanded={appearanceExpanded}
          onToggle={() => setAppearanceExpanded(!appearanceExpanded)}
        >
          <div className="space-y-6">
            {/* Theme */}
            <div className="space-y-2">
              <Label htmlFor="theme" className="text-base font-medium flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Theme
              </Label>
              <Select value={theme} onValueChange={(value) => handleThemeChange(value as 'light' | 'dark' | 'system')}>
                <SelectTrigger id="theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Dark
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      System
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-text-secondary">
                Choose your preferred color theme
              </p>
            </div>

            <div className="border-t border-border-primary" />

            {/* Language */}
            <div className="space-y-2">
              <Label htmlFor="language" className="text-base font-medium flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Language
              </Label>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-text-secondary">
                Choose your preferred language for the interface
              </p>
            </div>

            <div className="border-t border-border-primary" />

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-base font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Timezone
              </Label>
              <TimezoneSelector
                value={timezone}
                onChange={setTimezone}
                showLabel={false}
                placeholder="Select your timezone..."
              />
              <p className="text-sm text-text-secondary">
                Your timezone will be used to display appointment times and dates
              </p>
            </div>

            <div className="border-t border-border-primary" />

            {/* Time Format */}
            <div className="space-y-2">
              <Label htmlFor="time-format" className="text-base font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Format
              </Label>
              <Select value={timeFormat} onValueChange={(value) => setTimeFormat(value as '12h' | '24h')}>
                <SelectTrigger id="time-format">
                  <SelectValue placeholder="Select time format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">
                    12-hour ({getTimeFormatExample('12h')})
                  </SelectItem>
                  <SelectItem value="24h">
                    24-hour ({getTimeFormatExample('24h')})
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-text-secondary">
                Choose between 12-hour (AM/PM) or 24-hour time format
              </p>
            </div>

            <div className="border-t border-border-primary" />

            {/* Date Format */}
            <div className="space-y-2">
              <Label htmlFor="date-format" className="text-base font-medium">Date Format</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger id="date-format">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/dd/yyyy">
                    MM/DD/YYYY ({getDateFormatExample('MM/dd/yyyy')})
                  </SelectItem>
                  <SelectItem value="dd/MM/yyyy">
                    DD/MM/YYYY ({getDateFormatExample('dd/MM/yyyy')})
                  </SelectItem>
                  <SelectItem value="dd.MM.yyyy">
                    DD.MM.YYYY ({getDateFormatExample('dd.MM.yyyy')})
                  </SelectItem>
                  <SelectItem value="yyyy-MM-dd">
                    YYYY-MM-DD ({getDateFormatExample('yyyy-MM-dd')})
                  </SelectItem>
                  <SelectItem value="MMM dd, yyyy">
                    MMM DD, YYYY ({getDateFormatExample('MMM dd, yyyy')})
                  </SelectItem>
                  <SelectItem value="dd MMM yyyy">
                    DD MMM YYYY ({getDateFormatExample('dd MMM yyyy')})
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-text-secondary">
                Choose your preferred date format for displaying dates
              </p>
            </div>

            <Button 
              onClick={handleSaveTimePreferences}
              disabled={isSavingTimePrefs}
              className="w-full"
            >
              {isSavingTimePrefs ? 'Saving...' : 'Save Time Preferences'}
            </Button>
          </div>
        </SettingsSection>

        {/* Preferences Section */}
        <SettingsSection
          title="Preferences"
          description="Set your preferred options for booking appointments"
          icon={Calendar}
          isExpanded={preferencesExpanded}
          onToggle={() => setPreferencesExpanded(!preferencesExpanded)}
        >
          <div className="space-y-4">
            {/* Preferred Clinic */}
            <div className="space-y-2">
              <Label htmlFor="preferred-clinic" className="text-base font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Preferred Clinic
              </Label>
              <Select 
                value={preferredClinicId || 'none'} 
                onValueChange={(value) => setPreferredClinicId(value === 'none' ? '' : value)}
              >
                <SelectTrigger id="preferred-clinic">
                  <SelectValue placeholder="Select a preferred clinic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No preference</SelectItem>
                  {activeClinics?.map((clinic) => (
                    <SelectItem key={clinic._id} value={clinic._id}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-text-secondary">
                Your preferred clinic for scheduling appointments
              </p>
            </div>

            <Button 
              onClick={handleSaveBookingPreferences}
              disabled={isSavingBookingPrefs}
              className="w-full"
            >
              {isSavingBookingPrefs ? 'Saving...' : 'Save Booking Preferences'}
            </Button>
          </div>
        </SettingsSection>

        {/* Billing Section */}
        <SettingsSection
          title="Billing"
          description="Manage your payment method for automatic billing"
          icon={CreditCard}
          isExpanded={billingExpanded}
          onToggle={() => setBillingExpanded(!billingExpanded)}
        >
          {process.env.NEXT_PUBLIC_ENABLE_PAYMENT_METHODS === 'true' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <div className="w-10 h-10 bg-zenthea-teal/10 rounded-lg flex items-center justify-center mr-4">
                    <CreditCard className="w-5 h-5 text-zenthea-teal" />
                  </div>
                  <div>
                    <p className="text-text-secondary">No payment method on file</p>
                    <p className="text-sm text-text-tertiary">Add a payment method to enable automatic billing</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled
                  aria-label="Update payment method (coming soon)"
                >
                  Update
                </Button>
                {/* TODO: Implement payment method management functionality
                    - Add onClick handler to open payment method modal/drawer
                    - Integrate with payment processing backend
                    - Support adding/updating/removing payment methods */}
              </div>
              <p className="text-xs text-text-tertiary">
                Your payment method will be charged automatically for upcoming medical services and appointments.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-surface-elevated rounded-lg border border-border-primary/20">
              <div className="w-10 h-10 bg-zenthea-teal/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-zenthea-teal" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">Coming Soon</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Payment method management will be available in a future update
                </p>
              </div>
            </div>
          )}
        </SettingsSection>
      </div>
    </div>
  );
}

export default function PatientSettingsPage() {
  return (
    <ErrorBoundary>
      <PatientSettingsContent />
    </ErrorBoundary>
  );
}

