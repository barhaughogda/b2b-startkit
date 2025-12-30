'use client';

import React, { useState, useEffect } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Bell, Shield, Palette, Languages, Monitor, Moon, Sun, Lock, Clock, CalendarDays, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useTheme } from '@/lib/theme-context';
import { ClinicLayout } from '@/components/layout/ClinicLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { validatePasswordComplexity, getPasswordComplexityErrorMessage } from '@/lib/validation';
import { SettingsSection } from '@/components/settings/SettingsSection';
import {
  type TimeFormat,
  type DateFormat,
  DATE_FORMAT_OPTIONS,
  TIME_FORMAT_OPTIONS,
  DATETIME_PREFERENCES_KEYS,
} from '@/lib/datetime';

// Force dynamic rendering required because this page uses browser APIs:
// - Notification API (Notification.permission, Notification.requestPermission)
// - localStorage (for persisting user preferences)
// These APIs are only available in the browser and cannot be used during static generation
export const dynamic = 'force-dynamic';

function CompanyUserSettingsContent() {
  const { data: session, status } = useZentheaSession();
  const { theme, setTheme: setThemeFromHook } = useTheme();
  const changePasswordAction = useAction(api.users.changePassword);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied' | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [language, setLanguage] = useState('en');
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('12h');
  const [dateFormat, setDateFormat] = useState<DateFormat>('MM/DD/YYYY');
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

  useEffect(() => {
    // Check if browser notifications are supported
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = Notification.permission;
      setNotificationPermission(permission);
      setBrowserNotificationsEnabled(permission === 'granted');
    }
    
    // Load preferences from localStorage (with SSR check)
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem(DATETIME_PREFERENCES_KEYS.LANGUAGE);
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }

      const savedTimeFormat = localStorage.getItem(DATETIME_PREFERENCES_KEYS.TIME_FORMAT) as TimeFormat | null;
      if (savedTimeFormat) {
        setTimeFormat(savedTimeFormat);
      }

      const savedDateFormat = localStorage.getItem(DATETIME_PREFERENCES_KEYS.DATE_FORMAT) as DateFormat | null;
      if (savedDateFormat) {
        setDateFormat(savedDateFormat);
      }

      const savedEmailNotifications = localStorage.getItem('zenthea-email-notifications');
      if (savedEmailNotifications !== null) {
        setEmailNotifications(savedEmailNotifications === 'true');
      }

      const savedPushNotifications = localStorage.getItem('zenthea-push-notifications');
      if (savedPushNotifications !== null) {
        setPushNotifications(savedPushNotifications === 'true');
      }
    }
  }, []);

  if (status === 'loading') {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zenthea-teal mx-auto" role="status" aria-label="Loading settings"></div>
            <p className="mt-2 text-text-secondary">Loading settings...</p>
          </div>
        </div>
      </ClinicLayout>
    );
  }

  if (!session) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h2>
            <p className="text-text-secondary">Please sign in to access your settings.</p>
          </div>
        </div>
      </ClinicLayout>
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
    localStorage.setItem(DATETIME_PREFERENCES_KEYS.LANGUAGE, newLanguage);
    // TODO: Also save to user profile via API when user profile API is available
    toast.success('Language preference saved');
  };

  const handleTimeFormatChange = (newFormat: TimeFormat) => {
    setTimeFormat(newFormat);
    localStorage.setItem(DATETIME_PREFERENCES_KEYS.TIME_FORMAT, newFormat);
    // Dispatch custom event for same-tab reactivity
    window.dispatchEvent(new CustomEvent('zenthea-time-format-changed', { detail: { timeFormat: newFormat } }));
    toast.success(`Time format set to ${newFormat === '12h' ? '12-hour' : '24-hour'}`);
  };

  const handleDateFormatChange = (newFormat: DateFormat) => {
    setDateFormat(newFormat);
    localStorage.setItem(DATETIME_PREFERENCES_KEYS.DATE_FORMAT, newFormat);
    toast.success('Date format preference saved');
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
    <ClinicLayout>
      <div className="flex-1 px-6 pb-6">
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
              description="Manage your account security and privacy settings"
              icon={Shield}
              isExpanded={securityExpanded}
              onToggle={() => setSecurityExpanded(!securityExpanded)}
            >
              <div className="space-y-4">
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
                      <SelectItem value="no">Norsk</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-text-secondary">
                    Choose your preferred language for the interface
                  </p>
                </div>

                <div className="border-t border-border-primary" />

                {/* Time Format */}
                <div className="space-y-2">
                  <Label htmlFor="time-format" className="text-base font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time Format
                  </Label>
                  <Select value={timeFormat} onValueChange={(v) => handleTimeFormatChange(v as TimeFormat)}>
                    <SelectTrigger id="time-format">
                      <SelectValue placeholder="Select time format" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_FORMAT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <span>{option.label}</span>
                            <span className="text-text-secondary text-xs">({option.example})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-text-secondary">
                    Choose between 12-hour (AM/PM) or 24-hour time format
                  </p>
                </div>

                <div className="border-t border-border-primary" />

                {/* Date Format */}
                <div className="space-y-2">
                  <Label htmlFor="date-format" className="text-base font-medium flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Date Format
                  </Label>
                  <Select value={dateFormat} onValueChange={(v) => handleDateFormatChange(v as DateFormat)}>
                    <SelectTrigger id="date-format">
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMAT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <span>{option.label}</span>
                            <span className="text-text-secondary text-xs">({option.example})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-text-secondary">
                    Choose your preferred date format for displaying dates
                  </p>
                </div>
              </div>
            </SettingsSection>
          </div>
        </div>
      </div>
    </ClinicLayout>
  );
}

export default function CompanyUserSettingsPage() {
  return (
    <ErrorBoundary>
      <CompanyUserSettingsContent />
    </ErrorBoundary>
  );
}

