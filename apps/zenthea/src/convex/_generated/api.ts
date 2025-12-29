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
  providerAvailability: {
    getProviderAvailability: () => {},
    setRecurringAvailability: () => {},
    addAvailabilityOverride: () => {},
    removeAvailabilityOverride: () => {},
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




