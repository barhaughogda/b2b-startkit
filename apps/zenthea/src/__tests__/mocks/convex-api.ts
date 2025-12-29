// Mock Convex API for testing
export const api = {
  admin: {
    users: {
      getUsers: () => {},
      createUserMutation: () => {},
      updateUserMutation: () => {},
      deleteUserMutation: () => {},
      getUserById: () => {},
    },
  },
  users: {
    getUserByEmail: () => {},
  },
  providerProfiles: {
    getProviderProfileByUserId: () => {},
  },
  providers: {
    getProviderByEmail: () => {},
  },
  locations: {
    getProviderLocations: () => {},
    getLocationsByTenant: () => {},
    createLocation: () => {},
    updateLocation: () => {},
    addProviderToLocation: () => {},
    removeProviderFromLocation: () => {},
    setDefaultLocation: () => {},
  },
  availability: {
    // Provider-based functions (backward compatibility)
    getProviderAvailability: () => {},
    setRecurringAvailability: () => {},
    addAvailabilityOverride: () => {},
    removeAvailabilityOverride: () => {},
    // User-based functions (preferred)
    getUserAvailability: () => {},
    setUserRecurringAvailability: () => {},
    addUserAvailabilityOverride: () => {},
    removeUserAvailabilityOverride: () => {},
  },
  appointments: {
    getAppointmentsByDateRange: () => {},
  },
  calendarSync: {
    getSyncStatus: () => {},
    updateSyncSettings: () => {},
    disconnectCalendar: () => {},
    initGoogleCalendarSync: () => {},
  },
};




