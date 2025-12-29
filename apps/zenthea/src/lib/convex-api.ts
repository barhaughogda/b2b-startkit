// Conditional Convex API import
// Uses real API when available, falls back to mock for build environments

let api: any;

// For now, always use mock API in production to avoid build issues
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // Use mock API for production to avoid build issues
  console.log('Using mock Convex API for production (simplified approach)');
  api = {
    providers: {
      getProvider: 'providers:getProvider',
      createProvider: 'providers:createProvider',
      updateProvider: 'providers:updateProvider',
      deleteProvider: 'providers:deleteProvider',
      getProviderByEmail: 'providers:getProviderByEmail',
      getProvidersBySpecialty: 'providers:getProvidersBySpecialty',
      getProvidersByTenant: 'providers:getProvidersByTenant',
      getProvidersBySpecialtyWithTenant: 'providers:getProvidersBySpecialtyWithTenant',
      getProviderStats: 'providers:getProviderStats',
      listProviders: 'providers:listProviders'
    },
    patients: {
      getPatient: 'patients:getPatient',
      createPatient: 'patients:createPatient',
      updatePatient: 'patients:updatePatient',
      deletePatient: 'patients:deletePatient',
      getPatientByEmail: 'patients:getPatientByEmail',
      getPatientsByProvider: 'patients:getPatientsByProvider',
      getPatientsByTenant: 'patients:getPatientsByTenant',
      listPatients: 'patients:listPatients'
    },
    appointments: {
      getAppointment: 'appointments:getAppointment',
      createAppointment: 'appointments:createAppointment',
      updateAppointment: 'appointments:updateAppointment',
      deleteAppointment: 'appointments:deleteAppointment',
      getAppointmentsByProvider: 'appointments:getAppointmentsByProvider',
      getAppointmentsByPatient: 'appointments:getAppointmentsByPatient',
      getAppointmentsByDate: 'appointments:getAppointmentsByDate',
      listAppointments: 'appointments:listAppointments'
    },
    messages: {
      getMessage: 'messages:getMessage',
      createMessage: 'messages:createMessage',
      updateMessage: 'messages:updateMessage',
      deleteMessage: 'messages:deleteMessage',
      getMessagesByProvider: 'messages:getMessagesByProvider',
      getMessagesByPatient: 'messages:getMessagesByPatient',
      listMessages: 'messages:listMessages'
    },
    medicalRecords: {
      getMedicalRecord: 'medicalRecords:getMedicalRecord',
      createMedicalRecord: 'medicalRecords:createMedicalRecord',
      updateMedicalRecord: 'medicalRecords:updateMedicalRecord',
      deleteMedicalRecord: 'medicalRecords:deleteMedicalRecord',
      getMedicalRecordsByPatient: 'medicalRecords:getMedicalRecordsByPatient',
      getMedicalRecordsByProvider: 'medicalRecords:getMedicalRecordsByProvider',
      listMedicalRecords: 'medicalRecords:listMedicalRecords'
    },
    tenants: {
      getTenant: 'tenants:getTenant',
      createTenant: 'tenants:createTenant',
      updateTenant: 'tenants:updateTenant',
      deleteTenant: 'tenants:deleteTenant',
      listTenants: 'tenants:listTenants'
    },
    users: {
      getUser: 'users:getUser',
      createUser: 'users:createUser',
      updateUser: 'users:updateUser',
      deleteUser: 'users:deleteUser',
      getUserByEmail: 'users:getUserByEmail',
      listUsers: 'users:listUsers'
    },
    dashboard: {
      getDashboardData: 'dashboard:getDashboardData',
      getProviderDashboard: 'dashboard:getProviderDashboard',
      getPatientDashboard: 'dashboard:getPatientDashboard'
    },
    auditLogs: {
      getAuditLog: 'auditLogs:getAuditLog',
      createAuditLog: 'auditLogs:createAuditLog',
      getAuditLogsByUser: 'auditLogs:getAuditLogsByUser',
      getAuditLogsByTenant: 'auditLogs:getAuditLogsByTenant',
      listAuditLogs: 'auditLogs:listAuditLogs'
    }
  };
} else {
  // Use real Convex API for development
  console.log('Using real Convex API for development');
  try {
    // Try to import the real Convex API
    const { api: realApi } = require('../../convex/_generated/api');
    api = realApi;
    console.log('Successfully loaded Convex API');
  } catch (error) {
    // Fall back to mock API if import fails
    console.log('Using mock Convex API due to import error:', error instanceof Error ? error.message : String(error));
    console.log('This is expected in production builds where Convex files are not generated');
    api = {
      providers: {
        getProvider: 'providers:getProvider',
        createProvider: 'providers:createProvider',
        updateProvider: 'providers:updateProvider',
        deleteProvider: 'providers:deleteProvider',
        getProviderByEmail: 'providers:getProviderByEmail',
        getProvidersBySpecialty: 'providers:getProvidersBySpecialty',
        getProvidersByTenant: 'providers:getProvidersByTenant',
        getProvidersBySpecialtyWithTenant: 'providers:getProvidersBySpecialtyWithTenant',
        getProviderStats: 'providers:getProviderStats',
        listProviders: 'providers:listProviders'
      },
      patients: {
        getPatient: 'patients:getPatient',
        createPatient: 'patients:createPatient',
        updatePatient: 'patients:updatePatient',
        deletePatient: 'patients:deletePatient',
        getPatientByEmail: 'patients:getPatientByEmail',
        getPatientsByProvider: 'patients:getPatientsByProvider',
        getPatientsByTenant: 'patients:getPatientsByTenant',
        listPatients: 'patients:listPatients'
      },
      appointments: {
        getAppointment: 'appointments:getAppointment',
        createAppointment: 'appointments:createAppointment',
        updateAppointment: 'appointments:updateAppointment',
        deleteAppointment: 'appointments:deleteAppointment',
        getAppointmentsByProvider: 'appointments:getAppointmentsByProvider',
        getAppointmentsByPatient: 'appointments:getAppointmentsByPatient',
        getAppointmentsByDate: 'appointments:getAppointmentsByDate',
        listAppointments: 'appointments:listAppointments'
      },
      messages: {
        getMessage: 'messages:getMessage',
        createMessage: 'messages:createMessage',
        updateMessage: 'messages:updateMessage',
        deleteMessage: 'messages:deleteMessage',
        getMessagesByProvider: 'messages:getMessagesByProvider',
        getMessagesByPatient: 'messages:getMessagesByPatient',
        listMessages: 'messages:listMessages'
      },
      medicalRecords: {
        getMedicalRecord: 'medicalRecords:getMedicalRecord',
        createMedicalRecord: 'medicalRecords:createMedicalRecord',
        updateMedicalRecord: 'medicalRecords:updateMedicalRecord',
        deleteMedicalRecord: 'medicalRecords:deleteMedicalRecord',
        getMedicalRecordsByPatient: 'medicalRecords:getMedicalRecordsByPatient',
        getMedicalRecordsByProvider: 'medicalRecords:getMedicalRecordsByProvider',
        listMedicalRecords: 'medicalRecords:listMedicalRecords'
      },
      tenants: {
        getTenant: 'tenants:getTenant',
        createTenant: 'tenants:createTenant',
        updateTenant: 'tenants:updateTenant',
        deleteTenant: 'tenants:deleteTenant',
        listTenants: 'tenants:listTenants'
      },
      users: {
        getUser: 'users:getUser',
        createUser: 'users:createUser',
        updateUser: 'users:updateUser',
        deleteUser: 'users:deleteUser',
        getUserByEmail: 'users:getUserByEmail',
        listUsers: 'users:listUsers'
      },
      dashboard: {
        getDashboardData: 'dashboard:getDashboardData',
        getProviderDashboard: 'dashboard:getProviderDashboard',
        getPatientDashboard: 'dashboard:getPatientDashboard'
      },
      auditLogs: {
        getAuditLog: 'auditLogs:getAuditLog',
        createAuditLog: 'auditLogs:createAuditLog',
        getAuditLogsByUser: 'auditLogs:getAuditLogsByUser',
        getAuditLogsByTenant: 'auditLogs:getAuditLogsByTenant',
        listAuditLogs: 'auditLogs:listAuditLogs'
      }
    };
  }
}

export { api };
